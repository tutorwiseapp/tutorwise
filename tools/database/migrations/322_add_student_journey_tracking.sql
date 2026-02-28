/**
 * Migration 322: Student Progress Tracking
 * Purpose: Track student learning journey across sessions per agent/topic
 * Created: 2026-02-28
 *
 * Supports the CAS Student Journey workflow which tracks topic mastery
 * across sessions for personalized learning recommendations.
 */

-- 1. Student progress table
CREATE TABLE IF NOT EXISTS public.ai_agent_student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  mastery_level FLOAT DEFAULT 0.0 CHECK (mastery_level BETWEEN 0.0 AND 1.0),
  interactions INTEGER DEFAULT 0,
  last_session_id UUID REFERENCES public.ai_agent_sessions(id) ON DELETE SET NULL,
  state JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, student_id, topic)
);

-- 2. Indexes
CREATE INDEX idx_ai_agent_student_progress_student ON public.ai_agent_student_progress(student_id);
CREATE INDEX idx_ai_agent_student_progress_agent ON public.ai_agent_student_progress(agent_id);
CREATE INDEX idx_ai_agent_student_progress_topic ON public.ai_agent_student_progress(agent_id, topic);

-- 3. RLS
ALTER TABLE public.ai_agent_student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "student_progress_student_read" ON public.ai_agent_student_progress
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "student_progress_owner_read" ON public.ai_agent_student_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = ai_agent_student_progress.agent_id
      AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "student_progress_service_all" ON public.ai_agent_student_progress
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "student_progress_admin_read" ON public.ai_agent_student_progress
  FOR SELECT USING (public.is_admin());

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_student_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_student_progress_updated
  BEFORE UPDATE ON public.ai_agent_student_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_student_progress_timestamp();
