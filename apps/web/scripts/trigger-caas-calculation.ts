/**
 * Script to manually trigger CaaS calculation for a user
 * Usage: npx tsx scripts/trigger-caas-calculation.ts <profile_id>
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { CaaSService } from '../src/lib/services/caas';

async function main() {
  const profileId = process.argv[2];

  if (!profileId) {
    console.error('Usage: npx tsx scripts/trigger-caas-calculation.ts <profile_id>');
    console.error('Example: npx tsx scripts/trigger-caas-calculation.ts 31efc512-aaaa-410b-8667-69a964f5123a');
    process.exit(1);
  }

  console.log(`🔄 Triggering CaaS calculation for profile: ${profileId}`);

  // Create service role client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    // Calculate score
    const scoreData = await CaaSService.calculateProfileCaaS(profileId, supabase);

    console.log('✅ CaaS calculation completed!');
    console.log('📊 Score:', scoreData.total, '/100');
    console.log('🔍 Breakdown:', JSON.stringify(scoreData.breakdown, null, 2));

    // Verify it was saved
    const { data: savedScore, error } = await supabase
      .from('caas_scores')
      .select('total_score, score_breakdown, calculated_at')
      .eq('profile_id', profileId)
      .single();

    if (error) {
      console.error('❌ Error fetching saved score:', error);
    } else {
      console.log('✅ Score saved to database:', savedScore);
    }
  } catch (error) {
    console.error('❌ Error calculating score:', error);
    process.exit(1);
  }
}

main();
