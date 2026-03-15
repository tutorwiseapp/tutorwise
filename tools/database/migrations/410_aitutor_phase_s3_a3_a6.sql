-- Migration 410: AI Tutor Solution Design — Phases S3 + A3 + A6
-- S3: Problem bank + learning outcomes
-- A3: Agent tool registry + tool call log
-- A6: Agent reports (moderation)

-- ============================================================
-- S3: Problem Bank & Assessment
-- ============================================================

CREATE TABLE IF NOT EXISTS sage_problem_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(50) NOT NULL,
    topic VARCHAR(200) NOT NULL,
    exam_board VARCHAR(20),
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    question_text TEXT NOT NULL,
    question_latex TEXT,
    answer_text TEXT NOT NULL,
    answer_latex TEXT,
    mark_scheme JSONB NOT NULL DEFAULT '{}',
    common_errors JSONB NOT NULL DEFAULT '[]',
    hints JSONB NOT NULL DEFAULT '[]',
    source VARCHAR(20) NOT NULL DEFAULT 'ai_generated',
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sage_problem_bank_subject_topic ON sage_problem_bank(subject, topic, difficulty);
CREATE INDEX idx_sage_problem_bank_board ON sage_problem_bank(exam_board) WHERE exam_board IS NOT NULL;

CREATE TABLE IF NOT EXISTS sage_learning_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    subject VARCHAR(50) NOT NULL,
    assessment_type VARCHAR(20) NOT NULL CHECK (assessment_type IN ('pre', 'post', 'formative')),
    score NUMERIC(5,1) NOT NULL,
    max_score NUMERIC(5,1) NOT NULL,
    topics_tested JSONB NOT NULL DEFAULT '[]',
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sage_learning_outcomes_student ON sage_learning_outcomes(student_id, subject);

-- ============================================================
-- A3: Agent Tool Registry
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_agent_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('learning', 'assessment', 'communication', 'planning')),
    parameters_schema JSONB NOT NULL DEFAULT '{}',
    handler_type VARCHAR(20) NOT NULL DEFAULT 'builtin' CHECK (handler_type IN ('builtin', 'custom')),
    handler_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    requires_approval BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_agent_tool_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES ai_agent_sessions(id) ON DELETE CASCADE,
    tool_slug VARCHAR(200) NOT NULL,
    parameters JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout')),
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_agent_tool_calls_session ON ai_agent_tool_calls(session_id);
CREATE INDEX idx_ai_agent_tool_calls_agent ON ai_agent_tool_calls(agent_id, created_at DESC);

-- Junction table: which tools are enabled per agent
CREATE TABLE IF NOT EXISTS ai_agent_tool_assignments (
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    tool_id UUID NOT NULL REFERENCES ai_agent_tools(id) ON DELETE CASCADE,
    PRIMARY KEY (agent_id, tool_id)
);

-- Seed 8 built-in tools
INSERT INTO ai_agent_tools (name, slug, description, category, parameters_schema, handler_type)
VALUES
(
    'Generate Quiz',
    'generate-quiz',
    'Create a quiz from the current topic with configurable difficulty and question count.',
    'assessment',
    '{"type": "object", "properties": {"topic": {"type": "string"}, "difficulty": {"type": "integer", "minimum": 1, "maximum": 5}, "question_count": {"type": "integer", "minimum": 1, "maximum": 10, "default": 5}}, "required": ["topic"]}',
    'builtin'
),
(
    'Create Flashcards',
    'create-flashcards',
    'Generate a set of flashcard Q&A pairs for a topic.',
    'learning',
    '{"type": "object", "properties": {"topic": {"type": "string"}, "count": {"type": "integer", "minimum": 1, "maximum": 20, "default": 10}}, "required": ["topic"]}',
    'builtin'
),
(
    'Schedule Revision',
    'schedule-revision',
    'Create a revision reminder notification for a specific topic and date.',
    'planning',
    '{"type": "object", "properties": {"topic": {"type": "string"}, "date": {"type": "string", "format": "date"}, "time": {"type": "string", "format": "time", "default": "18:00"}}, "required": ["topic", "date"]}',
    'builtin'
),
(
    'Send Progress Summary',
    'send-progress-summary',
    'Send a summary of the current session to the student''s linked parent or tutor.',
    'communication',
    '{"type": "object", "properties": {}, "required": []}',
    'builtin'
),
(
    'Create Study Plan',
    'create-study-plan',
    'Generate a multi-week study plan based on subject, exam date, and topics to cover.',
    'planning',
    '{"type": "object", "properties": {"subject": {"type": "string"}, "exam_date": {"type": "string", "format": "date"}, "topics": {"type": "array", "items": {"type": "string"}}}, "required": ["subject", "exam_date"]}',
    'builtin'
),
(
    'Check Answer',
    'check-answer',
    'Verify a mathematical answer using the deterministic solver. Returns correct/incorrect with working.',
    'assessment',
    '{"type": "object", "properties": {"expression": {"type": "string"}, "expected_answer": {"type": "string"}}, "required": ["expression", "expected_answer"]}',
    'builtin'
),
(
    'Lookup Curriculum',
    'lookup-curriculum',
    'Search the curriculum database for topic info including objectives, prerequisites, and key vocabulary.',
    'learning',
    '{"type": "object", "properties": {"topic": {"type": "string"}, "exam_board": {"type": "string"}}, "required": ["topic"]}',
    'builtin'
),
(
    'Search Materials',
    'search-materials',
    'Search the agent''s uploaded materials and links for relevant content.',
    'learning',
    '{"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}',
    'builtin'
)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- A6: Agent Reports (Moderation)
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_agent_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
    session_id UUID REFERENCES ai_agent_sessions(id),
    reporter_id UUID NOT NULL REFERENCES profiles(id),
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('harmful_content', 'inappropriate', 'off_topic', 'privacy', 'other')),
    description TEXT,
    message_content TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    action_taken VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_agent_reports_agent ON ai_agent_reports(agent_id);
CREATE INDEX idx_ai_agent_reports_status ON ai_agent_reports(status, created_at DESC);
CREATE INDEX idx_ai_agent_reports_reporter ON ai_agent_reports(reporter_id);

ALTER TABLE ai_agent_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
    ON ai_agent_reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Admins can read all reports"
    ON ai_agent_reports FOR SELECT
    USING (is_admin());

CREATE POLICY "Reporters can read own reports"
    ON ai_agent_reports FOR SELECT
    USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can update reports"
    ON ai_agent_reports FOR UPDATE
    USING (is_admin());

COMMENT ON TABLE sage_problem_bank IS 'Problem bank for Sage formative assessments — questions with mark schemes, hints, and common errors.';
COMMENT ON TABLE sage_learning_outcomes IS 'Pre/post assessment scores for measuring learning gains.';
COMMENT ON TABLE ai_agent_tools IS 'Tool registry for AI Agent Studio — built-in and custom tools that agents can invoke.';
COMMENT ON TABLE ai_agent_tool_calls IS 'Audit log of tool invocations during agent sessions.';
COMMENT ON TABLE ai_agent_reports IS 'Student-submitted reports for agent moderation. Admins review and take action.';
