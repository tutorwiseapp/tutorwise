-- Migration: Add profile_completed column to profiles table
-- Version: 114
-- Created: 2025-12-14
-- Purpose: Add flag to track when tutor profiles are marketplace-ready

-- Add profile_completed column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Create index for marketplace queries
CREATE INDEX IF NOT EXISTS idx_profiles_profile_completed
  ON profiles(profile_completed)
  WHERE profile_completed = TRUE AND roles @> ARRAY['tutor'];

-- Backfill: Set profile_completed = true for tutors who completed onboarding
UPDATE profiles
SET profile_completed = true
WHERE roles @> ARRAY['tutor']
  AND onboarding_progress->>'onboarding_completed' = 'true'
  AND profile_completed IS NOT TRUE;

-- Log results
DO $$
DECLARE
  total_tutors INTEGER;
  completed_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tutors
  FROM profiles
  WHERE roles @> ARRAY['tutor'];

  SELECT COUNT(*) INTO completed_profiles
  FROM profiles
  WHERE roles @> ARRAY['tutor']
    AND profile_completed = true;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 114 Complete';
  RAISE NOTICE 'Total tutors: %', total_tutors;
  RAISE NOTICE 'Completed profiles: %', completed_profiles;
  RAISE NOTICE '========================================';
END $$;
