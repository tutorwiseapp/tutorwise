/**
 * Client Persona
 *
 * Lexi persona for parents/clients - provides a friendly, helpful
 * assistant for finding tutors and managing their child's education.
 *
 * @module lexi/personas/client
 */

import type { AgentContext } from '../../../cas/packages/core/src/context';
import type {
  PersonaConfig,
  DetectedIntent,
  ActionResult,
  IntentCategory,
} from '../../types';
import { BasePersona } from '../base-persona';

// --- Client Persona Config ---

const CLIENT_CONFIG: PersonaConfig = {
  type: 'client',
  displayName: 'Lexi (Parent Portal)',
  capabilities: [
    'tutor_search',
    'booking_management',
    'payment_handling',
    'progress_monitoring',
    'review_submission',
    'tutor_messaging',
    'schedule_viewing',
  ],
  defaultGreeting: "Hi {name}! I'm Lexi, here to help you find great tutors and track your child's learning progress.",
  tone: 'friendly',
};

// --- Client Persona Class ---

class ClientPersonaImpl extends BasePersona {
  type = 'client' as const;
  config = CLIENT_CONFIG;

  protected getHandledCategories(): IntentCategory[] {
    return ['learning', 'scheduling', 'progress', 'billing', 'feedback', 'support', 'marketplace', 'general'];
  }

  async handleIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    this.log('handleIntent', ctx, { category: intent.category, action: intent.action });

    switch (intent.category) {
      case 'scheduling':
        return this.handleSchedulingIntent(intent, ctx);
      case 'learning':
        return this.handleLearningIntent(intent, ctx);
      case 'progress':
        return this.handleProgressIntent(intent, ctx);
      case 'billing':
        return this.handleBillingIntent(intent, ctx);
      case 'feedback':
        return this.handleFeedbackIntent(intent, ctx);
      case 'support':
        return this.handleSupportIntent(intent, ctx);
      case 'marketplace':
        return this.handleMarketplaceIntent(intent, ctx);
      default:
        return this.handleGeneralIntent(intent, ctx);
    }
  }

  async getSuggestedActions(ctx: AgentContext): Promise<string[]> {
    const suggestions: string[] = [];

    // Check upcoming lessons
    const upcomingResult = await this.api.booking.getUpcomingLessons(ctx, 3);
    if (upcomingResult.success && upcomingResult.lessons.length > 0) {
      suggestions.push('View upcoming lessons');
    } else {
      suggestions.push('Find a tutor');
    }

    suggestions.push(
      "Check my child's progress",
      'Book a new lesson',
      'View payment history'
    );

    return suggestions.slice(0, 4);
  }

  // --- Intent Handlers ---

  private async handleSchedulingIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    switch (intent.action) {
      case 'check':
        const upcomingResult = await this.api.booking.getUpcomingLessons(ctx, 5);
        if (upcomingResult.success) {
          const lessons = upcomingResult.lessons;
          if (lessons.length === 0) {
            return this.success(
              "No upcoming lessons scheduled. Would you like to find a tutor and book a lesson?",
              null,
              ['Find a tutor', 'View past lessons', 'Browse subjects']
            );
          }
          return this.success(
            `You have ${lessons.length} upcoming lesson${lessons.length > 1 ? 's' : ''} scheduled.`,
            lessons,
            ['View details', 'Reschedule', 'Message tutor']
          );
        }
        return this.error("Couldn't check the schedule right now.");

      case 'book':
        return this.success(
          "I'd be happy to help you book a lesson! Let me find available tutors for you.",
          null,
          ['Search by subject', 'View saved tutors', 'See recommended tutors']
        );

      case 'modify':
        return this.success(
          "I can help you reschedule or cancel a lesson. Which booking would you like to modify?",
          null,
          ['View upcoming lessons', 'Reschedule lesson', 'Cancel lesson']
        );

      default:
        return this.success(
          "Let me help you manage your lesson schedule.",
          null,
          ['Book a lesson', 'View schedule', 'Reschedule']
        );
    }
  }

  private async handleLearningIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    switch (intent.action) {
      case 'help':
        // Find tutors
        const searchResult = await this.api.booking.searchTutors(ctx, {
          subject: intent.entities.subject as string,
        });

        if (searchResult.success && searchResult.tutors.length > 0) {
          return this.success(
            `I found ${searchResult.total} tutors who can help. Here are some top-rated options:`,
            searchResult.tutors,
            ['View tutor profiles', 'Filter results', 'Book a trial lesson']
          );
        }
        return this.success(
          "Let's find the right tutor for your child. What subject do they need help with?",
          null,
          ['Mathematics', 'English', 'Science', 'Other subjects']
        );

      default:
        return this.success(
          "I can help you find tutors and learning resources for your child.",
          null,
          ['Find a tutor', 'View learning materials', "Check child's homework"]
        );
    }
  }

  private async handleMarketplaceIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    switch (intent.action) {
      case 'search':
        const searchResult = await this.api.booking.searchTutors(ctx, {
          subject: intent.entities.subject as string,
        });

        if (searchResult.success && searchResult.tutors.length > 0) {
          return this.success(
            `I found ${searchResult.total} tutor${searchResult.total !== 1 ? 's' : ''} for you. Here are some top-rated options:`,
            searchResult.tutors,
            ['View tutor profiles', 'Filter results', 'Book a trial lesson']
          );
        }
        return this.success(
          "I couldn't find tutors matching that criteria. Let's try broadening the search — what subject does your child need help with?",
          null,
          ['Mathematics', 'English', 'Science', 'Other subjects']
        );

      default:
        return this.success(
          "I can help you find the right tutor! You can search by subject, level, location, and more.",
          null,
          ['Search tutors', 'Browse Marketplace', 'View Wiselists']
        );
    }
  }

  private async handleProgressIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    // Get child's progress (client views their students)
    const progressResult = await this.api.progress.getStudentProgress(ctx);

    if (progressResult.success && progressResult.progress) {
      const p = progressResult.progress;
      return this.success(
        `Great news! Your child has completed ${p.totalLessonsCompleted} lessons with an average score of ${p.averageQuizScore}%. They're on a ${p.learningStreak}-day learning streak!`,
        p,
        ['View detailed progress', 'See by subject', 'Message tutor about progress']
      );
    }
    return this.success(
      "I can show you your child's learning progress. Select a child to view their progress report.",
      null,
      ['View progress report', 'Recent lessons', 'Upcoming goals']
    );
  }

  private async handleBillingIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "I can help you with billing and payments. What would you like to do?",
      null,
      ['View invoices', 'Update payment method', 'See upcoming charges', 'Payment history']
    );
  }

  private async handleFeedbackIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "Your feedback helps tutors improve and helps other parents find great tutors. Would you like to leave a review?",
      null,
      ['Review recent lesson', 'View past reviews', 'Report an issue']
    );
  }

  private async handleSupportIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "I'm here to help! What do you need assistance with?",
      null,
      ['Booking issue', 'Payment question', 'Tutor concern', 'Technical help']
    );
  }

  private async handleGeneralIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    const suggestions = await this.getSuggestedActions(ctx);
    return this.success(
      "Welcome! I'm here to help you find great tutors and support your child's education.",
      null,
      suggestions
    );
  }
}

// --- Export ---

export const ClientPersona = new ClientPersonaImpl();

export default ClientPersona;
