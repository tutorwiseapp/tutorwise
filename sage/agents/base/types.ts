/**
 * Base AI Agent Types
 *
 * Unified type system for all AI agents in TutorWise.
 * Supports both platform agents (Sage) and marketplace agents (AI Tutors).
 *
 * Agent Types:
 * - tutor: General tutoring agent
 * - coursework: Coursework assistance agent
 * - study_buddy: Study companion agent
 * - research_assistant: Research and writing assistant
 * - exam_prep: Exam preparation specialist
 *
 * Agent Contexts:
 * - platform: Sage (free, platform-owned)
 * - marketplace: AI Tutors (paid, user-created)
 *
 * @module sage/agents/base
 */

import type { UserRole } from '../../../cas/packages/core/src/context';

// --- Agent Types ---

export type AIAgentType =
  | 'tutor'              // General tutoring
  | 'coursework'         // Coursework assistance
  | 'study_buddy'        // Study companion
  | 'research_assistant' // Research and writing
  | 'exam_prep';         // Exam preparation

export type AIAgentContext =
  | 'platform'           // Sage (free, platform-owned)
  | 'marketplace';       // AI Tutors (paid, user-created)

export type AIAgentStatus =
  | 'draft'              // Being created
  | 'published'          // Live and discoverable
  | 'unpublished'        // Temporarily hidden
  | 'archived'           // Soft deleted
  | 'suspended';         // Administratively disabled

// --- Base Agent Interface ---

export interface BaseAIAgent {
  id: string;
  owner_id: string;
  organisation_id?: string;

  // Identity
  name: string;                    // Unique identifier (slug)
  display_name: string;            // Public display name
  description?: string;
  avatar_url?: string;

  // Classification
  agent_type: AIAgentType;         // What kind of agent
  agent_context: AIAgentContext;   // Platform or marketplace
  subject: string;                 // Maths, English, Science, etc.
  level?: string;                  // GCSE, A-Level, etc.

  // Status
  status: AIAgentStatus;
  is_platform_owned: boolean;      // Admin-created vs user-created

  // Marketplace-specific (null for platform agents)
  price_per_hour?: number;
  currency?: string;
  subscription_status?: 'active' | 'inactive' | 'past_due' | 'canceled';

  // Storage (for materials/uploads)
  storage_used_mb: number;
  storage_limit_mb: number;

  // Features
  is_featured: boolean;
  priority_rank: number;

  // Metrics
  total_sessions: number;
  total_revenue: number;
  avg_rating?: number;
  total_reviews: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
  last_session_at?: string;
}

// --- Agent Capabilities ---

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

export type TutorCapabilities =
  | 'explain_concept'
  | 'solve_problem'
  | 'practice_exercises'
  | 'homework_help'
  | 'exam_prep'
  | 'progress_tracking';

export type CourseworkCapabilities =
  | 'essay_feedback'
  | 'research_help'
  | 'citation_assistance'
  | 'proofreading'
  | 'structure_guidance'
  | 'plagiarism_awareness';

export type StudyBuddyCapabilities =
  | 'flashcard_generation'
  | 'quiz_creation'
  | 'study_scheduling'
  | 'motivation_support'
  | 'revision_strategies'
  | 'memory_techniques';

export type ResearchAssistantCapabilities =
  | 'literature_review'
  | 'source_evaluation'
  | 'note_organization'
  | 'argument_development'
  | 'data_analysis'
  | 'writing_assistance';

export type ExamPrepCapabilities =
  | 'past_paper_practice'
  | 'mark_scheme_analysis'
  | 'exam_technique'
  | 'time_management'
  | 'stress_management'
  | 'revision_planning';

// --- Session Context ---

export interface AIAgentSession {
  id: string;
  agent_id: string;
  user_id: string;
  user_role: UserRole;

  // Context
  subject?: string;
  level?: string;
  topic?: string;
  session_goal?: string;

