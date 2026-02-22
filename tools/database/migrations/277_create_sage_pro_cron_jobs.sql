-- ============================================================================
-- Migration: 277 - Create Sage Pro Cron Jobs
-- ============================================================================
-- Purpose: Set up automated cron jobs for Sage Pro subscription management
-- Created: 2026-02-22
--
-- Jobs:
--   1. Monthly quota reset (1st of each month at midnight UTC)
--   2. File cleanup (delete files older than 6 months, weekly on Sunday at 2am UTC)
--
-- ============================================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- Job 1: Monthly Quota Reset
-- ============================================================================
-- Runs: 1st day of each month at 00:00 UTC
-- Purpose: Reset questions_used_this_month to 0 for all active Pro subscriptions
-- ============================================================================

SELECT cron.schedule(
  'sage-pro-monthly-quota-reset',
  '0 0 1 * *', -- At midnight on the 1st day of every month
  $$
  UPDATE public.sage_pro_subscriptions
  SET
    questions_used_this_month = 0,
    last_quota_reset = NOW()
  WHERE status IN ('trialing', 'active')
  $$
);

-- ============================================================================
-- Job 2: File Cleanup (Delete files older than 6 months)
-- ============================================================================
-- Runs: Every Sunday at 02:00 UTC
-- Purpose: Delete old files from Sage storage to free up space
-- Note: Files older than 6 months (180 days) are considered stale
-- ============================================================================

SELECT cron.schedule(
  'sage-pro-file-cleanup',
  '0 2 * * 0', -- At 2am every Sunday
  $$
  WITH old_files AS (
    SELECT
      storage_path,
      user_id
    FROM public.sage_storage_files
    WHERE uploaded_at < NOW() - INTERVAL '180 days'
  ),
  deleted_from_storage AS (
    -- First, delete from Supabase Storage bucket
    -- Note: This requires storage.delete permission
    SELECT storage.delete_object('sage-uploads', storage_path)
    FROM old_files
  )
  -- Then delete database records
  DELETE FROM public.sage_storage_files
  WHERE uploaded_at < NOW() - INTERVAL '180 days'
  $$
);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify cron jobs are scheduled:
--
-- SELECT * FROM cron.job WHERE jobname LIKE 'sage-pro-%';
--
-- To manually unschedule (if needed):
-- SELECT cron.unschedule('sage-pro-monthly-quota-reset');
-- SELECT cron.unschedule('sage-pro-file-cleanup');
-- ============================================================================

COMMENT ON EXTENSION pg_cron IS 'Sage Pro subscription cron jobs scheduled';
