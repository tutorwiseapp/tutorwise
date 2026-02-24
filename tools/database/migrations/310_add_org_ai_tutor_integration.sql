-- Migration: Add AI Tutor to Organisation Integration
-- Created: 2026-02-24
-- Purpose: Phase 2 Feature #7 - Allow organisations to add AI tutors as team members
-- Version: v1.1

-- Create separate table for AI tutor organization memberships
CREATE TABLE IF NOT EXISTS ai_tutor_group_members (
  group_id uuid NOT NULL REFERENCES connection_groups(id) ON DELETE CASCADE,
  ai_tutor_id uuid NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  role text NOT NULL DEFAULT 'member',
  is_active boolean NOT NULL DEFAULT true,
  internal_notes text,
  PRIMARY KEY (group_id, ai_tutor_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_tutor_group_members_group ON ai_tutor_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_group_members_tutor ON ai_tutor_group_members(ai_tutor_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_group_members_role ON ai_tutor_group_members(group_id, role) WHERE role = 'admin';

-- Add check constraint for role
ALTER TABLE ai_tutor_group_members DROP CONSTRAINT IF EXISTS ai_tutor_group_members_role_check;
ALTER TABLE ai_tutor_group_members ADD CONSTRAINT ai_tutor_group_members_role_check
  CHECK (role IN ('member', 'admin'));

-- Add table comment
COMMENT ON TABLE ai_tutor_group_members IS 'Manages AI tutor memberships in organisations (mirrors group_members structure for AI tutors)';

-- Drop existing function if it has different signature
DROP FUNCTION IF EXISTS get_organisation_members_with_ai_tutors(uuid);

-- Function: Get organisation members including both human tutors and AI tutors
CREATE FUNCTION get_organisation_members_with_ai_tutors(org_id uuid)
RETURNS TABLE (
  member_type text,
  member_id uuid,
  member_name text,
  role text,
  added_at timestamptz,
  is_active boolean
) AS $$
BEGIN
  RETURN QUERY
  -- Human tutors from group_members
  SELECT
    'human'::text as member_type,
    pg.target_profile_id as member_id,
    p.full_name as member_name,
    gm.role,
    gm.added_at,
    true as is_active
  FROM group_members gm
  JOIN profile_graph pg ON pg.id = gm.connection_id
  JOIN profiles p ON p.id = pg.target_profile_id
  WHERE gm.group_id = org_id

  UNION ALL

  -- AI tutors from ai_tutor_group_members
  SELECT
    'ai_tutor'::text as member_type,
    at.id as member_id,
    at.display_name as member_name,
    atgm.role,
    atgm.added_at,
    atgm.is_active
  FROM ai_tutor_group_members atgm
  JOIN ai_tutors at ON at.id = atgm.ai_tutor_id
  WHERE atgm.group_id = org_id

  ORDER BY added_at ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_organisation_members_with_ai_tutors(uuid) IS 'Get all organisation members (both human tutors and AI tutors)';
