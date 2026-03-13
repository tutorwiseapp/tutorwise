/**
 * Filename: services/scheduler/src/locking.ts
 * Purpose: Optimistic locking primitives — claim, release, fail, reclaim stale
 */

import { query } from './db.js';
import { config } from './config.js';
import { logger } from './logger.js';
import type { ScheduledItem } from './types.js';

/**
 * Attempt to claim an item for execution.
 * Returns the claimed item or null if already claimed by another instance.
 */
export async function claim(item: ScheduledItem): Promise<ScheduledItem | null> {
  const result = await query<ScheduledItem>(
    `UPDATE scheduled_items
     SET status = 'in_progress',
         lock_version = lock_version + 1,
         locked_by = $1,
         locked_at = now(),
         started_at = now(),
         attempt_count = attempt_count + 1,
         updated_at = now()
     WHERE id = $2
       AND lock_version = $3
       AND status IN ('scheduled', 'failed')
     RETURNING *`,
    [config.instanceId, item.id, item.lock_version]
  );

  if (result.rowCount === 0) {
    logger.debug('claim_skipped', { id: item.id, title: item.title });
    return null;
  }

  logger.info('item_claimed', {
    id: item.id,
    title: item.title,
    type: item.type,
    attempt: result.rows[0].attempt_count,
  });

  return result.rows[0];
}

/**
 * Release an item after successful execution.
 */
export async function release(itemId: string): Promise<void> {
  await query(
    `UPDATE scheduled_items
     SET status = 'completed',
         completed_at = now(),
         locked_by = NULL,
         locked_at = NULL,
         updated_at = now()
     WHERE id = $1`,
    [itemId]
  );
}

/**
 * Mark an item as failed. If retries remain, reset to 'scheduled' for next poll.
 */
export async function fail(itemId: string, error: string): Promise<void> {
  await query(
    `UPDATE scheduled_items
     SET status = CASE
           WHEN attempt_count >= max_retries THEN 'failed'
           ELSE 'scheduled'
         END,
         locked_by = NULL,
         locked_at = NULL,
         last_error = $2,
         updated_at = now()
     WHERE id = $1`,
    [itemId, error]
  );
}

/**
 * Reclaim items stuck in 'in_progress' beyond the stale lock threshold.
 * Called on boot and periodically as a safety net.
 */
export async function reclaimStale(): Promise<number> {
  const result = await query<{ id: string; title: string; type: string }>(
    `UPDATE scheduled_items
     SET status = 'scheduled',
         locked_by = NULL,
         locked_at = NULL,
         updated_at = now()
     WHERE status = 'in_progress'
       AND locked_at < now() - make_interval(mins := $1)
     RETURNING id, title, type`,
    [config.staleLockMinutes]
  );

  const count = result.rowCount ?? 0;
  if (count > 0) {
    for (const row of result.rows) {
      logger.warn('stale_lock_reclaimed', { id: row.id, title: row.title, type: row.type });
    }
  }

  return count;
}
