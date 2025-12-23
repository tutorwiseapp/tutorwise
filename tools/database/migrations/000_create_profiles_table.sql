-- Migration: Create profiles table
-- Version: 000 (Base migration)
-- Purpose: Create the base profiles table that other tables depend on

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,

  -- Profile Picture
  custom_picture_url TEXT,

  -- User Type/Roles
  roles TEXT[] DEFAULT '{}', -- e.g., ['tutor', 'student']
  primary_role TEXT, -- Main role: 'tutor', 'student', 'agent'

  -- Contact & Location
  phone TEXT,
  country TEXT,
  city TEXT,
  timezone TEXT DEFAULT 'Europe/London',

  -- Verification & Status
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  profile_completed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Policy: Users can view their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can view other users' public profile info (for marketplace)
CREATE POLICY profiles_select_public ON profiles
  FOR SELECT
  USING (true); -- Everyone can view basic profile info

-- Policy: Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own profile (during signup)
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_roles ON profiles USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_profiles_primary_role ON profiles(primary_role);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
CREATE TRIGGER profiles_update_timestamp
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

-- Add comment
COMMENT ON TABLE profiles IS 'User profiles extending Supabase auth.users';
