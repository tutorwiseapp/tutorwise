/**
 * Organisation Admin Sub-Persona
 *
 * Specialized persona for helping organisation administrators
 * manage tutoring operations, analytics, and team management.
 *
 * @module lexi/personas/sub-personas/organisation-admin
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
  type: 'organisation',
  displayName: 'Organisation Admin',
  defaultGreeting: `Hi {name}! I'm your organisation management assistant. I can help you with analytics, tutor management, reporting, and administrative tasks for your tutoring organisation.`,
  capabilities: [
    'View organisation-wide analytics',
    'Generate performance reports',
    'Manage tutors and students',
    'Track revenue and bookings',
    'Configure organisation settings',
    'Handle billing and subscriptions',
    'Export data and reports',
  ],
  tone: 'professional',
};

const suggestedQueries = [
  "Show this month's analytics",
  "How many active tutors do we have?",
  "Generate a performance report",
  "What's our booking completion rate?",
  "View revenue breakdown",
];

// --- Intent Handlers ---

const handlers: IntentHandlerMap = {
  analytics: {
    overview: async function(this: OrganisationAdminPersona, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Getting analytics overview', ctx);
      const period = intent.entities?.period || 'month';

      // TODO: Integrate with organisation analytics API when available
      return this.success(
        `**Organisation Analytics:**\n\n` +
        `To view your detailed analytics for ${period}:\n\n` +
        `1. Go to **Dashboard** > **Analytics**\n` +
        `2. Select the time period\n` +
        `3. View team, bookings, and revenue metrics\n\n` +
        `**Available Reports:**\n` +
        `• Team performance overview\n` +
        `• Booking completion rates\n` +
        `• Revenue breakdown\n` +
        `• Growth trends\n\n` +
        `Would you like help with a specific report?`,
        null,
        ['Tutor performance', 'Revenue report', 'Go to Dashboard']
      );
    },

    tutors: async function(this: OrganisationAdminPersona, _intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Getting tutor analytics', ctx);

      return this.success(
        `**Tutor Performance:**\n\n` +
        `View detailed tutor analytics in your dashboard:\n\n` +
        `**Available Metrics:**\n` +
        `• Total and active tutors\n` +
        `• Average ratings\n` +
        `• Lesson completion rates\n` +
        `• Top performers\n` +
        `• Tutors needing attention\n\n` +
        `Go to **Dashboard** > **Team** > **Performance** for full details.`,
        null,
        ['Go to Dashboard', 'Invite tutors', 'Export report']
      );
    },

    revenue: async function(this: OrganisationAdminPersona, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Getting revenue analytics', ctx);
      const period = intent.entities?.period || 'month';

      return this.success(
        `**Revenue Analytics (${period}):**\n\n` +
        `View your revenue breakdown in the dashboard:\n\n` +
        `**Available Data:**\n` +
        `• Gross and net revenue\n` +
        `• Revenue by subject\n` +
        `• Revenue by tutor\n` +
        `• Growth trends\n` +
        `• Average lesson value\n\n` +
        `Go to **Dashboard** > **Financials** for detailed reports.`,
        null,
        ['Export financial report', 'Go to Dashboard']
      );
    },
  },

  manage: {
    tutors: async function(this: OrganisationAdminPersona, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Managing tutors', ctx);
      const action = intent.entities?.action;

      if (action === 'invite') {
        return this.success(
          `**Invite New Tutor:**\n\n` +
          `You can invite tutors in two ways:\n\n` +
          `1. **Email Invitation:**\n` +
          `   Go to Settings > Team > Invite Tutor\n\n` +
          `2. **Share Link:**\n` +
          `   Copy your organisation invite link from Settings\n\n` +
          `New tutors will be added to your organisation once they complete registration.`,
          null,
          ['Go to Settings', 'Copy invite link']
        );
      }

      return this.success(
        `**Manage Your Tutors:**\n\n` +
        `Go to **Dashboard** > **Team** to:\n\n` +
        `• View all tutors in your organisation\n` +
        `• Check tutor status and activity\n` +
        `• Invite new tutors\n` +
        `• Send announcements\n` +
        `• Manage permissions\n\n` +
        `What would you like to do?`,
        null,
        ['Invite tutor', 'View team', 'Send announcement']
      );
    },

    students: async function(this: OrganisationAdminPersona, _intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Managing students', ctx);

      return this.success(
        `**Student Management:**\n\n` +
        `View enrolled students in **Dashboard** > **Students**:\n\n` +
        `• See all students across your tutors\n` +
        `• View progress reports\n` +
        `• Track lesson history\n` +
        `• Access feedback and ratings\n\n` +
        `Students are automatically added when clients book lessons with your tutors.`,
        null,
        ['Go to Dashboard', 'View progress reports']
      );
    },
  },

  reports: {
    generate: async function(this: OrganisationAdminPersona, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Generating report', ctx);
      const reportType = intent.entities?.type || 'performance';

      return this.success(
        `**Generate ${reportType} Report:**\n\n` +
        `Available reports in **Dashboard** > **Reports**:\n\n` +
        `1. **Performance Report**\n` +
        `   Tutor performance, completion rates, ratings\n\n` +
        `2. **Financial Report**\n` +
        `   Revenue, payouts, outstanding payments\n\n` +
        `3. **Student Progress Report**\n` +
        `   Learning outcomes, session summaries\n\n` +
        `4. **Activity Report**\n` +
        `   Bookings, cancellations, engagement\n\n` +
        `Reports can be exported as PDF or CSV.`,
        null,
        ['Performance Report', 'Financial Report', 'Progress Report']
      );
    },

    export: async function(this: OrganisationAdminPersona, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Exporting data', ctx);
      const format = (intent.entities?.format as string) || 'csv';

      return this.success(
        `**Data Export:**\n\n` +
        `Export data in ${format.toUpperCase()} format from **Dashboard** > **Reports** > **Export**:\n\n` +
        `**Available exports:**\n` +
        `• All bookings\n` +
        `• Tutor list with stats\n` +
        `• Student list\n` +
        `• Financial transactions\n` +
        `• Analytics data\n\n` +
        `What would you like to export?`,
        null,
        ['Export bookings', 'Export tutors', 'Export financials']
      );
    },
  },
};

// --- Persona Class ---

class OrganisationAdminPersona extends BasePersona {
  type: PersonaType = 'organisation';
  config = config;

  protected getHandledCategories(): IntentCategory[] {
    return ['progress', 'billing', 'support'];
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

// --- Export ---

export const OrganisationAdmin = withIntentHandlers(
  new OrganisationAdminPersona(),
  handlers
);

export const organisationAdmin = OrganisationAdmin;

export default OrganisationAdmin;
