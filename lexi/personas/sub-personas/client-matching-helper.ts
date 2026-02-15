/**
 * Client Matching Helper Sub-Persona
 *
 * Specialized persona for helping parents/clients find
 * and match with the right tutors for their children.
 *
 * @module lexi/personas/sub-personas/client-matching-helper
 */

import { BasePersona, withIntentHandlers, type IntentHandlerMap } from '../base-persona';
import type { AgentContext } from '../../../cas/packages/core/src/context';
import type {
  PersonaType,
  PersonaConfig,
  DetectedIntent,
  ActionResult,
  IntentCategory,
} from '../../types';

// --- Persona Config ---

const config: PersonaConfig = {
  name: 'Client Matching Helper',
  description: 'Expert assistance finding and matching with the perfect tutor',
  defaultGreeting: `Hi {name}! I'm here to help you find the perfect tutor for your child. Tell me what subject you need help with, and I'll find tutors who match your requirements.`,
  capabilities: [
    'Search for tutors by subject and level',
    'Compare tutor profiles and ratings',
    'Check tutor availability',
    'Explain tutor qualifications',
    'Help with booking decisions',
    'Recommend based on learning needs',
    'Filter by price and location',
  ],
  suggestedQueries: [
    "Find a maths tutor for GCSE",
    "Who are your best-rated English tutors?",
    "I need a tutor for primary school science",
    "Compare tutors for A-Level chemistry",
    "Find tutors available on weekends",
  ],
};

// --- Intent Handlers ---

