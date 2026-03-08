/**
 * IWorkflowRuntime — 4-method narrow interface for the Process Execution Engine.
 *
 * Deliberately separate from CAS AgentRuntimeInterface (22-method, CAS-specific).
 * PlatformWorkflowRuntime implements this interface.
 *
 * Design doc: fuchsia/process-execution-solution-design.md §4.1
 */

export type ExecutionStatus = 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface IWorkflowRuntime {
  /** Start a new execution from a workflow_process record. Returns the execution ID. */
  start(processId: string, context: Record<string, unknown>): Promise<string>;

  /**
   * Resume a paused checkpoint (HITL approval, webhook callback, AI session end).
   * threadId is the langgraph_thread_id stored on workflow_executions.
   */
  resume(
    threadId: string,
    decision: string,
    resultData: Record<string, unknown>
  ): Promise<void>;

  /** Cancel a running or paused execution. */
  cancel(executionId: string): Promise<void>;

  /** Get current status and active node for an execution. */
  getStatus(
    executionId: string
  ): Promise<{ status: ExecutionStatus; currentNodeId: string | null }>;
}
