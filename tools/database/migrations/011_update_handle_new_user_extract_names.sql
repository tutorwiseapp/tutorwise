-- Migration 011: Update handle_new_user to extract name data from auth metadata
-- Purpose: Auto-populate first_name, last_name, and full_name from signup and OAuth data
-- This ensures we don't ask users to re-enter their name during onboarding

-- Update the handle_new_user function to extract name data from raw_user_meta_data
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Extract data from raw_user_meta_data (works for both email/password signup and OAuth)
  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_first_name := NEW.raw_user_meta_data->>'given_name'; -- Google OAuth provides this
  v_last_name := NEW.raw_user_meta_data->>'family_name'; -- Google OAuth provides this
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url'; -- Google OAuth provides this

  -- If we don't have first_name/last_name but we have full_name, parse it
  -- Simple logic: first word is first name, rest is last name
  IF v_full_name IS NOT NULL AND (v_first_name IS NULL OR v_last_name IS NULL) THEN
    v_first_name := COALESCE(v_first_name, split_part(v_full_name, ' ', 1));
    v_last_name := COALESCE(v_last_name, TRIM(substring(v_full_name from position(' ' in v_full_name || ' '))));
    -- Handle case where there's only one name (no space)
    IF v_last_name = '' THEN
      v_last_name := NULL;
    END IF;
  END IF;

  -- If we have first_name and last_name but not full_name, construct it
  IF v_first_name IS NOT NULL AND v_last_name IS NOT NULL AND v_full_name IS NULL THEN
    v_full_name := v_first_name || ' ' || v_last_name;
  ELSIF v_first_name IS NOT NULL AND v_last_name IS NULL AND v_full_name IS NULL THEN
    v_full_name := v_first_name;
  END IF;

  -- Insert profile with all available data
  INSERT INTO profiles (
    id,
    email,
    email_verified,
    full_name,
    first_name,
    last_name,
    avatar_url
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.email_confirmed_at IS NOT NULL,
    v_full_name,
    v_first_name,
    v_last_name,
    v_avatar_url
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helpful comment
COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates a profile when a user signs up. Extracts name data from auth metadata (from email/password signup or OAuth providers like Google) and parses full_name into first_name/last_name if needed.';
