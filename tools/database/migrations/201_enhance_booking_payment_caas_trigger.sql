-- ===================================================================
-- Migration: 201_enhance_booking_payment_caas_trigger.sql
-- Purpose: Enhanced trigger for booking completion + payment (queues all parties)
-- Created: 2026-01-22
-- Author: System Architect
-- Prerequisites: bookings table, listings table, caas_recalculation_queue table
-- ===================================================================
-- This migration enhances the existing booking trigger to:
-- 1. Check BOTH status='Completed' AND payment_status='Completed'
-- 2. Queue all involved parties: tutor, client, and agent (if referral)
-- 3. Handle both listing-based and direct profile bookings
-- ===================================================================

-- Drop old trigger if exists (from migration 078)
DROP TRIGGER IF EXISTS trigger_queue_on_booking_completion ON public.bookings;

-- Create enhanced trigger function
CREATE OR REPLACE FUNCTION public.queue_caas_for_booking_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_tutor_id UUID;
  v_client_id UUID;
  v_agent_id UUID;
BEGIN
  -- Only trigger when BOTH booking status AND payment status are Completed
  -- This ensures payment transaction has been processed
  IF NEW.status = 'Completed'
     AND NEW.payment_status = 'Completed'
     AND (OLD.status IS NULL OR OLD.status != 'Completed' OR OLD.payment_status IS NULL OR OLD.payment_status != 'Completed') THEN

    -- Get tutor ID
    IF NEW.listing_id IS NOT NULL THEN
      -- For listing-based bookings, get tutor from listing owner
      SELECT l.profile_id INTO v_tutor_id
      FROM public.listings l
      WHERE l.id = NEW.listing_id;
    ELSE
      -- For direct profile bookings, use tutor_id directly
      v_tutor_id := NEW.tutor_id;
    END IF;

    v_client_id := NEW.client_id;
    v_agent_id := NEW.agent_id;

    -- Queue tutor for CaaS recalculation (service delivery reward)
    IF v_tutor_id IS NOT NULL THEN
      INSERT INTO public.caas_recalculation_queue (profile_id)
      VALUES (v_tutor_id)
      ON CONFLICT (profile_id) DO NOTHING;

      RAISE NOTICE 'Queued tutor % for CaaS recalculation after booking % completion', v_tutor_id, NEW.id;
    END IF;

    -- Queue client for CaaS recalculation (platform engagement reward)
    IF v_client_id IS NOT NULL THEN
      INSERT INTO public.caas_recalculation_queue (profile_id)
      VALUES (v_client_id)
      ON CONFLICT (profile_id) DO NOTHING;

      RAISE NOTICE 'Queued client % for CaaS recalculation after booking % completion', v_client_id, NEW.id;
    END IF;

    -- Queue agent if this was a referred booking (referral conversion reward)
    IF v_agent_id IS NOT NULL THEN
      INSERT INTO public.caas_recalculation_queue (profile_id)
      VALUES (v_agent_id)
      ON CONFLICT (profile_id) DO NOTHING;

      RAISE NOTICE 'Queued agent % for CaaS recalculation after referred booking % completion', v_agent_id, NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create enhanced trigger
CREATE TRIGGER trigger_queue_on_booking_payment
AFTER UPDATE OF status, payment_status
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.queue_caas_for_booking_payment();

-- Add documentation
COMMENT ON FUNCTION public.queue_caas_for_booking_payment() IS
'Enhanced CaaS trigger for booking completion.
Queues tutor, client, and agent (if applicable) when BOTH booking status AND payment complete.
Rewards all parties:
- Tutor: Service delivery credibility
- Client: Platform engagement credibility
- Agent: Successful referral conversion credibility';

COMMENT ON TRIGGER trigger_queue_on_booking_payment ON public.bookings IS
'Auto-queue CaaS recalculation for all booking parties when booking AND payment complete.
Replaces trigger_queue_on_booking_completion from migration 078.
Now requires payment_status=Completed in addition to status=Completed.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.queue_caas_for_booking_payment() TO authenticated;

-- Verification
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
  v_old_trigger_exists BOOLEAN;
BEGIN
  -- Check if new function exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'queue_caas_for_booking_payment'
    AND pronamespace = 'public'::regnamespace
  ) INTO v_function_exists;

  -- Check if new trigger exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trigger_queue_on_booking_payment'
  ) INTO v_trigger_exists;

  -- Check if old trigger was removed
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trigger_queue_on_booking_completion'
  ) INTO v_old_trigger_exists;

  -- Report status
  IF NOT v_function_exists OR NOT v_trigger_exists THEN
    RAISE EXCEPTION 'Migration 201 failed: function=%, trigger=%', v_function_exists, v_trigger_exists;
  END IF;

  IF v_old_trigger_exists THEN
    RAISE WARNING 'Old trigger trigger_queue_on_booking_completion still exists (expected removed)';
  END IF;

  RAISE NOTICE 'Migration 201 completed successfully';
  RAISE NOTICE 'Enhanced trigger function created: %', v_function_exists;
  RAISE NOTICE 'Enhanced trigger attached to bookings table: %', v_trigger_exists;
  RAISE NOTICE 'Old trigger removed: %', NOT v_old_trigger_exists;
  RAISE NOTICE 'CaaS rewards for completed bookings: ENHANCED';
  RAISE NOTICE 'Now requires BOTH status=Completed AND payment_status=Completed';
  RAISE NOTICE 'Queues all parties: tutor, client, agent (if referral)';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
