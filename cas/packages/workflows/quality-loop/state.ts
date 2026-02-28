/**
 * Quality Loop Workflow State
 *
 * State schema for the response quality scoring workflow.
 */

export interface QualityLoopState {
  // Input
  messageId: string;
  sessionId: string;
  agentId: string;
  userMessage: string;
  assistantResponse: string;
  ragSources: Array<{ text: string; source: string; similarity: number }>;

  // Scoring
  accuracyScore: number;
  relevanceScore: number;
  helpfulnessScore: number;
  overallScore: number;

  // Flagging
  flags: Array<{ type: string; reason: string }>;
  needsReview: boolean;

  // Workflow metadata
  step: string;
  completed: boolean;
  errors: string[];
}

export const initialQualityLoopState: QualityLoopState = {
  messageId: '',
  sessionId: '',
  agentId: '',
  userMessage: '',
  assistantResponse: '',
  ragSources: [],
  accuracyScore: 0,
  relevanceScore: 0,
  helpfulnessScore: 0,
  overallScore: 0,
  flags: [],
  needsReview: false,
  step: 'start',
  completed: false,
  errors: [],
};
