/**
 * Marketplace AI Agent
 *
 * User-created AI agents (AI Tutors) - paid, marketplace listing.
 * Inherits from BaseAgent and integrates with existing AI Tutor infrastructure.
 *
 * Features:
 * - User-created and owned
 * - Marketplace listing (published/discoverable)
 * - Subscription-based (Stripe integration)
 * - Custom materials and links
 * - 3-tier RAG (materials → links → Sage fallback)
 * - Reviews and ratings
 *
 * @module sage/agents
 */

import { BaseAgent } from './base/BaseAgent';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserInfo } from '../../cas/packages/core/src/context';
import type {
  BaseAIAgent,
  AIAgentSession,
  AIAgentMessage,
  AgentConfig,
  AgentKnowledgeSource,
} from './base/types';

// --- Marketplace AI Agent ---

export class MarketplaceAIAgent extends BaseAgent {
  constructor(agent: BaseAIAgent, config: AgentConfig) {
    super(agent, config);

    // Validate that this is a marketplace agent
    if (agent.agent_context !== 'marketplace') {
      throw new Error('MarketplaceAIAgent can only be used with marketplace-context agents');
    }
  }

  /**
   * Initialize the marketplace agent.
   * Sets up Supabase and loads custom materials/links.
   */
  async initialize(supabase?: SupabaseClient): Promise<void> {
    this.supabase = supabase;

    // Load agent-specific configuration (materials, links, settings)
    if (supabase) {
      await this.loadAgentConfiguration();
    }
  }

