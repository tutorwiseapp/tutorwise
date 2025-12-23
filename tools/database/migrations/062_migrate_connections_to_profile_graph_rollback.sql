-- ===================================================================
-- Rollback Migration: 003_migrate_connections_to_profile_graph_rollback.sql
-- Purpose: Rollback the connections to profile_graph data migration
-- Created: 2025-11-12
-- Author: Senior Architect
-- ===================================================================
-- This rollback script removes all SOCIAL relationship records from
-- profile_graph that were migrated from the connections table.
-- ===================================================================

-- ===================================================================
-- SECTION 1: VALIDATION
-- ===================================================================

DO $$
BEGIN
  -- Verify profile_graph table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'profile_graph'
  ) THEN
    RAISE EXCEPTION 'Table profile_graph does not exist. Nothing to rollback.';
  END IF;

  RAISE NOTICE 'Validation passed. Starting rollback...';
END $$;

-- ===================================================================
-- SECTION 2: DELETE MIGRATED RECORDS
-- ===================================================================

-- Delete all SOCIAL records that were migrated from connections table
-- (identified by metadata field containing 'migrated_from': 'connections')
DELETE FROM public.profile_graph
WHERE relationship_type = 'SOCIAL'
AND metadata->>'migrated_from' = 'connections';

-- ===================================================================
-- SECTION 3: VERIFICATION
-- ===================================================================

DO $$
DECLARE
  remaining_social_count INTEGER;
BEGIN
  -- Count remaining SOCIAL records in profile_graph
  SELECT COUNT(*) INTO remaining_social_count
  FROM public.profile_graph
  WHERE relationship_type = 'SOCIAL';

  RAISE NOTICE 'Remaining SOCIAL records in profile_graph: %', remaining_social_count;

  IF remaining_social_count = 0 THEN
    RAISE NOTICE 'Rollback complete: All migrated SOCIAL connections removed';
  ELSE
    RAISE NOTICE 'Rollback complete: % SOCIAL records remain (not migrated from connections)', remaining_social_count;
  END IF;
END $$;

-- ===================================================================
-- END OF ROLLBACK
-- ===================================================================
