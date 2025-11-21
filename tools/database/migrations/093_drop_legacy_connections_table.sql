/**
 * Migration 093: Drop legacy connections table
 * Purpose: Complete cleanup after connections → profile_graph migration
 * Created: 2025-11-21
 *
 * Context:
 * - Migration 092 updated group_members to reference profile_graph
 * - All application code now uses profile_graph exclusively
 * - Legacy connections table is empty and no longer needed
 *
 * Safety:
 * - Verify connections table is empty before dropping
 * - All foreign keys already updated in migration 092
 */

-- Step 1: Verify table is empty (will fail if not empty, protecting data)
DO $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count FROM connections;

  IF record_count > 0 THEN
    RAISE EXCEPTION 'Cannot drop connections table: contains % records. Manual data migration required.', record_count;
  END IF;

  RAISE NOTICE 'Verified connections table is empty (% records)', record_count;
END $$;

-- Step 2: Drop the legacy connections table
DROP TABLE IF EXISTS connections CASCADE;

-- Step 3: Confirm completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully dropped legacy connections table';
  RAISE NOTICE 'System now fully migrated to profile_graph architecture';
END $$;
