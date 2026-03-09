-- Migration 347: Workflow Process Versioning
--
-- Adds snapshot-based versioning to workflow_processes:
--   1. workflow_process_versions — immutable publish snapshots
--   2. draft_nodes / draft_edges columns — auto-save target (not a version)
--   3. current_version, published_at, published_by — version tracking metadata

-- ---------------------------------------------------------------------------
-- 1. workflow_process_versions — immutable publish snapshots
-- Created by POST /api/admin/workflow/processes/[id]/publish
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS workflow_process_versions (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id     uuid        NOT NULL REFERENCES workflow_processes(id) ON DELETE CASCADE,
  version_number integer     NOT NULL,
  nodes          jsonb       NOT NULL DEFAULT '[]',
  edges          jsonb       NOT NULL DEFAULT '[]',
  published_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at   timestamptz NOT NULL DEFAULT now(),
  notes          text,
  UNIQUE (process_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_wpv_process_id
  ON workflow_process_versions (process_id, version_number DESC);

ALTER TABLE workflow_process_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wpv_admin_all" ON workflow_process_versions USING (is_admin());

-- ---------------------------------------------------------------------------
-- 2. Add draft + versioning columns to workflow_processes
-- draft_nodes / draft_edges = where auto-save and manual save write to.
-- Publish copies draft → nodes/edges and increments current_version.
-- ---------------------------------------------------------------------------

ALTER TABLE workflow_processes
  ADD COLUMN IF NOT EXISTS draft_nodes     jsonb,
  ADD COLUMN IF NOT EXISTS draft_edges     jsonb,
  ADD COLUMN IF NOT EXISTS current_version integer     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at    timestamptz,
  ADD COLUMN IF NOT EXISTS published_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill: copy existing nodes/edges to draft so canvas doesn't start blank
UPDATE workflow_processes
SET draft_nodes = nodes, draft_edges = edges
WHERE draft_nodes IS NULL;

-- Index for finding processes with unpublished drafts
CREATE INDEX IF NOT EXISTS idx_wp_has_draft
  ON workflow_processes (updated_at DESC)
  WHERE draft_nodes IS NOT NULL;
