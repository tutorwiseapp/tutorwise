/**
 * Growth Agent — Tool Types
 *
 * OpenAI-compatible function-calling types for the Growth Agent.
 * Follows the same pattern as sage/tools/types.ts.
 *
 * @module lib/growth-agent/tools/types
 */

// --- Tool Definition ---

export interface GrowthTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

// --- Tool Call (from LLM) ---

export interface GrowthToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// --- Tool Result ---

export interface GrowthToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

// --- User Role ---

export type GrowthUserRole = 'tutor' | 'client' | 'agent' | 'organisation';

// --- Live User Metrics (hydrated from DB before tool execution) ---

export interface GrowthUserMetrics {
  userId?: string;
  role?: GrowthUserRole;
  // Tutoring activity
  totalSessions?: number;
  activeStudents: number;
  monthlyIncome: number; // in pence (e.g. 200000 = £2,000)
  hourlyRate: number;    // pence per hour
  // Listing
  hasListing: boolean;
  listingSubject?: string;
  listingLevel?: string;
  listingWordCount?: number;
  qualifications?: string[];
  // Referrals
  referralCount: number;   // total unique referral links clicked
  convertedReferrals: number;
  activeReferrals?: number;
  referralEarningsMonthly: number; // pence
  // AI Tutor
  hasAITutor: boolean;
  aiTutorSessionsMonthly?: number;
  aiTutorEarningsMonthly?: number; // pence
  // Organisation
  isOrganisation: boolean;
  orgMemberCount?: number;
  orgMonthlyMargin?: number; // pence
  // Employment
  isEmployedAsTeacher?: boolean;
  teacherSalary?: number; // annual, pence
  cashReservesMonths?: number;
  // Market
  market?: string; // 'uk' | 'us' | 'au' | 'hk' | 'sg' | 'uae' | 'eu'
}
