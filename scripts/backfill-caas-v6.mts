#!/usr/bin/env ts-node-esm
/**
 * One-Time Backfill Script: Universal CaaS v6.0
 *
 * Purpose:
 * - Recalculate CaaS scores for ALL existing users using Universal v6.0 model
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
import { CaaSService } from '../apps/web/src/lib/services/caas/index.js';
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
 * Backfill CaaS scores for all eligible profiles
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

    // Recalculate scores with progress tracking
    console.log('🔄 Recalculating scores...\n');
    let successCount = 0;
    let failureCount = 0;
    let skipCount = 0;

    for (let i = 0; i < profiles.length; i++) {
      const profile = profiles[i];
      const progress = `[${i + 1}/${profiles.length}]`;

      try {
        // Skip profiles with no roles
        if (!profile.roles || profile.roles.length === 0) {
          console.log(`${progress} ⏭️  Skipped ${profile.email} (no roles)`);
          skipCount++;
          continue;
        }

        // Calculate score
        const scoreData = await CaaSService.calculateProfileCaaS(profile.id, supabase);

        console.log(
          `${progress} ✅ ${profile.email} → ${scoreData.total}/100 (${profile.roles.join(', ')})`
        );
        successCount++;
      } catch (error) {
        console.error(
          `${progress} ❌ ${profile.email} → Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        failureCount++;
      }

      // Add small delay to avoid rate limiting
      if (i > 0 && i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Summary
    console.log('');
    console.log('============================================================');
    console.log('✅ Backfill Complete');
    console.log('============================================================');
    console.log('');
    console.log('Results:');
    console.log(`  ✅ Successful: ${successCount}`);
    console.log(`  ❌ Failed: ${failureCount}`);
    console.log(`  ⏭️  Skipped: ${skipCount}`);
    console.log(`  📊 Total: ${profiles.length}`);
    console.log('');

    if (failureCount > 0) {
      console.log('⚠️  Some calculations failed. Review errors above.');
      console.log('   You can re-run this script to retry failed profiles.');
      console.log('');
    }

    // Verify migration
    console.log('🔍 Verifying migration...\n');
    const { data: versionStats, error: statsError } = await supabase
      .from('caas_scores')
      .select('calculation_version')
      .in('calculation_version', ['universal-v6.0', 'tutor-v5.5', 'client-v1.0', 'agent-v1.0']);

    if (!statsError && versionStats) {
      const versionCounts = versionStats.reduce(
        (acc, s) => {
          acc[s.calculation_version] = (acc[s.calculation_version] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      console.log('   Score version distribution:');
      Object.entries(versionCounts)
        .sort(([a], [b]) => b.localeCompare(a))
        .forEach(([version, count]) => {
          const icon = version === 'universal-v6.0' ? '✅' : '⚠️';
          console.log(`     ${icon} ${version}: ${count} users`);
        });
      console.log('');

      if (versionCounts['universal-v6.0'] === successCount) {
        console.log('✅ All scores successfully migrated to v6.0');
      } else {
        console.log('⚠️  Score count mismatch - some users may need re-calculation');
      }
    }

    console.log('');
    console.log('Next Steps:');
    console.log('  1. Verify scores in dashboard');
    console.log('  2. Test immediate triggers (create booking, verify identity, etc.)');
    console.log('  3. Delete this script (scripts/backfill-caas-v6.mts)');
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
