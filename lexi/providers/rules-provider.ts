/**
 * Rules-Based LLM Provider
 *
 * Uses pattern matching and predefined responses for intent detection
 * and response generation. No external API calls required.
 *
 * This is the default provider that works offline and has zero cost.
 *
 * @module lexi/providers/rules-provider
 */

import { BaseLLMProvider } from './base-provider';
import type {
  LLMProviderType,
  LLMProviderConfig,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
} from './types';
import type { PersonaType, DetectedIntent, IntentCategory } from '../types';
import type { AgentContext } from '../../cas/packages/core/src/context';

// Import CAS modules for data access
import {
  learningModule,
  bookingModule,
  progressModule,
} from '../../cas/packages/user-api/src';

// --- Intent Patterns ---

interface IntentPattern {
  patterns: string[];
  category: IntentCategory;
  action: string;
}

const INTENT_PATTERNS: IntentPattern[] = [
  // Learning intents
  { patterns: ['help', 'homework', 'explain', 'understand', 'learn', 'study'], category: 'learning', action: 'help' },
  { patterns: ['lesson', 'class', 'session', 'tutorial'], category: 'learning', action: 'lesson' },

  // Scheduling intents
  { patterns: ['book', 'schedule', 'appointment', 'reserve'], category: 'scheduling', action: 'book' },
  { patterns: ['cancel', 'reschedule', 'change time', 'modify'], category: 'scheduling', action: 'modify' },
  { patterns: ['availability', 'free', 'when', 'available'], category: 'scheduling', action: 'check' },

  // Resource intents
  { patterns: ['material', 'resource', 'document', 'file', 'pdf', 'video'], category: 'resources', action: 'access' },

  // Progress intents
  { patterns: ['progress', 'how am i doing', 'improve', 'performance'], category: 'progress', action: 'view' },
  { patterns: ['analytics', 'report', 'dashboard', 'statistics', 'stats'], category: 'progress', action: 'analytics' },

  // Billing intents
  { patterns: ['pay', 'bill', 'invoice', 'price', 'cost', 'payment'], category: 'billing', action: 'view' },

  // Support intents
  { patterns: ['support', 'help me', 'problem', 'issue', 'bug', 'error'], category: 'support', action: 'request' },

  // Feedback intents
  { patterns: ['review', 'rate', 'feedback', 'rating'], category: 'feedback', action: 'submit' },
];

// --- Rules Provider ---

export class RulesProvider extends BaseLLMProvider {
  readonly type: LLMProviderType = 'rules';
  readonly name = 'Rules-Based (Offline)';

  constructor(config: LLMProviderConfig = { type: 'rules' }) {
    super(config);
  }

  isAvailable(): boolean {
    // Rules provider is always available
    return true;
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    const { messages, persona, context, intent } = request;

    // Get the last user message
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return {
        content: this.getGreeting(persona),
        suggestions: this.getDefaultSuggestions(persona),
        finishReason: 'stop',
      };
    }

    // Detect intent if not provided
    const detectedIntent = intent || await this.detectIntent(lastUserMessage.content, persona, context);

    // Generate response based on intent
    const response = await this.generateResponse(detectedIntent, persona, context);

