import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load .env.local from apps/web
config({ path: resolve(__dirname, '../../apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(migrationPath: string, migrationName: string) {
  console.log(`\n=== Running Migration: ${migrationName} ===`);

  try {
    const sql = readFileSync(migrationPath, 'utf-8');

    // Note: Supabase client doesn't have direct SQL execution for DDL
    // We'll use the REST API to execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });

    if (error) {
      console.error(`❌ Migration failed: ${migrationName}`);
      console.error(error);
      return false;
    }

    console.log(`✅ Migration successful: ${migrationName}`);
    return true;
  } catch (err) {
    console.error(`❌ Error running migration: ${migrationName}`);
    console.error(err);
    return false;
  }
}

async function main() {
  console.log('=== CAS Database Migrations ===');
  console.log(`Connected to: ${supabaseUrl}`);

  const migrations = [
    {
      path: resolve(__dirname, '../database/migrations/271_create_cas_marketer_insights.sql'),
      name: '271: Create CAS Marketer Insights table',
    },
    {
      path: resolve(__dirname, '../database/migrations/272_create_cas_security_scans.sql'),
      name: '272: Create CAS Security Scans table',
    },
  ];

  let successCount = 0;

  for (const migration of migrations) {
    const success = await runMigration(migration.path, migration.name);
    if (success) successCount++;
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`✅ Successful: ${successCount}/${migrations.length}`);
  console.log(`❌ Failed: ${migrations.length - successCount}/${migrations.length}`);

  if (successCount === migrations.length) {
    console.log('\n🎉 All CAS migrations completed successfully!');
  } else {
    console.log('\n⚠️  Some migrations failed. Check errors above.');
    process.exit(1);
  }
}

main().catch(console.error);
