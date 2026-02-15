/**
 * Sage Report Service
 *
 * Generates progress reports and learning summaries.
 *
 * @module sage/services
 */

import type {
  SageSubject,
  SageLevel,
  StudentProgress,
  SubjectProgress,
  TopicProgress,
} from '../types';
import { progressService } from './progress';

// --- Report Types ---

export interface ProgressReport {
  studentId: string;
  generatedAt: Date;
  period: ReportPeriod;
  summary: ReportSummary;
  subjects: SubjectReport[];
  recommendations: string[];
  achievements: Achievement[];
}

export interface ReportPeriod {
  start: Date;
  end: Date;
  label: string;  // e.g., "Last 7 days", "This month"
}

export interface ReportSummary {
  sessionsCompleted: number;
  practiceProblems: number;
  topicsStudied: number;
  overallMastery: number;
  masteryChange: number;  // Change from previous period
  streak: number;
  timeSpent?: number;  // minutes
}

export interface SubjectReport {
  subject: SageSubject;
  level: SageLevel;
  mastery: number;
  masteryChange: number;
  topicsImproved: string[];
  topicsNeedingWork: string[];
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  date: Date;
  topic: string;
  type: 'practice' | 'lesson' | 'review';
  score?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedAt: Date;
  icon?: string;
}

// --- Report Service ---

export class ReportService {
  /**
   * Generate a comprehensive progress report.
   */
  async generateReport(
    studentId: string,
    period: 'week' | 'month' | 'term' = 'week'
  ): Promise<ProgressReport> {
    const now = new Date();
    const periodDates = this.getPeriodDates(period, now);

    // Get student progress
    const progress = await progressService.getStudentProgress(studentId);

    // Generate subject reports
    const subjects: SubjectReport[] = progress.subjects.map(subj =>
      this.generateSubjectReport(subj)
    );

    // Generate summary
    const summary = this.generateSummary(progress, periodDates);

    // Generate recommendations
    const recommendations = this.generateRecommendations(progress);

    // Check achievements
    const achievements = this.checkAchievements(progress);

    return {
      studentId,
      generatedAt: now,
      period: periodDates,
      summary,
      subjects,
      recommendations,
      achievements,
    };
  }

  /**
   * Get period date range.
   */
  private getPeriodDates(
    period: 'week' | 'month' | 'term',
    now: Date
  ): ReportPeriod {
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (period) {
      case 'week':
        start.setDate(start.getDate() - 7);
        return { start, end, label: 'Last 7 days' };

      case 'month':
        start.setMonth(start.getMonth() - 1);
        return { start, end, label: 'Last 30 days' };

      case 'term':
        start.setMonth(start.getMonth() - 3);
        return { start, end, label: 'This term' };

      default:
        start.setDate(start.getDate() - 7);
        return { start, end, label: 'Last 7 days' };
    }
  }

  /**
   * Generate summary statistics.
   */
  private generateSummary(
    progress: StudentProgress,
    period: ReportPeriod
  ): ReportSummary {
    const topicsStudied = progress.subjects.reduce(
      (sum, s) => sum + s.topics.filter(t => t.practiceCount > 0).length,
      0
    );

    return {
      sessionsCompleted: progress.totalSessions,
      practiceProblems: progress.totalPracticeProblems,
      topicsStudied,
      overallMastery: progress.overallMastery,
      masteryChange: 0,  // Would need historical data
      streak: progress.streak,
    };
  }

  /**
   * Generate report for a single subject.
   */
  private generateSubjectReport(subjectProgress: SubjectProgress): SubjectReport {
    // Topics improved (mastery >= 70 and practice in period)
    const topicsImproved = subjectProgress.topics
      .filter(t => t.masteryScore >= 70)
      .slice(0, 5)
      .map(t => t.topicName);

    // Topics needing work (mastery < 50)
    const topicsNeedingWork = subjectProgress.needsWork.slice(0, 3);

    // Recent activity (simplified)
    const recentActivity: ActivityItem[] = subjectProgress.topics
      .filter(t => t.lastPracticedAt)
      .sort((a, b) => (b.lastPracticedAt?.getTime() || 0) - (a.lastPracticedAt?.getTime() || 0))
      .slice(0, 5)
      .map(t => ({
        date: t.lastPracticedAt!,
        topic: t.topicName,
        type: 'practice' as const,
        score: t.masteryScore,
      }));

    return {
      subject: subjectProgress.subject,
      level: subjectProgress.level,
      mastery: subjectProgress.overallMastery,
      masteryChange: 0,  // Would need historical data
      topicsImproved,
      topicsNeedingWork,
      recentActivity,
    };
  }

