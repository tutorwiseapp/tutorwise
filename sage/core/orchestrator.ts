/**
 * Sage Orchestrator
 *
 * Central orchestration layer for the Sage AI Tutor.
 * Manages tutoring sessions with role-aware personas
 * and subject/level-specific teaching.
 *
 * @module sage/core
 */

import {
  createUserContext,
  createChildContext,
  isOperationAllowed,
  type AgentContext,
  type UserInfo,
  type UserRole,
} from '../../cas/packages/core/src/context';

import type {
  SagePersona,
  SagePersonaConfig,
  SageSubject,
  SageLevel,
  SessionGoal,
  SageMessage,
  SageConversation,
  SageSession,
  SageDetectedIntent,
  LearningContext,
} from '../types';

import {
  getDefaultSageProvider,
  providerFactory,
  type LLMProvider,
  type LLMProviderType,
  type LLMMessage,
} from '../providers';

import { getSignatureContext } from '../subjects/engine-executor';

// --- Persona Configurations ---

const PERSONA_CONFIGS: Record<SagePersona, SagePersonaConfig> = {
  student: {
    type: 'student',
    displayName: 'Sage (Learning Assistant)',
    capabilities: [
      'explain_concept',
      'solve_problem',
      'practice_exercises',
      'homework_help',
      'exam_prep',
      'progress_tracking',
    ],
    defaultGreeting: "Hi {name}! I'm Sage, your AI tutor. What would you like to learn today?",
    tone: 'encouraging',
  },
  tutor: {
    type: 'tutor',
    displayName: 'Sage (Teaching Assistant)',
    capabilities: [
      'lesson_planning',
      'resource_creation',
      'student_progress_review',
      'teaching_strategies',
      'worksheet_generation',
      'assessment_ideas',
    ],
    defaultGreeting: "Hello {name}! I'm Sage, here to help you prepare great lessons. What are you teaching today?",
    tone: 'professional',
  },
  client: {
    type: 'client',
    displayName: 'Sage (Parent Assistant)',
    capabilities: [
      'progress_explanation',
      'learning_support_tips',
      'resource_recommendations',
      'curriculum_overview',
    ],
    defaultGreeting: "Hello {name}! I'm Sage. I can help you understand and support your child's learning.",
    tone: 'supportive',
  },
  agent: {
    type: 'agent',
    displayName: 'Sage (Support Assistant)',
    capabilities: [
      'tutoring_info',
      'curriculum_queries',
      'student_support',
      'tutor_support',
    ],
    defaultGreeting: "Hi! I'm Sage. How can I help with tutoring-related queries?",
    tone: 'friendly',
  },
};

// --- Orchestrator Class ---

export class SageOrchestrator {
  private activeSessions: Map<string, SageSession> = new Map();
  private conversations: Map<string, SageConversation> = new Map();
  private provider: LLMProvider;
  private fallbackProviders: LLMProvider[] = [];

  constructor() {
    this.provider = getDefaultSageProvider();
    this.initializeFallbacks();
    console.log(`[Sage] Orchestrator initialized with ${this.provider.name}`);
    if (this.fallbackProviders.length > 0) {
      console.log(`[Sage] Fallback providers: ${this.fallbackProviders.map(p => p.name).join(', ')}`);
    }
  }

  /**
   * Initialize fallback provider chain: DeepSeek → Claude → Rules
   */
  private initializeFallbacks(): void {
    const fallbackOrder: LLMProviderType[] = ['deepseek', 'claude', 'rules'];
    for (const type of fallbackOrder) {
      if (type === this.provider.type) continue;
      try {
        const fb = providerFactory.create({ type });
        if (fb.isAvailable()) {
          this.fallbackProviders.push(fb);
        }
      } catch { /* Skip unavailable providers */ }
    }
  }

  /**
   * Get or update the LLM provider.
   */
  getProvider(): LLMProvider {
    return this.provider;
  }

  setProvider(provider: LLMProvider): void {
    this.provider = provider;
    console.log(`[Sage] Provider updated to ${provider.name}`);
  }

  /**
   * Start a new Sage tutoring session.
   */
  async startSession(
    userInfo: UserInfo,
    options?: {
      subject?: SageSubject;
      level?: SageLevel;
      sessionGoal?: SessionGoal;
    }
  ): Promise<SageSession> {
    const persona = this.mapRoleToPersona(userInfo.role);
    const context = createUserContext({ user: userInfo });

    const session: SageSession = {
      sessionId: context.session!.sessionId,
      userId: userInfo.id,
      userRole: userInfo.role,
      organisationId: userInfo.organisationId,
      persona,
      subject: options?.subject,
      level: options?.level,
      sessionGoal: options?.sessionGoal,
      context,
      topicsCovered: [],
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    // Initialize learning context for students
    if (persona === 'student' && options?.subject && options?.level) {
      session.learningContext = {
        studentId: userInfo.id,
        subject: options.subject,
        level: options.level,
        sessionGoal: options.sessionGoal,
      };
    }

    this.activeSessions.set(session.sessionId, session);
    console.log(
      `[Sage] Started session ${session.sessionId} for ${persona}`,
      options?.subject ? `(${options.subject} ${options.level})` : ''
    );

    return session;
  }

  /**
   * Update session subject and level.
   */
  updateSessionContext(
    sessionId: string,
    updates: {
      subject?: SageSubject;
      level?: SageLevel;
      sessionGoal?: SessionGoal;
      currentTopic?: string;
    }
  ): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    if (updates.subject) session.subject = updates.subject;
    if (updates.level) session.level = updates.level;
    if (updates.sessionGoal) session.sessionGoal = updates.sessionGoal;

    if (session.learningContext) {
      if (updates.subject) session.learningContext.subject = updates.subject;
      if (updates.level) session.learningContext.level = updates.level;
      if (updates.currentTopic) session.learningContext.currentTopic = updates.currentTopic;
    }

    return true;
  }

