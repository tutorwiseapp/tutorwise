-- Migration: Add Session Reminder Infrastructure
-- Purpose: Add reminder tracking column and pg_cron job for 24-hour session reminders
-- Created: 2025-01-27
--
-- This migration:
-- 1. Adds reminder_sent_at column to bookings table
-- 2. Creates pg_cron job to run hourly and trigger reminder emails

-- ============================================================================
-- 1. Add reminder tracking column to bookings
-- ============================================================================

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN bookings.reminder_sent_at IS 'Timestamp when 24-hour reminder email was sent';

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_pending
ON bookings (session_start_time)
WHERE status = 'Confirmed' AND reminder_sent_at IS NULL;

-- ============================================================================
-- 2. Session Reminder Cron Job (hourly)
-- ============================================================================
--
-- Runs every hour to send 24-hour reminders for upcoming sessions
-- Endpoint: GET /api/cron/session-reminders

-- Enable extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- First unschedule if exists
SELECT cron.unschedule('send-session-reminders')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-session-reminders');

-- Schedule new job (every hour at minute 0)
-- IMPORTANT: Update the Bearer token if CRON_SECRET changes
SELECT cron.schedule(
  'send-session-reminders',
  '0 * * * *',
  $$
  SELECT net.http_get(
      url := 'https://www.tutorwise.io/api/cron/session-reminders',
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
WHERE jobname = 'send-session-reminders';

-- ============================================================================
-- Notes
-- ============================================================================
--
-- The cron job runs hourly and checks for sessions starting in 23-25 hours.
-- This 2-hour window ensures no sessions are missed even if cron runs late.
--
-- To manually trigger:
-- curl -H "Authorization: Bearer $CRON_SECRET" https://www.tutorwise.io/api/cron/session-reminders
--
-- Monitoring:
-- SELECT * FROM cron.job_run_details WHERE jobname = 'send-session-reminders' ORDER BY start_time DESC LIMIT 10;
--
-- Rollback:
-- SELECT cron.unschedule('send-session-reminders');
-- ALTER TABLE bookings DROP COLUMN IF EXISTS reminder_sent_at;
