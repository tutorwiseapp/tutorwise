/**
 * Filename: services/scheduler/src/recovery.ts
 * Purpose: Boot scan — reclaim stale locks, detect missed items
 */

import { reclaimStale } from './locking.js';
import { query } from './db.js';
import { logger } from './logger.js';

/**
 * Run on boot and every 5 minutes as a safety net.
 * 1. Reclaim items stuck in 'in_progress' from a previous crash
 * 2. Log count of overdue items that will be picked up by the next poll
 */
export async function runRecovery(): Promise<void> {
  logger.info('recovery_start');

  // 1. Reclaim stale locks
  const reclaimed = await reclaimStale();

  // 2. Count overdue items (informational — the poll loop handles them)
  const overdueResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM scheduled_items
     WHERE status IN ('scheduled', 'failed')
       AND scheduled_at <= now()
       AND attempt_count < max_retries`
  );
  const overdueCount = parseInt(overdueResult.rows[0]?.count || '0', 10);

  logger.info('recovery_complete', {
    reclaimed,
    overdue_items: overdueCount,
  });
}
