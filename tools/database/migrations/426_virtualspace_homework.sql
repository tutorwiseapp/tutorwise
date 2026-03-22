-- Migration 426: Between-session homework tracking
-- Persists homework assignments set via HomeworkDialog

CREATE TABLE IF NOT EXISTS virtualspace_homework (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID NOT NULL REFERENCES virtualspace_sessions (id) ON DELETE CASCADE,
  booking_id          UUID REFERENCES bookings (id) ON DELETE SET NULL,
  student_id          UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  tutor_id            UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  text                TEXT NOT NULL,
  due_date            DATE,
  practice_questions  JSONB,             -- Sage-generated questions [{q, answer, hint}]
  google_classroom_id TEXT,              -- Posted assignment ID (if synced)
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE virtualspace_homework ENABLE ROW LEVEL SECURITY;

-- Tutor can see all homework they set
CREATE POLICY homework_tutor ON virtualspace_homework
  FOR ALL USING (tutor_id = auth.uid());

-- Student can see their own homework
CREATE POLICY homework_student ON virtualspace_homework
  FOR SELECT USING (student_id = auth.uid());

-- Student can mark their own homework complete
CREATE POLICY homework_student_update ON virtualspace_homework
  FOR UPDATE USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vhw_student  ON virtualspace_homework (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vhw_tutor    ON virtualspace_homework (tutor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vhw_session  ON virtualspace_homework (session_id);
CREATE INDEX IF NOT EXISTS idx_vhw_due_date ON virtualspace_homework (due_date) WHERE completed_at IS NULL;
