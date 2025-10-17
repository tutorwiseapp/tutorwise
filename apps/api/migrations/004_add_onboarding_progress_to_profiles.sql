-- Migration: Add onboarding_progress column to profiles table
-- Purpose: Store onboarding wizard progress as JSONB in profiles table
-- Date: 2025-10-17
-- Note: This replaces the separate onboarding_progress table approach

-- Add onboarding_progress column to profiles if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_progress JSONB DEFAULT '{"onboarding_completed": false}'::jsonb;

-- Add active_role column if it doesn't exist (referenced in code but missing from schema)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_role TEXT;

-- Create index for faster queries on onboarding completion status
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_completed
ON profiles ((onboarding_progress->>'onboarding_completed'));

-- Create index for current_step queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_current_step
ON profiles ((onboarding_progress->>'current_step'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.onboarding_progress IS 'JSONB field storing user onboarding wizard progress including current_step, completed_steps, role-specific data, etc.';
COMMENT ON COLUMN profiles.active_role IS 'Currently active role for the user: agent, seeker, or provider';
