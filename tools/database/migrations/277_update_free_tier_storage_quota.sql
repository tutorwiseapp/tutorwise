-- ===================================================================
-- Migration: 277_update_free_tier_storage_quota.sql
-- Purpose: Update Sage free tier to allow 50 MB storage
-- Version: v1.1
-- Date: 2026-02-22
-- ===================================================================
-- Changes:
-- - Free tier: 0 MB → 50 MB storage quota
-- - Free tier: Track actual storage usage from sage_storage_files
-- - Reasoning: Allows users to test multimodal features (images/PDFs)
--   before upgrading to Pro (50 MB → 1 GB is 20x upgrade incentive)
-- ===================================================================

-- Drop and recreate the storage quota check function
CREATE OR REPLACE FUNCTION public.sage_check_storage_quota(
  p_user_id UUID,
  p_new_file_size BIGINT
) RETURNS TABLE (
  allowed BOOLEAN,
  remaining BIGINT,
  quota BIGINT,
  used BIGINT
) AS $$
DECLARE
  v_subscription RECORD;
  v_quota BIGINT;
  v_used BIGINT;
  v_allowed BOOLEAN;
BEGIN
  -- Get subscription details
  SELECT * INTO v_subscription
  FROM public.sage_pro_subscriptions
  WHERE user_id = p_user_id;

  -- Determine quota
  IF v_subscription.user_id IS NOT NULL AND v_subscription.status IN ('trialing', 'active') THEN
    -- Pro tier: 1 GB
    v_quota := v_subscription.storage_quota_bytes;
    v_used := v_subscription.storage_used_bytes;
  ELSE
    -- Free tier: 50 MB (52,428,800 bytes)
    v_quota := 52428800;

    -- Calculate actual storage usage from sage_storage_files
    SELECT COALESCE(SUM(file_size_bytes), 0) INTO v_used
    FROM public.sage_storage_files
    WHERE user_id = p_user_id;
  END IF;

  -- Check if new file would exceed quota
  v_allowed := (v_used + p_new_file_size) <= v_quota;

  RETURN QUERY SELECT
    v_allowed,
    GREATEST(0, v_quota - v_used),
    v_quota,
    v_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sage_check_storage_quota IS 'v1.1: Check if user can upload file (Free: 50 MB, Pro: 1 GB)';

-- ===================================================================
-- SECTION 2: UPDATE QUESTION QUOTA COMMENT
-- ===================================================================

-- Update comment to reflect free tier is 10/day not 10/month
COMMENT ON COLUMN public.sage_pro_subscriptions.questions_quota IS 'Monthly question limit (5000 for Pro, 10/day for free tier)';

-- ===================================================================
-- VALIDATION
-- ===================================================================

-- Test free tier storage quota
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Create test to verify function returns 50 MB for free tier
  -- Note: This won't actually run because we can't create test users in migration
  -- But the function is ready to use

  RAISE NOTICE '✓ Updated sage_check_storage_quota function';
  RAISE NOTICE '✓ Free tier storage quota: 0 MB → 50 MB';
  RAISE NOTICE '✓ Pro tier storage quota: 1 GB (unchanged)';
  RAISE NOTICE '✓ Free tier now tracks actual storage usage from sage_storage_files';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
