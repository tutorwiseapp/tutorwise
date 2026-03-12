/**
 * TeamRuntime v2
 *
 * Phase 6A rewrite: replaces native async/await with a proper LangGraph
 * StateGraph backed by PostgresSaver checkpointing — the same substrate
 * used by PlatformWorkflowRuntime.
 *
 * Phase 6C adds: HITL interrupt() pause/resume, monitoring wiring
 * Phase 6E adds: decision_outcomes stubs after completion
 *
 * Architecture:
 *   - Each team run compiles a pattern-specific StateGraph from the DB topology
 *   - PostgresSaver (singleton) checkpoints all state — runs survive process crashes
 *   - CircuitBreaker (per team slug) protects every AI call
 *   - workflow_executions row written per run for Conductor Monitoring visibility
 *   - agent_team_run_outputs still written for backward-compat with existing queries
 *
 * Three patterns:
 *   supervisor  — all specialists run in parallel → coordinator synthesises
 *   pipeline    — topological order → each agent receives prior context
 *   swarm       — dynamic NEXT_AGENT routing with visited-set loop guard
 *
 * HITL (supervisor only):
 *   run(slug, task, trigger, { hitl: true }) pauses after specialists, before coordinator.
 *   Admin reviews specialist outputs, then resumes via teamRuntime.resume(runId, approved).
 */

import { StateGraph, END, START, interrupt, Command } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Pool as PgPool } from 'pg';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { specialistAgentRunner } from '@/lib/agent-studio/SpecialistAgentRunner';
import { CircuitBreaker, createAICircuitBreaker } from './CircuitBreaker';
import { AgentTeamStateAnnotation } from './AgentTeamState';
import type { AgentTeamState, AgentTeamHandoff } from './AgentTeamState';

// ---------------------------------------------------------------------------
// PostgresSaver — singleton shared across all team runs
// ---------------------------------------------------------------------------

let _checkpointer: PostgresSaver | null = null;

function getCheckpointer(): PostgresSaver {
  if (!_checkpointer) {
    const connString = process.env.POSTGRES_URL_NON_POOLING;
    if (!connString) throw new Error('TeamRuntime: POSTGRES_URL_NON_POOLING is not set');
    // Supabase pooler uses a self-signed cert.
    // Strip ?sslmode=require from the connection string (it overrides the ssl config object)
    // then pass ssl: { rejectUnauthorized: false } explicitly.
    const cleanConn = connString.replace(/[?&]sslmode=[^&]*/g, '').replace(/[?&]$/, '');
    const pool = new PgPool({
      connectionString: cleanConn,
      ssl: { rejectUnauthorized: false },
    });
    _checkpointer = new PostgresSaver(pool);
  }
  return _checkpointer;
}

// ---------------------------------------------------------------------------
// CircuitBreakers — one per team slug
// ---------------------------------------------------------------------------

const _breakers = new Map<string, CircuitBreaker>();

