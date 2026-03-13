/**
 * Filename: services/scheduler/src/db.ts
 * Purpose: PostgreSQL pool singleton — SSL configured for Supabase
 */

import pg from 'pg';
import { config } from './config.js';
import { logger } from './logger.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    // Strip sslmode param (Supabase adds it but node-pg handles SSL separately)
    const cleanConn = config.databaseUrl
      .replace(/[?&]sslmode=[^&]*/g, '')
      .replace(/[?&]$/, '');

    pool = new Pool({
      connectionString: cleanConn,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
    });

    pool.on('error', (err) => {
      logger.error('pool_error', { error: err.message });
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('pool_closed');
  }
}
