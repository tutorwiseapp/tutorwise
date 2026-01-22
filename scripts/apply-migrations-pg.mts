#!/usr/bin/env ts-node-esm
/**
 * Apply migrations via PostgreSQL connection
 * Uses DATABASE_URL or constructs from Supabase credentials
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../apps/web/.env.local');
dotenv.config({ path: envPath });

// Try to use pg module
let pg: any;
try {
  pg = await import('pg');
} catch (err) {
  console.error('❌ pg module not found. Installing...');
  const { execSync } = await import('child_process');
  execSync('npm install pg', { stdio: 'inherit' });
  pg = await import('pg');
}

const { Client } = pg.default || pg;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

// Construct PostgreSQL connection string
// Supabase format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;
const connectionString = process.env.DATABASE_URL ||
  (projectRef && dbPassword
    ? `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
    : null);

if (!connectionString) {
  console.error('❌ Could not construct database connection string');
  console.error('   Need either DATABASE_URL or SUPABASE_DB_PASSWORD in .env.local');
  console.error('   Project ref:', projectRef);
  process.exit(1);
}

console.log('');
console.log('============================================================');
console.log('🔧 Applying Migrations via PostgreSQL');
console.log('============================================================');
console.log('');
console.log('Connecting to database...');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('✅ Connected successfully\n');

  // Apply Migration 206
  console.log('📄 Applying Migration 206 (create table)...');
  const migration206Path = join(__dirname, '../tools/database/migrations/206_create_user_statistics_daily.sql');
  const migration206 = readFileSync(migration206Path, 'utf-8');

  await client.query(migration206);
  console.log('✅ Migration 206 applied successfully\n');

  // Apply Migration 207
  console.log('📄 Applying Migration 207 (create functions + cron)...');
  const migration207Path = join(__dirname, '../tools/database/migrations/207_add_user_statistics_aggregation.sql');
  const migration207 = readFileSync(migration207Path, 'utf-8');

  await client.query(migration207);
  console.log('✅ Migration 207 applied successfully\n');

  console.log('============================================================');
  console.log('✅ All migrations applied successfully!');
  console.log('============================================================');
  console.log('');

} catch (error: any) {
  console.error('❌ Migration failed:', error.message);
  console.error('\nFull error:', error);
  process.exit(1);
} finally {
  await client.end();
}
