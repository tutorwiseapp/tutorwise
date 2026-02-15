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
  type: 'client',
  displayName: 'Client Matching Helper',
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
  tone: 'friendly',
};

const suggestedQueries = [
  "Find a maths tutor for GCSE",
  "Who are your best-rated English tutors?",
  "I need a tutor for primary school science",
  "Compare tutors for A-Level chemistry",
  "Find tutors available on weekends",
];

// --- Intent Handlers ---

const handlers: IntentHandlerMap = {
  tutors: {
    search: async function(this: ClientMatchingHelperPersona, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Searching tutors', ctx, intent.entities);
      const { subject, level } = intent.entities || {};

      // TODO: Integrate with booking module when tutor search API is available
      return this.success(
        `**Finding tutors${subject ? ` for ${subject}` : ''}${level ? ` at ${level} level` : ''}:**\n\n` +
        `I can help you find the perfect tutor! To get started:\n\n` +
        `1. Tell me what subject you need help with\n` +
        `2. What level (GCSE, A-Level, Primary, etc.)\n` +
        `3. Any preferred times or days\n\n` +
        `You can also browse tutors directly in the **Find Tutors** section.`,
        null,
        ['Browse tutors', 'GCSE Maths', 'Primary English']
      );
    },

    recommend: async function(this: ClientMatchingHelperPersona, intent: DetectedIntent, _ctx: AgentContext): Promise<ActionResult> {
      const subject = intent.entities?.subject;
      const childAge = intent.entities?.age;

      let message = `**Finding the best match for your child:**\n\n`;
      if (subject) message += `📚 **Subject:** ${subject}\n`;
      if (childAge) message += `👤 **Age Group:** ${childAge}\n`;

      message += '\n**What I consider when matching:**\n';
      message += "• Tutor's experience with similar students\n";
      message += '• Teaching style compatibility\n';
      message += '• Availability that works for you\n';
      message += '• Ratings and parent reviews\n\n';
      message += 'Tell me more about what you need!';

      return this.success(message, null, ['GCSE Maths', 'Primary English', 'A-Level Sciences']);
    },

    compare: async function(this: ClientMatchingHelperPersona, _intent: DetectedIntent, _ctx: AgentContext): Promise<ActionResult> {
      return this.success(
        "I'd love to help you compare tutors! First, let me find some options for you.\n\n" +
        "What subject and level are you looking for?",
        null,
        ['Find maths tutors', 'Find English tutors', 'Find science tutors']
      );
    },

    availability: async function(this: ClientMatchingHelperPersona, _intent: DetectedIntent, _ctx: AgentContext): Promise<ActionResult> {
      return this.success(
        "I can check tutor availability for you.\n\n" +
        "Tell me your preferred times and I'll help find tutors available then.",
        null,
        ['Weekday evenings', 'Weekend mornings', 'Any time']
      );
    },
  },

  explain: {
    qualifications: async function(this: ClientMatchingHelperPersona, _intent: DetectedIntent, _ctx: AgentContext): Promise<ActionResult> {
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
    return ['scheduling', 'support', 'general'];
  }

  async handleIntent(_intent: DetectedIntent, _ctx: AgentContext): Promise<ActionResult> {
    return this.error('Intent handling not implemented');
  }

  async getSuggestedActions(_ctx: AgentContext): Promise<string[]> {
    return suggestedQueries;
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
