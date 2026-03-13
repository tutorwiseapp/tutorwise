/**
 * Filename: services/scheduler/src/health.ts
 * Purpose: HTTP health check server — uses node:http, zero dependencies
 */

import http from 'node:http';
import { config } from './config.js';
import { stats } from './scheduler-loop.js';
import { logger } from './logger.js';

let server: http.Server | null = null;
const bootTime = Date.now();

export function startHealthServer(): void {
  server = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      // Check if the poll loop is stale
      const isStale = stats.lastPollAt
        ? (Date.now() - new Date(stats.lastPollAt).getTime()) > 2 * config.pollIntervalMs
        : false;

      const status = isStale ? 'degraded' : 'ok';
      const statusCode = isStale ? 503 : 200;

      const body = JSON.stringify({
        status,
        instance_id: config.instanceId,
        uptime_seconds: Math.floor((Date.now() - bootTime) / 1000),
        last_poll_at: stats.lastPollAt,
        poll_count: stats.pollCount,
        items_processed_total: stats.itemsProcessedTotal,
        items_failed_total: stats.itemsFailedTotal,
      });

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(body);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(config.healthPort, () => {
    logger.info('health_server_started', { port: config.healthPort });
  });
}

export function stopHealthServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        logger.info('health_server_stopped');
        resolve();
      });
    } else {
      resolve();
    }
  });
}
