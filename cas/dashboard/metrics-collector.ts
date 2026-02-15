/**
 * CAS Dashboard Metrics Collector
 *
 * Collects metrics from Lexi, Sage, and CAS agents
 * for the monitoring dashboard.
 *
 * @module cas/dashboard/metrics-collector
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  AgentMetrics,
  LexiMetrics,
  SageMetrics,
  SystemMetrics,
  FeedbackSummary,
  TimeRange,
} from './types';

// --- Metrics Collector ---

export class MetricsCollector {
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
   * Get Lexi metrics
   */
  async getLexiMetrics(range: TimeRange = 'day'): Promise<LexiMetrics> {
    if (!this.supabase) {
      return this.emptyLexiMetrics();
    }

    const since = this.getTimeRangeStart(range);

    try {
      // Get session stats
      const { data: sessions, count: totalSessions } = await this.supabase
        .from('lexi_conversations')
        .select('persona, started_at, ended_at, message_count', { count: 'exact' })
        .gte('started_at', since.toISOString());

      // Get active sessions
      const { count: activeSessions } = await this.supabase
        .from('lexi_conversations')
        .select('*', { count: 'exact', head: true })
        .is('ended_at', null)
        .gte('started_at', since.toISOString());

      // Get feedback
      const { data: feedback } = await this.supabase
        .from('ai_feedback')
        .select('rating')
        .eq('agent_type', 'lexi')
        .gte('created_at', since.toISOString());

      // Calculate by persona
      const byPersona: Record<string, number> = {};
      sessions?.forEach(s => {
        byPersona[s.persona] = (byPersona[s.persona] || 0) + 1;
      });

      // Calculate average duration
      let totalDuration = 0;
      let durationCount = 0;
      sessions?.forEach(s => {
        if (s.ended_at) {
          const duration = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
          totalDuration += duration;
          durationCount++;
        }
      });

      const positive = feedback?.filter(f => f.rating === 'thumbs_up').length || 0;
      const negative = feedback?.filter(f => f.rating === 'thumbs_down').length || 0;

      return {
        totalSessions: totalSessions || 0,
        activeSessions: activeSessions || 0,
        messageCount: sessions?.reduce((sum, s) => sum + (s.message_count || 0), 0) || 0,
        avgSessionDuration: durationCount > 0 ? Math.round(totalDuration / durationCount / 1000) : 0,
        feedbackPositive: positive,
        feedbackNegative: negative,
        byPersona,
      };
    } catch (error) {
      console.error('[MetricsCollector] Lexi metrics error:', error);
      return this.emptyLexiMetrics();
    }
  }

  /**
   * Get Sage metrics
   */
  async getSageMetrics(range: TimeRange = 'day'): Promise<SageMetrics> {
    if (!this.supabase) {
      return this.emptySageMetrics();
    }

    const since = this.getTimeRangeStart(range);

    try {
      // Get session stats
      const { data: sessions, count: totalSessions } = await this.supabase
        .from('sage_sessions')
        .select('user_role, subject, started_at, ended_at, message_count', { count: 'exact' })
        .gte('started_at', since.toISOString());

      // Get active sessions
      const { count: activeSessions } = await this.supabase
        .from('sage_sessions')
        .select('*', { count: 'exact', head: true })
        .is('ended_at', null)
        .gte('started_at', since.toISOString());

      // Get feedback
      const { data: feedback } = await this.supabase
        .from('ai_feedback')
        .select('rating, context')
        .eq('agent_type', 'sage')
        .gte('created_at', since.toISOString());

      // Calculate by role and subject
      const byRole: Record<string, number> = {};
      const bySubject: Record<string, number> = {};
      sessions?.forEach(s => {
        if (s.user_role) byRole[s.user_role] = (byRole[s.user_role] || 0) + 1;
        if (s.subject) bySubject[s.subject] = (bySubject[s.subject] || 0) + 1;
      });

      // Calculate average duration
      let totalDuration = 0;
      let durationCount = 0;
      sessions?.forEach(s => {
        if (s.ended_at) {
          const duration = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
          totalDuration += duration;
          durationCount++;
        }
      });

      const positive = feedback?.filter(f => f.rating === 'thumbs_up').length || 0;
      const negative = feedback?.filter(f => f.rating === 'thumbs_down').length || 0;

      return {
        totalSessions: totalSessions || 0,
        activeSessions: activeSessions || 0,
        messageCount: sessions?.reduce((sum, s) => sum + (s.message_count || 0), 0) || 0,
        avgSessionDuration: durationCount > 0 ? Math.round(totalDuration / durationCount / 1000) : 0,
        feedbackPositive: positive,
        feedbackNegative: negative,
        byRole,
        bySubject,
      };
    } catch (error) {
      console.error('[MetricsCollector] Sage metrics error:', error);
      return this.emptySageMetrics();
    }
  }

  /**
   * Get CAS agent metrics
   */
  async getAgentMetrics(): Promise<AgentMetrics[]> {
    // CAS agents are code-based, so we return static status
    const agents = ['planner', 'analyst', 'developer', 'tester', 'qa', 'security', 'engineer', 'marketer'];

    return agents.map(agentType => ({
      agentType,
      status: 'active' as const,
      lastActivity: new Date(),
      taskCount: 0,
      errorCount: 0,
    }));
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    if (!this.supabase) {
      return {
        timestamp: new Date(),
        apiLatency: 0,
        errorRate: 0,
        activeUsers: 0,
      };
    }

    try {
      // Get active users (users with activity in last hour)
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);

      const { count: activeUsers } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', hourAgo.toISOString());

      return {
        timestamp: new Date(),
        apiLatency: 0, // Would need APM integration
        errorRate: 0,  // Would need error tracking
        activeUsers: activeUsers || 0,
      };
    } catch (error) {
      console.error('[MetricsCollector] System metrics error:', error);
      return {
        timestamp: new Date(),
        apiLatency: 0,
        errorRate: 0,
        activeUsers: 0,
      };
    }
  }

  /**
   * Get feedback summary
   */
  async getFeedbackSummary(
    agent: 'lexi' | 'sage',
    range: TimeRange = 'week'
  ): Promise<FeedbackSummary> {
    if (!this.supabase) {
      return this.emptyFeedbackSummary(agent, range);
    }

    const since = this.getTimeRangeStart(range);

    try {
      const { data: feedback } = await this.supabase
        .from('ai_feedback')
        .select('rating, comment, context, created_at')
        .eq('agent_type', agent)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false });

      const positive = feedback?.filter(f => f.rating === 'thumbs_up').length || 0;
      const negative = feedback?.filter(f => f.rating === 'thumbs_down').length || 0;
      const total = positive + negative;

      // Analyze by role
      const byRole: Record<string, { positive: number; negative: number }> = {};
      feedback?.forEach(f => {
        const role = (f.context as Record<string, string>)?.user_role || 'unknown';
        if (!byRole[role]) byRole[role] = { positive: 0, negative: 0 };
        if (f.rating === 'thumbs_up') byRole[role].positive++;
        else byRole[role].negative++;
      });

      // Determine trend (compare first half vs second half)
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (feedback && feedback.length >= 10) {
        const midpoint = Math.floor(feedback.length / 2);
        const recentHalf = feedback.slice(0, midpoint);
        const olderHalf = feedback.slice(midpoint);

        const recentRate = recentHalf.filter(f => f.rating === 'thumbs_up').length / recentHalf.length;
        const olderRate = olderHalf.filter(f => f.rating === 'thumbs_up').length / olderHalf.length;

        if (recentRate > olderRate + 0.1) trend = 'improving';
        else if (recentRate < olderRate - 0.1) trend = 'declining';
      }

      // Extract common issues from negative feedback comments
      const negativeComments = feedback
        ?.filter(f => f.rating === 'thumbs_down' && f.comment)
        .map(f => f.comment as string) || [];

      return {
        agent,
        period: range,
        total,
        positive,
        negative,
        positiveRate: total > 0 ? Math.round((positive / total) * 100) : 0,
        trend,
        topIssues: negativeComments.slice(0, 5),
        byRole,
      };
    } catch (error) {
      console.error('[MetricsCollector] Feedback summary error:', error);
      return this.emptyFeedbackSummary(agent, range);
    }
  }

  // --- Helper Methods ---

  private getTimeRangeStart(range: TimeRange): Date {
    const now = new Date();
    switch (range) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private emptyLexiMetrics(): LexiMetrics {
    return {
      totalSessions: 0,
      activeSessions: 0,
      messageCount: 0,
      avgSessionDuration: 0,
      feedbackPositive: 0,
      feedbackNegative: 0,
      byPersona: {},
    };
  }

  private emptySageMetrics(): SageMetrics {
    return {
      totalSessions: 0,
      activeSessions: 0,
      messageCount: 0,
      avgSessionDuration: 0,
      feedbackPositive: 0,
      feedbackNegative: 0,
      byRole: {},
      bySubject: {},
    };
  }

  private emptyFeedbackSummary(agent: 'lexi' | 'sage', range: TimeRange): FeedbackSummary {
    return {
      agent,
      period: range,
      total: 0,
      positive: 0,
      negative: 0,
      positiveRate: 0,
      trend: 'stable',
      topIssues: [],
      byRole: {},
    };
  }
}

// --- Singleton Export ---

export const metricsCollector = new MetricsCollector();

export default MetricsCollector;
