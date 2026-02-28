/**
 * Migration 323: Response Quality Scoring
 * Purpose: Store quality scores for AI agent responses
 * Created: 2026-02-28
 *
 * Supports the CAS Quality Loop workflow which scores each response
 * for accuracy, relevance, and helpfulness.
 */

-- 1. Response quality table
CREATE TABLE IF NOT EXISTS public.ai_agent_response_quality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL REFERENCES public.ai_agent_messages(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.ai_agent_sessions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  accuracy_score FLOAT CHECK (accuracy_score BETWEEN 0.0 AND 1.0),
  relevance_score FLOAT CHECK (relevance_score BETWEEN 0.0 AND 1.0),
  helpfulness_score FLOAT CHECK (helpfulness_score BETWEEN 0.0 AND 1.0),
  overall_score FLOAT CHECK (overall_score BETWEEN 0.0 AND 1.0),
  scoring_model TEXT DEFAULT 'rules',
  flags JSONB DEFAULT '[]',  -- [{type, reason}] for flagged responses
  scored_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX idx_ai_agent_quality_message ON public.ai_agent_response_quality(message_id);
CREATE INDEX idx_ai_agent_quality_session ON public.ai_agent_response_quality(session_id);
CREATE INDEX idx_ai_agent_quality_agent ON public.ai_agent_response_quality(agent_id);
CREATE INDEX idx_ai_agent_quality_score ON public.ai_agent_response_quality(overall_score) WHERE overall_score < 0.5;

-- 3. RLS
ALTER TABLE public.ai_agent_response_quality ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quality_owner_read" ON public.ai_agent_response_quality
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = ai_agent_response_quality.agent_id
      AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "quality_service_all" ON public.ai_agent_response_quality
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "quality_admin_read" ON public.ai_agent_response_quality
  FOR SELECT USING (public.is_admin());
