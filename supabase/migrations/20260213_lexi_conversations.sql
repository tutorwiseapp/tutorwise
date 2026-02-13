-- Lexi Conversations Table
-- Stores archived conversation history for users

-- Table for storing conversations
CREATE TABLE IF NOT EXISTS lexi_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona TEXT NOT NULL CHECK (persona IN ('student', 'tutor', 'client', 'agent', 'organisation')),

  -- Conversation metadata
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ NOT NULL,

  -- Message count for quick stats
  message_count INTEGER DEFAULT 0,

  -- Provider used for this conversation
  provider TEXT DEFAULT 'rules',

  -- Summary generated when conversation ends (optional)
  summary TEXT,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'archived')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing messages
CREATE TABLE IF NOT EXISTS lexi_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES lexi_conversations(id) ON DELETE CASCADE,

  -- Message content
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- Message metadata (stored as JSONB)
  metadata JSONB DEFAULT '{}',

  -- Intent detected (if any)
  intent_category TEXT,
  intent_action TEXT,

  -- Feedback (thumbs up/down)
  feedback_rating INTEGER CHECK (feedback_rating IN (-1, 0, 1)), -- -1=down, 0=none, 1=up
  feedback_comment TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Lexi analytics/metrics
CREATE TABLE IF NOT EXISTS lexi_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Time bucket (hourly aggregation)
  time_bucket TIMESTAMPTZ NOT NULL,

  -- Counts
  total_sessions INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,

  -- By persona
  student_sessions INTEGER DEFAULT 0,
  tutor_sessions INTEGER DEFAULT 0,
  client_sessions INTEGER DEFAULT 0,
  agent_sessions INTEGER DEFAULT 0,
  organisation_sessions INTEGER DEFAULT 0,

  -- By provider
  rules_messages INTEGER DEFAULT 0,
  claude_messages INTEGER DEFAULT 0,
  gemini_messages INTEGER DEFAULT 0,

  -- Intent distribution (JSONB for flexibility)
  intent_counts JSONB DEFAULT '{}',

  -- Feedback stats
  positive_feedback INTEGER DEFAULT 0,
  negative_feedback INTEGER DEFAULT 0,

  -- Errors
  error_count INTEGER DEFAULT 0,

  -- Avg response time (ms)
  avg_response_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint for time bucket
  UNIQUE(time_bucket)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lexi_conversations_user_id ON lexi_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_lexi_conversations_session_id ON lexi_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_lexi_conversations_status ON lexi_conversations(status);
CREATE INDEX IF NOT EXISTS idx_lexi_conversations_started_at ON lexi_conversations(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_lexi_messages_conversation_id ON lexi_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_lexi_messages_created_at ON lexi_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lexi_messages_intent ON lexi_messages(intent_category, intent_action);

CREATE INDEX IF NOT EXISTS idx_lexi_analytics_time_bucket ON lexi_analytics(time_bucket DESC);

-- RLS Policies
ALTER TABLE lexi_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lexi_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lexi_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
  ON lexi_conversations FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only see messages from their own conversations
CREATE POLICY "Users can view own messages"
  ON lexi_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM lexi_conversations WHERE user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "Service role full access conversations"
  ON lexi_conversations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access messages"
  ON lexi_messages FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Only admins can view analytics
CREATE POLICY "Admins can view analytics"
  ON lexi_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

CREATE POLICY "Service role full access analytics"
  ON lexi_analytics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to update conversation message count
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lexi_conversations
  SET
    message_count = message_count + 1,
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for message count
DROP TRIGGER IF EXISTS trigger_update_message_count ON lexi_messages;
CREATE TRIGGER trigger_update_message_count
  AFTER INSERT ON lexi_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_message_count();
