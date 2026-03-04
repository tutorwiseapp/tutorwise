/**
 * Growth Agent — Tool Definitions
 *
 * OpenAI-compatible function schemas for the Growth Agent's 8 tools.
 * These tools give the agent access to structured knowledge from the
 * skill files and live user metrics from the database.
 *
 * Tool categories:
 *   Read-only Analysis (7): audit_profile, benchmark_pricing,
 *     discover_income_streams, plan_referral_strategy,
 *     assess_full_time_jump, get_business_setup_guide, forecast_revenue
 *   Action (1): set_growth_goal
 *
 * Role access:
 *   tutor      → all 8 tools
 *   agent      → all 8 tools
 *   organisation → all 8 tools
 *   client     → discover_income_streams, plan_referral_strategy, forecast_revenue, set_growth_goal
 *
 * @module lib/growth-agent/tools/definitions
 */

import type { GrowthTool, GrowthUserRole } from './types';

// ============================================================================
// ANALYSIS TOOLS
// ============================================================================

export const auditProfile: GrowthTool = {
  type: 'function',
  function: {
    name: 'audit_profile',
    description: `Score a tutor's profile and listing quality against UK/international benchmarks.
Returns a listing score (0-100), specific improvement recommendations, SEO keyword suggestions,
and a qualifications assessment. Identifies the top 3 quick wins to improve visibility.`,
    parameters: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Primary teaching subject (e.g. "Maths", "English", "Chemistry")',
        },
        level: {
          type: 'string',
          description: 'Highest level taught',
          enum: ['Primary', 'KS3', 'GCSE', 'A-Level', 'University', 'Adult'],
        },
        market: {
          type: 'string',
          description: 'Market region',
          enum: ['uk', 'us', 'au', 'hk', 'sg', 'uae', 'eu'],
        },
        currentRate: {
          type: 'number',
          description: 'Current hourly rate in local currency (e.g. 45 for £45/hr)',
        },
        listingWordCount: {
          type: 'number',
          description: 'Word count of the profile description (optional)',
        },
        qualifications: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of qualifications mentioned on the profile (e.g. ["QTS", "PGCE", "BSc Maths"])',
        },
        hasProfilePhoto: {
          type: 'boolean',
          description: 'Whether the profile has a photo',
        },
        hasFirstLessonOffer: {
          type: 'boolean',
          description: 'Whether the listing offers a free or discounted first lesson',
        },
      },
      required: ['subject', 'level'],
    },
  },
};

export const benchmarkPricing: GrowthTool = {
  type: 'function',
  function: {
    name: 'benchmark_pricing',
    description: `Compare a tutor's current hourly rate against market benchmarks for their subject,
level, and region. Returns: current vs typical vs premium rate, underpricing/overpricing assessment,
recommended rate adjustment, and the revenue impact of a £5-10 rate increase.`,
    parameters: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Teaching subject',
        },
        level: {
          type: 'string',
          description: 'Education level',
          enum: ['Primary', 'KS3', 'GCSE', 'A-Level', 'University', 'Adult'],
        },
        market: {
          type: 'string',
          description: 'Market region',
          enum: ['uk', 'us', 'au', 'hk', 'sg', 'uae', 'eu'],
        },
        currentRate: {
          type: 'number',
          description: 'Current hourly rate in local currency',
        },
        yearsExperience: {
          type: 'number',
          description: 'Years of tutoring experience (0-20+)',
        },
        isLondon: {
          type: 'boolean',
          description: 'Whether tutoring in London (applies London premium)',
        },
      },
      required: ['subject', 'level'],
    },
  },
};

export const discoverIncomeStreams: GrowthTool = {
  type: 'function',
  function: {
    name: 'discover_income_streams',
    description: `Identify which of the 4 Tutorwise income streams the user is not yet earning from.
Returns: currently active streams, unlocked but unused streams, locked streams with unlock steps,
estimated monthly earnings potential for each unlockable stream, and a recommended unlock order.

The 4 streams: (1) Active tutoring, (2) AI Tutor ownership, (3) Referral commission, (4) Organisation margin.
Any user (tutor, client, agent, organisation) can access all 4 streams.`,
    parameters: {
      type: 'object',
      properties: {
        activeStreams: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['active-tutoring', 'ai-tutor-ownership', 'referral-commission', 'organisation-margin'],
          },
          description: 'Income streams the user is currently earning from',
        },
        studentCount: {
          type: 'number',
          description: 'Current number of active students (relevant for AI tutor unlock threshold)',
        },
        monthlyIncome: {
          type: 'number',
          description: 'Current monthly tutoring income in £',
        },
        userRole: {
          type: 'string',
          enum: ['tutor', 'client', 'agent', 'organisation'],
          description: 'The user\'s primary role on the platform',
        },
      },
      required: ['activeStreams'],
    },
  },
};

