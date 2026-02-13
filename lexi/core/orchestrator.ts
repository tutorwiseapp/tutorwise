/**
 * Lexi Orchestrator
 *
 * Central orchestration layer for the Lexi tutoring agent.
 * Routes user requests to appropriate personas and manages
 * conversation flow through pluggable LLM providers.
 *
 * Supports multiple providers:
 * - Rules-based (offline, zero cost)
 * - Claude API (Anthropic)
 * - Gemini API (Google)
 *
 * @module lexi/core
 */

import {
  createUserContext,
  createChildContext,
  isOperationAllowed,
  type AgentContext,
  type UserInfo,
  type UserRole,
} from '../../cas/packages/core/src/context';

import {
  getDefaultProvider,
  providerFactory,
  type LLMProvider,
  type LLMProviderType,
  type LLMProviderConfig,
  type LLMMessage,
} from '../providers';

import type {
  PersonaType,
  PersonaConfig,
  LexiMessage,
  Conversation,
  DetectedIntent,
  ActionResult,
  LexiSession,
  UserPreferences,
} from '../types';

// --- Persona Configurations ---

const PERSONA_CONFIGS: Record<PersonaType, PersonaConfig> = {
  student: {
    type: 'student',
    displayName: 'Lexi (Student Assistant)',
    capabilities: [
      'lesson_scheduling',
      'homework_help',
      'progress_tracking',
      'resource_access',
      'feedback_submission',
    ],
    defaultGreeting: "Hi! I'm Lexi, your learning assistant. How can I help you today?",
    tone: 'supportive',
  },
  tutor: {
    type: 'tutor',
    displayName: 'Lexi (Tutor Dashboard)',
    capabilities: [
      'schedule_management',
      'student_overview',
      'resource_creation',
      'lesson_planning',
      'earnings_tracking',
      'analytics_access',
    ],
    defaultGreeting: "Hello! I'm Lexi, here to help you manage your tutoring practice. What would you like to do?",
    tone: 'professional',
  },
  client: {
    type: 'client',
    displayName: 'Lexi (Parent/Client Portal)',
    capabilities: [
      'tutor_search',
      'booking_management',
      'payment_handling',
      'progress_monitoring',
      'review_submission',
    ],
    defaultGreeting: "Welcome! I'm Lexi. I can help you find tutors, manage bookings, and track your child's progress.",
    tone: 'friendly',
  },
  agent: {
    type: 'agent',
    displayName: 'Lexi (Agent Assistant)',
    capabilities: [
      'user_support',
      'booking_coordination',
      'tutor_assistance',
      'client_assistance',
      'issue_resolution',
      'onboarding_help',
    ],
    defaultGreeting: "Hi! I'm Lexi, your agent assistant. Ready to help you support our users today.",
    tone: 'professional',
  },
  organisation: {
    type: 'organisation',
    displayName: 'Lexi (Organisation Admin)',
    capabilities: [
      'tutor_management',
      'student_management',
      'analytics_dashboard',
      'billing_overview',
      'settings_management',
    ],
    defaultGreeting: "Hello! I'm Lexi, your organisation assistant. How can I help manage your tutoring platform today?",
    tone: 'formal',
  },
};

// --- Orchestrator Class ---

export class LexiOrchestrator {
  private activeSessions: Map<string, LexiSession> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private provider: LLMProvider;

  constructor(providerConfig?: LLMProviderConfig) {
    // Initialize with configured provider or default
    if (providerConfig) {
      this.provider = providerFactory.create(providerConfig);
    } else {
      this.provider = getDefaultProvider();
    }
    console.log(`[Lexi] Initialized with provider: ${this.provider.name}`);
  }

