/**
 * MCPClientManager — Singleton
 * Manages connections to registered MCP servers, discovers tools, and executes tool calls.
 * Uses @modelcontextprotocol/sdk with HTTP+SSE (Streamable HTTP) transport.
 *
 * Connection lifecycle:
 *   1. Admin registers server → row in mcp_connections
 *   2. Admin clicks "Sync Tools" → syncTools() calls client.listTools(), upserts mcp_tool_catalog
 *   3. Agent runs → callTool() lazily connects, resolves credentials, calls client.callTool()
 *   4. Idle timeout (5 min) → client disconnected
 *   5. Admin deletes connection → cascade, client disconnected
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createServiceRoleClient } from '@/utils/supabase/server';
import { resolveCredentials } from './credential-resolver';
import type { MCPConnection, MCPToolDefinition, MCPToolCallContext } from './types';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface ClientEntry {
  connectionId: string;
  slug: string;
  client: Client;
  transport: StreamableHTTPClientTransport;
  status: 'connected' | 'disconnected' | 'error';
  lastUsed: number;
  idleTimer?: ReturnType<typeof setTimeout>;
}

class MCPClientManager {
  private clients = new Map<string, ClientEntry>();

  /**
   * Get or create a connected MCP client for the given connection slug.
   */
  private async getClient(connectionSlug: string, context?: MCPToolCallContext): Promise<ClientEntry> {
    const existing = this.clients.get(connectionSlug);
    if (existing?.status === 'connected') {
      existing.lastUsed = Date.now();
      this.resetIdleTimer(existing);
      return existing;
    }

    // Load connection from DB
    const supabase = await createServiceRoleClient();
    const { data: conn, error } = await supabase
      .from('mcp_connections')
      .select('*')
      .eq('slug', connectionSlug)
      .eq('status', 'active')
      .single();

    if (error || !conn) {
      throw new Error(`MCP connection not found or inactive: ${connectionSlug}`);
    }

    const connection = conn as MCPConnection;
    const creds = await resolveCredentials(connection, context);

    // Create transport with auth headers
    const transport = new StreamableHTTPClientTransport(
      new URL(connection.server_url),
      {
        requestInit: {
          headers: creds.headers,
        },
      }
    );

    const client = new Client(
      { name: `tutorwise-${connectionSlug}`, version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);

    const entry: ClientEntry = {
      connectionId: connection.id,
      slug: connectionSlug,
      client,
      transport,
      status: 'connected',
      lastUsed: Date.now(),
    };

    this.clients.set(connectionSlug, entry);
    this.resetIdleTimer(entry);

    // Update heartbeat
    await supabase
      .from('mcp_connections')
      .update({ last_heartbeat: new Date().toISOString(), error_message: null })
      .eq('id', connection.id);

    return entry;
  }

  /**
   * Discover tools from an MCP server and sync to mcp_tool_catalog.
   */
  async syncTools(connectionSlug: string): Promise<MCPToolDefinition[]> {
    const entry = await this.getClient(connectionSlug);
    const result = await entry.client.listTools();
    const tools: MCPToolDefinition[] = (result.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description ?? '',
      inputSchema: (t.inputSchema as Record<string, unknown>) ?? {},
    }));

    // Upsert into mcp_tool_catalog
    const supabase = await createServiceRoleClient();
    const now = new Date().toISOString();

    for (const tool of tools) {
      const qualifiedSlug = `${connectionSlug}:${tool.name}`;
      await supabase
        .from('mcp_tool_catalog')
        .upsert(
          {
            connection_id: entry.connectionId,
            tool_name: tool.name,
            qualified_slug: qualifiedSlug,
            description: tool.description,
            input_schema: tool.inputSchema,
            last_synced_at: now,
          },
          { onConflict: 'connection_id,tool_name' }
        );
    }

    // Remove tools that no longer exist on the server
    const currentToolNames = tools.map((t) => t.name);
    if (currentToolNames.length > 0) {
      await supabase
        .from('mcp_tool_catalog')
        .delete()
        .eq('connection_id', entry.connectionId)
        .not('tool_name', 'in', `(${currentToolNames.map((n) => `"${n}"`).join(',')})`);
    }

    // Update tool_count
    await supabase
      .from('mcp_connections')
      .update({ tool_count: tools.length, updated_at: now })
      .eq('id', entry.connectionId);

    return tools;
  }

  /**
   * Execute a tool on an MCP server. Logs execution to mcp_tool_executions.
   */
  async callTool(
    connectionSlug: string,
    toolName: string,
    args: Record<string, unknown>,
    context?: MCPToolCallContext
  ): Promise<unknown> {
    const supabase = await createServiceRoleClient();
    const qualifiedSlug = `${connectionSlug}:${toolName}`;
    const startTime = Date.now();

    let execId: string | undefined;

    try {
      const entry = await this.getClient(connectionSlug, context);

      // Insert pending execution record (after getClient so we have real connection_id)
      const { data: execRow } = await supabase
        .from('mcp_tool_executions')
        .insert({
          connection_id: entry.connectionId,
          tool_name: toolName,
          qualified_slug: qualifiedSlug,
          agent_slug: context?.agentSlug ?? null,
          run_id: context?.runId ?? null,
          input: args,
          status: 'pending',
          context_profile_id: context?.profileId ?? null,
        })
        .select('id')
        .single();

      execId = execRow?.id;

      const result = await entry.client.callTool({ name: toolName, arguments: args });
      const durationMs = Date.now() - startTime;

      // Extract text content from MCP result
      const output = (result.content as Array<{ type: string; text?: string }>)
        ?.filter((c) => c.type === 'text')
        .map((c) => c.text)
        .join('\n');

      let parsed: unknown;
      try {
        parsed = JSON.parse(output);
      } catch {
        parsed = { text: output };
      }

      // Update execution record
      if (execId) {
        await supabase
          .from('mcp_tool_executions')
          .update({
            output: parsed as Record<string, unknown>,
            status: 'success',
            duration_ms: durationMs,
          })
          .eq('id', execId);
      }

      return parsed;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const msg = err instanceof Error ? err.message : String(err);

      if (execId) {
        await supabase
          .from('mcp_tool_executions')
          .update({ status: 'error', error_message: msg, duration_ms: durationMs })
          .eq('id', execId);
      }

      throw new Error(`MCP tool ${qualifiedSlug} failed: ${msg}`);
    }
  }

  /**
   * Health check — verify the MCP server is reachable.
   */
  async healthCheck(connectionSlug: string): Promise<boolean> {
    const supabase = await createServiceRoleClient();
    try {
      const entry = await this.getClient(connectionSlug);
      // A successful listTools is sufficient proof of health
      await entry.client.listTools();

      await supabase
        .from('mcp_connections')
        .update({
          status: 'active',
          last_heartbeat: new Date().toISOString(),
          error_message: null,
        })
        .eq('slug', connectionSlug);

      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from('mcp_connections')
        .update({ status: 'error', error_message: msg })
        .eq('slug', connectionSlug);

      // Clean up failed client
      this.clients.delete(connectionSlug);
      return false;
    }
  }

  /**
   * Disconnect a specific client.
   */
  async disconnect(connectionSlug: string): Promise<void> {
    const entry = this.clients.get(connectionSlug);
    if (!entry) return;

    if (entry.idleTimer) clearTimeout(entry.idleTimer);

    try {
      await entry.transport.close();
    } catch {
      // Ignore close errors
    }

    this.clients.delete(connectionSlug);
  }

  /**
   * Reset idle timer — disconnects client after 5 min of inactivity.
   */
  private resetIdleTimer(entry: ClientEntry): void {
    if (entry.idleTimer) clearTimeout(entry.idleTimer);
    entry.idleTimer = setTimeout(() => {
      this.disconnect(entry.slug).catch(() => {});
    }, IDLE_TIMEOUT_MS);
  }
}

// Singleton
let instance: MCPClientManager | null = null;

export function getMCPClientManager(): MCPClientManager {
  if (!instance) {
    instance = new MCPClientManager();
  }
  return instance;
}
