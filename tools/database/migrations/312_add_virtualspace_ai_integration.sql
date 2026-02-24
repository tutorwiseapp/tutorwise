-- Migration: VirtualSpace AI Tutor Integration
-- Created: 2026-02-24
-- Purpose: Phase 3B - Enable AI tutors to join VirtualSpace video sessions
-- Version: v1.0

-- Add VirtualSpace session tracking to AI tutor sessions
ALTER TABLE ai_tutor_sessions ADD COLUMN IF NOT EXISTS virtualspace_session_id UUID REFERENCES virtualspace_sessions(id) ON DELETE SET NULL;
ALTER TABLE ai_tutor_sessions ADD COLUMN IF NOT EXISTS session_mode VARCHAR(20) DEFAULT 'chat';
ALTER TABLE ai_tutor_sessions ADD COLUMN IF NOT EXISTS video_duration_seconds INTEGER DEFAULT 0;

-- Add check constraint for session_mode
ALTER TABLE ai_tutor_sessions DROP CONSTRAINT IF EXISTS ai_tutor_sessions_session_mode_check;
ALTER TABLE ai_tutor_sessions ADD CONSTRAINT ai_tutor_sessions_session_mode_check
  CHECK (session_mode IN ('chat', 'video', 'hybrid'));

COMMENT ON COLUMN ai_tutor_sessions.virtualspace_session_id IS 'Link to VirtualSpace video session if in video/hybrid mode';
COMMENT ON COLUMN ai_tutor_sessions.session_mode IS 'Session type: chat (text only), video (AI in VirtualSpace), hybrid (AI + human tutor)';
COMMENT ON COLUMN ai_tutor_sessions.video_duration_seconds IS 'Total video session duration in seconds';

CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_virtualspace ON ai_tutor_sessions(virtualspace_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_mode ON ai_tutor_sessions(session_mode);

-- Track AI tutor participation in VirtualSpace events
CREATE TABLE IF NOT EXISTS ai_tutor_virtualspace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_session_id UUID NOT NULL REFERENCES ai_tutor_sessions(id) ON DELETE CASCADE,
  virtualspace_session_id UUID NOT NULL REFERENCES virtualspace_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'ai_joined', 'ai_left', 'human_joined', 'human_left', 'screen_shared', 'handoff_requested', 'handoff_completed'
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_virtualspace_events_ai_session ON ai_tutor_virtualspace_events(ai_tutor_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_virtualspace_events_vs_session ON ai_tutor_virtualspace_events(virtualspace_session_id);
CREATE INDEX IF NOT EXISTS idx_ai_virtualspace_events_type ON ai_tutor_virtualspace_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_virtualspace_events_created ON ai_tutor_virtualspace_events(created_at DESC);

COMMENT ON TABLE ai_tutor_virtualspace_events IS 'Event log for AI tutor participation in VirtualSpace video sessions';
COMMENT ON COLUMN ai_tutor_virtualspace_events.event_type IS 'Type of event: ai_joined, ai_left, human_joined, human_left, screen_shared, handoff_requested, handoff_completed';
COMMENT ON COLUMN ai_tutor_virtualspace_events.event_data IS 'Additional event metadata (participant IDs, timestamps, etc.)';

-- Function: Get VirtualSpace session analytics for AI tutor
CREATE OR REPLACE FUNCTION get_ai_tutor_video_analytics(p_ai_tutor_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  total_video_sessions INTEGER,
  total_video_duration_seconds INTEGER,
  avg_video_duration_seconds NUMERIC,
  hybrid_sessions_count INTEGER,
  handoff_count INTEGER,
  last_video_session TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(DISTINCT s.id)::INTEGER as total_video_sessions,
    COALESCE(SUM(s.video_duration_seconds), 0)::INTEGER as total_video_duration_seconds,
    COALESCE(AVG(s.video_duration_seconds), 0)::NUMERIC as avg_video_duration_seconds,
    COUNT(DISTINCT CASE WHEN s.session_mode = 'hybrid' THEN s.id END)::INTEGER as hybrid_sessions_count,
    COUNT(DISTINCT CASE WHEN e.event_type = 'handoff_completed' THEN e.id END)::INTEGER as handoff_count,
    MAX(s.created_at) as last_video_session
  FROM ai_tutor_sessions s
  LEFT JOIN ai_tutor_virtualspace_events e ON e.ai_tutor_session_id = s.id
  WHERE s.ai_tutor_id = p_ai_tutor_id
    AND s.session_mode IN ('video', 'hybrid')
    AND s.created_at >= NOW() - INTERVAL '1 day' * p_days;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_ai_tutor_video_analytics(UUID, INTEGER) IS 'Get video session analytics for an AI tutor over specified days';

-- Function: Get active VirtualSpace sessions for AI tutor
CREATE OR REPLACE FUNCTION get_active_virtualspace_sessions(p_ai_tutor_id UUID)
RETURNS TABLE (
  ai_session_id UUID,
  virtualspace_session_id UUID,
  session_mode VARCHAR(20),
  client_id UUID,
  client_name TEXT,
  started_at TIMESTAMPTZ,
  video_duration_seconds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id as ai_session_id,
    s.virtualspace_session_id,
    s.session_mode,
    s.client_id,
    p.full_name as client_name,
    s.created_at as started_at,
    s.video_duration_seconds
  FROM ai_tutor_sessions s
  JOIN profiles p ON p.id = s.client_id
  WHERE s.ai_tutor_id = p_ai_tutor_id
    AND s.virtualspace_session_id IS NOT NULL
    AND s.status = 'active'
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_active_virtualspace_sessions(UUID) IS 'Get currently active VirtualSpace sessions for an AI tutor';

-- Update ai_tutors statistics to include video sessions
-- Add video_session_count column if not exists
ALTER TABLE ai_tutors ADD COLUMN IF NOT EXISTS video_session_count INTEGER DEFAULT 0;
ALTER TABLE ai_tutors ADD COLUMN IF NOT EXISTS total_video_duration_seconds INTEGER DEFAULT 0;

COMMENT ON COLUMN ai_tutors.video_session_count IS 'Total number of VirtualSpace video sessions conducted';
COMMENT ON COLUMN ai_tutors.total_video_duration_seconds IS 'Cumulative video session duration in seconds';

-- Function: Update AI tutor video statistics
CREATE OR REPLACE FUNCTION update_ai_tutor_video_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- When a video session ends, update AI tutor stats
  IF (NEW.video_duration_seconds > 0 AND NEW.video_duration_seconds != COALESCE(OLD.video_duration_seconds, 0)) THEN
    UPDATE ai_tutors
    SET
      video_session_count = video_session_count + 1,
      total_video_duration_seconds = total_video_duration_seconds + (NEW.video_duration_seconds - COALESCE(OLD.video_duration_seconds, 0)),
      updated_at = NOW()
    WHERE id = NEW.ai_tutor_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ai_tutor_video_stats
  AFTER UPDATE OF video_duration_seconds ON ai_tutor_sessions
  FOR EACH ROW
  WHEN (NEW.video_duration_seconds > 0)
  EXECUTE FUNCTION update_ai_tutor_video_stats();

COMMENT ON FUNCTION update_ai_tutor_video_stats() IS 'Automatically update AI tutor video statistics when session video duration changes';
