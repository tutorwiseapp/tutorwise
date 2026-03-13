-- Migration: 393_scheduled_items.sql
-- Purpose: General-purpose scheduler for content publishing, agent/team runs, tasks, and reminders
-- Created: 2026-03-12

CREATE TABLE IF NOT EXISTS scheduled_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  type            TEXT NOT NULL CHECK (type IN ('content', 'agent_run', 'team_run', 'task', 'reminder')),
  status          TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'failed')),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ,
  due_date        DATE,
  recurrence      TEXT CHECK (recurrence IN ('daily', 'weekly', 'biweekly', 'monthly')),
  recurrence_end  DATE,
  metadata        JSONB NOT NULL DEFAULT '{}',
  tags            TEXT[] NOT NULL DEFAULT '{}',
  color           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_scheduled_items_scheduled_at_status ON scheduled_items (scheduled_at, status);
CREATE INDEX idx_scheduled_items_type ON scheduled_items (type);
CREATE INDEX idx_scheduled_items_status ON scheduled_items (status);
CREATE INDEX idx_scheduled_items_tags ON scheduled_items USING GIN (tags);
CREATE INDEX idx_scheduled_items_created_by ON scheduled_items (created_by);

-- RLS
ALTER TABLE scheduled_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scheduled items"
  ON scheduled_items FOR ALL
  USING (is_admin());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_scheduled_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_scheduled_items_updated
  BEFORE UPDATE ON scheduled_items
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_items_timestamp();
