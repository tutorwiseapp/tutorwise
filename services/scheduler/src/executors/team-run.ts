/**
 * Filename: services/scheduler/src/executors/team-run.ts
 * Purpose: Trigger a team run via HTTP POST to the Next.js app
 */

import { config } from '../config.js';
import { logger } from '../logger.js';
import type { ScheduledItem, ExecutorResult } from '../types.js';

const TIMEOUT_MS = 600_000; // 10 minutes — team runs coordinate multiple agents

export async function executeTeamRun(item: ScheduledItem): Promise<ExecutorResult> {
  const meta = item.metadata as Record<string, string>;
  const slug = meta.team_slug;

  if (!slug) {
    throw new Error('No team_slug in metadata');
  }

  const task = meta.task || item.title;
  const url = `${config.appUrl}/api/admin/teams/${slug}/run`;

  logger.info('team_run_start', { id: item.id, slug, task });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.cronSecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task,
        trigger_type: 'scheduler',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 500)}`);
    }

    const result = await response.json().catch(() => ({ _parseError: 'Response was not JSON' }));

    logger.info('team_run_completed', { id: item.id, slug });

    return {
      success: true,
      result: { team_slug: slug, ...result },
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Team run timeout after ${TIMEOUT_MS}ms: ${slug}`);
    }
    throw err;
  }
}
