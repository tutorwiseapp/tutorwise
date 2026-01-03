-- Migration: 117_hierarchical_attribution_enhancement.sql
-- Purpose: Implement full hierarchical attribution (URL → Cookie → Manual)
-- Date: 2025-12-16
-- Updated: 2026-01-03 - Fixed schema-qualified function calls for Supabase Auth compatibility
-- Patent Reference: Section 3 (Hierarchical Attribution Resolution), Dependent Claim 2
-- Solution Design v2: Section 6 (Attribution Resolution Algorithm)

BEGIN;

-- =====================================================
-- STEP 1: Add attribution_method column to referrals
-- =====================================================
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS attribution_method TEXT;

COMMENT ON COLUMN public.referrals.attribution_method IS
'[Patent Section 3] Tracks which attribution mechanism was used: url_parameter, cookie, manual_entry, or NULL for organic';

-- =====================================================
-- STEP 2: Add referral_source to profiles for debugging
-- =====================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_source TEXT;

COMMENT ON COLUMN public.profiles.referral_source IS
'[Debug] Tracks attribution source: url_parameter, cookie, manual_entry, or NULL for organic';

-- =====================================================
-- STEP 3: Create HMAC validation function
-- =====================================================
CREATE OR REPLACE FUNCTION validate_referral_cookie_signature(
  p_cookie_value TEXT,
  p_secret TEXT
)
RETURNS UUID AS $$
DECLARE
  v_referral_id TEXT;
  v_provided_sig TEXT;
  v_expected_sig TEXT;
BEGIN
  -- Split cookie value into ID and signature
  -- Format: "uuid.signature"
  v_referral_id := SPLIT_PART(p_cookie_value, '.', 1);
  v_provided_sig := SPLIT_PART(p_cookie_value, '.', 2);

  -- If no signature present (legacy cookie), validate as UUID only
  IF v_provided_sig = '' OR v_provided_sig IS NULL THEN
    -- Legacy cookie without signature - validate UUID format
    IF v_referral_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN v_referral_id::UUID;
    ELSE
      RAISE EXCEPTION 'Invalid referral ID format';
    END IF;
  END IF;

  -- Calculate expected HMAC signature
  v_expected_sig := encode(
    hmac(v_referral_id, p_secret, 'sha256'),
    'hex'
  );

  -- Compare signatures (constant-time comparison for security)
  IF v_provided_sig != v_expected_sig THEN
    RAISE EXCEPTION 'Cookie signature invalid - possible tampering detected';
  END IF;

  -- Signature valid - return referral ID
  RETURN v_referral_id::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_referral_cookie_signature IS
'[Patent Section 2.2] Validates HMAC-signed referral cookie to prevent tampering. Returns referral_id if valid, raises exception if tampered.';

-- =====================================================
-- STEP 4: Enhanced handle_new_user() with hierarchical attribution
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Variables for referral logic (HIERARCHICAL ATTRIBUTION)
  v_referrer_id UUID := NULL;
  v_referral_code TEXT;
  v_cookie_referral_id UUID;
  v_cookie_value TEXT;
  v_attribution_method TEXT := NULL;

  -- Variables for name extraction and secure code generation
  v_full_name TEXT := new.raw_user_meta_data ->> 'full_name';
  v_first_name TEXT;
  v_last_name TEXT;
  v_referral_code_generated TEXT;

  -- Variables for slug generation
  v_slug_base TEXT;
  v_slug TEXT;
  v_slug_count INT;

  -- HMAC secret (from environment variable passed via metadata)
  v_cookie_secret TEXT;
