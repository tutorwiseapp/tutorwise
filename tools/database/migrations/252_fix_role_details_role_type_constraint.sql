-- Migration: Fix role_details role_type constraint
-- Version: 252
-- Created: 2026-02-10
-- Description: Migration 139 created role_details with old role names ('seeker', 'provider').
--   Migration 027 tried to rename them but ran before the table existed.
--   This migration fixes the constraint and data to use the correct names ('client', 'tutor').

BEGIN;

-- Step 1: Migrate any existing seeker/provider data rows
UPDATE role_details
SET role_type = 'client'
WHERE role_type = 'seeker';

UPDATE role_details
SET role_type = 'tutor'
WHERE role_type = 'provider';

-- Step 2: Drop the old constraint (created by migration 139 with seeker/provider)
ALTER TABLE role_details
DROP CONSTRAINT IF EXISTS role_details_role_type_check;

-- Step 3: Add corrected constraint matching the rest of the system
ALTER TABLE role_details
ADD CONSTRAINT role_details_role_type_check
CHECK (role_type = ANY (ARRAY['client'::text, 'tutor'::text, 'agent'::text]));

-- Step 4: Same fix for onboarding_sessions (created in same migration 139)
UPDATE onboarding_sessions
SET role_type = 'client'
WHERE role_type = 'seeker';

UPDATE onboarding_sessions
SET role_type = 'tutor'
WHERE role_type = 'provider';

ALTER TABLE onboarding_sessions
DROP CONSTRAINT IF EXISTS onboarding_sessions_role_type_check;

ALTER TABLE onboarding_sessions
ADD CONSTRAINT onboarding_sessions_role_type_check
CHECK (role_type = ANY (ARRAY['client'::text, 'tutor'::text, 'agent'::text]));

DO $$
BEGIN
  RAISE NOTICE 'Migration 252 completed: role_details and onboarding_sessions constraints fixed';
  RAISE NOTICE 'Renamed: seeker -> client, provider -> tutor';
END $$;

COMMIT;
