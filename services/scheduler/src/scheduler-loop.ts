/**
 * Filename: services/scheduler/src/scheduler-loop.ts
 * Purpose: Core poll loop — query due items, claim, dispatch, handle recurrence
 */

import { query } from './db.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { claim, release, fail } from './locking.js';
import { dispatch } from './dispatcher.js';
import { handleRecurrence } from './recurrence.js';
import { startRun, completeRun, failRun } from './runs.js';
import type { ScheduledItem } from './types.js';

let pollTimer: ReturnType<typeof setInterval> | null = null;
let isPolling = false;

const DB_CALL_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${DB_CALL_TIMEOUT_MS}ms`)), DB_CALL_TIMEOUT_MS)
    ),
  ]);
}

// Stats for health check
export const stats = {
  lastPollAt: null as string | null,
  itemsProcessedTotal: 0,
  itemsFailedTotal: 0,
  pollCount: 0,
};

/**
 * Single poll cycle: fetch due items, claim and execute each.
 */
async function pollCycle(): Promise<void> {
  if (isPolling) return; // Skip if previous cycle is still running
  isPolling = true;

  try {
    stats.lastPollAt = new Date().toISOString();
    stats.pollCount++;

    // Fetch due items
    const result = await query<ScheduledItem>(
      `SELECT * FROM scheduled_items
       WHERE status IN ('scheduled', 'failed')
         AND scheduled_at <= now()
         AND attempt_count < max_retries
       ORDER BY scheduled_at ASC
       LIMIT $1`,
      [config.batchSize]
    );

    const items = result.rows;
    if (items.length === 0) return;

    logger.debug('poll_found', { count: items.length });

    // Process items sequentially to avoid overwhelming downstream services
    for (const item of items) {
      await processItem(item);
    }
  } catch (err) {
    logger.error('poll_cycle_error', {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    isPolling = false;
  }
}

/**
 * Process a single item: claim → dispatch → release/fail → recurrence
 */
async function processItem(item: ScheduledItem): Promise<void> {
  // 1. Attempt to claim
  const claimed = await claim(item);
  if (!claimed) return;

  // 2. Start a run record
  const runId = await startRun(claimed.id, claimed.attempt_count);

  try {
    // 3. Dispatch to executor
    const result = await dispatch(claimed);

    // 4. Tasks remain in_progress until manually completed by user.
    //    Complete the run record so it doesn't stay as 'running' forever.
    if (claimed.type === 'task') {
      await withTimeout(
        completeRun(runId, { note: 'Task activated — awaiting manual completion' }),
        'completeRun'
      );
      stats.itemsProcessedTotal++;
      logger.info('task_in_progress', {
        id: claimed.id,
        title: claimed.title,
      });
      return;
    }

    // 5. Release (mark completed)
    try {
      await withTimeout(release(claimed.id), 'release');
      await withTimeout(completeRun(runId, result.result), 'completeRun');
    } catch (dbErr) {
      logger.error('release_timeout', {
        id: claimed.id,
        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
      return;
    }
    stats.itemsProcessedTotal++;

    logger.info('item_completed', {
      id: claimed.id,
      title: claimed.title,
      type: claimed.type,
    });

    // 6. Handle recurrence (schedule next run)
    await handleRecurrence(claimed);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);

    // Mark item as failed (or back to scheduled if retries remain)
    try {
      await withTimeout(fail(claimed.id, errorMsg), 'fail');
      await withTimeout(failRun(runId, errorMsg), 'failRun');
    } catch (dbErr) {
      logger.error('fail_timeout', {
        id: claimed.id,
        error: dbErr instanceof Error ? dbErr.message : String(dbErr),
      });
      return;
    }
    stats.itemsFailedTotal++;

    logger.error('item_failed', {
      id: claimed.id,
      title: claimed.title,
      type: claimed.type,
      attempt: claimed.attempt_count,
      error: errorMsg,
    });
  }
}

/**
 * Returns count of items currently in_progress (for health check).
 */
export function getInProgressCount(): number {
  return isPolling ? 1 : 0; // Approximation — reflects whether a poll cycle is active
}

/**
 * Start the poll loop.
 */
export async function startLoop(): Promise<void> {
  logger.info('loop_started', { interval_ms: config.pollIntervalMs });
  // Run immediately (awaited so boot-time errors surface), then on interval
  await pollCycle();
  pollTimer = setInterval(pollCycle, config.pollIntervalMs);
}

/**
 * Stop the poll loop. Waits for in-flight cycle to complete.
 */
export async function stopLoop(): Promise<void> {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  // Wait for in-flight poll to finish (max 30s)
  const deadline = Date.now() + 30000;
  while (isPolling && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 500));
  }

  logger.info('loop_stopped', {
    processed: stats.itemsProcessedTotal,
    failed: stats.itemsFailedTotal,
  });
}
