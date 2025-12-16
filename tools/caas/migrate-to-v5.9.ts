/**
 * Filename: tools/caas/migrate-to-v5.9.ts
 * Purpose: Migrate ALL CaaS scores from v5.5 (100 points) to v5.9 (110 points with social impact)
 * Created: 2025-12-15
 *
 * This script:
 * 1. Deletes all existing CaaS scores (forces recalculation)
 * 2. Queues all tutor/client profiles for recalculation with v5.9 algorithm
 *
 * Usage:
 *   npx tsx tools/caas/migrate-to-v5.9.ts [--dry-run]
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

interface MigrationStats {
  totalProfiles: number;
  oldScoresDeleted: number;
  queued: number;
  errors: number;
  skipped: number;
}

async function migrateToV59(dryRun: boolean = false) {
  console.log('🚀 CaaS Score Migration: v5.5 → v5.9');
  console.log('========================================');
  console.log('Changes:');
  console.log('  - Old: 100 points total (5 buckets)');
  console.log('  - New: 110 points total (6 buckets + social impact)');
  console.log('  - Result: All scores will drop ~8-9% unless users enable free help\n');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  const stats: MigrationStats = {
    totalProfiles: 0,
    oldScoresDeleted: 0,
    queued: 0,
    errors: 0,
    skipped: 0,
  };

  try {
    // Step 1: Fetch all profiles with tutor or client role
    console.log('📊 Fetching all tutor/client profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, roles, active_role')
      .or('roles.cs.{tutor},roles.cs.{client}')
      .order('created_at', { ascending: true });

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    stats.totalProfiles = profiles?.length || 0;
    console.log(`   Found ${stats.totalProfiles} tutor/client profiles\n`);

    if (!profiles || profiles.length === 0) {
      console.log('✅ No profiles to migrate');
      return stats;
    }

    // Step 2: Check existing scores with v5.5
    console.log('🔍 Checking for existing v5.5 CaaS scores...');
    const { data: oldScores, error: scoresError } = await supabase
      .from('caas_scores')
      .select('profile_id, total_score, calculation_version')
      .like('calculation_version', '%v5.%');

    if (scoresError) {
      throw new Error(`Failed to fetch existing scores: ${scoresError.message}`);
    }

    console.log(`   Found ${oldScores?.length || 0} profiles with old scores\n`);

    // Step 3: Delete all old scores
    if (!dryRun && oldScores && oldScores.length > 0) {
      console.log('🗑️  Deleting all old v5.5 scores...');
      const { error: deleteError } = await supabase
        .from('caas_scores')
        .delete()
        .like('calculation_version', '%v5.%');

      if (deleteError) {
        throw new Error(`Failed to delete old scores: ${deleteError.message}`);
      }

      stats.oldScoresDeleted = oldScores.length;
      console.log(`   ✅ Deleted ${stats.oldScoresDeleted} old scores\n`);
    } else if (dryRun) {
      console.log(`   [DRY RUN] Would delete ${oldScores?.length || 0} old scores\n`);
      stats.oldScoresDeleted = oldScores?.length || 0;
    }

    // Step 4: Queue all profiles for recalculation
    console.log('⚙️  Queuing profiles for v5.9 recalculation...\n');

    for (const profile of profiles) {
      const displayName = profile.full_name || profile.email || profile.id;

      // Skip non-tutor/non-client roles
      if (!profile.roles || (!profile.roles.includes('tutor') && !profile.roles.includes('client'))) {
        console.log(`   ⚠️  ${displayName} - No tutor/client role (skipping)`);
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
            console.log(`   ✅ ${displayName} - Queued for v5.9 calculation`);
            stats.queued++;
          }
        } catch (error: any) {
          console.error(`   ❌ ${displayName} - Error: ${error.message}`);
          stats.errors++;
        }
      } else {
        console.log(`   [DRY RUN] Would queue: ${displayName} (${profile.roles.join(', ')})`);
        stats.queued++;
      }
    }

    console.log('\n📈 Migration Summary');
    console.log('====================');
    console.log(`Total Profiles:         ${stats.totalProfiles}`);
    console.log(`Old Scores Deleted:     ${stats.oldScoresDeleted}`);
    console.log(`Queued for v5.9:        ${stats.queued}`);
    console.log(`Skipped (wrong role):   ${stats.skipped}`);
    console.log(`Errors:                 ${stats.errors}`);

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN - no changes were made');
      console.log('   Run without --dry-run to actually migrate scores');
    } else {
      console.log('\n✅ Migration complete!');
      console.log('\n📝 Next Steps:');
      console.log('   1. Run the CaaS worker to process the queue (within 10 minutes)');
      console.log('   2. Or trigger immediately: POST /api/caas-worker');
      console.log('   3. All scores will be recalculated with v5.9 (110 points total)');
      console.log('\n💡 Expected Impact:');
      console.log('   - Scores will drop ~8-9% (35/100 → 32/100)');
      console.log('   - Users can recover by enabling "Offer Free Help" (+5 pts)');
      console.log('   - Completing 5 free sessions = +5 more pts');
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

// Run the migration
migrateToV59(dryRun)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
