-- Migration 412: AI Tutor Phases A4, S5, A5, A7
-- Per-Student Adaptation, Learning Analytics, Creator Analytics, Multi-Agent Handoff

-- A4: Add difficulty_level tracking to agent sessions
ALTER TABLE ai_agent_sessions ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5);
ALTER TABLE ai_agent_sessions ADD COLUMN IF NOT EXISTS topics_discussed JSONB DEFAULT '[]';

-- A4: Add analytics sharing consent to student profiles
ALTER TABLE sage_student_profiles ADD COLUMN IF NOT EXISTS allow_analytics_sharing BOOLEAN NOT NULL DEFAULT false;

-- S5: Diagnostic assessments table
CREATE TABLE IF NOT EXISTS sage_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject VARCHAR(50) NOT NULL,
    assessment_type VARCHAR(20) NOT NULL CHECK (assessment_type IN ('pre', 'post', 'formative', 'diagnostic')),
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    questions JSONB NOT NULL DEFAULT '[]',
    answers JSONB NOT NULL DEFAULT '[]',
    score NUMERIC(5,1),
    max_score NUMERIC(5,1),
    topic_scores JSONB DEFAULT '{}',
    time_limit_minutes INTEGER,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sage_assessments_student ON sage_assessments(student_id, subject);
CREATE INDEX idx_sage_assessments_type ON sage_assessments(assessment_type, created_at);

ALTER TABLE sage_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own assessments" ON sage_assessments FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users create own assessments" ON sage_assessments FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users update own assessments" ON sage_assessments FOR UPDATE USING (auth.uid() = student_id);

-- S5: Weekly digest tracking
CREATE TABLE IF NOT EXISTS sage_weekly_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    sessions_count INTEGER NOT NULL DEFAULT 0,
    total_minutes INTEGER NOT NULL DEFAULT 0,
    topics_practised JSONB NOT NULL DEFAULT '[]',
    mastery_changes JSONB NOT NULL DEFAULT '{}',
    misconceptions_resolved INTEGER NOT NULL DEFAULT 0,
    streak_days INTEGER NOT NULL DEFAULT 0,
    digest_text TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(student_id, week_start)
);

CREATE INDEX idx_sage_weekly_digests_student ON sage_weekly_digests(student_id, week_start DESC);

-- A5: Agent session analytics (materialised for fast creator dashboards)
CREATE TABLE IF NOT EXISTS ai_agent_analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sessions_count INTEGER NOT NULL DEFAULT 0,
    unique_students INTEGER NOT NULL DEFAULT 0,
    returning_students INTEGER NOT NULL DEFAULT 0,
    total_messages INTEGER NOT NULL DEFAULT 0,
    avg_session_minutes NUMERIC(6,1) DEFAULT 0,
    escalation_count INTEGER NOT NULL DEFAULT 0,
    completion_count INTEGER NOT NULL DEFAULT 0,
    total_revenue_pence INTEGER NOT NULL DEFAULT 0,
    ai_cost_pence INTEGER NOT NULL DEFAULT 0,
    avg_rating NUMERIC(3,2),
    ratings_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(agent_id, date)
);

CREATE INDEX idx_ai_agent_analytics_agent ON ai_agent_analytics_daily(agent_id, date DESC);

-- A5: Agent ratings table (if not exists)
CREATE TABLE IF NOT EXISTS ai_agent_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    session_id UUID REFERENCES ai_agent_sessions(id),
    student_id UUID NOT NULL REFERENCES profiles(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(session_id, student_id)
);

CREATE INDEX idx_ai_agent_ratings_agent ON ai_agent_ratings(agent_id, created_at DESC);

ALTER TABLE ai_agent_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users rate own sessions" ON ai_agent_ratings FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users see own ratings" ON ai_agent_ratings FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Creators see agent ratings" ON ai_agent_ratings FOR SELECT USING (
    EXISTS (SELECT 1 FROM ai_agents WHERE ai_agents.id = ai_agent_ratings.agent_id AND ai_agents.owner_id = auth.uid())
);

-- A7: Agent-to-agent referrals
CREATE TABLE IF NOT EXISTS ai_agent_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    target_agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id),
    session_id UUID REFERENCES ai_agent_sessions(id),
    topic_context VARCHAR(200),
    converted BOOLEAN NOT NULL DEFAULT false,
    converted_session_id UUID REFERENCES ai_agent_sessions(id),
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_agent_referrals_source ON ai_agent_referrals(source_agent_id, created_at DESC);
CREATE INDEX idx_ai_agent_referrals_target ON ai_agent_referrals(target_agent_id);
CREATE INDEX idx_ai_agent_referrals_student ON ai_agent_referrals(student_id);

ALTER TABLE ai_agent_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own referrals" ON ai_agent_referrals FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Creators see referrals to their agents" ON ai_agent_referrals FOR SELECT USING (
    EXISTS (SELECT 1 FROM ai_agents WHERE ai_agents.id = ai_agent_referrals.target_agent_id AND ai_agents.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM ai_agents WHERE ai_agents.id = ai_agent_referrals.source_agent_id AND ai_agents.owner_id = auth.uid())
);

-- A7: Add expertise_topics to agents for referral matching
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS expertise_topics JSONB DEFAULT '[]';

-- pg_cron: Weekly digest generation (Sundays 18:00 UTC)
-- SELECT cron.schedule('sage-weekly-digest', '0 18 * * 0', $$SELECT net.http_post(url:='https://tutorwise.com/api/cron/sage-weekly-digest', headers:='{"x-cron-secret": "..."}')$$);

-- pg_cron: Daily agent analytics aggregation (02:00 UTC)
-- SELECT cron.schedule('agent-analytics-daily', '0 2 * * *', $$SELECT net.http_post(url:='https://tutorwise.com/api/cron/agent-analytics-daily', headers:='{"x-cron-secret": "..."}')$$);

COMMENT ON TABLE sage_assessments IS 'Diagnostic and formative assessments for mastery measurement (pre/post comparisons).';
COMMENT ON TABLE sage_weekly_digests IS 'Weekly learning digest per student — generated Sundays 18:00 UTC.';
COMMENT ON TABLE ai_agent_analytics_daily IS 'Daily aggregated metrics per AI agent — sessions, revenue, ratings, costs.';
COMMENT ON TABLE ai_agent_ratings IS 'Student ratings and feedback for AI agent sessions.';
COMMENT ON TABLE ai_agent_referrals IS 'Agent-to-agent referral tracking with 5% revenue share on conversion.';
