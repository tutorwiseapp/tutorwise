-- ============================================================================
-- Update Cron Jobs to Use Hardcoded CRON_SECRET
-- ============================================================================
-- File: tools/database/update-cron-jobs-hardcoded.sql
-- Purpose: Replace existing cron jobs with versions using hardcoded secrets
-- Created: 2026-02-07
-- ============================================================================

-- Remove existing jobs that use current_setting('app.cron_secret')
SELECT cron.unschedule('session-reminders-24h');
SELECT cron.unschedule('session-reminders-1h');
SELECT cron.unschedule('session-reminders-15min');
SELECT cron.unschedule('no-show-detection');

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
-- Verification
-- ============================================================================

-- List all 4 jobs to verify they were recreated
SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname IN (
  'session-reminders-24h',
  'session-reminders-1h',
  'session-reminders-15min',
  'no-show-detection'
)
ORDER BY jobname;

-- View their commands to verify hardcoded secrets
SELECT
  jobid,
  jobname,
  command
FROM cron.job
WHERE jobname IN (
  'session-reminders-24h',
  'session-reminders-1h',
  'session-reminders-15min',
  'no-show-detection'
)
ORDER BY jobname;
