-- Migration: 249_drop_legacy_connections_table.sql
-- Purpose: Drop legacy connections table after migration to profile_graph (Network Audit)
-- Created: 2026-02-08
-- Prerequisite: Migration 062 (data migration to profile_graph completed)
--
-- CONTEXT:
-- The 'connections' table was used for network connections in v4.3-v4.5.
-- Migration 062 successfully copied all data to profile_graph (v4.6+).
-- All code now uses profile_graph with relationship_type='SOCIAL'.
-- This migration removes the legacy table to prevent confusion and reduce maintenance.
--
-- SAFETY:
-- - All data has been migrated to profile_graph
-- - No code references connections table (verified 2026-02-08)
-- - RLS policies will be dropped with CASCADE
-- - connection_status enum will be dropped (no longer used)

-- ============================================================================
-- 1. Verification: Ensure profile_graph has all connection data
-- ============================================================================

DO $$
DECLARE
  connections_count INTEGER := 0;
  profile_graph_social_count INTEGER;
BEGIN
  -- Count records in connections table (if it exists and has data)
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'connections'
  ) THEN
    SELECT COUNT(*) INTO connections_count FROM public.connections;
    RAISE NOTICE 'Found % records in legacy connections table', connections_count;
  ELSE
    RAISE NOTICE 'Legacy connections table does not exist, skipping verification';
    RETURN;
  END IF;

  -- Count SOCIAL relationships in profile_graph
  SELECT COUNT(*) INTO profile_graph_social_count
  FROM public.profile_graph
  WHERE relationship_type = 'SOCIAL';

  RAISE NOTICE 'Found % SOCIAL records in profile_graph', profile_graph_social_count;

  -- Safety check: Ensure we haven't lost data
  IF connections_count > 0 AND profile_graph_social_count < connections_count THEN
    RAISE EXCEPTION 'SAFETY CHECK FAILED: profile_graph has fewer SOCIAL records (%) than legacy connections (%). Migration may be incomplete!',
      profile_graph_social_count, connections_count;
  END IF;

  -- If we have more in profile_graph, that's fine (new connections created after migration)
  IF profile_graph_social_count >= connections_count THEN
    RAISE NOTICE 'Safety check passed: profile_graph has % SOCIAL records (>= legacy % connections)',
      profile_graph_social_count, connections_count;
  END IF;
END $$;

-- ============================================================================
-- 2. Drop legacy connections table
-- ============================================================================

-- Drop table with CASCADE to remove dependent policies, triggers, and indexes
DROP TABLE IF EXISTS public.connections CASCADE;

COMMENT ON SCHEMA public IS 'Legacy connections table dropped 2026-02-08 after migration to profile_graph (v4.6)';

-- ============================================================================
-- 3. Drop legacy connection_status enum
-- ============================================================================

-- This enum was only used by the connections table
DROP TYPE IF EXISTS connection_status CASCADE;

-- ============================================================================
-- 4. Document the change
-- ============================================================================

-- Create a marker comment to document this architectural change
COMMENT ON TABLE public.profile_graph IS 'v4.6: Unified relationship table. Consolidates Social, Guardian, and Booking links. Replaces legacy connections table (dropped 2026-02-08).';

-- ============================================================================
-- 5. Verification
-- ============================================================================

DO $$
BEGIN
  -- Verify connections table is gone
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'connections'
  ) THEN
    RAISE EXCEPTION 'Failed to drop connections table';
  END IF;

  -- Verify connection_status enum is gone
  IF EXISTS (
    SELECT FROM pg_type
    WHERE typname = 'connection_status'
  ) THEN
    RAISE EXCEPTION 'Failed to drop connection_status enum';
  END IF;

  -- Verify profile_graph still exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profile_graph'
  ) THEN
    RAISE EXCEPTION 'profile_graph table missing! Do not run this migration!';
  END IF;

  RAISE NOTICE 'Migration 249_drop_legacy_connections_table completed successfully';
  RAISE NOTICE 'Legacy connections table and connection_status enum removed';
  RAISE NOTICE 'All network connections now managed via profile_graph table';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================

-- If you need to rollback this migration:
--
-- 1. Run migration 033_create_connections_table.sql to recreate the table
-- 2. Run the following to copy data back from profile_graph:
--
--    INSERT INTO public.connections (id, requester_id, receiver_id, status, created_at, updated_at)
--    SELECT
--      id,
--      source_profile_id,
--      target_profile_id,
--      CASE status
--        WHEN 'PENDING' THEN 'pending'::connection_status
--        WHEN 'ACTIVE' THEN 'accepted'::connection_status
--        WHEN 'BLOCKED' THEN 'rejected'::connection_status
--        ELSE 'rejected'::connection_status
--      END,
--      created_at,
--      updated_at
--    FROM public.profile_graph
--    WHERE relationship_type = 'SOCIAL';
--
-- 3. Revert code changes in eligibility-resolver.ts
--
-- NOTE: This is unlikely to be needed as profile_graph is the official architecture.

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
