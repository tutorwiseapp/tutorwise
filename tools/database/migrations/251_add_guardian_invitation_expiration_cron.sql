-- Migration: Add Guardian Invitation Expiration Cron Job
-- Purpose: Schedule daily job to expire old guardian invitations
-- Created: 2026-02-08
--
-- This migration schedules a pg_cron job that runs daily at 3am UTC
-- to mark expired guardian invitation tokens as 'expired'

-- ============================================================================
-- 1. Enable required extensions (safe to run multiple times)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- 2. Guardian Invitation Expiration Cron Job (daily at 3am UTC)
-- ============================================================================
--
-- Expires pending invitations past their expiration date
-- Endpoint: GET /api/cron/expire-invitations

-- First unschedule if exists
SELECT cron.unschedule('expire-guardian-invitations')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-guardian-invitations');

-- Schedule new job (daily at 3am UTC)
-- IMPORTANT: Update the Bearer token if CRON_SECRET changes
SELECT cron.schedule(
  'expire-guardian-invitations',
  '0 3 * * *',
  $$
  SELECT net.http_get(
      url := 'https://www.tutorwise.io/api/cron/expire-invitations',
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
WHERE jobname = 'expire-guardian-invitations';

-- ============================================================================
-- Notes
-- ============================================================================
--
-- The cron job runs daily at 3am UTC to expire old invitation tokens.
-- This prevents stale tokens from accumulating in the database.
--
-- The job calls expire_old_guardian_invitations() function which:
-- - Finds all 'pending' invitations with expires_at < NOW()
-- - Updates their status to 'expired'
-- - Returns count of expired invitations
--
-- To manually trigger:
-- curl -H "Authorization: Bearer $CRON_SECRET" https://www.tutorwise.io/api/cron/expire-invitations
--
-- Monitoring:
-- SELECT * FROM cron.job_run_details WHERE jobname = 'expire-guardian-invitations' ORDER BY start_time DESC LIMIT 10;
--
-- Rollback:
-- SELECT cron.unschedule('expire-guardian-invitations');
