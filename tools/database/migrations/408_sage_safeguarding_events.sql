-- Migration 408: Sage Safeguarding Events
-- Phase S1: Safety & Guardrails — logging table for safety pipeline events
-- Tracks: blocked inputs, output rewrites, wellbeing alerts, age violations

CREATE TABLE IF NOT EXISTS sage_safeguarding_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('input_blocked', 'output_rewritten', 'wellbeing_alert', 'age_violation')),
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
    category VARCHAR(50) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for admin review queries
CREATE INDEX idx_safeguarding_events_user ON sage_safeguarding_events(user_id);
CREATE INDEX idx_safeguarding_events_severity ON sage_safeguarding_events(severity, created_at DESC);
CREATE INDEX idx_safeguarding_events_type ON sage_safeguarding_events(event_type, created_at DESC);
CREATE INDEX idx_safeguarding_events_session ON sage_safeguarding_events(session_id);

-- RLS: admin-only read, service role insert
ALTER TABLE sage_safeguarding_events ENABLE ROW LEVEL SECURITY;

-- Admins can read all events
CREATE POLICY "Admins can read safeguarding events"
    ON sage_safeguarding_events FOR SELECT
    USING (is_admin());

-- Service role inserts (API routes use service client)
CREATE POLICY "Service role can insert safeguarding events"
    ON sage_safeguarding_events FOR INSERT
    WITH CHECK (true);

COMMENT ON TABLE sage_safeguarding_events IS 'Audit log for Sage safety pipeline events — input blocks, output rewrites, wellbeing alerts. Admin-only access for safeguarding review.';
