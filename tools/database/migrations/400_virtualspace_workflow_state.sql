-- Migration 400: Workflow state on virtualspace_sessions
-- Adds workflow_id FK and workflow_state JSONB to track active Learn Your Way sessions.
--
-- workflow_state shape:
-- {
--   "currentPhaseIndex": 0,
--   "startedAt": "2026-03-22T10:00:00Z",
--   "transitions": [
--     { "phaseId": "warm-up", "enteredAt": "...", "exitedAt": "...", "exitTrigger": "tutor" }
--   ]
-- }

-- 1. Add workflow_id FK (nullable — most sessions have no workflow)
ALTER TABLE virtualspace_sessions
  ADD COLUMN IF NOT EXISTS workflow_id uuid REFERENCES session_workflows(id) ON DELETE SET NULL;

-- 2. Add workflow_state JSONB (nullable — only present when workflow_id is set)
ALTER TABLE virtualspace_sessions
  ADD COLUMN IF NOT EXISTS workflow_state jsonb;

-- 3. Index for querying active workflow sessions (analytics / phase mining)
CREATE INDEX IF NOT EXISTS idx_virtualspace_sessions_workflow_id
  ON virtualspace_sessions(workflow_id)
  WHERE workflow_id IS NOT NULL;

-- 4. Validate workflow_state shape via check constraint
--    Ensures state always has required keys when present
ALTER TABLE virtualspace_sessions
  ADD CONSTRAINT chk_workflow_state_shape
  CHECK (
    workflow_state IS NULL
    OR (
      workflow_state ? 'currentPhaseIndex'
      AND workflow_state ? 'startedAt'
      AND workflow_state ? 'transitions'
    )
  );

COMMENT ON COLUMN virtualspace_sessions.workflow_id IS
  'FK to session_workflows — set when a Learn Your Way workflow is active';

COMMENT ON COLUMN virtualspace_sessions.workflow_state IS
  'JSONB tracking current phase index, start time, and phase transition history';