function getBreakerForTeam(teamSlug: string): CircuitBreaker {
  if (!_breakers.has(teamSlug)) {
    _breakers.set(teamSlug, createAICircuitBreaker());
  }
  return _breakers.get(teamSlug)!;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface TeamNode {
  id: string;
  data: { agentSlug: string; label: string; isCoordinator?: boolean };
}

interface TeamEdge {
  id: string;
  source: string;
  target: string;
}

interface AgentTeam {
  id: string;
  slug: string;
  name: string;
  pattern: 'supervisor' | 'pipeline' | 'swarm';
  nodes: TeamNode[];
  edges: TeamEdge[];
  coordinator_slug: string | null;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TeamRunOptions {
  /** Pause before coordinator synthesis for human review (supervisor pattern only). */
  hitl?: boolean;
}

export interface TeamRunResult {
  team_result: string | null;
  agent_outputs: Record<string, string>;
  handoff_history: AgentTeamHandoff[];
  status: 'completed' | 'failed' | 'awaiting_approval';
  duration_ms: number;
  run_id: string;
}

// ---------------------------------------------------------------------------
// Phase 6E — Learning Loop: team run outcome metrics
// ---------------------------------------------------------------------------

const TEAM_RUN_OUTCOME_METRICS: Array<{ metric: string; lag_days: number }> = [
  { metric: 'team_run_completed', lag_days: 7 },
  { metric: 'team_run_completed', lag_days: 30 },
];

// ---------------------------------------------------------------------------
// TeamRuntime
// ---------------------------------------------------------------------------

class TeamRuntime {
  // ── Public: start a team run ─────────────────────────────────────────────

  async run(
    teamSlug: string,
    task: string,
    triggerType = 'manual',
    options: TeamRunOptions = {}
  ): Promise<TeamRunResult> {
    const startTime = Date.now();
    const supabase = await createServiceRoleClient();

    // 1. Load team
    const { data: team, error } = await supabase
      .from('agent_teams')
      .select('id, slug, name, pattern, nodes, edges, coordinator_slug')
      .eq('slug', teamSlug)
      .eq('status', 'active')
      .single();

    if (error || !team) throw new Error(`TeamRuntime: team not found or inactive: ${teamSlug}`);

    this._validateTopology(team as AgentTeam);

    // 2. Insert agent_team_run_outputs row (backward compat)
    const { data: runRow } = await supabase
      .from('agent_team_run_outputs')
      .insert({ team_id: team.id, trigger_type: triggerType, task, status: 'running' })
      .select('id')
      .single();

    if (!runRow?.id) throw new Error(`TeamRuntime: failed to create run record for team ${teamSlug}`);
    const runId = runRow.id;

    // 3. Insert workflow_executions row (Conductor Monitoring)
    await supabase.from('workflow_executions').insert({
      id: runId,
      langgraph_thread_id: runId,
      status: 'running',
      execution_context: {
        team_id: team.id,
        team_slug: team.slug,
        team_name: team.name,
        task,
        trigger_type: triggerType,
        process_type: 'team',
        pattern: team.pattern,
        hitl: options.hitl ?? false,
      },
    });

    // 4. Load specialist agent IDs
    const agentSlugs = (team.nodes as TeamNode[]).map((n) => n.data.agentSlug).filter(Boolean);
    const { data: agents } = await supabase
      .from('specialist_agents')
      .select('id, slug')
      .in('slug', agentSlugs)
      .eq('status', 'active');

    const agentIdBySlug: Record<string, string> = {};
    for (const a of agents ?? []) agentIdBySlug[a.slug] = a.id;

    // 5. Compile graph and run
    const checkpointer = getCheckpointer();
    const breaker = getBreakerForTeam(team.slug);

    try {
      await checkpointer.setup();
      const { finalState, interrupted } = await this._compileAndRun(
        team as AgentTeam,
        { task },
        checkpointer,
        runId,
        breaker,
        agentIdBySlug,
        options
      );

      const durationMs = Date.now() - startTime;

      if (interrupted) {
        // HITL pause — specialists ran, coordinator pending human approval
        await Promise.all([
          supabase
            .from('agent_team_run_outputs')
            .update({ status: 'awaiting_approval', duration_ms: durationMs })
            .eq('id', runId),
          supabase
            .from('workflow_executions')
            .update({ status: 'awaiting_approval' })
            .eq('id', runId),
        ]);

        return {
          team_result: null,
          agent_outputs: finalState.outputs,
          handoff_history: finalState.handoff_history,
          status: 'awaiting_approval',
          duration_ms: durationMs,
          run_id: runId,
        };
      }

      // Normal completion
      await Promise.all([
        supabase
          .from('agent_team_run_outputs')
          .update({
            team_result: finalState.team_result,
            agent_outputs: finalState.outputs,
            handoff_history: finalState.handoff_history,
            status: 'completed',
            duration_ms: durationMs,
          })
          .eq('id', runId),
        supabase
          .from('workflow_executions')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', runId),
      ]);

      // Phase 6E: write decision_outcomes stubs for learning loop
      await this._writeTeamRunDecisionStubs(supabase, runId).catch(() => {});

      return {
        team_result: finalState.team_result,
        agent_outputs: finalState.outputs,
        handoff_history: finalState.handoff_history,
        status: 'completed',
        duration_ms: durationMs,
        run_id: runId,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      await Promise.all([
        supabase
          .from('agent_team_run_outputs')
          .update({ status: 'failed', duration_ms: durationMs })
          .eq('id', runId),
        supabase
          .from('workflow_executions')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', runId),
      ]);
      // Fire-and-forget exception for Operations queue
      import('@/lib/workflow/exception-writer').then(({ writeException }) =>
        writeException({
          supabase,
          source: 'team_error',
          severity: 'high',
          title: `Team run failed: ${team.name ?? team.slug}`,
          description: message,
          sourceEntityType: 'agent_team_run_outputs',
          sourceEntityId: runId,
          context: { error: message, team_slug: team.slug, task, trigger_type: triggerType },
        })
      ).catch(() => {});
      throw err;
    }
  }

  // ── Public: resume a HITL-paused run ─────────────────────────────────────

  async resume(runId: string, approved: boolean): Promise<TeamRunResult> {
    const startTime = Date.now();
    const supabase = await createServiceRoleClient();

    // Load the paused execution to recover team context
    const { data: execution } = await supabase
      .from('workflow_executions')
      .select('id, execution_context, status')
      .eq('id', runId)
      .single();

    if (!execution) throw new Error(`TeamRuntime.resume: execution not found: ${runId}`);
    if (execution.status !== 'awaiting_approval') {
      throw new Error(
        `TeamRuntime.resume: execution ${runId} is not paused (status: ${execution.status})`
      );
    }

    const ctx = execution.execution_context as Record<string, string>;
    const teamSlug = ctx.team_slug;

    // Reload team (topology may have been updated)
    const { data: team } = await supabase
      .from('agent_teams')
      .select('id, slug, name, pattern, nodes, edges, coordinator_slug')
      .eq('slug', teamSlug)
      .eq('status', 'active')
      .single();

    if (!team) throw new Error(`TeamRuntime.resume: team not found: ${teamSlug}`);

    // Load agent IDs
    const agentSlugs = (team.nodes as TeamNode[]).map((n) => n.data.agentSlug).filter(Boolean);
    const { data: agents } = await supabase
      .from('specialist_agents')
      .select('id, slug')
      .in('slug', agentSlugs)
      .eq('status', 'active');

    const agentIdBySlug: Record<string, string> = {};
    for (const a of agents ?? []) agentIdBySlug[a.slug] = a.id;

    const checkpointer = getCheckpointer();
    const breaker = getBreakerForTeam(team.slug);
    const threadConfig = { configurable: { thread_id: runId } };

    try {
      await checkpointer.setup();
      // Recompile the supervisor graph (same topology) and resume from checkpoint
      const finalState = await this._resumeSupervisorGraph(
        team as AgentTeam,
        approved,
        checkpointer,
        threadConfig,
        breaker,
        agentIdBySlug
      );

      const durationMs = Date.now() - startTime;
      const resultStatus = approved ? 'completed' : 'failed';

      await Promise.all([
        supabase
          .from('agent_team_run_outputs')
          .update({
            team_result: finalState.team_result,
            agent_outputs: finalState.outputs,
            handoff_history: finalState.handoff_history,
            status: resultStatus,
            duration_ms: durationMs,
          })
          .eq('id', runId),
        supabase
          .from('workflow_executions')
          .update({ status: resultStatus, completed_at: new Date().toISOString() })
          .eq('id', runId),
      ]);

      if (approved) {
        await this._writeTeamRunDecisionStubs(supabase, runId).catch(() => {});
      }

      return {
        team_result: finalState.team_result,
        agent_outputs: finalState.outputs,
        handoff_history: finalState.handoff_history,
        status: resultStatus,
        duration_ms: durationMs,
        run_id: runId,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      await Promise.all([
        supabase
          .from('agent_team_run_outputs')
          .update({ status: 'failed', duration_ms: durationMs })
          .eq('id', runId),
        supabase
          .from('workflow_executions')
          .update({ status: 'failed', completed_at: new Date().toISOString() })
          .eq('id', runId),
      ]);
      import('@/lib/workflow/exception-writer').then(({ writeException }) =>
        writeException({
          supabase,
          source: 'team_error',
          severity: 'high',
          title: `Team resume failed: ${teamSlug}`,
          description: message,
          sourceEntityType: 'agent_team_run_outputs',
          sourceEntityId: runId,
          context: { error: message, team_slug: teamSlug, action: approved ? 'approved' : 'rejected' },
        })
      ).catch(() => {});
      throw err;
    }
  }

  // ── Graph dispatch ─────────────────────────────────────────────────────────

  private async _compileAndRun(
    team: AgentTeam,
    initialInput: Pick<AgentTeamState, 'task'>,
    checkpointer: PostgresSaver,
    threadId: string,
    breaker: CircuitBreaker,
    agentIdBySlug: Record<string, string>,
    options: TeamRunOptions
  ): Promise<{ finalState: AgentTeamState; interrupted: boolean }> {
    const threadConfig = { configurable: { thread_id: threadId } };

    switch (team.pattern) {
      case 'supervisor':
        return this._runSupervisorGraph(
          team, initialInput, checkpointer, threadConfig, breaker, agentIdBySlug, options.hitl ?? false
        );
      case 'pipeline':
        return this._runPipelineGraph(
          team, initialInput, checkpointer, threadConfig, breaker, agentIdBySlug
        );
      case 'swarm':
        return this._runSwarmGraph(
          team, initialInput, checkpointer, threadConfig, breaker, agentIdBySlug
        );
      default:
        throw new Error(`TeamRuntime: unknown pattern: ${(team as AgentTeam).pattern}`);
    }
  }

  // ── Supervisor ─────────────────────────────────────────────────────────────
  // START → run_specialists (parallel) → [hitl_review] → run_coordinator → END

  private async _runSupervisorGraph(
    team: AgentTeam,
    initialInput: Pick<AgentTeamState, 'task'>,
    checkpointer: PostgresSaver,
    threadConfig: { configurable: { thread_id: string } },
    breaker: CircuitBreaker,
    agentIdBySlug: Record<string, string>,
    hitl: boolean
  ): Promise<{ finalState: AgentTeamState; interrupted: boolean }> {
    const compiled = this._buildSupervisorGraph(team, checkpointer, breaker, agentIdBySlug, hitl);
    const finalState = (await compiled.invoke(initialInput, threadConfig)) as AgentTeamState;

    // Detect HITL pause: specialists ran (outputs populated) but coordinator hasn't (team_result null)
    const interrupted = hitl && finalState.team_result === null && Object.keys(finalState.outputs).length > 0;
    return { finalState, interrupted };
  }

  private async _resumeSupervisorGraph(
    team: AgentTeam,
    approved: boolean,
    checkpointer: PostgresSaver,
    threadConfig: { configurable: { thread_id: string } },
    breaker: CircuitBreaker,
    agentIdBySlug: Record<string, string>
  ): Promise<AgentTeamState> {
    // Recompile same graph topology (with HITL=true to match initial compile)
    const compiled = this._buildSupervisorGraph(team, checkpointer, breaker, agentIdBySlug, true);
    // Resume from checkpoint by passing the human decision
    const finalState = await compiled.invoke(new Command({ resume: approved }), threadConfig);
    return finalState as AgentTeamState;
  }

  /**
   * Builds (but does not invoke) the supervisor compiled graph.
   * Shared between run and resume to ensure identical topology.
   */
  private _buildSupervisorGraph(
    team: AgentTeam,
    checkpointer: PostgresSaver,
    breaker: CircuitBreaker,
    agentIdBySlug: Record<string, string>,
    hitl: boolean
  ) {
    const coordinatorSlug = team.coordinator_slug;
    const specialists = (team.nodes as TeamNode[]).filter(
      (n) => n.data.agentSlug !== coordinatorSlug
    );

    const graph = new StateGraph(AgentTeamStateAnnotation);

    // Node: run all non-coordinator agents in parallel
    graph.addNode('run_specialists', async (state: AgentTeamState) => {
      const outputs: Record<string, string> = {};
      const handoffs: AgentTeamHandoff[] = [];

      await Promise.all(
        specialists.map(async (node) => {
          const slug = node.data.agentSlug;
          const agentId = agentIdBySlug[slug];
          if (!agentId) return;

          try {
            const result = await breaker.execute(() =>
              specialistAgentRunner.run(
                agentId,
                `Task: ${state.task}\n\nAnalyse this from your ${slug} specialist perspective and provide your findings.`,
                'team'
              )
            );
            outputs[slug] = result.outputText;
            handoffs.push({
              from: slug,
              to: coordinatorSlug ?? 'coordinator',
              reason: 'specialist output ready',
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            outputs[slug] = `[Error: agent ${slug} failed — ${errMsg}]`;
            // Write exception for visibility in Operations queue
            import('@/lib/workflow/exception-writer').then(({ writeException }) => {
              const svc = createServiceRoleClient();
              writeException({
                supabase: svc,
                source: 'agent_error',
                severity: 'medium',
                title: `Specialist "${slug}" failed during team run`,
                description: errMsg,
                sourceEntityType: 'specialist_agent',
                sourceEntityId: agentId,
              });
            }).catch(() => {});
          }
        })
      );

      return { outputs, handoff_history: handoffs };
    });

    // Node: HITL review — pause and wait for human approval
    if (hitl) {
      graph.addNode('hitl_review', async (_state: AgentTeamState) => {
        const approved: boolean = interrupt({
          type: 'team_run_approval',
          message: 'Review specialist outputs and approve or reject coordinator synthesis.',
        });
        if (!approved) {
          return { team_result: '[Team run rejected by reviewer]' };
        }
        return {};
      });
    }

    // Node: coordinator synthesises all specialist outputs
    graph.addNode('run_coordinator', async (state: AgentTeamState) => {
      if (!coordinatorSlug || !agentIdBySlug[coordinatorSlug]) {
        return { team_result: Object.values(state.outputs).join('\n\n---\n\n') };
      }

      const specialistSummary = Object.entries(state.outputs)
        .map(([slug, out]) => `### ${slug.toUpperCase()}\n${out}`)
        .join('\n\n');

      const result = await breaker.execute(() =>
        specialistAgentRunner.run(
          agentIdBySlug[coordinatorSlug],
          `Task: ${state.task}\n\nSpecialist reports:\n${specialistSummary}\n\nSynthesise these into a unified strategic recommendation.`,
          'team'
        )
      );

      return {
        team_result: result.outputText,
        outputs: { [coordinatorSlug]: result.outputText },
      };
    });

    // Wire edges — cast via 'as never' (same pattern as WorkflowCompiler.ts)
    graph.addEdge('__start__' as never, 'run_specialists' as never);
    if (hitl) {
      graph.addEdge('run_specialists' as never, 'hitl_review' as never);
      graph.addEdge('hitl_review' as never, 'run_coordinator' as never);
    } else {
      graph.addEdge('run_specialists' as never, 'run_coordinator' as never);
    }
    graph.addEdge('run_coordinator' as never, END as never);

    return graph.compile({ checkpointer });
  }

  // ── Pipeline ───────────────────────────────────────────────────────────────
  // START → agent_0 → agent_1 → ... → agent_n → END

  private async _runPipelineGraph(
    team: AgentTeam,
    initialInput: Pick<AgentTeamState, 'task'>,
    checkpointer: PostgresSaver,
    threadConfig: { configurable: { thread_id: string } },
    breaker: CircuitBreaker,
    agentIdBySlug: Record<string, string>
  ): Promise<{ finalState: AgentTeamState; interrupted: boolean }> {
    const order = this._topologicalSort(team.nodes as TeamNode[], team.edges as TeamEdge[]);
    const graph = new StateGraph(AgentTeamStateAnnotation);

    for (let i = 0; i < order.length; i++) {
      const node = order[i];
      const slug = node.data.agentSlug;
      const agentId = agentIdBySlug[slug];
      const prevSlug = i > 0 ? order[i - 1].data.agentSlug : null;
      const isLast = i === order.length - 1;
      const nodeId = `agent_${i}`;

      graph.addNode(nodeId, async (state: AgentTeamState) => {
        if (!agentId) return {};

        const priorContext = Object.entries(state.outputs)
          .map(([s, o]) => `### ${s.toUpperCase()}\n${o}`)
          .join('\n\n');

        const prompt = priorContext
          ? `Task: ${state.task}\n\nPrior outputs:\n${priorContext}\n\nContinue from your ${slug} perspective.`
          : `Task: ${state.task}\n\nYou are first in the pipeline. Begin your ${slug} analysis.`;

        const result = await breaker.execute(() =>
          specialistAgentRunner.run(agentId, prompt, 'team')
        );

        const handoffs: AgentTeamHandoff[] = prevSlug
          ? [{ from: prevSlug, to: slug, reason: 'pipeline handoff', timestamp: new Date().toISOString() }]
          : [];

        return {
          outputs: { [slug]: result.outputText },
          handoff_history: handoffs,
          current_agent: slug,
          ...(isLast ? { team_result: result.outputText } : {}),
        };
      });
    }

    if (order.length === 0) throw new Error('TeamRuntime: pipeline has no nodes');

    // Wire chain: START → agent_0 → agent_1 → ... → END
    graph.addEdge('__start__' as never, 'agent_0' as never);
    for (let i = 0; i < order.length - 1; i++) {
      graph.addEdge(`agent_${i}` as never, `agent_${i + 1}` as never);
    }
    graph.addEdge(`agent_${order.length - 1}` as never, END as never);

    const compiled = graph.compile({ checkpointer });
    const finalState = (await compiled.invoke(initialInput, threadConfig)) as AgentTeamState;
    return { finalState, interrupted: false };
  }

  // ── Swarm ──────────────────────────────────────────────────────────────────
  // START → swarm_step → (conditional loop) → swarm_step | END

  private async _runSwarmGraph(
    team: AgentTeam,
    initialInput: Pick<AgentTeamState, 'task'>,
    checkpointer: PostgresSaver,
    threadConfig: { configurable: { thread_id: string } },
    breaker: CircuitBreaker,
    agentIdBySlug: Record<string, string>
  ): Promise<{ finalState: AgentTeamState; interrupted: boolean }> {
    const allSlugs = (team.nodes as TeamNode[]).map((n) => n.data.agentSlug);
    const startSlug = team.nodes[0]?.data.agentSlug ?? '';
    const MAX_HOPS = team.nodes.length + 2;

    const graph = new StateGraph(AgentTeamStateAnnotation);

    graph.addNode('swarm_step', async (state: AgentTeamState) => {
      const currentSlug = state.current_agent || startSlug;
      const agentId = agentIdBySlug[currentSlug];
      if (!agentId) return { next_agent: null };

      const priorContext = Object.entries(state.outputs)
        .map(([s, o]) => `### ${s.toUpperCase()}\n${o}`)
        .join('\n\n');

      const availableAgents = allSlugs
        .filter((s) => s !== currentSlug && !state.visited_agents.includes(s))
        .join(', ');

      const prompt =
        `Task: ${state.task}\n\n` +
        (priorContext ? `Prior outputs:\n${priorContext}\n\n` : '') +
        `You are the ${currentSlug} agent. Provide your analysis.\n\n` +
        `If another specialist should continue, end with: NEXT_AGENT: <slug>\n` +
        `Available agents: ${availableAgents || 'none (you are last)'}\n` +
        `If you are done, end with: NEXT_AGENT: done`;

      const result = await breaker.execute(() =>
        specialistAgentRunner.run(agentId, prompt, 'team')
      );

      const nextMatch = result.outputText.match(/NEXT_AGENT:\s*(\S+)/);
      const rawNext = nextMatch?.[1];
      const nextSlug = rawNext === 'done' || !rawNext ? null : rawNext;

      const handoffs: AgentTeamHandoff[] = nextSlug
        ? [{ from: currentSlug, to: nextSlug, reason: 'swarm routing', timestamp: new Date().toISOString() }]
        : [];

      return {
        outputs: { [currentSlug]: result.outputText },
        next_agent: nextSlug,
        visited_agents: [currentSlug],
        handoff_history: handoffs,
        current_agent: nextSlug ?? currentSlug,
        team_result: result.outputText,
        hop_count: state.hop_count + 1,
      };
    });

    graph.addEdge('__start__' as never, 'swarm_step' as never);
    graph.addConditionalEdges('swarm_step' as never, (state: AgentTeamState) => {
      const canContinue =
        state.next_agent !== null &&
        !state.visited_agents.includes(state.next_agent) &&
        state.hop_count < MAX_HOPS;
      return (canContinue ? 'swarm_step' : END) as never;
    });

    const compiled = graph.compile({ checkpointer });
    const finalState = (await compiled.invoke(
      { ...initialInput, current_agent: startSlug },
      threadConfig
    )) as AgentTeamState;
    return { finalState, interrupted: false };
  }

  // ── Phase 6E: Learning Loop ────────────────────────────────────────────────

  private async _writeTeamRunDecisionStubs(
    supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
    executionId: string
  ): Promise<void> {
    const stubs = TEAM_RUN_OUTCOME_METRICS.map(({ metric, lag_days }) => ({
      execution_id: executionId,
      outcome_metric: metric,
      outcome_value: null,
      lag_days,
    }));
    await supabase.from('decision_outcomes').insert(stubs);
  }

  // ── Topology validation ────────────────────────────────────────────────────

  _validateTopology(team: AgentTeam): void {
    if (!team.nodes || team.nodes.length === 0) {
      throw new Error(`TeamRuntime: team '${team.slug}' has no nodes`);
    }
    if (team.pattern === 'supervisor' && !team.coordinator_slug) {
      throw new Error(`TeamRuntime: supervisor team '${team.slug}' has no coordinator_slug`);
    }
    const slugs = new Set(team.nodes.map((n) => n.data.agentSlug).filter(Boolean));
    if (slugs.size === 0) {
      throw new Error(`TeamRuntime: team '${team.slug}' has no valid agent slugs in nodes`);
    }
    if (team.pattern === 'supervisor' && team.coordinator_slug && !slugs.has(team.coordinator_slug)) {
      throw new Error(
        `TeamRuntime: coordinator_slug '${team.coordinator_slug}' is not in team nodes for '${team.slug}'`
      );
    }
  }

  // ── Topological sort ────────────────────────────────────────────────────────

  _topologicalSort(nodes: TeamNode[], edges: TeamEdge[]): TeamNode[] {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    for (const n of nodes) {
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
    }
    for (const e of edges) {
      adj.get(e.source)?.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }

    const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
    const result: TeamNode[] = [];

    while (queue.length) {
      const node = queue.shift()!;
      result.push(node);
      for (const next of adj.get(node.id) ?? []) {
        const deg = (inDegree.get(next) ?? 1) - 1;
        inDegree.set(next, deg);
        if (deg === 0) {
          const nextNode = nodes.find((n) => n.id === next);
          if (nextNode) queue.push(nextNode);
        }
      }
    }

    return result.length === nodes.length ? result : nodes;
  }
}

export const teamRuntime = new TeamRuntime();
