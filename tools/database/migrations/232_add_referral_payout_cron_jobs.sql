-- =====================================================
-- Migration 232: Add Referral Payout Cron Jobs
-- Created: 2025-02-05
-- Purpose: Automated commission processing and payouts
-- =====================================================
--
-- This migration adds two cron jobs:
-- 1. process-pending-commissions: Hourly job to transition Pending → Available after 7 days
-- 2. process-batch-payouts: Weekly job (Fridays 10am) to auto-payout Available commissions
-- =====================================================

-- ============================================================================
-- 1. Enable required extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================================
-- 2. Process Pending Commissions (Hourly)
-- ============================================================================
-- Runs every hour to transition Pending → Available after 7-day clearing period

-- First unschedule if exists
SELECT cron.unschedule('process-pending-commissions')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-pending-commissions');

-- Schedule new job (every hour at minute 15)
SELECT cron.schedule(
  'process-pending-commissions',
  '15 * * * *',
  $$
  SELECT net.http_get(
      url := 'https://www.tutorwise.io/api/cron/process-pending-commissions',
      headers := jsonb_build_object(
          'Authorization', 'Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA='
      )
  );
  $$
);

COMMENT ON COLUMN cron.job.jobname IS 'Hourly job to transition Pending → Available commissions after 7-day clearing period';

-- ============================================================================
-- 3. Process Batch Payouts (Weekly - Fridays at 10am)
-- ============================================================================
-- Runs every Friday at 10:00 AM UTC to auto-payout all Available commissions

-- First unschedule if exists
SELECT cron.unschedule('process-batch-payouts')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-batch-payouts');

-- Schedule new job (every Friday at 10:00 AM UTC)
SELECT cron.schedule(
  'process-batch-payouts',
  '0 10 * * 5',
  $$
  SELECT net.http_get(
      url := 'https://www.tutorwise.io/api/cron/process-batch-payouts',
      headers := jsonb_build_object(
          'Authorization', 'Bearer sAt2XrOQMxTkwm2Xs7+bYE/sOkkwSTysTctrUPdSRmA='
      )
  );
  $$
);

COMMENT ON COLUMN cron.job.jobname IS 'Weekly job to auto-payout all Available referral commissions';

-- ============================================================================
-- 4. Verify jobs were scheduled
-- ============================================================================

SELECT
  jobid,
  jobname,
  schedule,
  active
FROM cron.job
WHERE jobname IN ('process-pending-commissions', 'process-batch-payouts');

-- ============================================================================
-- Notes
-- ============================================================================
--
-- Process Pending Commissions:
-- - Runs hourly at minute 15 (0:15, 1:15, 2:15, etc.)
-- - Finds all 'clearing' status transactions older than 7 days
-- - Updates status to 'available' and sets available_at timestamp
-- - Sends email notification to user
--
-- Process Batch Payouts:
-- - Runs every Friday at 10:00 AM UTC
-- - Finds all 'available' status commission transactions
-- - Groups by profile and calculates total balance
-- - Skips profiles below £25 minimum or without Stripe Connect
-- - Creates Stripe payout for each eligible profile
-- - Updates transactions to 'paid_out' status
-- - Sends confirmation email
--
-- Monitoring:
-- SELECT * FROM cron.job_run_details WHERE jobname = 'process-pending-commissions' ORDER BY start_time DESC LIMIT 10;
-- SELECT * FROM cron.job_run_details WHERE jobname = 'process-batch-payouts' ORDER BY start_time DESC LIMIT 10;
--
-- Manual trigger:
-- curl -H "Authorization: Bearer $CRON_SECRET" https://www.tutorwise.io/api/cron/process-pending-commissions
-- curl -H "Authorization: Bearer $CRON_SECRET" https://www.tutorwise.io/api/cron/process-batch-payouts
--
-- Rollback:
-- SELECT cron.unschedule('process-pending-commissions');
-- SELECT cron.unschedule('process-batch-payouts');
