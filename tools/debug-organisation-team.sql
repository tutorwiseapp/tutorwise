/**
 * Diagnostic query to debug organisation team membership
 * Run this to check if connections are properly linked to organisations
 */

-- Replace these UUIDs with actual values from your test:
-- michael_id: Michael Quan (agent) user ID
-- john_id: John Smith (tutor) user ID
-- org_id: Michael's organisation ID

\set michael_id 'YOUR_MICHAEL_ID_HERE'
\set john_id 'YOUR_JOHN_ID_HERE'
\set org_id 'YOUR_ORG_ID_HERE'

-- 1. Check if connection exists in profile_graph
SELECT
  'Connection in profile_graph' as check_type,
  id,
  source_profile_id,
  target_profile_id,
  relationship_type,
  status,
  metadata
FROM profile_graph
WHERE relationship_type = 'SOCIAL'
  AND status = 'ACTIVE'
  AND (
    (source_profile_id = :'michael_id' AND target_profile_id = :'john_id')
    OR
    (source_profile_id = :'john_id' AND target_profile_id = :'michael_id')
  );

-- 2. Check if connection is in group_members
SELECT
  'Connection in group_members' as check_type,
  gm.id,
  gm.group_id,
  gm.connection_id,
  gm.added_at,
  cg.name as organisation_name
FROM group_members gm
JOIN connection_groups cg ON gm.group_id = cg.id
WHERE gm.group_id = :'org_id';

-- 3. Check organisation details
SELECT
  'Organisation details' as check_type,
  id,
  profile_id as owner_id,
  name,
  type,
  member_count
FROM connection_groups
WHERE id = :'org_id';

-- 4. Full diagnostic: Join everything together
SELECT
  'Full diagnostic' as check_type,
  pg.id as connection_id,
  pg.source_profile_id,
  pg.target_profile_id,
  pg.status,
  pg.metadata,
  gm.id as group_member_id,
  gm.group_id,
  gm.added_at
FROM profile_graph pg
LEFT JOIN group_members gm ON gm.connection_id = pg.id
WHERE pg.relationship_type = 'SOCIAL'
  AND pg.status = 'ACTIVE'
  AND (
    (pg.source_profile_id = :'michael_id' AND pg.target_profile_id = :'john_id')
    OR
    (pg.source_profile_id = :'john_id' AND pg.target_profile_id = :'michael_id')
  );
