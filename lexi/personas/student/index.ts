/**
 * Student Persona
 *
 * Lexi persona for students - provides a supportive, encouraging
 * learning assistant experience.
 *
 * @module lexi/personas/student
 */

import type { AgentContext } from '../../../cas/packages/core/src/context';
import type {
  PersonaConfig,
  DetectedIntent,
  ActionResult,
  IntentCategory,
} from '../../types';
import { BasePersona, withIntentHandlers, type IntentHandlerMap } from '../base-persona';

// --- Student Persona Config ---

const STUDENT_CONFIG: PersonaConfig = {
  type: 'student',
  displayName: 'Lexi (Learning Assistant)',
  capabilities: [
    'homework_help',
    'lesson_viewing',
    'progress_tracking',
    'resource_access',
    'feedback_submission',
    'quiz_practice',
    'study_planning',
  ],
  defaultGreeting: "Hi {name}! I'm Lexi, your learning buddy. Ready to learn something awesome today?",
  tone: 'supportive',
};

// --- Student Persona Class ---

class StudentPersonaImpl extends BasePersona {
  type = 'student' as const;
  config = STUDENT_CONFIG;

  protected getHandledCategories(): IntentCategory[] {
    return ['learning', 'scheduling', 'resources', 'progress', 'support', 'feedback', 'general'];
  }

  async handleIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    this.log('handleIntent', ctx, { category: intent.category, action: intent.action });

    switch (intent.category) {
      case 'learning':
        return this.handleLearningIntent(intent, ctx);
      case 'scheduling':
        return this.handleSchedulingIntent(intent, ctx);
      case 'progress':
        return this.handleProgressIntent(intent, ctx);
      case 'resources':
        return this.handleResourcesIntent(intent, ctx);
      case 'feedback':
        return this.handleFeedbackIntent(intent, ctx);
      case 'support':
        return this.handleSupportIntent(intent, ctx);
      default:
        return this.handleGeneralIntent(intent, ctx);
    }
  }

  async getSuggestedActions(ctx: AgentContext): Promise<string[]> {
    // Get contextual suggestions based on student's state
    const suggestions: string[] = [];

    // Check for upcoming lessons
    const upcomingResult = await this.api.booking.getUpcomingLessons(ctx, 3);
    if (upcomingResult.success && upcomingResult.lessons.length > 0) {
      suggestions.push('View my upcoming lessons');
    }

    // Always suggest these
    suggestions.push(
      'Help me with homework',
      'Show my progress',
      'Practice with a quiz',
      'Find study resources'
    );

    return suggestions.slice(0, 4);
  }

  // --- Intent Handlers ---

  private async handleLearningIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    switch (intent.action) {
      case 'help':
        // Get topic explanation
        const topic = intent.entities.topic as string || 'your question';
        const result = await this.api.learning.explainTopic(ctx, topic, {
          level: 'student-friendly',
          includeExamples: true,
          format: 'detailed',
        });
        if (result.success) {
          return this.success(
            result.explanation || "Let me help you understand this...",
            result.examples,
            ['Ask a follow-up question', 'Try a practice problem', 'Find more resources']
          );
        }
        return this.error("I couldn't find an explanation right now. Can you try asking differently?");

      case 'lesson':
        // Get homework assignments
        const homeworkResult = await this.api.learning.getHomework(ctx, { status: 'pending' });
        if (homeworkResult.success) {
          const count = homeworkResult.assignments.length;
          return this.success(
            count > 0
              ? `You have ${count} homework assignment${count > 1 ? 's' : ''} pending. Would you like to work on one?`
              : "Great news! You're all caught up on homework!",
            homeworkResult.assignments,
            count > 0
              ? ['Start homework', 'View details', 'Ask for help']
              : ['Practice with a quiz', 'Review past lessons']
          );
        }
        return this.error("I couldn't check your homework right now.");

      default:
        return this.success(
          "I'm here to help you learn! You can ask me to explain topics, help with homework, or find practice materials.",
          null,
          ['Explain a topic', 'Help with homework', 'Find practice problems']
        );
    }
  }

  private async handleSchedulingIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    switch (intent.action) {
      case 'check':
        const upcomingResult = await this.api.booking.getUpcomingLessons(ctx, 5);
        if (upcomingResult.success) {
          const lessons = upcomingResult.lessons;
          if (lessons.length === 0) {
            return this.success(
              "You don't have any upcoming lessons scheduled.",
              null,
              ['Ask parent to book a lesson']
            );
          }
          return this.success(
            `You have ${lessons.length} upcoming lesson${lessons.length > 1 ? 's' : ''}!`,
            lessons,
            ['View lesson details', 'Prepare for lesson']
          );
        }
        return this.error("I couldn't check your schedule right now.");

      case 'book':
        // Students typically can't book directly - suggest parent action
        return this.success(
          "To book a new lesson, please ask your parent or guardian. They can find and book tutors through their account.",
          null,
          ['View my schedule instead', 'Help me prepare for my next lesson']
        );

      default:
        return this.success(
          "Let me check your lesson schedule!",
          null,
          ['View upcoming lessons', 'See past lessons']
        );
    }
  }

  private async handleProgressIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    const progressResult = await this.api.progress.getStudentProgress(ctx);
    if (progressResult.success && progressResult.progress) {
      const p = progressResult.progress;
      return this.success(
        `You're doing great! You've completed ${p.totalLessonsCompleted} lessons and maintained a ${p.learningStreak}-day streak! Your average quiz score is ${p.averageQuizScore}%.`,
        p,
        ['See subject breakdown', 'View achievements', 'Set a new goal']
      );
    }
    return this.error("I couldn't load your progress right now. Let's try again!");
  }

  private async handleResourcesIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    const subject = intent.entities.subject as string;
    const resourcesResult = await this.api.learning.getRecommendedResources(ctx, {
      subject,
      limit: 5,
    });

    if (resourcesResult.success) {
      const resources = resourcesResult.resources;
      return this.success(
        resources.length > 0
          ? `I found ${resources.length} resources that might help you!`
          : "I'll find some resources for you. What subject are you studying?",
        resources,
        ['Browse more', 'Filter by type', 'Search for specific topic']
      );
    }
    return this.error("I couldn't find resources right now.");
  }

  private async handleFeedbackIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "Would you like to leave feedback about your recent lesson? Your feedback helps tutors improve!",
      null,
      ['Rate my last lesson', 'Share what I learned', 'Skip for now']
    );
  }

  private async handleSupportIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "I'm here to help! What do you need assistance with?",
      null,
      ['Technical issue', 'Question about my lessons', 'Talk to my tutor', 'Other help']
    );
  }

  private async handleGeneralIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    const suggestions = await this.getSuggestedActions(ctx);
    return this.success(
      "Hi there! I'm Lexi, your learning assistant. Here are some things I can help you with:",
      null,
      suggestions
    );
  }
}

// --- Export ---

export const StudentPersona = new StudentPersonaImpl();

export default StudentPersona;