const handlers: IntentHandlerMap = {
  tutors: {
    search: async function(this: ClientMatchingHelper, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Searching tutors', ctx, intent.entities);

      const { subject, level, availability, maxPrice } = intent.entities || {};

      const tutors = await this.api.tutors.search(ctx, {
        subject,
        level,
        availability,
        maxPrice,
        limit: 5,
      });

      if (!tutors || tutors.length === 0) {
        return this.success(
          `I couldn't find tutors matching your criteria. Let me help you adjust your search.\n\n` +
          `What's most important to you?`,
          null,
          ['Expand price range', 'Try different times', 'Search all subjects']
        );
      }

      let message = `**I found ${tutors.length} tutors for you:**\n\n`;

      tutors.forEach((tutor, index) => {
        message += `**${index + 1}. ${tutor.name}**\n`;
        message += `⭐ ${tutor.rating}/5 (${tutor.reviewCount} reviews)\n`;
        message += `📚 ${tutor.subjects.join(', ')}\n`;
        message += `💷 £${tutor.hourlyRate}/hour\n`;
        if (tutor.nextAvailable) {
          message += `📅 Next available: ${formatDate(tutor.nextAvailable)}\n`;
        }
        message += '\n';
      });

      return this.success(
        message,
        tutors,
        ['View tutor profiles', 'Book a trial lesson', 'Refine search']
      );
    },

    recommend: async function(this: ClientMatchingHelper, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Getting recommendations', ctx);

      const childAge = intent.entities?.age;
      const subject = intent.entities?.subject;
      const learningNeeds = intent.entities?.needs;

      let message = `**Finding the best match for your child:**\n\n`;

      if (subject) {
        message += `📚 **Subject:** ${subject}\n`;
      }
      if (childAge) {
        message += `👤 **Age Group:** ${childAge}\n`;
      }

      message += '\n**What I consider when matching:**\n';
      message += "• Tutor's experience with similar students\n";
      message += '• Teaching style compatibility\n';
      message += '• Availability that works for you\n';
      message += '• Ratings and parent reviews\n\n';

      message += 'To give you the best recommendations, tell me:\n';
      message += '1. What subject does your child need help with?\n';
      message += '2. What year/level are they in?\n';
      message += '3. Any specific learning needs?';

      return this.success(message, null, ['GCSE Maths', 'Primary English', 'A-Level Sciences']);
    },

    compare: async function(this: ClientMatchingHelper, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Comparing tutors', ctx);

      const tutorIds = intent.entities?.tutorIds || [];

      if (tutorIds.length < 2) {
        return this.success(
          "I'd love to help you compare tutors! First, let me find some options for you.\n\n" +
          "What subject and level are you looking for?",
          null,
          ['Find maths tutors', 'Find English tutors', 'Find science tutors']
        );
      }

      const tutors = await this.api.tutors.getByIds(ctx, tutorIds);

      if (!tutors || tutors.length < 2) {
        return this.error("I couldn't find enough tutors to compare.");
      }

      let message = '**Tutor Comparison:**\n\n';
      message += '| | ' + tutors.map(t => t.name).join(' | ') + ' |\n';
      message += '|---|' + tutors.map(() => '---').join('|') + '|\n';
      message += '| **Rating** | ' + tutors.map(t => `⭐ ${t.rating}`).join(' | ') + ' |\n';
      message += '| **Reviews** | ' + tutors.map(t => t.reviewCount).join(' | ') + ' |\n';
      message += '| **Rate** | ' + tutors.map(t => `£${t.hourlyRate}`).join(' | ') + ' |\n';
      message += '| **Experience** | ' + tutors.map(t => `${t.yearsExperience}+ years`).join(' | ') + ' |\n';

      return this.success(message, tutors, ['View full profiles', 'Book trial lessons']);
    },

    availability: async function(this: ClientMatchingHelper, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Checking availability', ctx);

      const tutorId = intent.entities?.tutorId;
      const preferredTime = intent.entities?.time;

      if (!tutorId) {
        return this.success(
          "I can check tutor availability for you. Which tutor would you like to check?\n\n" +
          "You can also tell me your preferred times and I'll find tutors available then.",
          null,
          ['Weekday evenings', 'Weekend mornings', 'Any time']
        );
      }

      const availability = await this.api.tutors.getAvailability(ctx, tutorId);

      if (!availability) {
        return this.error("Couldn't fetch availability. Please try again.");
      }

      let message = `**${availability.tutorName}'s Availability:**\n\n`;

      if (availability.nextSlots.length === 0) {
        message += "This tutor is fully booked at the moment.\n\n";
        message += "Would you like me to find similar tutors with availability?";
        return this.success(message, null, ['Find similar tutors', 'Join waitlist']);
      }

      message += '**Next available slots:**\n';
      availability.nextSlots.slice(0, 5).forEach(slot => {
        message += `• ${formatDateTime(slot.start)} (${slot.duration} mins)\n`;
      });

      return this.success(message, availability, ['Book a slot', 'See more times', 'Message tutor first']);
    },
  },

  explain: {
    qualifications: async function(this: ClientMatchingHelper, intent: DetectedIntent, _ctx: AgentContext): Promise<ActionResult> {
      const tutorId = intent.entities?.tutorId;

      return this.success(
        `**Understanding Tutor Qualifications:**\n\n` +
        `**Verified Badge** ✓\n` +
        `Means the tutor has completed our verification process:\n` +
        `• ID verification\n` +
        `• DBS check (Enhanced)\n` +
        `• Qualification verification\n\n` +
        `**Experience Levels:**\n` +
        `• 1-2 years: Great for simple topics\n` +
        `• 3-5 years: Good for exam prep\n` +
        `• 5+ years: Expert for complex subjects\n\n` +
        `**Reviews & Ratings:**\n` +
        `• 4.5+ stars: Excellent track record\n` +
        `• Look for reviews from similar students\n\n` +
        `Would you like me to explain a specific tutor's qualifications?`,
        null,
        ['View tutor profiles', 'What makes a good tutor?']
      );
    },
  },
};

// --- Persona Class ---

class ClientMatchingHelperPersona extends BasePersona {
  type: PersonaType = 'client';
  config = config;

  protected getHandledCategories(): IntentCategory[] {
    return ['tutors', 'explain', 'booking'];
  }

  async handleIntent(_intent: DetectedIntent, _ctx: AgentContext): Promise<ActionResult> {
    return this.error('Intent handling not implemented');
  }

  async getSuggestedActions(_ctx: AgentContext): Promise<string[]> {
    return config.suggestedQueries;
  }

  getGreeting(ctx: AgentContext): string {
    const userName = ctx.user?.metadata?.displayName as string || 'there';
    return config.defaultGreeting.replace('{name}', userName);
  }
}

// --- Helper Functions ---

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// --- Export ---

export const ClientMatchingHelper = withIntentHandlers(
  new ClientMatchingHelperPersona(),
  handlers
);

export const clientMatchingHelper = ClientMatchingHelper;

export default ClientMatchingHelper;
