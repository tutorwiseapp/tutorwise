-- ===================================================================
-- Migration: 074_create_caas_scores_table.sql
-- Purpose: Create caas_scores table for Credibility as a Service (CaaS) Engine v5.5
-- Created: 2025-11-15
-- Author: Senior Architect
-- Prerequisites: profiles table exists, roles text[] column exists
-- ===================================================================
-- This migration creates the core cache table for CaaS scores.
-- The table stores calculated credibility scores (0-100) for all user roles.
-- Scores are calculated by the CaaSService and consumed by marketplace search.
-- ===================================================================

-- ===================================================================
-- SECTION 1: CREATE CAAS_SCORES TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.caas_scores (
  -- Primary key links to profiles
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- The "Headline" Score (Universal 0-100)
  total_score INTEGER NOT NULL DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),

  -- The score breakdown (Flexible JSONB for polymorphic scoring models)
  -- Example for TUTOR: {"performance": 28, "qualifications": 30, "network": 15, "safety": 10, "digital": 9}
  -- Example for CLIENT: {"responsiveness": 40, "payment_history": 50, "engagement": 10}
  score_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- The role this score was calculated for (TUTOR, CLIENT, AGENT, STUDENT)
  -- Uses text instead of enum to match profiles.roles text[] pattern
  role_type TEXT NOT NULL CHECK (role_type IN ('TUTOR', 'CLIENT', 'AGENT', 'STUDENT')),

  -- Metadata for debugging and versioning
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  calculation_version TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ===================================================================
-- SECTION 2: CREATE INDEXES FOR PERFORMANCE
-- ===================================================================

-- Critical index for marketplace search ranking (ORDER BY total_score DESC WHERE role_type = 'TUTOR')
CREATE INDEX IF NOT EXISTS idx_caas_ranking
ON public.caas_scores(role_type, total_score DESC);

-- Index for profile lookups
CREATE INDEX IF NOT EXISTS idx_caas_profile_id
ON public.caas_scores(profile_id);

-- Index for finding stale scores (for monitoring/debugging)
CREATE INDEX IF NOT EXISTS idx_caas_calculated_at
ON public.caas_scores(calculated_at DESC);

-- ===================================================================
-- SECTION 3: ROW LEVEL SECURITY POLICIES
-- ===================================================================

-- Enable RLS on the table
ALTER TABLE public.caas_scores ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own score (for dashboard widgets)
CREATE POLICY "Users can view own score"
ON public.caas_scores FOR SELECT
USING (profile_id = auth.uid());

-- Policy 2: Public can view TUTOR scores (for marketplace ranking)
CREATE POLICY "Public can view tutor scores"
ON public.caas_scores FOR SELECT
USING (role_type = 'TUTOR');

-- Policy 3: Public can view CLIENT scores (for tutor vetting - future use)
CREATE POLICY "Public can view client scores"
ON public.caas_scores FOR SELECT
USING (role_type = 'CLIENT');

-- Policy 4: Only service role can write scores (via caas-worker endpoint)
-- This prevents users from manipulating their own scores
CREATE POLICY "Service role can manage all scores"
ON public.caas_scores FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ===================================================================
-- SECTION 4: ADD DOCUMENTATION COMMENTS
-- ===================================================================

COMMENT ON TABLE public.caas_scores IS
'v5.5: Polymorphic cache table for all user Credibility as a Service (CaaS) scores.
Scores are calculated by CaaSService using different strategies per role_type.
Updated by POST /api/caas-worker (Pattern 2 - Internal Worker).
Consumed by marketplace search (ORDER BY total_score DESC).';

COMMENT ON COLUMN public.caas_scores.total_score IS
'The headline credibility score (0-100). Higher = more credible/trustworthy.';

COMMENT ON COLUMN public.caas_scores.score_breakdown IS
'JSONB breakdown showing how the total_score was calculated.
Structure varies by role_type (e.g., TUTOR has 5 buckets, CLIENT has 3).';

COMMENT ON COLUMN public.caas_scores.role_type IS
'The role this score applies to. Must match one of the values in profiles.roles text[].';

COMMENT ON COLUMN public.caas_scores.calculation_version IS
'Version string identifying which scoring algorithm was used (e.g., "tutor-v5.5", "client-v1.0").
Used for debugging and future score recalculations when algorithms change.';

-- ===================================================================
-- SECTION 5: VERIFICATION
-- ===================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  index_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Verify table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'caas_scores'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'caas_scores table was not created';
  END IF;

  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'caas_scores'
  AND schemaname = 'public';

  -- Count RLS policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'caas_scores'
  AND schemaname = 'public';

  RAISE NOTICE 'Migration 074 completed successfully';
  RAISE NOTICE 'caas_scores table created: %', table_exists;
  RAISE NOTICE 'Indexes created: %', index_count;
  RAISE NOTICE 'RLS policies created: %', policy_count;
  RAISE NOTICE 'Ready for CaaS score calculations via CaaSService';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
