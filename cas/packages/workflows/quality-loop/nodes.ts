/**
 * Quality Loop Workflow Nodes
 *
 * Rules-based scoring nodes for response quality assessment.
 * Can be upgraded to LLM-based scoring in the future.
 */

import type { QualityLoopState } from './state';
import { createServiceRoleClient } from '../../../../apps/web/src/utils/supabase/server';

/**
 * Score the response for relevance, accuracy, and helpfulness.
 * Uses rules-based heuristics (no LLM cost).
 */
export async function scoreResponse(
  state: QualityLoopState
): Promise<Partial<QualityLoopState>> {
  const { userMessage, assistantResponse, ragSources } = state;
  const responseLower = assistantResponse.toLowerCase();
  const messageLower = userMessage.toLowerCase();

  // --- Relevance Score ---
  // Check if response addresses the user's question keywords
  const queryWords = messageLower.split(/\s+/).filter(w => w.length > 3);
  const wordsInResponse = queryWords.filter(w => responseLower.includes(w));
  const relevanceScore = queryWords.length > 0
    ? Math.min(1.0, (wordsInResponse.length / queryWords.length) * 1.2)
    : 0.5;

  // --- Accuracy Score ---
  // Check source citation and context usage
  let accuracyScore = 0.5; // baseline
  if (ragSources.length > 0) {
    // Check if citations are present ([1], [2], etc.)
    const citationPattern = /\[(\d+)\]/g;
    const citations = assistantResponse.match(citationPattern) || [];
    if (citations.length > 0) {
      accuracyScore = Math.min(1.0, 0.6 + citations.length * 0.1);
    }
  } else {
    // No sources available — can't verify accuracy, give neutral score
    accuracyScore = 0.5;
  }

  // --- Helpfulness Score ---
  let helpfulnessScore = 0.5;

  // Reward longer, more detailed responses
  const wordCount = assistantResponse.split(/\s+/).length;
  if (wordCount > 50) helpfulnessScore += 0.1;
  if (wordCount > 100) helpfulnessScore += 0.1;

  // Reward step-by-step structure
  const hasSteps = /(?:step|first|second|third|then|next|finally)/i.test(assistantResponse);
  if (hasSteps) helpfulnessScore += 0.1;

  // Reward examples
  const hasExamples = /(?:for example|e\.g\.|such as|like this)/i.test(assistantResponse);
  if (hasExamples) helpfulnessScore += 0.1;

  // Reward follow-up questions (encouraging engagement)
  const hasFollowUp = assistantResponse.includes('?');
  if (hasFollowUp) helpfulnessScore += 0.05;

  helpfulnessScore = Math.min(1.0, helpfulnessScore);

  // Overall score (weighted average)
  const overallScore = (
    0.3 * accuracyScore +
    0.4 * relevanceScore +
    0.3 * helpfulnessScore
  );

  return {
    accuracyScore,
    relevanceScore,
    helpfulnessScore,
    overallScore,
    step: 'scored',
  };
}

/**
 * Check if the response quality meets the threshold.
 * Flag low-quality responses for review.
 */
export async function checkThreshold(
  state: QualityLoopState
): Promise<Partial<QualityLoopState>> {
  const flags: Array<{ type: string; reason: string }> = [];

  if (state.relevanceScore < 0.3) {
    flags.push({ type: 'low_relevance', reason: 'Response may not address the question' });
  }

  if (state.accuracyScore < 0.3) {
    flags.push({ type: 'low_accuracy', reason: 'Response lacks source citations despite available context' });
  }

  if (state.helpfulnessScore < 0.3) {
    flags.push({ type: 'low_helpfulness', reason: 'Response lacks detail or structure' });
  }

  if (state.overallScore < 0.4) {
    flags.push({ type: 'low_overall', reason: 'Overall quality below threshold' });
  }

  // Check for very short responses (potential failures)
  if (state.assistantResponse.length < 20) {
    flags.push({ type: 'too_short', reason: 'Response is unusually short' });
  }

  return {
    flags,
    needsReview: flags.length > 0,
    step: 'threshold_checked',
  };
}

/**
 * Save the quality score to the database.
 */
export async function saveScore(
  state: QualityLoopState
): Promise<Partial<QualityLoopState>> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase
    .from('ai_agent_response_quality')
    .insert({
      message_id: state.messageId,
      session_id: state.sessionId,
      agent_id: state.agentId,
      accuracy_score: state.accuracyScore,
      relevance_score: state.relevanceScore,
      helpfulness_score: state.helpfulnessScore,
      overall_score: state.overallScore,
      scoring_model: 'rules',
      flags: state.flags,
    });

  if (error) {
    return {
      errors: [...state.errors, `Failed to save quality score: ${error.message}`],
      completed: true,
      step: 'done',
    };
  }

  return { completed: true, step: 'done' };
}
