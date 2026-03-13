-- Migration: 395_scheduler_runs.sql
-- Purpose: Execution history table for scheduler service — powers the History tab in /admin/scheduler
-- Created: 2026-03-13

CREATE TABLE IF NOT EXISTS scheduler_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id       UUID NOT NULL REFERENCES scheduled_items(id) ON DELETE CASCADE,
  status        TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  duration_ms   INTEGER,
  error         TEXT,
  result        JSONB,
  attempt       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Query runs by item
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_item_id ON scheduler_runs(item_id);

-- Query recent runs (History tab default sort)
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_started_at ON scheduler_runs(started_at DESC);

-- Filter by status
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_status ON scheduler_runs(status);

-- RLS — admin only
ALTER TABLE scheduler_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage scheduler runs" ON scheduler_runs;
CREATE POLICY "Admins can manage scheduler runs"
  ON scheduler_runs FOR ALL
  USING (is_admin());
