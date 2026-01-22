-- ===================================================================
-- Migration: 200_add_listing_publish_caas_trigger.sql
-- Purpose: Queue CaaS recalculation when tutor publishes a listing
-- Created: 2026-01-22
-- Author: System Architect
-- Prerequisites: listings table, caas_recalculation_queue table
-- ===================================================================
-- This trigger rewards tutors for creating active marketplace content.
-- Publishing a listing demonstrates commitment and increases platform value.
-- ===================================================================

-- Create trigger function
CREATE OR REPLACE FUNCTION public.queue_caas_for_listing_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Queue the listing owner (tutor/agent) for CaaS recalculation
  INSERT INTO public.caas_recalculation_queue (profile_id)
  VALUES (NEW.profile_id)
  ON CONFLICT (profile_id) DO NOTHING;

  RAISE NOTICE 'Queued CaaS recalculation for profile % after publishing listing %', NEW.profile_id, NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_queue_on_listing_publish ON public.listings;

-- Create trigger on listings table
CREATE TRIGGER trigger_queue_on_listing_publish
AFTER UPDATE OF status
ON public.listings
FOR EACH ROW
WHEN (NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published'))
EXECUTE FUNCTION public.queue_caas_for_listing_owner();

-- Add documentation
COMMENT ON FUNCTION public.queue_caas_for_listing_owner() IS
'Queue tutor for CaaS recalculation when they publish a listing.
Rewards tutors for creating active marketplace content.
Affects CaaS scoring buckets related to platform engagement and content quality.';

COMMENT ON TRIGGER trigger_queue_on_listing_publish ON public.listings IS
'Auto-queue CaaS recalculation when listing status changes to published.
Immediate reward for contributing to marketplace inventory.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.queue_caas_for_listing_owner() TO authenticated;

-- Verification
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
BEGIN
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'queue_caas_for_listing_owner'
    AND pronamespace = 'public'::regnamespace
  ) INTO v_function_exists;

  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trigger_queue_on_listing_publish'
  ) INTO v_trigger_exists;

  -- Report status
  IF NOT v_function_exists OR NOT v_trigger_exists THEN
    RAISE EXCEPTION 'Migration 200 failed: function=%, trigger=%', v_function_exists, v_trigger_exists;
  END IF;

  RAISE NOTICE 'Migration 200 completed successfully';
  RAISE NOTICE 'Trigger function created: %', v_function_exists;
  RAISE NOTICE 'Trigger attached to listings table: %', v_trigger_exists;
  RAISE NOTICE 'CaaS rewards for publishing listings: ACTIVE';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
