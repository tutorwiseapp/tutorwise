-- Migration: Update handle_new_user trigger for SDD v3.6
-- Version: 029
-- Created: 2025-11-02
-- Description: Implements referral code generation and "Lifetime Attribution" logic
-- This migration DROPS the old trigger and RE-CREATES it with the new logic
-- Specification: SDD v3.6, Section 8.2

-- =====================================================================
-- IMPORTANT: This trigger handles TWO critical responsibilities:
-- 1. Generates unique, human-readable referral codes (FIRSTNAME-1234)
-- 2. Stamps the "Referrer-of-Record" onto new user profiles for lifetime commissions
-- =====================================================================

BEGIN;

-- ==================================
-- STEP 1: Drop existing trigger and function
-- ==================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

-- ======================================
-- STEP 2: Create the new handle_new_user function
-- ======================================
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

  -- Variables for code generation (SDD v3.6, Q&A #1)
  v_full_name TEXT := new.raw_user_meta_data ->> 'full_name';
  v_first_name TEXT;
  v_referral_code TEXT;
  v_code_suffix INT;
  v_attempts INT := 0;
BEGIN

  -- ===========================================
  -- SECTION 1: Generate a unique, human-readable referral code
  -- ===========================================
  -- Format: FIRSTNAME-1234 (e.g., JANE-1234)

  -- Extract and uppercase first name
  IF v_full_name IS NOT NULL AND v_full_name != '' THEN
    v_first_name := UPPER(SPLIT_PART(v_full_name, ' ', 1));
  ELSE
    v_first_name := 'USER'; -- Fallback if no name provided
  END IF;

  -- Generate unique code with retry logic
  LOOP
    v_code_suffix := FLOOR(RANDOM() * 9000) + 1000; -- 1000-9999
    v_referral_code := v_first_name || '-' || v_code_suffix::TEXT;

    -- Check for collision
    PERFORM 1 FROM public.profiles WHERE referral_code = v_referral_code;
    IF NOT FOUND THEN
      EXIT; -- Code is unique
    END IF;

    v_attempts := v_attempts + 1;
    IF v_attempts > 5 THEN
      -- Fallback to a non-human-readable but unique code if we fail 5 times
      v_referral_code := 'USER-' || (FLOOR(RANDOM() * 90000) + 10000)::text;
      EXIT;
    END IF;
  END LOOP;

  -- ======================================
  -- SECTION 2: Create the user's public profile
  -- ======================================
  -- Note: Both referral_id (legacy) and referral_code (new) are set to the same value
  INSERT INTO public.profiles (id, email, full_name, referral_id, referral_code)
  VALUES (
    new.id,
    new.email,
    v_full_name,
    v_referral_code, -- Legacy column (NOT NULL)
    v_referral_code  -- New column for v3.6
  );

  -- =============================================
  -- SECTION 3: Handle Referral Pipeline Logic
  -- =============================================
  -- (SDD v3.6, Section 8.2)

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

-- ======================================
-- STEP 3: Re-apply the trigger to the auth.users table
-- ======================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;
