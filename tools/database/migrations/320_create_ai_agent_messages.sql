/**
 * Migration 320: Create ai_agent_messages table
 * Purpose: Normalize messages from JSONB array to proper table
 * Created: 2026-02-28
 *
 * Replaces the messages JSONB column on ai_agent_sessions with
 * a normalized ai_agent_messages table (matching sage_messages pattern).
 */

-- 1. Create the messages table
CREATE TABLE IF NOT EXISTS public.ai_agent_messages (
  id TEXT PRIMARY KEY DEFAULT 'msg_' || gen_random_uuid()::text,
  session_id UUID NOT NULL REFERENCES public.ai_agent_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB,                -- [{index, source, similarity, metadata}]
  rag_tier_used TEXT,           -- 'materials' | 'links' | 'sage_fallback' | null
  metadata JSONB,               -- {provider, model, tokens, ...}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX idx_ai_agent_messages_session ON public.ai_agent_messages(session_id, created_at);
CREATE INDEX idx_ai_agent_messages_role ON public.ai_agent_messages(role) WHERE role = 'assistant';

-- 3. RLS policies
ALTER TABLE public.ai_agent_messages ENABLE ROW LEVEL SECURITY;

-- Session client can read their messages
CREATE POLICY "ai_agent_messages_client_read" ON public.ai_agent_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ai_agent_sessions s
      WHERE s.id = ai_agent_messages.session_id
      AND s.client_id = auth.uid()
    )
  );

-- Agent owner can read messages for their agents
CREATE POLICY "ai_agent_messages_owner_read" ON public.ai_agent_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ai_agent_sessions s
      JOIN public.ai_agents a ON a.id = s.agent_id
      WHERE s.id = ai_agent_messages.session_id
      AND a.owner_id = auth.uid()
    )
  );

-- Session client can insert messages to active sessions
CREATE POLICY "ai_agent_messages_client_insert" ON public.ai_agent_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_agent_sessions s
      WHERE s.id = ai_agent_messages.session_id
      AND s.client_id = auth.uid()
      AND s.status = 'active'
    )
  );

-- Service role (API routes) can do everything
CREATE POLICY "ai_agent_messages_service_all" ON public.ai_agent_messages
  FOR ALL USING (auth.role() = 'service_role');

-- Admin can read all
CREATE POLICY "ai_agent_messages_admin_read" ON public.ai_agent_messages
  FOR SELECT USING (public.is_admin());

-- 4. Migrate existing JSONB messages to rows
DO $$
DECLARE
  sess RECORD;
  msg JSONB;
  msg_idx INTEGER;
BEGIN
  FOR sess IN SELECT id, messages FROM public.ai_agent_sessions WHERE messages IS NOT NULL AND messages != '[]'::jsonb
  LOOP
    msg_idx := 0;
    FOR msg IN SELECT * FROM jsonb_array_elements(sess.messages)
    LOOP
      INSERT INTO public.ai_agent_messages (session_id, role, content, sources, created_at)
      VALUES (
        sess.id,
        msg->>'role',
        msg->>'content',
        CASE WHEN msg->'sources' IS NOT NULL THEN msg->'sources' ELSE NULL END,
        COALESCE((msg->>'timestamp')::timestamptz, NOW())
      );
      msg_idx := msg_idx + 1;
    END LOOP;
  END LOOP;
END $$;

-- 5. Drop the JSONB messages column (data is now in ai_agent_messages)
ALTER TABLE public.ai_agent_sessions DROP COLUMN IF EXISTS messages;
