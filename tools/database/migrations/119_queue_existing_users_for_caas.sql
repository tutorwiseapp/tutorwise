-- Migration: 119_queue_existing_users_for_caas.sql
-- Purpose: Queue all existing users with NULL or 0 CaaS scores for recalculation
-- Date: 2026-01-03
-- Issue: Existing users created before migration 118 still show score of 0
-- Solution: Manually queue all profiles with NULL/0 scores for initial calculation

BEGIN;

-- Queue all profiles with NULL or 0 CaaS scores
-- This catches:
-- 1. New users created before migration 118 (INSERT trigger)
-- 2. Existing users who never got their score calculated
-- 3. Any users with corrupted/reset scores

INSERT INTO public.caas_recalculation_queue (profile_id)
SELECT id
FROM public.profiles
WHERE caas_score IS NULL OR caas_score = 0
ON CONFLICT (profile_id) DO NOTHING;

COMMIT;

-- Report how many users were queued
DO $$
DECLARE
  queued_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO queued_count
  FROM public.caas_recalculation_queue;

  RAISE NOTICE 'Migration 119 completed successfully';
  RAISE NOTICE 'Queued % profiles for CaaS score calculation', queued_count;
  RAISE NOTICE 'Run the CaaS worker (/api/caas-worker) to process the queue';
END $$;