BEGIN

  -- ===========================================
  -- SECTION 1: Generate unique referral code
  -- ===========================================
  v_referral_code_generated := public.generate_secure_referral_code();

  -- Extract first and last name from full_name
  IF v_full_name IS NOT NULL AND v_full_name != '' THEN
    v_first_name := SPLIT_PART(v_full_name, ' ', 1);
    v_last_name := NULLIF(TRIM(SUBSTRING(v_full_name FROM POSITION(' ' IN v_full_name))), '');
  END IF;

  -- ===========================================
  -- SECTION 2: Generate unique slug
  -- ===========================================
  IF v_full_name IS NOT NULL AND v_full_name != '' THEN
    v_slug_base := public.generate_slug(v_full_name);
    v_slug := v_slug_base;
    v_slug_count := 1;

    -- Loop to find unique slug if collisions exist
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = v_slug) LOOP
      v_slug_count := v_slug_count + 1;
      v_slug := v_slug_base || '-' || v_slug_count::TEXT;
    END LOOP;
  ELSE
    -- Fallback: use referral code as slug if no name provided
    v_slug := 'user-' || lower(v_referral_code_generated);
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
    referral_code,
    slug
  )
  VALUES (
    new.id,
    new.email,
    v_full_name,
    v_first_name,
    v_last_name,
    v_referral_code_generated,
    v_slug
  );

  -- =============================================
  -- SECTION 4: HIERARCHICAL ATTRIBUTION RESOLUTION
  -- Patent Section 3, Dependent Claim 2
  -- Priority: URL → Cookie → Manual
  -- =============================================

  -- PRIORITY 1: URL Parameter (stored in metadata by auth flow)
  -- Format: raw_user_meta_data->>'referral_code_url'
  v_referral_code := new.raw_user_meta_data ->> 'referral_code_url';
  IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
    SELECT id INTO v_referrer_id
    FROM public.profiles
    WHERE referral_code = UPPER(v_referral_code)
    LIMIT 1;

    IF v_referrer_id IS NOT NULL THEN
      v_attribution_method := 'url_parameter';
      RAISE NOTICE 'Attribution: URL parameter (referral_code: %)', v_referral_code;
    END IF;
  END IF;

  -- PRIORITY 2: Cookie (if URL not found)
  IF v_referrer_id IS NULL THEN
    v_cookie_value := new.raw_user_meta_data ->> 'referral_cookie_id';
    v_cookie_secret := new.raw_user_meta_data ->> 'referral_cookie_secret';

    IF v_cookie_value IS NOT NULL AND v_cookie_value != '' THEN
      BEGIN
        -- Validate HMAC signature if secret provided
        IF v_cookie_secret IS NOT NULL AND v_cookie_secret != '' THEN
          v_cookie_referral_id := validate_referral_cookie_signature(
            v_cookie_value,
            v_cookie_secret
          );
        ELSE
          -- Legacy cookie without signature (Q1 2026 transition period)
          v_cookie_referral_id := v_cookie_value::UUID;
        END IF;

        -- Lookup agent_id from referrals table
        SELECT agent_id INTO v_referrer_id
        FROM public.referrals
        WHERE id = v_cookie_referral_id
          AND status = 'Referred'
        LIMIT 1;

        IF v_referrer_id IS NOT NULL THEN
          v_attribution_method := 'cookie';
          RAISE NOTICE 'Attribution: Cookie (referral_id: %)', v_cookie_referral_id;
        END IF;

      EXCEPTION
        WHEN OTHERS THEN
          -- Cookie validation failed (tampering detected or malformed)
          RAISE WARNING 'Cookie validation failed: %', SQLERRM;
          v_referrer_id := NULL;
      END;
    END IF;
  END IF;

  -- PRIORITY 3: Manual Entry (if cookie not found)
  IF v_referrer_id IS NULL THEN
    v_referral_code := new.raw_user_meta_data ->> 'referral_code_manual';

    IF v_referral_code IS NOT NULL AND v_referral_code != '' THEN
      SELECT id INTO v_referrer_id
      FROM public.profiles
      WHERE referral_code = UPPER(v_referral_code)
      LIMIT 1;

      IF v_referrer_id IS NOT NULL THEN
        v_attribution_method := 'manual_entry';
        RAISE NOTICE 'Attribution: Manual entry (referral_code: %)', v_referral_code;
      END IF;
    END IF;
  END IF;

  -- ========================================================
  -- SECTION 5: Stamp referrer and update referrals table
  -- ========================================================
  IF v_referrer_id IS NOT NULL THEN
    -- Stamp the referrer-of-record for lifetime attribution
    UPDATE public.profiles
    SET
      referred_by_profile_id = v_referrer_id,
      referral_source = v_attribution_method
    WHERE id = new.id;

    -- Update any existing "Referred" status record to "Signed Up"
    UPDATE public.referrals
    SET
      referred_profile_id = new.id,
      status = 'Signed Up',
      attribution_method = v_attribution_method
    WHERE id = (
      SELECT id FROM public.referrals
      WHERE agent_id = v_referrer_id
        AND referred_profile_id IS NULL
        AND status = 'Referred'
      ORDER BY created_at DESC
      LIMIT 1
    );

    -- If no existing record was updated, create a new one
    IF NOT FOUND THEN
      INSERT INTO public.referrals (
        agent_id,
        referred_profile_id,
        status,
        attribution_method
      )
      VALUES (
        v_referrer_id,
        new.id,
        'Signed Up',
        v_attribution_method
      );
    END IF;

    RAISE NOTICE 'Referral attribution successful: user=%, agent=%, method=%',
      new.id, v_referrer_id, v_attribution_method;
  ELSE
    RAISE NOTICE 'No referral attribution: organic signup (user=%)', new.id;
  END IF;

  RETURN new;
END;
$$;

-- Re-apply the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
'[v6.0.1 - Hierarchical Attribution - FIXED] Trigger function that runs on new user signup. Implements Patent Section 3 hierarchical attribution resolution: URL → Cookie → Manual. Validates HMAC signatures for cookie security. Uses schema-qualified function calls for Supabase Auth compatibility.';

-- =====================================================
-- STEP 5: Create attribution audit log (optional)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.referral_attribution_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  attempted_referrer_id UUID,
  successful_referrer_id UUID,
  attribution_method TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attribution_audit_profile ON public.referral_attribution_audit(profile_id);
CREATE INDEX IF NOT EXISTS idx_attribution_audit_created_at ON public.referral_attribution_audit(created_at DESC);

COMMENT ON TABLE public.referral_attribution_audit IS
'[Debug] Audit log for referral attribution attempts. Tracks successful and failed attributions for debugging and fraud detection.';

COMMIT;

-- Add summary comment
COMMENT ON SCHEMA public IS
'[Migration 091] Hierarchical attribution (URL → Cookie → Manual) with HMAC validation. Patent Section 3, Dependent Claim 2.';