  /**
   * Start a new session with this AI Tutor.
   */
  async startSession(
    user: UserInfo,
    options?: {
      subject?: string;
      level?: string;
      sessionGoal?: string;
    }
  ): Promise<AIAgentSession> {
    if (!this.supabase) {
      throw new Error('Agent not initialized');
    }

    // Validate context
    const validation = this.validateSessionContext({
      subject: options?.subject,
      level: options?.level,
    });

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Check subscription if required
    if (this.requiresSubscription()) {
      const hasAccess = await this.checkUserAccess(user.id);
      if (!hasAccess) {
        throw new Error('Active subscription required to access this AI Tutor');
      }
    }

    // Create session in database
    const { data: session, error } = await this.supabase
      .from('ai_tutor_sessions')
      .insert({
        ai_tutor_id: this.agent.id,
        user_id: user.id,
        subject: options?.subject || this.agent.subject,
        level: options?.level || this.agent.level,
        session_goal: options?.sessionGoal,
        status: 'active',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    // Map to AIAgentSession format
    return {
      id: session.id,
      agent_id: this.agent.id,
      user_id: user.id,
      user_role: user.role,
      subject: session.subject,
      level: session.level,
      session_goal: session.session_goal,
      status: 'active',
      message_count: 0,
      duration_minutes: 0,
      started_at: session.started_at,
    };
  }

  /**
   * Process a message in the session.
   * Uses RAG with custom materials and links.
   */
  async processMessage(
    sessionId: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<AIAgentMessage> {
    if (!this.supabase) {
      throw new Error('Agent not initialized');
    }

    try {
      // Get session context
      const { data: session } = await this.supabase
        .from('ai_tutor_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!session) {
        throw new Error('Session not found');
      }

      // Check rate limit
      if (this.checkRateLimit(sessionId, session.message_count)) {
        throw new Error('Rate limit exceeded for this session');
      }

      // Retrieve knowledge context using RAG
      const context = await this.retrieveKnowledgeContext(message, session.user_id);

      // Generate response using LLM provider
      const response = await this.generateResponse(message, context, session);

      // Save message to database
      const { data: savedMessage } = await this.supabase
        .from('ai_tutor_messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          content: response.content,
          metadata: response.metadata,
        })
        .select()
        .single();

      // Update session message count
      await this.supabase
        .from('ai_tutor_sessions')
        .update({
          message_count: session.message_count + 1,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      // Map to AIAgentMessage format
      return {
        id: savedMessage.id,
        session_id: sessionId,
        role: 'assistant',
        content: response.content,
        metadata: response.metadata,
        created_at: savedMessage.created_at,
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
    if (!this.supabase) {
      throw new Error('Agent not initialized');
    }

    // Get session to calculate duration
    const { data: session } = await this.supabase
      .from('ai_tutor_sessions')
      .select('started_at')
      .eq('id', sessionId)
      .single();

    if (session) {
      const startTime = new Date(session.started_at);
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      // Update session
      await this.supabase
        .from('ai_tutor_sessions')
        .update({
          status: 'ended',
          ended_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', sessionId);

      // Update agent metrics
      await this.supabase
        .from('ai_tutors')
        .update({
          total_sessions: this.agent.total_sessions + 1,
          last_session_at: endTime.toISOString(),
        })
        .eq('id', this.agent.id);
    }
  }

  /**
   * Get knowledge sources for this agent.
   * Marketplace agents use: materials → links → Sage fallback.
   */
  async getKnowledgeSources(userId: string): Promise<AgentKnowledgeSource[]> {
    const sources: AgentKnowledgeSource[] = [];

    // Priority 1: Agent's custom materials
    sources.push({
      type: 'upload',
      namespace: `ai_tutor/${this.agent.id}`,
      priority: 1,
      owner_id: this.agent.owner_id,
    });

    // Priority 2: Agent's custom links
    sources.push({
      type: 'link',
      namespace: `ai_tutor_links/${this.agent.id}`,
      priority: 2,
      owner_id: this.agent.owner_id,
    });

    // Priority 3: Sage global knowledge (fallback)
    sources.push({
      type: 'global',
      namespace: 'sage/global',
      priority: 3,
    });

    return sources;
  }

  // --- Private Helper Methods ---

  /**
   * Load agent-specific configuration from database.
   */
  private async loadAgentConfiguration(): Promise<void> {
    if (!this.supabase) return;

    // Load custom materials count
    const { count: materialsCount } = await this.supabase
      .from('ai_tutor_materials')
      .select('*', { count: 'exact', head: true })
      .eq('ai_tutor_id', this.agent.id)
      .eq('embedding_status', 'completed');

    // Load custom links count
    const { count: linksCount } = await this.supabase
      .from('ai_tutor_links')
      .select('*', { count: 'exact', head: true })
      .eq('ai_tutor_id', this.agent.id)
      .eq('status', 'active');

    console.log(`[${this.agent.name}] Loaded: ${materialsCount || 0} materials, ${linksCount || 0} links`);
  }

  /**
   * Check if user has access to this paid agent.
   */
  private async checkUserAccess(userId: string): Promise<boolean> {
    if (!this.supabase) return false;

    // Check if user has active subscription
    const { data: subscription } = await this.supabase
      .from('ai_tutor_subscriptions')
      .select('status')
      .eq('ai_tutor_id', this.agent.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    return !!subscription;
  }

  /**
   * Retrieve knowledge context using RAG.
   */
  private async retrieveKnowledgeContext(query: string, userId: string): Promise<string> {
    if (!this.supabase) return '';

    try {
      // Get knowledge sources
      const sources = await this.getKnowledgeSources(userId);

      // TODO: Implement RAG retrieval using ai-tutors/rag-retrieval.ts logic
      // For now, return empty context
      return '';
    } catch (error) {
      console.error('[MarketplaceAIAgent] RAG retrieval error:', error);
      return '';
    }
  }

  /**
   * Generate LLM response.
   */
  private async generateResponse(
    message: string,
    context: string,
    session: any
  ): Promise<{ content: string; metadata: Record<string, any> }> {
    // Build system prompt based on agent type
    const systemPrompt = this.buildSystemPrompt(context);

    // TODO: Integrate with LLM provider (Gemini, DeepSeek, Claude)
    // For now, return placeholder response
    return {
      content: `I received your message: "${message}". This is a placeholder response from ${this.agent.display_name}.`,
      metadata: {
        model: this.config.provider,
        tokens: 0,
      },
    };
  }

  /**
   * Build system prompt based on agent configuration.
   */
  private buildSystemPrompt(context: string): string {
    const agentName = this.agent.display_name;
    const agentType = this.agent.agent_type;
    const subject = this.agent.subject;

    let basePrompt = `You are ${agentName}, a specialized ${agentType} for ${subject}.`;

    // Add tone guidance
    basePrompt += `\n\nTone: ${this.config.tone}`;
    basePrompt += `\nDetail level: ${this.config.detailLevel}`;

    // Add behavior guidance
    if (this.config.useExamples) {
      basePrompt += '\nUse examples to illustrate concepts.';
    }
    if (this.config.askQuestions) {
      basePrompt += '\nAsk questions to check understanding.';
    }
    if (this.config.provideHints) {
      basePrompt += '\nProvide hints rather than direct answers.';
    }

    // Add context
    if (context) {
      basePrompt += `\n\nRelevant context:\n${context}`;
    }

    return basePrompt;
  }
}

export default MarketplaceAIAgent;
