-- Migration: 036_update_handle_new_user_secure_codes.sql
-- Purpose: Update handle_new_user trigger to generate secure short-codes (SDD v4.3, Section 2.1)
-- Date: 2025-11-06
-- Prerequisites: Migration 035 (backfill) completed, profiles.referral_code is NOT NULL
--
-- This migration replaces the FIRSTNAME-1234 generation logic with the new
-- secure 7-character alphanumeric code generation (e.g., kRz7Bq2).
-- All other referral attribution logic remains unchanged from SDD v3.6.

BEGIN;

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create helper function for secure code generation
-- This will be used by the trigger
CREATE OR REPLACE FUNCTION public.generate_secure_referral_code()
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

    -- Increment attempt counter
    v_attempt := v_attempt + 1;
    IF v_attempt >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after % attempts', v_max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Re-create handle_new_user trigger with secure code generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Variables for referral logic
  referral_code_input TEXT;
  cookie_referral_id_input UUID;
  referrer_id_from_code UUID;
  referrer_id_from_cookie UUID;
  v_referrer_id UUID := NULL; -- The final determined referrer ID

  -- Variables for SECURE code generation (SDD v4.3)
  v_full_name TEXT := new.raw_user_meta_data ->> 'full_name';
  v_first_name TEXT;
  v_last_name TEXT;
  v_referral_code TEXT;
BEGIN

  -- ===========================================
  -- SECTION 1: Generate a unique, SECURE referral code
  -- ===========================================
  -- Format: 7-character alphanumeric (e.g., kRz7Bq2)
  -- Replaces legacy FIRSTNAME-1234 format

  v_referral_code := generate_secure_referral_code();

  -- Extract first and last name from full_name for profile
  IF v_full_name IS NOT NULL AND v_full_name != '' THEN
    v_first_name := SPLIT_PART(v_full_name, ' ', 1);
    -- Get last name (everything after first space)
    v_last_name := NULLIF(TRIM(SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name))), '');
  END IF;

  -- ======================================
  -- SECTION 2: Create the user's public profile
  -- ======================================
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    referral_id,     -- Legacy column (kept for backward compat during transition)
    referral_code    -- New secure code (SDD v4.3)
  )
  VALUES (
    new.id,
    new.email,
    v_full_name,
    v_first_name,
    v_last_name,
    v_referral_code, -- Use same value for legacy column
    v_referral_code  -- New secure code
  );

  -- =============================================
  -- SECTION 3: Handle Referral Pipeline Logic
  -- =============================================
  -- (SDD v3.6, Section 8.2 - unchanged from migration 029)

  -- Get referral inputs from signup form metadata
  referral_code_input := new.raw_user_meta_data ->> 'referral_code';
  cookie_referral_id_input := (new.raw_user_meta_data ->> 'cookie_referral_id')::UUID;

  -- Priority 1: Check for an EXPLICIT referral code claim
  IF referral_code_input IS NOT NULL AND referral_code_input != '' THEN
    SELECT id INTO referrer_id_from_code
    FROM public.profiles
    WHERE referral_code = UPPER(referral_code_input)
    LIMIT 1;

    IF referrer_id_from_code IS NOT NULL THEN
      v_referrer_id := referrer_id_from_code;
    END IF;
  END IF;

  -- Priority 2: Check for an IMPLICIT cookie claim (if no code was used)
  IF v_referrer_id IS NULL AND cookie_referral_id_input IS NOT NULL THEN
    SELECT referrer_profile_id INTO referrer_id_from_cookie
    FROM public.referrals
    WHERE id = cookie_referral_id_input
      AND status = 'Referred'
      AND referred_profile_id IS NULL
    LIMIT 1;

    IF referrer_id_from_cookie IS NOT NULL THEN
      v_referrer_id := referrer_id_from_cookie;
    END IF;
  END IF;

  -- ========================================================
  -- SECTION 4: Stamp the user and update the lead-gen table
  -- ========================================================
  IF v_referrer_id IS NOT NULL THEN
    -- (CRITICAL) STAMP THE REFERRER-OF-RECORD for lifetime attribution
    -- This drives ALL future commission calculations (SDD v3.6, Section 1.5)
    UPDATE public.profiles
    SET referred_by_profile_id = v_referrer_id
    WHERE id = new.id;

    -- Update the lead-gen 'referrals' table (find-or-create)
    IF cookie_referral_id_input IS NOT NULL THEN
        -- Update the existing anonymous lead record
        UPDATE public.referrals
        SET
          referred_profile_id = new.id,
          status = 'Signed Up',
          signed_up_at = now()
        WHERE id = cookie_referral_id_input AND referrer_profile_id = v_referrer_id;

        -- If we didn't find a cookie record, create a new one
        IF NOT FOUND THEN
          INSERT INTO public.referrals (referrer_profile_id, referred_profile_id, status, signed_up_at)
          VALUES (v_referrer_id, new.id, 'Signed Up', now());
        END IF;
    ELSE
        -- No cookie, so create a new lead-gen record for explicit code claims
        INSERT INTO public.referrals (referrer_profile_id, referred_profile_id, status, signed_up_at)
        VALUES (v_referrer_id, new.id, 'Signed Up', now());
    END IF;
  END IF;

  RETURN new;
END;
$$;

-- Re-apply the trigger to the auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;

-- Add comment
COMMENT ON FUNCTION public.generate_secure_referral_code() IS
'[SDD v4.3] Generates a unique 7-character alphanumeric referral code (e.g., kRz7Bq2) with collision detection. Used by handle_new_user trigger for new user signups.';
