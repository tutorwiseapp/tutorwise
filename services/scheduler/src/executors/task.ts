/**
 * Filename: services/scheduler/src/executors/task.ts
 * Purpose: Tasks transition to in_progress — completed manually by user via the UI
 */

import { logger } from '../logger.js';
import type { ScheduledItem, ExecutorResult } from '../types.js';

export async function executeTask(item: ScheduledItem): Promise<ExecutorResult> {
  // Tasks are user-completed — the scheduler just marks them as active when due.
  // The status transition to 'in_progress' is already handled by the claim() in locking.ts.
  // The user completes via POST /api/admin/scheduler/[id]/complete.
  logger.info('task_activated', { id: item.id, title: item.title });

  return {
    success: true,
    result: { note: 'Task activated — awaiting manual completion' },
  };
}
