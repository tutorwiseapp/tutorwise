/**
 * MCP Integration Framework — Type Definitions
 * Phase 8A
 */

export interface MCPConnection {
  id: string;
  slug: string;
  name: string;
  server_url: string;
  transport: 'http';
  credential_type: 'api_key' | 'oauth_delegated' | 'none';
  credentials: Record<string, string>;
  status: 'active' | 'inactive' | 'error';
  last_heartbeat: string | null;
  error_message: string | null;
  tool_count: number;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MCPToolCatalogEntry {
  id: string;
  connection_id: string;
  tool_name: string;
  qualified_slug: string;
  description: string;
  input_schema: Record<string, unknown>;
  enabled: boolean;
  category: string;
  last_synced_at: string;
  created_at: string;
}

export interface MCPToolExecution {
  id: string;
  connection_id: string;
  tool_name: string;
  qualified_slug: string;
  agent_slug: string | null;
  run_id: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: 'pending' | 'success' | 'error';
  error_message: string | null;
  duration_ms: number | null;
  context_profile_id: string | null;
  created_at: string;
}

export interface MCPToolCallContext {
  profileId?: string;
  agentSlug?: string;
  runId?: string;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}
