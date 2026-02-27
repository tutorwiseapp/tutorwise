/**
 * Base AI Agent Class
 *
 * Abstract base class for all AI agents (platform and marketplace).
 * Provides common functionality for session management, message processing,
 * and knowledge retrieval.
 *
 * Inheritance:
 * - PlatformAIAgent extends BaseAgent (Sage)
 * - MarketplaceAIAgent extends BaseAgent (AI Tutors)
 *
 * @module sage/agents/base
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserInfo, UserRole } from '../../../cas/packages/core/src/context';
import type {
  BaseAIAgent,
  AIAgentType,
  AIAgentContext,
  AIAgentSession,
  AIAgentMessage,
  AgentConfig,
  AgentKnowledgeSource,
} from './types';

// --- Abstract Base Agent ---

export abstract class BaseAgent {
  protected agent: BaseAIAgent;
  protected config: AgentConfig;
  protected supabase?: SupabaseClient;

  constructor(agent: BaseAIAgent, config: AgentConfig) {
    this.agent = agent;
    this.config = config;
  }

  // --- Abstract Methods (must be implemented by subclasses) ---

  /**
   * Initialize the agent with required dependencies.
   */
  abstract initialize(supabase?: SupabaseClient): Promise<void>;

  /**
   * Start a new session with a user.
   */
  abstract startSession(
    user: UserInfo,
    options?: {
      subject?: string;
      level?: string;
      sessionGoal?: string;
    }
  ): Promise<AIAgentSession>;

  /**
   * Process a message within a session.
   */
  abstract processMessage(
    sessionId: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<AIAgentMessage>;

  /**
   * End a session.
   */
  abstract endSession(sessionId: string): Promise<void>;

  /**
   * Retrieve knowledge sources for this agent.
   */
  abstract getKnowledgeSources(userId: string): Promise<AgentKnowledgeSource[]>;

  // --- Common Getters ---

  getId(): string {
    return this.agent.id;
  }

  getName(): string {
    return this.agent.name;
  }

  getDisplayName(): string {
    return this.agent.display_name;
  }

  getType(): AIAgentType {
    return this.agent.agent_type;
  }

  getContext(): AIAgentContext {
    return this.agent.agent_context;
  }

  getSubject(): string {
    return this.agent.subject;
  }

  getLevel(): string | undefined {
    return this.agent.level;
  }

  getStatus(): string {
    return this.agent.status;
  }

  isPlatformOwned(): boolean {
    return this.agent.is_platform_owned;
  }

  getConfig(): AgentConfig {
    return this.config;
  }

  // --- Common Setters ---

  setConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // --- Common Helper Methods ---

  /**
   * Check if this agent is available to a user.
   */
  isAvailableToUser(userRole: UserRole): boolean {
    // Platform agents are available to all
    if (this.agent.agent_context === 'platform') {
      return true;
    }

    // Marketplace agents must be published
    if (this.agent.status !== 'published') {
      return false;
    }

    // Check subscription if paid
    if (this.requiresSubscription()) {
      return this.agent.subscription_status === 'active';
    }

    return true;
  }

  /**
   * Check if this agent requires subscription.
   */
  requiresSubscription(): boolean {
    return this.agent.agent_context === 'marketplace' && (this.agent.price_per_hour ?? 0) > 0;
  }

  /**
   * Get greeting message for a user.
   */
  getGreeting(userName?: string): string {
    const name = userName || 'there';
    const agentName = this.agent.display_name;

    switch (this.agent.agent_type) {
      case 'tutor':
        return `Hi ${name}! I'm ${agentName}, your AI tutor. What would you like to learn today?`;
      case 'coursework':
        return `Hello ${name}! I'm ${agentName}. I can help with your coursework and assignments. What are you working on?`;
      case 'study_buddy':
        return `Hey ${name}! I'm ${agentName}, your study buddy. Ready to learn together?`;
      case 'research_assistant':
        return `Hello ${name}! I'm ${agentName}. I can help with research and writing. What's your project about?`;
      case 'exam_prep':
        return `Hi ${name}! I'm ${agentName}, your exam prep coach. Which exam are you preparing for?`;
      default:
        return `Hello ${name}! I'm ${agentName}. How can I help you today?`;
    }
  }

  /**
   * Validate session context (subject/level compatibility).
   */
  validateSessionContext(context: {
    subject?: string;
    level?: string;
  }): { valid: boolean; error?: string } {
    // Check subject compatibility
    if (context.subject && this.agent.subject !== 'general' && this.agent.subject !== context.subject) {
      return {
        valid: false,
        error: `This agent specializes in ${this.agent.subject}, not ${context.subject}`,
      };
    }

    // Check level compatibility
    if (context.level && this.agent.level && this.agent.level !== context.level) {
      return {
        valid: false,
        error: `This agent is designed for ${this.agent.level}, not ${context.level}`,
      };
    }

    return { valid: true };
  }

  /**
   * Get agent metadata as JSON.
   */
  toJSON(): Record<string, any> {
    return {
      id: this.agent.id,
      name: this.agent.name,
      display_name: this.agent.display_name,
      description: this.agent.description,
      avatar_url: this.agent.avatar_url,
      agent_type: this.agent.agent_type,
      agent_context: this.agent.agent_context,
      subject: this.agent.subject,
      level: this.agent.level,
      status: this.agent.status,
      is_platform_owned: this.agent.is_platform_owned,
      price_per_hour: this.agent.price_per_hour,
      currency: this.agent.currency,
      is_featured: this.agent.is_featured,
      avg_rating: this.agent.avg_rating,
      total_reviews: this.agent.total_reviews,
      total_sessions: this.agent.total_sessions,
      created_at: this.agent.created_at,
      updated_at: this.agent.updated_at,
    };
  }

  // --- Rate Limiting ---

  /**
   * Check if rate limit is exceeded for this session.
   */
  protected checkRateLimit(sessionId: string, messageCount: number): boolean {
    if (!this.config.rateLimit) {
      return false; // No rate limit configured
    }

    return messageCount >= this.config.rateLimit.requests;
  }

  // --- Error Handling ---

  /**
   * Handle agent errors gracefully.
   */
  protected handleError(error: any, context: string): string {
    console.error(`[${this.agent.name}] Error in ${context}:`, error);

    // Return user-friendly error message
    switch (this.agent.agent_type) {
      case 'tutor':
        return "I'm having trouble processing that right now. Could you rephrase your question?";
      case 'coursework':
        return "I encountered an issue. Could you provide more details about your assignment?";
      case 'study_buddy':
        return "Oops! Let's try that again. What would you like to study?";
      case 'research_assistant':
        return "I'm having difficulty with that request. Could you clarify what you need?";
      case 'exam_prep':
        return "Something went wrong. Let's focus on a specific exam topic.";
      default:
        return "I encountered an error. Please try again.";
    }
  }
}

export default BaseAgent;
