-- Migration 405: Fix agent_spaces FK + add missing index on agent_teams.space_id
--
-- M6: agent_spaces.created_by currently references profiles(id) but should
--     reference auth.users(id) for consistency with specialist_agents,
--     agent_teams, workflow_processes, and workflow_executions.
--
-- L6: agent_teams.space_id (added in migration 373) has no index, causing
--     full table scans when filtering teams by space.

-- ─── M6: Re-point agent_spaces.created_by FK to auth.users(id) ─────────────

-- Drop the old FK targeting profiles(id).
-- Constraint name follows Postgres auto-naming: {table}_{column}_fkey
ALTER TABLE agent_spaces
  DROP CONSTRAINT IF EXISTS agent_spaces_created_by_fkey;

-- Add the correct FK targeting auth.users(id)
ALTER TABLE agent_spaces
  ADD CONSTRAINT agent_spaces_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─── L6: Index on agent_teams.space_id ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_agteam_space ON agent_teams(space_id);
