/**
 * CAS-Lexi Integration Bridge
 *
 * Connects Lexi with the CAS message bus for seamless
 * feedback flow and inter-agent communication.
 *
 * @module cas/integration/lexi-bridge
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  publish,
  createFeedbackEnvelope,
  createTaskEnvelope,
  createStatusEnvelope,
  type MessageEnvelope,
  type FeedbackPayload,
} from '../messages';
import { metricsCollector } from '../dashboard';

// --- Types ---

export interface LexiFeedbackEvent {
  sessionId: string;
  messageId: string;
  userId: string;
  persona: string;
  rating: 'thumbs_up' | 'thumbs_down';
  comment?: string;
  intent?: string;
}

export interface LexiSessionEvent {
  sessionId: string;
  userId: string;
  persona: string;
  action: 'started' | 'ended' | 'message';
  messageCount?: number;
}

export interface CASNotification {
  type: 'feedback_alert' | 'session_alert' | 'performance_alert';
  severity: 'info' | 'warning' | 'error';
  source: 'lexi' | 'sage';
  message: string;
  data?: Record<string, unknown>;
}

// --- Lexi Bridge Class ---

export class LexiBridge {
  private supabase: SupabaseClient | null = null;
  private feedbackThreshold = 5; // Alert after this many negative feedbacks
  private negativeFeedbackCount = 0;
  private lastAlertTime: Date | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url && key) {
      this.supabase = createClient(url, key, {
        auth: { persistSession: false },
      });
    }
  }

  /**
   * Handle feedback from Lexi and publish to CAS message bus
   */
  async handleFeedback(event: LexiFeedbackEvent): Promise<void> {
    console.log(`[LexiBridge] Processing feedback: ${event.rating}`, {
      sessionId: event.sessionId,
      persona: event.persona,
    });

    // Create feedback payload
    const payload: FeedbackPayload = {
      session_id: event.sessionId,
      message_id: event.messageId,
      rating: event.rating,
      comment: event.comment,
      context: {
        agent_type: 'lexi',
        persona: event.persona,
        intent: event.intent,
      },
    };

    // Publish to CAS message bus
    const envelope = createFeedbackEnvelope('lexi', payload);
    await publish(envelope);

    // Track negative feedback for alerting
    if (event.rating === 'thumbs_down') {
      this.negativeFeedbackCount++;
      await this.checkFeedbackAlert();
    }

    // Dispatch to analyst for processing
    if (event.rating === 'thumbs_down' && event.comment) {
      await this.dispatchToAnalyst(event);
    }
  }

  /**
   * Handle session events from Lexi
   */
  async handleSessionEvent(event: LexiSessionEvent): Promise<void> {
    console.log(`[LexiBridge] Session ${event.action}`, {
      sessionId: event.sessionId,
      persona: event.persona,
    });

    // Publish status update to CAS
    const envelope = createStatusEnvelope('lexi', {
      sessionId: event.sessionId,
      action: event.action,
      persona: event.persona,
      timestamp: new Date().toISOString(),
    });

    await publish(envelope);

    // Track metrics
    if (event.action === 'ended') {
      await this.updateSessionMetrics(event);
    }
  }

  /**
   * Check if we need to send a feedback alert
   */
  private async checkFeedbackAlert(): Promise<void> {
    if (this.negativeFeedbackCount < this.feedbackThreshold) {
      return;
    }

    // Don't alert more than once per hour
    if (this.lastAlertTime) {
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      if (this.lastAlertTime > hourAgo) {
        return;
      }
    }

    // Send alert to planner
    const notification: CASNotification = {
      type: 'feedback_alert',
      severity: 'warning',
      source: 'lexi',
      message: `${this.negativeFeedbackCount} negative feedback items received recently`,
      data: {
        count: this.negativeFeedbackCount,
        threshold: this.feedbackThreshold,
      },
    };

    await this.sendNotification(notification);

    // Reset counter and update alert time
    this.negativeFeedbackCount = 0;
    this.lastAlertTime = new Date();
  }

  /**
   * Dispatch negative feedback to analyst for processing
   */
  private async dispatchToAnalyst(event: LexiFeedbackEvent): Promise<void> {
    const envelope = createTaskEnvelope(
      'lexi',
      'cas:analyst',
      {
        action: 'analyze_negative_feedback',
        feedback: {
          sessionId: event.sessionId,
          persona: event.persona,
          comment: event.comment,
          intent: event.intent,
        },
      }
    );

    await publish(envelope);
  }

  /**
   * Update session metrics in dashboard
   */
  private async updateSessionMetrics(event: LexiSessionEvent): Promise<void> {
    // Metrics are automatically tracked via database
    // This hook can be used for real-time updates
    console.log(`[LexiBridge] Session ended: ${event.sessionId}, messages: ${event.messageCount}`);
  }

  /**
   * Send notification to CAS planner
   */
  private async sendNotification(notification: CASNotification): Promise<void> {
    const envelope = createTaskEnvelope(
      notification.source,
      'cas:planner',
      {
        action: 'handle_notification',
        notification,
      }
    );

    await publish(envelope);

    console.log(`[LexiBridge] Notification sent: ${notification.type}`, notification);
  }

  /**
   * Get current integration status
   */
  async getStatus(): Promise<{
    connected: boolean;
    pendingFeedback: number;
    lastSync: Date | null;
  }> {
    const metrics = await metricsCollector.getLexiMetrics('hour');

    return {
      connected: this.supabase !== null,
      pendingFeedback: this.negativeFeedbackCount,
      lastSync: new Date(),
    };
  }
}

// --- Singleton Export ---

export const lexiBridge = new LexiBridge();

export default LexiBridge;
