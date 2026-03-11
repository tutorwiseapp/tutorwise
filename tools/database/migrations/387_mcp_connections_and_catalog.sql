-- Migration 387: MCP Connections + Tool Catalog
-- Phase 8A — MCP Integration Framework

-- ─── mcp_connections ──────────────────────────────────────────────────────────
-- Registry of external MCP servers that agents can call tools on.
CREATE TABLE mcp_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  server_url      TEXT NOT NULL,
  transport       TEXT NOT NULL DEFAULT 'http',
  credential_type TEXT NOT NULL DEFAULT 'api_key',
  credentials     JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'active',
  last_heartbeat  TIMESTAMPTZ,
  error_message   TEXT,
  tool_count      INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB DEFAULT '{}',
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mcp_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_mcp_connections"
  ON mcp_connections FOR ALL USING (is_admin());

CREATE INDEX idx_mcp_connections_status ON mcp_connections(status);

-- ─── mcp_tool_catalog ─────────────────────────────────────────────────────────
-- Tools discovered from MCP servers via tools/list.
CREATE TABLE mcp_tool_catalog (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id   UUID NOT NULL REFERENCES mcp_connections(id) ON DELETE CASCADE,
  tool_name       TEXT NOT NULL,
  qualified_slug  TEXT UNIQUE NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  input_schema    JSONB NOT NULL DEFAULT '{}',
  enabled         BOOLEAN NOT NULL DEFAULT true,
  category        TEXT NOT NULL DEFAULT 'external',
  last_synced_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(connection_id, tool_name)
);

ALTER TABLE mcp_tool_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_mcp_tool_catalog"
  ON mcp_tool_catalog FOR ALL USING (is_admin());

CREATE INDEX idx_mcp_tool_catalog_connection ON mcp_tool_catalog(connection_id);
CREATE INDEX idx_mcp_tool_catalog_slug ON mcp_tool_catalog(qualified_slug);
CREATE INDEX idx_mcp_tool_catalog_enabled ON mcp_tool_catalog(enabled) WHERE enabled = true;
