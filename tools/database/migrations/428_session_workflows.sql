-- Migration 428: Learn Your Way — session_workflows table + virtualspace_sessions columns
-- Part of the "Learn Your Way Workflow Selector & Execution Framework"

CREATE TABLE IF NOT EXISTS session_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  theme JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  exam_board TEXT DEFAULT 'any',
  subject TEXT DEFAULT 'maths',
  level TEXT NOT NULL CHECK (level IN ('primary','foundation','higher','SEN','11+','a-level','any')),
  duration_mins INT NOT NULL,
  ai_involvement TEXT NOT NULL CHECK (ai_involvement IN ('full','hints','silent','co-teach')),
  sen_focus BOOLEAN DEFAULT FALSE,
  phases JSONB NOT NULL DEFAULT '[]',
  learn_your_way JSONB DEFAULT '{}',
  built_in BOOLEAN DEFAULT FALSE,
  published BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_workflows_tags ON session_workflows USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_session_workflows_level ON session_workflows(level);
CREATE INDEX IF NOT EXISTS idx_session_workflows_subject ON session_workflows(subject);
CREATE INDEX IF NOT EXISTS idx_session_workflows_sen ON session_workflows(sen_focus);
CREATE INDEX IF NOT EXISTS idx_session_workflows_published ON session_workflows(published);

ALTER TABLE virtualspace_sessions
  ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES session_workflows(id),
  ADD COLUMN IF NOT EXISTS workflow_state JSONB;

-- RLS
ALTER TABLE session_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "published workflows readable by authenticated"
  ON session_workflows FOR SELECT
  TO authenticated
  USING (published = TRUE OR created_by = auth.uid());

CREATE POLICY "tutors insert own workflows"
  ON session_workflows FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid() AND built_in = FALSE);

CREATE POLICY "tutors update own workflows"
  ON session_workflows FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND built_in = FALSE);

CREATE POLICY "tutors delete own workflows"
  ON session_workflows FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() AND built_in = FALSE);
