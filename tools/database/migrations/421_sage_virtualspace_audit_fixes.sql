-- Migration 421: Sage × VirtualSpace — audit fixes
-- C1: Fix RLS on sage_canvas_events (admin-only blocks all non-admin event logging)
-- C2: Add 'active' to sage_lesson_plans status CHECK
-- C4: Add updated_at to sage_lesson_plan_executions
-- L1: Add auto-update triggers for updated_at columns
-- Created: 2026-03-19

-- ── C1: Fix sage_canvas_events RLS ──────────────────────────────────────────
-- The original policy only allowed admins, causing all non-admin canvas event
-- inserts to be silently rejected. Open to the session owner.

DROP POLICY IF EXISTS "sage_canvas_events_admin_only" ON sage_canvas_events;

CREATE POLICY "sage_canvas_events_session_owner"
  ON sage_canvas_events FOR ALL
  USING (
    is_admin()
    OR sage_session_id IN (
      SELECT id FROM sage_sessions WHERE user_id = auth.uid()
    )
  );

-- ── C2: Add 'active' to sage_lesson_plans status CHECK ──────────────────────
-- The API inserts with status='active' but the migration only allows
-- 'draft'|'ready'|'archived', causing a constraint violation on every save.

ALTER TABLE sage_lesson_plans
  DROP CONSTRAINT IF EXISTS sage_lesson_plans_status_check;

ALTER TABLE sage_lesson_plans
  ADD CONSTRAINT sage_lesson_plans_status_check
  CHECK (status IN ('draft', 'active', 'ready', 'archived'));

-- ── C4: Add updated_at to sage_lesson_plan_executions ───────────────────────
-- The PATCH route sets updated_at but the column did not exist in migration 420.

ALTER TABLE sage_lesson_plan_executions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── L1: Auto-update triggers for updated_at columns ─────────────────────────

CREATE OR REPLACE FUNCTION sage_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sage_lesson_plans_updated_at ON sage_lesson_plans;
CREATE TRIGGER trg_sage_lesson_plans_updated_at
  BEFORE UPDATE ON sage_lesson_plans
  FOR EACH ROW EXECUTE FUNCTION sage_set_updated_at();

DROP TRIGGER IF EXISTS trg_sage_lpe_updated_at ON sage_lesson_plan_executions;
CREATE TRIGGER trg_sage_lpe_updated_at
  BEFORE UPDATE ON sage_lesson_plan_executions
  FOR EACH ROW EXECUTE FUNCTION sage_set_updated_at();
