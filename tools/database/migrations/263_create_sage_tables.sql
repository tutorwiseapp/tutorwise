-- Sage AI Tutor Tables
-- Migration: 263_create_sage_tables.sql
--
-- Creates tables for Sage AI Tutor:
-- - sage_sessions: Stores tutoring session metadata
-- - sage_messages: Stores individual messages
-- - sage_progress: Stores student progress per topic
-- - sage_uploads: Stores uploaded teaching materials metadata

-- Create sage persona type (role-based)
DO $$ BEGIN
    CREATE TYPE sage_persona AS ENUM ('tutor', 'agent', 'client', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create sage session status type
DO $$ BEGIN
    CREATE TYPE sage_session_status AS ENUM ('active', 'ended', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create sage subject type
DO $$ BEGIN
    CREATE TYPE sage_subject AS ENUM ('maths', 'english', 'science', 'general');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create sage level type
DO $$ BEGIN
    CREATE TYPE sage_level AS ENUM ('GCSE', 'A-Level', 'University', 'Other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create sage session goal type
DO $$ BEGIN
    CREATE TYPE sage_session_goal AS ENUM ('homework_help', 'exam_prep', 'concept_review', 'practice', 'general');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- SAGE SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sage_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    persona sage_persona NOT NULL,
    subject sage_subject,
    level sage_level,
    session_goal sage_session_goal,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    message_count INTEGER NOT NULL DEFAULT 0,
    topics_covered TEXT[] DEFAULT '{}',
    status sage_session_status NOT NULL DEFAULT 'active',
    provider TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sage_sessions
CREATE INDEX IF NOT EXISTS idx_sage_sessions_user_id ON sage_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sage_sessions_persona ON sage_sessions(persona);
CREATE INDEX IF NOT EXISTS idx_sage_sessions_subject ON sage_sessions(subject);
CREATE INDEX IF NOT EXISTS idx_sage_sessions_level ON sage_sessions(level);
CREATE INDEX IF NOT EXISTS idx_sage_sessions_started_at ON sage_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sage_sessions_status ON sage_sessions(status);

-- ============================================
-- SAGE MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sage_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sage_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    topic TEXT,
    signature_used TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sage_messages
CREATE INDEX IF NOT EXISTS idx_sage_messages_session_id ON sage_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_sage_messages_timestamp ON sage_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_sage_messages_topic ON sage_messages(topic);

-- ============================================
-- SAGE PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sage_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject sage_subject NOT NULL,
    level sage_level NOT NULL,
    topic_id TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    mastery_score INTEGER NOT NULL DEFAULT 0 CHECK (mastery_score >= 0 AND mastery_score <= 100),
    practice_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    last_practiced_at TIMESTAMPTZ,
    error_patterns JSONB DEFAULT '[]',
    strengths JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, subject, level, topic_id)
);

-- Indexes for sage_progress
CREATE INDEX IF NOT EXISTS idx_sage_progress_student_id ON sage_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_sage_progress_subject ON sage_progress(subject);
CREATE INDEX IF NOT EXISTS idx_sage_progress_level ON sage_progress(level);
CREATE INDEX IF NOT EXISTS idx_sage_progress_mastery ON sage_progress(mastery_score);
CREATE INDEX IF NOT EXISTS idx_sage_progress_last_practiced ON sage_progress(last_practiced_at);

-- ============================================
-- SAGE UPLOADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sage_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    namespace TEXT NOT NULL,
    subject sage_subject,
    level sage_level,
    chunk_count INTEGER DEFAULT 0,
    embedding_status TEXT DEFAULT 'pending' CHECK (embedding_status IN ('pending', 'processing', 'completed', 'failed')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
    shared_with UUID[] DEFAULT '{}',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sage_uploads
CREATE INDEX IF NOT EXISTS idx_sage_uploads_owner_id ON sage_uploads(owner_id);
CREATE INDEX IF NOT EXISTS idx_sage_uploads_namespace ON sage_uploads(namespace);
CREATE INDEX IF NOT EXISTS idx_sage_uploads_subject ON sage_uploads(subject);
CREATE INDEX IF NOT EXISTS idx_sage_uploads_visibility ON sage_uploads(visibility);
CREATE INDEX IF NOT EXISTS idx_sage_uploads_embedding_status ON sage_uploads(embedding_status);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE sage_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_uploads ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: sage_sessions
-- ============================================
DROP POLICY IF EXISTS "Users can view own sessions" ON sage_sessions;
CREATE POLICY "Users can view own sessions" ON sage_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON sage_sessions;
CREATE POLICY "Users can insert own sessions" ON sage_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON sage_sessions;
CREATE POLICY "Users can update own sessions" ON sage_sessions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to sessions" ON sage_sessions;
CREATE POLICY "Service role full access to sessions" ON sage_sessions
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- RLS POLICIES: sage_messages
-- ============================================
DROP POLICY IF EXISTS "Users can view own messages" ON sage_messages;
CREATE POLICY "Users can view own messages" ON sage_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sage_sessions
            WHERE sage_sessions.id = sage_messages.session_id
            AND sage_sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own messages" ON sage_messages;
CREATE POLICY "Users can insert own messages" ON sage_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sage_sessions
            WHERE sage_sessions.id = sage_messages.session_id
            AND sage_sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Service role full access to messages" ON sage_messages;
CREATE POLICY "Service role full access to messages" ON sage_messages
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- RLS POLICIES: sage_progress
-- ============================================
DROP POLICY IF EXISTS "Students can view own progress" ON sage_progress;
CREATE POLICY "Students can view own progress" ON sage_progress
    FOR SELECT USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can update own progress" ON sage_progress;
CREATE POLICY "Students can update own progress" ON sage_progress
    FOR UPDATE USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Service role full access to progress" ON sage_progress;
CREATE POLICY "Service role full access to progress" ON sage_progress
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Tutors can view linked student progress" ON sage_progress;
CREATE POLICY "Tutors can view linked student progress" ON sage_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profile_graph
            WHERE profile_graph.source_profile_id = auth.uid()
            AND profile_graph.target_profile_id = sage_progress.student_id
            AND profile_graph.relationship_type IN ('TUTOR', 'AGENT', 'GUARDIAN')
            AND profile_graph.status = 'ACTIVE'
        )
    );

