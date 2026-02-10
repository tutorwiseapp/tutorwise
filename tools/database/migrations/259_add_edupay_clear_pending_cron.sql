-- Migration: 259_add_edupay_clear_pending_cron.sql
-- Purpose: Schedule daily pg_cron job to transition pending EP → available after 7-day clearing period
-- Created: 2026-02-10
--
-- Schedule: Daily at 6:00 AM UTC
-- Endpoint: GET /api/cron/edupay-clear-pending
-- Auth: Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA=
-- IMPORTANT: Update the Bearer token if CRON_SECRET changes

-- ============================================================================
-- 1. Enable required extensions (safe to run multiple times)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- 2. EduPay Pending EP Clearing Cron Job (daily at 6am UTC)
-- ============================================================================
--
-- Transitions edupay_ledger rows where status='pending' AND available_at <= NOW()
-- to status='available'. Recalculates wallet balances for affected users.
-- Mirrors the 7-day clearing period used for financial transactions.

-- First unschedule if exists
SELECT cron.unschedule('edupay-clear-pending')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'edupay-clear-pending');

-- Schedule new job (daily at 6am UTC)
-- IMPORTANT: Update the Bearer token if CRON_SECRET changes
SELECT cron.schedule(
  'edupay-clear-pending',
  '0 6 * * *',
  $$
  SELECT net.http_get(
      url := 'https://www.tutorwise.io/api/cron/edupay-clear-pending',
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
WHERE jobname = 'edupay-clear-pending';

-- ============================================================================
-- Notes
-- ============================================================================
--
-- The cron job runs daily at 6am UTC to clear pending EP entries.
-- This is the same clearing period (7 days) used for financial transactions.
--
-- The job calls clear_pending_ep() RPC which:
-- - Finds edupay_ledger rows where status='pending' AND available_at <= NOW()
-- - Updates status to 'available'
-- - Recalculates edupay_wallets available_ep and pending_ep for affected users
-- - Returns count of cleared entries
--
-- To manually trigger:
-- curl -H "Authorization: Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA=" https://www.tutorwise.io/api/cron/edupay-clear-pending
--
-- Monitoring:
-- SELECT * FROM cron.job_run_details WHERE jobname = 'edupay-clear-pending' ORDER BY start_time DESC LIMIT 10;
--
-- Rollback:
-- SELECT cron.unschedule('edupay-clear-pending');
