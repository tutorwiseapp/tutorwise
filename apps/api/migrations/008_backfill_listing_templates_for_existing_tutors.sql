-- Migration: Backfill listing templates for existing tutor profiles
-- Version: 008
-- Date: 2025-10-20
-- Purpose: Create default listing templates for existing tutors who don't have any listings yet

-- Backfill templates for existing tutors
DO $$
DECLARE
  tutor_record RECORD;
  templates_created INTEGER := 0;
BEGIN
  -- Find all tutor profiles that have full_name but no listings
  FOR tutor_record IN
    SELECT p.id, p.full_name
    FROM profiles p
    WHERE p.full_name IS NOT NULL
      AND p.full_name != ''
      AND (p.active_role = 'provider' OR 'provider' = ANY(p.roles))
      AND NOT EXISTS (
        SELECT 1 FROM listings l WHERE l.profile_id = p.id
      )
  LOOP
    -- Create Maths template
    INSERT INTO listings (
      profile_id,
      title,
      description,
      subjects,
      levels,
      languages,
      currency,
      location_country,
      timezone,
      location_type,
      status,
      tutor_name
    ) VALUES (
      tutor_record.id,
      'GCSE Mathematics Tutor - Experienced & Results-Focused',
      'I am an experienced mathematics tutor specialising in GCSE level. I focus on building strong foundations and helping students achieve their target grades through personalised teaching approaches.',
      ARRAY['Mathematics'],
      ARRAY['GCSE'],
      ARRAY['English'],
      'GBP',
      'United Kingdom',
      'Europe/London',
      'online',
      'draft',
      tutor_record.full_name
    );

    -- Create English template
    INSERT INTO listings (
      profile_id,
      title,
      description,
      subjects,
      levels,
      languages,
      currency,
      location_country,
      timezone,
      location_type,
      status,
      tutor_name
    ) VALUES (
      tutor_record.id,
      'GCSE English Language & Literature Tutor',
      'I provide comprehensive English tutoring covering both Language and Literature at GCSE level. My lessons focus on exam technique, analytical skills, and creative writing development.',
      ARRAY['English'],
      ARRAY['GCSE'],
      ARRAY['English'],
      'GBP',
      'United Kingdom',
      'Europe/London',
      'online',
      'draft',
      tutor_record.full_name
    );

    -- Create Science template
    INSERT INTO listings (
      profile_id,
      title,
      description,
      subjects,
      levels,
      languages,
      currency,
      location_country,
      timezone,
      location_type,
      status,
      tutor_name
    ) VALUES (
      tutor_record.id,
      'GCSE Science Tutor - Biology, Chemistry & Physics',
      'I offer expert science tutoring across all three sciences at GCSE level. My approach combines practical examples with exam-focused teaching to ensure students master key concepts.',
      ARRAY['Science', 'Biology', 'Chemistry', 'Physics'],
      ARRAY['GCSE'],
      ARRAY['English'],
      'GBP',
      'United Kingdom',
      'Europe/London',
      'online',
      'draft',
      tutor_record.full_name
    );

    templates_created := templates_created + 1;
    RAISE NOTICE 'Created 3 default listing templates for existing tutor %', tutor_record.id;
  END LOOP;

  RAISE NOTICE 'Backfill complete: Created templates for % existing tutors', templates_created;
END $$;
