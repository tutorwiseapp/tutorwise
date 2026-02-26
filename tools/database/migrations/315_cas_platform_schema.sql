-- Migration: CAS Platform Schema
-- Created: 2026-02-26
-- Purpose: Create database schema for CAS (Contextual Autonomous System) platform
-- Tables: Agent status, events, logs, metrics, configuration

-- ============================================================================
-- 1. Agent Status Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_agent_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'paused', 'stopped', 'error')),
  uptime_seconds INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for agent status
CREATE INDEX IF NOT EXISTS idx_agent_status_agent ON cas_agent_status(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_status_status ON cas_agent_status(status);
CREATE INDEX IF NOT EXISTS idx_agent_status_updated ON cas_agent_status(updated_at DESC);

-- RLS policies for agent status
ALTER TABLE cas_agent_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to view agent status" ON cas_agent_status
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow service role full access to agent status" ON cas_agent_status
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE cas_agent_status IS 'Current state of all CAS agents (8 agents total)';
COMMENT ON COLUMN cas_agent_status.agent_id IS 'Agent identifier: marketer, analyst, planner, developer, tester, qa, engineer, security';
COMMENT ON COLUMN cas_agent_status.uptime_seconds IS 'Total uptime in seconds since last start';

-- ============================================================================
-- 2. Event Sourcing (Complete Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for agent events
CREATE INDEX IF NOT EXISTS idx_agent_events_agent_time ON cas_agent_events(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_type ON cas_agent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_events_user ON cas_agent_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_events_created ON cas_agent_events(created_at DESC);

-- RLS policies for agent events
ALTER TABLE cas_agent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to view agent events" ON cas_agent_events
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow service role to insert agent events" ON cas_agent_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE cas_agent_events IS 'Event sourcing log for all agent operations (immutable audit trail)';
COMMENT ON COLUMN cas_agent_events.event_type IS 'Event types: started, stopped, task_created, task_completed, error, config_changed, etc.';
COMMENT ON COLUMN cas_agent_events.event_data IS 'Event payload (varies by event type)';

-- ============================================================================
-- 3. Structured Logging
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL,
  level VARCHAR(10) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for agent logs
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_time ON cas_agent_logs(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_level ON cas_agent_logs(level) WHERE level IN ('error', 'warn');
CREATE INDEX IF NOT EXISTS idx_agent_logs_timestamp ON cas_agent_logs(timestamp DESC);

-- Full-text search index on log messages
CREATE INDEX IF NOT EXISTS idx_agent_logs_search ON cas_agent_logs
  USING gin(to_tsvector('english', message));

-- RLS policies for agent logs
ALTER TABLE cas_agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to view agent logs" ON cas_agent_logs
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow service role to insert agent logs" ON cas_agent_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE cas_agent_logs IS 'Structured logs from all agents with full-text search';
COMMENT ON COLUMN cas_agent_logs.context IS 'Structured context data for log entry';

-- ============================================================================
-- 4. Time-Series Metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_metrics_timeseries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50),
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  labels JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for metrics timeseries
CREATE INDEX IF NOT EXISTS idx_metrics_agent_time ON cas_metrics_timeseries(agent_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_name_time ON cas_metrics_timeseries(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_labels ON cas_metrics_timeseries USING gin(labels);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON cas_metrics_timeseries(timestamp DESC);

-- RLS policies for metrics
ALTER TABLE cas_metrics_timeseries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to view metrics" ON cas_metrics_timeseries
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow service role to insert metrics" ON cas_metrics_timeseries
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE cas_metrics_timeseries IS 'Time-series metrics for analytics dashboards';
COMMENT ON COLUMN cas_metrics_timeseries.agent_id IS 'Agent ID (null for platform-wide metrics)';
COMMENT ON COLUMN cas_metrics_timeseries.labels IS 'Additional labels for metric filtering';

-- ============================================================================
-- 5. Agent Configuration (Versioned)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes for agent config
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_config_active ON cas_agent_config(agent_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_agent_config_agent_version ON cas_agent_config(agent_id, version DESC);

-- RLS policies for agent config
ALTER TABLE cas_agent_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to view agent config" ON cas_agent_config
  FOR SELECT USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow admins to update agent config" ON cas_agent_config
  FOR ALL USING (
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Allow service role full access to config" ON cas_agent_config
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE cas_agent_config IS 'Versioned agent configuration with rollback support';
COMMENT ON COLUMN cas_agent_config.is_active IS 'Only one active config per agent (enforced by unique index)';

-- ============================================================================
-- 6. Initialize Agent Status (8 Agents)
-- ============================================================================

INSERT INTO cas_agent_status (agent_id, status, metadata) VALUES
  ('marketer', 'running', '{"role": "Growth Manager", "description": "Analytics collection and engagement tracking"}'),
  ('analyst', 'running', '{"role": "Business Analyst", "description": "Requirements analysis and pattern extraction"}'),
  ('planner', 'running', '{"role": "Project Manager", "description": "Sprint planning and task coordination"}'),
  ('developer', 'running', '{"role": "Software Developer", "description": "Feature implementation and unit testing"}'),
  ('tester', 'running', '{"role": "QA Tester", "description": "Unit and E2E testing"}'),
  ('qa', 'running', '{"role": "QA Engineer", "description": "Quality assurance and compliance"}'),
  ('engineer', 'running', '{"role": "System Engineer", "description": "Infrastructure and deployment"}'),
  ('security', 'running', '{"role": "Security Engineer", "description": "Vulnerability scanning and security analysis"}')
ON CONFLICT (agent_id) DO NOTHING;

-- ============================================================================
-- 7. Functions for Agent Management
-- ============================================================================

-- Function: Update agent last activity timestamp
CREATE OR REPLACE FUNCTION update_agent_activity(p_agent_id VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE cas_agent_status
  SET last_activity_at = NOW(),
      updated_at = NOW()
  WHERE agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get active agents count
CREATE OR REPLACE FUNCTION get_active_agents_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM cas_agent_status WHERE status = 'running');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. Triggers for Auto-Update
-- ============================================================================

-- Trigger: Auto-update updated_at on agent status changes
CREATE OR REPLACE FUNCTION update_cas_agent_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_status_timestamp
  BEFORE UPDATE ON cas_agent_status
  FOR EACH ROW
  EXECUTE FUNCTION update_cas_agent_status_timestamp();

-- ============================================================================
-- 9. Views for Analytics
-- ============================================================================

-- View: Agent status summary
CREATE OR REPLACE VIEW cas_agent_status_summary AS
SELECT
  COUNT(*) as total_agents,
  COUNT(*) FILTER (WHERE status = 'running') as active_agents,
  COUNT(*) FILTER (WHERE status = 'stopped') as stopped_agents,
  COUNT(*) FILTER (WHERE status = 'error') as error_agents,
  ROUND(AVG(uptime_seconds) / 3600, 2) as avg_uptime_hours
FROM cas_agent_status;

-- View: Recent agent events (last 100)
CREATE OR REPLACE VIEW cas_recent_events AS
SELECT
  e.id,
  e.agent_id,
  e.event_type,
  e.event_data,
  e.created_at,
  u.email as user_email
FROM cas_agent_events e
LEFT JOIN auth.users u ON e.user_id = u.id
ORDER BY e.created_at DESC
LIMIT 100;

-- ============================================================================
-- 10. Grant Permissions
-- ============================================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION update_agent_activity TO service_role;
GRANT EXECUTE ON FUNCTION get_active_agents_count TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Summary:
-- - 5 new tables: cas_agent_status, cas_agent_events, cas_agent_logs, cas_metrics_timeseries, cas_agent_config
-- - RLS policies for admin-only access
-- - Indexes for performance
-- - 8 agents initialized (marketer, analyst, planner, developer, tester, qa, engineer, security)
-- - Helper functions and triggers
-- - Analytics views