  /**
   * Process a user message and generate a tutoring response.
   * Uses the configured LLM provider for intelligent responses.
   */
  async processMessage(
    sessionId: string,
    userMessage: string,
    ragContext?: string
  ): Promise<{ response: SageMessage; suggestions?: string[] }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Get or create conversation
    let conversation = session.activeConversation;
    if (!conversation) {
      conversation = this.createConversation(session);
      session.activeConversation = conversation;
    }

    // Add user message
    const userMsg = this.createMessage('user', userMessage);
    conversation.messages.push(userMsg);

    // Create child context for this interaction
    const interactionContext = createChildContext(session.context, {
      metadata: { messageId: userMsg.id },
    });

    // Detect intent using provider (if available) or fallback to basic detection
    let intent: SageDetectedIntent;
    try {
      intent = await this.provider.detectIntent(
        userMessage,
        session.persona,
        interactionContext,
        session.subject,
        session.level
      );
    } catch (error) {
      console.warn('[Sage] Intent detection failed, using fallback:', error);
      intent = await this.detectIntent(userMessage, session);
    }

    // Check permissions
    const operation = `${intent.category}:${intent.action}`;
    if (!isOperationAllowed(interactionContext, operation)) {
      const response = this.createMessage(
        'assistant',
        "I'm not able to help with that request. Let me know what else I can help you learn!",
        { persona: session.persona }
      );
      conversation.messages.push(response);
      return { response };
    }

    // Build conversation history for LLM
    const llmMessages: LLMMessage[] = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Resolve DSPy signature for structured response
    let signaturePrompt: string | undefined;
    if (session.subject) {
      const sigContext = getSignatureContext(
        intent.category,
        session.subject,
        {
          topic: intent.entities.topic,
          level: session.level,
          userMessage,
        }
      );
      if (sigContext) {
        signaturePrompt = sigContext.promptEnhancement;
      }
    }

    // Combine RAG context with signature prompt
    const combinedContext = [ragContext, signaturePrompt].filter(Boolean).join('\n') || undefined;

    // Generate response using LLM provider with fallback chain
    let responseContent: string = '';
    let suggestions: string[] = [];

    const completionRequest = {
      messages: llmMessages,
      persona: session.persona,
      subject: session.subject,
      level: session.level,
      context: interactionContext,
      topic: intent.entities.topic,
      intent,
      ragContext: combinedContext,
    };

    try {
      const completion = await this.provider.complete(completionRequest);
      responseContent = completion.content;
      suggestions = completion.suggestions || this.getSuggestions(session, intent);
    } catch (primaryError) {
      console.warn(`[Sage] Primary provider ${this.provider.name} failed:`, primaryError);

      // Try fallback providers
      let recovered = false;
      for (const fallback of this.fallbackProviders) {
        try {
          console.log(`[Sage] Trying fallback provider: ${fallback.name}`);
          const completion = await fallback.complete(completionRequest);
          responseContent = completion.content;
          suggestions = completion.suggestions || this.getSuggestions(session, intent);
          recovered = true;
          break;
        } catch (fbError) {
          console.warn(`[Sage] Fallback ${fallback.name} also failed:`, fbError);
        }
      }

      if (!recovered) {
        // All providers failed — use static fallback
        responseContent = this.generateFallbackResponse(session, intent, userMessage);
        suggestions = this.getSuggestions(session, intent);
      }
    }

    const response = this.createMessage('assistant', responseContent, {
      persona: session.persona,
      subject: session.subject,
      level: session.level,
      topic: intent.entities.topic,
      provider: this.provider.type,
    });

    conversation.messages.push(response);
    conversation.lastActivityAt = new Date();

    // Track topic if detected
    if (intent.entities.topic && !conversation.topicsCovered.includes(intent.entities.topic)) {
      conversation.topicsCovered.push(intent.entities.topic);
      session.topicsCovered.push(intent.entities.topic);
    }

