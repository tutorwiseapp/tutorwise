/**
 * Sage Progress Service
 *
 * Tracks student learning progress across topics and sessions.
 *
 * @module sage/services
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  SageSubject,
  SageLevel,
  TopicProgress,
  StudentProgress,
  SubjectProgress,
} from '../types';

// --- Progress Service Types ---

export interface ProgressUpdate {
  studentId: string;
  subject: SageSubject;
  level: SageLevel;
  topicId: string;
  topicName: string;
  correct: boolean;
  errorPattern?: string;
  strength?: string;
}

export interface ProgressSummary {
  totalTopics: number;
  masteredTopics: number;
  inProgressTopics: number;
  needsWorkTopics: number;
  overallMastery: number;
  streak: number;
  lastActivity: Date | null;
}

// --- Progress Service ---

export class ProgressService {
  private supabase: SupabaseClient | null = null;

  /**
   * Initialize with Supabase client.
   */
  initialize(supabaseClient?: SupabaseClient): void {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && key) {
        this.supabase = createClient(url, key);
      }
    }
  }

  /**
   * Record a practice attempt and update progress.
   */
  async recordAttempt(update: ProgressUpdate): Promise<void> {
    if (!this.supabase) return;

    // Get or create progress record
    const existing = await this.getTopicProgress(
      update.studentId,
      update.subject,
      update.level,
      update.topicId
    );

    if (existing) {
      // Update existing progress
      const newPracticeCount = existing.practiceCount + 1;
      const newCorrectCount = existing.correctCount + (update.correct ? 1 : 0);
      const newMastery = this.calculateMastery(newCorrectCount, newPracticeCount);

      // Update error patterns and strengths
      const errorPatterns = existing.errorPatterns || [];
      const strengths = existing.strengths || [];

      if (update.errorPattern && !errorPatterns.includes(update.errorPattern)) {
        errorPatterns.push(update.errorPattern);
      }
      if (update.strength && !strengths.includes(update.strength)) {
        strengths.push(update.strength);
      }

      await this.supabase
        .from('sage_progress')
        .update({
          mastery_score: newMastery,
          practice_count: newPracticeCount,
          correct_count: newCorrectCount,
          error_patterns: errorPatterns,
          strengths: strengths,
          last_practiced_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create new progress record
      const mastery = update.correct ? 20 : 0;  // Start with 20% if first attempt correct

      await this.supabase.from('sage_progress').insert({
        student_id: update.studentId,
        subject: update.subject,
        level: update.level,
        topic_id: update.topicId,
        topic_name: update.topicName,
        mastery_score: mastery,
        practice_count: 1,
        correct_count: update.correct ? 1 : 0,
        error_patterns: update.errorPattern ? [update.errorPattern] : [],
        strengths: update.strength ? [update.strength] : [],
        last_practiced_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Calculate mastery score based on practice history.
   */
  private calculateMastery(correctCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;

    // Base accuracy score
    const accuracy = correctCount / totalCount;

    // Confidence factor (more attempts = more confident in score)
    const confidence = Math.min(1, totalCount / 10);  // Max confidence at 10 attempts

    // Mastery = accuracy * confidence * 100
    // Capped between 0 and 100
    return Math.round(Math.min(100, Math.max(0, accuracy * confidence * 100)));
  }

  /**
   * Get progress for a specific topic.
   */
  async getTopicProgress(
    studentId: string,
    subject: SageSubject,
    level: SageLevel,
    topicId: string
  ): Promise<(TopicProgress & { id: string }) | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('sage_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('subject', subject)
      .eq('level', level)
      .eq('topic_id', topicId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      topicId: data.topic_id,
      topicName: data.topic_name,
      subject: data.subject,
      level: data.level,
      masteryScore: data.mastery_score,
      practiceCount: data.practice_count,
      correctCount: data.correct_count,
      lastPracticedAt: data.last_practiced_at ? new Date(data.last_practiced_at) : undefined,
      errorPatterns: data.error_patterns || [],
      strengths: data.strengths || [],
    };
  }

  /**
   * Get all progress for a student in a subject.
   */
  async getSubjectProgress(
    studentId: string,
    subject: SageSubject,
    level: SageLevel
  ): Promise<SubjectProgress> {
    if (!this.supabase) {
      return this.emptySubjectProgress(subject, level);
    }

    const { data, error } = await this.supabase
      .from('sage_progress')
      .select('*')
      .eq('student_id', studentId)
      .eq('subject', subject)
      .eq('level', level)
      .order('mastery_score', { ascending: false });

    if (error || !data || data.length === 0) {
      return this.emptySubjectProgress(subject, level);
    }

    const topics: TopicProgress[] = data.map(row => ({
      topicId: row.topic_id,
      topicName: row.topic_name,
      subject: row.subject,
      level: row.level,
      masteryScore: row.mastery_score,
      practiceCount: row.practice_count,
      correctCount: row.correct_count,
      lastPracticedAt: row.last_practiced_at ? new Date(row.last_practiced_at) : undefined,
      errorPatterns: row.error_patterns || [],
      strengths: row.strengths || [],
    }));

    // Calculate overall mastery (weighted by practice count)
    const totalPractice = topics.reduce((sum, t) => sum + t.practiceCount, 0);
    const weightedMastery = topics.reduce(
      (sum, t) => sum + t.masteryScore * t.practiceCount,
      0
    );
    const overallMastery = totalPractice > 0
      ? Math.round(weightedMastery / totalPractice)
      : 0;

    // Identify strong and weak topics
    const strongestTopics = topics
      .filter(t => t.masteryScore >= 70)
      .slice(0, 5)
      .map(t => t.topicName);

    const needsWork = topics
      .filter(t => t.masteryScore < 50 && t.practiceCount >= 3)
      .slice(0, 5)
      .map(t => t.topicName);

    return {
      subject,
      level,
      topics,
      overallMastery,
      strongestTopics,
      needsWork,
    };
  }

  /**
   * Get full student progress across all subjects.
   */
  async getStudentProgress(studentId: string): Promise<StudentProgress> {
    if (!this.supabase) {
      return this.emptyStudentProgress(studentId);
    }

    // Get all progress records
    const { data, error } = await this.supabase
      .from('sage_progress')
      .select('*')
      .eq('student_id', studentId);

    if (error || !data || data.length === 0) {
      return this.emptyStudentProgress(studentId);
    }

    // Group by subject/level
    const grouped: Record<string, TopicProgress[]> = {};
    for (const row of data) {
      const key = `${row.subject}:${row.level}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        topicId: row.topic_id,
        topicName: row.topic_name,
        subject: row.subject,
        level: row.level,
        masteryScore: row.mastery_score,
        practiceCount: row.practice_count,
        correctCount: row.correct_count,
        lastPracticedAt: row.last_practiced_at ? new Date(row.last_practiced_at) : undefined,
        errorPatterns: row.error_patterns || [],
        strengths: row.strengths || [],
      });
    }

    // Build subject progress
    const subjects: SubjectProgress[] = [];
    for (const [key, topics] of Object.entries(grouped)) {
      const [subject, level] = key.split(':') as [SageSubject, SageLevel];
      const totalPractice = topics.reduce((sum, t) => sum + t.practiceCount, 0);
      const weightedMastery = topics.reduce(
        (sum, t) => sum + t.masteryScore * t.practiceCount,
        0
      );
      const overallMastery = totalPractice > 0
        ? Math.round(weightedMastery / totalPractice)
        : 0;

      subjects.push({
        subject,
        level,
        topics,
        overallMastery,
        strongestTopics: topics.filter(t => t.masteryScore >= 70).map(t => t.topicName),
        needsWork: topics.filter(t => t.masteryScore < 50).map(t => t.topicName),
      });
    }

    // Calculate totals
    const totalPractice = data.reduce((sum, row) => sum + row.practice_count, 0);
    const totalMastery = subjects.reduce(
      (sum, s) => sum + s.overallMastery * s.topics.length,
      0
    );
    const topicCount = subjects.reduce((sum, s) => sum + s.topics.length, 0);

    // Get session count
    const { count: sessionCount } = await this.supabase
      .from('sage_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', studentId);

    // Find last activity
    const lastActivity = data.reduce((latest, row) => {
      if (!row.last_practiced_at) return latest;
      const date = new Date(row.last_practiced_at);
      return !latest || date > latest ? date : latest;
    }, null as Date | null);

    return {
      studentId,
      subjects,
      totalSessions: sessionCount || 0,
      totalPracticeProblems: totalPractice,
      overallMastery: topicCount > 0 ? Math.round(totalMastery / topicCount) : 0,
      streak: await this.calculateStreak(studentId),
      lastActivityAt: lastActivity || new Date(),
    };
  }

  /**
   * Calculate learning streak (consecutive days of activity).
   */
  private async calculateStreak(studentId: string): Promise<number> {
    if (!this.supabase) return 0;

    const { data, error } = await this.supabase
      .from('sage_sessions')
      .select('started_at')
      .eq('user_id', studentId)
      .order('started_at', { ascending: false })
      .limit(30);

    if (error || !data || data.length === 0) return 0;

    // Count consecutive days
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const activityDates = new Set(
      data.map(row => {
        const date = new Date(row.started_at);
        date.setHours(0, 0, 0, 0);
        return date.toISOString();
      })
    );

    while (true) {
      if (activityDates.has(currentDate.toISOString())) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (streak === 0) {
        // Allow missing today
        currentDate.setDate(currentDate.getDate() - 1);
        if (!activityDates.has(currentDate.toISOString())) {
          break;
        }
      } else {
        break;
      }
    }

    return streak;
  }

  private emptySubjectProgress(subject: SageSubject, level: SageLevel): SubjectProgress {
    return {
      subject,
      level,
      topics: [],
      overallMastery: 0,
      strongestTopics: [],
      needsWork: [],
    };
  }

  private emptyStudentProgress(studentId: string): StudentProgress {
    return {
      studentId,
      subjects: [],
      totalSessions: 0,
      totalPracticeProblems: 0,
      overallMastery: 0,
      streak: 0,
      lastActivityAt: new Date(),
    };
  }
}

// --- Singleton Export ---

export const progressService = new ProgressService();

export default ProgressService;
