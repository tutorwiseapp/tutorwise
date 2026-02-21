/**
 * Sage Feedback Processor - Supabase Edge Function
 *
 * Runs daily via Supabase cron to:
 * 1. Analyze Sage feedback from past 30 days
 * 2. Identify curriculum gaps
 * 3. Create tasks for CAS to improve content
 *
 * Triggered by:
 * - Supabase cron (0 2 * * *) - Daily at 2am UTC
 * - Manual API call with secret
 *
 * Security: Requires CRON_SECRET env var
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Types (copied from feedback-service.ts) ---

interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  positiveRate: number;
  recentTrend: 'improving' | 'declining' | 'stable';
}

interface TopicFeedbackStats extends FeedbackStats {
  topicId: string;
  topicName: string;
  subject: string;
  level: string;
}

interface CurriculumGap {
  topicId: string;
  topicName: string;
  subject: string;
  level: string;
  negativeCount: number;
  positiveRate: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  commonComplaints: string[];
  recommendedActions: string[];
}

// --- Main Handler ---

serve(async (req) => {
  try {
    // 1. Verify secret for security
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET') || 'tutorwise-cron-2024-sage-feedback';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[SageFeedbackProcessor] Starting processing cycle...');

    // 2. Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Get topic-level feedback stats
    const topicStats = await getTopicStats(supabase);
    console.log(`[SageFeedbackProcessor] Found ${topicStats.length} topics with feedback`);

    // 4. Identify curriculum gaps
    const gaps = await identifyCurriculumGaps(topicStats, 0.6);
    console.log(`[SageFeedbackProcessor] Identified ${gaps.length} curriculum gaps`);

    // 5. Create tasks for critical/high severity gaps
    const actionableGaps = gaps.filter(g => g.severity === 'critical' || g.severity === 'high');
    console.log(`[SageFeedbackProcessor] ${actionableGaps.length} gaps require action`);

    // TODO: Publish to CAS message bus
    // For now, just log the gaps
    for (const gap of actionableGaps) {
      console.log(`  - ${gap.severity.toUpperCase()}: ${gap.topicName} (${gap.positiveRate * 100}% positive)`);
    }

    // 6. Return summary
    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        stats: {
          totalTopics: topicStats.length,
          totalGaps: gaps.length,
          criticalGaps: gaps.filter(g => g.severity === 'critical').length,
          highGaps: gaps.filter(g => g.severity === 'high').length,
          actionableGaps: actionableGaps.length,
        },
        gaps: actionableGaps.map(g => ({
          topic: g.topicName,
          severity: g.severity,
          positiveRate: g.positiveRate,
          negativeCount: g.negativeCount,
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[SageFeedbackProcessor] Error:', error);
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

async function getTopicStats(supabase: any): Promise<TopicFeedbackStats[]> {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 30);

  const { data, error } = await supabase
    .from('ai_feedback')
    .select('rating, rating_value, created_at, context')
    .eq('agent_type', 'sage')
    .gte('created_at', sinceDate.toISOString());

  if (error || !data) return [];

  // Group by topic
  const byTopic = new Map<string, Array<any>>();
  for (const row of data) {
    const topic = row.context?.topic || 'general';
    if (!byTopic.has(topic)) {
      byTopic.set(topic, []);
    }
    byTopic.get(topic)!.push(row);
  }

  // Calculate stats for each topic
  const results: TopicFeedbackStats[] = [];
  for (const [topicId, feedbackItems] of byTopic.entries()) {
    const stats = calculateStats(feedbackItems);
    const firstItem = feedbackItems[0];

    results.push({
      topicId,
      topicName: topicId,
      subject: firstItem.context?.subject || 'general',
      level: firstItem.context?.level || 'GCSE',
      ...stats,
    });
  }

  // Sort by positive rate (worst first)
  results.sort((a, b) => a.positiveRate - b.positiveRate);

  return results;
}

function calculateStats(data: Array<{ rating: string; created_at: string }>): FeedbackStats {
  const total = data.length;
  const positive = data.filter(d => d.rating === 'thumbs_up').length;
  const negative = total - positive;

  // Calculate trend
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
    recentTrend,
  };
}

async function identifyCurriculumGaps(
  topicStats: TopicFeedbackStats[],
  threshold: number
): Promise<CurriculumGap[]> {
  const gaps: CurriculumGap[] = [];

  for (const topic of topicStats) {
    if (topic.positiveRate < threshold && topic.total >= 3) {
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (topic.positiveRate < 0.3 && topic.total >= 10) {
        severity = 'critical';
      } else if (topic.positiveRate < 0.4) {
        severity = 'high';
      } else if (topic.positiveRate < 0.5) {
        severity = 'medium';
      }

      gaps.push({
        topicId: topic.topicId,
        topicName: topic.topicName,
        subject: topic.subject,
        level: topic.level,
        negativeCount: topic.negative,
        positiveRate: topic.positiveRate,
        severity,
        commonComplaints: [], // TODO: Extract from comments
        recommendedActions: [
          'Review curriculum content',
          'Add more worked examples',
          'Update knowledge chunks',
        ],
      });
    }
  }

  // Sort by severity
  gaps.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return gaps;
}
