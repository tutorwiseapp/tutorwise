import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * CAS Marketer Agent - Analytics Collection Cron Job
 *
 * Runs daily to collect usage analytics from Sage and Lexi,
 * generate insights, and publish to CAS Planner for strategic planning.
 *
 * Schedule: Daily at 02:00 UTC via pg_cron
 */

const CRON_SECRET = Deno.env.get('CRON_SECRET') || 'tutorwise-cron-2024-cas-marketer';

interface UsageMetrics {
  agent: 'sage' | 'lexi';
  period: string;
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
  data: any;
  recommendedAction?: string;
}

async function collectUsageMetrics(
  supabase: any,
  agent: 'sage' | 'lexi',
  hours: number = 24
): Promise<UsageMetrics | null> {
  try {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from(agent === 'sage' ? 'sage_sessions' : 'lexi_conversations')
      .select('id, user_id, message_count, started_at, ended_at')
      .gte('started_at', startTime);

    if (sessionsError) throw sessionsError;

    // Get feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('ai_feedback')
      .select('rating')
      .eq('agent_type', agent)
      .gte('created_at', startTime);

    if (feedbackError) throw feedbackError;

    // Calculate metrics
    const totalSessions = sessions?.length || 0;
    const uniqueUsers = new Set(sessions?.map(s => s.user_id) || []).size;
    const totalMessages = sessions?.reduce((sum, s) => sum + (s.message_count || 0), 0) || 0;

    const sessionLengths = sessions
      ?.filter(s => s.started_at && s.ended_at)
      .map(s => {
        const start = new Date(s.started_at).getTime();
        const end = new Date(s.ended_at).getTime();
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
      period: `${hours} hours`,
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
    console.error(`[CAS Marketer] Error collecting ${agent} metrics:`, error);
    return null;
  }
}

function generateInsights(sageMetrics: UsageMetrics | null, lexiMetrics: UsageMetrics | null): GrowthInsight[] {
  const insights: GrowthInsight[] = [];

  // Analyze Sage
  if (sageMetrics) {
    // Check for low engagement
    if (sageMetrics.averageMessagesPerSession < 3 && sageMetrics.totalSessions > 5) {
      insights.push({
        type: 'risk',
        priority: 'high',
        message: `Sage sessions are very short (avg ${sageMetrics.averageMessagesPerSession.toFixed(1)} messages). Users may be dropping off.`,
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
        recommendedAction: 'Run Sage feedback processor to identify curriculum gaps',
      });
    }

    // Check growth
    if (sageMetrics.uniqueUsers > 50) {
      insights.push({
        type: 'milestone',
        priority: 'low',
        message: `Sage reached ${sageMetrics.uniqueUsers} unique users in last 24h`,
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

    // Check for tool usage
    if (lexiMetrics.totalSessions > 0 && lexiMetrics.averageMessagesPerSession < 2) {
      insights.push({
        type: 'risk',
        priority: 'medium',
        message: 'Lexi sessions are very short. Users may not be discovering tool capabilities.',
        data: lexiMetrics,
        recommendedAction: 'Improve tool discovery UX',
      });
    }
  }

  return insights;
}

serve(async (req) => {
  try {
    // Verify cron secret
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[CAS Marketer] Starting daily analytics collection...');

    // Collect metrics for both agents
    const sageMetrics = await collectUsageMetrics(supabase, 'sage', 24);
    const lexiMetrics = await collectUsageMetrics(supabase, 'lexi', 24);

    // Generate insights
    const insights = generateInsights(sageMetrics, lexiMetrics);

    // Store insights in database for CAS Planner to review
    const criticalInsights = insights.filter(i => i.priority === 'critical' || i.priority === 'high');

    if (criticalInsights.length > 0) {
      for (const insight of criticalInsights) {
        await supabase
          .from('cas_marketer_insights')
          .insert({
            type: insight.type,
            priority: insight.priority,
            message: insight.message,
            data: insight.data,
            recommended_action: insight.recommendedAction,
            status: 'pending',
            created_at: new Date().toISOString(),
          });
      }
      console.log(`[CAS Marketer] Created ${criticalInsights.length} critical insights for CAS Planner`);
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        sage: sageMetrics,
        lexi: lexiMetrics,
      },
      insights: {
        total: insights.length,
        critical: insights.filter(i => i.priority === 'critical').length,
        high: insights.filter(i => i.priority === 'high').length,
        items: insights,
      },
    };

    console.log('[CAS Marketer] Analytics collection complete');
    console.log(`- Sage: ${sageMetrics?.totalSessions || 0} sessions, ${(sageMetrics?.feedbackStats.positiveRate || 0) * 100}% satisfaction`);
    console.log(`- Lexi: ${lexiMetrics?.totalSessions || 0} sessions, ${(lexiMetrics?.feedbackStats.positiveRate || 0) * 100}% satisfaction`);
    console.log(`- Generated ${insights.length} insights (${criticalInsights.length} high-priority)`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[CAS Marketer] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
