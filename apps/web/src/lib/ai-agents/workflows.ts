/**
 * Filename: lib/ai-agents/workflows.ts
 * Purpose: Fire-and-forget workflows for AI agent sessions
 * Created: 2026-02-28
 *
 * Provides quality scoring and student journey tracking as
 * background workflows that run after each AI response.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';

// ===================================================================
// QUALITY LOOP WORKFLOW
// ===================================================================

/**
 * Score an AI agent response for quality and save to database.
 * Rules-based scoring (no LLM cost).
 */
export async function runQualityLoopWorkflow(input: {
  messageId: string;
  sessionId: string;
  agentId: string;
  userMessage: string;
  assistantResponse: string;
  ragSources?: Array<{ text: string; source: string; similarity: number }>;
}): Promise<void> {
  const { messageId, sessionId, agentId, userMessage, assistantResponse, ragSources = [] } = input;
  const responseLower = assistantResponse.toLowerCase();
  const messageLower = userMessage.toLowerCase();

  // --- Relevance Score ---
  const queryWords = messageLower.split(/\s+/).filter(w => w.length > 3);
  const wordsInResponse = queryWords.filter(w => responseLower.includes(w));
  const relevanceScore = queryWords.length > 0
    ? Math.min(1.0, (wordsInResponse.length / queryWords.length) * 1.2)
    : 0.5;

  // --- Accuracy Score ---
  let accuracyScore = 0.5;
  if (ragSources.length > 0) {
    const citations = assistantResponse.match(/\[(\d+)\]/g) || [];
    if (citations.length > 0) {
      accuracyScore = Math.min(1.0, 0.6 + citations.length * 0.1);
    }
  }

  // --- Helpfulness Score ---
  let helpfulnessScore = 0.5;
  const wordCount = assistantResponse.split(/\s+/).length;
  if (wordCount > 50) helpfulnessScore += 0.1;
  if (wordCount > 100) helpfulnessScore += 0.1;
  if (/(?:step|first|second|third|then|next|finally)/i.test(assistantResponse)) helpfulnessScore += 0.1;
  if (/(?:for example|e\.g\.|such as|like this)/i.test(assistantResponse)) helpfulnessScore += 0.1;
  if (assistantResponse.includes('?')) helpfulnessScore += 0.05;
  helpfulnessScore = Math.min(1.0, helpfulnessScore);

  const overallScore = 0.3 * accuracyScore + 0.4 * relevanceScore + 0.3 * helpfulnessScore;

  // Check thresholds and generate flags
  const flags: Array<{ type: string; reason: string }> = [];
  if (relevanceScore < 0.3) flags.push({ type: 'low_relevance', reason: 'Response may not address the question' });
  if (accuracyScore < 0.3) flags.push({ type: 'low_accuracy', reason: 'Lacks source citations despite available context' });
  if (helpfulnessScore < 0.3) flags.push({ type: 'low_helpfulness', reason: 'Response lacks detail or structure' });
  if (assistantResponse.length < 20) flags.push({ type: 'too_short', reason: 'Response is unusually short' });

  // Save to database
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('ai_agent_response_quality')
    .insert({
      message_id: messageId,
      session_id: sessionId,
      agent_id: agentId,
      accuracy_score: accuracyScore,
      relevance_score: relevanceScore,
      helpfulness_score: helpfulnessScore,
      overall_score: overallScore,
      scoring_model: 'rules',
      flags,
    });

  if (error) {
    console.warn('[QualityLoop] Failed to save score:', error.message);
  }
}

// ===================================================================
// STUDENT JOURNEY WORKFLOW
// ===================================================================

// Topic detection patterns
const TOPIC_PATTERNS: Record<string, string[]> = {
  'algebra': ['equation', 'solve', 'variable', 'algebra', 'quadratic', 'linear', 'factorise', 'expand'],
  'geometry': ['triangle', 'circle', 'angle', 'area', 'perimeter', 'pythagoras', 'geometry', 'shape'],
  'calculus': ['derivative', 'integral', 'differentiate', 'limit', 'calculus', 'gradient'],
  'trigonometry': ['sin', 'cos', 'tan', 'trigonometry', 'trig'],
  'statistics': ['mean', 'median', 'mode', 'probability', 'statistics', 'standard deviation'],
  'grammar': ['grammar', 'tense', 'noun', 'verb', 'adjective', 'punctuation', 'sentence'],
  'literature': ['poem', 'novel', 'shakespeare', 'character', 'theme', 'literary', 'analysis'],
  'writing': ['essay', 'paragraph', 'thesis', 'argument', 'writing', 'draft'],
  'physics': ['force', 'energy', 'momentum', 'gravity', 'newton', 'physics', 'velocity'],
  'chemistry': ['element', 'reaction', 'molecule', 'atom', 'chemistry', 'bond', 'periodic'],
  'biology': ['cell', 'dna', 'evolution', 'photosynthesis', 'biology', 'organism', 'ecosystem'],
};

/**
 * Track student learning progress after each interaction.
 * Detects topic, estimates mastery, and updates progress.
 */
export async function runStudentJourneyWorkflow(input: {
  sessionId: string;
  agentId: string;
  studentId: string;
  userMessage: string;
  assistantResponse: string;
}): Promise<void> {
  const { sessionId, agentId, studentId, userMessage } = input;
  const messageLower = userMessage.toLowerCase();

  // Step 1: Detect topic
  let detectedTopic: string | null = null;
  let bestScore = 0;

  for (const [topic, keywords] of Object.entries(TOPIC_PATTERNS)) {
    const matches = keywords.filter(k => messageLower.includes(k)).length;
    if (matches > bestScore) {
      bestScore = matches;
      detectedTopic = topic;
    }
  }

  if (!detectedTopic || bestScore === 0) {
    return; // Can't track progress without a detected topic
  }

  const supabase = createServiceRoleClient();

  // Step 2: Load existing progress
  const { data: progress } = await supabase
    .from('ai_agent_student_progress')
    .select('mastery_level, interactions')
    .eq('agent_id', agentId)
    .eq('student_id', studentId)
    .eq('topic', detectedTopic)
    .single();

  const currentMastery = progress?.mastery_level || 0;
  const interactions = (progress?.interactions || 0) + 1;

  // Step 3: Estimate mastery change (diminishing returns)
  const learningRate = 0.05 * (1 - currentMastery);
  const masteryDelta = Math.max(0.01, learningRate);
  const newMastery = Math.min(1.0, currentMastery + masteryDelta);

  // Step 4: Upsert progress
  const { error } = await supabase
    .from('ai_agent_student_progress')
    .upsert(
      {
        agent_id: agentId,
        student_id: studentId,
        topic: detectedTopic,
        mastery_level: newMastery,
        interactions,
        last_session_id: sessionId,
        state: {
          lastMessage: userMessage.substring(0, 200),
        },
      },
      { onConflict: 'agent_id,student_id,topic' }
    );

  if (error) {
    console.warn('[StudentJourney] Failed to update progress:', error.message);
  }
}
