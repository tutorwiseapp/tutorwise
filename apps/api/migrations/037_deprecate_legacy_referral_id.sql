-- Migration: 037_deprecate_legacy_referral_id.sql
-- Purpose: Drop legacy referral_id column now that secure codes are in place (SDD v4.3)
-- Date: 2025-11-06
-- Prerequisites: Migrations 035 and 036 completed (all users have referral_code)
--
-- SAFETY: This migration includes verification checks before dropping the column
-- to ensure no data loss. The frontend now uses referral_code exclusively.

BEGIN;

-- =====================================================
-- STEP 1: Verify all users have secure codes
-- =====================================================
DO $$
DECLARE
  v_null_count INT;
  v_total_count INT;
BEGIN
  SELECT COUNT(*) INTO v_total_count FROM public.profiles;
  SELECT COUNT(*) INTO v_null_count FROM public.profiles WHERE referral_code IS NULL;

  IF v_null_count > 0 THEN
    RAISE EXCEPTION 'Migration aborted: % users still have NULL referral_code. Run migration 035 first.', v_null_count;
  END IF;

  RAISE NOTICE 'Safety check passed: All % users have referral_code', v_total_count;
END $$;

-- =====================================================
-- STEP 2: Drop constraints that reference referral_id
-- =====================================================
-- Drop unique constraint on referral_id
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_agent_id_key;

-- =====================================================
-- STEP 3: Drop the legacy referral_id column
-- =====================================================
-- This removes the FIRSTNAME-1234 format column
DO $$
BEGIN
  ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS referral_id;

  RAISE NOTICE 'Legacy referral_id column dropped successfully';
END $$;

-- =====================================================
-- STEP 4: Update any remaining code references (audit)
-- =====================================================
-- At this point, the following files should already be updated:
-- ✅ apps/web/src/app/a/[referral_id]/route.ts - now uses referral_code
-- ✅ handle_new_user trigger (migration 036) - generates secure codes
-- ✅ GET /api/referrals - should use referral_code in joins (Phase 5)
--
-- This migration completes the hard cutover to secure short-codes.

COMMIT;

-- Verification query (run manually to confirm)
-- SELECT
--   id,
--   email,
--   referral_code,
--   length(referral_code) AS code_length,
--   referred_by_profile_id
-- FROM public.profiles
-- ORDER BY created_at DESC
-- LIMIT 10;