    return { response, suggestions };
  }

  /**
   * Get session by ID.
   */
  getSession(sessionId: string): SageSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get greeting message for a session.
   */
  getGreeting(sessionId: string): string {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return "Hello! I'm Sage, your AI tutor. What would you like to learn today?";
    }

    const config = PERSONA_CONFIGS[session.persona];
    let greeting = config.defaultGreeting;

    // Personalize greeting
    greeting = greeting.replace('{name}', 'there');

    // Add subject context
    if (session.subject && session.level) {
      greeting += ` Ready to work on ${session.subject} at ${session.level} level?`;
    }

    return greeting;
  }

  /**
   * Get capabilities for a session.
   */
  getCapabilities(sessionId: string): string[] {
    const session = this.activeSessions.get(sessionId);
    if (!session) return [];
    return PERSONA_CONFIGS[session.persona].capabilities;
  }

  /**
   * End a session.
   */
  endSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session?.activeConversation) {
      session.activeConversation.status = 'ended';
    }
    this.activeSessions.delete(sessionId);
    console.log(`[Sage] Ended session ${sessionId}`);
  }

  // --- Private Methods ---

  private mapRoleToPersona(role: UserRole): SagePersona {
    switch (role) {
      case 'student':
        return 'student';
      case 'tutor':
        return 'tutor';
      case 'client':
        return 'client';
      case 'agent':
        return 'agent';
      default:
        return 'student';
    }
  }

  private createConversation(session: SageSession): SageConversation {
    const now = new Date();
    const conversation: SageConversation = {
      id: `conv_${Date.now().toString(36)}`,
      userId: session.userId,
      userRole: session.userRole,
      persona: session.persona,
      subject: session.subject,
      level: session.level,
      learningContext: session.learningContext,
      messages: [],
      context: session.context,
      topicsCovered: [],
      startedAt: now,
      lastActivityAt: now,
      status: 'active',
    };

    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  private createMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: SageMessage['metadata']
  ): SageMessage {
    return {
      id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
      role,
      content,
      timestamp: new Date(),
      metadata,
    };
  }

  private async detectIntent(
    message: string,
    session: SageSession
  ): Promise<SageDetectedIntent> {
    // Placeholder intent detection
    const messageLower = message.toLowerCase();

    let category: SageDetectedIntent['category'] = 'general';
    let action = 'query';

    if (messageLower.includes('explain') || messageLower.includes('what is')) {
      category = 'explain';
      action = 'concept';
    } else if (messageLower.includes('solve') || messageLower.includes('calculate')) {
      category = 'solve';
      action = 'problem';
    } else if (messageLower.includes('practice') || messageLower.includes('exercise')) {
      category = 'practice';
      action = 'generate';
    } else if (messageLower.includes('homework') || messageLower.includes('assignment')) {
      category = 'homework';
      action = 'help';
    } else if (messageLower.includes('exam') || messageLower.includes('test')) {
      category = 'exam';
      action = 'prepare';
    }

    return {
      category,
      action,
      confidence: 0.8,
      entities: {
        subject: session.subject,
        level: session.level,
      },
      requiresConfirmation: false,
    };
  }

  /**
   * Generate a fallback response when the LLM provider fails.
   * Used as graceful degradation.
   */
  private generateFallbackResponse(
    session: SageSession,
    intent: SageDetectedIntent,
    _userMessage: string
  ): string {
    const subject = session.subject || 'this topic';

    if (session.persona === 'student') {
      const responses: Record<string, string> = {
        explain: `I'd love to help explain ${intent.entities.topic || subject}. Could you tell me what specific part you'd like me to clarify?`,
        solve: `Let's work through this problem together. Can you share the complete problem so I can guide you step by step?`,
        practice: `Great that you want to practice! What topic would you like practice problems for?`,
        homework: `I'm here to help with your homework. What's the question you're working on?`,
        exam: `Let's prepare for your exam. Which topics would you like to review?`,
        general: `I'm Sage, your AI tutor. How can I help you learn today?`,
      };
      return responses[intent.category] || responses.general;
    }

    if (session.persona === 'tutor') {
      return `I can help you prepare teaching materials for ${subject}. What would you like to create - lesson plans, worksheets, or assessment questions?`;
    }

    if (session.persona === 'client') {
      return `I can help you understand and support your child's learning in ${subject}. What would you like to know?`;
    }

    return `I'm Sage, here to help with ${intent.category}. How can I assist you?`;
  }

  private getSuggestions(
    session: SageSession,
    intent: SageDetectedIntent
  ): string[] {
    const suggestions: Record<SagePersona, string[]> = {
      student: [
        'Explain this differently',
        'Show me an example',
        'Give me a practice problem',
        'What should I learn next?',
      ],
      tutor: [
        'Create a worksheet',
        'Suggest teaching activities',
        'Show common misconceptions',
        'Generate assessment questions',
      ],
      client: [
        'Explain my child\'s progress',
        'How can I help at home?',
        'Recommend resources',
        'What topics are covered?',
      ],
      agent: [
        'Curriculum information',
        'How does Sage work?',
        'Student support options',
      ],
    };

    return suggestions[session.persona] || suggestions.student;
  }
}

// --- Export Singleton ---

export const sageOrchestrator = new SageOrchestrator();

export default SageOrchestrator;
