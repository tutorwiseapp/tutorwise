-- ===================================================================
-- Rollback Migration: 002_add_profile_graph_v4_6_rollback.sql
-- Purpose: Safely rollback the Unified Profile Graph Architecture (v4.6)
-- Created: 2025-11-12
-- Author: Senior Architect
-- ===================================================================
-- This rollback script removes all objects created by 002_add_profile_graph_v4_6.sql
-- ===================================================================

-- ===================================================================
-- SECTION 1: DROP TRIGGERS
-- ===================================================================

DROP TRIGGER IF EXISTS update_profile_graph_updated_at ON public.profile_graph;

-- ===================================================================
-- SECTION 2: DROP TABLE (CASCADE to remove constraints/indexes)
-- ===================================================================

DROP TABLE IF EXISTS public.profile_graph CASCADE;

-- ===================================================================
-- SECTION 3: DROP HELPER FUNCTION
-- ===================================================================

-- Note: We're checking if the function is still used by other tables before dropping
DO $$
BEGIN
  -- Only drop if no other triggers are using this function
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
    AND trigger_name LIKE '%update_updated_at%'
  ) THEN
    DROP FUNCTION IF EXISTS public.update_updated_at_column();
    RAISE NOTICE 'Dropped function update_updated_at_column()';
  ELSE
    RAISE NOTICE 'Function update_updated_at_column() is still in use by other tables - not dropped';
  END IF;
END $$;

-- ===================================================================
-- SECTION 4: DROP ENUM TYPES
-- ===================================================================

DROP TYPE IF EXISTS relationship_status CASCADE;
DROP TYPE IF EXISTS relationship_type CASCADE;

-- ===================================================================
-- SECTION 5: VERIFICATION
-- ===================================================================

DO $$
BEGIN
  -- Verify table was dropped
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'profile_graph'
  ) THEN
    RAISE EXCEPTION 'Table profile_graph still exists after rollback';
  END IF;

  -- Verify enums were dropped
  IF EXISTS (
    SELECT FROM pg_type
    WHERE typname = 'relationship_type'
  ) THEN
    RAISE EXCEPTION 'Enum relationship_type still exists after rollback';
  END IF;

  IF EXISTS (
    SELECT FROM pg_type
    WHERE typname = 'relationship_status'
  ) THEN
    RAISE EXCEPTION 'Enum relationship_status still exists after rollback';
  END IF;

  RAISE NOTICE 'Rollback 002_add_profile_graph_v4_6 completed successfully';
END $$;

-- ===================================================================
-- END OF ROLLBACK
-- ===================================================================
