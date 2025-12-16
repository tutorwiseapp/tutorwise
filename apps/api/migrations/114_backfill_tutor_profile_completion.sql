-- Migration: Backfill existing tutors with profile completion data
-- Version: 114
-- Created: 2025-12-14
-- Purpose: Populate missing address and professional_details for existing tutors in test environment
--          Then set profile_completed = true for marketplace visibility

-- =====================================================================
-- IMPORTANT: This is a TEST ENVIRONMENT backfill migration
-- For production, you would import real data or prompt users to complete profiles
-- =====================================================================

DO $$
DECLARE
  tutor_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- Log start
  RAISE NOTICE 'Starting backfill of tutor profiles...';

  -- Loop through all tutors with 'tutor' role
  FOR tutor_record IN
    SELECT id, first_name, last_name, city, professional_details
    FROM profiles
    WHERE roles @> ARRAY['tutor']
      AND profile_completed IS NOT TRUE
  LOOP
    -- Update address fields with sensible UK test data
    UPDATE profiles
    SET
      address_line1 = COALESCE(address_line1, '123 High Street'),
      town = COALESCE(town, city, 'London'),
      city = COALESCE(city, 'London'),
      country = COALESCE(country, 'United Kingdom'),
      postal_code = COALESCE(postal_code, 'SW1A 1AA'),

      -- Update professional_details.tutor with required fields if missing
      professional_details = jsonb_set(
        COALESCE(professional_details, '{}'::jsonb),
        '{tutor}',
        COALESCE(professional_details->'tutor', '{}'::jsonb) ||
        jsonb_build_object(
          'status', COALESCE(professional_details->'tutor'->>'status', 'Available'),
          'key_stages', COALESCE(
            professional_details->'tutor'->'key_stages',
            '["KS3", "KS4"]'::jsonb
          ),
          'academic_qualifications', COALESCE(
            professional_details->'tutor'->'academic_qualifications',
            '["BSc Mathematics", "MSc Education"]'::jsonb
          ),
          'teaching_professional_qualifications', COALESCE(
            professional_details->'tutor'->'teaching_professional_qualifications',
            '["PGCE", "QTS"]'::jsonb
          ),
          'teaching_experience', COALESCE(
            professional_details->'tutor'->>'teaching_experience',
            '5+ years'
          ),
          'tutoring_experience', COALESCE(
            professional_details->'tutor'->>'tutoring_experience',
            '3+ years'
          ),
          'session_types', COALESCE(
            professional_details->'tutor'->'session_types',
            '["one_on_one", "group"]'::jsonb
          ),
          'delivery_mode', COALESCE(
            professional_details->'tutor'->'delivery_mode',
            '["online", "in_person"]'::jsonb
          ),
          'one_on_one_rate', COALESCE(
            (professional_details->'tutor'->>'one_on_one_rate')::numeric,
            (professional_details->'tutor'->>'hourly_rate')::numeric,
            35.00
          ),
          'group_session_rate', COALESCE(
            (professional_details->'tutor'->>'group_session_rate')::numeric,
            25.00
          ),
          -- Preserve existing fields
          'subjects', COALESCE(
            professional_details->'tutor'->'subjects',
            '["Mathematics"]'::jsonb
          ),
          'bio', COALESCE(
            professional_details->'tutor'->>'bio',
            'Experienced tutor passionate about helping students achieve their goals.'
          )
        ),
        true
      ),

      -- Set profile_completed = true
      profile_completed = true

    WHERE id = tutor_record.id;

    updated_count := updated_count + 1;

  END LOOP;

  -- Log completion
  RAISE NOTICE 'Backfill complete: Updated % tutor profiles', updated_count;
  RAISE NOTICE 'All updated tutors now have profile_completed = true and can appear in marketplace';

END $$;

-- Verify the update
DO $$
DECLARE
  total_tutors INTEGER;
  completed_tutors INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tutors
  FROM profiles
  WHERE roles @> ARRAY['tutor'];

  SELECT COUNT(*) INTO completed_tutors
  FROM profiles
  WHERE roles @> ARRAY['tutor']
    AND profile_completed = true;

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Migration 114 Summary:';
  RAISE NOTICE 'Total tutors: %', total_tutors;
  RAISE NOTICE 'Completed profiles: %', completed_tutors;
  RAISE NOTICE 'Incomplete profiles: %', total_tutors - completed_tutors;
  RAISE NOTICE '==============================================';
END $$;
