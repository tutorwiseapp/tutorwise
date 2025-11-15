/**
 * Filename: apps/web/src/lib/services/caas/types.ts
 * Purpose: TypeScript type definitions for CaaS Engine (v5.5)
 * Created: 2025-11-15
 * Pattern: Type Safety (Service Layer - API Solution Design v5.1)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Profile data required for CaaS score calculation
 * Maps to profiles table in Supabase
 */
export interface CaaSProfile {
  id: string;
  roles: string[]; // Changed from 'role' to match actual schema (text[] array)
  identity_verified: boolean;
  dbs_verified: boolean | null;
  dbs_expiry: string | null;
  qualifications: string[] | null; // text[] array of qualifications (e.g., ['QTS', 'PGCE'])
  teaching_experience: number | null; // Years of experience
  degree_level: 'BACHELORS' | 'MASTERS' | 'PHD' | 'NONE' | null;
  created_at: string;
  bio_video_url: string | null; // v5.5: "Credibility Clip" URL
  bio: string | null; // Used by ClientCaaSStrategy
  avatar_url: string | null; // Used by ClientCaaSStrategy
}

/**
 * Performance statistics for tutors
 * Returned by get_performance_stats() RPC function
 */
export interface PerformanceStats {
  avg_rating: number; // 0-5, average of all review ratings
  completed_sessions: number; // Count of completed bookings
  retention_rate: number; // 0-1, percentage of clients who booked >1 time
  manual_session_log_rate: number; // 0-1, percentage of offline sessions logged
}

/**
 * Network statistics for tutors
 * Returned by get_network_stats() RPC function
 */
export interface NetworkStats {
  referral_count: number; // Count of outgoing AGENT_REFERRAL links
  connection_count: number; // Count of SOCIAL connections
  is_agent_referred: boolean; // Has an incoming AGENT_REFERRAL link (replaces deprecated is_partner_verified)
}

/**
 * Digital professionalism statistics for tutors
 * Returned by get_digital_stats() RPC function
 */
export interface DigitalStats {
  google_calendar_synced: boolean; // Has active Google Calendar integration
  google_classroom_synced: boolean; // Has active Google Classroom integration
  lessonspace_usage_rate: number; // 0-1, percentage of sessions using Lessonspace (have recording_url)
}

/**
 * CaaS score calculation result
 * Returned by all Strategy classes (TutorCaaSStrategy, ClientCaaSStrategy, etc.)
 */
export interface CaaSScoreData {
  total: number; // 0-100, the headline credibility score
  breakdown: {
    // Tutor breakdown (30/30/20/10/10 model)
    performance?: number; // Bucket 1: 0-30 points
    qualifications?: number; // Bucket 2: 0-30 points
    network?: number; // Bucket 3: 0-20 points
    safety?: number; // Bucket 4: 0-10 points
    digital?: number; // Bucket 5: 0-10 points

    // Client breakdown (future implementation)
    responsiveness?: number;
    payment_history?: number;
    engagement?: number;

    // Gate failure message (when score = 0 due to safety gate)
    gate?: string; // e.g., "Identity not verified" or "Profile not found"
  };
}

/**
 * CaaS score database record
 * Maps to caas_scores table in Supabase
 */
export interface CaaSScoreRecord {
  profile_id: string;
  total_score: number; // 0-100
  score_breakdown: Record<string, number | string>; // JSONB breakdown
  role_type: 'TUTOR' | 'CLIENT' | 'AGENT' | 'STUDENT';
  calculated_at: string; // ISO 8601 timestamp
  calculation_version: string; // e.g., "tutor-v5.5", "client-v1.0"
  created_at: string;
  updated_at: string;
}

/**
 * Default values for stats when RPC calls fail
 * Used for graceful degradation in TutorCaaSStrategy
 */
export const defaultPerformanceStats: PerformanceStats = {
  avg_rating: 0,
  completed_sessions: 0,
  retention_rate: 0,
  manual_session_log_rate: 0,
};

export const defaultNetworkStats: NetworkStats = {
  referral_count: 0,
  connection_count: 0,
  is_agent_referred: false,
};

export const defaultDigitalStats: DigitalStats = {
  google_calendar_synced: false,
  google_classroom_synced: false,
  lessonspace_usage_rate: 0,
};

/**
 * Strategy Pattern interface
 * All CaaS strategies (Tutor, Client, Agent) must implement this interface
 */
export interface ICaaSStrategy {
  /**
   * Calculate the CaaS score for a given user
   * @param userId - The profile_id to calculate score for
   * @param supabase - Supabase client instance (with service_role for RPC access)
   * @returns CaaSScoreData with total score and breakdown
   */
  calculate(userId: string, supabase: SupabaseClient): Promise<CaaSScoreData>;
}

/**
 * CaaS calculation version strings
 * Used for calculation_version column in caas_scores table
 */
export const CaaSVersions = {
  TUTOR: 'tutor-v5.5', // The finalized 5-bucket model
  CLIENT: 'client-v1.0', // Basic client scoring (future)
  AGENT: 'agent-v1.0', // Agent scoring (future)
  STUDENT: 'student-v1.0', // Student scoring (future)
} as const;

/**
 * Role type for CaaS scoring
 * Matches the profiles.roles text[] values
 */
export type CaaSRole = 'TUTOR' | 'CLIENT' | 'AGENT' | 'STUDENT';

/**
 * CaaS recalculation queue record
 * Maps to caas_recalculation_queue table
 */
export interface CaaSQueueRecord {
  id: number;
  profile_id: string;
  created_at: string;
}
