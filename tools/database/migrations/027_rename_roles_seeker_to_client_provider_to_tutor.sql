-- Migration: Rename roles for consistency
-- Version: 027
-- Created: 2025-10-27
-- Description: Rename 'seeker' to 'client' and 'provider' to 'tutor' for consistency between frontend and backend

-- =====================================================================
-- IMPORTANT: This migration ensures role names are consistent everywhere
-- - profiles.roles array
-- - profiles.active_role
-- - role_details.role_type
-- =====================================================================

BEGIN;

-- Step 1: Update profiles.roles array values
-- Replace 'seeker' with 'client'
UPDATE profiles
SET roles = array_replace(roles, 'seeker', 'client')
WHERE 'seeker' = ANY(roles);

-- Replace 'provider' with 'tutor'
UPDATE profiles
SET roles = array_replace(roles, 'provider', 'tutor')
WHERE 'provider' = ANY(roles);

-- Step 2: Update profiles.active_role
UPDATE profiles
SET active_role = 'client'
WHERE active_role = 'seeker';

UPDATE profiles
SET active_role = 'tutor'
WHERE active_role = 'provider';

-- Step 3: Update role_details.role_type
UPDATE role_details
SET role_type = 'client'
WHERE role_type = 'seeker';

UPDATE role_details
SET role_type = 'tutor'
WHERE role_type = 'provider';

-- Step 4: Drop old constraint on role_details
ALTER TABLE role_details
DROP CONSTRAINT IF EXISTS role_details_role_type_check;

-- Step 5: Add new constraint with updated role names
ALTER TABLE role_details
ADD CONSTRAINT role_details_role_type_check
CHECK (role_type = ANY (ARRAY['client'::text, 'tutor'::text, 'agent'::text]));

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 027 completed successfully';
  RAISE NOTICE 'Renamed: seeker → client, provider → tutor';
  RAISE NOTICE 'Updated: profiles.roles, profiles.active_role, role_details.role_type';
END $$;

COMMIT;
