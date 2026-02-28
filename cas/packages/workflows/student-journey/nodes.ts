/**
 * Student Journey Workflow Nodes
 *
 * Node functions for the student learning journey state machine.
 * Each node takes the current state and returns a partial state update.
 */

import type { StudentJourneyState } from './state';
import { createServiceRoleClient } from '../../../../apps/web/src/utils/supabase/server';

/**
 * Detect the topic from the user message using keyword extraction.
 * In production, this could use an LLM for better topic detection.
 */
export async function detectTopic(
  state: StudentJourneyState
): Promise<Partial<StudentJourneyState>> {
  const message = state.userMessage.toLowerCase();

  // Simple keyword-based topic detection
  const topicPatterns: Record<string, string[]> = {
    'algebra': ['equation', 'solve', 'variable', 'algebra', 'quadratic', 'linear', 'factorise', 'expand'],
    'geometry': ['triangle', 'circle', 'angle', 'area', 'perimeter', 'pythagoras', 'geometry', 'shape'],
    'calculus': ['derivative', 'integral', 'differentiate', 'limit', 'calculus', 'gradient'],
    'trigonometry': ['sin', 'cos', 'tan', 'trigonometry', 'trig', 'angle'],
    'statistics': ['mean', 'median', 'mode', 'probability', 'statistics', 'standard deviation', 'data'],
    'grammar': ['grammar', 'tense', 'noun', 'verb', 'adjective', 'punctuation', 'sentence'],
    'literature': ['poem', 'novel', 'shakespeare', 'character', 'theme', 'literary', 'analysis'],
    'writing': ['essay', 'paragraph', 'thesis', 'argument', 'writing', 'draft'],
    'physics': ['force', 'energy', 'momentum', 'gravity', 'newton', 'physics', 'velocity', 'acceleration'],
    'chemistry': ['element', 'reaction', 'molecule', 'atom', 'chemistry', 'bond', 'periodic'],
    'biology': ['cell', 'dna', 'evolution', 'photosynthesis', 'biology', 'organism', 'ecosystem'],
  };

  let bestTopic: string | null = null;
  let bestScore = 0;

  for (const [topic, keywords] of Object.entries(topicPatterns)) {
    const matches = keywords.filter(k => message.includes(k)).length;
    if (matches > bestScore) {
      bestScore = matches;
      bestTopic = topic;
    }
  }

  const confidence = bestScore > 0 ? Math.min(0.5 + bestScore * 0.15, 0.95) : 0;

  return {
    detectedTopic: bestTopic,
    topicConfidence: confidence,
    step: 'topic_detected',
  };
}

/**
 * Assess the student's mastery level for the detected topic.
 * Loads existing progress and estimates mastery change.
 */
export async function assessMastery(
  state: StudentJourneyState
): Promise<Partial<StudentJourneyState>> {
  if (!state.detectedTopic || state.topicConfidence < 0.5) {
    return { step: 'mastery_assessed', masteryDelta: 0 };
  }

  const supabase = createServiceRoleClient();

  // Load existing progress
  const { data: progress } = await supabase
    .from('ai_agent_student_progress')
    .select('mastery_level, interactions')
    .eq('agent_id', state.agentId)
    .eq('student_id', state.studentId)
    .eq('topic', state.detectedTopic)
    .single();

  const currentMastery = progress?.mastery_level || 0;
  const interactions = (progress?.interactions || 0) + 1;

  // Simple mastery estimation: each interaction slightly increases mastery
  // Diminishing returns as mastery increases
  const learningRate = 0.05 * (1 - currentMastery);
  const masteryDelta = Math.max(0.01, learningRate);

  return {
    currentMastery,
    masteryDelta,
    interactions,
    step: 'mastery_assessed',
  };
}

/**
 * Suggest next topics based on current progress and mastery levels.
 */
export async function suggestNext(
  state: StudentJourneyState
): Promise<Partial<StudentJourneyState>> {
  if (!state.detectedTopic) {
    return { step: 'suggestions_ready', suggestedNextTopics: [] };
  }

  // Simple topic progression map
  const topicProgressions: Record<string, string[]> = {
    'algebra': ['geometry', 'trigonometry', 'calculus'],
    'geometry': ['trigonometry', 'calculus'],
    'trigonometry': ['calculus', 'statistics'],
    'calculus': ['statistics'],
    'grammar': ['writing', 'literature'],
    'writing': ['literature'],
    'physics': ['calculus', 'chemistry'],
    'chemistry': ['biology', 'physics'],
    'biology': ['chemistry'],
  };

  const newMastery = state.currentMastery + state.masteryDelta;
  const suggestedNextTopics: string[] = [];

  // If mastery is high enough, suggest next topics
  if (newMastery >= 0.7) {
    const nextTopics = topicProgressions[state.detectedTopic] || [];
    suggestedNextTopics.push(...nextTopics.slice(0, 2));
  }

  return {
    suggestedNextTopics,
    step: 'suggestions_ready',
  };
}

/**
 * Update the student's progress in the database.
 */
export async function updateProgress(
  state: StudentJourneyState
): Promise<Partial<StudentJourneyState>> {
  if (!state.detectedTopic || state.topicConfidence < 0.5) {
    return { completed: true, step: 'done' };
  }

  const supabase = createServiceRoleClient();
  const newMastery = Math.min(1.0, state.currentMastery + state.masteryDelta);

  // Upsert progress
  const { error } = await supabase
    .from('ai_agent_student_progress')
    .upsert(
      {
        agent_id: state.agentId,
        student_id: state.studentId,
        topic: state.detectedTopic,
        mastery_level: newMastery,
        interactions: state.interactions,
        last_session_id: state.sessionId,
        state: {
          lastMessage: state.userMessage.substring(0, 200),
          suggestedNext: state.suggestedNextTopics,
        },
      },
      { onConflict: 'agent_id,student_id,topic' }
    );

  if (error) {
    return {
      errors: [...state.errors, `Failed to update progress: ${error.message}`],
      completed: true,
      step: 'done',
    };
  }

  return { completed: true, step: 'done' };
}
