/**
 * ReAct Executor for AI Agent Sessions
 *
 * Intercepts TOOL_CALL patterns in LLM output, executes the tool,
 * injects the result back into the conversation, and continues.
 * Max 3 tool calls per message to prevent infinite loops.
 *
 * Pattern: TOOL_CALL: tool_name({"param": "value"})
 *
 * @module lib/ai-agents/tools/react-executor
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  executeTool,
  logToolCall,
  type AgentTool,
  type ToolExecutionContext,
} from './registry';

// Ensure handlers are registered
import './handlers';

const TOOL_CALL_REGEX = /TOOL_CALL:\s*(\S+)\((\{[\s\S]*?\})\)/;
const MAX_TOOL_ITERATIONS = 3;

export interface ReactResult {
  /** Final response text (with tool results incorporated) */
  finalResponse: string;
  /** Number of tool calls made */
  toolCallCount: number;
  /** Whether any tool calls were made */
  usedTools: boolean;
}

/**
 * Check if a response contains a tool call.
 */
export function containsToolCall(response: string): boolean {
  return TOOL_CALL_REGEX.test(response);
}

/**
 * Parse a tool call from the response.
 */
export function parseToolCall(response: string): { slug: string; params: Record<string, unknown>; fullMatch: string } | null {
  const match = response.match(TOOL_CALL_REGEX);
  if (!match) return null;

  try {
    const params = JSON.parse(match[2]);
    return {
      slug: match[1],
      params,
      fullMatch: match[0],
    };
  } catch {
    return null;
  }
}

/**
 * Execute a ReAct loop for a single user message.
 *
 * @param generateResponse - Function that calls the LLM with messages and returns text
 * @param initialResponse - The first LLM response (may contain TOOL_CALL)
 * @param tools - Available tools for this agent
 * @param context - Execution context (agentId, sessionId, etc.)
 * @param supabase - Supabase client for logging
 */
export async function executeReactLoop(
  generateResponse: (toolResult: string) => Promise<string>,
  initialResponse: string,
  tools: AgentTool[],
  context: ToolExecutionContext,
  supabase: SupabaseClient
): Promise<ReactResult> {
  let currentResponse = initialResponse;
  let toolCallCount = 0;
  const toolSlugs = new Set(tools.map(t => t.slug));

  while (toolCallCount < MAX_TOOL_ITERATIONS) {
    const toolCall = parseToolCall(currentResponse);
    if (!toolCall) break;

    // Verify tool is available to this agent
    if (!toolSlugs.has(toolCall.slug)) {
      // Tool not assigned — stop and return response as-is (minus the tool call)
      currentResponse = currentResponse.replace(toolCall.fullMatch, `[Tool "${toolCall.slug}" is not available]`);
      break;
    }

    toolCallCount++;

    // Execute the tool
    const result = await executeTool(toolCall.slug, toolCall.params, context);

    // Log the tool call (fire-and-forget)
    logToolCall(supabase, context.agentId, context.sessionId, toolCall.slug, toolCall.params, result).catch(() => {});

    // Format result for LLM
    const resultText = result.success
      ? `TOOL_RESULT (${toolCall.slug}): ${JSON.stringify(result.data)}`
      : `TOOL_ERROR (${toolCall.slug}): ${result.error}`;

    // Get next LLM response with tool result
    try {
      currentResponse = await generateResponse(resultText);
    } catch {
      // LLM failed after tool call — return what we have
      currentResponse = currentResponse.replace(
        toolCall.fullMatch,
        result.success ? JSON.stringify(result.data) : `[Tool error: ${result.error}]`
      );
      break;
    }
  }

  // Clean up any remaining unparsed tool calls
  currentResponse = currentResponse.replace(TOOL_CALL_REGEX, '[tool call limit reached]');

  return {
    finalResponse: currentResponse,
    toolCallCount,
    usedTools: toolCallCount > 0,
  };
}
