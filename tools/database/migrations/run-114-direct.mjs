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

async function backfillTutors() {
  console.log('🚀 Starting backfill of tutor profiles...\n');

  try {
    // Get all tutors without profile_completed
    const { data: tutors, error: fetchError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, city, address_line1, town, country, postal_code, professional_details, profile_completed')
      .contains('roles', ['tutor'])
      .or('profile_completed.is.null,profile_completed.eq.false');

    if (fetchError) {
      throw new Error(`Failed to fetch tutors: ${fetchError.message}`);
    }

    console.log(`📊 Found ${tutors.length} tutors to update\n`);

    let updatedCount = 0;

    for (const tutor of tutors) {
      const tutorData = tutor.professional_details?.tutor || {};

      // Build updated professional_details
      const updatedProfessionalDetails = {
        ...tutor.professional_details,
        tutor: {
          ...tutorData,
          status: tutorData.status || 'Available',
          key_stages: tutorData.key_stages || ['KS3', 'KS4'],
          academic_qualifications: tutorData.academic_qualifications || ['BSc Mathematics', 'MSc Education'],
          teaching_professional_qualifications: tutorData.teaching_professional_qualifications || ['PGCE', 'QTS'],
          teaching_experience: tutorData.teaching_experience || '5+ years',
          tutoring_experience: tutorData.tutoring_experience || '3+ years',
          session_types: tutorData.session_types || ['one_on_one', 'group'],
          delivery_mode: tutorData.delivery_mode || ['online', 'in_person'],
          one_on_one_rate: tutorData.one_on_one_rate || tutorData.hourly_rate || 35.00,
          group_session_rate: tutorData.group_session_rate || 25.00,
          subjects: tutorData.subjects || ['Mathematics'],
          bio: tutorData.bio || 'Experienced tutor passionate about helping students achieve their goals.'
        }
      };

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          address_line1: tutor.address_line1 || '123 High Street',
          town: tutor.town || tutor.city || 'London',
          city: tutor.city || 'London',
          country: tutor.country || 'United Kingdom',
          postal_code: tutor.postal_code || 'SW1A 1AA',
          professional_details: updatedProfessionalDetails,
          profile_completed: true
        })
        .eq('id', tutor.id);

      if (updateError) {
        console.error(`❌ Failed to update tutor ${tutor.id}:`, updateError.message);
      } else {
        updatedCount++;
        console.log(`✅ Updated ${tutor.first_name} ${tutor.last_name} (${tutor.id})`);
      }
    }

    console.log(`\n✨ Backfill complete: Updated ${updatedCount}/${tutors.length} tutors`);

    // Verify
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .contains('roles', ['tutor'])
      .eq('profile_completed', true);

    if (!countError) {
      console.log(`\n📈 Total tutors with profile_completed = true: ${count}`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

backfillTutors();
