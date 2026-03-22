-- Migration 423: Session recording support (LiveKit Egress)
-- Stores recording metadata for each virtualspace session

ALTER TABLE virtualspace_sessions
  ADD COLUMN IF NOT EXISTS recording_url         TEXT,
  ADD COLUMN IF NOT EXISTS recording_duration_secs INT,
  ADD COLUMN IF NOT EXISTS recording_egress_id   TEXT,
  ADD COLUMN IF NOT EXISTS recording_started_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS recording_completed_at TIMESTAMPTZ;

-- Index for webhook lookups by egress ID
CREATE INDEX IF NOT EXISTS idx_virtualspace_sessions_egress_id
  ON virtualspace_sessions (recording_egress_id)
  WHERE recording_egress_id IS NOT NULL;
