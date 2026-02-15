/**
 * CAS-Sage Integration Bridge
 *
 * Connects Sage with the CAS message bus for seamless
 * feedback flow and inter-agent communication.
 *
 * @module cas/integration/sage-bridge
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  publish,
  createFeedbackEnvelope,
  createTaskEnvelope,
  createStatusEnvelope,
  type FeedbackPayload,
} from '../messages';
import { metricsCollector } from '../dashboard';
import type { CASNotification } from './lexi-bridge';

// --- Types ---

export interface SageFeedbackEvent {
  sessionId: string;
  messageId: string;
  userId: string;
  userRole: string;
  subject: string;
  level: string;
  rating: 'thumbs_up' | 'thumbs_down';
  comment?: string;
  topic?: string;
}

export interface SageSessionEvent {
  sessionId: string;
  userId: string;
  userRole: string;
  subject: string;
  level: string;
  action: 'started' | 'ended' | 'message' | 'practice';
  messageCount?: number;
  topicsCovered?: string[];
}

export interface SageProgressEvent {
  studentId: string;
  subject: string;
  topicId: string;
  masteryChange: number;
  practiceResult: 'correct' | 'incorrect';
}

// --- Sage Bridge Class ---

export class SageBridge {
  private supabase: SupabaseClient | null = null;
  private feedbackThreshold = 5;
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
   * Handle feedback from Sage and publish to CAS message bus
   */
  async handleFeedback(event: SageFeedbackEvent): Promise<void> {
    console.log(`[SageBridge] Processing feedback: ${event.rating}`, {
      sessionId: event.sessionId,
      userRole: event.userRole,
      subject: event.subject,
    });

    // Create feedback payload with rich context
    const payload: FeedbackPayload = {
      session_id: event.sessionId,
      message_id: event.messageId,
      rating: event.rating,
      comment: event.comment,
      context: {
        agent_type: 'sage',
        user_role: event.userRole,
        subject: event.subject,
        level: event.level,
        topic: event.topic,
      },
    };

    // Publish to CAS message bus
    const envelope = createFeedbackEnvelope('sage', payload);
    await publish(envelope);

    // Track for DSPy optimization
    if (event.rating === 'thumbs_down') {
      this.negativeFeedbackCount++;
      await this.checkFeedbackAlert();

      // Dispatch for curriculum review if subject-specific
      if (event.topic) {
        await this.flagForCurriculumReview(event);
      }
    }

    // Dispatch to analyst for pattern analysis
    if (event.rating === 'thumbs_down' && event.comment) {
      await this.dispatchToAnalyst(event);
    }
  }

  /**
   * Handle session events from Sage
   */
  async handleSessionEvent(event: SageSessionEvent): Promise<void> {
    console.log(`[SageBridge] Session ${event.action}`, {
      sessionId: event.sessionId,
      userRole: event.userRole,
      subject: event.subject,
    });

    // Publish status update to CAS
    const envelope = createStatusEnvelope('sage', {
      sessionId: event.sessionId,
      action: event.action,
      userRole: event.userRole,
      subject: event.subject,
      level: event.level,
      timestamp: new Date().toISOString(),
    });

    await publish(envelope);

    // Track for analytics
    if (event.action === 'ended' && event.topicsCovered) {
      await this.trackTopicCoverage(event);
    }
  }

  /**
   * Handle progress events from Sage
   */
  async handleProgressEvent(event: SageProgressEvent): Promise<void> {
    console.log(`[SageBridge] Progress update`, {
      studentId: event.studentId,
      subject: event.subject,
      masteryChange: event.masteryChange,
    });

    // Publish to CAS for tracking
    const envelope = createStatusEnvelope('sage', {
      type: 'progress_update',
      studentId: event.studentId,
      subject: event.subject,
      topicId: event.topicId,
      masteryChange: event.masteryChange,
      practiceResult: event.practiceResult,
      timestamp: new Date().toISOString(),
    });

    await publish(envelope);

    // Alert if significant progress milestone
    if (event.masteryChange >= 20) {
      await this.celebrateProgress(event);
    }
  }

  /**
   * Check if we need to send a feedback alert
   */
  private async checkFeedbackAlert(): Promise<void> {
    if (this.negativeFeedbackCount < this.feedbackThreshold) {
      return;
    }

    if (this.lastAlertTime) {
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      if (this.lastAlertTime > hourAgo) {
        return;
      }
    }

    const notification: CASNotification = {
      type: 'feedback_alert',
      severity: 'warning',
      source: 'sage',
      message: `${this.negativeFeedbackCount} negative feedback items in Sage`,
      data: {
        count: this.negativeFeedbackCount,
        threshold: this.feedbackThreshold,
      },
    };

    await this.sendNotification(notification);
    this.negativeFeedbackCount = 0;
    this.lastAlertTime = new Date();
  }

  /**
   * Flag content for curriculum review
   */
  private async flagForCurriculumReview(event: SageFeedbackEvent): Promise<void> {
    const envelope = createTaskEnvelope(
      'sage',
      'cas:analyst',
      {
        action: 'review_curriculum_content',
        content: {
          subject: event.subject,
          level: event.level,
          topic: event.topic,
          feedback: event.comment,
          userRole: event.userRole,
        },
      }
    );

    await publish(envelope);
  }

  /**
   * Dispatch negative feedback to analyst
   */
  private async dispatchToAnalyst(event: SageFeedbackEvent): Promise<void> {
    const envelope = createTaskEnvelope(
      'sage',
      'cas:analyst',
      {
        action: 'analyze_sage_feedback',
        feedback: {
          sessionId: event.sessionId,
          userRole: event.userRole,
          subject: event.subject,
          level: event.level,
          topic: event.topic,
          comment: event.comment,
        },
      }
    );

    await publish(envelope);
  }

  /**
   * Track topic coverage for analytics
   */
  private async trackTopicCoverage(event: SageSessionEvent): Promise<void> {
    console.log(`[SageBridge] Topics covered in session:`, event.topicsCovered);

    // This data is tracked in the session table
    // Could dispatch to analyst for trend analysis
  }

  /**
   * Send progress celebration notification
   */
  private async celebrateProgress(event: SageProgressEvent): Promise<void> {
    console.log(`[SageBridge] Student achieved +${event.masteryChange}% mastery!`, {
      studentId: event.studentId,
      subject: event.subject,
    });

    // Could trigger notification to student/parent
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
  }

  /**
   * Get current integration status
   */
  async getStatus(): Promise<{
    connected: boolean;
    pendingFeedback: number;
    lastSync: Date | null;
  }> {
    const metrics = await metricsCollector.getSageMetrics('hour');

    return {
      connected: this.supabase !== null,
      pendingFeedback: this.negativeFeedbackCount,
      lastSync: new Date(),
    };
  }
}

// --- Singleton Export ---

export const sageBridge = new SageBridge();

export default SageBridge;
