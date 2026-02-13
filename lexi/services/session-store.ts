/**
 * Lexi Session Store
 *
 * Redis-based session storage for Lexi conversations.
 * Uses the existing Redis client from apps/web/src/lib/redis.ts
 *
 * Session lifecycle:
 * - Sessions are created when a user starts a conversation
 * - Active sessions are stored in Redis with 24-hour TTL
 * - Sessions are refreshed on each interaction
 * - Ended sessions are persisted to PostgreSQL for history
 *
 * @module lexi/services/session-store
 */

import { redis } from '../../apps/web/src/lib/redis';
import type { LexiSession, Conversation, LexiMessage } from '../types';
import type { AgentContext, UserInfo } from '../../cas/packages/core/src/context';

// --- Constants ---

const SESSION_KEY_PREFIX = 'lexi:session:';
const CONVERSATION_KEY_PREFIX = 'lexi:conversation:';
const USER_SESSIONS_KEY_PREFIX = 'lexi:user:sessions:';

// TTL values in seconds
const SESSION_TTL = 24 * 60 * 60; // 24 hours
const CONVERSATION_TTL = 24 * 60 * 60; // 24 hours
const ACTIVITY_REFRESH_THRESHOLD = 5 * 60; // Refresh TTL if within 5 min of expiry

// --- Types ---

export interface SessionStoreConfig {
  sessionTTL?: number;
  conversationTTL?: number;
}

export interface StoredSession {
  sessionId: string;
  userId: string;
  userRole: string;
  organisationId?: string;
  persona: string;
  preferences: Record<string, unknown>;
  startedAt: string;
  expiresAt: string;
  lastActivityAt: string;
  activeConversationId?: string;
}

export interface StoredConversation {
  id: string;
  userId: string;
  userRole: string;
  persona: string;
  messages: StoredMessage[];
  startedAt: string;
  lastActivityAt: string;
  status: string;
}

export interface StoredMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// --- Session Store Class ---

export class LexiSessionStore {
  private sessionTTL: number;
  private conversationTTL: number;

  constructor(config: SessionStoreConfig = {}) {
    this.sessionTTL = config.sessionTTL || SESSION_TTL;
    this.conversationTTL = config.conversationTTL || CONVERSATION_TTL;
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return redis !== null;
  }

  /**
   * Store a new session
   */
  async createSession(session: LexiSession): Promise<boolean> {
    if (!redis) {
      console.warn('[LexiSessionStore] Redis not configured, using in-memory fallback');
      return false;
    }

    try {
      const key = this.sessionKey(session.sessionId);
      const stored: StoredSession = {
        sessionId: session.sessionId,
        userId: session.userId,
        userRole: session.userRole,
        organisationId: session.organisationId,
        persona: session.persona,
        preferences: session.preferences as unknown as Record<string, unknown>,
        startedAt: session.startedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
        lastActivityAt: new Date().toISOString(),
        activeConversationId: session.activeConversation?.id,
      };

      await redis.set(key, JSON.stringify(stored), 'EX', this.sessionTTL);

      // Track user's sessions
      const userSessionsKey = this.userSessionsKey(session.userId);
      await redis.sadd(userSessionsKey, session.sessionId);
      await redis.expire(userSessionsKey, this.sessionTTL);

      return true;
    } catch (error) {
      console.error('[LexiSessionStore] Failed to create session:', error);
      return false;
    }
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<LexiSession | null> {
    if (!redis) return null;

    try {
      const key = this.sessionKey(sessionId);
      const data = await redis.get(key);

      if (!data) return null;

      const stored: StoredSession = JSON.parse(data);
      return this.hydrateSession(stored);
    } catch (error) {
      console.error('[LexiSessionStore] Failed to get session:', error);
      return null;
    }
  }

  /**
   * Update session activity (refreshes TTL)
   */
  async touchSession(sessionId: string): Promise<boolean> {
    if (!redis) return false;

    try {
      const key = this.sessionKey(sessionId);
      const data = await redis.get(key);

      if (!data) return false;

      const stored: StoredSession = JSON.parse(data);
      stored.lastActivityAt = new Date().toISOString();

      await redis.set(key, JSON.stringify(stored), 'EX', this.sessionTTL);
      return true;
    } catch (error) {
      console.error('[LexiSessionStore] Failed to touch session:', error);
      return false;
    }
  }

  /**
   * Update session's active conversation
   */
  async setActiveConversation(sessionId: string, conversationId: string): Promise<boolean> {
    if (!redis) return false;

    try {
      const key = this.sessionKey(sessionId);
      const data = await redis.get(key);

      if (!data) return false;

      const stored: StoredSession = JSON.parse(data);
      stored.activeConversationId = conversationId;
      stored.lastActivityAt = new Date().toISOString();

      await redis.set(key, JSON.stringify(stored), 'EX', this.sessionTTL);
      return true;
    } catch (error) {
      console.error('[LexiSessionStore] Failed to set active conversation:', error);
      return false;
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    if (!redis) return false;

    try {
      const key = this.sessionKey(sessionId);
      const data = await redis.get(key);

      if (data) {
        const stored: StoredSession = JSON.parse(data);

        // Remove from user's sessions set
        const userSessionsKey = this.userSessionsKey(stored.userId);
        await redis.srem(userSessionsKey, sessionId);
      }

      await redis.del(key);
      return true;
    } catch (error) {
      console.error('[LexiSessionStore] Failed to delete session:', error);
      return false;
    }
  }

  /**
   * Store a conversation
   */
  async saveConversation(conversation: Conversation): Promise<boolean> {
    if (!redis) return false;

    try {
      const key = this.conversationKey(conversation.id);
      const stored: StoredConversation = {
        id: conversation.id,
        userId: conversation.userId,
        userRole: conversation.userRole,
        persona: conversation.persona,
        messages: conversation.messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString(),
          metadata: m.metadata,
        })),
        startedAt: conversation.startedAt.toISOString(),
        lastActivityAt: conversation.lastActivityAt.toISOString(),
        status: conversation.status,
      };

      await redis.set(key, JSON.stringify(stored), 'EX', this.conversationTTL);
      return true;
    } catch (error) {
      console.error('[LexiSessionStore] Failed to save conversation:', error);
      return false;
    }
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    if (!redis) return null;