  // State
  status: 'active' | 'ended' | 'escalated';
  message_count: number;
  duration_minutes: number;

  // Timestamps
  started_at: string;
  ended_at?: string;
  last_message_at?: string;
}

// --- Message Types ---

export interface AIAgentMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;

  // Metadata
  metadata?: {
    intent?: string;
    confidence?: number;
    sources?: string[];
    tokens?: number;
  };

  created_at: string;
}

// --- Knowledge Sources ---

export interface AgentKnowledgeSource {
  type: 'upload' | 'link' | 'shared' | 'global';
  namespace: string;
  priority: number;
  owner_id?: string;
}

// --- CRUD Operations ---

export interface CreateAIAgentInput {
  name: string;
  display_name: string;
  description?: string;
  avatar_url?: string;
  agent_type: AIAgentType;
  agent_context: AIAgentContext;
  subject: string;
  level?: string;
  price_per_hour?: number;
  skills?: string[];
}

export interface UpdateAIAgentInput {
  display_name?: string;
  description?: string;
  avatar_url?: string;
  subject?: string;
  level?: string;
  price_per_hour?: number;
}

// --- Agent Configuration ---

export interface AgentConfig {
  // LLM Provider
  provider: 'gemini' | 'deepseek' | 'claude';
  model?: string;
  temperature?: number;
  maxTokens?: number;

  // RAG Configuration
  enableRAG: boolean;
  knowledgeSources: AgentKnowledgeSource[];
  topK?: number;
  minScore?: number;

  // Behavior
  tone: 'encouraging' | 'professional' | 'supportive' | 'friendly';
  detailLevel: 'concise' | 'detailed' | 'comprehensive';
  useExamples: boolean;
  askQuestions: boolean;
  provideHints: boolean;

  // Limits
  maxMessagesPerSession?: number;
  maxSessionDuration?: number;
  rateLimit?: {
    requests: number;
    window: number;
  };
}

// --- Type Guards ---

export function isPlatformAgent(agent: BaseAIAgent): boolean {
  return agent.agent_context === 'platform';
}

export function isMarketplaceAgent(agent: BaseAIAgent): boolean {
  return agent.agent_context === 'marketplace';
}

export function requiresSubscription(agent: BaseAIAgent): boolean {
  return isMarketplaceAgent(agent) && (agent.price_per_hour ?? 0) > 0;
}

// --- Agent Type Metadata ---

export const AGENT_TYPE_METADATA: Record<AIAgentType, {
  label: string;
  description: string;
  capabilities: readonly string[];
  defaultSubject?: string;
}> = {
  tutor: {
    label: 'AI Tutor',
    description: 'General tutoring across subjects and levels',
    capabilities: ['explain_concept', 'solve_problem', 'homework_help', 'exam_prep'],
  },
  coursework: {
    label: 'Coursework Assistant',
    description: 'Help with essays, projects, and assignments',
    capabilities: ['essay_feedback', 'research_help', 'proofreading', 'structure_guidance'],
    defaultSubject: 'english',
  },
  study_buddy: {
    label: 'Study Buddy',
    description: 'Interactive study companion and revision helper',
    capabilities: ['flashcard_generation', 'quiz_creation', 'revision_strategies', 'motivation_support'],
  },
  research_assistant: {
    label: 'Research Assistant',
    description: 'Academic research and writing support',
    capabilities: ['literature_review', 'source_evaluation', 'argument_development', 'writing_assistance'],
    defaultSubject: 'general',
  },
  exam_prep: {
    label: 'Exam Prep Coach',
    description: 'Specialized exam preparation and technique',
    capabilities: ['past_paper_practice', 'exam_technique', 'time_management', 'revision_planning'],
  },
};

// --- Exports ---

export type {
  BaseAIAgent as AIAgent,
  AIAgentSession as AgentSession,
  AIAgentMessage as AgentMessage,
  AgentKnowledgeSource as KnowledgeSource,
};
