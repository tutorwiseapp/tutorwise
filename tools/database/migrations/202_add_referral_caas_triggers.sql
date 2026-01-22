-- ===================================================================
-- Migration: 202_add_referral_caas_triggers.sql
-- Purpose: Queue CaaS recalculation for referral creation and conversion
-- Created: 2026-01-22
-- Author: System Architect
-- Prerequisites: referrals table, caas_recalculation_queue table
-- ===================================================================
-- This migration adds two triggers for the referral lifecycle:
-- 1. Referral Created: Immediate reward for agent making referral
-- 2. Referral Converted: Major reward when referred user completes first payment
-- ===================================================================

-- ===================================================================
-- TRIGGER 1: REFERRAL CREATED
-- ===================================================================

CREATE OR REPLACE FUNCTION public.queue_caas_for_referral_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue the agent (referrer) for CaaS recalculation
  IF NEW.agent_id IS NOT NULL THEN
    INSERT INTO public.caas_recalculation_queue (profile_id)
    VALUES (NEW.agent_id)
    ON CONFLICT (profile_id) DO NOTHING;

    RAISE NOTICE 'Queued agent % for CaaS recalculation after creating referral %', NEW.agent_id, NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_queue_on_referral_created ON public.referrals;

-- Create trigger
CREATE TRIGGER trigger_queue_on_referral_created
AFTER INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.queue_caas_for_referral_created();

-- Add documentation
COMMENT ON FUNCTION public.queue_caas_for_referral_created() IS
'Queue agent for CaaS recalculation when they create a referral.
Immediate reward for proactive networking and platform growth behavior.
Affects CaaS scoring buckets related to network growth and referral activity.';

COMMENT ON TRIGGER trigger_queue_on_referral_created ON public.referrals IS
'Auto-queue agent CaaS recalculation when new referral is created.
Rewards agents for expanding the platform network.';

-- ===================================================================
-- TRIGGER 2: REFERRAL CONVERTED (Payment Completed)
-- ===================================================================

CREATE OR REPLACE FUNCTION public.queue_caas_for_referral_conversion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when referral status changes to 'Converted'
  -- This typically happens when referred user completes first paid booking
  IF NEW.status = 'Converted' AND (OLD.status IS NULL OR OLD.status != 'Converted') THEN

    -- Queue the agent (referrer) for major CaaS boost
    IF NEW.agent_id IS NOT NULL THEN
      INSERT INTO public.caas_recalculation_queue (profile_id)
      VALUES (NEW.agent_id)
      ON CONFLICT (profile_id) DO NOTHING;

      RAISE NOTICE 'Queued agent % for CaaS boost after referral % conversion', NEW.agent_id, NEW.id;
    END IF;

    -- Queue the referred user (they're now an active platform member)
    IF NEW.referred_profile_id IS NOT NULL THEN
      INSERT INTO public.caas_recalculation_queue (profile_id)
      VALUES (NEW.referred_profile_id)
      ON CONFLICT (profile_id) DO NOTHING;

      RAISE NOTICE 'Queued referred user % for initial CaaS score after referral conversion', NEW.referred_profile_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_queue_on_referral_conversion ON public.referrals;

-- Create trigger
CREATE TRIGGER trigger_queue_on_referral_conversion
AFTER UPDATE OF status
ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.queue_caas_for_referral_conversion();

-- Add documentation
COMMENT ON FUNCTION public.queue_caas_for_referral_conversion() IS
'Queue agent and referred user for CaaS recalculation when referral converts.
Major credibility boost for agent (successful referral conversion).
Establishes initial credibility score for newly active referred user.
Affects CaaS scoring buckets for network quality and conversion success.';

COMMENT ON TRIGGER trigger_queue_on_referral_conversion ON public.referrals IS
'Auto-queue CaaS recalculation when referral status changes to Converted.
Rewards both agent (referral success) and new user (platform entry).';

-- ===================================================================
-- GRANT PERMISSIONS
-- ===================================================================

GRANT EXECUTE ON FUNCTION public.queue_caas_for_referral_created() TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_caas_for_referral_conversion() TO authenticated;

-- ===================================================================
-- VERIFICATION
-- ===================================================================

DO $$
DECLARE
  v_function_count INTEGER;
  v_trigger_count INTEGER;
BEGIN
  -- Count new functions
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc
  WHERE proname IN ('queue_caas_for_referral_created', 'queue_caas_for_referral_conversion')
  AND pronamespace = 'public'::regnamespace;

  -- Count new triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname IN ('trigger_queue_on_referral_created', 'trigger_queue_on_referral_conversion');

  -- Report status
  IF v_function_count != 2 THEN
    RAISE EXCEPTION 'Migration 202 failed: Expected 2 functions, found %', v_function_count;
  END IF;

  IF v_trigger_count != 2 THEN
    RAISE EXCEPTION 'Migration 202 failed: Expected 2 triggers, found %', v_trigger_count;
  END IF;

  RAISE NOTICE 'Migration 202 completed successfully';
  RAISE NOTICE 'Referral trigger functions created: %', v_function_count;
  RAISE NOTICE 'Referral triggers attached to referrals table: %', v_trigger_count;
  RAISE NOTICE '';
  RAISE NOTICE 'CaaS rewards for referrals: ACTIVE';
  RAISE NOTICE '  - Referral created: Immediate queue for agent';
  RAISE NOTICE '  - Referral converted: Major boost for agent + initial score for referred user';
  RAISE NOTICE '';
  RAISE NOTICE 'Complete referral lifecycle now tracked for CaaS scoring';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
