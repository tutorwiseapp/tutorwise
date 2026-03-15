/**
 * Sage Student Model Service
 *
 * Persistent student learning profile that carries across sessions.
 * Tracks: mastery per topic, misconceptions, learning style, study streaks,
 * spaced repetition schedule.
 *
 * Integrates with AgentMemoryService for episodic cross-session memory.
 *
 * @module sage/services/student-model
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// --- Types ---

export interface MasteryEntry {
  score: number;           // 0-100
  attempts: number;
  correct: number;
  last_practised: string;  // ISO date
  stability: number;       // Ebbinghaus stability factor (days)
}

export interface Misconception {
  id: string;
  topic: string;
  misconception: string;
  detected_at: string;
  resolved: boolean;
  resolved_at?: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  mastery_map: Record<string, MasteryEntry>;
  misconceptions: Misconception[];
  learning_style: string | null;
  struggle_history: Array<{ topic: string; level: number; timestamp: string }>;
  review_schedule: Record<string, string>; // topic → next review ISO date
  total_study_minutes: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_session_summary: string | null;
  last_session_at: string | null;
}

export interface TopicReviewDue {
  topic: string;
  mastery: number;
  decayed_mastery: number;
  days_since_practice: number;
}

// --- Service ---

export class StudentModelService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get or create a student profile.
   */
  async getOrCreateProfile(userId: string): Promise<StudentProfile> {
    const { data, error } = await this.supabase
      .from('sage_student_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) return data as StudentProfile;

    if (error && error.code !== 'PGRST116') {
      console.warn('[StudentModel] Error fetching profile:', error.message);
    }

    // Create new profile
    const { data: newProfile, error: insertError } = await this.supabase
      .from('sage_student_profiles')
      .insert({ user_id: userId })
      .select()
      .single();

    if (insertError) {
      console.warn('[StudentModel] Error creating profile:', insertError.message);
      // Return a default in-memory profile
      return {
        id: '',
        user_id: userId,
        mastery_map: {},
        misconceptions: [],
        learning_style: null,
        struggle_history: [],
        review_schedule: {},
        total_study_minutes: 0,
        current_streak_days: 0,
        longest_streak_days: 0,
        last_session_summary: null,
        last_session_at: null,
      };
    }

    return newProfile as StudentProfile;
  }

  /**
   * Update mastery for a topic after a practice attempt.
   */
  async updateMastery(
    userId: string,
    topic: string,
    correct: boolean
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    const existing = profile.mastery_map[topic] || {
      score: 0,
      attempts: 0,
      correct: 0,
      last_practised: new Date().toISOString(),
      stability: 14, // Initial stability: 14 days
    };

    existing.attempts += 1;
    if (correct) existing.correct += 1;

    // Mastery = accuracy * confidence, where confidence = min(1, attempts/10)
    const accuracy = existing.correct / existing.attempts;
    const confidence = Math.min(1, existing.attempts / 10);
    existing.score = Math.round(accuracy * confidence * 100);
    existing.last_practised = new Date().toISOString();

    // Increase stability on correct answers
    if (correct) {
      existing.stability = Math.min(90, existing.stability * 1.5);
    }

    profile.mastery_map[topic] = existing;

    // Update review schedule (SM-2 intervals)
    const nextReview = this.calculateNextReview(existing);
    profile.review_schedule[topic] = nextReview.toISOString();

    await this.supabase
      .from('sage_student_profiles')
      .update({
        mastery_map: profile.mastery_map,
        review_schedule: profile.review_schedule,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  /**
   * Add a detected misconception.
   */
  async addMisconception(
    userId: string,
    topic: string,
    misconception: string
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);

    // Check for duplicate
    const existing = profile.misconceptions.find(
      m => m.topic === topic && m.misconception === misconception && !m.resolved
    );
    if (existing) return;

    profile.misconceptions.push({
      id: `misc_${Date.now().toString(36)}`,
      topic,
      misconception,
      detected_at: new Date().toISOString(),
      resolved: false,
    });

    await this.supabase
      .from('sage_student_profiles')
      .update({
        misconceptions: profile.misconceptions,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  /**
   * Mark a misconception as resolved.
   */
  async resolveMisconception(userId: string, misconceptionId: string): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);

    const misc = profile.misconceptions.find(m => m.id === misconceptionId);
    if (misc) {
      misc.resolved = true;
      misc.resolved_at = new Date().toISOString();
    }

    await this.supabase
      .from('sage_student_profiles')
      .update({
        misconceptions: profile.misconceptions,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  /**
   * Update study time and streak.
   */
  async updateStudySession(
    userId: string,
    durationMinutes: number,
    sessionSummary: string
  ): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);
    const now = new Date();

    // Update streak
    const lastSession = profile.last_session_at ? new Date(profile.last_session_at) : null;
    let newStreak = profile.current_streak_days;

    if (lastSession) {
      const daysSinceLast = Math.floor(
        (now.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLast <= 1) {
        // Same day or next day — continue streak
        if (daysSinceLast === 1) newStreak += 1;
      } else {
        // Streak broken
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    await this.supabase
      .from('sage_student_profiles')
      .update({
        total_study_minutes: profile.total_study_minutes + durationMinutes,
        current_streak_days: newStreak,
        longest_streak_days: Math.max(profile.longest_streak_days, newStreak),
        last_session_summary: sessionSummary,
        last_session_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('user_id', userId);
  }

  /**
   * Get topics with decayed mastery that are due for review.
   */
  getDecayedMastery(profile: StudentProfile): TopicReviewDue[] {
    const now = new Date();
    const dueTopics: TopicReviewDue[] = [];

    for (const [topic, entry] of Object.entries(profile.mastery_map)) {
      const lastPractised = new Date(entry.last_practised);
      const daysSince = (now.getTime() - lastPractised.getTime()) / (1000 * 60 * 60 * 24);

      // Ebbinghaus forgetting curve: retention = e^(-days/stability)
      const retention = Math.exp(-daysSince / entry.stability);
      const decayedMastery = Math.round(entry.score * retention);

      // Flag if mastery has decayed significantly (>15% drop) and at least 7 days since practice
      if (daysSince >= 7 && entry.score - decayedMastery > 15) {
        dueTopics.push({
          topic,
          mastery: entry.score,
          decayed_mastery: decayedMastery,
          days_since_practice: Math.floor(daysSince),
        });
      }
    }

    // Sort by most decayed first
    return dueTopics.sort((a, b) => a.decayed_mastery - b.decayed_mastery);
  }

  /**
   * Build a context block for injection into Sage's system prompt.
   */
  buildContextBlock(profile: StudentProfile): string {
    const parts: string[] = ['STUDENT LEARNING PROFILE:'];

    // Mastery summary (top 5 topics)
    const topics = Object.entries(profile.mastery_map)
      .sort(([, a], [, b]) => b.score - a.score)
      .slice(0, 5);

    if (topics.length > 0) {
      parts.push('\nTopic Mastery:');
      for (const [topic, entry] of topics) {
        parts.push(`- ${topic}: ${entry.score}% (${entry.attempts} attempts)`);
      }
    }

    // Active misconceptions
    const activeMisconceptions = profile.misconceptions.filter(m => !m.resolved);
    if (activeMisconceptions.length > 0) {
      parts.push('\nKnown Misconceptions (address proactively):');
      for (const m of activeMisconceptions.slice(0, 3)) {
        parts.push(`- ${m.topic}: ${m.misconception}`);
      }
    }

    // Review due
    const dueTopics = this.getDecayedMastery(profile);
    if (dueTopics.length > 0) {
      parts.push('\nTopics Due for Review:');
      for (const t of dueTopics.slice(0, 3)) {
        parts.push(`- ${t.topic}: was ${t.mastery}%, now ~${t.decayed_mastery}% (${t.days_since_practice} days ago)`);
      }
    }

    // Last session
    if (profile.last_session_summary) {
      parts.push(`\nLast Session: ${profile.last_session_summary}`);
    }

    // Streak
    if (profile.current_streak_days > 1) {
      parts.push(`\nStudy Streak: ${profile.current_streak_days} days`);
    }

    // Learning style
    if (profile.learning_style) {
      parts.push(`\nLearning Style: ${profile.learning_style}`);
    }

    return parts.join('\n');
  }

  /**
   * Calculate next review date using SM-2 intervals.
   */
  private calculateNextReview(entry: MasteryEntry): Date {
    const now = new Date();
    const easeFactor = Math.max(1.3, 2.5 - (1 - entry.correct / entry.attempts) * 2);

    let intervalDays: number;
    if (entry.attempts <= 1) {
      intervalDays = 1;
    } else if (entry.attempts === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(6 * Math.pow(easeFactor, entry.attempts - 2));
    }

    // Cap at 90 days
    intervalDays = Math.min(90, intervalDays);

    return new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  }
}
