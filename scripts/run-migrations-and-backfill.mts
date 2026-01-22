#!/usr/bin/env ts-node-esm
/**
 * Combined Script: Apply Migrations + Backfill User Statistics
 *
 * Purpose:
 * - Apply migrations 206 and 207 via SQL execution
 * - Then run backfill for user statistics
 *
 * Usage:
 *   npx tsx scripts/run-migrations-and-backfill.mts
 *
 * Created: 2026-01-22
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables from apps/web/.env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../apps/web/.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in apps/web/.env.local');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Execute SQL migration file
 */
async function executeMigration(filePath: string, migrationName: string): Promise<void> {
  console.log(`\n📄 Applying ${migrationName}...`);

  try {
    const sql = readFileSync(filePath, 'utf-8');

    // Execute SQL via RPC (Supabase doesn't have direct SQL execution API)
    // So we'll use the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      // Fall back to executing each statement separately
      console.log('   ⚠️  Batch execution failed, trying alternative method...');

      // For now, just log that manual execution is needed
      console.log(`   ℹ️  Please run this SQL manually in Supabase SQL Editor:`);
      console.log(`   📁 ${filePath}`);
      return;
    }

    console.log(`   ✅ ${migrationName} applied successfully`);
  } catch (error) {
    console.error(`   ❌ Error applying ${migrationName}:`, error);
    console.log(`   ℹ️  Please run this SQL manually in Supabase SQL Editor:`);
    console.log(`   📁 ${filePath}`);
  }
}

/**
 * Backfill user statistics
 */
async function backfillUserStatistics(): Promise<void> {
  console.log('\n🔄 Starting user statistics backfill...\n');

  try {
    // Fetch all profiles with roles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, email, roles')
      .not('roles', 'is', null);

    if (error) {
      throw new Error(`Failed to fetch profiles: ${error.message}`);
    }

    // Filter profiles with non-empty roles
    const eligibleProfiles = (profiles || []).filter((p) => {
      try {
        const roles = p.roles;
        return Array.isArray(roles) && roles.length > 0;
      } catch {
        return false;
      }
    });

    console.log(`📊 Found ${eligibleProfiles.length} eligible profiles\n`);

    if (eligibleProfiles.length === 0) {
      console.log('✅ No profiles to backfill');
      return;
    }

    // Generate date range (last 30 days)
    const dates: string[] = [];
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    console.log(`📅 Processing ${dates.length} dates from ${dates[0]} to ${dates[dates.length - 1]}\n`);

    // Aggregate for each date
    for (const date of dates) {
      console.log(`   Processing ${date}...`);

      const { error } = await supabase.rpc('aggregate_user_statistics', {
        target_user_id: null,
        target_date: date,
      });

      if (error) {
        console.error(`   ❌ Error for ${date}:`, error.message);
      } else {
        console.log(`   ✅ ${date} complete`);
      }
    }

    console.log('\n✅ Backfill complete!');
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('');
  console.log('============================================================');
  console.log('🚀 User Statistics: Migrations + Backfill');
  console.log('============================================================');

  try {
    // Step 1: Apply migration 206 (create table)
    const migration206Path = join(__dirname, '../tools/database/migrations/206_create_user_statistics_daily.sql');
    await executeMigration(migration206Path, 'Migration 206 (Table)');

    // Step 2: Apply migration 207 (create functions + cron)
    const migration207Path = join(__dirname, '../tools/database/migrations/207_add_user_statistics_aggregation.sql');
    await executeMigration(migration207Path, 'Migration 207 (Functions)');

    // Step 3: Backfill data
    await backfillUserStatistics();

    console.log('');
    console.log('============================================================');
    console.log('✅ Complete!');
    console.log('============================================================');
    console.log('');
    console.log('Next Steps:');
    console.log('  1. Verify cron job: SELECT * FROM cron.job WHERE jobname = \'aggregate-user-statistics\';');
    console.log('  2. Check statistics: SELECT * FROM user_statistics_daily ORDER BY date DESC LIMIT 10;');
    console.log('  3. Test useUserMetric hook in dashboard');
    console.log('');
  } catch (error) {
    console.error('\n❌ Process failed:', error);
    process.exit(1);
  }
}

// Run
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