  /**
   * Generate personalized recommendations.
   */
  private generateRecommendations(progress: StudentProgress): string[] {
    const recommendations: string[] = [];

    // Check for topics needing attention
    for (const subject of progress.subjects) {
      if (subject.needsWork.length > 0) {
        recommendations.push(
          `Review ${subject.needsWork[0]} in ${subject.subject} - more practice would help solidify this topic.`
        );
      }
    }

    // Streak encouragement
    if (progress.streak === 0) {
      recommendations.push(
        `Start a learning streak! Practice a little each day to build momentum.`
      );
    } else if (progress.streak >= 7) {
      recommendations.push(
        `Amazing ${progress.streak}-day streak! Keep up the consistent practice.`
      );
    }

    // Practice volume
    if (progress.totalPracticeProblems < 20) {
      recommendations.push(
        `Try to complete more practice problems to reinforce your learning.`
      );
    }

    // Subject coverage
    if (progress.subjects.length < 2) {
      recommendations.push(
        `Consider practicing across multiple subjects to build a well-rounded foundation.`
      );
    }

    return recommendations.slice(0, 4);
  }

  /**
   * Check for earned achievements.
   */
  private checkAchievements(progress: StudentProgress): Achievement[] {
    const achievements: Achievement[] = [];
    const now = new Date();

    // Streak achievements
    if (progress.streak >= 7) {
      achievements.push({
        id: 'streak-week',
        title: 'Week Warrior',
        description: '7-day learning streak!',
        earnedAt: now,
        icon: '🔥',
      });
    }
    if (progress.streak >= 30) {
      achievements.push({
        id: 'streak-month',
        title: 'Monthly Master',
        description: '30-day learning streak!',
        earnedAt: now,
        icon: '⭐',
      });
    }

    // Practice achievements
    if (progress.totalPracticeProblems >= 100) {
      achievements.push({
        id: 'practice-100',
        title: 'Century Club',
        description: 'Completed 100 practice problems!',
        earnedAt: now,
        icon: '💯',
      });
    }

    // Mastery achievements
    const masteredTopics = progress.subjects.reduce(
      (sum, s) => sum + s.topics.filter(t => t.masteryScore >= 80).length,
      0
    );
    if (masteredTopics >= 5) {
      achievements.push({
        id: 'mastery-5',
        title: 'Topic Master',
        description: 'Mastered 5 topics!',
        earnedAt: now,
        icon: '🏆',
      });
    }

    return achievements;
  }

  /**
   * Generate a text summary suitable for sharing.
   */
  generateTextSummary(report: ProgressReport): string {
    const lines: string[] = [
      `📊 Learning Progress Report`,
      `Generated: ${report.generatedAt.toLocaleDateString()}`,
      `Period: ${report.period.label}`,
      ``,
      `📈 Summary`,
      `- Sessions: ${report.summary.sessionsCompleted}`,
      `- Practice problems: ${report.summary.practiceProblems}`,
      `- Topics studied: ${report.summary.topicsStudied}`,
      `- Overall mastery: ${report.summary.overallMastery}%`,
      `- Learning streak: ${report.summary.streak} days`,
      ``,
    ];

    for (const subject of report.subjects) {
      lines.push(`📚 ${subject.subject.charAt(0).toUpperCase() + subject.subject.slice(1)} (${subject.level})`);
      lines.push(`- Mastery: ${subject.mastery}%`);
      if (subject.topicsImproved.length > 0) {
        lines.push(`- Strong in: ${subject.topicsImproved.join(', ')}`);
      }
      if (subject.topicsNeedingWork.length > 0) {
        lines.push(`- Review: ${subject.topicsNeedingWork.join(', ')}`);
      }
      lines.push(``);
    }

    if (report.recommendations.length > 0) {
      lines.push(`💡 Recommendations`);
      for (const rec of report.recommendations) {
        lines.push(`- ${rec}`);
      }
      lines.push(``);
    }

    if (report.achievements.length > 0) {
      lines.push(`🏅 Achievements`);
      for (const ach of report.achievements) {
        lines.push(`${ach.icon} ${ach.title}: ${ach.description}`);
      }
    }

    return lines.join('\n');
  }
}

// --- Singleton Export ---

export const reportService = new ReportService();

export default ReportService;