-- ============================================
-- RLS POLICIES: sage_uploads
-- ============================================
DROP POLICY IF EXISTS "Users can view own uploads" ON sage_uploads;
CREATE POLICY "Users can view own uploads" ON sage_uploads
    FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can view shared uploads" ON sage_uploads;
CREATE POLICY "Users can view shared uploads" ON sage_uploads
    FOR SELECT USING (auth.uid() = ANY(shared_with));

DROP POLICY IF EXISTS "Users can insert own uploads" ON sage_uploads;
CREATE POLICY "Users can insert own uploads" ON sage_uploads
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update own uploads" ON sage_uploads;
CREATE POLICY "Users can update own uploads" ON sage_uploads
    FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can delete own uploads" ON sage_uploads;
CREATE POLICY "Users can delete own uploads" ON sage_uploads
    FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Service role full access to uploads" ON sage_uploads;
CREATE POLICY "Service role full access to uploads" ON sage_uploads
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_sage_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sage_session_updated_at ON sage_sessions;
CREATE TRIGGER trigger_update_sage_session_updated_at
    BEFORE UPDATE ON sage_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_sage_session_updated_at();

CREATE OR REPLACE FUNCTION update_sage_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sage_progress_updated_at ON sage_progress;
CREATE TRIGGER trigger_update_sage_progress_updated_at
    BEFORE UPDATE ON sage_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_sage_progress_updated_at();

CREATE OR REPLACE FUNCTION update_sage_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_sage_uploads_updated_at ON sage_uploads;
CREATE TRIGGER trigger_update_sage_uploads_updated_at
    BEFORE UPDATE ON sage_uploads
    FOR EACH ROW
    EXECUTE FUNCTION update_sage_uploads_updated_at();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE sage_sessions IS 'Stores Sage AI tutor session metadata';
COMMENT ON TABLE sage_messages IS 'Stores individual messages within Sage tutoring sessions';
COMMENT ON TABLE sage_progress IS 'Stores student progress and mastery scores per topic';
COMMENT ON TABLE sage_uploads IS 'Stores metadata for uploaded teaching materials';
