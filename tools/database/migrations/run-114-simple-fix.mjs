#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function simpleBackfill() {
  console.log('🚀 Simple backfill: Set profile_completed = true for tutors with onboarding_completed\n');

  try {
    // Update all tutors who have onboarding_completed = true
    const { data, error, count } = await supabase
      .from('profiles')
      .update({ profile_completed: true })
      .contains('roles', ['tutor'])
      .eq('onboarding_progress->>onboarding_completed', 'true')
      .is('profile_completed', null)
      .select('id, first_name, last_name');

    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }

    console.log(`✅ Updated ${data?.length || 0} tutors`);

    if (data && data.length > 0) {
      console.log('\nUpdated tutors:');
      data.forEach(t => console.log(`  - ${t.first_name} ${t.last_name} (${t.id})`));
    }

    // Verify total
    const { count: totalCompleted, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .contains('roles', ['tutor'])
      .eq('profile_completed', true);

    if (!countError) {
      console.log(`\n📈 Total tutors with profile_completed = true: ${totalCompleted}`);
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}

simpleBackfill();
