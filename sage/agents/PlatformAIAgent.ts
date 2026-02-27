/**
 * Platform AI Agent
 *
 * Platform-owned AI agents (Sage) - free, always available.
 * Inherits from BaseAgent and adds Sage-specific functionality.
 *
 * Features:
 * - Role-aware personas (tutor, student, client, agent)
 * - Subject-specific teaching (maths, english, science)
 * - Curriculum-aligned (UK GCSE/A-Level)
 * - 4-tier RAG (uploads → shared → links → global)
 * - Free for all users
 *
 * @module sage/agents
 */

import { BaseAgent } from './base/BaseAgent';
import { sageOrchestrator } from '../core/orchestrator';
import { contextResolver } from '../context';
import { knowledgeRetriever } from '../knowledge';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserInfo } from '../../cas/packages/core/src/context';
import type {
  BaseAIAgent,
  AIAgentSession,
  AIAgentMessage,
  AgentConfig,
  AgentKnowledgeSource,
} from './base/types';
import type {
  SageSubject,
  SageLevel,
  SessionGoal,
} from '../types';

// --- Platform AI Agent ---

export class PlatformAIAgent extends BaseAgent {
  constructor(agent: BaseAIAgent, config: AgentConfig) {
    super(agent, config);

    // Validate that this is a platform agent
    if (agent.agent_context !== 'platform') {
      throw new Error('PlatformAIAgent can only be used with platform-context agents');
    }
  }

  /**
   * Initialize the platform agent.
   * Sets up Supabase and knowledge retriever.
   */
  async initialize(supabase?: SupabaseClient): Promise<void> {
    this.supabase = supabase;

    // Initialize knowledge retriever
    if (supabase) {
      knowledgeRetriever.initialize(supabase);
    }
  }

  /**
   * Start a new Sage session.
   */
  async startSession(
    user: UserInfo,
    options?: {
      subject?: string;
      level?: string;
      sessionGoal?: string;
    }
  ): Promise<AIAgentSession> {
    // Validate context
    const validation = this.validateSessionContext({
      subject: options?.subject,
      level: options?.level,
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Start Sage session
    const session = await sageOrchestrator.startSession(user, {
      subject: options?.subject as SageSubject,
      level: options?.level as SageLevel,
      sessionGoal: options?.sessionGoal as SessionGoal,
    });

    // Map to AIAgentSession format
    return {
      id: session.sessionId,
      agent_id: this.agent.id,
      user_id: user.id,
      user_role: user.role,
      subject: options?.subject,
      level: options?.level,
      session_goal: options?.sessionGoal,
      status: 'active',
      message_count: 0,
      duration_minutes: 0,
      started_at: new Date().toISOString(),
    };
  }

  /**
   * Process a message in the session.
   */
  async processMessage(
    sessionId: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<AIAgentMessage> {
    try {
      // Process through Sage orchestrator
      const result = await sageOrchestrator.processMessage(sessionId, message);

      // Map to AIAgentMessage format
      return {
        id: `msg-${Date.now()}`,
        session_id: sessionId,
        role: 'assistant',
        content: result.response.content,
        metadata: {
          intent: undefined, // Sage doesn't expose intent in the same way
          confidence: result.response.metadata?.confidence,
          sources: [], // Would need to be populated from RAG sources
          tokens: undefined, // Would need to be tracked separately
        },
        created_at: new Date().toISOString(),
      };
    } catch (error: any) {
      // Return error message
      return {
        id: `msg-error-${Date.now()}`,
        session_id: sessionId,
        role: 'assistant',
        content: this.handleError(error, 'processMessage'),
        metadata: undefined,
        created_at: new Date().toISOString(),
      };
    }
  }

  /**
   * End the session.
   */
  async endSession(sessionId: string): Promise<void> {
    await sageOrchestrator.endSession(sessionId);
  }

  /**
   * Get knowledge sources for this user.
   * Platform agents use 4-tier RAG: uploads → shared → links → global.
   */
  async getKnowledgeSources(userId: string): Promise<AgentKnowledgeSource[]> {
    // Resolve context to get knowledge sources
    const context = contextResolver.resolve({
      userId,
      userRole: 'student', // Default to student for knowledge access
      subject: this.agent.subject as SageSubject,
      level: this.agent.level as SageLevel,
    });

    // Map Sage knowledge sources to agent knowledge sources
    return context.knowledgeSources.map(source => ({
      type: source.type === 'user_upload' ? 'upload' :
            source.type === 'shared' ? 'shared' : 'global',
      namespace: source.namespace,
      priority: source.priority,
      owner_id: source.ownerId,
    }));
  }

  /**
   * Update session context (subject/level/goal).
   */
  async updateSessionContext(
    sessionId: string,
    updates: {
      subject?: string;
      level?: string;
      sessionGoal?: string;
      currentTopic?: string;
    }
  ): Promise<void> {
    await sageOrchestrator.updateSessionContext(sessionId, {
      subject: updates.subject as SageSubject,
      level: updates.level as SageLevel,
      sessionGoal: updates.sessionGoal as SessionGoal,
      currentTopic: updates.currentTopic,
    });
  }

  /**
   * Check if this agent is available (platform agents are always free).
   */
  isAvailableToUser(): boolean {
    return true; // Platform agents are always available
  }

  /**
   * Platform agents never require subscription.
   */
  requiresSubscription(): boolean {
    return false;
  }
}

// --- Factory Function ---

/**
 * Create a platform AI agent for Sage.
 */
export function createPlatformAgent(
  agentType: 'tutor' | 'coursework' | 'study_buddy' | 'research_assistant' | 'exam_prep' = 'tutor',
  subject: string = 'general',
  level?: string
): PlatformAIAgent {
  const agent: BaseAIAgent = {
    id: `sage-${agentType}-${subject}`,
    owner_id: 'platform',
    name: `sage-${agentType}`,
    display_name: `Sage ${agentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    description: `Platform ${agentType} for ${subject}`,
    agent_type: agentType,
    agent_context: 'platform',
    subject,
    level,
    status: 'published',
    is_platform_owned: true,
    storage_used_mb: 0,
    storage_limit_mb: 0,
    is_featured: true,
    priority_rank: 0,
    total_sessions: 0,
    total_revenue: 0,
    total_reviews: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const config: AgentConfig = {
    provider: 'gemini',
    temperature: 0.7,
    enableRAG: true,
    knowledgeSources: [],
    topK: 10,
    minScore: 0.5,
    tone: 'encouraging',
    detailLevel: 'detailed',
    useExamples: true,
    askQuestions: true,
    provideHints: true,
  };

  return new PlatformAIAgent(agent, config);
}

export default PlatformAIAgent;
