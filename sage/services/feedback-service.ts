/**
 * Sage Feedback Service
 *
 * Analyzes user feedback to identify curriculum gaps and improvement opportunities.
 * Integrates with CAS for automated content generation and DSPy optimization.
 *
 * @module sage/services/feedback
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- Types ---

export interface FeedbackStats {
  total: number;
  positive: number;
  negative: number;
  positiveRate: number;
  recentTrend: 'improving' | 'declining' | 'stable';
  averageRating?: number;
}

export interface TopicFeedbackStats extends FeedbackStats {
  topicId: string;
  topicName: string;
  subject: string;
  level: string;
}

export interface CurriculumGap {
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

export interface FeedbackInsight {
  type: 'gap' | 'improvement' | 'milestone';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  data: any;
  actionRequired: boolean;
}

// --- Sage Feedback Service ---

export class SageFeedbackService {
  private supabase: SupabaseClient | null = null;

  constructor() {}

  /**
   * Initialize with Supabase client
   */
  initialize(supabaseClient?: SupabaseClient): void {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && key) {
        this.supabase = createClient(url, key, {
          auth: { persistSession: false },
        });
      }
    }

    if (this.supabase) {
      console.log('[SageFeedbackService] Initialized');
    }
  }

  /**
   * Get overall feedback statistics
   */
  async getOverallStats(sinceDays: number = 30): Promise<FeedbackStats | null> {
    if (!this.supabase) return null;

    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - sinceDays);

      const { data, error } = await this.supabase
        .from('ai_feedback')
        .select('rating, rating_value, created_at')
        .eq('agent_type', 'sage')
        .gte('created_at', sinceDate.toISOString());

      if (error || !data) return null;

      return this.calculateStats(data);
    } catch {
      return null;
    }
  }

  /**
   * Get feedback statistics by topic
   */
  async getTopicStats(sinceDays: number = 30): Promise<TopicFeedbackStats[]> {
    if (!this.supabase) return [];

    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - sinceDays);

      const { data, error } = await this.supabase
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
        const stats = this.calculateStats(feedbackItems);
        const firstItem = feedbackItems[0];

        results.push({
          topicId,
          topicName: topicId, // TODO: lookup from curriculum data
          subject: firstItem.context?.subject || 'general',
          level: firstItem.context?.level || 'GCSE',
          ...stats,
        });
      }

      // Sort by negative rate (worst first)
      results.sort((a, b) => a.positiveRate - b.positiveRate);

      return results;
    } catch (error) {
      console.error('[SageFeedbackService] Error getting topic stats:', error);
      return [];
    }
  }

  /**
   * Identify curriculum gaps from feedback
   */
  async identifyCurriculumGaps(threshold: number = 0.6): Promise<CurriculumGap[]> {
    const topicStats = await this.getTopicStats(30);
    const gaps: CurriculumGap[] = [];

    for (const topic of topicStats) {
      // Gap criteria: positive rate below threshold and at least 3 feedback items
      if (topic.positiveRate < threshold && topic.total >= 3) {
        // Get recent comments for this topic
        const comments = await this.getTopicComments(topic.topicId, 10);

        // Determine severity
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
        if (topic.positiveRate < 0.3 && topic.total >= 10) {
          severity = 'critical';
        } else if (topic.positiveRate < 0.4) {
          severity = 'high';
        } else if (topic.positiveRate < 0.5) {
          severity = 'medium';
        }

        // Extract common complaints
        const commonComplaints = this.extractCommonComplaints(comments);

        // Recommend actions
        const recommendedActions = this.recommendActions(topic, commonComplaints);

        gaps.push({
          topicId: topic.topicId,
          topicName: topic.topicName,
          subject: topic.subject,
          level: topic.level,
          negativeCount: topic.negative,
          positiveRate: topic.positiveRate,
          severity,
          commonComplaints,
          recommendedActions,
        });
      }
    }

    // Sort by severity (critical first)
    gaps.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return gaps;
  }

  /**
   * Get feedback comments for a topic
   */
  private async getTopicComments(topicId: string, limit: number = 10): Promise<string[]> {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('ai_feedback')
        .select('comment, context')
        .eq('agent_type', 'sage')
        .eq('rating', 'thumbs_down')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data
        .filter(row => row.context?.topic === topicId && row.comment)
        .map(row => row.comment!)
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  /**
   * Extract common complaints from comments
   */
  private extractCommonComplaints(comments: string[]): string[] {
    if (comments.length === 0) return [];

    // Simple keyword extraction (in production, use NLP)
    const complaints = new Map<string, number>();
    const keywords = [
      'confusing',
      'unclear',
      'wrong',
      'incorrect',
      'not helpful',
      'didn\'t understand',
      'missing',
      'too hard',
      'too easy',
      'boring',
      'repetitive',
    ];

    for (const comment of comments) {
      const lower = comment.toLowerCase();
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          complaints.set(keyword, (complaints.get(keyword) || 0) + 1);
        }
      }
    }

    // Return top 3 most common
    return Array.from(complaints.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([keyword]) => keyword);
  }

  /**
   * Recommend actions based on feedback
   */
  private recommendActions(topic: TopicFeedbackStats, complaints: string[]): string[] {
    const actions: string[] = [];

    if (complaints.includes('confusing') || complaints.includes('unclear')) {
      actions.push('Regenerate curriculum content with clearer explanations');
      actions.push('Add more worked examples');
    }

    if (complaints.includes('wrong') || complaints.includes('incorrect')) {
      actions.push('Review curriculum content for accuracy');
      actions.push('Update knowledge chunks with correct information');
    }

    if (complaints.includes('too hard')) {
      actions.push('Add prerequisite links and scaffolding');
      actions.push('Generate easier practice problems');
    }

    if (complaints.includes('too easy') || complaints.includes('boring')) {
      actions.push('Add challenging extension problems');
      actions.push('Include real-world applications');
    }

    if (complaints.includes('missing')) {
      actions.push('Expand curriculum coverage for this topic');
      actions.push('Add more diverse examples');
    }

    if (actions.length === 0) {
      actions.push('Review recent feedback comments manually');
      actions.push('Conduct user testing for this topic');
    }

    return actions;
  }

  /**
   * Generate feedback insights for CAS
   */
  async generateInsights(): Promise<FeedbackInsight[]> {
    const insights: FeedbackInsight[] = [];

    // Identify gaps
    const gaps = await this.identifyCurriculumGaps(0.6);
    for (const gap of gaps.slice(0, 5)) { // Top 5 gaps
      insights.push({
        type: 'gap',
        severity: gap.severity,
        message: `Topic "${gap.topicName}" has ${gap.positiveRate * 100}% positive rate (${gap.negativeCount} negative)`,
        data: gap,
        actionRequired: gap.severity === 'critical' || gap.severity === 'high',
      });
    }

    // Check for improvements
    const topicStats = await this.getTopicStats(30);
    for (const topic of topicStats) {
      if (topic.recentTrend === 'improving' && topic.positiveRate > 0.8) {
        insights.push({
          type: 'improvement',
          severity: 'low',
          message: `Topic "${topic.topicName}" is trending positively (${topic.positiveRate * 100}% positive)`,
          data: topic,
          actionRequired: false,
        });
      }
    }

    // Check milestones
    const overallStats = await this.getOverallStats(30);
    if (overallStats && overallStats.total >= 100) {
      insights.push({
        type: 'milestone',
        severity: 'low',
        message: `Reached ${overallStats.total} feedback items (${overallStats.positiveRate * 100}% positive)`,
        data: overallStats,
        actionRequired: false,
      });
    }

    return insights;
  }

  /**
   * Calculate statistics from feedback data
   */
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

export const sageFeedbackService = new SageFeedbackService();

export default SageFeedbackService;
