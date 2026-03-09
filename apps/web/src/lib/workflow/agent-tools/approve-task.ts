/**
 * Workflow Agent Tool: approve-task
 *
 * Approves or rejects a HITL task. Resumes the workflow execution
 * after the decision is recorded.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import { workflowRuntime } from '@/lib/workflow/runtime/PlatformWorkflowRuntime';

export interface ApproveTaskInput {
  taskId: string;
  decision: 'approve' | 'reject';
  reason?: string;
  adminUserId: string;
}

export interface ApproveTaskResult {
  success: boolean;
  executionId: string | null;
  message: string;
}

export async function approveTask(input: ApproveTaskInput): Promise<ApproveTaskResult> {
  const supabase = await createServiceRoleClient();

  // Fetch the task
  const { data: task, error: fetchErr } = await supabase
    .from('workflow_tasks')
    .select('id, execution_id, node_id, status')
    .eq('id', input.taskId)
    .single();

  if (fetchErr || !task) {
    return { success: false, executionId: null, message: 'Task not found' };
  }

  if (task.status !== 'paused') {
    return {
      success: false,
      executionId: task.execution_id,
      message: `Task is not paused (status: ${task.status})`,
    };
  }

  // Update task status
  const completedStatus = input.decision === 'approve' ? 'completed' : 'failed';
  await supabase
    .from('workflow_tasks')
    .update({
      status: completedStatus,
      output: { decision: input.decision, reason: input.reason ?? null, decided_by: input.adminUserId },
      completed_at: new Date().toISOString(),
    })
    .eq('id', input.taskId);

  // Resume execution
  try {
    await workflowRuntime.resume(
      task.execution_id,
      input.decision,
      { nodeId: task.node_id, reason: input.reason ?? null }
    );
  } catch (err) {
    console.error('[approve-task] Failed to resume execution:', err);
    return {
      success: false,
      executionId: task.execution_id,
      message: 'Task updated but failed to resume execution',
    };
  }

  return {
    success: true,
    executionId: task.execution_id,
    message: `Task ${input.decision}d successfully`,
  };
}
