/**
 * Student Journey Workflow State
 *
 * State schema for the student learning journey workflow.
 * Tracks topic detection, mastery assessment, and learning recommendations.
 */

export interface StudentJourneyState {
  // Input
  sessionId: string;
  agentId: string;
  studentId: string;
  userMessage: string;
  assistantResponse: string;

  // Topic detection
  detectedTopic: string | null;
  topicConfidence: number;

  // Mastery assessment
  currentMastery: number;  // 0.0 - 1.0
  masteryDelta: number;    // Change from this interaction
  interactions: number;

  // Recommendations
  suggestedNextTopics: string[];
  suggestedResources: string[];

  // Workflow metadata
  step: string;
  completed: boolean;
  errors: string[];
}

export const initialStudentJourneyState: StudentJourneyState = {
  sessionId: '',
  agentId: '',
  studentId: '',
  userMessage: '',
  assistantResponse: '',
  detectedTopic: null,
  topicConfidence: 0,
  currentMastery: 0,
  masteryDelta: 0,
  interactions: 0,
  suggestedNextTopics: [],
  suggestedResources: [],
  step: 'start',
  completed: false,
  errors: [],
};
