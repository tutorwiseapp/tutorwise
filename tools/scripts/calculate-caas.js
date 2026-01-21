// Calculate CaaS score for user
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lvsmtgmpoysjygdwcrir.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2c210Z21wb3lzanlnZHdjcmlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzk2MTcyMywiZXhwIjoyMDczNTM3NzIzfQ.O-YehlbetdFM1VDhqFmDN_9vmEe27oqq2EFyBbt2fRg';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function calculateTutorScore(profileId) {
  console.log('🔄 Calculating CaaS score for:', profileId);

  // Fetch profile with onboarding_progress
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      roles,
      identity_verified,
      dbs_verified,
      dbs_expiry_date,
      created_at,
      bio_video_url,
      available_free_help,
      onboarding_progress,
      role_details!inner(
        qualifications,
        teaching_experience
      )
    `)
    .eq('id', profileId)
    .eq('role_details.role_type', 'tutor')
    .single();

  if (profileError) {
    console.error('❌ Error fetching profile:', profileError);
    return;
  }

  console.log('✅ Profile fetched');

  const roleDetails = Array.isArray(profileData.role_details)
    ? profileData.role_details[0]
    : profileData.role_details;

  // Check safety gate
  const hasCompletedOnboarding = profileData.onboarding_progress?.onboarding_completed === true;
  console.log('- Identity Verified:', profileData.identity_verified);
  console.log('- Onboarding Completed:', hasCompletedOnboarding);

  if (!profileData.identity_verified && !hasCompletedOnboarding) {
    console.log('❌ Safety gate blocked: Identity not verified and onboarding incomplete');
    return;
  }

  console.log('✅ Safety gate passed');

  // Calculate buckets
  let performance = 30; // Provisional for 0 sessions
  let qualifications = 0;
  let network = 0;
  let safety = 0;
  let digital = 0;
  let socialImpact = 0;

  // Qualifications
  const quals = roleDetails?.qualifications;
  if (quals?.education) {
    qualifications += 10;
    console.log('  + Qualifications: 10 points (degree)');
  }

  if (quals?.certifications?.includes('qts') || quals?.certifications?.includes('QTLS, QTS')) {
    qualifications += 10;
    console.log('  + Qualifications: 10 points (QTS)');
  }

  // Provisional onboarding points
  const hasTutoringExp = profileData.onboarding_progress?.tutor?.professionalDetails?.tutoringExperience;
  if (hasCompletedOnboarding && hasTutoringExp) {
    qualifications += 10;
    console.log('  + Qualifications: 10 points (provisional onboarding experience)');
  }

  // Safety
  if (profileData.identity_verified || hasCompletedOnboarding) {
    safety += 5;
    console.log('  + Safety: 5 points (identity/onboarding)');
  }

  const rawTotal = performance + qualifications + network + safety + digital + socialImpact;
  const normalizedTotal = Math.round((rawTotal / 110) * 100);

  console.log('\n📊 Score Breakdown:');
  console.log(`  Performance: ${performance}`);
  console.log(`  Qualifications: ${qualifications}`);
  console.log(`  Network: ${network}`);
  console.log(`  Safety: ${safety}`);
  console.log(`  Digital: ${digital}`);
  console.log(`  Social Impact: ${socialImpact}`);
  console.log(`  Raw Total: ${rawTotal}/110`);
  console.log(`  Normalized: ${normalizedTotal}/100`);

  // Save to database
  const { error: upsertError } = await supabase.from('caas_scores').upsert(
    {
      profile_id: profileId,
      role_type: 'TUTOR',
      total_score: normalizedTotal,
      score_breakdown: {
        performance,
        qualifications,
        network,
        safety,
        digital,
        social_impact: socialImpact,
      },
      calculation_version: 'tutor-v5.5',
      calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'profile_id',
    }
  );

  if (upsertError) {
    console.error('\n❌ Error saving score:', upsertError);
  } else {
    console.log('\n✅ Score saved to database!');
    console.log(`🎉 Final score: ${normalizedTotal}/100`);
  }
}

calculateTutorScore('31efc512-aaaa-410b-8667-69a964f5123a').catch(console.error);
