/**
 * Marketer Analytics Collector - Supabase Edge Function
 *
 * Runs daily via Supabase cron to:
 * 1. Collect usage metrics from Sage and Lexi
 * 2. Analyze trends and feature adoption
 * 3. Generate growth insights
 * 4. Publish alerts to CAS Planner
 *
 * Triggered by:
 * - Supabase cron (0 3 * * *) - Daily at 3am UTC
 * - Manual API call with secret
 *
 * Security: Requires CRON_SECRET env var
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Types ---

interface UsageMetrics {
  agent: 'sage' | 'lexi';
  period: 'day';
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

interface GrowthInsight {
  type: 'opportunity' | 'risk' | 'milestone';
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  agent: 'sage' | 'lexi';
}

// --- Main Handler ---

serve(async (req) => {
  try {
    // 1. Verify secret
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET') || 'tutorwise-cron-2024-marketer';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[MarketerAnalytics] Starting analytics collection...');

    // 2. Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Collect metrics for both agents
    const sageMetrics = await collectUsageMetrics(supabase, 'sage');
    const lexiMetrics = await collectUsageMetrics(supabase, 'lexi');

    console.log(`[MarketerAnalytics] Sage: ${sageMetrics?.totalSessions || 0} sessions`);
    console.log(`[MarketerAnalytics] Lexi: ${lexiMetrics?.totalSessions || 0} sessions`);

    // 4. Generate insights
    const insights: GrowthInsight[] = [];

    if (sageMetrics) {
      // Check for low engagement
      if (sageMetrics.averageMessagesPerSession < 3 && sageMetrics.totalSessions > 10) {
        insights.push({
          type: 'risk',
          priority: 'high',
          message: `Sage sessions very short (avg ${sageMetrics.averageMessagesPerSession.toFixed(1)} messages). Users may be dropping off.`,
          agent: 'sage',
        });
      }

      // Check feedback ratio
      if (sageMetrics.feedbackStats.positiveRate < 0.6 && sageMetrics.feedbackStats.total > 10) {
        insights.push({
          type: 'risk',
          priority: 'critical',
          message: `Sage has low satisfaction rate (${(sageMetrics.feedbackStats.positiveRate * 100).toFixed(0)}% positive)`,
          agent: 'sage',
        });
      }

      // Check growth
      if (sageMetrics.uniqueUsers > 50) {
        insights.push({
          type: 'milestone',
          priority: 'low',
          message: `Sage reached ${sageMetrics.uniqueUsers} unique users today`,
          agent: 'sage',
        });
      }
    }

    if (lexiMetrics) {
      if (lexiMetrics.feedbackStats.positiveRate > 0.8 && lexiMetrics.feedbackStats.total > 10) {
        insights.push({
          type: 'opportunity',
          priority: 'medium',
          message: `Lexi has high satisfaction (${(lexiMetrics.feedbackStats.positiveRate * 100).toFixed(0)}% positive). Consider promoting it more.`,
          agent: 'lexi',
        });
      }
    }

    console.log(`[MarketerAnalytics] Generated ${insights.length} insights`);

    // TODO: Publish critical insights to CAS message bus

    // 5. Return summary
    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        metrics: {
          sage: sageMetrics ? {
            sessions: sageMetrics.totalSessions,
            users: sageMetrics.uniqueUsers,
            avgMessages: sageMetrics.averageMessagesPerSession.toFixed(1),
            satisfaction: `${(sageMetrics.feedbackStats.positiveRate * 100).toFixed(0)}%`,
          } : null,
          lexi: lexiMetrics ? {
            sessions: lexiMetrics.totalSessions,
            users: lexiMetrics.uniqueUsers,
            avgMessages: lexiMetrics.averageMessagesPerSession.toFixed(1),
            satisfaction: `${(lexiMetrics.feedbackStats.positiveRate * 100).toFixed(0)}%`,
          } : null,
        },
        insights: insights.map(i => ({
          type: i.type,
          priority: i.priority,
          message: i.message,
          agent: i.agent,
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[MarketerAnalytics] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});

// --- Helper Functions ---

async function collectUsageMetrics(
  supabase: any,
  agent: 'sage' | 'lexi'
): Promise<UsageMetrics | null> {
  try {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setDate(startTime.getDate() - 1); // Last 24 hours

    // Get sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from(agent === 'sage' ? 'sage_sessions' : 'lexi_sessions')
      .select('id, user_id, message_count, started_at, ended_at')
      .gte('started_at', startTime.toISOString());

    if (sessionsError) {
      console.error(`[MarketerAnalytics] Error fetching ${agent} sessions:`, sessionsError);
      return null;
    }

    // Get feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('ai_feedback')
      .select('rating')
      .eq('agent_type', agent)
      .gte('created_at', startTime.toISOString());

    if (feedbackError) {
      console.error(`[MarketerAnalytics] Error fetching ${agent} feedback:`, feedbackError);
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
      period: 'day',
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
    console.error(`[MarketerAnalytics] Error collecting ${agent} metrics:`, error);
    return null;
  }
}
