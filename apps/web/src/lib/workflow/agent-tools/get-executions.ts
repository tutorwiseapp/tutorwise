/**
 * Workflow Agent Tool: get-executions
 *
 * Returns live execution state for a user — active, paused, and recent completed
 * workflow executions. Used by AI agents to understand the current operational status.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';

export interface GetExecutionsInput {
  userId?: string;
  processId?: string;
  status?: 'running' | 'paused' | 'completed' | 'failed' | 'all';
  limit?: number;
}

export interface ExecutionSummary {
  id: string;
  process_id: string;
  process_name: string | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  is_shadow: boolean;
  context_keys: string[];
}

export async function getExecutions(input: GetExecutionsInput): Promise<ExecutionSummary[]> {
  const supabase = await createServiceRoleClient();
  const limit = input.limit ?? 20;

  let query = supabase
    .from('workflow_executions')
    .select(`
      id,
      process_id,
      status,
      started_at,
      completed_at,
      is_shadow,
      execution_context,
      workflow_processes!inner(name)
    `)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (input.processId) {
    query = query.eq('process_id', input.processId);
  }

  if (input.status && input.status !== 'all') {
    query = query.eq('status', input.status);
  } else if (!input.status) {
    // Default: active only
    query = query.in('status', ['running', 'paused']);
  }

  const { data, error } = await query;
  if (error) throw new Error(`get-executions: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    process_id: row.process_id as string,
    process_name: ((row.workflow_processes as { name?: string }) ?? {}).name ?? null,
    status: row.status as string,
    started_at: row.started_at as string,
    completed_at: row.completed_at as string | null,
    is_shadow: row.is_shadow as boolean,
    context_keys: Object.keys((row.execution_context as Record<string, unknown>) ?? {}),
  }));
}
