-- Migration: 099_create_saved_profiles_table.sql
-- Purpose: Create table to store user's saved/favorited profiles
-- Created: 2025-12-09
-- Author: Claude Code

-- Create saved_profiles table
CREATE TABLE IF NOT EXISTS saved_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure a user can only save a profile once
  UNIQUE(user_id, profile_id)
);

-- Create indexes for performance
CREATE INDEX idx_saved_profiles_user_id ON saved_profiles(user_id);
CREATE INDEX idx_saved_profiles_profile_id ON saved_profiles(profile_id);
CREATE INDEX idx_saved_profiles_created_at ON saved_profiles(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE saved_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own saved profiles
CREATE POLICY "Users can view their own saved profiles"
  ON saved_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own saved profiles
CREATE POLICY "Users can save profiles"
  ON saved_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own saved profiles
CREATE POLICY "Users can unsave profiles"
  ON saved_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comment for documentation
COMMENT ON TABLE saved_profiles IS 'Stores user-saved/favorited profiles for quick access';
COMMENT ON COLUMN saved_profiles.user_id IS 'ID of the user who saved the profile';
COMMENT ON COLUMN saved_profiles.profile_id IS 'ID of the saved profile';
