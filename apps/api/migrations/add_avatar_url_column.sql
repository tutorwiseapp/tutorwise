-- Migration: Add avatar_url column to profiles table
-- Version: add_avatar_url
-- Purpose: Add avatar_url as the primary profile picture field, deprecate custom_picture_url

-- Add avatar_url column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Copy existing custom_picture_url to avatar_url for existing users
UPDATE profiles
SET avatar_url = custom_picture_url
WHERE custom_picture_url IS NOT NULL
  AND (avatar_url IS NULL OR avatar_url = '');

-- Add comment
COMMENT ON COLUMN profiles.avatar_url IS 'Primary profile picture URL (synced with Supabase auth)';
COMMENT ON COLUMN profiles.custom_picture_url IS 'Deprecated: use avatar_url instead';
