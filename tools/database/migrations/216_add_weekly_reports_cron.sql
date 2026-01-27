-- Migration: Add Weekly Reports Cron Job
-- Purpose: Schedule weekly report emails for tutors and agents
-- Created: 2025-01-27
--
-- Sends weekly activity summaries every Monday at 8am UTC:
-- - Tutors: Booking stats, earnings, profile views
-- - Agents: Referral stats, commission earned

-- ============================================================================
-- 1. Enable required extensions (safe to run multiple times)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- 2. Weekly Reports Cron Job (Monday 8am UTC)
-- ============================================================================
--
-- Sends weekly activity reports to tutors and agents
-- Endpoint: GET /api/cron/weekly-reports

-- First unschedule if exists
SELECT cron.unschedule('send-weekly-reports')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-weekly-reports');

-- Schedule new job (Monday at 8am UTC)
-- IMPORTANT: Update the Bearer token if CRON_SECRET changes
SELECT cron.schedule(
  'send-weekly-reports',
  '0 8 * * 1',
  $$
  SELECT net.http_get(
      url := 'https://www.tutorwise.io/api/cron/weekly-reports',
      headers := jsonb_build_object(
          'Authorization', 'Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA='
      )
  );
  $$
);

-- ============================================================================
-- 3. Verify job was scheduled
-- ============================================================================

SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname = 'send-weekly-reports';

-- ============================================================================
-- Notes
-- ============================================================================
--
-- The cron job runs every Monday at 8am UTC.
-- Reports cover the previous week (Monday to Sunday).
--
-- To manually trigger:
-- curl -H "Authorization: Bearer $CRON_SECRET" https://www.tutorwise.io/api/cron/weekly-reports
--
-- Monitoring:
-- SELECT * FROM cron.job_run_details WHERE jobname = 'send-weekly-reports' ORDER BY start_time DESC LIMIT 10;
--
-- Rollback:
-- SELECT cron.unschedule('send-weekly-reports');
