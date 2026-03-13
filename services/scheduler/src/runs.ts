/**
 * Filename: services/scheduler/src/runs.ts
 * Purpose: Execution history — write to scheduler_runs for UI visibility
 */

import { query } from './db.js';
import type { ExecutorResult } from './types.js';

/**
 * Create a run record when execution starts.
 * Returns the run ID.
 */
export async function startRun(itemId: string, attempt: number): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO scheduler_runs (item_id, status, attempt)
     VALUES ($1, 'running', $2)
     RETURNING id`,
    [itemId, attempt]
  );
  return result.rows[0].id;
}

/**
 * Mark a run as completed.
 */
export async function completeRun(runId: string, result?: Record<string, unknown>): Promise<void> {
  await query(
    `UPDATE scheduler_runs
     SET status = 'completed',
         completed_at = now(),
         duration_ms = (EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer,
         result = $2
     WHERE id = $1`,
    [runId, result ? JSON.stringify(result) : null]
  );
}

/**
 * Mark a run as failed.
 */
export async function failRun(runId: string, error: string): Promise<void> {
  await query(
    `UPDATE scheduler_runs
     SET status = 'failed',
         completed_at = now(),
         duration_ms = (EXTRACT(EPOCH FROM (now() - started_at)) * 1000)::integer,
         error = $2
     WHERE id = $1`,
    [runId, error]
  );
}
