-- ===================================================================
-- Migration: 062_migrate_connections_to_profile_graph.sql
-- Purpose: Migrate existing connections data to the new profile_graph table
-- Created: 2025-11-12
-- Author: Senior Architect
-- Prerequisites: 061_add_profile_graph_v4_6.sql must be applied
-- ===================================================================
-- This migration copies all data from the legacy 'connections' table
-- into the new unified 'profile_graph' table with relationship_type='SOCIAL'.
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
    RAISE EXCEPTION 'Table profile_graph does not exist. Please apply migration 061_add_profile_graph_v4_6.sql first.';
  END IF;

  -- Verify connections table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'connections'
  ) THEN
    RAISE NOTICE 'Table connections does not exist. No data to migrate.';
  END IF;

  RAISE NOTICE 'Validation passed. Starting data migration...';
END $$;

-- ===================================================================
-- SECTION 2: DATA MIGRATION
-- ===================================================================

-- Migrate all connections to profile_graph with relationship_type='SOCIAL'
-- Status mapping:
--   pending → PENDING
--   accepted → ACTIVE
--   rejected → BLOCKED
--   blocked → BLOCKED
INSERT INTO public.profile_graph (
  source_profile_id,
  target_profile_id,
  relationship_type,
  status,
  metadata,
  created_at,
  updated_at
)
SELECT
  requester_id AS source_profile_id,
  receiver_id AS target_profile_id,
  'SOCIAL'::relationship_type AS relationship_type,
  CASE
    WHEN status = 'pending'::connection_status THEN 'PENDING'::relationship_status
    WHEN status = 'accepted'::connection_status THEN 'ACTIVE'::relationship_status
    WHEN status IN ('rejected'::connection_status, 'blocked'::connection_status) THEN 'BLOCKED'::relationship_status
    ELSE 'PENDING'::relationship_status -- fallback
  END AS status,
  jsonb_build_object(
    'migrated_from', 'connections',
    'original_status', status::text,
    'message', COALESCE(message, '')
  ) AS metadata,
  created_at,
  updated_at
FROM public.connections
WHERE EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'connections'
)
ON CONFLICT (source_profile_id, target_profile_id, relationship_type) DO NOTHING;

-- ===================================================================
-- SECTION 3: VERIFICATION
-- ===================================================================

DO $$
DECLARE
  connections_count INTEGER;
  profile_graph_social_count INTEGER;
BEGIN
  -- Count records in connections table (only if it exists)
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'connections'
  ) THEN
    SELECT COUNT(*) INTO connections_count FROM public.connections;
    RAISE NOTICE 'Found % records in connections table', connections_count;
  ELSE
    connections_count := 0;
    RAISE NOTICE 'connections table does not exist, skipping count';
  END IF;

  -- Count SOCIAL records in profile_graph
  SELECT COUNT(*) INTO profile_graph_social_count
  FROM public.profile_graph
  WHERE relationship_type = 'SOCIAL';

  RAISE NOTICE 'Found % SOCIAL records in profile_graph table', profile_graph_social_count;

  -- Verify migration
  IF connections_count > 0 AND profile_graph_social_count < connections_count THEN
    RAISE WARNING 'Migration incomplete: connections (%) > profile_graph SOCIAL (%)', connections_count, profile_graph_social_count;
  ELSIF connections_count > 0 THEN
    RAISE NOTICE 'Migration successful: All % connections migrated to profile_graph', connections_count;
  ELSE
    RAISE NOTICE 'No connections to migrate';
  END IF;
END $$;

-- ===================================================================
-- SECTION 4: ADD COMMENT
-- ===================================================================

COMMENT ON COLUMN public.profile_graph.metadata IS 'v4.6: JSONB field for contextual data. For migrated connections, contains: migrated_from, original_status, message';

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
