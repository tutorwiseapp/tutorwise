/**
 * Agent Persona
 *
 * Lexi persona for platform agents - TutorWise staff members who
 * provide support, coordinate tutoring services, and assist users.
 *
 * Agents are platform employees/contractors who:
 * - Provide customer support to tutors and clients
 * - Help coordinate bookings and resolve issues
 * - Assist with tutor onboarding and verification
 * - Handle general platform inquiries
 *
 * @module lexi/personas/agent
 */

import type { AgentContext } from '../../../cas/packages/core/src/context';
import type {
  PersonaConfig,
  DetectedIntent,
  ActionResult,
  IntentCategory,
} from '../../types';
import { BasePersona } from '../base-persona';

// --- Agent Persona Config ---

const AGENT_CONFIG: PersonaConfig = {
  type: 'agent',
  displayName: 'Lexi (Agent Assistant)',
  capabilities: [
    'user_support',
    'booking_coordination',
    'tutor_assistance',
    'client_assistance',
    'issue_resolution',
    'onboarding_help',
    'platform_guidance',
    'feedback_collection',
  ],
  defaultGreeting: "Hi {name}! I'm Lexi, your agent assistant. Ready to help you support our users today.",
  tone: 'professional',
};

// --- Agent Persona Class ---

class AgentPersonaImpl extends BasePersona {
  type = 'agent' as const;
  config = AGENT_CONFIG;

  protected getHandledCategories(): IntentCategory[] {
    return ['learning', 'scheduling', 'resources', 'progress', 'billing', 'feedback', 'support', 'general'];
  }

  async handleIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    this.log('handleIntent', ctx, { category: intent.category, action: intent.action });

    switch (intent.category) {
      case 'support':
        return this.handleSupportIntent(intent, ctx);
      case 'progress':
        return this.handleProgressIntent(intent, ctx);
      case 'billing':
        return this.handleBillingIntent(intent, ctx);
      case 'learning':
        return this.handleLearningIntent(intent, ctx);
      case 'scheduling':
        return this.handleSchedulingIntent(intent, ctx);
      case 'feedback':
        return this.handleFeedbackIntent(intent, ctx);
      default:
        return this.handleGeneralIntent(intent, ctx);
    }
  }

  async getSuggestedActions(ctx: AgentContext): Promise<string[]> {
    return [
      'Look up user',
      'View support queue',
      'Platform analytics',
      'System status',
    ];
  }

  // --- Intent Handlers ---

  private async handleSupportIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    switch (intent.action) {
      case 'request':
        return this.success(
          "Support tools ready. How can I help you assist our users?",
          null,
          ['Tutor needs help', 'Client needs help', 'Booking issue', 'General inquiry']
        );

      default:
        return this.success(
          "I can help you provide great support. What type of assistance do you need?",
          null,
          ['Look up user', 'Check booking', 'Review issue', 'Guide user']
        );
    }
  }

  private async handleProgressIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "I can help you review user activity and performance. What would you like to check?",
      null,
      ['Tutor performance', 'Student progress', 'Recent activity', 'Usage patterns']
    );
  }

  private async handleBillingIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "I can help you assist users with billing questions. What's the issue?",
      null,
      ['Payment inquiry', 'Invoice question', 'Refund request', 'Pricing help']
    );
  }

  private async handleLearningIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "I can help you assist users with learning resources. What do they need?",
      null,
      ['Find resources', 'Recommend tutor', 'Subject guidance', 'Learning path help']
    );
  }

  private async handleSchedulingIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    switch (intent.action) {
      case 'check':
        return this.success(
          "I can help you check and coordinate bookings. What do you need?",
          null,
          ['Find a booking', 'Check availability', 'Resolve conflict', 'Reschedule help']
        );

      case 'modify':
        return this.success(
          "I'll help you modify a booking. Please provide the booking ID or user details.",
          null,
          ['Search by booking ID', 'Search by user', 'View recent bookings']
        );

      default:
        return this.success(
          "Booking coordination tools. Select an action:",
          null,
          ['Find booking', 'Check tutor availability', 'Help with rescheduling', 'Resolve issue']
        );
    }
  }

  private async handleFeedbackIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "I can help you collect and review feedback. What do you need?",
      null,
      ['Collect feedback', 'Review reports', 'Follow up on issue', 'User satisfaction']
    );
  }

  private async handleGeneralIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "Welcome! I'm here to help you support our tutors and clients. Here's your dashboard:",
      {
        todayStats: {
          ticketsResolved: 0,
          usersAssisted: 0,
          bookingsCoordinated: 0,
        },
      },
      await this.getSuggestedActions(ctx)
    );
  }

  // --- Agent-Specific Helper Methods ---

  /**
   * Help an agent look up user information
   */
  async assistUserLookup(ctx: AgentContext, searchQuery: string): Promise<ActionResult> {
    this.log('assistUserLookup', ctx, { searchQuery });

    return this.success(
      `Searching for user: "${searchQuery}"`,
      { results: [] },
      ['View user profile', 'Contact user', 'Check user history']
    );
  }

  /**
   * Help an agent resolve a booking issue
   */
  async assistBookingResolution(ctx: AgentContext, bookingId: string): Promise<ActionResult> {
    this.log('assistBookingResolution', ctx, { bookingId });

    return this.success(
      `Booking ${bookingId} details loaded. How would you like to help?`,
      null,
      ['Contact tutor', 'Contact client', 'Reschedule', 'Process refund']
    );
  }

  /**
   * Help an agent with tutor onboarding
   */
  async assistTutorOnboarding(ctx: AgentContext, tutorId: string): Promise<ActionResult> {
    this.log('assistTutorOnboarding', ctx, { tutorId });

    return this.success(
      "I'll help you guide this tutor through onboarding. What step are they on?",
      null,
      ['Profile setup', 'Verification', 'Payment setup', 'First booking']
    );
  }
}

// --- Export ---

export const AgentPersona = new AgentPersonaImpl();

export default AgentPersona;
