/**
 * Growth Agent — Core Orchestrator
 *
 * Manages sessions and message processing for the Growth Agent.
 * Role-adaptive: behaviour, system prompt, and tool access vary by active_role.
 *
 * Pattern mirrors sage/core/orchestrator.ts — called by GrowthPlatformAgent.
 *
 * @module growth/core/orchestrator
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { GROWTH_PERSONAS, GROWTH_GREETINGS, GROWTH_SUGGESTIONS } from '../personas';
import { GrowthToolExecutor } from '../tools/executor';
import { getToolsForRole } from '../tools/definitions';
import type { GrowthUserMetrics, GrowthUserRole } from '../tools/types';

// ============================================================================
// SESSION STORE (in-memory, same pattern as sage orchestrator)
// ============================================================================

interface GrowthSession {
  sessionId: string;
  userId: string;
  role: GrowthUserRole;
  metrics?: GrowthUserMetrics;
  startedAt: string;
  messageCount: number;
}

const activeSessions = new Map<string, GrowthSession>();

// ============================================================================
// ORCHESTRATOR
// ============================================================================

export class GrowthOrchestrator {
  private executor: GrowthToolExecutor;

  constructor() {
    this.executor = new GrowthToolExecutor();
  }

  // --- Session Management ---

  startSession(userId: string, role: GrowthUserRole): string {
    const sessionId = `growth-${userId}-${Date.now()}`;
    activeSessions.set(sessionId, {
      sessionId,
      userId,
      role,
      startedAt: new Date().toISOString(),
      messageCount: 0,
    });
    return sessionId;
  }

  getSession(sessionId: string): GrowthSession | undefined {
    return activeSessions.get(sessionId);
  }

  setSessionMetrics(sessionId: string, metrics: GrowthUserMetrics): void {
    const session = activeSessions.get(sessionId);
    if (session) {
      session.metrics = metrics;
      this.executor.initialize(metrics);
    }
  }

  endSession(sessionId: string): void {
    activeSessions.delete(sessionId);
  }

  // --- System Prompt ---

  buildSystemPrompt(role: GrowthUserRole, metrics?: GrowthUserMetrics): string {
    const base = GROWTH_PERSONAS[role];

    if (!metrics) return base;

    const metricsSection = `
## Live User Metrics (as of ${new Date().toLocaleDateString('en-GB')})
- Active students: ${metrics.activeStudents}
- Monthly income: £${Math.round(metrics.monthlyIncome / 100)}
- Hourly rate: £${Math.round(metrics.hourlyRate / 100)}/hr
- Has listing: ${metrics.hasListing ? 'Yes' : 'No'}${metrics.listingSubject ? ` (${metrics.listingSubject}, ${metrics.listingLevel})` : ''}
- Referrals sent: ${metrics.referralCount} (${metrics.convertedReferrals} converted)
- Monthly referral earnings: £${Math.round(metrics.referralEarningsMonthly / 100)}
- Has AI Tutor: ${metrics.hasAITutor ? 'Yes' : 'No'}${metrics.aiTutorEarningsMonthly ? ` (£${Math.round(metrics.aiTutorEarningsMonthly / 100)}/mo)` : ''}
- Is organisation: ${metrics.isOrganisation ? 'Yes' : 'No'}${metrics.orgMemberCount ? ` (${metrics.orgMemberCount} members)` : ''}
- Market: ${metrics.market ?? 'uk'}
${metrics.isEmployedAsTeacher ? `- Currently employed as teacher: Yes${metrics.teacherSalary ? ` (£${Math.round(metrics.teacherSalary / 100)}/yr)` : ''}` : ''}
${metrics.cashReservesMonths ? `- Cash reserves: ${metrics.cashReservesMonths} months` : ''}

Use these metrics to personalise every response. Do not ask for information you already have above.`;

    return `${base}\n${metricsSection}`;
  }

  // --- Greeting & Suggestions ---

  getGreeting(role: GrowthUserRole, firstName: string): string {
    return GROWTH_GREETINGS[role](firstName || 'there');
  }

  getSuggestions(role: GrowthUserRole): string[] {
    return GROWTH_SUGGESTIONS[role] ?? GROWTH_SUGGESTIONS.tutor;
  }

  getTools(role: GrowthUserRole) {
    return getToolsForRole(role);
  }

  // --- Tool Execution ---

  initializeTools(metrics: GrowthUserMetrics): void {
    this.executor.initialize(metrics);
  }

  async executeTool(name: string, args: Record<string, unknown>) {
    return this.executor.execute({
      id: `tool_${Date.now()}`,
      type: 'function',
      function: { name, arguments: JSON.stringify(args) },
    });
  }

  // --- Revenue Audit (free-tier entry point) ---

  async runRevenueAudit(metrics: GrowthUserMetrics): Promise<{
    incomeScore: number;
    listingScore: number;
    referralScore: number;
    missedMonthlyPotential: number;
    topOpportunities: string[];
    streamsUnlocked: string[];
    streamsAvailable: string[];
  }> {
    this.executor.initialize(metrics);

    const monthlyIncome = metrics.monthlyIncome / 100;
    const incomeScore = Math.min(Math.round((monthlyIncome / 4000) * 100), 100);

    const listingScore = metrics.hasListing
      ? (metrics.listingWordCount
          ? Math.min(Math.round((metrics.listingWordCount / 200) * 40) + 40, 100)
          : 55)
      : 0;

    const referralScore = metrics.referralCount === 0
      ? 0
      : Math.min(Math.round((metrics.convertedReferrals / metrics.referralCount) * 100), 100);

    const activeStreams: string[] = [];
    if (metrics.activeStudents > 0) activeStreams.push('active-tutoring');
    if (metrics.hasAITutor) activeStreams.push('ai-tutor-ownership');
    if (metrics.convertedReferrals > 0) activeStreams.push('referral-commission');
    if (metrics.isOrganisation) activeStreams.push('organisation-margin');

    const allStreams = ['active-tutoring', 'ai-tutor-ownership', 'referral-commission', 'organisation-margin'];
    const availableStreams = allStreams.filter(s => !activeStreams.includes(s));

    let missedPotential = 0;
    if (!activeStreams.includes('referral-commission')) missedPotential += 200;
    if (!activeStreams.includes('ai-tutor-ownership') && metrics.activeStudents >= 8) missedPotential += 300;
    if (!activeStreams.includes('organisation-margin') && metrics.activeStudents >= 15) missedPotential += 500;

    const opportunities: string[] = [];
    if (listingScore < 70) opportunities.push('Improve your listing — potential +£200/mo from more visibility');
    if (!activeStreams.includes('referral-commission')) opportunities.push('Activate referral links — earn 10% commission, zero extra work');
    if (!activeStreams.includes('ai-tutor-ownership') && metrics.activeStudents >= 8) {
      opportunities.push('Create an AI Tutor — your knowledge earns while you sleep');
    }
    if (monthlyIncome > 0 && monthlyIncome < 45 * 20) {
      opportunities.push(`You may be underpriced — market rate for your level could be £${Math.round(45 * 1.1)}-${Math.round(75 * 1.0)}/hr`);
    }

    return {
      incomeScore,
      listingScore,
      referralScore,
      missedMonthlyPotential: missedPotential,
      topOpportunities: opportunities.slice(0, 3),
      streamsUnlocked: activeStreams,
      streamsAvailable: availableStreams,
    };
  }
}

// Singleton
export const growthOrchestrator = new GrowthOrchestrator();
export default GrowthOrchestrator;
