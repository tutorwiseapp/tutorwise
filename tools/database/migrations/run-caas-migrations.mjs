#!/usr/bin/env node
/**
 * Apply CaaS Trigger Migrations (200-202)
 * Run from project root: node tools/database/migrations/run-caas-migrations.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables from apps/web/.env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../../../apps/web/.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrations = [
  {
    version: '200',
    name: 'Add listing publish CaaS trigger',
    file: '200_add_listing_publish_caas_trigger.sql'
  },
  {
    version: '201',
    name: 'Enhance booking payment CaaS trigger',
    file: '201_enhance_booking_payment_caas_trigger.sql'
  },
  {
    version: '202',
    name: 'Add referral CaaS triggers',
    file: '202_add_referral_caas_triggers.sql'
  }
];

async function checkMigrationApplied(version) {
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('version')
    .eq('version', version)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check migration ${version}: ${error.message}`);
  }

  return !!data;
}

async function applyMigration(migration) {
  const isApplied = await checkMigrationApplied(migration.version);

  if (isApplied) {
    console.log(`⏭️  Migration ${migration.version} already applied - skipping`);
    return;
  }

  console.log(`\n🔄 Applying migration ${migration.version}: ${migration.name}`);

  const sqlPath = join(__dirname, migration.file);
  const sql = readFileSync(sqlPath, 'utf8');

  // Execute the migration SQL
  const { error: sqlError } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (sqlError) {
    // If exec_sql RPC doesn't exist, try direct execution
    console.log('   Trying direct SQL execution...');
    const { error: directError } = await supabase.from('_sql').insert({ query: sql });

    if (directError) {
      throw new Error(`Failed to execute migration SQL: ${sqlError.message}`);
    }
  }

  // Record the migration
  const { error: recordError } = await supabase
    .from('schema_migrations')
    .insert({ version: migration.version });

  if (recordError) {
    throw new Error(`Failed to record migration ${migration.version}: ${recordError.message}`);
  }

  console.log(`✅ Migration ${migration.version} applied successfully`);
}

async function main() {
  console.log('🚀 CaaS Trigger Migrations (200-202)');
  console.log('=====================================\n');

  try {
    // Check current migration status
    console.log('📊 Checking migration status...\n');
    for (const migration of migrations) {
      const isApplied = await checkMigrationApplied(migration.version);
      console.log(`   Migration ${migration.version}: ${isApplied ? '✅ Applied' : '⏸️  Pending'}`);
    }

    // Apply pending migrations
    console.log('\n🔧 Applying pending migrations...');
    for (const migration of migrations) {
      await applyMigration(migration);
    }

    console.log('\n✅ All CaaS trigger migrations completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Commit code changes');
    console.log('   2. Queue users for recalculation');
    console.log('   3. Monitor worker logs');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

main();
