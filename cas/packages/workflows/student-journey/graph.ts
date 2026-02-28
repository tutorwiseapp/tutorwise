/**
 * Student Journey Workflow Graph
 *
 * LangGraph state machine for tracking student learning progress.
 * Runs as fire-and-forget after each AI agent response.
 *
 * Flow: detect_topic → assess_mastery → suggest_next → update_progress
 */

import type { StudentJourneyState } from './state';
import { initialStudentJourneyState } from './state';
import { detectTopic, assessMastery, suggestNext, updateProgress } from './nodes';

/**
 * Run the student journey workflow.
 * This is a sequential pipeline — no branching needed.
 */
export async function runStudentJourneyWorkflow(input: {
  sessionId: string;
  agentId: string;
  studentId: string;
  userMessage: string;
  assistantResponse: string;
}): Promise<StudentJourneyState> {
  let state: StudentJourneyState = {
    ...initialStudentJourneyState,
    ...input,
  };

  try {
    // Step 1: Detect topic
    const topicUpdate = await detectTopic(state);
    state = { ...state, ...topicUpdate };

    // Step 2: Assess mastery
    const masteryUpdate = await assessMastery(state);
    state = { ...state, ...masteryUpdate };

    // Step 3: Suggest next topics
    const suggestUpdate = await suggestNext(state);
    state = { ...state, ...suggestUpdate };

    // Step 4: Update progress in DB
    const progressUpdate = await updateProgress(state);
    state = { ...state, ...progressUpdate };

  } catch (error) {
    state.errors.push(error instanceof Error ? error.message : 'Unknown error');
    state.completed = true;
    state.step = 'error';
  }

  return state;
}

export { type StudentJourneyState } from './state';
