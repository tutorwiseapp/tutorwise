/**
 * Filename: services/scheduler/src/types.ts
 * Purpose: Shared types for the scheduler service
 */

export interface ScheduledItem {
  id: string;
  title: string;
  description: string | null;
  type: 'content' | 'agent_run' | 'team_run' | 'task' | 'reminder' | 'cron_job' | 'sql_func';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'failed';
  scheduled_at: string;
  completed_at: string | null;
  due_date: string | null;
  recurrence: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'cron' | null;
  recurrence_end: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Execution tracking
  lock_version: number;
  locked_by: string | null;
  locked_at: string | null;
  started_at: string | null;
  attempt_count: number;
  max_retries: number;
  last_error: string | null;

  // Cron/function fields
  cron_expression: string | null;
  endpoint: string | null;
  sql_function: string | null;
  http_method: 'GET' | 'POST' | null;
}

export interface SchedulerRun {
  id: string;
  item_id: string;
  status: 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error: string | null;
  result: Record<string, unknown> | null;
  attempt: number;
  created_at: string;
}

export interface ExecutorResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}
