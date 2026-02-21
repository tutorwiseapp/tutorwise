/**
 * CAS Marketer - Analytics Collector
 *
 * Collects usage analytics from Sage and Lexi to feed the strategic feedback loop.
 * Runs periodically to ingest data from ai_analytics table and generate insights.
 *
 * This activates the Marketer agent by providing it with real user data.
 *
 * @module cas/agents/marketer/analytics-collector
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { publish, createFeedbackEnvelope, createTaskEnvelope } from '../../messages';

// --- Types ---

export interface UsageMetrics {
  agent: 'sage' | 'lexi';
  period: 'hour' | 'day' | 'week' | 'month';
  totalSessions: number;
  totalMessages: number;
  uniqueUsers: number;
  averageSessionLength: number;
  averageMessagesPerSession: number;
  feedbackStats: {
    total: number;
    positive: number;
    negative: number;
    positiveRate: number;
  };
}

export interface FeatureAdoption {
  featureName: string;
  usersTotal: number;
  usersUsing: number;
  adoptionRate: number;
  engagementScore: number;
  trend: 'growing' | 'stable' | 'declining';
}

export interface GrowthInsight {
  type: 'opportunity' | 'risk' | 'milestone';
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  data: any;
  recommendedAction?: string;
}

// --- Analytics Collector ---

export class AnalyticsCollector {
  private supabase: SupabaseClient | null = null;

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
   * Collect usage metrics for an agent
   */
  async collectUsageMetrics(
    agent: 'sage' | 'lexi',
    period: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<UsageMetrics | null> {
    if (!this.supabase) return null;

    try {
      // Calculate time range
      const now = new Date();
      const startTime = new Date(now);
      switch (period) {
        case 'hour':
          startTime.setHours(startTime.getHours() - 1);
          break;
        case 'day':
          startTime.setDate(startTime.getDate() - 1);
          break;
        case 'week':
          startTime.setDate(startTime.getDate() - 7);
          break;
        case 'month':
          startTime.setMonth(startTime.getMonth() - 1);
          break;
      }

      // Get sessions
      const { data: sessions, error: sessionsError } = await this.supabase
        .from(agent === 'sage' ? 'sage_sessions' : 'lexi_sessions')
        .select('id, user_id, message_count, started_at, ended_at')
        .gte('started_at', startTime.toISOString());

      if (sessionsError) {
        console.error('[AnalyticsCollector] Error fetching sessions:', sessionsError);
        return null;
      }

      // Get feedback
      const { data: feedback, error: feedbackError } = await this.supabase
        .from('ai_feedback')
        .select('rating')
        .eq('agent_type', agent)
        .gte('created_at', startTime.toISOString());

      if (feedbackError) {
        console.error('[AnalyticsCollector] Error fetching feedback:', feedbackError);
      }

      // Calculate metrics
      const totalSessions = sessions?.length || 0;
      const uniqueUsers = new Set(sessions?.map(s => s.user_id) || []).size;
      const totalMessages = sessions?.reduce((sum, s) => sum + (s.message_count || 0), 0) || 0;

      const sessionLengths = sessions
        ?.filter(s => s.started_at && s.ended_at)
        .map(s => {
          const start = new Date(s.started_at!).getTime();
          const end = new Date(s.ended_at!).getTime();
          return (end - start) / 1000 / 60; // minutes
        }) || [];
      const averageSessionLength = sessionLengths.length > 0
        ? sessionLengths.reduce((a, b) => a + b, 0) / sessionLengths.length
        : 0;

      const averageMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;

      const positive = feedback?.filter(f => f.rating === 'thumbs_up').length || 0;
      const negative = feedback?.filter(f => f.rating === 'thumbs_down').length || 0;
      const feedbackTotal = positive + negative;

      return {
        agent,
        period,
        totalSessions,
        totalMessages,
        uniqueUsers,
        averageSessionLength,
        averageMessagesPerSession,
        feedbackStats: {
          total: feedbackTotal,
          positive,
          negative,
          positiveRate: feedbackTotal > 0 ? positive / feedbackTotal : 0,
        },
      };
    } catch (error) {
      console.error('[AnalyticsCollector] Error:', error);
      return null;
    }
  }

  /**
   * Analyze feature adoption
   */
  async analyzeFeatureAdoption(): Promise<FeatureAdoption[]> {
    // TODO: Track specific feature usage
    // For now, return placeholders for key features
    return [
      {
        featureName: 'Sage AI Tutor',
        usersTotal: 100,
        usersUsing: 45,
        adoptionRate: 0.45,
        engagementScore: 0.75,
        trend: 'growing',
      },
      {
        featureName: 'Lexi Help Bot',
        usersTotal: 100,
        usersUsing: 30,
        adoptionRate: 0.30,
        engagementScore: 0.60,
        trend: 'stable',
      },
    ];
  }

  /**
   * Generate growth insights from analytics
   */
  async generateInsights(): Promise<GrowthInsight[]> {
    const insights: GrowthInsight[] = [];

    // Collect metrics for both agents
    const sageMetrics = await this.collectUsageMetrics('sage', 'week');
    const lexiMetrics = await this.collectUsageMetrics('lexi', 'week');

    // Analyze Sage
    if (sageMetrics) {
      // Check for low engagement
      if (sageMetrics.averageMessagesPerSession < 3) {
        insights.push({
          type: 'risk',
          priority: 'high',
          message: 'Sage sessions are very short (avg 3 messages). Users may be dropping off.',
          data: sageMetrics,
          recommendedAction: 'Analyze drop-off points and improve onboarding',
        });
      }

      // Check feedback ratio
      if (sageMetrics.feedbackStats.positiveRate < 0.6 && sageMetrics.feedbackStats.total > 10) {
        insights.push({
          type: 'risk',
          priority: 'critical',
          message: `Sage has low satisfaction rate (${(sageMetrics.feedbackStats.positiveRate * 100).toFixed(0)}% positive)`,
          data: sageMetrics.feedbackStats,
          recommendedAction: 'Run feedback processor to identify curriculum gaps',
        });
      }

      // Check growth
      if (sageMetrics.uniqueUsers > 50) {
        insights.push({
          type: 'milestone',
          priority: 'low',
          message: `Sage reached ${sageMetrics.uniqueUsers} unique users this week`,
          data: sageMetrics,
        });
      }
    }

    // Analyze Lexi
    if (lexiMetrics) {
      if (lexiMetrics.feedbackStats.positiveRate > 0.8 && lexiMetrics.feedbackStats.total > 10) {
        insights.push({
          type: 'opportunity',
          priority: 'medium',
          message: `Lexi has high satisfaction (${(lexiMetrics.feedbackStats.positiveRate * 100).toFixed(0)}% positive). Consider promoting it more.`,
          data: lexiMetrics.feedbackStats,
          recommendedAction: 'Increase Lexi visibility in UI',
        });
      }
    }

    return insights;
  }

  /**
   * Publish insights to CAS Planner
   */
  async publishInsights(insights: GrowthInsight[]): Promise<void> {
    for (const insight of insights) {
      if (insight.type === 'risk' || insight.priority === 'critical') {
        const envelope = createTaskEnvelope(
          'marketer',
          'cas:planner',
          {
            action: 'handle_growth_insight',
            insight,
          }
        );

        await publish(envelope);
      }
    }

    console.log(`[AnalyticsCollector] Published ${insights.length} insights to CAS`);
  }

  /**
   * Run full analytics collection cycle
   */
  async runCollectionCycle(): Promise<{
    sageMetrics: UsageMetrics | null;
    lexiMetrics: UsageMetrics | null;
    insights: GrowthInsight[];
  }> {
    console.log('[AnalyticsCollector] Starting collection cycle...');

    const sageMetrics = await this.collectUsageMetrics('sage', 'day');
    const lexiMetrics = await this.collectUsageMetrics('lexi', 'day');
    const insights = await this.generateInsights();

    await this.publishInsights(insights);

    console.log('[AnalyticsCollector] Collection cycle complete');

    return {
      sageMetrics,
      lexiMetrics,
      insights,
    };
  }
}

// --- Singleton Export ---

export const analyticsCollector = new AnalyticsCollector();

export default AnalyticsCollector;
