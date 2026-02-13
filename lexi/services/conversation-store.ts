/**
 * Lexi Conversation Store
 *
 * PostgreSQL-based storage for conversation history.
 * Archives ended sessions for long-term storage and analytics.
 *
 * @module lexi/services/conversation-store
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Conversation, LexiMessage, PersonaType } from '../types';
import type { LLMProviderType } from '../providers/types';

// --- Types ---

export interface StoredConversation {
  id: string;
  session_id: string;
  user_id: string;
  persona: PersonaType;
  started_at: string;
  ended_at: string | null;
  last_activity_at: string;
  message_count: number;
  provider: LLMProviderType;
  summary: string | null;
  status: 'active' | 'ended' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface StoredMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  intent_category: string | null;
  intent_action: string | null;
  feedback_rating: -1 | 0 | 1 | null;
  feedback_comment: string | null;
  created_at: string;
}

export interface ConversationWithMessages extends StoredConversation {
  messages: StoredMessage[];
}

export interface AnalyticsData {
  time_bucket: string;
  total_sessions: number;
  total_messages: number;
  unique_users: number;
  student_sessions: number;
  tutor_sessions: number;
  client_sessions: number;
  agent_sessions: number;
  organisation_sessions: number;
  rules_messages: number;
  claude_messages: number;
  gemini_messages: number;
  intent_counts: Record<string, number>;
  positive_feedback: number;
  negative_feedback: number;
  error_count: number;
  avg_response_time_ms: number | null;
}

// --- Conversation Store Class ---

export class ConversationStore {
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[ConversationStore] Supabase not configured, persistence disabled');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  }

  /**
   * Check if store is available
   */
  isAvailable(): boolean {
    return this.supabase !== null;
  }

  /**
   * Archive a conversation to PostgreSQL
   */
  async archiveConversation(
    conversation: Conversation,
    sessionId: string,
    provider: LLMProviderType = 'rules'
  ): Promise<string | null> {
    if (!this.supabase) return null;

    try {
      // Insert conversation
      const { data: convData, error: convError } = await this.supabase
        .from('lexi_conversations')
        .insert({
          session_id: sessionId,
          user_id: conversation.userId,
          persona: conversation.persona,
          started_at: conversation.startedAt.toISOString(),
          ended_at: conversation.status === 'ended' ? new Date().toISOString() : null,
          last_activity_at: conversation.lastActivityAt.toISOString(),
          message_count: conversation.messages.length,
          provider,
          status: conversation.status,
        })
        .select('id')
        .single();

      if (convError) {
        console.error('[ConversationStore] Failed to archive conversation:', convError);
        return null;
      }

      const conversationId = convData.id;

      // Insert messages
      const messagesToInsert = conversation.messages.map(msg => ({
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata || {},
        intent_category: msg.metadata?.intent?.split(':')?.[0] || null,
        intent_action: msg.metadata?.intent?.split(':')?.[1] || null,
        created_at: msg.timestamp.toISOString(),
      }));

      if (messagesToInsert.length > 0) {
        const { error: msgError } = await this.supabase
          .from('lexi_messages')
          .insert(messagesToInsert);

        if (msgError) {
          console.error('[ConversationStore] Failed to archive messages:', msgError);
        }
      }

      console.log(`[ConversationStore] Archived conversation ${conversationId}`);
      return conversationId;
    } catch (error) {
      console.error('[ConversationStore] Archive error:', error);
      return null;
    }
  }

  /**
   * Get user's conversation history
   */
  async getUserConversations(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: 'active' | 'ended' | 'archived';
    } = {}
  ): Promise<StoredConversation[]> {
    if (!this.supabase) return [];

    const { limit = 20, offset = 0, status } = options;

    try {
      let query = this.supabase
        .from('lexi_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[ConversationStore] Failed to get conversations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[ConversationStore] Get conversations error:', error);
      return [];
    }
  }

  /**
   * Get a single conversation with messages
   */
  async getConversation(
    conversationId: string,
    userId: string
  ): Promise<ConversationWithMessages | null> {
    if (!this.supabase) return null;

    try {
      // Get conversation
      const { data: conv, error: convError } = await this.supabase
        .from('lexi_conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      if (convError || !conv) {
        console.error('[ConversationStore] Conversation not found:', convError);
        return null;
      }

      // Get messages
      const { data: messages, error: msgError } = await this.supabase
        .from('lexi_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('[ConversationStore] Failed to get messages:', msgError);
        return { ...conv, messages: [] };
      }

      return { ...conv, messages: messages || [] };
    } catch (error) {
      console.error('[ConversationStore] Get conversation error:', error);
      return null;
    }
  }

  /**
   * Submit feedback for a message
   */
  async submitFeedback(
    messageId: string,
    rating: -1 | 1,
    comment?: string
  ): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('lexi_messages')
        .update({
          feedback_rating: rating,
          feedback_comment: comment || null,
        })
        .eq('id', messageId);

      if (error) {
        console.error('[ConversationStore] Failed to submit feedback:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ConversationStore] Submit feedback error:', error);
      return false;
    }
  }

  /**
   * Record analytics event
   */
  async recordAnalytics(data: {
    persona: PersonaType;
    provider: LLMProviderType;
    messageCount: number;
    intentCategory?: string;
    hasError?: boolean;
    responseTimeMs?: number;
    feedbackRating?: -1 | 1;
  }): Promise<void> {
    if (!this.supabase) return;

    try {
      // Get current hour bucket
      const now = new Date();
      now.setMinutes(0, 0, 0);
      const timeBucket = now.toISOString();

      // Upsert analytics
      const { error } = await this.supabase.rpc('upsert_lexi_analytics', {
        p_time_bucket: timeBucket,
        p_sessions: 1,
        p_messages: data.messageCount,
        p_persona: data.persona,
        p_provider: data.provider,
        p_intent: data.intentCategory || null,
        p_has_error: data.hasError || false,
        p_response_time_ms: data.responseTimeMs || null,
        p_positive_feedback: data.feedbackRating === 1 ? 1 : 0,
        p_negative_feedback: data.feedbackRating === -1 ? 1 : 0,
      });

      if (error) {
        // If RPC doesn't exist, do a simple upsert
        console.warn('[ConversationStore] Analytics RPC not available, using fallback');
      }
    } catch (error) {
      console.error('[ConversationStore] Record analytics error:', error);
    }
  }

  /**
   * Get analytics data for admin dashboard
   */
  async getAnalytics(options: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<AnalyticsData[]> {
    if (!this.supabase) return [];

    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      endDate = new Date(),
      limit = 168, // 7 days * 24 hours
    } = options;

    try {
      const { data, error } = await this.supabase
        .from('lexi_analytics')
        .select('*')
        .gte('time_bucket', startDate.toISOString())
        .lte('time_bucket', endDate.toISOString())
        .order('time_bucket', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[ConversationStore] Failed to get analytics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[ConversationStore] Get analytics error:', error);
      return [];
    }
  }

  /**
   * Get summary stats for admin dashboard
   */
  async getSummaryStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    uniqueUsers: number;
    avgMessagesPerConversation: number;
    feedbackPositive: number;
    feedbackNegative: number;
    topIntents: Array<{ intent: string; count: number }>;
  } | null> {
    if (!this.supabase) return null;

    try {
      // Get conversation count
      const { count: convCount } = await this.supabase
        .from('lexi_conversations')
        .select('*', { count: 'exact', head: true });

      // Get message count
      const { count: msgCount } = await this.supabase
        .from('lexi_messages')
        .select('*', { count: 'exact', head: true });

      // Get unique users
      const { data: usersData } = await this.supabase
        .from('lexi_conversations')
        .select('user_id')
        .limit(10000);

      const uniqueUsers = new Set(usersData?.map(d => d.user_id) || []).size;

      // Get feedback counts
      const { count: positiveFeedback } = await this.supabase
        .from('lexi_messages')
        .select('*', { count: 'exact', head: true })
        .eq('feedback_rating', 1);

      const { count: negativeFeedback } = await this.supabase
        .from('lexi_messages')
        .select('*', { count: 'exact', head: true })
        .eq('feedback_rating', -1);

      // Get top intents
      const { data: intentsData } = await this.supabase
        .from('lexi_messages')
        .select('intent_category, intent_action')
        .not('intent_category', 'is', null)
        .limit(1000);

      const intentCounts: Record<string, number> = {};
      intentsData?.forEach(d => {
        const intent = `${d.intent_category}:${d.intent_action}`;
        intentCounts[intent] = (intentCounts[intent] || 0) + 1;
      });

      const topIntents = Object.entries(intentCounts)
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalConversations: convCount || 0,
        totalMessages: msgCount || 0,
        uniqueUsers,
        avgMessagesPerConversation: convCount ? Math.round((msgCount || 0) / convCount) : 0,
        feedbackPositive: positiveFeedback || 0,
        feedbackNegative: negativeFeedback || 0,
        topIntents,
      };
    } catch (error) {
      console.error('[ConversationStore] Get summary stats error:', error);
      return null;
    }
  }
}

// --- Export Singleton ---

export const conversationStore = new ConversationStore();

export default ConversationStore;
