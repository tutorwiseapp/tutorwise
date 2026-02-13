/**
 * Tutor Persona
 *
 * Lexi persona for tutors - provides a professional, efficient
 * assistant for managing tutoring practice.
 *
 * @module lexi/personas/tutor
 */

import type { AgentContext } from '../../../cas/packages/core/src/context';
import type {
  PersonaConfig,
  DetectedIntent,
  ActionResult,
  IntentCategory,
} from '../../types';
import { BasePersona } from '../base-persona';

// --- Tutor Persona Config ---

const TUTOR_CONFIG: PersonaConfig = {
  type: 'tutor',
  displayName: 'Lexi (Tutor Dashboard)',
  capabilities: [
    'schedule_management',
    'student_overview',
    'resource_creation',
    'lesson_planning',
    'earnings_tracking',
    'analytics_access',
    'feedback_review',
    'availability_setting',
  ],
  defaultGreeting: "Hello {name}! Ready to manage your tutoring practice? I can help with your schedule, students, or earnings.",
  tone: 'professional',
};

// --- Tutor Persona Class ---

class TutorPersonaImpl extends BasePersona {
  type = 'tutor' as const;
  config = TUTOR_CONFIG;

  protected getHandledCategories(): IntentCategory[] {
    return ['learning', 'scheduling', 'resources', 'progress', 'billing', 'feedback', 'support', 'general'];
  }

  async handleIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    this.log('handleIntent', ctx, { category: intent.category, action: intent.action });

    switch (intent.category) {
      case 'scheduling':
        return this.handleSchedulingIntent(intent, ctx);
      case 'progress':
        return this.handleProgressIntent(intent, ctx);
      case 'learning':
        return this.handleLearningIntent(intent, ctx);
      case 'resources':
        return this.handleResourcesIntent(intent, ctx);
      case 'billing':
        return this.handleBillingIntent(intent, ctx);
      case 'feedback':
        return this.handleFeedbackIntent(intent, ctx);
      case 'support':
        return this.handleSupportIntent(intent, ctx);
      default:
        return this.handleGeneralIntent(intent, ctx);
    }
  }

  async getSuggestedActions(ctx: AgentContext): Promise<string[]> {
    const suggestions: string[] = [];

    // Check for today's lessons
    const upcomingResult = await this.api.booking.getUpcomingLessons(ctx, 3);
    if (upcomingResult.success && upcomingResult.lessons.length > 0) {
      suggestions.push(`View today's ${upcomingResult.lessons.length} lessons`);
    }

    suggestions.push(
      'View my earnings',
      'Manage availability',
      'See student progress',
      'Check feedback'
    );

    return suggestions.slice(0, 4);
  }

  // --- Intent Handlers ---

  private async handleSchedulingIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    switch (intent.action) {
      case 'check':
        const upcomingResult = await this.api.booking.getUpcomingLessons(ctx, 10);
        if (upcomingResult.success) {
          const lessons = upcomingResult.lessons;
          if (lessons.length === 0) {
            return this.success(
              "You have no upcoming lessons scheduled. Would you like to update your availability to get more bookings?",
              null,
              ['Update availability', 'View past lessons', 'Check earnings']
            );
          }

          const today = lessons.filter(l => {
            const lessonDate = new Date(l.scheduledAt);
            const now = new Date();
            return lessonDate.toDateString() === now.toDateString();
          });

          return this.success(
            `You have ${lessons.length} upcoming lessons, ${today.length} of which are today.`,
            { upcoming: lessons, today },
            ['View lesson details', 'Start next lesson', 'Message student']
          );
        }
        return this.error("Couldn't fetch your schedule right now.");

      case 'modify':
        return this.success(
          "I can help you manage your availability. What would you like to do?",
          null,
          ['Set weekly hours', 'Block specific dates', 'Add extra availability']
        );

      case 'book':
        return this.success(
          "Students book lessons with you based on your availability. Let me show you your current booking settings.",
          null,
          ['View availability settings', 'See pending requests', 'Check booking rules']
        );

      default:
        return this.success(
          "Let me help you manage your schedule.",
          null,
          ['View upcoming lessons', 'Update availability', 'See booking requests']
        );
    }
  }

  private async handleProgressIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    const analyticsResult = await this.api.progress.getTutorAnalytics(ctx, 'month');

    if (analyticsResult.success && analyticsResult.analytics) {
      const a = analyticsResult.analytics;
      return this.success(
        `This month: ${a.completedLessons} lessons completed, ${a.activeStudents} active students, ${a.averageRating.toFixed(1)}⭐ rating. Student retention: ${(a.studentRetention * 100).toFixed(0)}%.`,
        a,
        ['View detailed analytics', 'See student breakdown', 'Compare to last month']
      );
    }
    return this.error("Couldn't load your analytics right now.");
  }

  private async handleLearningIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    switch (intent.action) {
      case 'help':
        // Tutor asking for help with teaching
        return this.success(
          "I can help you with teaching resources and strategies. What subject or topic are you preparing for?",
          null,
          ['Find teaching resources', 'Get lesson plan ideas', 'View best practices']
        );

      case 'lesson':
        // Lesson planning
        return this.success(
          "Let's plan your lesson. I can help with structure, resources, and activities.",
          null,
          ['Create lesson plan', 'Find worksheets', 'Set homework']
        );

      default:
        return this.success(
          "I can help with lesson planning and teaching resources.",
          null,
          ['Plan a lesson', 'Find resources', 'Review student work']
        );
    }
  }

  private async handleResourcesIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "Your resource library helps you share materials with students. What would you like to do?",
      null,
      ['Upload new resource', 'Browse my library', 'Share with student', 'Find templates']
    );
  }

  private async handleBillingIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    const analyticsResult = await this.api.progress.getTutorAnalytics(ctx, 'month');

    if (analyticsResult.success && analyticsResult.analytics) {
      const e = analyticsResult.analytics.earnings;
      return this.success(
        `This month's earnings: $${e.total.toFixed(2)} total ($${e.paid.toFixed(2)} paid, $${e.pending.toFixed(2)} pending).`,
        e,
        ['View payment history', 'Download tax documents', 'Update payment method']
      );
    }
    return this.error("Couldn't load your earnings right now.");
  }

  private async handleFeedbackIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    const feedbackResult = await this.api.progress.getReceivedFeedback(ctx, { limit: 5 });

    if (feedbackResult.success) {
      const count = feedbackResult.total;
      return this.success(
        count > 0
          ? `You have ${count} reviews with an overall positive rating. Your students appreciate your teaching!`
          : "You haven't received any reviews yet. Reviews help build trust with new students.",
        feedbackResult.feedback,
        ['View all reviews', 'Respond to feedback', 'See improvement suggestions']
      );
    }
    return this.error("Couldn't load your feedback right now.");
  }

  private async handleSupportIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "I'm here to help! What do you need assistance with?",
      null,
      ['Technical issue', 'Student concern', 'Payment question', 'Platform help']
    );
  }

  private async handleGeneralIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    const suggestions = await this.getSuggestedActions(ctx);
    return this.success(
      "Welcome to your tutor dashboard! Here's what I can help you with:",
      null,
      suggestions
    );
  }
}

// --- Export ---

export const TutorPersona = new TutorPersonaImpl();

export default TutorPersona;
