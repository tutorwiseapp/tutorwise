/**
 * Migration 092: Migrate group_members to reference profile_graph instead of connections
 * Purpose: Complete the connections → profile_graph migration for organisation teams
 * Created: 2025-11-21
 *
 * Problem:
 * - group_members.connection_id references legacy connections table
 * - All new code uses profile_graph for connection requests
 * - Organisation team auto-add fails due to table mismatch
 *
 * Solution:
 * - Update group_members.connection_id to reference profile_graph.id
 * - Update foreign key constraint
 * - Maintain data integrity
 */

-- Step 1: Drop the old foreign key constraint (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'group_members_connection_id_fkey'
        AND table_name = 'group_members'
    ) THEN
        ALTER TABLE group_members DROP CONSTRAINT group_members_connection_id_fkey;
    END IF;
END $$;

-- Step 2: Add new foreign key constraint referencing profile_graph
ALTER TABLE group_members
ADD CONSTRAINT group_members_connection_id_fkey
FOREIGN KEY (connection_id)
REFERENCES profile_graph(id)
ON DELETE CASCADE;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_group_members_connection_id
ON group_members(connection_id);

-- Step 4: Update organisation.ts query comment
COMMENT ON COLUMN group_members.connection_id IS
'References profile_graph.id (migrated from connections table in v092)';

-- Verification query (run manually to verify):
-- SELECT
--   gm.id,
--   gm.group_id,
--   gm.connection_id,
--   pg.source_profile_id,
--   pg.target_profile_id,
--   pg.relationship_type,
--   pg.status
-- FROM group_members gm
-- LEFT JOIN profile_graph pg ON gm.connection_id = pg.id
-- WHERE pg.id IS NULL;
--
-- Expected: 0 rows (all connection_ids should reference valid profile_graph rows)
