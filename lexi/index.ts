/**
 * Lexi - User-Facing Tutoring Agent
 *
 * Lexi provides a friendly, persona-based interface for TutorWise users,
 * leveraging CAS (Contextual Autonomous System) agents for internal
 * functionality while presenting a user-appropriate experience.
 *
 * Architecture:
 * - Lexi (this package) - User-facing orchestration and personas
 * - CAS user-api - Permission-checked CAS functionality exposure
 * - CAS core - Context management and agent infrastructure
 *
 * @module lexi
 */

// Core exports
export { LexiOrchestrator, lexiOrchestrator } from './core/orchestrator';

// Persona exports
export { getPersona, BasePersona, StudentPersona } from './personas';

// Type exports
export type {
  PersonaType,
  PersonaConfig,
  LexiMessage,
  Conversation,
  DetectedIntent,
  IntentCategory,
  ActionResult,
  LexiSession,
  UserPreferences,
  LearningGoal,
  LessonSummary,
  BookingRequest,
  StudentProgress,
  TutorAnalytics,
} from './types';

// Re-export context utilities for convenience
export {
  createUserContext,
  isOperationAllowed,
  hasRole,
  type AgentContext,
  type UserInfo,
  type UserRole,
} from '../cas/packages/core/src/context';

// --- Quick Start API ---

import { lexiOrchestrator } from './core/orchestrator';
import type { UserInfo } from '../cas/packages/core/src/context';

/**
 * Start a Lexi session for a user
 */
export async function startLexiSession(user: UserInfo) {
  return lexiOrchestrator.startSession(user);
}

/**
 * Send a message in an existing session
 */
export async function sendMessage(sessionId: string, message: string) {
  return lexiOrchestrator.processMessage(sessionId, message);
}

/**
 * End a Lexi session
 */
export function endLexiSession(sessionId: string) {
  return lexiOrchestrator.endSession(sessionId);
}

export default {
  startSession: startLexiSession,
  sendMessage,
  endSession: endLexiSession,
  orchestrator: lexiOrchestrator,
};
