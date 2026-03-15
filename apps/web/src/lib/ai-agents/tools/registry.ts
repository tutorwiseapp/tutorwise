/**
 * AI Agent Tool Registry
 *
 * Loads tools from DB, validates parameters, and routes execution to handlers.
 * Used by the ReAct executor during agent sessions.
 *
 * @module lib/ai-agents/tools/registry
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// --- Types ---

export interface AgentTool {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: 'learning' | 'assessment' | 'communication' | 'planning';
  parameters_schema: Record<string, unknown>;
  handler_type: 'builtin' | 'custom';
  handler_config: Record<string, unknown>;
}

export interface ToolCallResult {
  success: boolean;
  data?: unknown;
  error?: string;
  duration_ms: number;
}

export type ToolHandler = (
  params: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<ToolCallResult>;

export interface ToolExecutionContext {
  agentId: string;
  sessionId: string;
  studentId: string;
  supabase: SupabaseClient;
}

// --- Registry ---

const handlerMap = new Map<string, ToolHandler>();

/**
 * Register a built-in tool handler.
 */
export function registerHandler(slug: string, handler: ToolHandler): void {
  handlerMap.set(slug, handler);
}

/**
 * Get all tools assigned to an agent.
 */
export async function getAgentTools(
  supabase: SupabaseClient,
  agentId: string
): Promise<AgentTool[]> {
  const { data, error } = await supabase
    .from('ai_agent_tool_assignments')
    .select(`
      tool:ai_agent_tools!tool_id (
        id, name, slug, description, category,
        parameters_schema, handler_type, handler_config
      )
    `)
    .eq('agent_id', agentId);

  if (error || !data) return [];

  return data
    .map((row: any) => row.tool)
    .filter((t: any) => t != null) as AgentTool[];
}

/**
 * Build the tools description block for the system prompt.
 */
export function buildToolsPrompt(tools: AgentTool[]): string {
  if (tools.length === 0) return '';

  const lines = [
    'AVAILABLE TOOLS:',
    'You can use tools by writing TOOL_CALL: tool_name({"param": "value"}) on its own line.',
    'Wait for the tool result before continuing. Max 3 tool calls per message.',
    '',
  ];

  for (const tool of tools) {
    const params = tool.parameters_schema as any;
    const required = params?.required || [];
    const props = params?.properties || {};

    const paramList = Object.entries(props)
      .map(([key, schema]: [string, any]) => {
        const req = required.includes(key) ? ' (required)' : ' (optional)';
        return `  - ${key}: ${schema.type}${req}`;
      })
      .join('\n');

    lines.push(`${tool.slug}: ${tool.description}`);
    if (paramList) lines.push(paramList);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Execute a tool call.
 */
export async function executeTool(
  slug: string,
  params: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolCallResult> {
  const start = Date.now();

  const handler = handlerMap.get(slug);
  if (!handler) {
    return {
      success: false,
      error: `Unknown tool: ${slug}`,
      duration_ms: Date.now() - start,
    };
  }

  try {
    const result = await handler(params, context);
    result.duration_ms = Date.now() - start;
    return result;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Tool execution failed',
      duration_ms: Date.now() - start,
    };
  }
}

/**
 * Log a tool call to the database.
 */
export async function logToolCall(
  supabase: SupabaseClient,
  agentId: string,
  sessionId: string,
  toolSlug: string,
  parameters: Record<string, unknown>,
  result: ToolCallResult
): Promise<void> {
  await supabase.from('ai_agent_tool_calls').insert({
    agent_id: agentId,
    session_id: sessionId,
    tool_slug: toolSlug,
    parameters,
    result: result.data,
    status: result.success ? 'success' : 'error',
    duration_ms: result.duration_ms,
  });
}
