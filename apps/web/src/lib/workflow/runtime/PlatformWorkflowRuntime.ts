/**
 * PlatformWorkflowRuntime
 *
 * Implements IWorkflowRuntime. Separate from CAS LangGraphRuntime.
 * Uses LangGraph StateGraph with PostgresSaver checkpointing for pause/resume.
 *
 * Design doc: fuchsia/process-execution-solution-design.md §4.1
 */

import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import { Command } from '@langchain/langgraph';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { WorkflowCompiler } from './WorkflowCompiler';
import type { IWorkflowRuntime, ExecutionStatus } from './IWorkflowRuntime';

// ---------------------------------------------------------------------------
// Singleton checkpointer — shared across all executions
// ---------------------------------------------------------------------------

let _checkpointer: PostgresSaver | null = null;

function getCheckpointer(): PostgresSaver {
  if (!_checkpointer) {
    const connString = process.env.POSTGRES_URL_NON_POOLING;
    if (!connString) {
      throw new Error('PlatformWorkflowRuntime: POSTGRES_URL_NON_POOLING is not set');
    }
    _checkpointer = PostgresSaver.fromConnString(connString);
  }
  return _checkpointer;
}

// ---------------------------------------------------------------------------
// PlatformWorkflowRuntime
// ---------------------------------------------------------------------------

export class PlatformWorkflowRuntime implements IWorkflowRuntime {
  private get compiler(): WorkflowCompiler {
    return new WorkflowCompiler(getCheckpointer());
  }

  // -------------------------------------------------------------------------
  // start — compile and invoke a workflow
  // -------------------------------------------------------------------------

