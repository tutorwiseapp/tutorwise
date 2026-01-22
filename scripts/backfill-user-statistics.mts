#!/usr/bin/env ts-node-esm
/**
 * One-Time Backfill Script: User Statistics Daily
 *
 * Purpose:
 * - Backfill user_statistics_daily table for all users (last 30 days)
 * - Call PostgreSQL aggregate_user_statistics() function via RPC
 * - Run once after migration 207 to populate historical data
 *
 * Usage:
 *   npx tsx scripts/backfill-user-statistics.mts
 *
 * Requirements:
 * - .env.local file with SUPABASE credentials
 * - service_role key (not anon key)
 * - Migration 207 already applied (aggregate_user_statistics function exists)
 *
 * Created: 2026-01-22
 * Version: 1.0
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
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
 * Fetch all profiles that should have statistics
 */
async function fetchEligibleProfiles() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, roles')
    .not('roles', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch profiles: ${error.message}`);
  }

  // Filter profiles with non-empty roles array
  return (profiles || []).filter((p) => {
    try {
      const roles = p.roles;
      return Array.isArray(roles) && roles.length > 0;
    } catch {
      return false;
    }
  });
}

/**
 * Call aggregate_user_statistics RPC for a specific date
 */
async function aggregateForDate(date: string): Promise<void> {
  const { error } = await supabase.rpc('aggregate_user_statistics', {
    target_user_id: null, // null = all users
    target_date: date,
  });

  if (error) {
    throw new Error(`Failed to aggregate for ${date}: ${error.message}`);
  }
}

/**
 * Generate date array for last N days
 */
function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
  }

  return dates;
}

/**
 * Main backfill function
 */
async function backfillUserStatistics() {
  console.log('');
  console.log('============================================================');
  console.log('🚀 User Statistics Daily - Backfill (Last 30 Days)');
  console.log('============================================================');
  console.log('');

  try {
    // 1. Fetch eligible profiles
    console.log('📊 Fetching eligible profiles...');
    const profiles = await fetchEligibleProfiles();
    console.log(`   Found ${profiles.length} profiles with roles\n`);

    if (profiles.length === 0) {
      console.log('✅ No profiles to backfill');
      return;
    }

    // Show breakdown by role
    const roleBreakdown = profiles.reduce(
      (acc, p) => {
        const roles = p.roles || [];
        if (roles.includes('tutor')) acc.tutor++;
        if (roles.includes('client')) acc.client++;
        if (roles.includes('agent')) acc.agent++;
        return acc;
      },
      { tutor: 0, client: 0, agent: 0 }
    );

    console.log('   Role breakdown:');
    console.log(`     Tutors: ${roleBreakdown.tutor}`);
    console.log(`     Clients: ${roleBreakdown.client}`);
    console.log(`     Agents: ${roleBreakdown.agent}`);
    console.log('');

    // 2. Generate date range (last 30 days)
    console.log('📅 Generating date range (last 30 days)...\n');
    const dates = generateDateRange(30);
    console.log(`   Processing ${dates.length} dates from ${dates[0]} to ${dates[dates.length - 1]}\n`);

    // 3. Aggregate for each date
    console.log('🔄 Aggregating statistics for each date...\n');

    for (const date of dates) {
      console.log(`   Processing ${date}...`);
      await aggregateForDate(date);
    }

    console.log('');
    console.log('✅ All dates processed successfully\n');

    // 4. Verify results
    console.log('🔍 Verifying results...\n');

    const { data: stats, error: statsError } = await supabase
      .from('user_statistics_daily')
      .select('date, user_id')
      .order('date', { ascending: false })
      .limit(100);

    if (statsError) {
      console.error('   ⚠️  Could not verify results:', statsError.message);
    } else {
      const uniqueDates = new Set((stats || []).map((s) => s.date));
      const uniqueUsers = new Set((stats || []).map((s) => s.user_id));

      console.log(`   Total rows created: ${stats?.length || 0}`);
      console.log(`   Unique dates: ${uniqueDates.size}`);
      console.log(`   Unique users: ${uniqueUsers.size}`);
    }

    // Summary
    console.log('');
    console.log('============================================================');
    console.log('✅ Backfill Complete');
    console.log('============================================================');
    console.log('');
    console.log('Results:');
    console.log(`  ✅ Profiles processed: ${profiles.length}`);
    console.log(`  ✅ Dates aggregated: ${dates.length}`);
    console.log(`  ✅ Expected rows: ~${profiles.length * dates.length}`);
    console.log('');

    console.log('Next Steps:');
    console.log('  1. Verify cron job: SELECT * FROM cron.job WHERE jobname = \'aggregate-user-statistics\';');
    console.log('  2. Check statistics: SELECT * FROM user_statistics_daily ORDER BY date DESC LIMIT 10;');
    console.log('  3. Test useUserMetric hook in dashboard');
    console.log('  4. Monitor nightly cron job execution');
    console.log('');
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run backfill
backfillUserStatistics()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