export const planReferralStrategy: GrowthTool = {
  type: 'function',
  function: {
    name: 'plan_referral_strategy',
    description: `Return a personalised referral strategy based on the user's current referral pipeline.
Includes: top 3 recommended channels for their situation, ready-to-use outreach message templates,
seasonal timing advice (what month it is → what action to take now), and the referral pipeline benchmarks
(how many clicks → sign-ups → conversions to expect).`,
    parameters: {
      type: 'object',
      properties: {
        referralCount: {
          type: 'number',
          description: 'Total referrals the user has sent so far',
        },
        convertedReferrals: {
          type: 'number',
          description: 'Number of referrals that converted to paying bookings',
        },
        userType: {
          type: 'string',
          enum: ['tutor', 'client', 'agent', 'organisation'],
          description: 'User type affects which channels and templates are most relevant',
        },
        focus: {
          type: 'string',
          enum: ['channels', 'templates', 'calendar', 'pipeline', 'delegation'],
          description: 'What aspect of the referral strategy to focus on',
        },
        currentMonth: {
          type: 'number',
          description: 'Current month (1-12) for seasonal timing advice',
        },
      },
      required: ['userType'],
    },
  },
};

export const assessFullTimeJump: GrowthTool = {
  type: 'function',
  function: {
    name: 'assess_full_time_jump',
    description: `Assess whether a tutor is financially and operationally ready to leave employment
and tutor full-time. Returns: readiness score (0-100), which of the 7 criteria are met/unmet,
financial comparison (current teacher salary vs projected tutoring income), specific milestones to hit
before making the jump, and the optimal timing window (e.g. "give notice in June, start September").

Based on UK STPCD teacher pay scales, Teachers' Pension Scheme, HMRC self-assessment requirements.`,
    parameters: {
      type: 'object',
      properties: {
        monthlyTutoringIncome: {
          type: 'number',
          description: 'Current monthly tutoring income in £',
        },
        activeStudents: {
          type: 'number',
          description: 'Number of current active students',
        },
        teacherPayScale: {
          type: 'string',
          enum: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'UPS1', 'UPS2', 'UPS3', 'not_applicable'],
          description: 'Current teacher pay scale (M1-UPS3 or not_applicable if not a teacher)',
        },
        cashReservesMonths: {
          type: 'number',
          description: 'Months of living expenses saved as a cash reserve',
        },
        hasWaitingList: {
          type: 'boolean',
          description: 'Whether the tutor currently has a waiting list of students',
        },
        isLondon: {
          type: 'boolean',
          description: 'Whether based in London (affects salary benchmarks and rate potential)',
        },
        hasTLR: {
          type: 'boolean',
          description: 'Whether the teacher has a TLR (Teaching and Learning Responsibility) allowance',
        },
        contractType: {
          type: 'string',
          enum: ['full_time', 'part_time_0.8', 'part_time_0.6', 'supply', 'not_applicable'],
          description: 'Current employment contract type',
        },
      },
      required: ['monthlyTutoringIncome', 'activeStudents'],
    },
  },
};

export const getBusinessSetupGuide: GrowthTool = {
  type: 'function',
  function: {
    name: 'get_business_setup_guide',
    description: `Provide practical, UK-primary guidance on business registration, tax obligations,
terms and conditions, compliance, and career decisions for tutors.

Topics covered:
- sole_trader: HMRC registration steps, Trading Allowance, Self Assessment, allowable expenses
- limited_company: Companies House registration, Corp Tax, director salary vs dividends, accountant costs
- tax: Income Tax bands, NI (Class 2/4), VAT (£90k threshold, possible VATA exemption), Payments on Account, MTD
- tc: What to include in T&Cs (cancellation policy, GDPR, safeguarding, payment terms)
- compliance: DBS check, ICO registration, professional insurance (PI + PL), WWCC for international
- career_decision: Should I leave teaching, notice periods, Teachers' Pension Scheme implications`,
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['sole_trader', 'limited_company', 'tax', 'tc', 'compliance', 'career_decision', 'insurance'],
          description: 'The specific topic to get guidance on',
        },
        country: {
          type: 'string',
          enum: ['uk', 'us', 'au', 'other'],
          description: 'Country context (default: uk)',
        },
        annualIncome: {
          type: 'number',
          description: 'Expected annual tutoring income in £ (relevant for sole trader vs Ltd comparison)',
        },
        specificQuestion: {
          type: 'string',
          description: 'The user\'s specific question or concern (e.g. "Can I tutor while still employed as a teacher?")',
        },
      },
      required: ['topic'],
    },
  },
};

