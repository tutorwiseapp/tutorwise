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
  dbs_expiry_date: string | null; // Fixed: actual column name is dbs_expiry_date
  qualifications: any | null; // JSONB from role_details (education, certifications, etc.)
  teaching_experience: any | null; // JSONB from role_details
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
  completed_sessions: number; // Count of completed bookings (paid sessions only)
  retention_rate: number; // 0-1, percentage of clients who booked >1 time
  manual_session_log_rate: number; // 0-1, percentage of offline sessions logged
  completed_free_sessions_count: number; // v5.9: Count of completed free help sessions
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

    // Allow any additional properties for strategy-specific breakdowns
    [key: string]: number | string | boolean | Record<string, any> | undefined;
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
  role_type: 'TUTOR' | 'CLIENT' | 'AGENT' | 'STUDENT' | 'ORGANISATION';
  calculated_at: string; // ISO 8601 timestamp
  calculation_version: string; // e.g., "tutor-v5.5", "client-v1.0", "agent-v1.0", "organisation-v1.0"
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
  completed_free_sessions_count: 0,
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
 * Strategy Pattern interface for PROFILE-based CaaS scoring
 *
 * Profile-based strategies calculate scores for users (Tutor, Client, Agent, Student).
 * Scores are stored in the caas_scores table.
 *
 * Examples: TutorCaaSStrategy, ClientCaaSStrategy, AgentCaaSStrategy
 */
export interface IProfileCaaSStrategy {
  /**
   * Calculate the CaaS score for a given user profile
   * @param userId - The profile_id to calculate score for
   * @param supabase - Supabase client instance (with service_role for RPC access)
   * @returns CaaSScoreData with total score and breakdown
   */
  calculate(userId: string, supabase: SupabaseClient): Promise<CaaSScoreData>;
}

/**
 * Strategy Pattern interface for ENTITY-based CaaS scoring
 *
 * Entity-based strategies calculate scores for non-user entities (Organisation, Team, Group).
 * Scores are stored in the entity's own table (e.g., connection_groups.caas_score).
 *
 * Example: OrganisationCaaSStrategy
 *
 * @template TEntity - The entity type string (e.g., 'organisation', 'team', 'group')
 */
export interface IEntityCaaSStrategy<TEntity extends string = string> {
  /**
   * Calculate the CaaS score for a given entity
   * @param entityId - The entity ID to calculate score for (e.g., organisation_id, team_id)
   * @param supabase - Supabase client instance (with service_role for RPC access)
   * @returns CaaSScoreData with total score and breakdown
   */
  calculate(entityId: string, supabase: SupabaseClient): Promise<CaaSScoreData>;

  /**
   * Get the entity type this strategy scores
   * @returns Entity type string (e.g., 'organisation', 'team', 'group')
   */
  getEntityType(): TEntity;

  /**
   * Get the table where scores are stored
   * @returns Table name (e.g., 'connection_groups', 'teams')
   */
  getStorageTable(): string;

  /**
   * Get the column name where scores are stored
   * @returns Column name (e.g., 'caas_score', 'credibility_score')
   */
  getStorageColumn(): string;
}

/**
 * Legacy interface alias for backwards compatibility
 * @deprecated Use IProfileCaaSStrategy instead for profile-based strategies
 */
export interface ICaaSStrategy extends IProfileCaaSStrategy {
  /**
   * @deprecated Use IProfileCaaSStrategy.calculate instead
   */
  calculate(userId: string, supabase: SupabaseClient): Promise<CaaSScoreData>;
}

/**
 * CaaS calculation version strings
 * Used for calculation_version column in caas_scores table
 */
export const CaaSVersions = {
  TUTOR: 'tutor-v5.5', // The finalized 5-bucket model (v5.9 updated)
  CLIENT: 'client-v1.0', // 3-bucket client scoring model
  AGENT: 'agent-v1.0', // 4-bucket agent scoring model (subscription-incentive based)
  ORGANISATION: 'organisation-v1.0', // Weighted team average organisation scoring
  STUDENT: 'student-v1.0', // Student scoring (future)
} as const;

/**
 * Role type for CaaS scoring
 * Matches the profiles.roles text[] values and connection_groups for organisations
 */
export type CaaSRole = 'TUTOR' | 'CLIENT' | 'AGENT' | 'STUDENT' | 'ORGANISATION';

/**
 * CaaS recalculation queue record
 * Maps to caas_recalculation_queue table
 */
export interface CaaSQueueRecord {
  id: number;
  profile_id: string;
  created_at: string;
}
