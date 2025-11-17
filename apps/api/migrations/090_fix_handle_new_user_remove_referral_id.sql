-- Migration: 090_fix_handle_new_user_remove_referral_id.sql
-- Purpose: Remove referral_id column from handle_new_user trigger INSERT statement
-- Date: 2025-11-17
-- Bug: Trigger tries to insert into 'referral_id' column which was deprecated in migration 037
-- Fix: Remove referral_id from INSERT statement (only use referral_code)

BEGIN;

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Re-create handle_new_user trigger WITHOUT referral_id column
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Variables for referral logic (updated for Phase 3)
  referral_code_input TEXT;
  referrer_id_from_code UUID;
  v_referrer_id UUID := NULL;

  -- Variables for name extraction and secure code generation
  v_full_name TEXT := new.raw_user_meta_data ->> 'full_name';
  v_first_name TEXT;
  v_last_name TEXT;
  v_referral_code TEXT;

  -- Variables for slug generation (v4.8)
  v_slug_base TEXT;
  v_slug TEXT;
  v_slug_count INT;
BEGIN

  -- ===========================================
  -- SECTION 1: Generate unique referral code
  -- ===========================================
  v_referral_code := generate_secure_referral_code();

  -- Extract first and last name from full_name
  IF v_full_name IS NOT NULL AND v_full_name != '' THEN
    v_first_name := SPLIT_PART(v_full_name, ' ', 1);
    v_last_name := NULLIF(TRIM(SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name))), '');
  END IF;

  -- ===========================================
  -- SECTION 2: Generate unique slug (v4.8)
  -- ===========================================
  IF v_full_name IS NOT NULL AND v_full_name != '' THEN
    v_slug_base := generate_slug(v_full_name);
    v_slug := v_slug_base;
    v_slug_count := 1;

    -- Loop to find unique slug if collisions exist
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = v_slug) LOOP
      v_slug_count := v_slug_count + 1;
      v_slug := v_slug_base || '-' || v_slug_count::TEXT;
    END LOOP;
  ELSE
    -- Fallback: use referral code as slug if no name provided
    v_slug := 'user-' || lower(v_referral_code);
  END IF;

  -- ======================================
  -- SECTION 3: Create the user's profile
  -- ======================================
  -- FIX: Removed referral_id column (deprecated in migration 037)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    referral_code,   -- Only use referral_code (NOT referral_id)
    slug
  )
  VALUES (
    new.id,
    new.email,
    v_full_name,
    v_first_name,
    v_last_name,
    v_referral_code,
    v_slug
  );

  -- =============================================
  -- SECTION 4: Handle Referral Attribution (Phase 3)
  -- =============================================
  -- Get referral code from signup form metadata
  referral_code_input := new.raw_user_meta_data ->> 'referral_code';

  -- Look up the agent who owns this referral code
  IF referral_code_input IS NOT NULL AND referral_code_input != '' THEN
    SELECT id INTO referrer_id_from_code
    FROM public.profiles
    WHERE referral_code = UPPER(referral_code_input)
    LIMIT 1;

    IF referrer_id_from_code IS NOT NULL THEN
      v_referrer_id := referrer_id_from_code;
    END IF;
  END IF;

  -- ========================================================
  -- SECTION 5: Stamp referrer and update referrals table
  -- ========================================================
  IF v_referrer_id IS NOT NULL THEN
    -- Stamp the referrer-of-record for lifetime attribution
    UPDATE public.profiles
    SET referred_by_profile_id = v_referrer_id
    WHERE id = new.id;

    -- Update any existing "Referred" status record to "Signed Up"
    UPDATE public.referrals
    SET
      referred_profile_id = new.id,
      status = 'Signed Up'
    WHERE id = (
      SELECT id FROM public.referrals
      WHERE agent_profile_id = v_referrer_id
        AND referred_profile_id IS NULL
        AND status = 'Referred'
      LIMIT 1
    );

    -- If no existing record was updated, create a new one
    IF NOT FOUND THEN
      INSERT INTO public.referrals (agent_profile_id, referred_profile_id, status)
      VALUES (v_referrer_id, new.id, 'Signed Up');
    END IF;
  END IF;

  RETURN new;
END;
$$;

-- Re-apply the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS
'[v5.7.1 - FIXED v2] Trigger function that runs on new user signup. Creates profile with slug and referral code. FIXED: Removed deprecated referral_id column, uses only referral_code and referred_by_profile_id.';
