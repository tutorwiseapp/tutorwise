-- AI Feedback Table (Shared: Sage + Lexi)
-- Migration: 264_create_ai_feedback_table.sql
--
-- Creates unified feedback table for all AI agents (Sage, Lexi)
-- Used for DSPy optimization and quality tracking

-- ============================================
-- AI FEEDBACK TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_type TEXT NOT NULL CHECK (agent_type IN ('sage', 'lexi')),
    session_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_id TEXT,
    rating TEXT CHECK (rating IN ('thumbs_up', 'thumbs_down')),
    rating_value INTEGER CHECK (rating_value >= 1 AND rating_value <= 5),
    comment TEXT,
    context JSONB,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for ai_feedback
CREATE INDEX IF NOT EXISTS idx_ai_feedback_agent_type ON ai_feedback(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_session_id ON ai_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON ai_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_processed ON ai_feedback(processed);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback(created_at DESC);

-- Combined index for DSPy optimization queries
CREATE INDEX IF NOT EXISTS idx_ai_feedback_optimization
    ON ai_feedback(agent_type, rating, processed, created_at DESC);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================
DROP POLICY IF EXISTS "Users can insert own feedback" ON ai_feedback;
CREATE POLICY "Users can insert own feedback" ON ai_feedback
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own feedback" ON ai_feedback;
CREATE POLICY "Users can view own feedback" ON ai_feedback
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to feedback" ON ai_feedback;
CREATE POLICY "Service role full access to feedback" ON ai_feedback
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE ai_feedback IS 'Shared feedback table for Sage and Lexi AI agents';
COMMENT ON COLUMN ai_feedback.agent_type IS 'Which AI agent: sage or lexi';
COMMENT ON COLUMN ai_feedback.context IS 'JSON context: subject, level, role, topic, etc.';
COMMENT ON COLUMN ai_feedback.processed IS 'Whether this feedback has been used in DSPy optimization';
COMMENT ON COLUMN ai_feedback.processed_at IS 'When this feedback was processed by DSPy';
