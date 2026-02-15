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
  name: 'Organisation Admin',
  description: 'Expert assistance for organisation management and analytics',
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
  suggestedQueries: [
    "Show this month's analytics",
    "How many active tutors do we have?",
    "Generate a performance report",
    "What's our booking completion rate?",
    "View revenue breakdown",
  ],
};

// --- Intent Handlers ---

const handlers: IntentHandlerMap = {
  analytics: {
    overview: async function(this: OrganisationAdmin, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Getting analytics overview', ctx);

      const period = intent.entities?.period || 'month';

      const stats = await this.api.organisation.getStats(ctx, period);

      if (!stats) {
        return this.error('Unable to fetch analytics. Please try again.');
      }

      return this.success(
        `**Organisation Analytics (${period}):**\n\n` +
        `**Team:**\n` +
        `• Active Tutors: ${stats.activeTutors}\n` +
        `• Active Students: ${stats.activeStudents}\n\n` +
        `**Bookings:**\n` +
        `• Total Bookings: ${stats.totalBookings}\n` +
        `• Completed: ${stats.completedBookings} (${stats.completionRate}%)\n` +
        `• Cancelled: ${stats.cancelledBookings}\n\n` +
        `**Revenue:**\n` +
        `• Gross Revenue: £${stats.grossRevenue.toFixed(2)}\n` +
        `• Platform Fees: -£${stats.platformFees.toFixed(2)}\n` +
        `• Net Revenue: £${stats.netRevenue.toFixed(2)}\n\n` +
        `**Trends:**\n` +
        `• vs Last ${period}: ${stats.growthRate >= 0 ? '+' : ''}${stats.growthRate}%`,
        stats,
        ['View detailed report', 'Export data', 'Compare periods']
      );
    },

    tutors: async function(this: OrganisationAdmin, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Getting tutor analytics', ctx);

      const stats = await this.api.organisation.getTutorStats(ctx);

      if (!stats) {
        return this.error('Unable to fetch tutor analytics.');
      }

      let message = `**Tutor Performance:**\n\n`;
      message += `**Overview:**\n`;
      message += `• Total Tutors: ${stats.total}\n`;
      message += `• Active (last 30 days): ${stats.active}\n`;
      message += `• Average Rating: ⭐ ${stats.avgRating}/5\n\n`;

      message += `**Top Performers:**\n`;
      stats.topTutors.slice(0, 5).forEach((tutor, i) => {
        message += `${i + 1}. ${tutor.name} - ${tutor.completedLessons} lessons, ⭐ ${tutor.rating}\n`;
      });

      if (stats.needsAttention.length > 0) {
        message += `\n**Needs Attention:**\n`;
        stats.needsAttention.forEach(tutor => {
          message += `• ${tutor.name}: ${tutor.issue}\n`;
        });
      }

      return this.success(message, stats, ['View all tutors', 'Export report', 'Send reminders']);
    },

    revenue: async function(this: OrganisationAdmin, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Getting revenue analytics', ctx);

      const period = intent.entities?.period || 'month';
      const revenue = await this.api.organisation.getRevenue(ctx, period);

      if (!revenue) {
        return this.error('Unable to fetch revenue data.');
      }

      let message = `**Revenue Breakdown (${period}):**\n\n`;
      message += `**Total:**\n`;
      message += `• Gross: £${revenue.gross.toFixed(2)}\n`;
      message += `• Net: £${revenue.net.toFixed(2)}\n\n`;

      message += `**By Subject:**\n`;
      revenue.bySubject.forEach(item => {
        message += `• ${item.subject}: £${item.amount.toFixed(2)} (${item.percentage}%)\n`;
      });

      message += `\n**Trends:**\n`;
      message += `• Average lesson value: £${revenue.avgLessonValue.toFixed(2)}\n`;
      message += `• Growth: ${revenue.growth >= 0 ? '+' : ''}${revenue.growth}%\n`;

      return this.success(message, revenue, ['Export financial report', 'View by tutor', 'Compare periods']);
    },
  },

  manage: {
    tutors: async function(this: OrganisationAdmin, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
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

      const tutors = await this.api.organisation.getTutors(ctx);

      if (!tutors || tutors.length === 0) {
        return this.success(
          "Your organisation doesn't have any tutors yet.\n\n" +
          "Would you like to invite tutors to join?",
          null,
          ['Invite tutor', 'Share invite link']
        );
      }

      let message = `**Your Tutors (${tutors.length}):**\n\n`;
      tutors.slice(0, 10).forEach(tutor => {
        const status = tutor.isActive ? '🟢' : '⚪';
        message += `${status} **${tutor.name}** - ${tutor.subjects.join(', ')}\n`;
        message += `   ${tutor.bookingsThisMonth} bookings this month | ⭐ ${tutor.rating}\n`;
      });

      if (tutors.length > 10) {
        message += `\n... and ${tutors.length - 10} more`;
      }

      return this.success(message, tutors, ['View tutor details', 'Invite new tutor', 'Send announcement']);
    },

    students: async function(this: OrganisationAdmin, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Managing students', ctx);

      const students = await this.api.organisation.getStudents(ctx);

      if (!students || students.length === 0) {
        return this.success(
          "No students enrolled yet. Students are added when clients book lessons with your tutors.",
          null,
          ['View booking calendar', 'Marketing tips']
        );
      }

      let message = `**Enrolled Students (${students.length}):**\n\n`;
      students.slice(0, 10).forEach(student => {
        message += `• **${student.name}** - ${student.subjects.join(', ')}\n`;
        message += `  Tutor: ${student.tutorName} | ${student.lessonsCompleted} lessons\n`;
      });

      return this.success(message, students, ['View student details', 'Progress reports']);
    },
  },

  reports: {
    generate: async function(this: OrganisationAdmin, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Generating report', ctx);

      const reportType = intent.entities?.type || 'performance';

      return this.success(
        `**Generate ${reportType} Report:**\n\n` +
        `I can generate these reports:\n\n` +
        `1. **Performance Report**\n` +
        `   Tutor performance, completion rates, ratings\n\n` +
        `2. **Financial Report**\n` +
        `   Revenue, payouts, outstanding payments\n\n` +
        `3. **Student Progress Report**\n` +
        `   Learning outcomes, session summaries\n\n` +
        `4. **Activity Report**\n` +
        `   Bookings, cancellations, engagement\n\n` +
        `Which report would you like? I can export as PDF or CSV.`,
        null,
        ['Performance Report', 'Financial Report', 'Progress Report']
      );
    },

    export: async function(this: OrganisationAdmin, intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
      this.log('Exporting data', ctx);

      const format = intent.entities?.format || 'csv';

      return this.success(
        `**Data Export:**\n\n` +
        `I can export your data in ${format.toUpperCase()} format.\n\n` +
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
    return ['analytics', 'manage', 'reports', 'billing'];
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

// --- Export ---

export const OrganisationAdmin = withIntentHandlers(
  new OrganisationAdminPersona(),
  handlers
);

export const organisationAdmin = OrganisationAdmin;

export default OrganisationAdmin;
