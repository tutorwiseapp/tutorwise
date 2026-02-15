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
  name: 'Tutor Earnings Expert',
  description: 'Expert assistance with tutor earnings, payments, and financial queries',
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
  suggestedQueries: [
    "What are my earnings this month?",
    "When is my next payout?",
    "How are fees calculated?",
    "Show my invoice history",
    "How do referral commissions work?",
  ],
};

// --- Intent Handlers ---

const handlers: IntentHandlerMap = {
  billing: {
    earnings: async function(this: TutorEarningsExpert, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Checking earnings', ctx);

      const period = intent.entities?.period || 'month';

      // Get earnings data
      const earnings = await this.api.financials.getEarnings(ctx, period);

      if (!earnings) {
        return this.error('Unable to fetch earnings at the moment. Please try again.');
      }

      return this.success(
        `Here's your earnings summary for ${period}:\n\n` +
        `**Gross Earnings:** £${earnings.gross.toFixed(2)}\n` +
        `**Platform Fee (15%):** -£${earnings.platformFee.toFixed(2)}\n` +
        `**Net Earnings:** £${earnings.net.toFixed(2)}\n` +
        `**Completed Lessons:** ${earnings.lessonCount}\n\n` +
        `Your average per lesson: £${earnings.lessonCount > 0 ? (earnings.net / earnings.lessonCount).toFixed(2) : '0.00'}`,
        earnings,
        ['View payout history', 'Download statement', 'Explain fees']
      );
    },

    payouts: async function(this: TutorEarningsExpert, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Checking payouts', ctx);

      const payouts = await this.api.financials.getPayouts(ctx);

      if (!payouts || payouts.length === 0) {
        return this.success(
          "You don't have any payouts yet. Payouts are processed weekly on Mondays for completed lessons.",
          null,
          ['How do payouts work?', 'Check earnings']
        );
      }

      const nextPayout = payouts.find(p => p.status === 'pending');
      const recentPayouts = payouts.filter(p => p.status === 'completed').slice(0, 3);

      let message = '';
      if (nextPayout) {
        message += `**Next Payout:** £${nextPayout.amount.toFixed(2)} (Expected: ${formatDate(nextPayout.expectedDate)})\n\n`;
      }

      if (recentPayouts.length > 0) {
        message += '**Recent Payouts:**\n';
        recentPayouts.forEach(p => {
          message += `• £${p.amount.toFixed(2)} - ${formatDate(p.date)} (${p.status})\n`;
        });
      }

      return this.success(message, { nextPayout, recentPayouts }, ['View all payouts', 'Update bank details']);
    },

    fees: async function(this: TutorEarningsExpert, _intent: DetectedIntent, _ctx: AgentContext): Promise<ActionResult> {
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

    invoices: async function(this: TutorEarningsExpert, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Fetching invoices', ctx);

      const invoices = await this.api.financials.getInvoices(ctx, 5);

      if (!invoices || invoices.length === 0) {
        return this.success(
          "You don't have any invoices yet. Invoices are automatically generated for each completed lesson.",
          null,
          ['Check earnings', 'View bookings']
        );
      }

      let message = '**Recent Invoices:**\n\n';
      invoices.forEach(inv => {
        message += `• #${inv.number} - £${inv.amount.toFixed(2)} (${inv.status}) - ${formatDate(inv.date)}\n`;
      });

      return this.success(message, invoices, ['Download invoices', 'View all invoices']);
    },

    referrals: async function(this: TutorEarningsExpert, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Checking referrals', ctx);

      const referrals = await this.api.financials.getReferrals(ctx);

      if (!referrals) {
        return this.success(
          `**Referral Program:**\n\n` +
          `Earn £20 for each tutor or client you refer who completes their first booking!\n\n` +
          `**How it works:**\n` +
          `1. Share your referral link from Settings\n` +
          `2. New user signs up and completes a booking\n` +
          `3. You receive £20 credit\n\n` +
          `You can find your referral link in Settings > Referrals.`,
          null,
          ['Go to Settings', 'Check my referrals']
        );
      }

      return this.success(
        `**Your Referral Summary:**\n\n` +
        `**Total Referrals:** ${referrals.total}\n` +
        `**Completed:** ${referrals.completed}\n` +
        `**Pending:** ${referrals.pending}\n` +
        `**Total Earned:** £${referrals.totalEarned.toFixed(2)}\n\n` +
        `Share your link to earn more!`,
        referrals,
        ['Copy referral link', 'View referral details']
      );
    },
  },
};

// --- Persona Class ---

class TutorEarningsExpertPersona extends BasePersona {
  type: PersonaType = 'tutor';
  config = config;

  protected getHandledCategories(): IntentCategory[] {
    return ['billing', 'explain', 'support'];
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
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// --- Export ---

export const TutorEarningsExpert = withIntentHandlers(
  new TutorEarningsExpertPersona(),
  handlers
);

export const tutorEarningsExpert = TutorEarningsExpert;

export default TutorEarningsExpert;
