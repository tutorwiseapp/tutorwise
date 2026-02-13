-- Lexi Conversation History Tables
-- Migration: 20260213000000_create_lexi_tables.sql
--
-- Creates tables for storing Lexi conversation history:
-- - lexi_conversations: Stores conversation metadata
-- - lexi_messages: Stores individual messages
--
-- Both tables have Row Level Security (RLS) enabled for multi-tenancy.

-- Create conversation persona type
CREATE TYPE lexi_persona AS ENUM ('student', 'tutor', 'client', 'agent', 'organisation');

-- Create conversation status type
CREATE TYPE lexi_conversation_status AS ENUM ('active', 'ended', 'archived');

-- Create lexi_conversations table
CREATE TABLE IF NOT EXISTS lexi_conversations (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_role TEXT NOT NULL,
    persona lexi_persona NOT NULL,
    session_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    message_count INTEGER NOT NULL DEFAULT 0,
    status lexi_conversation_status NOT NULL DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for lexi_conversations
CREATE INDEX idx_lexi_conversations_user_id ON lexi_conversations(user_id);
CREATE INDEX idx_lexi_conversations_session_id ON lexi_conversations(session_id);
CREATE INDEX idx_lexi_conversations_started_at ON lexi_conversations(started_at DESC);
CREATE INDEX idx_lexi_conversations_persona ON lexi_conversations(persona);
CREATE INDEX idx_lexi_conversations_status ON lexi_conversations(status);

-- Create lexi_messages table
CREATE TABLE IF NOT EXISTS lexi_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES lexi_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    intent TEXT,
    action_taken TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for lexi_messages
CREATE INDEX idx_lexi_messages_conversation_id ON lexi_messages(conversation_id);
CREATE INDEX idx_lexi_messages_timestamp ON lexi_messages(timestamp);

-- Enable RLS on both tables
ALTER TABLE lexi_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lexi_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lexi_conversations
-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations" ON lexi_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON lexi_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON lexi_conversations
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do everything (for archiving from backend)
CREATE POLICY "Service role full access to conversations" ON lexi_conversations
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- RLS Policies for lexi_messages
-- Users can only see messages from their own conversations
CREATE POLICY "Users can view own messages" ON lexi_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lexi_conversations
            WHERE lexi_conversations.id = lexi_messages.conversation_id
            AND lexi_conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own messages" ON lexi_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM lexi_conversations
            WHERE lexi_conversations.id = lexi_messages.conversation_id
            AND lexi_conversations.user_id = auth.uid()
        )
    );

-- Service role can do everything
CREATE POLICY "Service role full access to messages" ON lexi_messages
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Trigger to update updated_at on conversations
CREATE OR REPLACE FUNCTION update_lexi_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lexi_conversation_updated_at
    BEFORE UPDATE ON lexi_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_lexi_conversation_updated_at();

-- Comments
COMMENT ON TABLE lexi_conversations IS 'Stores Lexi conversation sessions for history and analytics';
COMMENT ON TABLE lexi_messages IS 'Stores individual messages within Lexi conversations';
COMMENT ON COLUMN lexi_conversations.persona IS 'The Lexi persona used for this conversation (student, tutor, client, agent, organisation)';
COMMENT ON COLUMN lexi_conversations.session_id IS 'The Redis session ID that created this conversation';
COMMENT ON COLUMN lexi_messages.intent IS 'The detected intent category:action for this message';
COMMENT ON COLUMN lexi_messages.action_taken IS 'The action taken by Lexi in response to this message';
