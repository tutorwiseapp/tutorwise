/**
 * Sage Session Service
 *
 * Manages tutoring sessions with Redis persistence.
 *
 * @module sage/services
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  SageSession,
  SagePersona,
  SageSubject,
  SageLevel,
  SessionGoal,
  SageMessage,
  SageConversation,
} from '../types';

// --- Session Store Configuration ---

export interface SessionStoreConfig {
  prefix: string;
  ttlSeconds: number;
}

const DEFAULT_CONFIG: SessionStoreConfig = {
  prefix: 'sage:session:',
  ttlSeconds: 24 * 60 * 60,  // 24 hours
};

// --- Stored Types ---

export interface StoredSession {
  sessionId: string;
  userId: string;
  userRole: string;
  organisationId?: string;
  persona: SagePersona;
  subject?: SageSubject;
  level?: SageLevel;
  sessionGoal?: SessionGoal;
  topicsCovered: string[];
  messageCount: number;
  startedAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// --- Session Store Class ---

export class SageSessionStore {
  private supabase: SupabaseClient | null = null;
  private memoryStore: Map<string, StoredSession> = new Map();
  private messagesStore: Map<string, StoredMessage[]> = new Map();
  private config: SessionStoreConfig;

  constructor(config?: Partial<SessionStoreConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize with Supabase client.
   */
  initialize(supabaseClient?: SupabaseClient): void {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && key) {
        this.supabase = createClient(url, key);
      }
    }
  }

  /**
   * Create a new session.
   */
  async createSession(session: StoredSession): Promise<void> {
    // Store in memory
    this.memoryStore.set(session.sessionId, session);
    this.messagesStore.set(session.sessionId, []);

    // Persist to database
    if (this.supabase) {
      await this.supabase.from('sage_sessions').insert({
        id: session.sessionId,
        user_id: session.userId,
        persona: session.persona,
        subject: session.subject,
        level: session.level,
        session_goal: session.sessionGoal,
        topics_covered: session.topicsCovered,
        message_count: session.messageCount,
        started_at: session.startedAt,
        last_activity_at: session.lastActivityAt,
        status: 'active',
      });
    }
  }

  /**
   * Get a session by ID.
   */
  async getSession(sessionId: string): Promise<StoredSession | null> {
    // Check memory first
    const memorySession = this.memoryStore.get(sessionId);
    if (memorySession) {
      return memorySession;
    }

    // Check database
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('sage_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('status', 'active')
        .single();

      if (data && !error) {
        const session: StoredSession = {
          sessionId: data.id,
          userId: data.user_id,
          userRole: data.persona,  // Map persona to role
          organisationId: data.organisation_id,
          persona: data.persona,
          subject: data.subject,
          level: data.level,
          sessionGoal: data.session_goal,
          topicsCovered: data.topics_covered || [],
          messageCount: data.message_count || 0,
          startedAt: data.started_at,
          lastActivityAt: data.last_activity_at,
          expiresAt: new Date(Date.now() + this.config.ttlSeconds * 1000).toISOString(),
        };

        this.memoryStore.set(sessionId, session);
        return session;
      }
    }

    return null;
  }

  /**
   * Update session.
   */
  async updateSession(
    sessionId: string,
    updates: Partial<StoredSession>
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    const updatedSession = { ...session, ...updates };
    this.memoryStore.set(sessionId, updatedSession);

    // Persist to database
    if (this.supabase) {
      await this.supabase
        .from('sage_sessions')
        .update({
          subject: updatedSession.subject,
          level: updatedSession.level,
          session_goal: updatedSession.sessionGoal,
          topics_covered: updatedSession.topicsCovered,
          message_count: updatedSession.messageCount,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }
  }

  /**
   * Add a message to a session.
   */
  async addMessage(sessionId: string, message: StoredMessage): Promise<void> {
    // Add to memory store
    const messages = this.messagesStore.get(sessionId) || [];
    messages.push(message);
    this.messagesStore.set(sessionId, messages);

    // Update message count
    const session = this.memoryStore.get(sessionId);
    if (session) {
      session.messageCount = messages.length;
      session.lastActivityAt = new Date().toISOString();
    }

    // Persist to database
    if (this.supabase) {
      await this.supabase.from('sage_messages').insert({
        id: message.id,
        session_id: sessionId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        metadata: message.metadata,
      });
    }
  }

  /**
   * Get messages for a session.
   */
  async getMessages(
    sessionId: string,
    limit?: number
  ): Promise<StoredMessage[]> {
    // Check memory first
    const memoryMessages = this.messagesStore.get(sessionId);
    if (memoryMessages && memoryMessages.length > 0) {
      return limit ? memoryMessages.slice(-limit) : memoryMessages;
    }

    // Check database
    if (this.supabase) {
      let query = this.supabase
        .from('sage_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (data && !error) {
        const messages: StoredMessage[] = data.map(row => ({
          id: row.id,
          role: row.role,
          content: row.content,
          timestamp: row.timestamp,
          metadata: row.metadata,
        }));

        this.messagesStore.set(sessionId, messages);
        return messages;
      }
    }

    return [];
  }

  /**
   * End a session.
   */
  async endSession(sessionId: string): Promise<void> {
    this.memoryStore.delete(sessionId);
    this.messagesStore.delete(sessionId);

    if (this.supabase) {
      await this.supabase
        .from('sage_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    }
  }

  /**
   * Get recent sessions for a user.
   */
  async getUserSessions(
    userId: string,
    limit: number = 10
  ): Promise<StoredSession[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('sage_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('last_activity_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(row => ({
      sessionId: row.id,
      userId: row.user_id,
      userRole: row.persona,
      organisationId: row.organisation_id,
      persona: row.persona,
      subject: row.subject,
      level: row.level,
      sessionGoal: row.session_goal,
      topicsCovered: row.topics_covered || [],
      messageCount: row.message_count || 0,
      startedAt: row.started_at,
      lastActivityAt: row.last_activity_at,
      expiresAt: new Date(Date.now() + this.config.ttlSeconds * 1000).toISOString(),
    }));
  }
}

// --- Singleton Export ---

export const sessionStore = new SageSessionStore();

export default SageSessionStore;
