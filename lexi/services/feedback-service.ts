/**
 * Lexi Feedback Service
 *
 * Collects user feedback on AI responses for DSPy optimization.
 * Integrates with the CAS message bus to publish feedback events.
 *
 * @module lexi/services/feedback
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  createFeedbackEnvelope,
  publish,
  initDatabaseTransport,
  publishFeedbackToDatabase,
  type FeedbackPayload,
  type MessageEnvelope,
} from '../../cas/messages';

// --- Types ---

export interface FeedbackSubmission {
  sessionId: string;
  messageId?: string;
  rating: 'thumbs_up' | 'thumbs_down';
  ratingValue?: number;  // 1-5 scale
  comment?: string;
  context?: FeedbackContext;
}

export interface FeedbackContext {
  persona?: string;
  intent?: string;
  topic?: string;
  subject?: string;
  level?: string;
  userRole?: string;
}

export interface FeedbackResult {
  success: boolean;
  feedbackId?: string;
  error?: string;
}

export interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  positiveRate: number;
  averageRating?: number;
  recentTrend: 'improving' | 'declining' | 'stable';
}

// --- Feedback Service ---

export class LexiFeedbackService {
  private supabase: SupabaseClient | null = null;
  private readonly agentType: 'lexi' | 'sage';

  constructor(agentType: 'lexi' | 'sage' = 'lexi') {
    this.agentType = agentType;
  }

  /**
   * Initialize the feedback service with Supabase client.
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

    if (this.supabase) {
      initDatabaseTransport(this.supabase as any);
      console.log(`[FeedbackService] Initialized for ${this.agentType}`);
    }
  }

  /**
   * Submit feedback for a message.
   */
  async submitFeedback(
    userId: string,
    submission: FeedbackSubmission
  ): Promise<FeedbackResult> {
    if (!this.supabase) {
      console.error('[FeedbackService] Service not initialized');
      return { success: false, error: 'Service not initialized' };
    }

    try {
      // Create feedback payload
      const payload: FeedbackPayload = {
        session_id: submission.sessionId,
        message_id: submission.messageId,
        rating: submission.rating,
        rating_value: submission.ratingValue,
        comment: submission.comment,
        context: {
          agent_type: this.agentType,
          persona: submission.context?.persona,
          subject: submission.context?.subject,
          level: submission.context?.level,
          topic: submission.context?.topic,
          user_role: submission.context?.userRole,
        },
      };

      // Insert into database
      const { data, error } = await this.supabase
        .from('ai_feedback')
        .insert({
          agent_type: this.agentType,
          session_id: submission.sessionId,
          user_id: userId,
          message_id: submission.messageId,
          rating: submission.rating,
          rating_value: submission.ratingValue,
          comment: submission.comment,
          context: payload.context,
        })
        .select('id')
        .single();

      if (error) {
        console.error('[FeedbackService] Database error:', error);
        return { success: false, error: error.message };
      }

      // Publish to message bus
      const envelope = createFeedbackEnvelope(this.agentType, payload);
      await publish(envelope);

      console.log(`[FeedbackService] Feedback submitted: ${data.id} (${submission.rating})`);

      return {
        success: true,
        feedbackId: data.id,
      };
    } catch (error) {
      console.error('[FeedbackService] Failed to submit feedback:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get feedback statistics for a session.
   */
  async getSessionStats(sessionId: string): Promise<FeedbackStats | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('ai_feedback')
        .select('rating, rating_value, created_at')
        .eq('session_id', sessionId)
        .eq('agent_type', this.agentType);

      if (error || !data) return null;

      return this.calculateStats(data);
    } catch {
      return null;
    }
  }

  /**
   * Get overall feedback statistics.
   */
  async getOverallStats(sinceDays: number = 30): Promise<FeedbackStats | null> {
    if (!this.supabase) return null;

    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - sinceDays);

      const { data, error } = await this.supabase
        .from('ai_feedback')
        .select('rating, rating_value, created_at')
        .eq('agent_type', this.agentType)
        .gte('created_at', sinceDate.toISOString());

      if (error || !data) return null;

      return this.calculateStats(data);
    } catch {
      return null;
    }
  }

  /**
   * Get recent feedback for review.
   */
  async getRecentFeedback(
    limit: number = 20,
    onlyNegative: boolean = false
  ): Promise<FeedbackSubmission[]> {
    if (!this.supabase) return [];

    try {
      let query = this.supabase
        .from('ai_feedback')
        .select('session_id, message_id, rating, rating_value, comment, context, created_at')
        .eq('agent_type', this.agentType)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (onlyNegative) {
        query = query.eq('rating', 'thumbs_down');
      }

      const { data, error } = await query;

      if (error || !data) return [];

      return data.map(row => ({
        sessionId: row.session_id,
        messageId: row.message_id,
        rating: row.rating,
        ratingValue: row.rating_value,
        comment: row.comment,
        context: row.context,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Check if feedback was already submitted for a message.
   */
  async hasFeedback(messageId: string): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { count, error } = await this.supabase
        .from('ai_feedback')
        .select('id', { count: 'exact', head: true })
        .eq('message_id', messageId)
        .eq('agent_type', this.agentType);

      if (error) return false;
      return (count || 0) > 0;
    } catch {
      return false;
    }
  }

  // --- Private Methods ---

  private calculateStats(data: Array<{
    rating: string;
    rating_value?: number;
    created_at: string;
  }>): FeedbackStats {
    const total = data.length;
    const positive = data.filter(d => d.rating === 'thumbs_up').length;
    const negative = total - positive;

    // Calculate average rating from rating_value
    const ratings = data.filter(d => d.rating_value != null).map(d => d.rating_value!);
    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : undefined;

    // Calculate trend (compare recent vs older)
    const sorted = [...data].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (sorted.length >= 10) {
      const recentHalf = sorted.slice(0, Math.floor(sorted.length / 2));
      const olderHalf = sorted.slice(Math.floor(sorted.length / 2));

      const recentPositiveRate = recentHalf.filter(d => d.rating === 'thumbs_up').length / recentHalf.length;
      const olderPositiveRate = olderHalf.filter(d => d.rating === 'thumbs_up').length / olderHalf.length;

      if (recentPositiveRate > olderPositiveRate + 0.1) {
        recentTrend = 'improving';
      } else if (recentPositiveRate < olderPositiveRate - 0.1) {
        recentTrend = 'declining';
      }
    }

    return {
      total,
      positive,
      negative,
      positiveRate: total > 0 ? positive / total : 0,
      averageRating,
      recentTrend,
    };
  }
}

// --- Singleton Export ---

export const feedbackService = new LexiFeedbackService('lexi');

// --- Feedback UI Helper ---

/**
 * Create feedback buttons data for UI.
 */
export function createFeedbackButtons(messageId: string): {
  thumbsUp: { action: 'thumbs_up'; messageId: string };
  thumbsDown: { action: 'thumbs_down'; messageId: string };
} {
  return {
    thumbsUp: { action: 'thumbs_up', messageId },
    thumbsDown: { action: 'thumbs_down', messageId },
  };
}
