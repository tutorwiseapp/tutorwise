/**
 * Filename: services/scheduler/src/recurrence.ts
 * Purpose: Compute next fire time + update the same row for recurring items
 */

import cronParser from 'cron-parser';
import { query } from './db.js';
import { logger } from './logger.js';
import type { ScheduledItem } from './types.js';

/**
 * After successful execution, compute the next scheduled_at and reset the item
 * for the next cycle. Recurring items reuse the same row (not insert new ones).
 */
export async function handleRecurrence(item: ScheduledItem): Promise<void> {
  if (!item.recurrence) return;

  const nextAt = computeNext(item);
  if (!nextAt) {
    logger.info('recurrence_ended', { id: item.id, title: item.title });
    return;
  }

  // Check recurrence_end boundary
  if (item.recurrence_end) {
    const endDate = new Date(item.recurrence_end);
    if (nextAt > endDate) {
      logger.info('recurrence_past_end', { id: item.id, title: item.title, end: item.recurrence_end });
      return;
    }
  }

  await query(
    `UPDATE scheduled_items
     SET scheduled_at = $2,
         status = 'scheduled',
         lock_version = lock_version + 1,
         attempt_count = 0,
         locked_by = NULL,
         locked_at = NULL,
         started_at = NULL,
         completed_at = NULL,
         last_error = NULL,
         updated_at = now()
     WHERE id = $1`,
    [item.id, nextAt.toISOString()]
  );

  logger.info('recurrence_scheduled', {
    id: item.id,
    title: item.title,
    next_at: nextAt.toISOString(),
    recurrence: item.recurrence,
  });
}

function computeNext(item: ScheduledItem): Date | null {
  const now = new Date();

  if (item.recurrence === 'cron' && item.cron_expression) {
    try {
      const interval = cronParser.parseExpression(item.cron_expression, {
        currentDate: now,
        tz: 'UTC',
      });
      return interval.next().toDate();
    } catch (err) {
      logger.error('cron_parse_error', {
        id: item.id,
        expression: item.cron_expression,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  // Simple recurrence: offset from now (not from scheduled_at, to avoid cascading drift)
  const next = new Date(now);

  switch (item.recurrence) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly': {
      const targetMonth = next.getUTCMonth() + 1;
      next.setUTCMonth(targetMonth);
      // If the day rolled over (e.g., Jan 31 → Mar 3), clamp to last day of target month
      if (next.getUTCMonth() !== targetMonth % 12) {
        next.setUTCDate(0); // Sets to last day of previous month (the intended target month)
      }
      break;
    }
    default:
      return null;
  }

  // Preserve the original time-of-day from the scheduled_at
  const orig = new Date(item.scheduled_at);
  next.setUTCHours(orig.getUTCHours(), orig.getUTCMinutes(), orig.getUTCSeconds(), 0);

  return next;
}
