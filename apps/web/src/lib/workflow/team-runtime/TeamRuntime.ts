/**
 * TeamRuntime
 * Compiles and executes multi-agent teams from the agent_teams DB table.
 * Supports three patterns: supervisor, pipeline, swarm.
 *
 * Uses the same PostgresSaver checkpointer as PlatformWorkflowRuntime
 * for consistent state management.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import { specialistAgentRunner } from '@/lib/agent-studio/SpecialistAgentRunner';
import type { AgentTeamState } from './AgentTeamState';
import { INITIAL_AGENT_TEAM_STATE } from './AgentTeamState';

export interface TeamRunResult {
  team_result: string | null;
  agent_outputs: Record<string, string>;
  handoff_history: AgentTeamState['handoff_history'];
  status: 'completed' | 'failed';
  duration_ms: number;
  run_id: string;
}

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

class TeamRuntime {
  async run(teamSlug: string, task: string, triggerType: string = 'manual'): Promise<TeamRunResult> {
    const startTime = Date.now();
    const supabase = await createServiceRoleClient();

    const { data: team, error } = await supabase
      .from('agent_teams')
      .select('id, slug, name, pattern, nodes, edges, coordinator_slug')
      .eq('slug', teamSlug)
      .eq('status', 'active')
      .single();

    if (error || !team) throw new Error(`Team not found: ${teamSlug}`);

    // Insert run record
    const { data: runRow } = await supabase
      .from('agent_team_run_outputs')
      .insert({ team_id: team.id, trigger_type: triggerType, task, status: 'running' })
      .select('id')
      .single();

    const runId = runRow?.id ?? '';
    let state: AgentTeamState = { task, ...INITIAL_AGENT_TEAM_STATE };

    try {
      state = await this._execute(team as AgentTeam, state);

      const durationMs = Date.now() - startTime;
      await supabase
        .from('agent_team_run_outputs')
        .update({
          team_result: state.team_result,
          agent_outputs: state.outputs,
          handoff_history: state.handoff_history,
          status: 'completed',
          duration_ms: durationMs,
        })
        .eq('id', runId);

      return {
        team_result: state.team_result,
        agent_outputs: state.outputs,
        handoff_history: state.handoff_history,
        status: 'completed',
        duration_ms: durationMs,
        run_id: runId,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      await supabase
        .from('agent_team_run_outputs')
        .update({ status: 'failed', duration_ms: durationMs })
        .eq('id', runId);
      throw err;
    }
  }

  private async _execute(team: AgentTeam, state: AgentTeamState): Promise<AgentTeamState> {
    const supabase = await createServiceRoleClient();

    // Load all agents referenced in nodes
    const agentSlugs = team.nodes.map((n) => n.data.agentSlug).filter(Boolean);
    const { data: agents } = await supabase
      .from('specialist_agents')
      .select('id, slug')
      .in('slug', agentSlugs)
      .eq('status', 'active');

    const agentIdBySlug: Record<string, string> = {};
    for (const a of agents ?? []) agentIdBySlug[a.slug] = a.id;

    switch (team.pattern) {
      case 'supervisor':
        return this._runSupervisor(team, state, agentIdBySlug);
      case 'pipeline':
        return this._runPipeline(team, state, agentIdBySlug);
      case 'swarm':
        return this._runSwarm(team, state, agentIdBySlug);
      default:
        throw new Error(`Unknown team pattern: ${team.pattern}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Supervisor: all specialists run in parallel, coordinator synthesises
  // ---------------------------------------------------------------------------
  private async _runSupervisor(
    team: AgentTeam,
    state: AgentTeamState,
    agentIdBySlug: Record<string, string>
  ): Promise<AgentTeamState> {
    const coordinatorSlug = team.coordinator_slug;
    const specialists = team.nodes.filter((n) => n.data.agentSlug !== coordinatorSlug);

    // Run all specialists in parallel
    const outputs: Record<string, string> = {};
    await Promise.all(
      specialists.map(async (node) => {
        const slug = node.data.agentSlug;
        const agentId = agentIdBySlug[slug];
        if (!agentId) return;

        try {
          const result = await specialistAgentRunner.run(
            agentId,
            `Task: ${state.task}\n\nPlease analyse this from your ${slug} specialist perspective and provide your findings.`,
            'team'
          );
          outputs[slug] = result.outputText;
          state.handoff_history.push({
            from: slug,
            to: coordinatorSlug ?? 'coordinator',
            reason: 'specialist output ready',
            timestamp: new Date().toISOString(),
          });
        } catch {
          outputs[slug] = `[Error: agent ${slug} failed]`;
        }
      })
    );

    state.outputs = { ...state.outputs, ...outputs };

    // Coordinator synthesises
    if (coordinatorSlug && agentIdBySlug[coordinatorSlug]) {
      const specialistSummary = Object.entries(outputs)
        .map(([slug, out]) => `### ${slug.toUpperCase()}\n${out}`)
        .join('\n\n');

      const synthesisPrompt = `Task: ${state.task}\n\nSpecialist reports:\n${specialistSummary}\n\nPlease synthesise these reports into a unified strategic recommendation.`;

      const coordResult = await specialistAgentRunner.run(
        agentIdBySlug[coordinatorSlug],
        synthesisPrompt,
        'team'
      );
      state.team_result = coordResult.outputText;
      state.outputs[coordinatorSlug] = coordResult.outputText;
    } else {
      state.team_result = Object.values(outputs).join('\n\n---\n\n');
    }

    return state;
  }

  // ---------------------------------------------------------------------------
  // Pipeline: sequential execution, each agent receives prior context
  // ---------------------------------------------------------------------------
  private async _runPipeline(
    team: AgentTeam,
    state: AgentTeamState,
    agentIdBySlug: Record<string, string>
  ): Promise<AgentTeamState> {
    // Topological sort via edges
    const order = this._topologicalSort(team.nodes, team.edges);

    for (let i = 0; i < order.length; i++) {
      const node = order[i];
      const slug = node.data.agentSlug;
      const agentId = agentIdBySlug[slug];
      if (!agentId) continue;

      const priorContext = Object.entries(state.outputs)
        .map(([s, o]) => `### ${s.toUpperCase()}\n${o}`)
        .join('\n\n');

      const prompt = priorContext
        ? `Task: ${state.task}\n\nPrior outputs:\n${priorContext}\n\nPlease continue from your ${slug} perspective.`
        : `Task: ${state.task}\n\nYou are first in the pipeline. Please begin your ${slug} analysis.`;

      const result = await specialistAgentRunner.run(agentId, prompt, 'team');
      state.outputs[slug] = result.outputText;

      if (i > 0) {
        state.handoff_history.push({
          from: order[i - 1].data.agentSlug,
          to: slug,
          reason: 'pipeline handoff',
          timestamp: new Date().toISOString(),
        });
      }
    }

    state.team_result = Object.values(state.outputs).at(-1) ?? null;
    return state;
  }

  // ---------------------------------------------------------------------------
  // Swarm: dynamic routing — each agent decides next agent
  // ---------------------------------------------------------------------------
  private async _runSwarm(
    team: AgentTeam,
    state: AgentTeamState,
    agentIdBySlug: Record<string, string>
  ): Promise<AgentTeamState> {
    const startNode = team.nodes[0];
    if (!startNode) return state;

    let currentSlug = startNode.data.agentSlug;
    const visited = new Set<string>();
    const MAX_HOPS = team.nodes.length + 2;

    for (let hop = 0; hop < MAX_HOPS; hop++) {
      if (visited.has(currentSlug)) break;
      visited.add(currentSlug);

      const agentId = agentIdBySlug[currentSlug];
      if (!agentId) break;

      const priorContext = Object.entries(state.outputs)
        .map(([s, o]) => `### ${s.toUpperCase()}\n${o}`)
        .join('\n\n');

      const availableAgents = team.nodes
        .map((n) => n.data.agentSlug)
        .filter((s) => s !== currentSlug && !visited.has(s))
        .join(', ');

      const prompt = `Task: ${state.task}\n\n${priorContext ? `Prior outputs:\n${priorContext}\n\n` : ''}You are the ${currentSlug} agent. Please provide your analysis.\n\nIf another specialist should continue, end your response with: NEXT_AGENT: <slug>\nAvailable agents: ${availableAgents || 'none (you are last)'}\nIf you are done, end with: NEXT_AGENT: done`;

      const result = await specialistAgentRunner.run(agentId, prompt, 'team');
      state.outputs[currentSlug] = result.outputText;

      const nextMatch = result.outputText.match(/NEXT_AGENT:\s*(\w+)/);
      const nextSlug = nextMatch?.[1];

      if (!nextSlug || nextSlug === 'done') break;

      state.handoff_history.push({
        from: currentSlug,
        to: nextSlug,
        reason: 'swarm routing',
        timestamp: new Date().toISOString(),
      });

      currentSlug = nextSlug;
    }

    state.team_result = Object.values(state.outputs).at(-1) ?? null;
    return state;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  private _topologicalSort(nodes: TeamNode[], edges: TeamEdge[]): TeamNode[] {
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

    return result.length === nodes.length ? result : nodes; // fallback: original order
  }
}

export const teamRuntime = new TeamRuntime();
