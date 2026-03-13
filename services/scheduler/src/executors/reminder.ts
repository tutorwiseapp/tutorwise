/**
 * Filename: services/scheduler/src/executors/reminder.ts
 * Purpose: Insert a platform notification for the reminder
 */

import { query } from '../db.js';
import { logger } from '../logger.js';
import type { ScheduledItem, ExecutorResult } from '../types.js';

export async function executeReminder(item: ScheduledItem): Promise<ExecutorResult> {
  const meta = item.metadata as Record<string, string>;
  const userId = meta.user_id || item.created_by;

  if (!userId) {
    throw new Error('No user_id in metadata or created_by for reminder');
  }

  await query(
    `INSERT INTO platform_notifications (user_id, title, message, type, metadata)
     VALUES ($1, $2, $3, 'info', $4)`,
    [
      userId,
      item.title,
      item.description || meta.message || item.title,
      JSON.stringify({ source: 'scheduler', item_id: item.id }),
    ]
  );

  logger.info('reminder_sent', { id: item.id, user_id: userId });

  return {
    success: true,
    result: { user_id: userId, notification: 'sent' },
  };
}
