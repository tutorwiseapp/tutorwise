/**
 * Filename: services/scheduler/src/index.ts
 * Purpose: Entry point — boot → recover → poll loop → health server → graceful shutdown
 */

import { config } from './config.js';
import { logger } from './logger.js';
import { getPool, closePool } from './db.js';
import { runRecovery } from './recovery.js';
import { startLoop, stopLoop } from './scheduler-loop.js';
import { startHealthServer, stopHealthServer } from './health.js';

const RECOVERY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let recoveryTimer: ReturnType<typeof setInterval> | null = null;

async function boot(): Promise<void> {
  logger.info('boot_start', {
    instance: config.instanceId,
    poll_interval_ms: config.pollIntervalMs,
    batch_size: config.batchSize,
    stale_lock_minutes: config.staleLockMinutes,
  });

  // 1. Verify database connectivity
  try {
    const pool = getPool();
    const result = await pool.query('SELECT 1 as ok');
    if (result.rows[0]?.ok !== 1) throw new Error('DB check failed');
    logger.info('db_connected');
  } catch (err) {
    logger.error('db_connection_failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    process.exit(1);
  }

  // 2. Run recovery scan (reclaim stale locks from previous crash)
  await runRecovery();

  // 3. Start periodic recovery sweep (safety net)
  recoveryTimer = setInterval(async () => {
    try {
      await runRecovery();
    } catch (err) {
      logger.error('recovery_sweep_error', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, RECOVERY_INTERVAL_MS);

  // 4. Start the poll loop
  await startLoop();

  // 5. Start health check server
  startHealthServer();

  logger.info('boot_complete');
}

async function shutdown(signal: string): Promise<void> {
  logger.info('shutdown_start', { signal });

  // Stop accepting new polls
  await stopLoop();

  // Stop recovery sweep
  if (recoveryTimer) {
    clearInterval(recoveryTimer);
    recoveryTimer = null;
  }

  // Stop health server
  await stopHealthServer();

  // Close database pool
  await closePool();

  logger.info('shutdown_complete');
  process.exit(0);
}

// Graceful shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Uncaught error handlers
process.on('uncaughtException', (err) => {
  logger.error('uncaught_exception', { error: err.message, stack: err.stack });
  shutdown('uncaughtException').catch(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
  });
  shutdown('unhandledRejection').catch(() => process.exit(1));
});

// Boot
boot().catch((err) => {
  logger.error('boot_failed', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
