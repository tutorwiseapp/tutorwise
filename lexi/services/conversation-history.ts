/**
 * Conversation History Service
 *
 * Persists Lexi conversations to PostgreSQL (Supabase) for long-term storage.
 * Active conversations are stored in Redis, then archived to PostgreSQL
 * when the session ends.
 *
 * Database Tables Required:
 * - lexi_conversations: Stores conversation metadata
 * - lexi_messages: Stores individual messages
 *
 * @module lexi/services/conversation-history
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Conversation, LexiMessage, PersonaType } from '../types';
import type { UserRole } from '../../cas/packages/core/src/context';

// --- Types ---

export interface ConversationRecord {
  id: string;
  user_id: string;
  user_role: UserRole;
  persona: PersonaType;
  session_id: string;
  started_at: string;
  ended_at?: string;
  last_activity_at: string;
  message_count: number;
  status: 'active' | 'ended' | 'archived';
  metadata?: Record<string, unknown>;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  intent?: string;
  action_taken?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationSummary {
  conversationId: string;
  startedAt: Date;
  endedAt?: Date;
  messageCount: number;
  persona: PersonaType;
  status: string;
}

export interface ConversationSearchParams {
  userId: string;
  persona?: PersonaType;
  startDate?: Date;
  endDate?: Date;
  status?: 'active' | 'ended' | 'archived';
  limit?: number;
  offset?: number;
}

// --- Conversation History Service ---

export class ConversationHistoryService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    // Initialize Supabase client if credentials are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    } else {
      console.warn('[ConversationHistory] Supabase credentials not configured');
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.supabase !== null;
  }

  /**
   * Archive a conversation (called when session ends)
   */
  async archiveConversation(
    conversation: Conversation,
    sessionId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Insert conversation record
      const conversationRecord: Partial<ConversationRecord> = {
        id: conversation.id,
        user_id: conversation.userId,
        user_role: conversation.userRole,
        persona: conversation.persona,
        session_id: sessionId,
        started_at: conversation.startedAt.toISOString(),
        ended_at: new Date().toISOString(),
        last_activity_at: conversation.lastActivityAt.toISOString(),
        message_count: conversation.messages.length,
        status: 'archived',
      };

      const { error: convError } = await this.supabase
        .from('lexi_conversations')
        .upsert(conversationRecord);

      if (convError) {
        console.error('[ConversationHistory] Failed to archive conversation:', convError);
        return { success: false, error: convError.message };
      }

      // Insert messages in batches
      if (conversation.messages.length > 0) {
        const messageRecords: Partial<MessageRecord>[] = conversation.messages.map(msg => ({
          id: msg.id,
          conversation_id: conversation.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
          intent: msg.metadata?.intent,
          action_taken: msg.metadata?.actionTaken,
          metadata: msg.metadata,
        }));

        // Batch insert (Supabase handles up to 1000 rows)
        const batchSize = 100;
        for (let i = 0; i < messageRecords.length; i += batchSize) {
          const batch = messageRecords.slice(i, i + batchSize);
          const { error: msgError } = await this.supabase
            .from('lexi_messages')
            .upsert(batch);

          if (msgError) {
            console.error('[ConversationHistory] Failed to archive messages:', msgError);
            // Continue with other batches
          }
        }
      }

      console.log(`[ConversationHistory] Archived conversation ${conversation.id} with ${conversation.messages.length} messages`);
      return { success: true };
    } catch (error) {
      console.error('[ConversationHistory] Archive error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get conversation history for a user
   */
  async getConversationHistory(
    params: ConversationSearchParams
  ): Promise<{ success: boolean; conversations: ConversationSummary[]; total: number; error?: string }> {
    if (!this.supabase) {
      return { success: false, conversations: [], total: 0, error: 'Supabase not configured' };
    }

    try {
      let query = this.supabase
        .from('lexi_conversations')
        .select('*', { count: 'exact' })
        .eq('user_id', params.userId)
        .order('started_at', { ascending: false });

      if (params.persona) {
        query = query.eq('persona', params.persona);
      }

      if (params.status) {
        query = query.eq('status', params.status);
      }

      if (params.startDate) {
        query = query.gte('started_at', params.startDate.toISOString());
      }

      if (params.endDate) {
        query = query.lte('started_at', params.endDate.toISOString());
      }

      const limit = params.limit || 20;
      const offset = params.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data, count, error } = await query;

      if (error) {
        return { success: false, conversations: [], total: 0, error: error.message };
      }

      const conversations: ConversationSummary[] = (data || []).map(row => ({
        conversationId: row.id,
        startedAt: new Date(row.started_at),
        endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
        messageCount: row.message_count,
        persona: row.persona,
        status: row.status,
      }));

      return { success: true, conversations, total: count || 0 };
    } catch (error) {
      console.error('[ConversationHistory] Query error:', error);
      return { success: false, conversations: [], total: 0, error: String(error) };
    }
  }

  /**
   * Get a specific conversation with messages
   */
  async getConversation(
    conversationId: string,
    userId: string
  ): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      // Get conversation record
      const { data: convData, error: convError } = await this.supabase
        .from('lexi_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId) // Security: ensure user owns conversation
        .single();

      if (convError || !convData) {
        return { success: false, error: 'Conversation not found' };
      }

      // Get messages
      const { data: msgData, error: msgError } = await this.supabase
        .from('lexi_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('timestamp', { ascending: true });

      if (msgError) {
        return { success: false, error: msgError.message };
      }

      const messages: LexiMessage[] = (msgData || []).map(row => ({
        id: row.id,
        role: row.role,
        content: row.content,
        timestamp: new Date(row.timestamp),
        metadata: {
          intent: row.intent,
          actionTaken: row.action_taken,
          ...row.metadata,
        },
      }));

      const conversation: Conversation = {
        id: convData.id,
        userId: convData.user_id,
        userRole: convData.user_role,
        persona: convData.persona,
        messages,
        context: {} as any, // Context is not stored
        startedAt: new Date(convData.started_at),
        lastActivityAt: new Date(convData.last_activity_at),
        status: convData.status === 'archived' ? 'ended' : convData.status,
      };

      return { success: true, conversation };
    } catch (error) {
      console.error('[ConversationHistory] Get conversation error:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete conversation history (for compliance/GDPR)
   */
  async deleteUserHistory(userId: string): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    if (!this.supabase) {
      return { success: false, deletedCount: 0, error: 'Supabase not configured' };
    }

    try {
      // Get conversation IDs first
      const { data: conversations } = await this.supabase
        .from('lexi_conversations')
        .select('id')
        .eq('user_id', userId);

      const conversationIds = (conversations || []).map(c => c.id);

      if (conversationIds.length > 0) {
        // Delete messages first (foreign key constraint)
        await this.supabase
          .from('lexi_messages')
          .delete()
          .in('conversation_id', conversationIds);

        // Delete conversations
        await this.supabase
          .from('lexi_conversations')
          .delete()
          .eq('user_id', userId);
      }

      console.log(`[ConversationHistory] Deleted ${conversationIds.length} conversations for user ${userId}`);
      return { success: true, deletedCount: conversationIds.length };
    } catch (error) {
      console.error('[ConversationHistory] Delete error:', error);
      return { success: false, deletedCount: 0, error: String(error) };
    }
  }

  /**
   * Get analytics for a user's conversations
   */
  async getConversationAnalytics(userId: string): Promise<{
    success: boolean;
    analytics?: {
      totalConversations: number;
      totalMessages: number;
      averageMessagesPerConversation: number;
      mostUsedPersona: PersonaType | null;
      conversationsByPersona: Record<PersonaType, number>;
    };
    error?: string;
  }> {
    if (!this.supabase) {
      return { success: false, error: 'Supabase not configured' };
    }

    try {
      const { data, error } = await this.supabase
        .from('lexi_conversations')
        .select('persona, message_count')
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      const conversations = data || [];
      const totalConversations = conversations.length;
      const totalMessages = conversations.reduce((sum, c) => sum + c.message_count, 0);

      const conversationsByPersona: Record<PersonaType, number> = {
        student: 0,
        tutor: 0,
        client: 0,
        agent: 0,
        organisation: 0,
      };

      conversations.forEach(c => {
        if (c.persona in conversationsByPersona) {
          conversationsByPersona[c.persona as PersonaType]++;
        }
      });

      const mostUsedPersona = Object.entries(conversationsByPersona)
        .sort((a, b) => b[1] - a[1])[0];

      return {
        success: true,
        analytics: {
          totalConversations,
          totalMessages,
          averageMessagesPerConversation: totalConversations > 0
            ? Math.round(totalMessages / totalConversations)
            : 0,
          mostUsedPersona: mostUsedPersona[1] > 0 ? mostUsedPersona[0] as PersonaType : null,
          conversationsByPersona,
        },
      };
    } catch (error) {
      console.error('[ConversationHistory] Analytics error:', error);
      return { success: false, error: String(error) };
    }
  }
}

// --- Export Singleton ---

export const conversationHistory = new ConversationHistoryService();

export default ConversationHistoryService;
