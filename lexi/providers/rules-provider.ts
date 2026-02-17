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
  // Platform info intents (for guests and general visitors — checked first)
  { patterns: ['how does tutorwise work', 'what is tutorwise', 'about tutorwise', 'tell me about tutorwise'], category: 'platform', action: 'about' },
  { patterns: ['how much does it cost', 'pricing', 'prices', 'is it free', 'subscription', 'membership fee'], category: 'platform', action: 'pricing' },
  { patterns: ['what subjects', 'which subjects', 'subjects available', 'do you cover', 'what do you teach'], category: 'platform', action: 'subjects' },
  { patterns: ['is it safe', 'safety', 'safeguarding', 'how do you vet', 'background check', 'trusted', 'trustworthy'], category: 'platform', action: 'safety' },
  { patterns: ['sign up', 'create account', 'register', 'join tutorwise', 'get started', 'how to start'], category: 'platform', action: 'signup' },
  { patterns: ['what is sage', 'ai tutor feature', 'do you have ai'], category: 'platform', action: 'sage' },

  // Referral intents (check before general 'help' patterns)
  { patterns: ['referral', 'refer', 'invite friend', 'referral link', 'referral code', 'qr code'], category: 'referrals', action: 'info' },
  { patterns: ['commission', 'delegation', 'referral earning'], category: 'referrals', action: 'earnings' },

  // EduPay intents
  { patterns: ['edupay', 'ep point', 'ep balance', 'edu pay'], category: 'edupay', action: 'wallet' },
  { patterns: ['student loan', 'loan repayment', 'loan plan', 'slc', 'student loans company'], category: 'edupay', action: 'loan' },
  { patterns: ['cashback', 'cash back', 'affiliate', 'retailer'], category: 'edupay', action: 'cashback' },
  { patterns: ['isa', 'savings account', 'savings', 'interest', 'trading 212', 'moneybox', 'plum'], category: 'edupay', action: 'savings' },
  { patterns: ['wallet', 'balance', 'points'], category: 'edupay', action: 'wallet' },

  // Marketplace intents (check before general 'find')
  { patterns: ['find tutor', 'search tutor', 'browse tutor', 'marketplace', 'find a tutor'], category: 'marketplace', action: 'search' },
  { patterns: ['wiselist', 'saved tutor', 'favourite tutor', 'my list'], category: 'marketplace', action: 'wiselist' },
  { patterns: ['free help', 'free session', 'free lesson', 'instant help'], category: 'marketplace', action: 'freehelp' },

  // VirtualSpace intents
  { patterns: ['virtualspace', 'virtual space', 'whiteboard', 'virtual classroom'], category: 'virtualspace', action: 'info' },
  { patterns: ['tldraw', 'drawing', 'collaborate', 'screen share'], category: 'virtualspace', action: 'info' },

  // Credibility / CaaS intents
  { patterns: ['credibility', 'credibility score', 'caas', 'trust score', 'my score'], category: 'credibility', action: 'view' },
  { patterns: ['dbs', 'verification', 'identity', 'verify', 'verified'], category: 'credibility', action: 'verification' },

  // Network intents
  { patterns: ['connection', 'connect', 'network', 'add friend'], category: 'network', action: 'connections' },
  { patterns: ['message', 'chat', 'inbox', 'conversation'], category: 'network', action: 'messages' },

  // Account intents
  { patterns: ['profile', 'my account', 'personal info', 'edit profile'], category: 'account', action: 'profile' },
  { patterns: ['setting', 'notification', 'preferences', 'integration'], category: 'account', action: 'settings' },
  { patterns: ['google calendar', 'google classroom', 'sync', 'calendar'], category: 'account', action: 'integrations' },
  { patterns: ['stripe', 'bank account', 'payout setup', 'connect stripe'], category: 'account', action: 'stripe' },
  { patterns: ['api key', 'developer', 'api'], category: 'account', action: 'developer' },

  // Organisation intents
  { patterns: ['organisation', 'organization', 'team', 'agency'], category: 'organisation', action: 'info' },
  { patterns: ['task', 'kanban', 'assign', 'todo'], category: 'organisation', action: 'tasks' },
  { patterns: ['leaderboard', 'achievement', 'streak', 'gamification'], category: 'organisation', action: 'gamification' },

  // Learning intents
  { patterns: ['homework', 'explain', 'understand', 'learn', 'study', 'teach me'], category: 'learning', action: 'help' },
  { patterns: ['lesson', 'class', 'session', 'tutorial'], category: 'learning', action: 'lesson' },
  { patterns: ['sage', 'ai tutor', 'academic help', 'maths help', 'science help', 'english help'], category: 'learning', action: 'sage' },

  // Scheduling intents
  { patterns: ['book', 'schedule', 'appointment', 'reserve'], category: 'scheduling', action: 'book' },
  { patterns: ['cancel', 'reschedule', 'change time', 'modify'], category: 'scheduling', action: 'modify' },
  { patterns: ['availability', 'when', 'available', 'time slot'], category: 'scheduling', action: 'check' },
  { patterns: ['recurring', 'repeat', 'weekly', 'biweekly', 'monthly'], category: 'scheduling', action: 'recurring' },

  // Resource intents
  { patterns: ['material', 'resource', 'document', 'file', 'pdf', 'video'], category: 'resources', action: 'access' },

  // Progress intents
  { patterns: ['progress', 'how am i doing', 'improve', 'performance'], category: 'progress', action: 'view' },
  { patterns: ['analytics', 'report', 'dashboard', 'statistics', 'stats'], category: 'progress', action: 'analytics' },

  // Billing / Financials intents
  { patterns: ['pay', 'bill', 'invoice', 'price', 'cost', 'payment'], category: 'billing', action: 'view' },
  { patterns: ['earning', 'revenue', 'income', 'payout', 'withdraw'], category: 'billing', action: 'earnings' },
  { patterns: ['financial', 'transaction', 'receipt'], category: 'billing', action: 'transactions' },
  { patterns: ['dispute', 'chargeback', 'refund'], category: 'billing', action: 'dispute' },
  { patterns: ['platform fee', 'commission rate', 'how much', 'percentage'], category: 'billing', action: 'fees' },

  // Support intents
  { patterns: ['support', 'help me', 'problem', 'issue', 'bug', 'error'], category: 'support', action: 'request' },
  { patterns: ['help centre', 'help center', 'faq', 'guide', 'how to', 'how do i'], category: 'support', action: 'helpcentre' },

  // Feedback intents
  { patterns: ['review', 'rate', 'feedback', 'rating'], category: 'feedback', action: 'submit' },

  // General 'help' as last resort (after more specific patterns)
  { patterns: ['help'], category: 'support', action: 'request' },
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
      student: ['Find a tutor', 'My bookings', 'Referrals'],
      tutor: ['View earnings', 'My referrals', 'Credibility Score'],
      client: ['Find a tutor', 'View bookings', 'Referrals'],
      agent: ['View bookings', 'Organisation', 'Referrals'],
      organisation: ['Dashboard', 'Team management', 'Referral pipeline'],
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
          return this.handleBillingIntent(intent, persona);
        case 'referrals':
          return this.handleReferralsIntent(intent, persona);
        case 'edupay':
          return this.handleEduPayIntent(intent, persona);
        case 'marketplace':
          return this.handleMarketplaceIntent(intent, persona);
        case 'virtualspace':
          return this.handleVirtualSpaceIntent(persona);
        case 'credibility':
          return this.handleCredibilityIntent(intent, persona);
        case 'network':
          return this.handleNetworkIntent(intent, persona);
        case 'account':
          return this.handleAccountIntent(intent, persona);
        case 'organisation':
          return this.handleOrganisationIntent(intent, persona);
        case 'support':
          return this.handleSupportIntent(intent, persona);
        case 'platform':
          return this.handlePlatformIntent(intent);
        default:
          return {
            message: "I'm here to help! I can assist with bookings, referrals, earnings, EduPay, your Credibility Score, VirtualSpace, and much more. What would you like to know about?",
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

  // --- Feature-specific handlers ---

  private handleBillingIntent(
    intent: DetectedIntent,
    persona: PersonaType
  ): { message: string; suggestions: string[] } {
    switch (intent.action) {
      case 'earnings':
        if (persona === 'tutor' || persona === 'agent') {
          return {
            message: "You can view your earnings, pending balance, and payout history in **Financials**. TutorWise charges a **10% platform fee** on session earnings. Earnings clear after **7 days** (3 days if you've completed 50+ sessions). Automatic payouts happen every **Friday at 10am** with a minimum of **£20**.",
            suggestions: ['View earnings', 'Request withdrawal', 'View payout history'],
          };
        }
        return {
          message: "You can view your payment history and invoices in the **Financials** section.",
          suggestions: ['View transactions', 'View invoices'],
        };
      case 'transactions':
        return {
          message: "Your full transaction history is in **Financials → Transactions**. You can filter by date range, type, and status (Pending, Cleared, Paid Out, Refunded, or Disputed). You can also export as CSV or PDF.",
          suggestions: ['View transactions', 'Export data', 'View payouts'],
        };
      case 'dispute':
        return {
          message: "Payment disputes (chargebacks) are managed in **Financials → Disputes**. If you have an active dispute, you'll see a banner with a link to submit evidence through the **Stripe Dashboard**. Disputes typically resolve within 7-14 days.",
          suggestions: ['View disputes', 'Go to Financials'],
        };
      case 'fees':
        return {
          message: "TutorWise charges a **10% platform fee** on all completed session earnings. So if a student pays £30 for a lesson, you receive £27 (90%). Referral commissions are **10% lifetime** on all bookings from people you refer. There are no subscription fees for individuals.",
          suggestions: ['View earnings', 'Learn about referrals', 'View Financials'],
        };
      default:
        return {
          message: "I can help with billing questions. Your payment details, transactions, and payout history are all in the **Financials** section. You can also manage payment methods in **Payments**.",
          suggestions: ['View Financials', 'Manage payments', 'View transactions'],
        };
    }
  }

  private handleReferralsIntent(
    intent: DetectedIntent,
    persona: PersonaType
  ): { message: string; suggestions: string[] } {
    switch (intent.action) {
      case 'earnings':
        return {
          message: "Your referral commissions are **10% lifetime** on all completed bookings from users you refer. Commissions clear after **7 days** and are automatically paid out every **Friday** (minimum £25). You can also request a manual withdrawal anytime.\n\nView your commission history in **Referrals** or **Financials**.",
          suggestions: ['View referral earnings', 'Go to Referrals', 'Request withdrawal'],
        };
      default:
        return {
          message: "**Referral Programme** — Earn **10% lifetime commission** on all bookings from anyone you refer to TutorWise!\n\n**How it works:**\n- Share your unique **referral link** or **QR code** (found in the **Referrals** section)\n- When someone signs up and completes bookings, you earn 10% of each session\n- Commissions are paid automatically every Friday\n- You can also set **delegation** to redirect commissions to a partner\n\nReferral links expire after **90 days** without conversion.",
          suggestions: ['Get my referral link', 'View my referrals', 'Set delegation'],
        };
    }
  }

  private handleEduPayIntent(
    intent: DetectedIntent,
    persona: PersonaType
  ): { message: string; suggestions: string[] } {
    switch (intent.action) {
      case 'loan':
        return {
          message: "**EduPay Student Loan Repayment** — Convert your tutoring earnings into student loan payments!\n\nSet up your **Loan Profile** in EduPay with your loan plan type, balance, salary, and graduation year. EduPay will show you a projection of how your tutoring income can help you become **debt-free sooner** and save on interest.\n\nPayments are made directly to the **Student Loans Company** via Open Banking.",
          suggestions: ['Set up Loan Profile', 'Go to EduPay', 'View projection'],
        };
      case 'cashback':
        return {
          message: "**EduPay Cashback** — Earn rewards from partner retailers! Your cashback appears in **EduPay → Cashback** with statuses: Pending, Confirmed, or Declined. Confirmed cashback is added to your EP balance.",
          suggestions: ['View cashback', 'Go to EduPay'],
        };
      case 'savings':
        return {
          message: "**EduPay Savings** — Allocate your EP to an **ISA** (up to 5.1% APY) or a **savings account** (up to 4.6% APY). Supported providers include Trading 212, Chase, Moneybox, and Plum.\n\nManage your allocations in **EduPay → Savings**.",
          suggestions: ['View savings', 'Link a provider', 'Go to EduPay'],
        };
      default:
        return {
          message: "**EduPay** is your financial management hub built specifically for tutors!\n\n- **Wallet** — View your EP balance (£1 earned = 100 EP). EP clears after 7 days.\n- **Student Loan** — Convert EP to direct student loan payments via Open Banking\n- **Cashback** — Earn rewards from partner retailers\n- **Savings** — Allocate EP to an ISA (up to 5.1% APY) or savings account (up to 4.6% APY)\n\nVisit **EduPay** from the sidebar to get started.",
          suggestions: ['Go to EduPay', 'View EP balance', 'Set up Loan Profile'],
        };
    }
  }

  private handleMarketplaceIntent(
    intent: DetectedIntent,
    persona: PersonaType
  ): { message: string; suggestions: string[] } {
    switch (intent.action) {
      case 'wiselist':
        return {
          message: "**Wiselists** are curated collections of tutors — like playlists for education! You can create themed lists (e.g., \"Best GCSE Maths Tutors\"), set them as private, public, or shared, and invite collaborators.\n\nManage your Wiselists from the **Wiselists** page in the sidebar.",
          suggestions: ['View my Wiselists', 'Create a Wiselist'],
        };
      case 'freehelp':
        if (persona === 'tutor') {
          return {
            message: "**Free Help Now** lets you offer instant 30-minute sessions to students who need immediate help. Toggle it on in your **Account Settings**. You'll earn up to **+10 Credibility Score points** and a \"Community Tutor\" badge.\n\nStudents find you via the green badge in the marketplace.",
            suggestions: ['Enable Free Help', 'Go to Account Settings'],
          };
        }
        return {
          message: "**Free Help Now** — Get instant free tutoring! Browse the **Marketplace** and look for tutors with a green **\"Free Help Now\"** badge. Sessions are 30 minutes via Google Meet, no payment required. You can use up to **5 free sessions per week**.",
          suggestions: ['Find free help', 'Go to Marketplace'],
        };
      default:
        return {
          message: "The **Marketplace** is where you find and connect with tutors. You can search by **subject, level, location, price range**, and **availability**. Use advanced filters to find tutors with specific qualifications, DBS checks, or video intros.\n\nTutors are ranked by their **Credibility Score**, relevance, and engagement.",
          suggestions: ['Search tutors', 'Browse Marketplace', 'View Wiselists'],
        };
    }
  }

  private handleVirtualSpaceIntent(
    persona: PersonaType
  ): { message: string; suggestions: string[] } {
    return {
      message: "**VirtualSpace** is your virtual classroom with a collaborative **whiteboard** (powered by tldraw) and **Google Meet** video conferencing.\n\n**Features:**\n- Real-time collaborative whiteboard (draw, annotate, shapes, sticky notes, multi-page)\n- Screen sharing (full screen, window, or tab)\n- File sharing (up to 10MB per file)\n- Automatic session recording (90 days)\n- Create standalone sessions or join from a booking\n\nUsing VirtualSpace for 80%+ of sessions earns **+3 Credibility Score points**.",
      suggestions: ['Create a session', 'View my sessions', 'Go to VirtualSpace'],
    };
  }

  private handleCredibilityIntent(
    intent: DetectedIntent,
    persona: PersonaType
  ): { message: string; suggestions: string[] } {
    if (intent.action === 'verification') {
      return {
        message: "**Verification** improves your Credibility Score and builds trust:\n\n- **Identity Verification** — Verify your identity to unlock scoring\n- **DBS Check** — Enhanced DBS check for safeguarding (Trust bucket)\n- **Qualifications** — Add degrees and teaching certifications (Credentials bucket)\n\nComplete these in your **Account → Professional Info** section.",
        suggestions: ['Go to Professional Info', 'View my score'],
      };
    }

    const tutorBreakdown = persona === 'tutor' ? `\n\n**Tutor scoring buckets:**\n- Delivery & Quality (40%) — ratings, retention\n- Credentials & Expertise (20%) — degree, QTS, experience\n- Network & Connections (15%) — referrals, connections\n- Trust & Verification (10%) — identity, DBS\n- Digital Integration (10%) — calendar sync, VirtualSpace usage\n- Community Impact (5%) — free help sessions` : '';

    return {
      message: `**Credibility Score (CaaS)** — Your trust rating on TutorWise, scored **0-100**. It affects your **marketplace ranking**, booking conversion, and pricing power. The score updates in real-time based on your platform activity.${tutorBreakdown}\n\nView your score and breakdown on the **Dashboard**.`,
      suggestions: ['View my score', 'Go to Dashboard', 'Improve my score'],
    };
  }

  private handleNetworkIntent(
    intent: DetectedIntent,
    persona: PersonaType
  ): { message: string; suggestions: string[] } {
    if (intent.action === 'messages') {
      return {
        message: "Your **Messages** inbox is where you chat with connections, booking counterparties, and organisation members. You can share files (up to 10MB), pin conversations, and manage notifications.\n\nAccess it from the **Messages** link in the sidebar.",
        suggestions: ['Go to Messages', 'View conversations'],
      };
    }
    return {
      message: "**Network** — Build your professional connections on TutorWise. Connections boost your **Credibility Score** (up to +6 points for 20+ connections), increase marketplace visibility, and enable direct messaging.\n\nYou can send connection requests, browse suggested connections, and search by role, subject, or location.",
      suggestions: ['View my network', 'Find connections', 'Go to Network'],
    };
  }

  private handleAccountIntent(
    intent: DetectedIntent,
    persona: PersonaType
  ): { message: string; suggestions: string[] } {
    switch (intent.action) {
      case 'integrations':
        return {
          message: "**Integrations** connect TutorWise with your other tools:\n\n- **Google Calendar** (+4 CaaS points) — Two-way sync with bookings\n- **Google Classroom** (+2 CaaS points) — Share assignments with students\n- **Stripe** (+1 CaaS point) — Required for receiving payouts\n\nManage integrations in **Account → Settings**.",
          suggestions: ['Connect Google Calendar', 'Go to Settings'],
        };
      case 'stripe':
        return {
          message: "To receive payouts from tutoring sessions and referral commissions, you need to connect a **Stripe account** with your bank details. Set this up in the **Payments** section. Once connected, payouts are automatic every Friday.",
          suggestions: ['Go to Payments', 'Set up Stripe'],
        };
      case 'developer':
        return {
          message: "You can create and manage **API keys** for programmatic access to TutorWise in the **Developer → API Keys** section.",
          suggestions: ['Go to Developer'],
        };
      case 'settings':
        return {
          message: "Your **Account Settings** include notification preferences, integrations (Google Calendar, Classroom), Free Help Now toggle, and privacy settings. Access them from **Account → Settings** in the sidebar.",
          suggestions: ['Go to Settings', 'Manage notifications'],
        };
      default:
        return {
          message: "Your **Account** section lets you manage your personal info, professional profile, identity verification, integrations, and notification preferences.\n\nTutors also have a **My Students** section for managing client relationships and session history.",
          suggestions: ['Edit profile', 'Go to Account', 'View settings'],
        };
    }
  }

  private handleOrganisationIntent(
    intent: DetectedIntent,
    persona: PersonaType
  ): { message: string; suggestions: string[] } {
    switch (intent.action) {
      case 'tasks':
        return {
          message: "**Organisation Tasks** uses a Kanban board with 5 stages and 7 task categories. You can assign tasks to team members, set priorities and due dates, add comments, and attach files.\n\nAccess it from **Organisations → Tasks**.",
          suggestions: ['View tasks', 'Go to Organisations'],
        };
      case 'gamification':
        return {
          message: "**Organisation Gamification** includes achievements, streaks, and leaderboards to motivate your team. Track referral conversions, commission earnings, and engagement. View the leaderboard in **Organisations → Referrals**.",
          suggestions: ['View leaderboard', 'Go to Organisations'],
        };
      default:
        return {
          message: "**Organisations** is a team workspace for tutoring agencies, schools, and networks. Features include:\n\n- **Team Management** — Invite members, set roles (Owner/Admin/Member)\n- **Task Board** — Kanban with categories and assignments\n- **Referral Pipeline** — 4-stage automated tracking with achievements\n- **Commission Config** — Org vs member splits, per-member overrides\n- **Analytics** — Team performance and conversion rates\n\nSubscription: **£50/month** with a 14-day free trial.",
          suggestions: ['Go to Organisations', 'View team', 'View referral pipeline'],
        };
    }
  }

  private handleSupportIntent(
    intent: DetectedIntent,
    persona: PersonaType
  ): { message: string; suggestions: string[] } {
    if (intent.action === 'helpcentre') {
      return {
        message: "The **Help Centre** has guides for every platform feature, organised by category: Getting Started, Features, Billing, and Troubleshooting. You can browse or search for answers.\n\nAccess it from the **Help Centre** link in the sidebar.",
        suggestions: ['Go to Help Centre', 'Browse guides'],
      };
    }
    return {
      message: "I'm here to help! You can:\n\n- Ask me about any TutorWise feature\n- Visit the **Help Centre** for detailed guides\n- Contact support through the Help Centre for account-specific issues\n\nWhat would you like help with?",
      suggestions: ['Go to Help Centre', 'Ask about a feature'],
    };
  }

  private getSuggestionsForCategory(persona: PersonaType, category: IntentCategory): string[] {
    // Common suggestions that apply across personas
    const common: Partial<Record<IntentCategory, string[]>> = {
      referrals: ['Get referral link', 'View referrals', 'View commissions'],
      edupay: ['Go to EduPay', 'View EP balance', 'Set up Loan Profile'],
      marketplace: ['Search tutors', 'Browse Marketplace', 'View Wiselists'],
      virtualspace: ['Create session', 'View sessions', 'Go to VirtualSpace'],
      credibility: ['View my score', 'Improve my score', 'Go to Dashboard'],
      network: ['View network', 'Find connections', 'Go to Messages'],
      account: ['Edit profile', 'Go to Settings', 'View integrations'],
      organisation: ['Go to Organisations', 'View team', 'View tasks'],
    };

    if (common[category]) return common[category]!;

    const suggestions: Record<PersonaType, Partial<Record<IntentCategory, string[]>>> = {
      student: {
        learning: ['View homework', 'Browse resources', 'Ask Sage AI'],
        scheduling: ['View upcoming lessons', 'Request a new session'],
        resources: ['Browse learning materials', 'View recommended resources'],
        progress: ['View progress report', 'Set learning goals'],
        support: ['Contact your tutor', 'Go to Help Centre'],
        billing: ['View payment history'],
        feedback: ['Rate your last lesson'],
        general: ['View dashboard', 'Find a tutor', 'Ask about referrals'],
      },
      tutor: {
        learning: ['View student progress', 'Create new resources'],
        scheduling: ['Manage availability', 'View upcoming sessions'],
        resources: ['Upload materials', 'Organize library'],
        progress: ['View teaching analytics', 'Review feedback'],
        support: ['Go to Help Centre', 'Contact support'],
        billing: ['View earnings', 'Request withdrawal', 'View payouts'],
        feedback: ['View student reviews'],
        general: ['View dashboard', 'View earnings', 'Share referral link'],
      },
      client: {
        learning: ["View your child's progress", 'Ask Sage AI'],
        scheduling: ['Book a lesson', 'View upcoming sessions'],
        resources: ['Access shared materials'],
        progress: ['View progress report', 'Message tutor'],
        support: ['Go to Help Centre', 'Contact support'],
        billing: ['View invoices', 'Update payment method'],
        feedback: ['Leave a review'],
        general: ['Find a tutor', 'View bookings', 'Ask about referrals'],
      },
      agent: {
        learning: ['Review student progress'],
        scheduling: ['Coordinate bookings', 'Check availability'],
        resources: ['Browse resource library'],
        progress: ['Review activity', 'Generate reports'],
        support: ['View support tickets', 'Assist users'],
        billing: ['Review billing', 'View disputes'],
        feedback: ['Review all feedback'],
        general: ['View dashboard', 'Assist a user', 'View organisations'],
      },
      organisation: {
        learning: ['View learning analytics'],
        scheduling: ['Manage schedule'],
        resources: ['Manage resource library'],
        progress: ['View analytics', 'Generate reports'],
        support: ['Access admin support'],
        billing: ['View billing', 'Manage subscription'],
        feedback: ['View all feedback'],
        general: ['View dashboard', 'Manage users', 'View referral pipeline'],
      },
    };

    return suggestions[persona]?.[category] || ['How else can I help you?'];
  }

  /**
   * Handle platform info intents — public-facing responses for guests
   * Zero cost, no API calls, no user context needed
   */
  private handlePlatformIntent(intent: DetectedIntent): { message: string; suggestions: string[] } {
    switch (intent.action) {
      case 'about':
        return {
          message: "**Tutorwise** is a UK-based platform that connects students and parents with credible, vetted tutors.\n\n**How it works:**\n1. **Search** — Browse our marketplace to find tutors by subject, location, and price\n2. **Book** — Schedule sessions directly with secure online payments\n3. **Learn** — Join virtual or in-person sessions with tools like VirtualSpace (our interactive whiteboard)\n4. **Track** — Monitor progress with learning analytics and feedback\n\n**Key features:**\n- Credibility-scored tutors (DBS-checked, verified qualifications)\n- AI tutoring assistant (Sage) for on-demand homework help\n- EduPay for student finance management\n- Referral programme with commission\n\nWould you like to find a tutor or learn more about a specific feature?",
          suggestions: ['Find a tutor', 'How much does it cost?', 'Sign up'],
        };

      case 'pricing':
        return {
          message: "**Tutorwise pricing is set by individual tutors**, so you'll find options for every budget.\n\n**For students/parents:**\n- **Free to join** — no subscription or membership fees\n- **Pay per session** — each tutor sets their own hourly rate\n- **Typical rates:** £15-£50/hour depending on subject, level, and tutor experience\n- **Secure payments** via Stripe\n\n**For tutors:**\n- **Free to create a profile** and list your services\n- A small platform fee applies to bookings\n\n**Bonus:** Sage (our AI tutor) is included free for all registered users!\n\nWant to browse tutors and see specific rates?",
          suggestions: ['Find a tutor', 'Sign up free', 'What subjects?'],
        };

      case 'subjects':
        return {
          message: "Tutorwise covers a wide range of subjects across all levels:\n\n**Core subjects:**\n- Mathematics (KS1 through A-Level and beyond)\n- English (Language, Literature, Creative Writing)\n- Science (Physics, Chemistry, Biology)\n\n**Also available:**\n- Modern Languages (French, Spanish, German, etc.)\n- Humanities (History, Geography, RE)\n- Computing & IT\n- Music, Art & Drama\n- 11+, GCSE, A-Level and university exam prep\n\n**Levels:** Primary, KS3, GCSE, A-Level, University, Adult learners\n\nBrowse our marketplace to find tutors for your specific subject and level.",
          suggestions: ['Find a tutor', 'How much does it cost?', 'Sign up'],
        };

      case 'safety':
        return {
          message: "Safety is our top priority at Tutorwise.\n\n**How we protect you:**\n- **Credibility Score** — Every tutor has a transparent trust score based on verified credentials\n- **DBS checks** — Enhanced background checks for all tutors\n- **ID verification** — Verified identity before tutors can accept bookings\n- **Qualification verification** — We check teaching qualifications and certificates\n- **Secure payments** — All payments handled through Stripe (no cash exchanges)\n- **Reviews & ratings** — Read honest feedback from other students and parents\n- **VirtualSpace** — Safe, monitored virtual classroom environment\n\nYour child's safety and your peace of mind come first.",
          suggestions: ['Find a tutor', 'How does it work?', 'Sign up'],
        };

      case 'signup':
        return {
          message: "Getting started with Tutorwise is quick and free!\n\n**To sign up:**\n1. Click **Sign Up** on the top of the page\n2. Create your account with email or Google\n3. Choose your role (Student, Parent, or Tutor)\n4. Complete your profile\n5. Start browsing tutors or listing your services!\n\n**It's completely free** to create an account. You only pay when you book a session.\n\nReady to get started?",
          suggestions: ['Sign up now', 'Find a tutor', 'How much does it cost?'],
        };

      case 'sage':
        return {
          message: "**Sage** is our AI-powered tutoring assistant, available to all registered users.\n\n**What Sage can do:**\n- Explain concepts in maths, English, and science\n- Walk through problems step-by-step\n- Generate practice questions\n- Help with homework (guiding, not giving answers)\n- Prepare you for GCSE, A-Level, and other exams\n\n**Key benefits:**\n- Available 24/7 — get help anytime\n- Adapts to your level (Primary through University)\n- Completely free for registered users\n- Works alongside your human tutor\n\nSign up to try Sage for free!",
          suggestions: ['Sign up free', 'Find a tutor', 'What subjects?'],
        };

      default:
        return {
          message: "Welcome to Tutorwise! I can help you learn about our platform. I can tell you about our tutors, pricing, subjects, safety features, and more.\n\nWhat would you like to know?",
          suggestions: ['How does it work?', 'Find a tutor', 'Is it safe?'],
        };
    }
  }
}

export default RulesProvider;
