-- Migration 388: MCP Tool Executions
-- Phase 8A — Audit log for all MCP tool calls made by agents.

CREATE TABLE mcp_tool_executions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id     UUID NOT NULL REFERENCES mcp_connections(id),
  tool_name         TEXT NOT NULL,
  qualified_slug    TEXT NOT NULL,
  agent_slug        TEXT,
  run_id            UUID,
  input             JSONB NOT NULL DEFAULT '{}',
  output            JSONB,
  status            TEXT NOT NULL DEFAULT 'pending',
  error_message     TEXT,
  duration_ms       INTEGER,
  context_profile_id UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mcp_tool_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_mcp_tool_executions"
  ON mcp_tool_executions FOR ALL USING (is_admin());

CREATE INDEX idx_mcp_executions_connection ON mcp_tool_executions(connection_id);
CREATE INDEX idx_mcp_executions_agent ON mcp_tool_executions(agent_slug);
CREATE INDEX idx_mcp_executions_created ON mcp_tool_executions(created_at DESC);

-- ─── Health check cron ────────────────────────────────────────────────────────
SELECT cron.schedule(
  'mcp-health-check',
  '*/5 * * * *',
  $$SELECT net.http_post(
    url := current_setting('app.settings.app_url') || '/api/cron/mcp-health-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.settings.cron_secret')
    )
  )$$
);
