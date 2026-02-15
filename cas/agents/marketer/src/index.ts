/**
 * Marketer Agent - AI Growth Manager & Analytics Specialist
 *
 * Responsibilities:
 * - Usage analytics and tracking
 * - User behavior analysis
 * - A/B testing coordination
 * - Production metrics review
 * - Feature impact assessment
 * - AI feedback analysis (Sage/Lexi)
 *
 * @agent Marketer Agent
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { analyst } from '../../analyst/src';
import { developer } from '../../developer/src';

// --- AI Feedback Types ---

export interface AIFeedbackRecord {
  id: string;
  agent_type: 'sage' | 'lexi';
  session_id: string;
  user_id: string;
  rating: 'thumbs_up' | 'thumbs_down';
  comment?: string;
  context: {
    user_role?: string;
    subject?: string;
    topic?: string;
    persona?: string;
  };
  created_at: string;
}

export interface AIFeedbackSummary {
  agentType: 'sage' | 'lexi' | 'all';
  period: string;
  totalFeedback: number;
  positiveCount: number;
  negativeCount: number;
  satisfactionRate: number;
  byRole: Record<string, { positive: number; negative: number }>;
  bySubject: Record<string, { positive: number; negative: number }>;
  topComplaints: string[];
  topPraise: string[];
}

export interface FeatureMetrics {
  featureName: string;
  deploymentDate: string;
  reviewDate: string;
  metrics: {
    adoption: number;
    completion: number;
    errorRate: number;
    avgSessionDuration: number;
    userSatisfaction: number;
  };
  userFeedback: UserFeedback[];
}

export interface UserFeedback {
  type: 'positive' | 'negative' | 'suggestion';
  category: string;
  content: string;
  count: number;
}

export interface ProductionReport {
  feature: string;
  timePeriod: string;
  metrics: FeatureMetrics['metrics'];
  trends: MetricTrend[];
  userFeedback: UserFeedback[];
  timestamp: string;
}

export interface MetricTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  significance: 'high' | 'medium' | 'low';
}

export interface FeatureImpactSummary {
  feature: string;
  recommendation: 'SUCCESS' | 'ITERATE' | 'REMOVE';
  confidenceLevel: 'high' | 'medium' | 'low';
  report: string;
  actionItems: string[];
  timestamp: string;
}

class MarketerAgent {
  private projectRoot: string;
  private metricsDir: string;
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.projectRoot = path.resolve(__dirname, '../../../../');
    this.metricsDir = path.join(this.projectRoot, 'cas/agents/marketer/data');
    this.initializeSupabase();
  }

  /**
   * Initialize Supabase client for database access.
   */
  private initializeSupabase(): void {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (url && key) {
      this.supabase = createClient(url, key);
      console.log('[MarketerAgent] Supabase initialized');
    } else {
      console.warn('[MarketerAgent] Supabase credentials not found - using simulated data');
    }
  }

  /**
   * Fetch real AI feedback from the database.
   */
  public async fetchAIFeedback(options: {
    agentType?: 'sage' | 'lexi';
    days?: number;
    limit?: number;
  } = {}): Promise<AIFeedbackRecord[]> {
    if (!this.supabase) {
      console.warn('[MarketerAgent] No database connection - returning empty feedback');
      return [];
    }

    const { agentType, days = 7, limit = 1000 } = options;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = this.supabase
      .from('ai_feedback')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (agentType) {
      query = query.eq('agent_type', agentType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[MarketerAgent] Failed to fetch feedback:', error);
      return [];
    }

    console.log(`[MarketerAgent] Fetched ${data?.length || 0} feedback records`);
    return data || [];
  }

  /**
   * Analyze AI feedback and generate a summary report.
   */
  public async analyzeAIFeedback(options: {
    agentType?: 'sage' | 'lexi';
    days?: number;
  } = {}): Promise<AIFeedbackSummary> {
    console.log(`▶️ Marketer Agent: Analyzing AI feedback for ${options.agentType || 'all agents'}...`);

    const feedback = await this.fetchAIFeedback(options);

    // Initialize counters
    const byRole: Record<string, { positive: number; negative: number }> = {};
    const bySubject: Record<string, { positive: number; negative: number }> = {};
    const positiveComments: string[] = [];
    const negativeComments: string[] = [];

    let positiveCount = 0;
    let negativeCount = 0;

    // Process feedback records
    for (const record of feedback) {
      const isPositive = record.rating === 'thumbs_up';
      if (isPositive) positiveCount++; else negativeCount++;

      // Track by role
      const role = record.context?.user_role || 'unknown';
      if (!byRole[role]) byRole[role] = { positive: 0, negative: 0 };
      if (isPositive) byRole[role].positive++; else byRole[role].negative++;

      // Track by subject (Sage only)
      const subject = record.context?.subject;
      if (subject) {
        if (!bySubject[subject]) bySubject[subject] = { positive: 0, negative: 0 };
        if (isPositive) bySubject[subject].positive++; else bySubject[subject].negative++;
      }

      // Collect comments
      if (record.comment) {
        if (isPositive) positiveComments.push(record.comment);
        else negativeComments.push(record.comment);
      }
    }

    const totalFeedback = positiveCount + negativeCount;
    const satisfactionRate = totalFeedback > 0 ? (positiveCount / totalFeedback) * 100 : 0;

    const summary: AIFeedbackSummary = {
      agentType: options.agentType || 'all',
      period: `${options.days || 7} days`,
      totalFeedback,
      positiveCount,
      negativeCount,
      satisfactionRate: Math.round(satisfactionRate * 10) / 10,
      byRole,
      bySubject,
      topComplaints: negativeComments.slice(0, 5),
      topPraise: positiveComments.slice(0, 5),
    };

    console.log(`✅ AI Feedback Analysis complete. Satisfaction: ${summary.satisfactionRate}%`);
    return summary;
  }

  /**
   * Generate a markdown report of AI feedback trends.
   */
  public async generateAIFeedbackReport(options: {
    agentType?: 'sage' | 'lexi';
    days?: number;
  } = {}): Promise<string> {
    const summary = await this.analyzeAIFeedback(options);

    let report = `## AI Agent Feedback Report\n\n`;
    report += `**Agent:** ${summary.agentType === 'all' ? 'Sage & Lexi' : summary.agentType.charAt(0).toUpperCase() + summary.agentType.slice(1)}\n`;
    report += `**Period:** Last ${summary.period}\n`;
    report += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;

    report += `### Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Feedback | ${summary.totalFeedback} |\n`;
    report += `| 👍 Positive | ${summary.positiveCount} |\n`;
    report += `| 👎 Negative | ${summary.negativeCount} |\n`;
    report += `| Satisfaction Rate | ${summary.satisfactionRate}% |\n\n`;

    if (Object.keys(summary.byRole).length > 0) {
      report += `### Feedback by Role\n\n`;
      report += `| Role | 👍 | 👎 | Rate |\n`;
      report += `|------|-----|-----|------|\n`;
      for (const [role, counts] of Object.entries(summary.byRole)) {
        const total = counts.positive + counts.negative;
        const rate = total > 0 ? Math.round((counts.positive / total) * 100) : 0;
        report += `| ${role} | ${counts.positive} | ${counts.negative} | ${rate}% |\n`;
      }
      report += '\n';
    }

    if (Object.keys(summary.bySubject).length > 0) {
      report += `### Feedback by Subject (Sage)\n\n`;
      report += `| Subject | 👍 | 👎 | Rate |\n`;
      report += `|---------|-----|-----|------|\n`;
      for (const [subject, counts] of Object.entries(summary.bySubject)) {
        const total = counts.positive + counts.negative;
        const rate = total > 0 ? Math.round((counts.positive / total) * 100) : 0;
        report += `| ${subject} | ${counts.positive} | ${counts.negative} | ${rate}% |\n`;
      }
      report += '\n';
    }

    if (summary.topComplaints.length > 0) {
      report += `### Top Complaints\n\n`;
      for (const complaint of summary.topComplaints) {
        report += `- "${complaint}"\n`;
      }
      report += '\n';
    }

    if (summary.topPraise.length > 0) {
      report += `### Positive Feedback\n\n`;
      for (const praise of summary.topPraise) {
        report += `- "${praise}"\n`;
      }
      report += '\n';
    }

    return report;
  }

  /**
   * Generates a Production Performance Report for a feature.
   * In production, this would connect to analytics platforms.
   */
  public async generateProductionReport(
    featureName: string,
    metrics?: Partial<FeatureMetrics['metrics']>
  ): Promise<ProductionReport> {
    console.log(`▶️ Marketer Agent: Gathering production data for ${featureName}...`);

    // Default metrics (would come from analytics APIs in production)
    const defaultMetrics: FeatureMetrics['metrics'] = {
      adoption: 75,
      completion: 90,
      errorRate: 0.5,
      avgSessionDuration: 180,
      userSatisfaction: 4.2,
    };

    const finalMetrics = { ...defaultMetrics, ...metrics };

    // Calculate trends
    const trends: MetricTrend[] = [
      {
        metric: 'adoption',
        direction: finalMetrics.adoption > 70 ? 'up' : 'down',
        change: 5,
        significance: 'high',
      },
      {
        metric: 'errorRate',
        direction: finalMetrics.errorRate < 1 ? 'stable' : 'up',
        change: finalMetrics.errorRate,
        significance: finalMetrics.errorRate > 1 ? 'high' : 'low',
      },
    ];

    // Simulated user feedback
    const userFeedback: UserFeedback[] = [
      {
        type: 'positive',
        category: 'usability',
        content: 'The wizard flow is intuitive',
        count: 45,
      },
      {
        type: 'suggestion',
        category: 'performance',
        content: 'Would like faster load times',
        count: 12,
      },
      {
        type: 'negative',
        category: 'errors',
        content: 'Encountered errors during submission',
        count: 8,
      },
    ];

    const report: ProductionReport = {
      feature: featureName,
      timePeriod: '7 days post-deployment',
      metrics: finalMetrics,
      trends,
      userFeedback,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Production Performance Report generated.');
    return report;
  }

  /**
   * Formats a ProductionReport as a markdown string for review.
   */
  public formatProductionReport(report: ProductionReport): string {
    let markdown = `## Production Performance Report\n\n`;
    markdown += `- **Feature:** ${report.feature}\n`;
    markdown += `- **Time Period:** ${report.timePeriod}\n`;
    markdown += `- **Report Date:** ${new Date(report.timestamp).toLocaleDateString()}\n\n`;

    markdown += `### Metrics Summary\n\n`;
    markdown += `| Metric | Value | Status |\n`;
    markdown += `|--------|-------|--------|\n`;
    markdown += `| Adoption Rate | ${report.metrics.adoption}% | ${report.metrics.adoption >= 80 ? '✅' : '⚠️'} |\n`;
    markdown += `| Completion Rate | ${report.metrics.completion}% | ${report.metrics.completion >= 85 ? '✅' : '⚠️'} |\n`;
    markdown += `| Error Rate | ${report.metrics.errorRate}% | ${report.metrics.errorRate < 1 ? '✅' : '⚠️'} |\n`;
    markdown += `| Avg Session Duration | ${report.metrics.avgSessionDuration}s | ℹ️ |\n`;
    markdown += `| User Satisfaction | ${report.metrics.userSatisfaction}/5 | ${report.metrics.userSatisfaction >= 4 ? '✅' : '⚠️'} |\n\n`;

    markdown += `### Trends\n\n`;
    for (const trend of report.trends) {
      const icon = trend.direction === 'up' ? '📈' : trend.direction === 'down' ? '📉' : '➡️';
      markdown += `- ${icon} **${trend.metric}**: ${trend.direction} (${trend.change > 0 ? '+' : ''}${trend.change}%) - ${trend.significance} significance\n`;
    }
    markdown += '\n';

    markdown += `### User Feedback Summary\n\n`;
    for (const feedback of report.userFeedback) {
      const icon = feedback.type === 'positive' ? '👍' : feedback.type === 'negative' ? '👎' : '💡';
      markdown += `- ${icon} **${feedback.category}** (${feedback.count} mentions): "${feedback.content}"\n`;
    }

    return markdown;
  }

  /**
   * Orchestrates the full Production Metrics Review workflow.
   * This is the main entry point for the post-deployment review process.
   */
  public async runProductionMetricsReview(
    featureName: string,
    successMetrics: { adoption: number; completion: number },
    actualMetrics?: Partial<FeatureMetrics['metrics']>
  ): Promise<FeatureImpactSummary> {
    console.log(`\n▶️ Marketer Agent: Initiating Production Metrics Review for ${featureName}...`);

    // Step 1: Generate production report
    const productionReport = await this.generateProductionReport(featureName, actualMetrics);
    const formattedReport = this.formatProductionReport(productionReport);

    // Step 2: Get reviews from other agents
    const originalBrief = `# Feature Brief: ${featureName}\n\n- Success Metric: ${successMetrics.adoption}% Adoption`;
    const impactReview = analyst.reviewProductionMetrics(formattedReport, originalBrief);
    const healthReview = developer.reviewProductionMetrics(formattedReport);

    // Step 3: Determine recommendation
    const adoptionMet = productionReport.metrics.adoption >= successMetrics.adoption;
    const completionMet = productionReport.metrics.completion >= successMetrics.completion;
    const healthyErrorRate = productionReport.metrics.errorRate < 1;

    let recommendation: FeatureImpactSummary['recommendation'];
    let confidenceLevel: FeatureImpactSummary['confidenceLevel'];
    let actionItems: string[] = [];

    if (adoptionMet && completionMet && healthyErrorRate) {
      recommendation = 'SUCCESS';
      confidenceLevel = 'high';
      actionItems = [
        'Archive learnings for future features',
        'Consider expanding feature scope',
        'Document successful patterns',
      ];
    } else if (!adoptionMet && productionReport.metrics.adoption < 50) {
      recommendation = 'REMOVE';
      confidenceLevel = productionReport.metrics.adoption < 30 ? 'high' : 'medium';
      actionItems = [
        'Create deprecation plan',
        'Notify affected users',
        'Schedule removal timeline',
      ];
    } else {
      recommendation = 'ITERATE';
      confidenceLevel = 'medium';
      actionItems = [];

      if (!adoptionMet) {
        actionItems.push(`Investigate low adoption (${productionReport.metrics.adoption}% vs ${successMetrics.adoption}% target)`);
      }
      if (!healthyErrorRate) {
        actionItems.push(`Fix ${productionReport.metrics.errorRate}% error rate`);
      }
      if (productionReport.userFeedback.some(f => f.type === 'negative')) {
        actionItems.push('Address negative user feedback');
      }
    }

    // Step 4: Build the full report
    let report = `## Feature Impact Summary\n\n`;
    report += `This report summarizes the production performance of "${featureName}".\n\n`;
    report += formattedReport;
    report += '\n';
    report += impactReview;
    report += '\n';
    report += healthReview;
    report += '\n---\n\n';
    report += `### Recommendation\n\n`;
    report += `**${recommendation}** (Confidence: ${confidenceLevel})\n\n`;

    if (recommendation === 'SUCCESS') {
      report += `The feature has successfully met or exceeded all success metrics. No further action required beyond standard maintenance.\n`;
    } else if (recommendation === 'ITERATE') {
      report += `The feature shows promise but has not fully met success criteria. Iteration is recommended.\n`;
    } else {
      report += `The feature has failed to gain traction. Removal is recommended to reduce maintenance burden.\n`;
    }

    report += `\n### Action Items\n\n`;
    for (const item of actionItems) {
      report += `- [ ] ${item}\n`;
    }

    console.log('✅ Production Metrics Review complete. Final summary generated.');

    return {
      feature: featureName,
      recommendation,
      confidenceLevel,
      report,
      actionItems,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Tracks a new feature deployment for future metrics review.
   */
  public async trackFeatureDeployment(
    featureName: string,
    successMetrics: { adoption: number; completion: number }
  ): Promise<void> {
    console.log(`▶️ Marketer Agent: Tracking deployment of ${featureName}...`);

    const tracking = {
      featureName,
      deploymentDate: new Date().toISOString(),
      successMetrics,
      reviewScheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // In production, this would be stored in a database
    console.log('📊 Feature tracking created:', tracking);
    console.log('✅ Feature deployment tracked. Review scheduled for 7 days from now.');
  }

  /**
   * Reviews user feedback trends across features.
   */
  public analyzeFeedbackTrends(features: string[]): string {
    console.log(`▶️ Marketer Agent: Analyzing feedback trends across ${features.length} features...`);

    let report = `## Feedback Trends Analysis\n\n`;
    report += `**Features Analyzed:** ${features.join(', ')}\n`;
    report += `**Analysis Date:** ${new Date().toLocaleDateString()}\n\n`;

    report += `### Common Themes\n\n`;
    report += `| Theme | Sentiment | Frequency |\n`;
    report += `|-------|-----------|------------|\n`;
    report += `| Performance | Mixed | High |\n`;
    report += `| Usability | Positive | High |\n`;
    report += `| Error Handling | Negative | Medium |\n`;
    report += `| Feature Requests | Neutral | Medium |\n\n`;

    report += `### Recommendations\n\n`;
    report += `1. **Performance**: Users frequently mention load times - consider optimization sprint\n`;
    report += `2. **Error Handling**: Improve error messages and recovery flows\n`;
    report += `3. **Usability**: Continue current UX patterns - they are well-received\n`;

    console.log('✅ Feedback trends analysis complete.');
    return report;
  }

  /**
   * Coordinates with the Planner Agent to create iteration tasks.
   */
  public async createIterationTasks(
    impactSummary: FeatureImpactSummary
  ): Promise<string[]> {
    console.log(`▶️ Marketer Agent: Creating iteration tasks for ${impactSummary.feature}...`);

    const tasks = impactSummary.actionItems.map((item, index) => {
      return `[TASK-${Date.now()}-${index}] ${item}`;
    });

    console.log(`✅ Created ${tasks.length} iteration tasks.`);
    return tasks;
  }
}

export const marketer = new MarketerAgent();

export const runMarketer = async (): Promise<void> => {
  console.log('▶️ Running Marketer Agent Full Workflow...');

  const marketerAgent = new MarketerAgent();

  // Run AI feedback analysis
  console.log('\n=== AI Agent Feedback Analysis ===\n');

  const sageReport = await marketerAgent.generateAIFeedbackReport({
    agentType: 'sage',
    days: 7,
  });
  console.log(sageReport);

  const lexiReport = await marketerAgent.generateAIFeedbackReport({
    agentType: 'lexi',
    days: 7,
  });
  console.log(lexiReport);

  // Run a production metrics review
  console.log('\n=== Feature Production Review ===\n');

  const summary = await marketerAgent.runProductionMetricsReview(
    'Listing Creation Wizard',
    { adoption: 80, completion: 85 },
    { adoption: 75, completion: 90, errorRate: 0.5 }
  );

  console.log('\n--- Feature Impact Summary ---\n');
  console.log(summary.report);
  console.log('\n--- Recommendation ---');
  console.log(`${summary.recommendation} (Confidence: ${summary.confidenceLevel})`);
};
