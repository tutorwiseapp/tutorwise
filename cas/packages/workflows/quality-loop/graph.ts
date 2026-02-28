/**
 * Quality Loop Workflow Graph
 *
 * Scores each AI agent response for quality.
 * Runs as fire-and-forget after each response.
 *
 * Flow: score_response → check_threshold → save_score
 */

import type { QualityLoopState } from './state';
import { initialQualityLoopState } from './state';
import { scoreResponse, checkThreshold, saveScore } from './nodes';

/**
 * Run the quality loop workflow.
 */
export async function runQualityLoopWorkflow(input: {
  messageId: string;
  sessionId: string;
  agentId: string;
  userMessage: string;
  assistantResponse: string;
  ragSources?: Array<{ text: string; source: string; similarity: number }>;
}): Promise<QualityLoopState> {
  let state: QualityLoopState = {
    ...initialQualityLoopState,
    ...input,
    ragSources: input.ragSources || [],
  };

  try {
    // Step 1: Score the response
    const scoreUpdate = await scoreResponse(state);
    state = { ...state, ...scoreUpdate };

    // Step 2: Check quality threshold
    const thresholdUpdate = await checkThreshold(state);
    state = { ...state, ...thresholdUpdate };

    // Step 3: Save score to database
    const saveUpdate = await saveScore(state);
    state = { ...state, ...saveUpdate };

  } catch (error) {
    state.errors.push(error instanceof Error ? error.message : 'Unknown error');
    state.completed = true;
    state.step = 'error';
  }

  return state;
}

export { type QualityLoopState } from './state';
