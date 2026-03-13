/**
 * Filename: services/scheduler/src/executors/cron-job.ts
 * Purpose: HTTP call to existing /api/cron/* routes (or any endpoint)
 */

import { config } from '../config.js';
import { logger } from '../logger.js';
import type { ScheduledItem, ExecutorResult } from '../types.js';

const TIMEOUT_MS = 300_000; // 5 minutes

export async function executeCronJob(item: ScheduledItem): Promise<ExecutorResult> {
  const endpoint = item.endpoint;
  if (!endpoint) {
    throw new Error('No endpoint specified for cron_job');
  }

  const url = `${config.appUrl}${endpoint}`;
  const method = item.http_method || 'GET';

  logger.info('cron_job_start', { id: item.id, url, method });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const meta = item.metadata as Record<string, unknown>;
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${config.cronSecret}`,
        'Content-Type': 'application/json',
      },
      ...(method === 'POST' && meta.body ? { body: JSON.stringify(meta.body) } : {}),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${body.slice(0, 500)}`);
    }

    const result = await response.json().catch(() => ({ _parseError: 'Response was not JSON' }));

    logger.info('cron_job_completed', {
      id: item.id,
      url,
      status: response.status,
    });

    return {
      success: true,
      result: { status: response.status, ...result },
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Timeout after ${TIMEOUT_MS}ms: ${url}`);
    }
    throw err;
  }
}
