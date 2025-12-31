-- Migration: Setup pg_cron for Network Trust Metrics Refresh
-- Created: 2025-12-31
-- Purpose: Schedule daily refresh of network_trust_metrics materialized view
-- Phase: Trust-First SEO - Phase 3.1 Enhancement

-- ============================================================================
-- 1. Enable pg_cron extension (if not already enabled)
-- ============================================================================

-- Note: On Supabase, pg_cron is pre-installed but may need to be enabled
-- This is safe to run multiple times (IF NOT EXISTS)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 2. Schedule daily network trust metrics refresh
-- ============================================================================

-- Schedule: Daily at 2:00 AM UTC
-- Frequency: Once per day (network metrics don't change minute-to-minute)
-- Function: refresh_network_trust_metrics() (created in migration 153)

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  -- Check if job already exists (avoid duplicates)
  SELECT jobid INTO v_job_id
  FROM cron.job
  WHERE jobname = 'refresh-network-trust-metrics';

  IF v_job_id IS NOT NULL THEN
    -- Job already exists, unschedule it first
    PERFORM cron.unschedule(v_job_id);
    RAISE NOTICE 'Existing job found (ID: %), unscheduled', v_job_id;
  END IF;

  -- Schedule new job
  PERFORM cron.schedule(
    'refresh-network-trust-metrics',     -- Job name (unique identifier)
    '0 2 * * *',                         -- Cron expression: Daily at 2:00 AM UTC
    'SELECT refresh_network_trust_metrics();' -- SQL command to execute
  );

  RAISE NOTICE 'Scheduled daily network trust metrics refresh at 2:00 AM UTC';
END;
$$;

-- ============================================================================
-- 3. Verify job was scheduled
-- ============================================================================

-- Query to verify the cron job is active
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active,
  database
FROM cron.job
WHERE jobname = 'refresh-network-trust-metrics';

-- ============================================================================
-- 4. Manual refresh trigger (for testing)
-- ============================================================================

-- Run an immediate refresh to test the setup
SELECT refresh_network_trust_metrics();

-- ============================================================================
-- Notes for Supabase Setup
-- ============================================================================

-- IMPORTANT: Supabase has pg_cron pre-installed, but you may need to:
-- 1. Ensure the database timezone is set correctly (UTC recommended)
-- 2. Check that pg_cron is enabled in your Supabase project
-- 3. Monitor job execution in cron.job_run_details table

-- To view job execution history:
-- SELECT * FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-network-trust-metrics')
-- ORDER BY start_time DESC LIMIT 10;

-- To manually trigger the job (for testing):
-- SELECT refresh_network_trust_metrics();

-- To unschedule the job (if needed):
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'refresh-network-trust-metrics';

-- ============================================================================
-- Performance Monitoring
-- ============================================================================

-- The materialized view refresh should complete in <1 second for 10K users
-- Monitor performance with:
-- SELECT
--   start_time,
--   end_time,
--   end_time - start_time as duration,
--   status,
--   return_message
-- FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-network-trust-metrics')
-- ORDER BY start_time DESC
-- LIMIT 5;

RAISE NOTICE 'pg_cron setup completed successfully for network trust metrics';
