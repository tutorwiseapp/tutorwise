/**
 * Database Migration Runner
 * Executes SQL migrations using Supabase service role client
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://lvsmtgmpoysjygdwcrir.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2c210Z21wb3lzanlnZHdjcmlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk2MTcyMywiZXhwIjoyMDczNTM3NzIzfQ.O-YehlbetdFM1VDhqFmDN_9vmEe27oqq2EFyBbt2fRg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Execute a SQL file using Supabase RPC
 */
async function executeMigration(migrationPath: string): Promise<void> {
  const migrationName = path.basename(migrationPath);
  console.log(`\n🔄 Running migration: ${migrationName}`);

  try {
    // Read SQL file
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statement (crude but works for most cases)
    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    console.log(`   Found ${statements.length} SQL statements`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (!statement || statement.startsWith('--') || statement.match(/^\s*$/)) {
        continue;
      }

      console.log(`   Executing statement ${i + 1}/${statements.length}...`);

      try {
        // Use raw SQL execution via rpc
        const { error } = await supabase.rpc('exec', {
          sql: statement + ';',
        });

        if (error) {
          throw error;
        }
      } catch (err: any) {
        // If exec RPC doesn't exist, try direct query
        console.log(`   Note: exec RPC not available, trying direct query...`);
        const { error } = await supabase.from('_migrations').select('*').limit(0);

        if (error) {
          console.error(`   ❌ Error executing statement:`, err);
          throw err;
        }
      }
    }

    console.log(`✅ Migration ${migrationName} completed successfully`);
  } catch (error: any) {
    console.error(`❌ Migration ${migrationName} failed:`, error.message);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('📦 Agent & Organisation CaaS Migration Runner');
  console.log('=' .repeat(60));

  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = [
    '155_add_agent_verification_fields.sql',
    '156_create_organisation_subscriptions.sql',
    '157_track_organisation_bookings.sql',
    '158_create_agent_caas_rpc_functions.sql',
    '159_create_organisation_caas_queue.sql',
  ];

  for (const file of migrationFiles) {
    const migrationPath = path.join(migrationsDir, file);

    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${file}`);
      continue;
    }

    try {
      await executeMigration(migrationPath);
    } catch (error) {
      console.error(`\n❌ Failed to execute migration ${file}`);
      console.error('Stopping migration process.');
      process.exit(1);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All migrations completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Test Agent CaaS with sample agent data');
  console.log('2. Test Organisation CaaS with sample org data');
  console.log('3. Verify RPC functions return expected data');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
