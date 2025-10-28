-- Migration: Drop deprecated role_details and onboarding_sessions tables
-- Version: 026
-- Created: 2025-10-27
-- Description: Removes deprecated role_details architecture in favor of professional_details JSONB

-- =====================================================================
-- IMPORTANT: This migration drops the old role_details and
-- onboarding_sessions tables which have been replaced by the new
-- professional_details JSONB architecture on the profiles table.
--
-- The new architecture stores role-specific data in:
-- - profiles.professional_details.tutor
-- - profiles.professional_details.client
-- - profiles.professional_details.agent
-- =====================================================================

-- Check if tables have any data before dropping (for safety)
DO $$
DECLARE
  role_details_count INTEGER;
  onboarding_sessions_count INTEGER;
BEGIN
  -- Count rows in role_details
  SELECT COUNT(*) INTO role_details_count
  FROM role_details
  WHERE true;

  -- Count rows in onboarding_sessions
  SELECT COUNT(*) INTO onboarding_sessions_count
  FROM onboarding_sessions
  WHERE true;

  -- Log the counts
  RAISE NOTICE 'role_details table has % rows', role_details_count;
  RAISE NOTICE 'onboarding_sessions table has % rows', onboarding_sessions_count;

  -- Warning if tables have data
  IF role_details_count > 0 OR onboarding_sessions_count > 0 THEN
    RAISE WARNING 'Tables contain data! Consider migrating to professional_details before dropping.';
  END IF;
END $$;

-- Drop the onboarding_status_view (depends on role_details)
DROP VIEW IF EXISTS onboarding_status_view CASCADE;

-- Drop helper function
DROP FUNCTION IF EXISTS get_onboarding_progress(UUID, TEXT) CASCADE;

-- Drop update triggers
DROP TRIGGER IF EXISTS update_role_details_updated_at ON role_details;
DROP TRIGGER IF EXISTS update_onboarding_sessions_last_active ON onboarding_sessions;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_last_active_column() CASCADE;

-- Drop indexes (for safety, though CASCADE should handle this)
DROP INDEX IF EXISTS idx_role_details_profile_id;
DROP INDEX IF EXISTS idx_role_details_role_type;
DROP INDEX IF EXISTS idx_role_details_profile_role;
DROP INDEX IF EXISTS idx_role_details_subjects;
DROP INDEX IF EXISTS idx_role_details_completed;
DROP INDEX IF EXISTS idx_onboarding_sessions_profile_id;
DROP INDEX IF EXISTS idx_onboarding_sessions_role_type;
DROP INDEX IF EXISTS idx_onboarding_sessions_profile_role;
DROP INDEX IF EXISTS idx_onboarding_sessions_active;

-- Drop the tables
DROP TABLE IF EXISTS onboarding_sessions CASCADE;
DROP TABLE IF EXISTS role_details CASCADE;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 026 completed: Dropped role_details and onboarding_sessions tables';
  RAISE NOTICE 'All role-specific data should now be in profiles.professional_details';
END $$;