    try {
      const key = this.conversationKey(conversationId);
      const data = await redis.get(key);

      if (!data) return null;

      const stored: StoredConversation = JSON.parse(data);
      return this.hydrateConversation(stored);
    } catch (error) {
      console.error('[LexiSessionStore] Failed to get conversation:', error);
      return null;
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId: string, message: LexiMessage): Promise<boolean> {
    if (!redis) return false;

    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) return false;

      conversation.messages.push(message);
      conversation.lastActivityAt = new Date();

      return this.saveConversation(conversation);
    } catch (error) {
      console.error('[LexiSessionStore] Failed to add message:', error);
      return false;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    if (!redis) return [];

    try {
      const key = this.userSessionsKey(userId);
      return redis.smembers(key);
    } catch (error) {
      console.error('[LexiSessionStore] Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Check if a session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    if (!redis) return false;

    try {
      const key = this.sessionKey(sessionId);
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('[LexiSessionStore] Failed to check session:', error);
      return false;
    }
  }

  // --- Private Helpers ---

  private sessionKey(sessionId: string): string {
    return `${SESSION_KEY_PREFIX}${sessionId}`;
  }

  private conversationKey(conversationId: string): string {
    return `${CONVERSATION_KEY_PREFIX}${conversationId}`;
  }

  private userSessionsKey(userId: string): string {
    return `${USER_SESSIONS_KEY_PREFIX}${userId}`;
  }

  private hydrateSession(stored: StoredSession): LexiSession {
    return {
      sessionId: stored.sessionId,
      userId: stored.userId,
      userRole: stored.userRole as any,
      organisationId: stored.organisationId,
      persona: stored.persona as any,
      context: {} as AgentContext, // Reconstructed by orchestrator
      preferences: stored.preferences as any,
      startedAt: new Date(stored.startedAt),
      expiresAt: new Date(stored.expiresAt),
    };
  }

  private hydrateConversation(stored: StoredConversation): Conversation {
    return {
      id: stored.id,
      userId: stored.userId,
      userRole: stored.userRole as any,
      persona: stored.persona as any,
      messages: stored.messages.map(m => ({
        id: m.id,
        role: m.role as any,
        content: m.content,
        timestamp: new Date(m.timestamp),
        metadata: m.metadata as any,
      })),
      context: {} as AgentContext, // Reconstructed by orchestrator
      startedAt: new Date(stored.startedAt),
      lastActivityAt: new Date(stored.lastActivityAt),
      status: stored.status as any,
    };
  }
}

// --- Export Singleton ---

export const sessionStore = new LexiSessionStore();

export default LexiSessionStore;
