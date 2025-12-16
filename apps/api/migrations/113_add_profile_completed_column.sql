-- Migration: Add profile_completed column to profiles table
-- Version: 113
-- Created: 2025-12-14
-- Purpose: Add profile_completed flag for marketplace visibility

-- Add profile_completed column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

-- Create index for faster marketplace queries
CREATE INDEX IF NOT EXISTS idx_profiles_completed_tutors
ON profiles (profile_completed)
WHERE profile_completed = TRUE AND roles @> ARRAY['tutor'];

-- Backfill existing tutors who completed onboarding
-- Set profile_completed = true for tutors with onboarding_completed = true
UPDATE profiles
SET profile_completed = true
WHERE roles @> ARRAY['tutor']
  AND onboarding_progress->>'onboarding_completed' = 'true'
  AND profile_completed IS NOT TRUE;

-- Verify the migration
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
  RAISE NOTICE 'Migration 113 Summary:';
  RAISE NOTICE 'Total tutors: %', total_tutors;
  RAISE NOTICE 'Completed profiles: %', completed_tutors;
  RAISE NOTICE 'Marketplace-ready tutors: %', completed_tutors;
  RAISE NOTICE '==============================================';
END $$;
