-- ===================================================================
-- Migration: 173_add_public_agent_caas_policy.sql
-- Purpose: Make Agent CaaS scores publicly viewable
-- Created: 2026-01-14
-- Author: Senior Architect
-- Prerequisites: Migration 074 (caas_scores table exists)
-- ===================================================================
-- This migration adds a public read policy for AGENT role_type scores
-- to align with the platform goal of making all CaaS scores public.
-- ===================================================================

-- ===================================================================
-- SECTION 1: ADD PUBLIC VIEW POLICY FOR AGENT SCORES
-- ===================================================================

-- Policy: Public can view AGENT scores (marketplace transparency)
CREATE POLICY IF NOT EXISTS "Public can view agent scores"
ON public.caas_scores FOR SELECT
USING (role_type = 'AGENT');

-- ===================================================================
-- SECTION 2: ADD DOCUMENTATION COMMENT
-- ===================================================================

COMMENT ON POLICY "Public can view agent scores" ON public.caas_scores IS
'Allows public viewing of Agent CaaS scores for marketplace transparency.
All CaaS scores (TUTOR, CLIENT, AGENT) are now publicly viewable.
Organisation scores are public via connection_groups.caas_score column.';

-- ===================================================================
-- SECTION 3: VERIFICATION
-- ===================================================================

DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  -- Verify policy was created
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'caas_scores'
    AND policyname = 'Public can view agent scores'
  ) INTO policy_exists;

  IF NOT policy_exists THEN
    RAISE EXCEPTION 'Agent CaaS public view policy was not created';
  END IF;

  RAISE NOTICE 'Migration 173 completed successfully';
  RAISE NOTICE 'Agent CaaS scores are now publicly viewable';
  RAISE NOTICE 'All CaaS scores (TUTOR/CLIENT/AGENT/ORGANISATION) are public';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
