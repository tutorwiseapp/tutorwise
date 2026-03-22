-- Migration 427: Breakout room support
-- Allows sub-sessions branching from a parent virtualspace session

ALTER TABLE virtualspace_sessions
  ADD COLUMN IF NOT EXISTS parent_session_id UUID REFERENCES virtualspace_sessions (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS breakout_label     TEXT;      -- e.g. "Group A", "Group B"

-- Index for listing breakout rooms from parent
CREATE INDEX IF NOT EXISTS idx_virtualspace_sessions_parent
  ON virtualspace_sessions (parent_session_id)
  WHERE parent_session_id IS NOT NULL;
