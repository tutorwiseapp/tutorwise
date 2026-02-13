/**
 * Organisation Persona
 *
 * Lexi persona for organisation admins - provides a formal, efficient
 * assistant for managing tutoring platforms at scale.
 *
 * @module lexi/personas/organisation
 */

import type { AgentContext } from '../../../cas/packages/core/src/context';
import type {
  PersonaConfig,
  DetectedIntent,
  ActionResult,
  IntentCategory,
} from '../../types';
import { BasePersona } from '../base-persona';

// --- Organisation Persona Config ---

const ORG_CONFIG: PersonaConfig = {
  type: 'organisation',
  displayName: 'Lexi (Organisation Admin)',
  capabilities: [
    'tutor_management',
    'student_management',
    'analytics_dashboard',
    'billing_overview',
    'settings_management',
    'compliance_reporting',
    'user_administration',
    'platform_configuration',
  ],
  defaultGreeting: "Hello {name}. I'm Lexi, your organisation management assistant. How can I help you today?",
  tone: 'formal',
};

// --- Organisation Persona Class ---

class OrganisationPersonaImpl extends BasePersona {
  type = 'organisation' as const;
  config = ORG_CONFIG;

  protected getHandledCategories(): IntentCategory[] {
    return ['progress', 'billing', 'support', 'general'];
  }

  async handleIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    this.log('handleIntent', ctx, { category: intent.category, action: intent.action });

    switch (intent.category) {
      case 'progress':
        return this.handleAnalyticsIntent(intent, ctx);
      case 'billing':
        return this.handleBillingIntent(intent, ctx);
      case 'support':
        return this.handleSupportIntent(intent, ctx);
      default:
        return this.handleGeneralIntent(intent, ctx);
    }
  }

  async getSuggestedActions(ctx: AgentContext): Promise<string[]> {
    return [
      'View organisation dashboard',
      'Manage tutors',
      'View analytics',
      'Billing overview',
    ];
  }

  // --- Intent Handlers ---

  private async handleAnalyticsIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    const analyticsResult = await this.api.progress.getOrgAnalytics(ctx, 'month');

    if (analyticsResult.success && analyticsResult.analytics) {
      const a = analyticsResult.analytics;
      const growth = a.revenue.growth >= 0 ? `+${(a.revenue.growth * 100).toFixed(1)}%` : `${(a.revenue.growth * 100).toFixed(1)}%`;

      return this.success(
        `Organisation Overview (This Month):\n` +
        `• ${a.activeTutors} active tutors, ${a.activeStudents} active students\n` +
        `• ${a.completedLessons} lessons completed\n` +
        `• Revenue: $${a.revenue.total.toLocaleString()} (${growth} vs last month)\n` +
        `• Average rating: ${a.averageRating.toFixed(1)}⭐`,
        a,
        ['View detailed report', 'Export analytics', 'See tutor performance', 'View alerts']
      );
    }
    return this.error("Couldn't load organisation analytics right now.");
  }

  private async handleBillingIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "Organisation billing overview. What would you like to review?",
      null,
      ['View revenue breakdown', 'Pending payouts', 'Subscription status', 'Download invoices']
    );
  }

  private async handleSupportIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    return this.success(
      "Organisation support. What do you need assistance with?",
      null,
      ['Platform configuration', 'User management', 'Integration help', 'Contact account manager']
    );
  }

  private async handleGeneralIntent(intent: DetectedIntent, ctx: AgentContext): Promise<ActionResult> {
    // Show quick dashboard stats
    const analyticsResult = await this.api.progress.getOrgAnalytics(ctx, 'month');

    if (analyticsResult.success && analyticsResult.analytics) {
      const a = analyticsResult.analytics;
      const alerts = a.alerts?.filter(alert => !alert.acknowledged) || [];

      let message = `Welcome to your organisation dashboard.`;
      if (alerts.length > 0) {
        message += ` You have ${alerts.length} unread alert${alerts.length > 1 ? 's' : ''}.`;
      }

      return this.success(
        message,
        { quickStats: { tutors: a.activeTutors, students: a.activeStudents, lessons: a.completedLessons }, alerts },
        ['View full dashboard', 'Manage users', 'View analytics', 'Check alerts']
      );
    }

    return this.success(
      "Welcome to your organisation dashboard. How can I assist you?",
      null,
      await this.getSuggestedActions(ctx)
    );
  }
}

// --- Export ---

export const OrganisationPersona = new OrganisationPersonaImpl();

export default OrganisationPersona;
