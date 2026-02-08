-- Migration: 248_add_profile_graph_admin_policy.sql
-- Purpose: Add admin SELECT policy for profile_graph table (Network Audit Fix #2)
-- Created: 2026-02-08
-- Issue: Admins could not view all relationships for support/moderation
--
-- This migration adds a policy allowing admin users to view all profile_graph
-- relationships for support, moderation, and debugging purposes.

-- ============================================================================
-- 1. Add Admin SELECT Policy
-- ============================================================================

-- Policy: Admins can view all relationships
-- Use case: Support teams need to investigate abuse, spam, or connection issues
CREATE POLICY "Admins can view all relationships"
  ON public.profile_graph FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

COMMENT ON POLICY "Admins can view all relationships" ON public.profile_graph
  IS 'Allows admin users to view all profile_graph relationships for support and moderation';

-- ============================================================================
-- 2. Verification
-- ============================================================================

-- Verify policy was created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profile_graph'
      AND policyname = 'Admins can view all relationships'
  ) THEN
    RAISE EXCEPTION 'Admin policy was not created successfully';
  END IF;

  RAISE NOTICE 'Migration 248_add_profile_graph_admin_policy completed successfully';
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
