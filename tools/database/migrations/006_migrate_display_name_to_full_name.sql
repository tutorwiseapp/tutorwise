-- Migration: Migrate from display_name to full_name
-- Purpose: Use full_name (legal name) instead of display_name for tutoring platform compliance
-- Date: 2025-10-17

-- Add full_name column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Migrate existing display_name data to full_name
UPDATE profiles
SET full_name = display_name
WHERE display_name IS NOT NULL
  AND (full_name IS NULL OR full_name = '');

-- Add comment to document the column
COMMENT ON COLUMN profiles.full_name IS 'Full legal name of the user (required for tutors - used for background checks, credentials, and public listings)';
COMMENT ON COLUMN profiles.display_name IS 'Deprecated: use full_name instead. Kept for backward compatibility during migration.';

-- Create index for faster searches by full name
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);

-- Note: display_name column is kept for backward compatibility during transition
-- TODO: After confirming all systems use full_name, we can remove display_name column