    return {
      content: response.message,
      intent: detectedIntent,
      suggestions: response.suggestions,
      finishReason: 'stop',
    };
  }

  async *stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk> {
    // Rules provider simulates streaming by yielding words
    const response = await this.complete(request);
    const words = response.content.split(' ');

    for (let i = 0; i < words.length; i++) {
      yield {
        content: words[i] + (i < words.length - 1 ? ' ' : ''),
        done: false,
      };
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    yield { content: '', done: true };
  }

  async detectIntent(
    message: string,
    persona: PersonaType,
    _context: AgentContext
  ): Promise<DetectedIntent> {
    const lowerMessage = message.toLowerCase();

    for (const pattern of INTENT_PATTERNS) {
      if (pattern.patterns.some(p => lowerMessage.includes(p))) {
        return {
          category: pattern.category,
          action: pattern.action,
          confidence: 0.7,
          entities: this.extractEntities(message),
          requiresConfirmation: pattern.category === 'billing' || pattern.action === 'cancel',
        };
      }
    }

    // Default to general intent
    return {
      category: 'general',
      action: 'chat',
      confidence: 0.5,
      entities: {},
      requiresConfirmation: false,
    };
  }

  // --- Private Methods ---

  private extractEntities(message: string): Record<string, string> {
    const entities: Record<string, string> = {};

    // Extract dates
    const dateMatch = message.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/);
    if (dateMatch) {
      entities.date = dateMatch[1];
    }

    // Extract times
    const timeMatch = message.match(/\b(\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm))\b/i);
    if (timeMatch) {
      entities.time = timeMatch[1];
    }

    // Extract subjects
    const subjects = ['math', 'maths', 'english', 'science', 'physics', 'chemistry', 'biology', 'history', 'geography'];
    for (const subject of subjects) {
      if (message.toLowerCase().includes(subject)) {
        entities.subject = subject;
        break;
      }
    }

    return entities;
  }

  private getGreeting(persona: PersonaType): string {
    const greetings: Record<PersonaType, string> = {
      student: "Hi! I'm Lexi, your learning assistant. How can I help you today?",
      tutor: "Hello! I'm Lexi, here to help you manage your tutoring practice. What would you like to do?",
      client: "Welcome! I'm Lexi. I can help you find tutors, manage bookings, and track your child's progress.",
      agent: "Hi! I'm Lexi, your agent assistant. Ready to help you support our users today.",
      organisation: "Hello! I'm Lexi, your organisation assistant. How can I help manage your tutoring platform today?",
    };
    return greetings[persona];
  }

  private getDefaultSuggestions(persona: PersonaType): string[] {
    const suggestions: Record<PersonaType, string[]> = {
      student: ['Help with homework', 'Show my progress', 'Upcoming lessons'],
      tutor: ["Today's schedule", 'View earnings', 'Student progress'],
      client: ['Find a tutor', 'View bookings', "My child's progress"],
      agent: ['Support queue', 'User lookup', 'Booking issues'],
      organisation: ['Dashboard', 'Analytics', 'Manage users'],
    };
    return suggestions[persona] || ['How can I help?'];
  }

  private async generateResponse(
    intent: DetectedIntent,
    persona: PersonaType,
    context: AgentContext
  ): Promise<{ message: string; suggestions: string[] }> {
    const userId = context.user?.id;
    if (!userId) {
      return {
        message: "I'm sorry, I couldn't identify your user session. Please try refreshing the page.",
        suggestions: ['Refresh page', 'Contact support'],
      };
    }

    try {
      switch (intent.category) {
        case 'learning':
          return await this.handleLearningIntent(intent, context, persona);
        case 'scheduling':
          return await this.handleSchedulingIntent(intent, context, persona);
        case 'progress':
          return await this.handleProgressIntent(intent, context, persona);
        case 'resources':
          return await this.handleResourcesIntent(intent, context);
        case 'feedback':
          return await this.handleFeedbackIntent(intent, context);
        case 'billing':
          return {
            message: "I can help with billing questions. Your account details are available in the **Financials** section. Would you like me to guide you there?",
            suggestions: this.getSuggestionsForCategory(persona, 'billing'),
          };
        case 'support':
          return {
            message: "I'm here to help! You can reach our support team through the **Help Centre**, or tell me more about your issue and I'll do my best to assist.",
            suggestions: this.getSuggestionsForCategory(persona, 'support'),
          };
        default:
          return {
            message: "I'm here to help! What would you like to know more about?",
            suggestions: this.getDefaultSuggestions(persona),
          };
      }
    } catch (error) {
      console.error('[RulesProvider] Error generating response:', error);
      return {
        message: "I encountered an issue while processing your request. Please try again or contact support if the problem persists.",
        suggestions: ['Try again', 'Contact support'],
      };
    }
  }

  private async handleLearningIntent(
    intent: DetectedIntent,
    context: AgentContext,
    persona: PersonaType
  ): Promise<{ message: string; suggestions: string[] }> {
    switch (intent.action) {
      case 'help': {
        const [homeworkResult, resourcesResult] = await Promise.all([
          learningModule.getHomework(context, {}),
          learningModule.getRecommendedResources(context, {}),
        ]);

        const homework = homeworkResult.assignments || [];
        const resources = resourcesResult.resources || [];

        if (homework.length > 0) {
          const pendingCount = homework.filter(h => h.status === 'pending').length;
          return {
            message: `You have **${pendingCount} pending homework assignment${pendingCount !== 1 ? 's' : ''}**. I also found **${resources.length} recommended resource${resources.length !== 1 ? 's' : ''}** for you.\n\nWould you like me to show you the homework details or the resources?`,
            suggestions: ['Show homework', 'Show resources', 'Help me with a topic'],
          };
        }

        return {
          message: "No pending homework at the moment! If you'd like help with a specific topic, just let me know what you're working on.",
          suggestions: ['Explain a topic', 'Browse resources', 'View my progress'],
        };
      }

      case 'lesson': {
        const result = await bookingModule.getUpcomingLessons(context, 5);
        const bookings = result.lessons || [];

        if (bookings.length > 0) {
          const nextLesson = bookings[0];
          const lessonDate = new Date(nextLesson.scheduledAt!).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
          return {
            message: `Your next lesson is on **${lessonDate}**. You have **${bookings.length} upcoming lesson${bookings.length !== 1 ? 's' : ''}** scheduled.`,
            suggestions: ['View all lessons', 'Reschedule a lesson', 'Cancel a lesson'],
          };
        }

        return {
          message: "You don't have any upcoming lessons scheduled. Would you like to book a new lesson?",
          suggestions: ['Find a tutor', 'Browse availability'],
        };
      }

      default:
        return {
          message: "I can help you with learning! Tell me what topic you need help with, or I can show you your homework and resources.",
          suggestions: ['View homework', 'Browse resources', 'Explain a topic'],
        };
    }
  }

  private async handleSchedulingIntent(
    intent: DetectedIntent,
    context: AgentContext,
    persona: PersonaType
  ): Promise<{ message: string; suggestions: string[] }> {
    const role = context.user!.role;

    switch (intent.action) {
      case 'book': {
        if (role === 'tutor') {
          return {
            message: "To receive bookings, make sure your availability is up to date. Students and clients can book sessions with you through your profile.",
            suggestions: ['Update availability', 'View pending bookings'],
          };
        }

        return {
          message: "I can help you book a lesson! Would you like to search for tutors or book with someone you've worked with before?",
          suggestions: ['Search tutors', 'View previous tutors', 'Check availability'],
        };
      }

      case 'modify': {
        const result = await bookingModule.getBookings(context, { status: ['confirmed'] });
        const bookings = result.bookings || [];

        if (bookings.length === 0) {
          return {
            message: "You don't have any confirmed bookings to modify. Would you like to book a new lesson?",
            suggestions: ['Book a lesson', 'View all bookings'],
          };
        }

        return {
          message: `You have **${bookings.length} confirmed booking${bookings.length !== 1 ? 's' : ''}**. Which one would you like to reschedule or cancel?`,
          suggestions: ['View bookings', 'Reschedule', 'Cancel booking'],
        };
      }

      case 'check': {
        if (role === 'tutor') {
          return {
            message: "You can manage your availability in the **Schedule** section. Would you like me to take you there?",
            suggestions: ['Go to Schedule', 'View upcoming lessons'],
          };
        }

        return {
          message: "Would you like to check a specific tutor's availability, or browse available tutors?",
          suggestions: ['Search tutors', 'Browse all availability'],
        };
      }

      default:
        return {
          message: "I can help you manage your schedule! What would you like to do?",
          suggestions: ['Book a lesson', 'View upcoming lessons', 'Check availability'],
        };
    }
  }

  private async handleProgressIntent(
    intent: DetectedIntent,
    context: AgentContext,
    persona: PersonaType
  ): Promise<{ message: string; suggestions: string[] }> {
    if (intent.action === 'view') {
      if (persona === 'student' || persona === 'client') {
        const result = await progressModule.getStudentProgress(context);

        if (result.progress) {
          const { totalLessonsCompleted, averageQuizScore, subjects } = result.progress;
          const subjectList = subjects.map(s => s.subject).join(', ');
          return {
            message: `Here's your progress summary:\n\n- **${totalLessonsCompleted} lesson${totalLessonsCompleted !== 1 ? 's' : ''}** completed\n- **${subjects.length} subject${subjects.length !== 1 ? 's' : ''}**: ${subjectList}\n${averageQuizScore ? `- **Average quiz score**: ${averageQuizScore.toFixed(1)}%` : ''}`,
            suggestions: ['View detailed report', 'See subject breakdown', 'Set goals'],
          };
        }

        return {
          message: "You're just getting started! Complete some lessons to build your progress report.",
          suggestions: ['Book a lesson', 'Find a tutor'],
        };
      }

      if (persona === 'tutor') {
        const result = await progressModule.getTutorAnalytics(context, 'month');

        if (result.analytics) {
          const { totalLessons, totalStudents, averageRating, completedLessons } = result.analytics;
          const completionRate = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
          return {
            message: `Here's your teaching summary:\n\n- **${totalLessons} lessons** taught\n- **${totalStudents} student${totalStudents !== 1 ? 's' : ''}**\n- **${completionRate}%** completion rate\n- **${averageRating?.toFixed(1) || 'N/A'}/5** average rating`,
            suggestions: ['View detailed analytics', 'See student feedback', 'View earnings'],
          };
        }
      }
    }

    if (intent.action === 'analytics' && persona === 'organisation') {
      const result = await progressModule.getOrgAnalytics(context, 'month');
      if (result.analytics) {
        const { totalTutors, totalStudents, totalLessons } = result.analytics;
        return {
          message: `Organisation overview:\n\n- **${totalTutors} active tutor${totalTutors !== 1 ? 's' : ''}**\n- **${totalStudents} student${totalStudents !== 1 ? 's' : ''}**\n- **${totalLessons} lesson${totalLessons !== 1 ? 's' : ''}** completed`,
          suggestions: ['View full analytics', 'Generate report', 'Manage users'],
        };
      }
    }

    return {
      message: "Your progress dashboard is available in the **Dashboard** section. Would you like me to take you there?",
      suggestions: ['Go to Dashboard', 'View recent activity'],
    };
  }

  private async handleResourcesIntent(
    intent: DetectedIntent,
    context: AgentContext
  ): Promise<{ message: string; suggestions: string[] }> {
    const result = await learningModule.getRecommendedResources(context, {});
    const resources = result.resources || [];

    if (resources.length > 0) {
      const resourceTypes = [...new Set(resources.map(r => r.type))];
      return {
        message: `I found **${resources.length} resource${resources.length !== 1 ? 's' : ''}** for you, including ${resourceTypes.join(', ')}.\n\nWould you like me to show you specific types or search for something?`,
        suggestions: ['Show all resources', 'Search for topic', 'Filter by type'],
      };
    }

    return {
      message: "No personalized resources yet. As you take more lessons, I'll recommend materials tailored to your learning. You can also search our resource library.",
      suggestions: ['Search resources', 'Browse categories'],
    };
  }

  private async handleFeedbackIntent(
    intent: DetectedIntent,
    context: AgentContext
  ): Promise<{ message: string; suggestions: string[] }> {
    const role = context.user!.role;

    if (intent.action === 'submit') {
      const result = await bookingModule.getBookings(context, { status: ['completed'], limit: 3 });
      const recentBookings = result.bookings || [];

      if (recentBookings.length > 0) {
        return {
          message: `You have **${recentBookings.length} recent lesson${recentBookings.length !== 1 ? 's' : ''}** you can review.\n\nYour feedback helps tutors improve and helps other students find great tutors!`,
          suggestions: ['Leave a review', 'View past reviews'],
        };
      }

      return {
        message: "You don't have any completed lessons to review yet. After your next lesson, you'll be able to share your feedback!",
        suggestions: ['Book a lesson', 'View my bookings'],
      };
    }

    if (role === 'tutor') {
      const result = await progressModule.getReceivedFeedback(context, {});
      const feedback = result.feedback || [];

      if (feedback.length > 0) {
        const avgRating = feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length;
        return {
          message: `You have **${feedback.length} review${feedback.length !== 1 ? 's' : ''}** with an average rating of **${avgRating.toFixed(1)}/5**. Great work!`,
          suggestions: ['View all reviews', 'Respond to feedback'],
        };
      }
    }

    return {
      message: "Feedback helps everyone improve! You can leave reviews for lessons or view feedback you've received.",
      suggestions: ['Leave a review', 'View my reviews'],
    };
  }

  private getSuggestionsForCategory(persona: PersonaType, category: IntentCategory): string[] {
    const suggestions: Record<PersonaType, Record<IntentCategory, string[]>> = {
      student: {
        learning: ['View homework', 'Browse resources', 'Explain a topic'],
        scheduling: ['View upcoming lessons', 'Request a new session'],
        resources: ['Browse learning materials', 'View recommended resources'],
        progress: ['View detailed progress report', 'Set new learning goals'],
        support: ['Contact your tutor', 'Report an issue'],
        billing: ['View payment history'],
        feedback: ['Rate your last lesson'],
        general: ['View your dashboard', 'See upcoming lessons'],
      },
      tutor: {
        learning: ['View student progress', 'Create new resources'],
        scheduling: ['Manage your availability', 'View upcoming sessions'],
        resources: ['Upload new materials', 'Organize your library'],
        progress: ['View teaching analytics', 'Review student feedback'],
        support: ['Access help center', 'Contact support'],
        billing: ['View earnings', 'Download tax documents'],
        feedback: ['View student reviews'],
        general: ['View your dashboard', 'Check notifications'],
      },
      client: {
        learning: ["View your child's progress"],
        scheduling: ['Book a new lesson', 'View upcoming sessions'],
        resources: ['Access shared materials'],
        progress: ['View progress report', 'Message the tutor'],
        support: ['Contact support', 'Report an issue'],
        billing: ['View invoices', 'Update payment method'],
        feedback: ['Leave a review'],
        general: ['Find tutors', 'View bookings'],
      },
      agent: {
        learning: ['Review student progress', 'Access shared resources'],
        scheduling: ['Coordinate bookings', 'Check tutor availability'],
        resources: ['Browse resource library', 'Share materials'],
        progress: ['Review user activity', 'Generate reports'],
        support: ['View support tickets', 'Assist users'],
        billing: ['Review billing issues', 'Process refunds'],
        feedback: ['Review all feedback', 'Escalate issues'],
        general: ['View support dashboard', 'Assist a user'],
      },
      organisation: {
        learning: ['View learning analytics'],
        scheduling: ['Manage organisation schedule'],
        resources: ['Manage resource library'],
        progress: ['View organisation analytics', 'Generate reports'],
        support: ['Access admin support'],
        billing: ['View organisation billing', 'Manage subscriptions'],
        feedback: ['View all feedback'],
        general: ['View admin dashboard', 'Manage users'],
      },
    };

    return suggestions[persona]?.[category] || ['How else can I help you?'];
  }
}

export default RulesProvider;
