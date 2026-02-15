/**
 * CAS Retrospective Scheduler
 *
 * Schedules and runs weekly retrospectives for the CAS planner.
 * Analyzes commits, feedback, and blockers to generate insights.
 *
 * @module cas/scheduler/retrospective
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { publish, createTaskEnvelope } from '../messages';
import { metricsCollector } from '../dashboard';

// --- Types ---

export interface RetrospectiveConfig {
  schedule: 'daily' | 'weekly' | 'sprint';
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc.
  timeOfDay?: string; // HH:MM format
  includeCommits: boolean;
  includeFeedback: boolean;
  includeBlockers: boolean;
  recipients: string[];
}

export interface RetrospectiveReport {
  id: string;
  period: string;
  generatedAt: Date;
  summary: {
    commits: CommitSummary;
    feedback: FeedbackSummary;
    blockers: BlockerSummary;
  };
  insights: string[];
  recommendations: string[];
  actionItems: ActionItem[];
}

export interface CommitSummary {
  total: number;
  byType: Record<string, number>;
  topContributors: string[];
  affectedAreas: string[];
}

export interface FeedbackSummary {
  lexi: {
    total: number;
    positiveRate: number;
    topIssues: string[];
  };
  sage: {
    total: number;
    positiveRate: number;
    topIssues: string[];
    byRole: Record<string, number>;
  };
}

export interface BlockerSummary {
  total: number;
  resolved: number;
  pending: number;
  byCategory: Record<string, number>;
}

export interface ActionItem {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  assignedTo: string;
  dueDate?: Date;
  status: 'pending' | 'in_progress' | 'completed';
}

// --- Default Config ---

const DEFAULT_CONFIG: RetrospectiveConfig = {
  schedule: 'weekly',
  dayOfWeek: 5, // Friday
  timeOfDay: '17:00',
  includeCommits: true,
  includeFeedback: true,
  includeBlockers: true,
  recipients: ['planner', 'analyst'],
};

// --- Retrospective Scheduler ---

export class RetrospectiveScheduler {
  private supabase: SupabaseClient | null = null;
  private config: RetrospectiveConfig;
  private lastRunTime: Date | null = null;

  constructor(config: Partial<RetrospectiveConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
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
   * Run a retrospective now
   */
  async runRetrospective(): Promise<RetrospectiveReport> {
    console.log('[Retrospective] Starting retrospective analysis...');

    const period = this.getPeriodString();
    const reportId = `retro_${Date.now()}`;

    // Gather data
    const [feedback, blockers] = await Promise.all([
      this.gatherFeedback(),
      this.gatherBlockers(),
    ]);

    // Commits would require git integration
    const commits = this.getCommitPlaceholder();

    // Generate insights
    const insights = this.generateInsights(feedback, blockers, commits);
    const recommendations = this.generateRecommendations(feedback, blockers);
    const actionItems = this.generateActionItems(feedback, blockers);

    const report: RetrospectiveReport = {
      id: reportId,
      period,
      generatedAt: new Date(),
      summary: {
        commits,
        feedback,
        blockers,
      },
      insights,
      recommendations,
      actionItems,
    };

    // Store report
    await this.storeReport(report);

    // Notify recipients
    await this.notifyRecipients(report);

    this.lastRunTime = new Date();

    console.log('[Retrospective] Completed:', reportId);
    return report;
  }

  /**
   * Check if retrospective should run
   */
  shouldRunNow(): boolean {
    const now = new Date();

    if (this.config.schedule === 'daily') {
      // Run once per day
      if (this.lastRunTime) {
        const daysSinceLastRun = (now.getTime() - this.lastRunTime.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastRun >= 1;
      }
      return true;
    }

    if (this.config.schedule === 'weekly') {
      // Run on specified day
      if (now.getDay() !== this.config.dayOfWeek) {
        return false;
      }

      if (this.lastRunTime) {
        const daysSinceLastRun = (now.getTime() - this.lastRunTime.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastRun >= 6; // At least 6 days since last run
      }
      return true;
    }

    return false;
  }

  /**
   * Gather feedback data
   */
  private async gatherFeedback(): Promise<FeedbackSummary> {
    const [lexiFeedback, sageFeedback] = await Promise.all([
      metricsCollector.getFeedbackSummary('lexi', 'week'),
      metricsCollector.getFeedbackSummary('sage', 'week'),
    ]);

    return {
      lexi: {
        total: lexiFeedback.total,
        positiveRate: lexiFeedback.positiveRate,
        topIssues: lexiFeedback.topIssues,
      },
      sage: {
        total: sageFeedback.total,
        positiveRate: sageFeedback.positiveRate,
        topIssues: sageFeedback.topIssues,
        byRole: Object.fromEntries(
          Object.entries(sageFeedback.byRole).map(([role, data]) => [
            role,
            data.positive + data.negative,
          ])
        ),
      },
    };
  }

  /**
   * Gather blocker data
   */
  private async gatherBlockers(): Promise<BlockerSummary> {
    // Blockers would come from Jira or issue tracker
    // Placeholder implementation
    return {
      total: 0,
      resolved: 0,
      pending: 0,
      byCategory: {},
    };
  }

  /**
   * Placeholder for commit data
   */
  private getCommitPlaceholder(): CommitSummary {
    return {
      total: 0,
      byType: {},
      topContributors: [],
      affectedAreas: ['See git log for details'],
    };
  }

  /**
   * Generate insights from data
   */
  private generateInsights(
    feedback: FeedbackSummary,
    _blockers: BlockerSummary,
    _commits: CommitSummary
  ): string[] {
    const insights: string[] = [];

    // Feedback insights
    if (feedback.lexi.positiveRate < 70) {
      insights.push(`Lexi satisfaction rate (${feedback.lexi.positiveRate}%) is below target`);
    }
    if (feedback.sage.positiveRate < 70) {
      insights.push(`Sage satisfaction rate (${feedback.sage.positiveRate}%) is below target`);
    }

    // Role-specific insights
    const sageByRole = feedback.sage.byRole;
    const roles = Object.entries(sageByRole);
    if (roles.length > 0) {
      const topRole = roles.sort((a, b) => b[1] - a[1])[0];
      insights.push(`Most active Sage user role: ${topRole[0]} (${topRole[1]} sessions)`);
    }

    // Issue insights
    if (feedback.lexi.topIssues.length > 0) {
      insights.push(`Lexi has ${feedback.lexi.topIssues.length} reported issues to address`);
    }
    if (feedback.sage.topIssues.length > 0) {
      insights.push(`Sage has ${feedback.sage.topIssues.length} reported issues to address`);
    }

    if (insights.length === 0) {
      insights.push('No significant issues detected this period');
    }

    return insights;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    feedback: FeedbackSummary,
    _blockers: BlockerSummary
  ): string[] {
    const recommendations: string[] = [];

    if (feedback.lexi.positiveRate < 80) {
      recommendations.push('Review Lexi negative feedback comments for common patterns');
      recommendations.push('Consider running DSPy optimization for Lexi prompts');
    }

    if (feedback.sage.positiveRate < 80) {
      recommendations.push('Review Sage curriculum content flagged for issues');
      recommendations.push('Analyze Sage feedback by role to identify specific pain points');
    }

    if (feedback.lexi.total + feedback.sage.total < 10) {
      recommendations.push('Consider adding more feedback prompts to increase data collection');
    }

    recommendations.push('Run weekly security scan on EduPay and AI code paths');

    return recommendations;
  }

  /**
   * Generate action items
   */
  private generateActionItems(
    feedback: FeedbackSummary,
    _blockers: BlockerSummary
  ): ActionItem[] {
    const items: ActionItem[] = [];

    if (feedback.lexi.topIssues.length > 0) {
      items.push({
        id: `action_${Date.now()}_1`,
        title: 'Address top Lexi feedback issues',
        priority: 'high',
        assignedTo: 'developer',
        status: 'pending',
      });
    }

    if (feedback.sage.topIssues.length > 0) {
      items.push({
        id: `action_${Date.now()}_2`,
        title: 'Review Sage curriculum content',
        priority: 'medium',
        assignedTo: 'analyst',
        status: 'pending',
      });
    }

    items.push({
      id: `action_${Date.now()}_3`,
      title: 'Review DSPy optimization results',
      priority: 'low',
      assignedTo: 'analyst',
      status: 'pending',
    });

    return items;
  }

  /**
   * Store report in database
   */
  private async storeReport(report: RetrospectiveReport): Promise<void> {
    if (!this.supabase) return;

    try {
      await this.supabase.from('cas_retrospectives').insert({
        id: report.id,
        period: report.period,
        generated_at: report.generatedAt.toISOString(),
        summary: report.summary,
        insights: report.insights,
        recommendations: report.recommendations,
        action_items: report.actionItems,
      });
    } catch (error) {
      console.error('[Retrospective] Failed to store report:', error);
    }
  }

  /**
   * Notify recipients
   */
  private async notifyRecipients(report: RetrospectiveReport): Promise<void> {
    for (const recipient of this.config.recipients) {
      const envelope = createTaskEnvelope(
        'cas:planner',
        `cas:${recipient}`,
        {
          action: 'retrospective_complete',
          reportId: report.id,
          insights: report.insights,
          actionItems: report.actionItems.length,
        }
      );

      await publish(envelope);
    }
  }

  /**
   * Get period string
   */
  private getPeriodString(): string {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return `${weekAgo.toISOString().split('T')[0]} to ${now.toISOString().split('T')[0]}`;
  }

  /**
   * Get last run time
   */
  getLastRunTime(): Date | null {
    return this.lastRunTime;
  }

  /**
   * Get config
   */
  getConfig(): RetrospectiveConfig {
    return { ...this.config };
  }
}

// --- Singleton Export ---

export const retrospectiveScheduler = new RetrospectiveScheduler();

export default RetrospectiveScheduler;
