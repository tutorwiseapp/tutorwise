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
import {
  hasRecentOptimization,
  formatFewShotExamples,
  type SignatureType,
} from '../../cas/optimization/prompt-loader';

// --- Constants ---

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.7;

// RAG thresholds (matching rag-retrieval.ts)
const MATERIAL_MATCH_THRESHOLD = 0.65;
const SAGE_MATCH_THRESHOLD = 0.6;
const DEFAULT_TOP_K = 5;
const MIN_MATERIAL_RESULTS = 2;

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
      .from('ai_agent_sessions')
      .insert({
        agent_id: this.agent.id,
        client_id: user.id,
        status: 'active',
        started_at: new Date().toISOString(),
        price_paid: this.agent.price_per_hour ?? 0,
        platform_fee: 0,
        owner_earnings: this.agent.price_per_hour ?? 0,
        messages: [],
        fallback_to_sage_count: 0,
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
      subject: options?.subject || this.agent.subject,
      level: options?.level || this.agent.level,
      session_goal: options?.sessionGoal,
      status: 'active',
      message_count: 0,
      duration_minutes: 0,
      started_at: session.started_at,
    };
  }

  /**
   * Process a message in the session.
   * Uses 3-tier RAG with custom materials and links, then Gemini for response.
   */
  async processMessage(
    sessionId: string,
    message: string,
    _metadata?: Record<string, any>
  ): Promise<AIAgentMessage> {
    if (!this.supabase) {
      throw new Error('Agent not initialized');
    }

    try {
      // Get session context
      const { data: session } = await this.supabase
        .from('ai_agent_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!session) {
        throw new Error('Session not found');
      }

      // Check rate limit using message count from ai_agent_messages table
      const { count: messageCount } = await this.supabase
        .from('ai_agent_messages')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .eq('role', 'user');

      if (this.checkRateLimit(sessionId, messageCount || 0)) {
        throw new Error('Rate limit exceeded for this session');
      }

      // Get conversation history from ai_agent_messages table
      const { data: recentMessages } = await this.supabase
        .from('ai_agent_messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      const history = this.getConversationHistory(recentMessages || []);

      // Retrieve knowledge context using 3-tier RAG
      const ragResult = await this.retrieveKnowledgeContext(message);

      // Generate response using Gemini
      const response = await this.generateResponse(message, ragResult.context, history);

      // Save messages to ai_agent_messages table
      const now = new Date().toISOString();
      const userMsgId = `msg_${Date.now()}_user`;
      const assistantMsgId = `msg_${Date.now()}_asst`;

      await this.supabase.from('ai_agent_messages').insert([
        {
          id: userMsgId,
          session_id: sessionId,
          role: 'user',
          content: message,
        },
        {
          id: assistantMsgId,
          session_id: sessionId,
          role: 'assistant',
          content: response.content,
          sources: ragResult.chunks.map((chunk, idx) => ({
            index: idx + 1,
            source: chunk.source,
            metadata: chunk.metadata,
          })),
          rag_tier_used: ragResult.usedFallback ? 'sage_fallback' : 'materials',
          metadata: { provider: 'gemini', model: 'gemini-2.0-flash' },
        },
      ]);

      // Update fallback count on session if needed
      if (ragResult.usedFallback) {
        await this.supabase
          .from('ai_agent_sessions')
          .update({
            fallback_to_sage_count: (session.fallback_to_sage_count || 0) + 1,
          })
          .eq('id', sessionId);
      }

      // Map to AIAgentMessage format
      return {
        id: `msg_${Date.now()}`,
        session_id: sessionId,
        role: 'assistant',
        content: response.content,
        metadata: response.metadata,
        created_at: now,
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
      .from('ai_agent_sessions')
      .select('started_at')
      .eq('id', sessionId)
      .single();

    if (session) {
      const startTime = new Date(session.started_at);
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

      // Update session
      await this.supabase
        .from('ai_agent_sessions')
        .update({
          status: 'ended',
          ended_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', sessionId);

      // Update agent metrics
      await this.supabase
        .from('ai_agents')
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
  async getKnowledgeSources(_userId: string): Promise<AgentKnowledgeSource[]> {
    return [
      {
        type: 'upload',
        namespace: `ai_agent/${this.agent.id}`,
        priority: 1,
        owner_id: this.agent.owner_id,
      },
      {
        type: 'link',
        namespace: `ai_agent_links/${this.agent.id}`,
        priority: 2,
        owner_id: this.agent.owner_id,
      },
      {
        type: 'global',
        namespace: 'sage/global',
        priority: 3,
      },
    ];
  }

  // --- Private Helper Methods ---

  /**
   * Load agent-specific configuration from database.
   */
  private async loadAgentConfiguration(): Promise<void> {
    if (!this.supabase) return;

    // Load custom materials count
    const { count: materialsCount } = await this.supabase
      .from('ai_agent_materials')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', this.agent.id)
      .eq('status', 'ready');

    // Load custom links count
    const { count: linksCount } = await this.supabase
      .from('ai_agent_links')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', this.agent.id)
      .eq('status', 'active');

    console.log(`[${this.agent.name}] Loaded: ${materialsCount || 0} materials, ${linksCount || 0} links`);
  }

  /**
   * Check if user has access to this paid agent.
   */
  private async checkUserAccess(userId: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { data: subscription } = await this.supabase
      .from('ai_agent_subscriptions')
      .select('status')
      .eq('agent_id', this.agent.id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    return !!subscription;
  }

  /**
   * 3-tier RAG retrieval using injected Supabase client.
   * Priority: materials (vector) → links (keyword) → Sage fallback (vector)
   */
  private async retrieveKnowledgeContext(query: string): Promise<{
    context: string;
    chunks: Array<{ text: string; source: string; similarity: number; metadata: Record<string, any> }>;
    usedFallback: boolean;
  }> {
    if (!this.supabase) {
      return { context: '', chunks: [], usedFallback: false };
    }

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateQueryEmbedding(query);

      // Priority 1: Hybrid search agent's material chunks (vector + BM25)
      try {
        const { data: materialChunks, error } = await this.supabase.rpc('search_ai_agent_materials_hybrid', {
          query_embedding: JSON.stringify(queryEmbedding),
          query_text: query,
          p_agent_id: this.agent.id,
          match_threshold: 0.5,
          match_count: DEFAULT_TOP_K,
        });

        if (!error && materialChunks && materialChunks.length >= MIN_MATERIAL_RESULTS) {
          const chunks = materialChunks.map((c: any) => ({
            text: c.chunk_text,
            source: 'tutor_materials',
            similarity: c.combined_score || c.similarity,
            metadata: { file_name: c.file_name, page_number: c.page_number },
          }));
          return {
            context: this.formatContextForPrompt(chunks, 'tutor_materials'),
            chunks,
            usedFallback: false,
          };
        }
      } catch (err) {
        console.warn('[MarketplaceAIAgent] Hybrid material search failed, trying links:', err);
      }

      // Priority 2: Agent's links (keyword-filtered)
      try {
        const { data: links } = await this.supabase
          .from('ai_agent_links')
          .select('*')
          .eq('agent_id', this.agent.id)
          .eq('status', 'active')
          .order('priority', { ascending: true })
          .limit(DEFAULT_TOP_K);

        if (links && links.length > 0) {
          const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
          const relevantLinks = links.filter(link => {
            const text = `${link.title || ''} ${link.description || ''} ${(link.skills || []).join(' ')}`.toLowerCase();
            return queryWords.some(word => text.includes(word));
          });

          const linksToReturn = relevantLinks.length > 0 ? relevantLinks : links.slice(0, 2);

          if (linksToReturn.length > 0) {
            const chunks = linksToReturn.map((link: any) => ({
              text: `Reference: ${link.title || link.url}\n${link.description || ''}\nURL: ${link.url}`,
              source: 'tutor_links',
              similarity: 0.75,
              metadata: { url: link.url },
            }));
            return {
              context: this.formatContextForPrompt(chunks, 'tutor_links'),
              chunks,
              usedFallback: false,
            };
          }
        }
      } catch (err) {
        console.warn('[MarketplaceAIAgent] Link search failed, trying Sage fallback:', err);
      }

      // Priority 3: Sage global knowledge fallback
      try {
        const { data: sageChunks, error } = await this.supabase.rpc('match_sage_chunks', {
          query_embedding: JSON.stringify(queryEmbedding),
          match_threshold: SAGE_MATCH_THRESHOLD,
          match_count: DEFAULT_TOP_K,
        });

        if (!error && sageChunks && sageChunks.length > 0) {
          const chunks = sageChunks.map((c: any) => ({
            text: c.content,
            source: 'sage_fallback',
            similarity: c.similarity,
            metadata: {},
          }));
          return {
            context: this.formatContextForPrompt(chunks, 'sage_fallback'),
            chunks,
            usedFallback: true,
          };
        }
      } catch (err) {
        console.warn('[MarketplaceAIAgent] Sage fallback search failed:', err);
      }

      // No results from any tier
      return { context: '', chunks: [], usedFallback: false };
    } catch (error) {
      console.error('[MarketplaceAIAgent] RAG retrieval error:', error);
      return { context: '', chunks: [], usedFallback: false };
    }
  }

  /**
   * Generate embedding for a query using Gemini embedding API.
   * Uses gemini-embedding-001 at 768 dimensions (codebase convention).
   */
  private async generateQueryEmbedding(query: string): Promise<number[]> {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Google AI API key not configured');

    const url = `${GEMINI_API_BASE}/models/gemini-embedding-001:embedContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { role: 'user', parts: [{ text: query.slice(0, 8000) }] },
        outputDimensionality: 768,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Embedding API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.embedding.values;
  }

  /**
   * Format retrieved chunks into a context string for the LLM prompt.
   */
  private formatContextForPrompt(
    chunks: Array<{ text: string; source: string; metadata: Record<string, any> }>,
    source: string
  ): string {
    if (chunks.length === 0) return '';

    const parts: string[] = [];

    if (source === 'tutor_materials') {
      parts.push('### Knowledge from uploaded materials:\n');
    } else if (source === 'tutor_links') {
      parts.push('### Reference links:\n');
    } else if (source === 'sage_fallback') {
      parts.push('### General knowledge (Sage):\n');
    }

    for (const chunk of chunks) {
      if (chunk.metadata.file_name) {
        parts.push(`[Source: ${chunk.metadata.file_name}${chunk.metadata.page_number ? `, p.${chunk.metadata.page_number}` : ''}]`);
      }
      parts.push(chunk.text);
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Extract conversation history from ai_agent_messages rows.
   * Returns the last 10 messages for LLM context.
   */
  private getConversationHistory(
    messages: any[]
  ): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
    if (!messages || messages.length === 0) return [];

    return messages.slice(-10).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: msg.content }],
    }));
  }

  /**
   * Generate LLM response using Gemini REST API.
   * Follows the same pattern as SageGeminiProvider.
   */
  private async generateResponse(
    message: string,
    context: string,
    history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
  ): Promise<{ content: string; metadata: Record<string, any> }> {
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Google AI API key not configured');

    const model = this.config.model || DEFAULT_MODEL;
    const systemPrompt = this.buildSystemPrompt(context);

    // Build Gemini contents array (system prompt as first user/model exchange)
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // System prompt injection (Gemini doesn't have a system role)
    contents.push({
      role: 'user',
      parts: [{ text: `System instructions:\n\n${systemPrompt}\n\nPlease acknowledge these guidelines.` }],
    });
    contents.push({
      role: 'model',
      parts: [{ text: `I understand. I am ${this.agent.display_name}. I will follow these guidelines. How can I help you today?` }],
    });

    // Add conversation history
    contents.push(...history);

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: this.config.maxTokens || DEFAULT_MAX_TOKENS,
          temperature: this.config.temperature ?? DEFAULT_TEMPERATURE,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      content,
      metadata: {
        provider: 'gemini',
        model,
        tokens: {
          prompt: data.usageMetadata?.promptTokenCount || 0,
          completion: data.usageMetadata?.candidatesTokenCount || 0,
          total: data.usageMetadata?.totalTokenCount || 0,
        },
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

    // Add instructions
    basePrompt += '\n\nInstructions:';
    basePrompt += '\n- Use the context below to answer accurately';
    basePrompt += '\n- If the context doesn\'t have the answer, use your general knowledge';
    basePrompt += '\n- Cite sources using [1], [2], etc. when using context';
    basePrompt += '\n- Be educational, patient, and encouraging';
    basePrompt += '\n- Break down complex concepts step-by-step';

    // Add DSPy optimized few-shot examples if available
    if (hasRecentOptimization('sage')) {
      const signatureType = this.getSignatureType();
      const fewShot = formatFewShotExamples('sage', signatureType);
      if (fewShot) {
        basePrompt += `\n\nHere are examples of good responses:\n\n${fewShot}`;
      }
    }

    // Add context
    if (context) {
      basePrompt += `\n\n${context}`;
    }

    return basePrompt;
  }

  /**
   * Map agent subject to DSPy signature type
   */
  private getSignatureType(): SignatureType {
    const subject = (this.agent.subject || '').toLowerCase();
    if (subject.includes('math') || subject.includes('maths')) {
      return 'maths';
    }
    return 'explain';
  }
}

export default MarketplaceAIAgent;
