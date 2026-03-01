-- ============================================================================
-- Migration: 326 - Create CAS DSPy Weekly Optimization Cron Job
-- ============================================================================
-- Purpose: Schedule weekly DSPy prompt optimization via pg_cron.
--          Calls the API route which runs the optimization pipeline.
-- Created: 2026-02-28
--
-- Schedule: Every Sunday at 2am UTC
-- Pattern: Same as migration 214 (Vercel→pg_cron migration)
--
-- IMPORTANT: Update the Bearer token if CRON_SECRET changes.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule if exists (safe re-run)
SELECT cron.unschedule('cas-dspy-weekly-optimization')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cas-dspy-weekly-optimization');

-- Schedule weekly DSPy optimization (Sunday 2am UTC)
SELECT cron.schedule(
  'cas-dspy-weekly-optimization',
  '0 2 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://www.tutorwise.io/api/cron/cas-dspy-optimize',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer REPLACE_WITH_CRON_SECRET'
    ),
    body := '{}'::jsonb
  )
  $$
);

-- ============================================================================
-- Verification
-- ============================================================================
-- Check cron job is scheduled:
--   SELECT * FROM cron.job WHERE jobname = 'cas-dspy-weekly-optimization';
--
-- Check execution history:
--   SELECT * FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cas-dspy-weekly-optimization')
--   ORDER BY start_time DESC LIMIT 5;
--
-- To manually unschedule:
--   SELECT cron.unschedule('cas-dspy-weekly-optimization');
-- ============================================================================
