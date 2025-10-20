-- Migration: Create default listing templates when profile is created
-- Version: 007
-- Date: 2025-10-20
-- Purpose: Auto-create 3 template listings (Maths, English, Science) when a tutor profile is created
--          This eliminates race conditions with full_name population in the listing wizard

-- Function to create default listing templates for new tutors
CREATE OR REPLACE FUNCTION create_default_listing_templates()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create templates if:
  -- 1. Profile has full_name set (prevents empty tutor_name in listings)
  -- 2. Profile has provider role (tutors only)
  -- 3. This is a new profile (INSERT operation)
  IF NEW.full_name IS NOT NULL AND
     NEW.full_name != '' AND
     (NEW.active_role = 'provider' OR 'provider' = ANY(NEW.roles)) THEN

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
      NEW.id,
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
      NEW.full_name
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
      NEW.id,
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
      NEW.full_name
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
      NEW.id,
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
      NEW.full_name
    );

    -- Log template creation
    RAISE NOTICE 'Created 3 default listing templates for tutor profile %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create templates after profile insert
CREATE TRIGGER profiles_create_listing_templates
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_listing_templates();

-- Add comment
COMMENT ON FUNCTION create_default_listing_templates() IS
  'Automatically creates 3 draft listing templates (Maths, English, Science) when a tutor profile is created with a full_name. Eliminates race conditions in the listing creation wizard.';
