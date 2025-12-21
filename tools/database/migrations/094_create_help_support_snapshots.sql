/**
 * Migration: Create Help Centre Support Snapshots System
 * Purpose: Store context-driven bug reports from Help Centre
 * Created: 2025-01-21
 * Phase: Help Centre Phase 3 - Context-driven support
 */

-- Create help_support_snapshots table
CREATE TABLE IF NOT EXISTS help_support_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- User-provided context
  action TEXT NOT NULL,
  issue TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('blocking', 'degraded', 'minor')),

  -- Capture metadata
  capture_level TEXT NOT NULL CHECK (capture_level IN ('minimal', 'standard', 'diagnostic')),
  page_url TEXT NOT NULL,
  page_title TEXT NOT NULL,
  user_role TEXT,

  -- Captured data
  screenshot_url TEXT,
  network_logs JSONB,
  console_logs JSONB,
  user_agent TEXT,
  viewport_size TEXT,

  -- Jira integration
  jira_ticket_key TEXT,
  jira_ticket_url TEXT,
  jira_sync_status TEXT DEFAULT 'pending' CHECK (jira_sync_status IN ('pending', 'synced', 'failed')),
  jira_synced_at TIMESTAMPTZ,
  jira_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_help_support_snapshots_user_id
  ON help_support_snapshots(user_id);

CREATE INDEX IF NOT EXISTS idx_help_support_snapshots_impact
  ON help_support_snapshots(impact);

CREATE INDEX IF NOT EXISTS idx_help_support_snapshots_jira_status
  ON help_support_snapshots(jira_sync_status);

CREATE INDEX IF NOT EXISTS idx_help_support_snapshots_created_at
  ON help_support_snapshots(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_help_support_snapshots_jira_ticket_key
  ON help_support_snapshots(jira_ticket_key) WHERE jira_ticket_key IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE help_support_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own snapshots
CREATE POLICY "Users can view own snapshots"
  ON help_support_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can create their own snapshots
CREATE POLICY "Users can create snapshots"
  ON help_support_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: System can update for Jira sync (service role)
CREATE POLICY "System can update jira sync status"
  ON help_support_snapshots
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_help_support_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row updates
CREATE TRIGGER update_help_support_snapshots_updated_at
  BEFORE UPDATE ON help_support_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_help_support_snapshots_updated_at();

-- Add helpful comment
COMMENT ON TABLE help_support_snapshots IS 'Stores context-driven bug reports from Help Centre with Jira integration';
COMMENT ON COLUMN help_support_snapshots.action IS 'What the user was trying to do';
COMMENT ON COLUMN help_support_snapshots.issue IS 'What went wrong (1 sentence)';
COMMENT ON COLUMN help_support_snapshots.impact IS 'Impact level: blocking, degraded, or minor';
COMMENT ON COLUMN help_support_snapshots.capture_level IS 'Data capture level: minimal, standard, or diagnostic';
COMMENT ON COLUMN help_support_snapshots.jira_sync_status IS 'Jira ticket creation status: pending, synced, or failed';
