/**
 * Filename: services/scheduler/src/dispatcher.ts
 * Purpose: Route scheduled items to the correct executor based on type
 */

import { executeContent } from './executors/content.js';
import { executeAgentRun } from './executors/agent-run.js';
import { executeTeamRun } from './executors/team-run.js';
import { executeCronJob } from './executors/cron-job.js';
import { executeSqlFunc } from './executors/sql-func.js';
import { executeTask } from './executors/task.js';
import { executeReminder } from './executors/reminder.js';
import type { ScheduledItem, ExecutorResult } from './types.js';

export async function dispatch(item: ScheduledItem): Promise<ExecutorResult> {
  switch (item.type) {
    case 'content':
      return executeContent(item);
    case 'agent_run':
      return executeAgentRun(item);
    case 'team_run':
      return executeTeamRun(item);
    case 'cron_job':
      return executeCronJob(item);
    case 'sql_func':
      return executeSqlFunc(item);
    case 'task':
      return executeTask(item);
    case 'reminder':
      return executeReminder(item);
    default: {
      const _exhaustive: never = item.type;
      throw new Error(`Unknown item type: ${_exhaustive}`);
    }
  }
}
