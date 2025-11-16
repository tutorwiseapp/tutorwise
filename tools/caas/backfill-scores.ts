/**
 * Filename: tools/caas/backfill-scores.ts
 * Purpose: Backfill CaaS scores for all existing profiles
 * Created: 2025-11-15 (CaaS v5.5)
 *
 * Usage:
 *   npx tsx tools/caas/backfill-scores.ts [--dry-run]
 *
 * Options:
 *   --dry-run: Show what would be processed without making changes
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface BackfillStats {
  totalProfiles: number;
  queued: number;
  alreadyHaveScores: number;
  errors: number;
  skipped: number;
}

async function backfillScores(dryRun: boolean = false) {
  console.log('🚀 CaaS Score Backfill Script');
  console.log('==============================\n');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  const stats: BackfillStats = {
    totalProfiles: 0,
    queued: 0,
    alreadyHaveScores: 0,
    errors: 0,
    skipped: 0,
  };

  try {
    // Step 1: Fetch all profiles
    console.log('📊 Fetching all profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, active_role, email')
      .order('created_at', { ascending: true });

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    stats.totalProfiles = profiles?.length || 0;
    console.log(`   Found ${stats.totalProfiles} profiles\n`);

    if (!profiles || profiles.length === 0) {
      console.log('✅ No profiles to process');
      return stats;
    }

    // Step 2: Check existing scores
    console.log('🔍 Checking for existing CaaS scores...');
    const { data: existingScores, error: scoresError } = await supabase
      .from('caas_scores')
      .select('profile_id');

    if (scoresError) {
      throw new Error(`Failed to fetch existing scores: ${scoresError.message}`);
    }

    const existingScoreIds = new Set(existingScores?.map((s) => s.profile_id) || []);
    console.log(`   Found ${existingScoreIds.size} profiles with existing scores\n`);

    // Step 3: Process each profile
    console.log('⚙️  Processing profiles...\n');

    for (const profile of profiles) {
      const displayName = profile.full_name || profile.email || profile.id;
      const hasScore = existingScoreIds.has(profile.id);

      if (hasScore) {
        console.log(`   ⏭️  ${displayName} - Already has CaaS score (skipping)`);
        stats.alreadyHaveScores++;
        continue;
      }

      // Only queue tutor and client roles (skip agents and other roles for now)
      if (!profile.active_role || !['tutor', 'client'].includes(profile.active_role)) {
        console.log(`   ⚠️  ${displayName} - Role: ${profile.active_role || 'none'} (skipping)`);
        stats.skipped++;
        continue;
      }

      if (!dryRun) {
        try {
          // Queue for recalculation
          const { error: queueError } = await supabase
            .from('caas_recalculation_queue')
            .insert({
              profile_id: profile.id,
              priority: 'low',
              reason: 'backfill',
            });

          if (queueError) {
            // Check if already queued (unique constraint violation)
            if (queueError.code === '23505') {
              console.log(`   ℹ️  ${displayName} - Already queued`);
              stats.queued++;
            } else {
              throw queueError;
            }
          } else {
            console.log(`   ✅ ${displayName} - Queued for calculation`);
            stats.queued++;
          }
        } catch (error: any) {
          console.error(`   ❌ ${displayName} - Error: ${error.message}`);
          stats.errors++;
        }
      } else {
        console.log(`   [DRY RUN] Would queue: ${displayName} (${profile.active_role})`);
        stats.queued++;
      }
    }

    console.log('\n📈 Backfill Summary');
    console.log('===================');
    console.log(`Total Profiles:         ${stats.totalProfiles}`);
    console.log(`Already Have Scores:    ${stats.alreadyHaveScores}`);
    console.log(`Queued for Calculation: ${stats.queued}`);
    console.log(`Skipped (wrong role):   ${stats.skipped}`);
    console.log(`Errors:                 ${stats.errors}`);

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN - no changes were made');
      console.log('   Run without --dry-run to actually queue profiles');
    } else {
      console.log('\n✅ Backfill complete!');
      console.log('\n📝 Next Steps:');
      console.log('   1. Run the CaaS worker to process the queue:');
      console.log('      curl -X POST http://localhost:3000/api/caas-worker');
      console.log('   2. Monitor progress in caas_recalculation_queue table');
      console.log('   3. Check caas_scores table for calculated scores');
    }

    return stats;
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Run the backfill
backfillScores(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
