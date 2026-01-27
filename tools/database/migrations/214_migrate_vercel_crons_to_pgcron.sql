-- Migration: Migrate Vercel Crons to Supabase pg_cron
-- Purpose: Consolidate all scheduled jobs in Supabase pg_cron for unified management
-- Created: 2025-01-27
-- Applied: 2025-01-27
--
-- This migration moves two Vercel cron jobs to Supabase pg_cron:
-- 1. Referral email queue processing (every 5 minutes)
-- 2. Admin notifications processing (daily at 9am UTC)
--
-- Benefits:
-- - Single source of truth for all scheduled jobs
-- - Better monitoring via cron.job_run_details
-- - No dependency on Vercel infrastructure for scheduling
-- - Consistent with existing SEO and stats cron jobs
--
-- Note: The CRON_SECRET is hardcoded in the cron job commands because
-- Supabase restricts access to both vault.secrets and ALTER DATABASE
-- for setting app.* parameters. The secret is stored securely in the
-- database and only accessible to database administrators.

-- ============================================================================
-- 1. Enable required extensions (safe to run multiple times)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- 2. Referral Email Queue Processing (every 5 minutes)
-- ============================================================================
--
-- Processes pending emails from referral_email_queue table
-- Templates: new_referral, stage_change, commission_earned, achievement_unlocked
-- Endpoint: POST /api/referrals/process-email-queue

-- First unschedule if exists
SELECT cron.unschedule('process-referral-email-queue')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-referral-email-queue');

-- Schedule new job (every 5 minutes)
-- IMPORTANT: Update the Bearer token if CRON_SECRET changes
SELECT cron.schedule(
  'process-referral-email-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
      url := 'https://www.tutorwise.io/api/referrals/process-email-queue',
      headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA='
      ),
      body := '{}'::jsonb
  );
  $$
);

-- ============================================================================
-- 3. Admin Notifications Processing (daily at 9am UTC)
-- ============================================================================
--
-- Processes pending admin activity notifications
-- Templates: admin_granted, admin_role_changed, admin_revoked
-- Endpoint: GET /api/admin/notifications/process

-- First unschedule if exists
SELECT cron.unschedule('process-admin-notifications')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-admin-notifications');

-- Schedule new job (daily at 9am UTC)
-- IMPORTANT: Update the Bearer token if CRON_SECRET changes
SELECT cron.schedule(
  'process-admin-notifications',
  '0 9 * * *',
  $$
  SELECT net.http_get(
      url := 'https://www.tutorwise.io/api/admin/notifications/process',
      headers := jsonb_build_object(
          'Authorization', 'Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA='
      )
  );
  $$
);

-- ============================================================================
-- 4. Verify jobs were scheduled
-- ============================================================================

SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname IN ('process-referral-email-queue', 'process-admin-notifications');

-- ============================================================================
-- 5. Show all cron jobs for reference
-- ============================================================================

SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
ORDER BY jobid;

-- ============================================================================
-- Notes
-- ============================================================================
--
-- Security:
-- - The CRON_SECRET is hardcoded because Supabase restricts vault and
--   ALTER DATABASE access even from the Dashboard SQL Editor
-- - The secret is only visible to database administrators
-- - If you need to rotate the secret:
--   1. Update CRON_SECRET in Vercel environment variables
--   2. Update the Bearer tokens in these cron jobs
--   3. Update .env.local for local development
--
-- Removed from Vercel:
-- - apps/web/vercel.json (referral queue cron removed)
-- - vercel.json (admin notifications cron removed)
--
-- Monitoring:
-- - View all email cron jobs:
--   SELECT * FROM cron.job WHERE jobname LIKE 'process-%';
-- - View execution history:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- Rollback:
-- SELECT cron.unschedule('process-referral-email-queue');
-- SELECT cron.unschedule('process-admin-notifications');
-- Then restore vercel.json cron configurations
