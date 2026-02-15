/**
 * Sage Type Definitions
 *
 * Core types for the Sage AI Tutor system.
 * Role-aware tutoring with subject and level support.
 */

import type { AgentContext, UserRole } from '../../cas/packages/core/src/context';

// --- Persona Types ---

export type SagePersona = 'tutor' | 'agent' | 'client' | 'student';

export interface SagePersonaConfig {
  type: SagePersona;
  displayName: string;
  capabilities: string[];
  defaultGreeting: string;
  tone: 'encouraging' | 'professional' | 'supportive' | 'friendly';
}

// --- Subject and Level Types ---

export type SageSubject = 'maths' | 'english' | 'science' | 'general';

export type SageLevel = 'GCSE' | 'A-Level' | 'University' | 'Other';

export type SessionGoal =
  | 'homework_help'
  | 'exam_prep'
  | 'concept_review'
  | 'practice'
  | 'general';

// --- Learning Context ---

export interface LearningContext {
  studentId: string;
  subject: SageSubject;
  level: SageLevel;
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
  currentTopic?: string;
  sessionGoal?: SessionGoal;
  priorKnowledge?: string[];
  errorPatterns?: string[];
  strengths?: string[];
}

// --- Message Types ---

export interface SageMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    persona?: SagePersona;
    subject?: SageSubject;
    level?: SageLevel;
    topic?: string;
    signatureUsed?: string;
    provider?: string;
    confidence?: number;
  };
}

export interface SageConversation {
  id: string;
  userId: string;
  userRole: UserRole;
  persona: SagePersona;
  subject?: SageSubject;
  level?: SageLevel;
  learningContext?: LearningContext;
  messages: SageMessage[];
  context: AgentContext;
  topicsCovered: string[];
  startedAt: Date;
  lastActivityAt: Date;
  status: 'active' | 'paused' | 'ended';
}

// --- Session Types ---

export interface SageSession {
  sessionId: string;
  userId: string;
  userRole: UserRole;
  organisationId?: string;
  persona: SagePersona;
  subject?: SageSubject;
  level?: SageLevel;
  sessionGoal?: SessionGoal;
  context: AgentContext;
  learningContext?: LearningContext;
  activeConversation?: SageConversation;
  topicsCovered: string[];
  startedAt: Date;
  expiresAt: Date;
}

// --- Intent Types ---

export type SageIntentCategory =
  | 'explain'         // Explain a concept
  | 'solve'           // Solve a problem
  | 'practice'        // Practice exercises
  | 'diagnose'        // Diagnose errors
  | 'review'          // Review material
  | 'homework'        // Homework help
  | 'exam'            // Exam preparation
  | 'resources'       // Find resources
  | 'progress'        // Track progress
  | 'general';        // General conversation

export interface SageDetectedIntent {
  category: SageIntentCategory;
  action: string;
  confidence: number;
  entities: {
    topic?: string;
    subject?: SageSubject;
    level?: SageLevel;
    problem?: string;
    [key: string]: unknown;
  };
  requiresConfirmation: boolean;
}

// --- Response Types ---

export interface SageResponse {
  content: string;
  explanation?: string;
  examples?: string[];
  steps?: string[];
  followUpQuestions?: string[];
  suggestions?: string[];
  relatedTopics?: string[];
  practiceProblems?: string[];
  metadata?: {
    signatureUsed?: string;
    topicCovered?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
}

// --- Progress Types ---

export interface TopicProgress {
  topicId: string;
  topicName: string;
  subject: SageSubject;
  level: SageLevel;
  masteryScore: number; // 0-100
  practiceCount: number;
  correctCount: number;
  lastPracticedAt?: Date;
  errorPatterns: string[];
  strengths: string[];
}

export interface StudentProgress {
  studentId: string;
  subjects: SubjectProgress[];
  totalSessions: number;
  totalPracticeProblems: number;
  overallMastery: number;
  streak: number;
  lastActivityAt: Date;
}

export interface SubjectProgress {
  subject: SageSubject;
  level: SageLevel;
  topics: TopicProgress[];
  overallMastery: number;
  strongestTopics: string[];
  needsWork: string[];
}

// --- Upload Types ---

export interface SageUpload {
  id: string;
  ownerId: string;
  filename: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  namespace: string;
  subject?: SageSubject;
  level?: SageLevel;
  chunkCount: number;
  embeddingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  visibility: 'private' | 'shared' | 'public';
  sharedWith: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// --- API Integration Types ---

export interface SageAPIContext {
  userId: string;
  userRole: UserRole;
  persona: SagePersona;
  subject?: SageSubject;
  level?: SageLevel;
  sessionId: string;
}
