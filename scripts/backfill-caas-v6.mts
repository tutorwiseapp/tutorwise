#!/usr/bin/env ts-node-esm
/**
 * One-Time Backfill Script: Universal CaaS v6.0
 *
 * Purpose:
 * - Notify caas_calculation_events table for ALL existing users
 * - Next.js will pick up events and recalculate using Universal v6.0 model
 * - Run once during migration from queue-based to immediate trigger architecture
 * - Delete this script after successful migration
 *
 * Usage:
 *   npx tsx scripts/backfill-caas-v6.mts
 *
 * Requirements:
 * - .env.local file with SUPABASE credentials
 * - service_role key (not anon key)
 *
 * Created: 2026-01-22
 * Version: 6.1 (Immediate Triggers)
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
 * Fetch all profiles that should have CaaS scores
 */
async function fetchEligibleProfiles() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, roles, identity_verified, onboarding_progress')
    .or('identity_verified.eq.true,onboarding_progress->>onboarding_completed.eq.true');

  if (error) {
    throw new Error(`Failed to fetch profiles: ${error.message}`);
  }

  return profiles || [];
}

/**
 * Insert profiles into caas_calculation_events for recalculation
 */
async function backfillAllScores() {
  console.log('');
  console.log('============================================================');
  console.log('🚀 Universal CaaS v6.0 - One-Time Backfill');
  console.log('============================================================');
  console.log('');

  try {
    // Fetch eligible profiles
    console.log('📊 Fetching eligible profiles...');
    const profiles = await fetchEligibleProfiles();
    console.log(`   Found ${profiles.length} profiles to recalculate\n`);

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
        if (roles.length === 0) acc.no_role++;
        return acc;
      },
      { tutor: 0, client: 0, agent: 0, no_role: 0 }
    );

    console.log('   Role breakdown:');
    console.log(`     Tutors: ${roleBreakdown.tutor}`);
    console.log(`     Clients: ${roleBreakdown.client}`);
    console.log(`     Agents: ${roleBreakdown.agent}`);
    if (roleBreakdown.no_role > 0) {
      console.log(`     No role: ${roleBreakdown.no_role} (will be skipped)`);
    }
    console.log('');

    // Insert into caas_calculation_events
    console.log('🔄 Inserting into caas_calculation_events...\n');

    const events = profiles
      .filter((p) => p.roles && p.roles.length > 0)
      .map((p) => ({
        profile_id: p.id,
        created_at: new Date().toISOString(),
        version: 'universal-v6.0',
      }));

    const { data, error } = await supabase
      .from('caas_calculation_events')
      .insert(events)
      .select();

    if (error) {
      throw new Error(`Failed to insert events: ${error.message}`);
    }

    console.log(`✅ Inserted ${events.length} events into calculation queue\n`);

    // Summary
    console.log('');
    console.log('============================================================');
    console.log('✅ Backfill Complete');
    console.log('============================================================');
    console.log('');
    console.log('Results:');
    console.log(`  ✅ Events created: ${events.length}`);
    console.log(`  ⏭️  Skipped (no roles): ${roleBreakdown.no_role}`);
    console.log(`  📊 Total profiles: ${profiles.length}`);
    console.log('');

    console.log('🔍 Next.js will process these events...\n');
    console.log('   The Next.js app needs to poll caas_calculation_events');
    console.log('   and call CaaSService.calculateProfileCaaS() for each event.');
    console.log('');
    console.log('   For now, these events are queued and ready for processing.');
    console.log('');

    console.log('Next Steps:');
    console.log('  1. Implement Next.js polling or Realtime subscription');
    console.log('  2. OR manually process events via admin endpoint');
    console.log('  3. Verify scores in dashboard');
    console.log('  4. Test immediate triggers (verify identity, publish listing)');
    console.log('  5. Delete this script (scripts/backfill-caas-v6.mts)');
    console.log('');
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run backfill
backfillAllScores()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