  async start(processId: string, context: Record<string, unknown>): Promise<string> {
    const supabase = createServiceRoleClient();

    // Load process
    const { data: process, error: processError } = await supabase
      .from('workflow_processes')
      .select('id, name, execution_mode, nodes, edges')
      .eq('id', processId)
      .single();

    if (processError || !process) {
      throw new Error(`PlatformWorkflowRuntime.start: process ${processId} not found`);
    }

    const executionMode = process.execution_mode ?? 'live';

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .insert({
        process_id: processId,
        status: 'running',
        is_shadow: executionMode === 'shadow',
        execution_context: context,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (execError || !execution) {
      throw new Error(`PlatformWorkflowRuntime.start: failed to create execution — ${execError?.message}`);
    }

    const executionId = execution.id;

    // Update with langgraph_thread_id (same as execution id for simplicity)
    await supabase
      .from('workflow_executions')
      .update({ langgraph_thread_id: executionId })
      .eq('id', executionId);

    try {
      // Compile graph
      const compiledGraph = this.compiler.compile(
        process.nodes,
        process.edges,
        executionMode
      );

      // Ensure checkpointer tables exist (idempotent)
      await getCheckpointer().setup();

      const threadConfig = { configurable: { thread_id: executionId } };

      const initialState = {
        executionId,
        processId,
        executionMode,
        context,
        currentNodeId: '',
        completedNodes: [],
        errors: [],
      };

      // Invoke — runs until completion or first interrupt
      await compiledGraph.invoke(initialState, threadConfig);

      // Check if still paused (interrupted) or completed
      const { data: updatedExecution } = await supabase
        .from('workflow_executions')
        .select('status')
        .eq('id', executionId)
        .single();

      if (updatedExecution?.status === 'running') {
        // No interrupt occurred — mark completed
        await supabase
          .from('workflow_executions')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', executionId);

        // Phase 4D: Write decision_outcomes stubs for learning loop measurement
        await writeDecisionOutcomeStubs(supabase, executionId, processId).catch(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[PlatformWorkflowRuntime] Execution ${executionId} failed:`, message);

      await supabase
        .from('workflow_executions')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', executionId);

      import('@/lib/workflow/exception-writer').then(({ writeException }) =>
        writeException({
          supabase,
          source: 'workflow_failure',
          severity: 'high',
          title: `Workflow execution failed`,
          description: message,
          sourceEntityType: 'workflow_execution',
          sourceEntityId: executionId,
          context: { error: message, process_id: processId },
        })
      ).catch(() => {});

      throw err;
    }

    return executionId;
  }

  // -------------------------------------------------------------------------
  // resume — continue from a paused checkpoint
  // -------------------------------------------------------------------------

  async resume(
    threadId: string,
    decision: string,
    resultData: Record<string, unknown>
  ): Promise<void> {
    const supabase = createServiceRoleClient();

    // Load execution to get processId
    const { data: execution, error: execError } = await supabase
      .from('workflow_executions')
      .select('id, process_id, execution_mode')
      .eq('langgraph_thread_id', threadId)
      .single();

    if (execError || !execution) {
      throw new Error(`PlatformWorkflowRuntime.resume: execution not found for thread ${threadId}`);
    }

    // Load process to recompile the graph
    const { data: process, error: processError } = await supabase
      .from('workflow_processes')
      .select('id, nodes, edges, execution_mode')
      .eq('id', execution.process_id)
      .single();

    if (processError || !process) {
      throw new Error(`PlatformWorkflowRuntime.resume: process not found`);
    }

    const executionMode = execution.execution_mode ?? process.execution_mode ?? 'live';

    // Recompile (same checkpointer = same stored thread state)
    const compiledGraph = this.compiler.compile(
      process.nodes,
      process.edges,
      executionMode
    );

    const threadConfig = { configurable: { thread_id: threadId } };

    // Mark execution back to running
    await supabase
      .from('workflow_executions')
      .update({ status: 'running' })
      .eq('id', execution.id);

    try {
      // Resume with the decision payload
      await compiledGraph.invoke(
        new Command({ resume: { decision, ...resultData } }),
        threadConfig
      );

      // If no further interrupt — mark completed
      const { data: updatedExecution } = await supabase
        .from('workflow_executions')
        .select('status')
        .eq('id', execution.id)
        .single();

      if (updatedExecution?.status === 'running') {
        await supabase
          .from('workflow_executions')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', execution.id);

        // Phase 4D: Write decision_outcomes stubs for learning loop measurement
        await writeDecisionOutcomeStubs(supabase, execution.id, execution.process_id).catch(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[PlatformWorkflowRuntime] Resume failed for thread ${threadId}:`, message);

      await supabase
        .from('workflow_executions')
        .update({ status: 'failed', completed_at: new Date().toISOString() })
        .eq('id', execution.id);

      import('@/lib/workflow/exception-writer').then(({ writeException }) =>
        writeException({
          supabase,
          source: 'workflow_failure',
          severity: 'high',
          title: `Workflow resume failed`,
          description: message,
          sourceEntityType: 'workflow_execution',
          sourceEntityId: execution.id,
          context: { error: message, thread_id: threadId },
        })
      ).catch(() => {});

      throw err;
    }
  }

  // -------------------------------------------------------------------------
  // cancel
  // -------------------------------------------------------------------------

  async cancel(executionId: string): Promise<void> {
    const supabase = createServiceRoleClient();

    await supabase
      .from('workflow_executions')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', executionId);

    // Mark any running/paused tasks as cancelled
    await supabase
      .from('workflow_tasks')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('execution_id', executionId)
      .in('status', ['running', 'paused']);
  }

  // -------------------------------------------------------------------------
  // getStatus
  // -------------------------------------------------------------------------

  async getStatus(
    executionId: string
  ): Promise<{ status: ExecutionStatus; currentNodeId: string | null }> {
    const supabase = createServiceRoleClient();

    const { data: execution } = await supabase
      .from('workflow_executions')
      .select('status')
      .eq('id', executionId)
      .single();

    if (!execution) {
      throw new Error(`PlatformWorkflowRuntime.getStatus: execution ${executionId} not found`);
    }

    // Find the most recent running or paused task
    const { data: activeTask } = await supabase
      .from('workflow_tasks')
      .select('node_id')
      .eq('execution_id', executionId)
      .in('status', ['running', 'paused'])
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      status: execution.status as ExecutionStatus,
      currentNodeId: activeTask?.node_id ?? null,
    };
  }
}

// Singleton — one runtime instance shared across requests
export const workflowRuntime = new PlatformWorkflowRuntime();

// ---------------------------------------------------------------------------
// Phase 4D: Learning Loop — decision_outcomes stubs
// ---------------------------------------------------------------------------

// Maps process slug → outcome metrics to track (for pg_cron jobs to fill)
const PROCESS_OUTCOME_METRICS: Record<string, Array<{ metric: string; lag_days: number }>> = {
  'tutor-approval':          [{ metric: 'dispute_raised', lag_days: 30 }, { metric: 'active_30d', lag_days: 30 }],
  'commission-payout':       [{ metric: 'payout_correct', lag_days: 7 }, { metric: 'dispute_raised', lag_days: 30 }],
  'booking-lifecycle-human': [{ metric: 'booking_completed', lag_days: 14 }, { metric: 'cancellation_rate', lag_days: 30 }],
  'booking-lifecycle-ai':    [{ metric: 'booking_completed', lag_days: 14 }, { metric: 'cancellation_rate', lag_days: 30 }],
  'referral-attribution':    [{ metric: 'nudge_converted', lag_days: 14 }, { metric: 'commission_earned', lag_days: 30 }],
};

/**
 * Write decision_outcomes stub rows when a workflow execution completes.
 * pg_cron jobs will fill outcome_value at the appropriate lag intervals.
 * Fails silently — learning loop is non-critical infrastructure.
 */
async function writeDecisionOutcomeStubs(
  supabase: ReturnType<typeof createServiceRoleClient>,
  executionId: string,
  processId: string
): Promise<void> {
  // Look up process slug
  const { data: process } = await supabase
    .from('workflow_processes')
    .select('slug')
    .eq('id', processId)
    .single();

  const slug = process?.slug ?? '';
  const metrics = PROCESS_OUTCOME_METRICS[slug];
  if (!metrics?.length) return;

  // Insert outcome stubs (outcome_value = null, filled later by pg_cron)
  const stubs = metrics.map(({ metric, lag_days }) => ({
    execution_id: executionId,
    outcome_metric: metric,
    outcome_value: null,
    lag_days,
  }));

  await supabase.from('decision_outcomes').insert(stubs);
}
