-- Migration: 054_update_handle_new_user_with_slug.sql
-- Purpose: Update handle_new_user trigger to generate slugs on signup (v4.8)
-- Date: 2025-11-10
-- Prerequisites: Migration 053 (add slug column)
--
-- This migration updates the handle_new_user trigger to automatically
-- generate a unique slug when a new user signs up.

BEGIN;

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Re-create handle_new_user trigger with slug generation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Variables for referral logic (from migration 036)
  referral_code_input TEXT;
  cookie_referral_id_input UUID;
  referrer_id_from_code UUID;
  referrer_id_from_cookie UUID;
  v_referrer_id UUID := NULL;

  -- Variables for name extraction and secure code generation
  v_full_name TEXT := new.raw_user_meta_data ->> 'full_name';
  v_first_name TEXT;
  v_last_name TEXT;
  v_referral_code TEXT;

  -- NEW: Variables for slug generation (v4.8)
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
  -- SECTION 2: Generate unique slug (NEW v4.8)
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
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    first_name,
    last_name,
    referral_id,     -- Legacy column
    referral_code,   -- Secure code (v4.3)
    slug             -- NEW: SEO slug (v4.8)
  )
  VALUES (
    new.id,
    new.email,
    v_full_name,
    v_first_name,
    v_last_name,
    v_referral_code,
    v_referral_code,
    v_slug  -- NEW
  );

  -- =============================================
  -- SECTION 4: Handle Referral Pipeline Logic
  -- =============================================
  -- (Unchanged from migration 036)

  -- Get referral inputs from signup form metadata
  referral_code_input := new.raw_user_meta_data ->> 'referral_code';
  cookie_referral_id_input := (new.raw_user_meta_data ->> 'cookie_referral_id')::UUID;

  -- Priority 1: Check for explicit referral code claim
  IF referral_code_input IS NOT NULL AND referral_code_input != '' THEN
    SELECT id INTO referrer_id_from_code
    FROM public.profiles
    WHERE referral_code = UPPER(referral_code_input)
    LIMIT 1;

    IF referrer_id_from_code IS NOT NULL THEN
      v_referrer_id := referrer_id_from_code;
    END IF;
  END IF;

  -- Priority 2: Check for implicit cookie claim
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
  -- SECTION 5: Stamp referrer and update lead-gen table
  -- ========================================================
  IF v_referrer_id IS NOT NULL THEN
    -- Stamp the referrer-of-record for lifetime attribution
    UPDATE public.profiles
    SET referred_by_profile_id = v_referrer_id
    WHERE id = new.id;

    -- Update lead-gen 'referrals' table
    IF cookie_referral_id_input IS NOT NULL THEN
        UPDATE public.referrals
        SET
          referred_profile_id = new.id,
          status = 'Signed Up',
          signed_up_at = now()
        WHERE id = cookie_referral_id_input AND referrer_profile_id = v_referrer_id;

        IF NOT FOUND THEN
          INSERT INTO public.referrals (referrer_profile_id, referred_profile_id, status, signed_up_at)
          VALUES (v_referrer_id, new.id, 'Signed Up', now());
        END IF;
    ELSE
        INSERT INTO public.referrals (referrer_profile_id, referred_profile_id, status, signed_up_at)
        VALUES (v_referrer_id, new.id, 'Signed Up', now());
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
'[v4.8] Trigger function that runs on new user signup. Creates profile with slug, referral code, and handles referral attribution.';
