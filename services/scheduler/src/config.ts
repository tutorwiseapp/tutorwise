/**
 * Filename: services/scheduler/src/config.ts
 * Purpose: Environment variable loading + validation
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env.local from monorepo root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`[FATAL] Missing required env var: ${key}`);
    process.exit(1);
  }
  return value;
}

function parseIntOrDefault(envValue: string | undefined, defaultValue: number): number {
  if (!envValue) return defaultValue;
  const parsed = parseInt(envValue, 10);
  if (Number.isNaN(parsed)) {
    console.warn(`[WARN] Invalid integer env var value "${envValue}", using default ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

export const config = {
  // Database
  databaseUrl: required('POSTGRES_URL_NON_POOLING'),

  // App integration
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  cronSecret: required('CRON_SECRET'),

  // Scheduler tuning
  pollIntervalMs: parseIntOrDefault(process.env.SCHEDULER_POLL_INTERVAL_MS, 15000),
  instanceId: process.env.SCHEDULER_INSTANCE_ID || 'scheduler-1',
  staleLockMinutes: parseIntOrDefault(process.env.SCHEDULER_STALE_LOCK_MINUTES, 10),
  batchSize: parseIntOrDefault(process.env.SCHEDULER_BATCH_SIZE, 10),

  // Health check
  healthPort: parseIntOrDefault(process.env.SCHEDULER_HEALTH_PORT, 9090),
} as const;
