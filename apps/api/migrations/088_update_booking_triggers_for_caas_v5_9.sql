-- ===================================================================
-- Migration: 088_update_booking_triggers_for_caas_v5_9.sql
-- Purpose: Add trigger to queue CaaS recalculation for completed free help sessions
-- Created: 2025-11-16
-- Author: Senior Architect
-- Prerequisites: bookings table with 'type' column, caas_recalculation_queue table
-- ===================================================================
-- This trigger ensures tutors are "paid" with CaaS points when they complete
-- a free help session. The CaaS engine will award significant points for
-- community contribution.
-- ===================================================================

-- Create or replace trigger function
CREATE OR REPLACE FUNCTION queue_caas_for_completed_free_help()
RETURNS TRIGGER AS $$
BEGIN
  -- Only queue if this is a free_help booking being marked as Completed
  IF NEW.type = 'free_help'
     AND NEW.status = 'Completed'
     AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN

    -- Insert tutor into CaaS recalculation queue
    INSERT INTO public.caas_recalculation_queue (
      profile_id,
      priority,
      reason,
      created_at
    )
    VALUES (
      NEW.tutor_id,
      'high', -- High priority for immediate reputation reward
      'free_help_session_completed',
      NOW()
    )
    ON CONFLICT (profile_id)
    DO UPDATE SET
      priority = CASE
        WHEN caas_recalculation_queue.priority = 'urgent' THEN 'urgent'
        ELSE 'high'
      END,
      reason = 'free_help_session_completed',
      updated_at = NOW();

    RAISE NOTICE 'Queued CaaS recalculation for tutor % after free help session completion', NEW.tutor_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_queue_caas_for_free_help ON public.bookings;

-- Create trigger on bookings table
CREATE TRIGGER trigger_queue_caas_for_free_help
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION queue_caas_for_completed_free_help();

COMMENT ON FUNCTION queue_caas_for_completed_free_help() IS
'v5.9: Automatically queues tutor for CaaS recalculation when they complete a free help session.
This is how tutors are "paid" in reputation for volunteering their time.';

-- Validation
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
BEGIN
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'queue_caas_for_completed_free_help'
  ) INTO v_function_exists;

  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trigger_queue_caas_for_free_help'
  ) INTO v_trigger_exists;

  -- Report status
  RAISE NOTICE 'Migration 088 completed successfully';
  RAISE NOTICE 'Trigger function created: %', v_function_exists;
  RAISE NOTICE 'Trigger attached to bookings table: %', v_trigger_exists;
  RAISE NOTICE 'CaaS rewards for free help sessions: ACTIVE';
  RAISE NOTICE 'Tutors will receive reputation boost for community service (v5.9)';
END $$;
