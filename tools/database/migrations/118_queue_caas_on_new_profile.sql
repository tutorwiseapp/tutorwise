-- Migration: 118_queue_caas_on_new_profile.sql
-- Purpose: Queue CaaS calculation for new profiles on INSERT
-- Date: 2026-01-03
-- Issue: New users show score of 0 instead of provisional score (32 for tutors)
-- Root Cause: Migration 078 only created UPDATE triggers, not INSERT triggers
-- Fix: Add trigger to queue CaaS calculation when profile is created

BEGIN;

-- ===================================================================
-- TRIGGER: ON PROFILE INSERT (Initial CaaS Score Calculation)
-- ===================================================================
-- Queue recalculation when a new profile is created
-- This ensures new users get their provisional CaaS score immediately
-- ===================================================================

CREATE TRIGGER trigger_queue_on_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.queue_caas_recalculation();

COMMENT ON TRIGGER trigger_queue_on_profile_insert ON public.profiles IS
'v6.0.2: Auto-queue CaaS recalculation when new profile is created.
Ensures new tutors get their provisional score (30 points performance + 5 points identity gate = 32/100).
New clients get their baseline score immediately as well.';

COMMIT;

-- Verification
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname = 'trigger_queue_on_profile_insert';

  IF trigger_count != 1 THEN
    RAISE EXCEPTION 'Expected 1 trigger_queue_on_profile_insert trigger, found %', trigger_count;
  END IF;

  RAISE NOTICE 'Migration 118 completed successfully';
  RAISE NOTICE 'New profiles will now auto-queue for CaaS score calculation';
END $$;