  /**
   * Get current provider type
   */
  getProviderType(): LLMProviderType {
    return this.provider.type;
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Change the LLM provider
   */
  setProvider(config: LLMProviderConfig): void {
    this.provider = providerFactory.create(config);
    console.log(`[Lexi] Switched to provider: ${this.provider.name}`);
  }

  /**
   * Start a new Lexi session for a user
   */
  async startSession(userInfo: UserInfo): Promise<LexiSession> {
    const persona = this.mapRoleToPersona(userInfo.role);
    const context = createUserContext({ user: userInfo });

    const session: LexiSession = {
      sessionId: context.session!.sessionId,
      userId: userInfo.id,
      userRole: userInfo.role,
      organisationId: userInfo.organisationId,
      persona,
      context,
      preferences: this.getDefaultPreferences(),
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    this.activeSessions.set(session.sessionId, session);
    console.log(`[Lexi] Started session ${session.sessionId} for ${userInfo.role} user (provider: ${this.provider.name})`);

    return session;
  }

  /**
   * Process a user message and generate a response
   */
  async processMessage(
    sessionId: string,
    userMessage: string
  ): Promise<{ response: LexiMessage; actions?: ActionResult[] }> {
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

    // Add user message to conversation
    const userMsg = this.createMessage('user', userMessage);
    conversation.messages.push(userMsg);

    // Create child context for this interaction
    const interactionContext = createChildContext(session.context, {
      metadata: { messageId: userMsg.id },
    });

    // Detect intent using provider
    const intent = await this.provider.detectIntent(
      userMessage,
      session.persona,
      interactionContext
    );

    // Check permissions
    const operation = `${intent.category}:${intent.action}`;
    if (!isOperationAllowed(interactionContext, operation)) {
      const response = this.createMessage(
        'assistant',
        "I'm sorry, but you don't have permission to perform this action. Please contact support if you believe this is an error.",
        { intent: operation }
      );
      conversation.messages.push(response);
      return { response };
    }

    // Convert conversation messages to LLM format
    const llmMessages: LLMMessage[] = conversation.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Generate response using provider
    const result = await this.provider.complete({
      messages: llmMessages,
      persona: session.persona,
      context: interactionContext,
      intent,
    });

    // Create response message
    const response = this.createMessage('assistant', result.content, {
      persona: session.persona,
      intent: operation,
      provider: this.provider.type,
    });

    conversation.messages.push(response);
    conversation.lastActivityAt = new Date();

    return {
      response,
      actions: result.suggestions ? [{
        success: true,
        message: result.content,
        nextSteps: result.suggestions,
      }] : undefined,
    };
  }

  /**
   * Process a message with streaming response
   */
  async *processMessageStream(
    sessionId: string,
    userMessage: string
  ): AsyncGenerator<{ chunk?: string; done: boolean; response?: LexiMessage; suggestions?: string[] }> {
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

    // Add user message to conversation
    const userMsg = this.createMessage('user', userMessage);
    conversation.messages.push(userMsg);

    // Create child context for this interaction
    const interactionContext = createChildContext(session.context, {
      metadata: { messageId: userMsg.id },
    });

    // Detect intent using provider
    const intent = await this.provider.detectIntent(
      userMessage,
      session.persona,
      interactionContext
    );

    // Check permissions
    const operation = `${intent.category}:${intent.action}`;
    if (!isOperationAllowed(interactionContext, operation)) {
      const response = this.createMessage(
        'assistant',
        "I'm sorry, but you don't have permission to perform this action.",
        { intent: operation }
      );
      conversation.messages.push(response);
      yield { done: true, response };
      return;
    }

    // Convert conversation messages to LLM format
    const llmMessages: LLMMessage[] = conversation.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Stream response using provider
    let accumulatedContent = '';
    for await (const chunk of this.provider.stream({
      messages: llmMessages,
      persona: session.persona,
      context: interactionContext,
      intent,
    })) {
      if (chunk.done) {
        // Create final response message
        const response = this.createMessage('assistant', accumulatedContent, {
          persona: session.persona,
          intent: operation,
          provider: this.provider.type,
        });
        conversation.messages.push(response);
        conversation.lastActivityAt = new Date();

        yield {
          done: true,
          response,
          suggestions: this.getSuggestedNextSteps(session.persona, intent.category),
        };
      } else {
        accumulatedContent += chunk.content;
        yield { chunk: chunk.content, done: false };
      }
    }
  }

  /**
   * Get the greeting message for a session
   */
  getGreeting(sessionId: string): string {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return "Hello! I'm Lexi. How can I help you today?";
    }

    const config = PERSONA_CONFIGS[session.persona];
    return config.defaultGreeting;
  }

  /**
   * Get available capabilities for a session
   */
  getCapabilities(sessionId: string): string[] {
    const session = this.activeSessions.get(sessionId);
    if (!session) return [];

    const config = PERSONA_CONFIGS[session.persona];
    return config.capabilities;
  }

  /**
   * End a session
   */
  endSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session?.activeConversation) {
      session.activeConversation.status = 'ended';
    }
    this.activeSessions.delete(sessionId);
    console.log(`[Lexi] Ended session ${sessionId}`);
  }

  // --- Private Methods ---

  private mapRoleToPersona(role: UserRole): PersonaType {
    switch (role) {
      case 'student':
        return 'student';
      case 'tutor':
        return 'tutor';
      case 'client':
        return 'client';
      case 'agent':
        return 'agent';
      case 'organisation':
        return 'organisation';
      default:
        return 'client';
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      language: 'en',
      timezone: 'UTC',
      communicationStyle: 'concise',
      notificationsEnabled: true,
    };
  }

  private createConversation(session: LexiSession): Conversation {
    const now = new Date();
    const conversation: Conversation = {
      id: `conv_${Date.now().toString(36)}`,
      userId: session.userId,
      userRole: session.userRole,
      persona: session.persona,
      messages: [],
      context: session.context,
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
    metadata?: LexiMessage['metadata']
  ): LexiMessage {
    return {
      id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`,
      role,
      content,
      timestamp: new Date(),
      metadata,
    };
  }

  private getSuggestedNextSteps(
    persona: PersonaType,
    category: string
  ): string[] {
    const suggestions: Record<PersonaType, Record<string, string[]>> = {
      student: {
        learning: ['View homework', 'Browse resources', 'Explain a topic'],
        scheduling: ['View upcoming lessons', 'Request a new session'],
        resources: ['Browse learning materials', 'View recommended resources'],
        progress: ['View detailed progress report', 'Set new learning goals'],
        support: ['Contact your tutor', 'Report an issue'],
        billing: ['View payment history'],
        feedback: ['Rate your last lesson'],
        general: ['View your dashboard', 'See upcoming lessons'],
      },
      tutor: {
        learning: ['View student progress', 'Create new resources'],
        scheduling: ['Manage your availability', 'View upcoming sessions'],
        resources: ['Upload new materials', 'Organize your library'],
        progress: ['View teaching analytics', 'Review student feedback'],
        support: ['Access help center', 'Contact support'],
        billing: ['View earnings', 'Download tax documents'],
        feedback: ['View student reviews'],
        general: ['View your dashboard', 'Check notifications'],
      },
      client: {
        learning: ["View your child's progress"],
        scheduling: ['Book a new lesson', 'View upcoming sessions'],
        resources: ['Access shared materials'],
        progress: ['View progress report', 'Message the tutor'],
        support: ['Contact support', 'Report an issue'],
        billing: ['View invoices', 'Update payment method'],
        feedback: ['Leave a review'],
        general: ['Find tutors', 'View bookings'],
      },
      agent: {
        learning: ['Review student progress', 'Access shared resources'],
        scheduling: ['Coordinate bookings', 'Check tutor availability'],
        resources: ['Browse resource library', 'Share materials'],
        progress: ['Review user activity', 'Generate reports'],
        support: ['View support tickets', 'Assist users'],
        billing: ['Review billing issues', 'Process refunds'],
        feedback: ['Review all feedback', 'Escalate issues'],
        general: ['View support dashboard', 'Assist a user'],
      },
      organisation: {
        learning: ['View learning analytics'],
        scheduling: ['Manage organisation schedule'],
        resources: ['Manage resource library'],
        progress: ['View organisation analytics', 'Generate reports'],
        support: ['Access admin support'],
        billing: ['View organisation billing', 'Manage subscriptions'],
        feedback: ['View all feedback'],
        general: ['View admin dashboard', 'Manage users'],
      },
    };

    return suggestions[persona]?.[category] || ['How else can I help you?'];
  }
}

// --- Export Singleton ---

export const lexiOrchestrator = new LexiOrchestrator();

export default LexiOrchestrator;
