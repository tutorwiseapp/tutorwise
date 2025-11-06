-- Migration: 035_generate_secure_referral_codes.sql
-- Purpose: Generate secure short-codes for all existing users (SDD v4.3, Section 2.1)
-- Date: 2025-11-06
-- Prerequisites: profiles table with referral_code column exists
--
-- This migration implements the "Secure Short-Code" format replacing the legacy
-- FIRSTNAME-123 format. Generates 7-character random codes (62^7 = 3.5 trillion combinations)
-- using case-sensitive alphanumeric characters (a-z, A-Z, 0-9).

-- Create temporary function to generate secure short-codes
CREATE OR REPLACE FUNCTION generate_secure_referral_code()
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
  v_characters TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_code_length INT := 7;
  v_max_attempts INT := 100;
  v_attempt INT := 0;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 7-character code
    v_code := '';
    FOR i IN 1..v_code_length LOOP
      v_code := v_code || substr(v_characters, floor(random() * length(v_characters) + 1)::int, 1);
    END LOOP;

    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM public.profiles WHERE referral_code = v_code
    ) INTO v_exists;

    -- If unique, return it
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;

    -- Increment attempt counter and check max attempts
    v_attempt := v_attempt + 1;
    IF v_attempt >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after % attempts', v_max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Backfill referral codes for all existing users
-- Process in a single transaction since we only have ~5 test users
DO $$
DECLARE
  v_profile RECORD;
  v_new_code TEXT;
  v_updated_count INT := 0;
BEGIN
  -- Loop through all profiles without a referral_code
  FOR v_profile IN
    SELECT id, email, referral_id
    FROM public.profiles
    WHERE referral_code IS NULL
    ORDER BY created_at ASC
  LOOP
    -- Generate unique code
    v_new_code := generate_secure_referral_code();

    -- Update profile
    UPDATE public.profiles
    SET referral_code = v_new_code
    WHERE id = v_profile.id;

    v_updated_count := v_updated_count + 1;

    -- Log progress (will appear in migration output)
    RAISE NOTICE 'Generated code % for user % (old: %)',
      v_new_code, v_profile.email, v_profile.referral_id;
  END LOOP;

  RAISE NOTICE 'Successfully generated secure referral codes for % users', v_updated_count;
END $$;

-- Make referral_code NOT NULL now that all users have codes
ALTER TABLE public.profiles
ALTER COLUMN referral_code SET NOT NULL;

-- Add unique constraint if not exists (should already exist from earlier migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_referral_code_key'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
  END IF;
END $$;

-- Drop the temporary function (we'll recreate it in the trigger migration)
DROP FUNCTION IF EXISTS generate_secure_referral_code();

-- Add comment
COMMENT ON COLUMN public.profiles.referral_code IS
'[SDD v4.3] Secure 7-character referral code (e.g., kRz7Bq2) using case-sensitive alphanumeric characters. Replaces legacy FIRSTNAME-123 format. Used in referral links: tutorwise.com/a/[code]';

-- Migration verification query (for manual testing)
-- SELECT
--   id,
--   email,
--   referral_id AS old_code,
--   referral_code AS new_code,
--   length(referral_code) AS code_length
-- FROM public.profiles
-- ORDER BY created_at DESC
-- LIMIT 10;
