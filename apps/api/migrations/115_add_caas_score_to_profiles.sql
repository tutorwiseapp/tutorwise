-- Migration 115: Add caas_score Column to Profiles Table
-- Purpose: Denormalize CaaS score from caas_scores table to profiles for simplified queries
-- Author: CaaS v5.5 Architecture Simplification
-- Date: 2025-12-15
--
-- Background:
-- Previously, CaaS scores were stored only in the caas_scores table and required
-- JOINs to display. This migration adds caas_score directly to profiles for:
-- 1. Simplified profile queries (no JOIN needed)
-- 2. Faster marketplace ranking (direct ORDER BY)
-- 3. Better client-side caching
-- 4. Reduced code complexity
--
-- The caas_scores table is retained for:
-- - Audit trail of score changes
-- - Detailed score breakdown (JSONB)
-- - Multiple scores per user (different role_types)
-- - Historical analysis

-- ==================================================================
-- STEP 1: Add caas_score Column
-- ==================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS caas_score INTEGER DEFAULT 0 NOT NULL;

COMMENT ON COLUMN public.profiles.caas_score IS
'Current CaaS (Credibility as a Service) score. Synced from caas_scores.total_score via trigger. Represents the most recent score for the user''s active role.';

-- ==================================================================
-- STEP 2: Create Index for Marketplace Ranking
-- ==================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_caas_score
ON public.profiles(caas_score DESC);

COMMENT ON INDEX public.idx_profiles_caas_score IS
'Optimizes marketplace searches that rank tutors by credibility score';

-- ==================================================================
-- STEP 3: Backfill Existing Scores
-- ==================================================================

-- Update profiles with their current CaaS scores from caas_scores table
-- Uses the most recent score for each profile
UPDATE public.profiles p
SET caas_score = cs.total_score
FROM public.caas_scores cs
WHERE p.id = cs.profile_id;

-- ==================================================================
-- STEP 4: Create Sync Trigger Function
-- ==================================================================

CREATE OR REPLACE FUNCTION public.sync_caas_score_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- When a CaaS score is inserted or updated, sync it to the profiles table
  UPDATE public.profiles
  SET caas_score = NEW.total_score
  WHERE id = NEW.profile_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.sync_caas_score_to_profile IS
'Automatically syncs CaaS scores from caas_scores table to profiles.caas_score column. Triggered on INSERT or UPDATE of caas_scores.';

-- ==================================================================
-- STEP 5: Create Trigger
-- ==================================================================

DROP TRIGGER IF EXISTS sync_caas_score_on_change ON public.caas_scores;

CREATE TRIGGER sync_caas_score_on_change
AFTER INSERT OR UPDATE OF total_score ON public.caas_scores
FOR EACH ROW
EXECUTE FUNCTION public.sync_caas_score_to_profile();

COMMENT ON TRIGGER sync_caas_score_on_change ON public.caas_scores IS
'Keeps profiles.caas_score in sync with caas_scores.total_score';

-- ==================================================================
-- VERIFICATION QUERIES
-- ==================================================================

-- Uncomment to verify the migration worked:

-- 1. Check column was added
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'caas_score';

-- 2. Check index was created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'profiles' AND indexname = 'idx_profiles_caas_score';

-- 3. Verify scores were backfilled (should show matching counts)
-- SELECT
--   (SELECT COUNT(*) FROM caas_scores) as caas_scores_count,
--   (SELECT COUNT(*) FROM profiles WHERE caas_score > 0) as profiles_with_scores;

-- 4. Check trigger was created
-- SELECT trigger_name, event_manipulation, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name = 'sync_caas_score_on_change';

-- 5. Verify scores match between tables
-- SELECT
--   p.full_name,
--   p.caas_score as profile_score,
--   cs.total_score as caas_table_score,
--   CASE WHEN p.caas_score = cs.total_score THEN '✓ MATCH' ELSE '✗ MISMATCH' END as status
-- FROM profiles p
-- JOIN caas_scores cs ON p.id = cs.profile_id
-- WHERE p.roles && ARRAY['tutor']::text[]
-- ORDER BY p.full_name;