export const forecastRevenue: GrowthTool = {
  type: 'function',
  function: {
    name: 'forecast_revenue',
    description: `Project monthly income for the next 12 months based on current metrics, seasonal demand
patterns, and selected income stream mix. Returns month-by-month forecast, peak months to prepare for,
trough months to build reserves, and specific actions to take each quarter to maintain income.`,
    parameters: {
      type: 'object',
      properties: {
        currentMonthlyIncome: {
          type: 'number',
          description: 'Current total monthly income in £ across all streams',
        },
        streamMix: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['active-tutoring', 'ai-tutor-ownership', 'referral-commission', 'organisation-margin'],
          },
          description: 'Which income streams are active (affects seasonal volatility)',
        },
        currentMonth: {
          type: 'number',
          description: 'Current month (1-12) as forecast start point',
        },
        growthGoal: {
          type: 'number',
          description: 'Target monthly income in £ (optional — shows progress trajectory)',
        },
        includeSeasonalTips: {
          type: 'boolean',
          description: 'Include month-by-month action tips to maintain income through slow periods',
        },
      },
      required: ['currentMonthlyIncome', 'streamMix'],
    },
  },
};

// ============================================================================
// ACTION TOOL
// ============================================================================

export const setGrowthGoal: GrowthTool = {
  type: 'function',
  function: {
    name: 'set_growth_goal',
    description: `Save a growth goal for the user. The agent will reference this goal in future sessions
to track progress and adjust advice accordingly. Goal is stored with a target income and deadline.`,
    parameters: {
      type: 'object',
      properties: {
        goalType: {
          type: 'string',
          enum: [
            'reach_monthly_income',
            'go_full_time',
            'set_up_business',
            'unlock_ai_tutor',
            'unlock_referral',
            'unlock_organisation',
            'improve_listing',
            'raise_rate',
          ],
          description: 'The type of growth goal',
        },
        targetMonthlyIncome: {
          type: 'number',
          description: 'Target monthly income in £ (for income goals)',
        },
        targetDate: {
          type: 'string',
          description: 'Target completion date in ISO format (e.g. "2026-09-01")',
        },
        notes: {
          type: 'string',
          description: 'Optional notes or context about this goal',
        },
      },
      required: ['goalType'],
    },
  },
};

// ============================================================================
// TOOL COLLECTIONS BY ROLE
// ============================================================================

export const TOOLS_BY_ROLE: Record<GrowthUserRole, GrowthTool[]> = {
  tutor: [
    auditProfile,
    benchmarkPricing,
    discoverIncomeStreams,
    planReferralStrategy,
    assessFullTimeJump,
    getBusinessSetupGuide,
    forecastRevenue,
    setGrowthGoal,
  ],
  agent: [
    auditProfile,
    benchmarkPricing,
    discoverIncomeStreams,
    planReferralStrategy,
    assessFullTimeJump,
    getBusinessSetupGuide,
    forecastRevenue,
    setGrowthGoal,
  ],
  organisation: [
    auditProfile,
    benchmarkPricing,
    discoverIncomeStreams,
    planReferralStrategy,
    assessFullTimeJump,
    getBusinessSetupGuide,
    forecastRevenue,
    setGrowthGoal,
  ],
  // Clients: learning + passive income focus, no profile audit or business setup
  client: [
    discoverIncomeStreams,
    planReferralStrategy,
    forecastRevenue,
    setGrowthGoal,
  ],
};

export const ALL_GROWTH_TOOLS: GrowthTool[] = [
  auditProfile,
  benchmarkPricing,
  discoverIncomeStreams,
  planReferralStrategy,
  assessFullTimeJump,
  getBusinessSetupGuide,
  forecastRevenue,
  setGrowthGoal,
];

/**
 * Get the tools available for a specific user role.
 */
export function getToolsForRole(role: GrowthUserRole): GrowthTool[] {
  return TOOLS_BY_ROLE[role] ?? TOOLS_BY_ROLE.client;
}

/**
 * Look up a tool by its function name.
 */
export function getToolByName(name: string): GrowthTool | undefined {
  return ALL_GROWTH_TOOLS.find(t => t.function.name === name);
}
