-- Migration 220: Add Slot Cleanup Cron Job
-- Purpose: Clean up expired slot reservations for booking scheduling
-- Created: 2026-02-05
--
-- Part of the 5-stage booking workflow: Discover > Book > Schedule > Pay > Review
--
-- This migration creates a pg_cron job that runs every 5 minutes to:
-- 1. Reset bookings with expired slot reservations back to 'unscheduled'
-- 2. Clear the proposed time and proposer info
--
-- Slot reservations expire after 15 minutes (configurable in scheduling rules)

-- ============================================================================
-- 1. Create the cleanup function
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_slot_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  -- Reset bookings where slot reservation has expired
  -- Only affects bookings in 'proposed' state with expired slot_reserved_until
  UPDATE bookings
  SET
    scheduling_status = 'unscheduled',
    session_start_time = NULL,
    proposed_by = NULL,
    proposed_at = NULL,
    slot_reserved_until = NULL,
    updated_at = NOW()
  WHERE
    scheduling_status = 'proposed'
    AND slot_reserved_until IS NOT NULL
    AND slot_reserved_until < NOW();

  GET DIAGNOSTICS cleaned_count = ROW_COUNT;

  -- Log if any bookings were cleaned up
  IF cleaned_count > 0 THEN
    RAISE NOTICE '[Slot Cleanup] Reset % booking(s) with expired slot reservations', cleaned_count;
  END IF;

  RETURN cleaned_count;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_slot_reservations IS
  'Resets bookings with expired slot reservations (15 min hold) back to unscheduled state';

-- ============================================================================
-- 2. Schedule the cron job (every 5 minutes)
-- ============================================================================

-- Enable extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- First unschedule if exists
SELECT cron.unschedule('cleanup-expired-slot-reservations')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-expired-slot-reservations');

-- Schedule new job (every 5 minutes)
SELECT cron.schedule(
  'cleanup-expired-slot-reservations',
  '*/5 * * * *',
  $$SELECT cleanup_expired_slot_reservations();$$
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
WHERE jobname = 'cleanup-expired-slot-reservations';

-- ============================================================================
-- Notes
-- ============================================================================
--
-- The cron job runs every 5 minutes and directly executes the cleanup function.
-- No HTTP endpoint needed since the logic is entirely in the database.
--
-- Manual execution:
-- SELECT cleanup_expired_slot_reservations();
--
-- Monitoring:
-- SELECT * FROM cron.job_run_details WHERE jobname = 'cleanup-expired-slot-reservations' ORDER BY start_time DESC LIMIT 10;
--
-- To check expired reservations without cleaning:
-- SELECT id, scheduling_status, session_start_time, proposed_by, slot_reserved_until
-- FROM bookings
-- WHERE scheduling_status = 'proposed' AND slot_reserved_until < NOW();
--
-- Rollback:
-- SELECT cron.unschedule('cleanup-expired-slot-reservations');
-- DROP FUNCTION IF EXISTS cleanup_expired_slot_reservations();
