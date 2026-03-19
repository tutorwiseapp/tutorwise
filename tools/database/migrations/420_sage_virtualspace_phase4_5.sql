-- Migration 420: Sage × VirtualSpace — Phase 4 & 5 schema
-- Phase 4: sage_canvas_events (presence, stamp/observe audit log)
-- Phase 5: recap_json on sage_sessions, sage_lesson_plans, sage_lesson_plan_executions
-- Created: 2026-03-19

-- ── Phase 4: Canvas event audit log ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sage_canvas_events (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sage_session_id           UUID NOT NULL REFERENCES sage_sessions(id) ON DELETE CASCADE,
  virtualspace_session_id   UUID NOT NULL REFERENCES virtualspace_sessions(id) ON DELETE CASCADE,
  event_type                TEXT NOT NULL CHECK (event_type IN (
                              'stamp', 'observe', 'annotation',
                              'copilot_suggestion', 'copilot_accepted', 'copilot_dismissed',
                              'profile_transition'
                            )),
  shape_type                TEXT,
  shape_data                JSONB,
  observation_trigger       TEXT,        -- 'manual' | 'stuck' | 'session-drive'
  observation_feedback      TEXT,        -- brief summary of Sage's observation
  from_profile              TEXT,        -- for profile_transition events
  to_profile                TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sage_canvas_events_sage_session
  ON sage_canvas_events(sage_session_id);
CREATE INDEX IF NOT EXISTS idx_sage_canvas_events_vs_session
  ON sage_canvas_events(virtualspace_session_id);

-- ── Phase 5: Session recap on sage_sessions ─────────────────────────────────

ALTER TABLE sage_sessions
  ADD COLUMN IF NOT EXISTS recap_json JSONB;

-- drive_phase tracks session drive state
ALTER TABLE sage_sessions
  ADD COLUMN IF NOT EXISTS drive_phase TEXT
    CHECK (drive_phase IN ('calibration', 'activation', 'loop', 'consolidation', 'wrap-up'));

-- ── Phase 5: Lesson plans ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sage_lesson_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  subject           TEXT NOT NULL,
  level             TEXT NOT NULL,
  topic             TEXT NOT NULL,
  exam_board        TEXT,
  target_duration   INTEGER NOT NULL DEFAULT 45,     -- minutes
  difficulty        TEXT NOT NULL DEFAULT 'grade-5-6',
  created_by        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_for       UUID REFERENCES profiles(id),    -- specific student (null = template)
  phases            JSONB NOT NULL DEFAULT '[]',
  tags              TEXT[] DEFAULT '{}',
  is_template       BOOLEAN DEFAULT FALSE,
  organisation_id   UUID REFERENCES connection_groups(id) ON DELETE SET NULL,
  status            TEXT DEFAULT 'draft'
                      CHECK (status IN ('draft', 'ready', 'archived')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sage_lesson_plans_created_by
  ON sage_lesson_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_sage_lesson_plans_created_for
  ON sage_lesson_plans(created_for)
  WHERE created_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sage_lesson_plans_template
  ON sage_lesson_plans(is_template)
  WHERE is_template = TRUE;

-- ── Phase 5: Lesson plan executions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sage_lesson_plan_executions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_plan_id            UUID NOT NULL REFERENCES sage_lesson_plans(id) ON DELETE CASCADE,
  sage_session_id           UUID NOT NULL REFERENCES sage_sessions(id) ON DELETE CASCADE,
  virtualspace_session_id   UUID NOT NULL REFERENCES virtualspace_sessions(id) ON DELETE CASCADE,
  student_id                UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_phase_index       INTEGER DEFAULT 0,
  phases                    JSONB,                   -- overridden phases (null = use plan's)
  status                    TEXT DEFAULT 'in_progress'
                              CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  mastery_delta             NUMERIC(4,3),
  phases_completed          INTEGER DEFAULT 0,
  phases_struggled          INTEGER DEFAULT 0,
  started_at                TIMESTAMPTZ DEFAULT NOW(),
  completed_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sage_lpe_sage_session
  ON sage_lesson_plan_executions(sage_session_id);
CREATE INDEX IF NOT EXISTS idx_sage_lpe_student
  ON sage_lesson_plan_executions(student_id);

-- RLS: canvas events and lesson plans visible to authenticated users who own them
ALTER TABLE sage_canvas_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sage_lesson_plan_executions ENABLE ROW LEVEL SECURITY;

-- sage_canvas_events: admin-only (session data — not directly exposed to users)
CREATE POLICY "sage_canvas_events_admin_only"
  ON sage_canvas_events FOR ALL
  USING (is_admin());

-- sage_lesson_plans: owner can read/write; students can read plans created for them
CREATE POLICY "sage_lesson_plans_owner"
  ON sage_lesson_plans FOR ALL
  USING (
    is_admin()
    OR created_by = auth.uid()
    OR created_for = auth.uid()
  );

-- sage_lesson_plan_executions: student or creator
CREATE POLICY "sage_lesson_plan_executions_access"
  ON sage_lesson_plan_executions FOR ALL
  USING (
    is_admin()
    OR student_id = auth.uid()
    OR sage_session_id IN (
      SELECT id FROM sage_sessions WHERE user_id = auth.uid()
    )
  );
