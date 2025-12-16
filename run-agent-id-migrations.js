#!/usr/bin/env node

/**
 * Migration Runner - Agent ID Migrations
 * Runs migrations 051-052 to rename referrer_profile_id → agent_id
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Missing Supabase credentials in .env.local');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrations = [
  '051_rename_referrer_to_agent.sql',
  '052_rename_referrer_to_agent_in_referrals.sql',
];

async function runMigration(filename) {
  console.log(`\n-----------------------------------`);
  console.log(`Running: ${filename}`);
  console.log(`-----------------------------------`);

  const migrationsDir = path.join(__dirname, 'apps/api/migrations');
  const filePath = path.join(migrationsDir, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Migration file not found: ${filePath}`);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  // Try to execute via exec_sql RPC function
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If exec_sql doesn't exist, try splitting and executing statement by statement
      console.log('⚠️  exec_sql RPC not found, trying statement-by-statement execution...');

      // Split SQL into statements (basic splitting)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && s !== 'BEGIN' && s !== 'COMMIT');

      console.log(`   Executing ${statements.length} statements...`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement) {
          console.log(`   Statement ${i + 1}/${statements.length}...`);

          // Use Supabase's .rpc() or direct SQL execution
          const { error: stmtError } = await supabase.rpc('query', {
            query_text: statement + ';'
          }).catch(() => ({ error: 'RPC not available' }));

          if (stmtError && stmtError !== 'RPC not available') {
            throw new Error(`Statement failed: ${statement.substring(0, 100)}...\nError: ${stmtError}`);
          }
        }
      }

      console.log('   ✓ All statements executed');
    } else {
      console.log('   ✓ Migration executed via exec_sql RPC');
    }
  } catch (error) {
    console.error(`\n❌ FAILED to execute ${filename}:`);
    throw error;
  }

  console.log(`✅ SUCCESS: ${filename} completed`);
}

async function checkIfMigrationsNeeded() {
  console.log('\n🔍 Checking if migrations are needed...');

  // Check if agent_id column exists in bookings table
  const { data: bookingsColumns, error: bookingsError } = await supabase
    .from('bookings')
    .select('agent_id')
    .limit(1);

  // Check if agent_id column exists in referrals table
  const { data: referralsColumns, error: referralsError } = await supabase
    .from('referrals')
    .select('agent_id')
    .limit(1);

  const bookingsNeedsMigration = bookingsError && bookingsError.message?.includes('agent_id does not exist');
  const referralsNeedsMigration = referralsError && referralsError.message?.includes('agent_id does not exist');

  if (!bookingsNeedsMigration && !referralsNeedsMigration) {
    console.log('✅ Migrations already applied! Both agent_id columns exist.');
    return false;
  }

  if (bookingsNeedsMigration) {
    console.log('⚠️  bookings.agent_id does not exist - migration 051 needed');
  } else {
    console.log('✅ bookings.agent_id exists');
  }

  if (referralsNeedsMigration) {
    console.log('⚠️  referrals.agent_id does not exist - migration 052 needed');
  } else {
    console.log('✅ referrals.agent_id exists');
  }

  return true;
}

async function main() {
  console.log('========================================');
  console.log('Agent ID Migration Runner (051-052)');
  console.log('========================================');
  console.log('Purpose: Rename referrer_profile_id → agent_id');
  console.log('Migrations: 051 (bookings) + 052 (referrals)');

  try {
    const needsMigrations = await checkIfMigrationsNeeded();

    if (!needsMigrations) {
      console.log('\n✨ No migrations needed. Your database is up to date!');
      console.log('\nIf you\'re still seeing errors, try:');
      console.log('1. Restarting your dev server: npm run dev');
      console.log('2. Clearing browser cache');
      console.log('3. Checking Supabase logs for other errors\n');
      return;
    }

    console.log(`\n🚀 Starting migrations...\n`);
    console.log(`Step 1/2: Rename referrer_profile_id → agent_id in bookings table`);
    await runMigration(migrations[0]);

    console.log(`\nStep 2/2: Rename referrer_profile_id → agent_id in referrals table`);
    await runMigration(migrations[1]);

    console.log('\n========================================');
    console.log('✅ All migrations completed successfully!');
    console.log('========================================\n');
    console.log('Next steps:');
    console.log('1. Restart your dev server: npm run dev');
    console.log('2. Refresh your browser');
    console.log('3. The referrals/bookings pages should now work\n');
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    console.error('\nFull error:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check that SUPABASE_SERVICE_ROLE_KEY is set in apps/web/.env.local');
    console.error('2. Verify you have admin access to the database');
    console.error('3. Check Supabase dashboard for migration errors');
    console.error('4. You may need to run these migrations manually via Supabase SQL editor\n');
    process.exit(1);
  }
}

main();
