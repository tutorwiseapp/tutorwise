#!/usr/bin/env node

/**
 * Migration Runner - Free Help Now v5.9 (Version 2 - Direct SQL)
 * Runs migrations 086-088 using pg client
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../apps/web/.env.local') });

// Try multiple possible environment variable names
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_URL ||
  process.env.NEXT_PUBLIC_DATABASE_URL;

if (!connectionString) {
  console.error('❌ ERROR: No database connection string found');
  console.error('Expected one of: DATABASE_URL, POSTGRES_URL_NON_POOLING, POSTGRES_URL');
  console.error('\nPlease set it in apps/web/.env.local');
  process.exit(1);
}

const migrations = [
  '086_add_free_help_columns.sql',
  '087_add_free_help_booking_type.sql',
  '088_update_booking_triggers_for_caas_v5_9.sql',
];

async function runMigration(client, filename) {
  console.log(`\n-----------------------------------`);
  console.log(`Running: ${filename}`);
  console.log(`-----------------------------------`);

  const migrationsDir = path.join(__dirname, '../../apps/api/migrations');
  const filePath = path.join(migrationsDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  try {
    await client.query(sql);
    console.log(`✅ SUCCESS: ${filename} completed`);
  } catch (error) {
    // Check if it's a benign "already exists" error
    if (error.message && (
      error.message.includes('already exists') ||
      error.message.includes('duplicate key value') ||
      error.code === '42P07' || // relation already exists
      error.code === '42701' || // column already exists
      error.code === '42710'    // object already exists
    )) {
      console.log(`⚠️  WARNING: ${filename} - Some objects already exist, continuing...`);
      console.log(`   Details: ${error.message.split('\n')[0]}`);
    } else {
      throw error;
    }
  }
}

async function main() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  console.log('========================================');
  console.log('Running Free Help Now Migrations (v5.9)');
  console.log('========================================\n');
  console.log(`Connecting to database...`);

  try {
    await client.connect();
    console.log(`✓ Connected successfully\n`);

    console.log(`Step 1/3: Adding available_free_help columns`);
    await runMigration(client, migrations[0]);

    console.log(`\nStep 2/3: Adding booking type and duration support`);
    await runMigration(client, migrations[1]);

    console.log(`\nStep 3/3: Adding CaaS integration trigger`);
    await runMigration(client, migrations[2]);

    console.log('\n========================================');
    console.log('✅ All migrations completed successfully!');
    console.log('========================================\n');
    console.log('Database changes:');
    console.log('  ✓ profiles.available_free_help column added');
    console.log('  ✓ caas_scores.available_free_help column added');
    console.log('  ✓ bookings.type column added');
    console.log('  ✓ bookings.duration_minutes column added');
    console.log('  ✓ CaaS trigger for free help sessions installed\n');
    console.log('Next steps:');
    console.log('  1. Test the Free Help Now feature');
    console.log('  2. Verify Redis connection (Upstash)');
    console.log('  3. Run the test flow (tutor toggle → student book → session created)\n');
  } catch (error) {
    console.error('\n❌ FAILED:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
