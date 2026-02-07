-- ============================================================================
-- Booking Enhancements v7.0 - Supabase pg_cron Job Configuration
-- ============================================================================
-- File: tools/database/setup-cron-jobs.sql
-- Purpose: Configure automated cron jobs for booking reminders and no-show detection
-- Created: 2026-02-07
-- Production URL: https://tutorwise.vercel.app
-- ============================================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- ============================================================================
-- 1. Session Reminders - 24 Hours Before (runs hourly)
-- ============================================================================
SELECT cron.schedule(
  'session-reminders-24h',
  '0 * * * *',  -- Every hour at minute 0
  $$
  SELECT net.http_get(
    url := 'https://tutorwise.vercel.app/api/cron/session-reminders?type=24h',
    headers := jsonb_build_object(
      'Authorization', 'Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA='
    )
  );
  $$
);

-- ============================================================================
-- 2. Session Reminders - 1 Hour Before (runs every 15 minutes)
-- ============================================================================
SELECT cron.schedule(
  'session-reminders-1h',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  SELECT net.http_get(
    url := 'https://tutorwise.vercel.app/api/cron/session-reminders?type=1h',
    headers := jsonb_build_object(
      'Authorization', 'Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA='
    )
  );
  $$
);

-- ============================================================================
-- 3. Session Reminders - 15 Minutes Before (runs every 5 minutes)
-- ============================================================================
SELECT cron.schedule(
  'session-reminders-15min',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_get(
    url := 'https://tutorwise.vercel.app/api/cron/session-reminders?type=15min',
    headers := jsonb_build_object(
      'Authorization', 'Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA='
    )
  );
  $$
);

-- ============================================================================
-- 4. No-Show Detection (runs every 15 minutes)
-- ============================================================================
SELECT cron.schedule(
  'no-show-detection',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  SELECT net.http_get(
    url := 'https://tutorwise.vercel.app/api/cron/no-show-detection',
    headers := jsonb_build_object(
      'Authorization', 'Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA='
    )
  );
  $$
);

-- ============================================================================
-- Note: CRON_SECRET is hardcoded in the job definitions above
-- ============================================================================
-- Using the same approach as existing cron jobs in the database
-- Secret: sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA=
-- No need to set app.cron_secret database parameter

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- List all scheduled cron jobs
-- Run this to verify jobs were created successfully
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
ORDER BY jobname;

-- View recent cron job execution history
-- Run this to check if jobs are executing successfully
SELECT
  jobid,
  runid,
  status,
  return_message,
  start_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;

-- ============================================================================
-- Cleanup Commands (if you need to remove and recreate jobs)
-- ============================================================================

-- Uncomment these to remove existing jobs before recreating

-- SELECT cron.unschedule('session-reminders-24h');
-- SELECT cron.unschedule('session-reminders-1h');
-- SELECT cron.unschedule('session-reminders-15min');
-- SELECT cron.unschedule('no-show-detection');

-- ============================================================================
-- Manual Testing Commands
-- ============================================================================
-- After setting up cron jobs, you can manually trigger the endpoints to test:
--
-- curl -X GET "https://tutorwise.vercel.app/api/cron/session-reminders?type=24h" \
--   -H "Authorization: Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA="
--
-- curl -X GET "https://tutorwise.vercel.app/api/cron/session-reminders?type=1h" \
--   -H "Authorization: Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA="
--
-- curl -X GET "https://tutorwise.vercel.app/api/cron/session-reminders?type=15min" \
--   -H "Authorization: Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA="
--
-- curl -X GET "https://tutorwise.vercel.app/api/cron/no-show-detection" \
--   -H "Authorization: Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA="
--
-- ============================================================================

-- Expected successful response:
-- {
--   "success": true,
--   "processed": 0,
--   "message": "No reminders to send"
-- }

