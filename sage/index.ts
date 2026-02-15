/**
 * Sage - AI Tutor for TutorWise
 *
 * Sage is a specialized AI tutor that provides 24/7 personalized
 * teaching assistance. It's role-aware, curriculum-aligned, and
 * learns from uploaded teaching materials.
 *
 * Key Features:
 * - Role-aware personas (Tutor/Agent/Client/Student)
 * - Subject-specific tutoring (Maths, English, Science)
 * - Curriculum-aligned (UK GCSE/A-Level specifications)
 * - RAG from uploaded materials (PowerPoints, PDFs)
 * - DSPy-optimized prompts
 * - Progress tracking and reporting
 *
 * @module sage
 */

// --- Core ---
export { SageOrchestrator, sageOrchestrator } from './core/orchestrator';

// --- Context ---
export {
  ContextResolver,
  contextResolver,
  type ResolvedContext,
  type ContextMode,
  type KnowledgeSource,
  type TeachingStyle,
  type ContextPermissions,
  type SessionContext,
} from './context';

// --- Types ---
export type {
  SagePersona,
  SagePersonaConfig,
  SageSubject,
  SageLevel,
  SessionGoal,
  LearningContext,
  SageMessage,
  SageConversation,
  SageSession,
  SageIntentCategory,
  SageDetectedIntent,
  SageResponse,
  TopicProgress,
  StudentProgress,
  SubjectProgress,
  SageUpload,
  SageAPIContext,
} from './types';

// --- Providers ---
export {
  BaseSageProvider,
  SUBJECT_PROMPTS,
  LEVEL_ADJUSTMENTS,
  PERSONA_PROMPTS,
} from './providers';

export type {
  LLMProviderType,
  LLMProviderConfig,
  LLMMessage,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
  SystemPromptContext,
  LLMProvider,
} from './providers';

// --- Subjects ---
export {
  SUBJECT_CONFIGS,
  getSubjectConfig,
  getAllSubjects,
  mathsConfig,
  englishConfig,
  scienceConfig,
  generalConfig,
} from './subjects';

export type {
  CurriculumSpec,
  TopicNode,
  TopicHierarchy,
  TopicCategory,
  Topic,
  SubjectConfig,
} from './subjects';

// --- Knowledge ---
export {
  KnowledgeRetriever,
  knowledgeRetriever,
  getNamespaceAccess,
} from './knowledge';

export type {
  KnowledgeDocument,
  DocumentType,
  DocumentChunk,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  ScoredChunk,
  KnowledgeNamespace,
  KnowledgeAccess,
} from './knowledge';

// --- Upload ---
export {
  DocumentProcessor,
  documentProcessor,
  DocumentEmbedder,
  documentEmbedder,
  detectFileType,
  isAllowedFileType,
  getAllowedExtensions,
} from './upload';

export type {
  ProcessedDocument,
  ExtractedChunk,
  EmbeddingResult,
} from './upload';

// --- Services ---
export {
  SageSessionStore,
  sessionStore,
  AccessControlService,
  accessControl,
  ProgressService,
  progressService,
  ReportService,
  reportService,
} from './services';

export type {
  StoredSession,
  StoredMessage,
  UserRelationship,
  AccessDecision,
  ProgressUpdate,
  ProgressReport,
  Achievement,
} from './services';

// --- Extensions ---
export {
  extensionRegistry,
  type SageExtension,
  type ExtensionRegistry,
} from './extensions';

// --- CAS Integration ---
export {
  createUserContext,
  isOperationAllowed,
  hasRole,
  type AgentContext,
  type UserInfo,
  type UserRole,
} from '../cas/packages/core/src/context';

// --- Quick Start API ---

import { sageOrchestrator } from './core/orchestrator';
import type { UserInfo } from '../cas/packages/core/src/context';
import type { SageSubject, SageLevel, SessionGoal } from './types';

/**
 * Start a Sage tutoring session.
 */
export async function startSageSession(
  user: UserInfo,
  options?: {
    subject?: SageSubject;
    level?: SageLevel;
    sessionGoal?: SessionGoal;
  }
) {
  return sageOrchestrator.startSession(user, options);
}

/**
 * Send a message in an existing session.
 */
export async function sendMessage(sessionId: string, message: string) {
  return sageOrchestrator.processMessage(sessionId, message);
}

/**
 * Update session context (subject/level/goal).
 */
export function updateSessionContext(
  sessionId: string,
  updates: {
    subject?: SageSubject;
    level?: SageLevel;
    sessionGoal?: SessionGoal;
    currentTopic?: string;
  }
) {
  return sageOrchestrator.updateSessionContext(sessionId, updates);
}

/**
 * End a Sage session.
 */
export function endSageSession(sessionId: string) {
  return sageOrchestrator.endSession(sessionId);
}

export default {
  startSession: startSageSession,
  sendMessage,
  updateContext: updateSessionContext,
  endSession: endSageSession,
  orchestrator: sageOrchestrator,
};
