/**
 * CAS Scheduler
 *
 * Task scheduling for CAS agents including retrospectives,
 * DSPy optimization, and maintenance tasks.
 *
 * @module cas/scheduler
 */

export {
  RetrospectiveScheduler,
  retrospectiveScheduler,
  type RetrospectiveConfig,
  type RetrospectiveReport,
  type CommitSummary,
  type FeedbackSummary,
  type BlockerSummary,
  type ActionItem,
} from './retrospective';

// --- Schedule Entry Point ---

import { retrospectiveScheduler } from './retrospective';

/**
 * Check and run scheduled tasks
 * Call this from a cron job or scheduled function
 */
export async function runScheduledTasks(): Promise<void> {
  console.log('[CAS Scheduler] Checking scheduled tasks...');

  // Check if retrospective should run
  if (retrospectiveScheduler.shouldRunNow()) {
    console.log('[CAS Scheduler] Running weekly retrospective...');
    await retrospectiveScheduler.runRetrospective();
  }

  // Add other scheduled tasks here
  // - DSPy optimization (handled by GitHub Action)
  // - Security scans (handled by GitHub Action)
  // - Metrics aggregation

  console.log('[CAS Scheduler] Scheduled tasks check complete');
}

/**
 * Get status of all schedulers
 */
export function getSchedulerStatus() {
  return {
    retrospective: {
      lastRun: retrospectiveScheduler.getLastRunTime(),
      config: retrospectiveScheduler.getConfig(),
      shouldRunNow: retrospectiveScheduler.shouldRunNow(),
    },
  };
}

export default {
  runScheduledTasks,
  getSchedulerStatus,
  retrospectiveScheduler,
};
