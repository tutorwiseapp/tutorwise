/**
 * Tutor Earnings Expert Sub-Persona
 *
 * Specialized persona for helping tutors with earnings,
 * payments, invoices, and financial queries.
 *
 * @module lexi/personas/sub-personas/tutor-earnings-expert
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
  type: 'tutor',
  displayName: 'Tutor Earnings Expert',
  defaultGreeting: `Hi {name}! I'm your earnings specialist. I can help you understand your payments, check payouts, explain fees, and answer any financial questions about tutoring on TutorWise.`,
  capabilities: [
    'View and explain earnings breakdown',
    'Check payout status and history',
    'Explain platform fees and commissions',
    'Help with invoice queries',
    'Explain referral commissions',
    'Tax documentation assistance',
    'Payment troubleshooting',
  ],
  tone: 'professional',
};

const suggestedQueries = [
  "What are my earnings this month?",
  "When is my next payout?",
  "How are fees calculated?",
  "Show my invoice history",
  "How do referral commissions work?",
];

// --- Intent Handlers ---

const handlers: IntentHandlerMap = {
  billing: {
    earnings: async function(this: TutorEarningsExpertPersona, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Checking earnings', ctx);
      const period = intent.entities?.period || 'month';

      // TODO: Integrate with financials API when available
      return this.success(
        `**Earnings Information:**\n\n` +
        `To view your detailed earnings for ${period}:\n\n` +
        `1. Go to **Dashboard** > **Earnings**\n` +
        `2. Select the time period you want to view\n` +
        `3. Download statements as needed\n\n` +
        `**Quick Facts:**\n` +
        `• Platform fee: 15% of lesson price\n` +
        `• Payouts: Weekly on Mondays\n` +
        `• Minimum payout: £10\n\n` +
        `Would you like me to explain how fees work?`,
        null,
        ['Explain fees', 'How do payouts work?', 'Go to Dashboard']
      );
    },

    payouts: async function(this: TutorEarningsExpertPersona, _intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Checking payouts', ctx);

      return this.success(
        `**Payout Information:**\n\n` +
        `Payouts are processed weekly on **Mondays** for completed lessons.\n\n` +
        `**How it works:**\n` +
        `• Lessons completed by Sunday are included\n` +
        `• Minimum payout amount: £10\n` +
        `• Funds arrive in 2-3 business days\n\n` +
        `To view your payout history, go to **Dashboard** > **Earnings** > **Payouts**`,
        null,
        ['How do payouts work?', 'Update bank details', 'Go to Dashboard']
      );
    },

    fees: async function(this: TutorEarningsExpertPersona, _intent: DetectedIntent, _ctx: AgentContext): Promise<ActionResult> {
      return this.success(
        `**TutorWise Fee Structure:**\n\n` +
        `**Platform Fee:** 15% of lesson price\n` +
        `This covers:\n` +
        `• Payment processing (Stripe)\n` +
        `• Platform maintenance\n` +
        `• Customer support\n` +
        `• Insurance coverage\n\n` +
        `**Example:**\n` +
        `You set a £40/hour rate:\n` +
        `• Client pays: £40\n` +
        `• Platform fee: £6 (15%)\n` +
        `• You receive: £34\n\n` +
        `*Tip: You can adjust your hourly rate anytime in Settings.*`,
        null,
        ['Check my earnings', 'How do payouts work?']
      );
    },

    invoices: async function(this: TutorEarningsExpertPersona, _intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Fetching invoices', ctx);

      return this.success(
        `**Invoice Information:**\n\n` +
        `Invoices are automatically generated for each completed lesson.\n\n` +
        `To view and download your invoices:\n` +
        `1. Go to **Dashboard** > **Earnings**\n` +
        `2. Click on **Invoices** tab\n` +
        `3. Download individual invoices or batch export\n\n` +
        `Invoices include all the details you need for tax purposes.`,
        null,
        ['Go to Dashboard', 'Tax documentation help']
      );
    },

    referrals: async function(this: TutorEarningsExpertPersona, _intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Checking referrals', ctx);

      return this.success(
        `**Referral Program:**\n\n` +
        `Earn £20 for each tutor or client you refer who completes their first booking!\n\n` +
        `**How it works:**\n` +
        `1. Share your referral link from Settings\n` +
        `2. New user signs up and completes a booking\n` +
        `3. You receive £20 credit\n\n` +
        `You can find your referral link in **Settings** > **Referrals**.`,
        null,
        ['Go to Settings', 'How do payouts work?']
      );
    },
  },
};

// --- Persona Class ---

class TutorEarningsExpertPersona extends BasePersona {
  type: PersonaType = 'tutor';
  config = config;

  protected getHandledCategories(): IntentCategory[] {
    return ['billing', 'support'];
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
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- Export ---

export const TutorEarningsExpert = withIntentHandlers(
  new TutorEarningsExpertPersona(),
  handlers
);

export const tutorEarningsExpert = TutorEarningsExpert;

export default TutorEarningsExpert;
