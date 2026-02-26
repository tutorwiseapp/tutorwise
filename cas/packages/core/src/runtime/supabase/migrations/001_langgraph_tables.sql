/**
 * LangGraph Runtime Supabase Tables
 *
 * Creates tables for workflow state persistence, task logging,
 * agent results, events, metrics, and logs.
 *
 * Run this migration in Supabase SQL Editor
 */

-- ============================================================================
-- Workflow State Checkpoints
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  state JSONB NOT NULL,
  thread_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique version per workflow
  UNIQUE(workflow_id, version)
);

CREATE INDEX idx_workflow_states_workflow_id ON cas_workflow_states(workflow_id);
CREATE INDEX idx_workflow_states_created_at ON cas_workflow_states(created_at DESC);

COMMENT ON TABLE cas_workflow_states IS 'LangGraph workflow state checkpoints with versioning';

-- ============================================================================
-- Workflow Events
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('started', 'completed', 'failed', 'cancelled', 'checkpoint_saved')),
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_events_workflow_id ON cas_workflow_events(workflow_id);
CREATE INDEX idx_workflow_events_created_at ON cas_workflow_events(created_at DESC);
CREATE INDEX idx_workflow_events_type ON cas_workflow_events(event_type);

COMMENT ON TABLE cas_workflow_events IS 'Workflow lifecycle events';

-- ============================================================================
-- Tasks (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_tasks (
  id TEXT PRIMARY KEY,
  workflow_id TEXT,
  agent_id TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB
);

CREATE INDEX idx_tasks_agent_id ON cas_tasks(agent_id);
CREATE INDEX idx_tasks_workflow_id ON cas_tasks(workflow_id);
CREATE INDEX idx_tasks_status ON cas_tasks(status);
CREATE INDEX idx_tasks_started_at ON cas_tasks(started_at DESC);

COMMENT ON TABLE cas_tasks IS 'Task execution records';

-- ============================================================================
-- Agent Results (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_agent_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id TEXT NOT NULL REFERENCES cas_tasks(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  output JSONB NOT NULL,
  status TEXT NOT NULL,
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_results_task_id ON cas_agent_results(task_id);
CREATE INDEX idx_agent_results_agent_id ON cas_agent_results(agent_id);
CREATE INDEX idx_agent_results_created_at ON cas_agent_results(created_at DESC);

COMMENT ON TABLE cas_agent_results IS 'Agent execution results with performance metrics';

-- ============================================================================
-- Agent Events (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_events_agent_id ON cas_agent_events(agent_id);
CREATE INDEX idx_agent_events_type ON cas_agent_events(event_type);
CREATE INDEX idx_agent_events_created_at ON cas_agent_events(created_at DESC);

COMMENT ON TABLE cas_agent_events IS 'Agent lifecycle and execution events';

-- ============================================================================
-- Metrics Timeseries (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_metrics_timeseries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT,
  agent_id TEXT,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metrics_workflow_id ON cas_metrics_timeseries(workflow_id);
CREATE INDEX idx_metrics_agent_id ON cas_metrics_timeseries(agent_id);
CREATE INDEX idx_metrics_name ON cas_metrics_timeseries(metric_name);
CREATE INDEX idx_metrics_timestamp ON cas_metrics_timeseries(timestamp DESC);

COMMENT ON TABLE cas_metrics_timeseries IS 'Performance metrics timeseries data';

-- ============================================================================
-- Agent Logs (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT,
  agent_id TEXT,
  level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error')),
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_logs_workflow_id ON cas_agent_logs(workflow_id);
CREATE INDEX idx_agent_logs_agent_id ON cas_agent_logs(agent_id);
CREATE INDEX idx_agent_logs_level ON cas_agent_logs(level);
CREATE INDEX idx_agent_logs_created_at ON cas_agent_logs(created_at DESC);

COMMENT ON TABLE cas_agent_logs IS 'Structured application logs';

-- ============================================================================
-- Agent Status (if not exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS cas_agent_status (
  agent_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('running', 'stopped', 'error')),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

COMMENT ON TABLE cas_agent_status IS 'Agent runtime status';

-- ============================================================================
-- Grant Permissions (for service role)
-- ============================================================================

-- Note: Adjust permissions based on your RLS policies

-- ============================================================================
-- Cleanup (Optional)
-- ============================================================================

-- Automatically delete old workflow states after 90 days
-- CREATE OR REPLACE FUNCTION cleanup_old_workflow_states()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM cas_workflow_states
--   WHERE created_at < NOW() - INTERVAL '90 days';
-- END;
-- $$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-workflow-states', '0 2 * * *', 'SELECT cleanup_old_workflow_states()');

-- ============================================================================
-- Success
-- ============================================================================

SELECT 'LangGraph Runtime tables created successfully!' AS status;
