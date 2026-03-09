/**
 * Workflow Agent Tool: list-approvals
 *
 * Returns pending HITL (Human-in-the-Loop) tasks awaiting admin approval.
 * Used by admin AI agents to surface decisions that need human judgment.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';

export interface ApprovalTask {
  id: string;
  execution_id: string;
  node_id: string;
  node_label: string | null;
  status: string;
  created_at: string;
  execution_context: Record<string, unknown>;
  process_name: string | null;
}

export async function listApprovals(limit = 50): Promise<ApprovalTask[]> {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('workflow_tasks')
    .select(`
      id,
      execution_id,
      node_id,
      node_label,
      status,
      created_at,
      workflow_executions!inner(
        execution_context,
        workflow_processes!inner(name)
      )
    `)
    .eq('status', 'paused')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`list-approvals: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const execution = row.workflow_executions as Record<string, unknown> | null;
    const process = execution?.workflow_processes as Record<string, unknown> | null;
    return {
      id: row.id as string,
      execution_id: row.execution_id as string,
      node_id: row.node_id as string,
      node_label: row.node_label as string | null,
      status: row.status as string,
      created_at: row.created_at as string,
      execution_context: (execution?.execution_context as Record<string, unknown>) ?? {},
      process_name: (process?.name as string) ?? null,
    };
  });
}
