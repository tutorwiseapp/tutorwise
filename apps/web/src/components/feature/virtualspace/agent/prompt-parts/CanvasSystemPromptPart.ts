/**
 * CanvasSystemPromptPart — mirrors TLDraw Agent Starter Kit PromptPartUtil.
 *
 * Generates the canvas writing instructions for the LLM system prompt.
 * Used by API routes instead of hardcoded CANVAS_INSTRUCTIONS strings,
 * so type lists and examples always stay in sync with registered ActionUtils.
 *
 * Usage in an API route:
 *   const CANVAS_INSTRUCTIONS = await getCanvasSystemPrompt();
 *
 * @module components/feature/virtualspace/agent/prompt-parts/CanvasSystemPromptPart
 */

import { AgentActionRegistry } from '../AgentActionRegistry';

let _cached: string | null = null;

/**
 * Returns the full canvas system prompt string, generated from all registered
 * ActionUtils. Result is cached after the first async call.
 */
export async function getCanvasSystemPrompt(): Promise<string> {
  if (_cached) return _cached;
  _cached = await AgentActionRegistry.buildSystemPrompt();
  return _cached;
}

/**
 * Synchronous version — returns the cached prompt or an empty string.
 * Only reliable after `getCanvasSystemPrompt()` has been awaited at least once.
 */
export function getCanvasSystemPromptSync(): string {
  return _cached ?? '';
}
