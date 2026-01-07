/**
 * Filename: apps/web/src/lib/services/caas/index.ts
 * Purpose: Main CaaS Service - Dual-Path Strategy Pattern Router
 * Created: 2025-11-15
 * Updated: 2026-01-07 (Added Entity-Based Scoring)
 * Pattern: Service Layer + Strategy Pattern (API Solution Design v5.1)
 *
 * Architecture:
 * - PROFILE-based scoring: Tutor, Client, Agent, Student → caas_scores table
 * - ENTITY-based scoring: Organisation, Team, Group → entity's own table
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { TutorCaaSStrategy } from './strategies/tutor';
import { ClientCaaSStrategy } from './strategies/client';
import { AgentCaaSStrategy } from './strategies/agent';
import { OrganisationCaaSStrategy } from './strategies/organisation';
import type {
  CaaSScoreData,
  CaaSRole,
  CaaSProfile,
  IEntityCaaSStrategy,
  IProfileCaaSStrategy,
} from './types';
import { CaaSVersions } from './types';

/**
 * CaaSService
 * Main service for Credibility as a Service (CaaS) Engine
 *
 * This service implements a dual-path Strategy Pattern:
 * 1. PROFILE-based scoring (Tutor, Client, Agent, Student) → caas_scores table
 * 2. ENTITY-based scoring (Organisation, Team, Group) → entity's own table
 *
 * Architecture:
 * - Profile path: calculateProfileCaaS() → Strategy → caas_scores table
 * - Entity path: calculateEntityCaaS() → Strategy → entity's table
 * - Legacy path: calculate_caas() → Wrapper for backwards compatibility
 *
 * Usage:
 * - Called by POST /api/caas-worker (Pattern 2 - Internal Worker)
 * - Processes caas_recalculation_queue entries every 10 minutes
 * - Also callable directly for manual score calculation (e.g., backfill script)
 */
export class CaaSService {
  /**
   * Calculate CaaS score for an ENTITY (Organisation, Team, Group)
   *
   * Entity-based scoring path - for non-user entities.
   * Scores are stored in the entity's own table (e.g., connection_groups.caas_score).
   *
   * @param entityId - The entity ID to calculate score for
   * @param strategy - The entity CaaS strategy instance
   * @param supabase - Supabase client (MUST be service_role for RPC access and score writes)
   * @returns CaaSScoreData with total score and breakdown
   */
  static async calculateEntityCaaS<T extends IEntityCaaSStrategy>(
    entityId: string,
    strategy: T,
    supabase: SupabaseClient
  ): Promise<CaaSScoreData> {
    try {
      // ================================================================
      // STEP 1: CALCULATE SCORE USING STRATEGY
      // ================================================================
      const scoreData = await strategy.calculate(entityId, supabase);

      // ================================================================
      // STEP 2: SAVE SCORE TO ENTITY'S TABLE
      // ================================================================
      const { error: updateError } = await supabase
        .from(strategy.getStorageTable())
        .update({
          [strategy.getStorageColumn()]: scoreData.total,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entityId);

      if (updateError) {
        console.error(
          `[CaaS] Failed to save ${strategy.getEntityType()} score to database:`,
          updateError
        );
        throw new Error(
          `Failed to save ${strategy.getEntityType()} score: ${updateError.message}`
        );
      }

      console.log(
        `[CaaS] ${strategy.getEntityType()} score calculated and saved for ${entityId}: ${scoreData.total}/100`
      );

      return scoreData;
    } catch (error) {
      console.error(`[CaaS] Error calculating ${strategy.getEntityType()} score:`, error);
      throw error;
    }
  }

  /**
   * Convenience method for calculating Organisation CaaS scores
   *
   * @param organisationId - The connection_groups.id for the organisation
   * @param supabase - Supabase client (MUST be service_role for RPC access and score writes)
   * @returns CaaSScoreData with total score and breakdown
   */
  static async calculateOrganisationCaaS(
    organisationId: string,
    supabase: SupabaseClient
  ): Promise<CaaSScoreData> {
    const strategy = new OrganisationCaaSStrategy();
    return this.calculateEntityCaaS(organisationId, strategy, supabase);
  }

  /**
   * Calculate CaaS score for a PROFILE (Tutor, Client, Agent, Student)
   *
   * Profile-based scoring path - for user profiles.
   * Scores are stored in the caas_scores table.
   *
   * This is the main entry point for profile-based CaaS score calculations.
   * It selects the appropriate scoring strategy based on the user's role
   * and saves the result to the caas_scores table.
   *
   * @param profileId - The profile_id to calculate score for
   * @param supabase - Supabase client (MUST be service_role for RPC access and score writes)
   * @returns CaaSScoreData with total score and breakdown
   */
  static async calculateProfileCaaS(
    profileId: string,
    supabase: SupabaseClient
  ): Promise<CaaSScoreData> {
    try {
      // ================================================================
      // STEP 1: FETCH PROFILE AND DETERMINE ROLE
      // ================================================================
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, roles')
        .eq('id', profileId)
        .single<CaaSProfile>();

      if (profileError) {
        throw new Error(`Failed to fetch profile: ${profileError.message}`);
      }

      if (!profile) {
        throw new Error('Profile not found');
      }

      // Handle profiles with null or empty roles array
      if (!profile.roles || profile.roles.length === 0) {
        console.warn(`[CaaS] Profile ${profileId} has no roles - returning 0 score`);
        return { total: 0, breakdown: { gate: 'No roles assigned' } };
      }

      // Determine primary role for scoring
      // Priority order: TUTOR > CLIENT > AGENT > STUDENT
      // (Most users only have one role, but if they have multiple, prioritize TUTOR)
      let primaryRole: CaaSRole;
      let version: string;

      // Convert roles to uppercase for comparison (database stores lowercase)
      const upperRoles = profile.roles.map((r) => r.toUpperCase());

      if (upperRoles.includes('TUTOR')) {
        primaryRole = 'TUTOR';
        version = CaaSVersions.TUTOR;
      } else if (upperRoles.includes('CLIENT')) {
        primaryRole = 'CLIENT';
        version = CaaSVersions.CLIENT;
      } else if (upperRoles.includes('AGENT')) {
        primaryRole = 'AGENT';
        version = CaaSVersions.AGENT;
      } else if (upperRoles.includes('STUDENT')) {
        primaryRole = 'STUDENT';
        version = CaaSVersions.STUDENT;
      } else {
        // User has no scoreable role - return 0 score
        console.warn(`[CaaS] Profile ${profileId} has no scoreable role:`, profile.roles);
        return { total: 0, breakdown: { gate: 'No scoreable role' } };
      }

      // ================================================================
      // STEP 2: SELECT STRATEGY AND CALCULATE SCORE
      // ================================================================
      let scoreData: CaaSScoreData;

      switch (primaryRole) {
        case 'TUTOR':
          const tutorStrategy = new TutorCaaSStrategy();
          scoreData = await tutorStrategy.calculate(profileId, supabase);
          break;

        case 'CLIENT':
          const clientStrategy = new ClientCaaSStrategy();
          scoreData = await clientStrategy.calculate(profileId, supabase);
          break;

        case 'AGENT':
          const agentStrategy = new AgentCaaSStrategy();
          scoreData = await agentStrategy.calculate(profileId, supabase);
          break;

        case 'STUDENT':
          // Student scoring not yet implemented - return default score
          console.warn(`[CaaS] Student scoring not yet implemented for ${profileId}`);
          scoreData = { total: 0, breakdown: { gate: 'Student scoring not implemented' } };
          break;

        default:
          // This should never happen due to the check above, but TypeScript needs it
          scoreData = { total: 0, breakdown: { gate: 'Unknown role' } };
      }

      // ================================================================
      // STEP 3: SAVE SCORE TO DATABASE (UPSERT)
      // ================================================================
      const { error: upsertError } = await supabase.from('caas_scores').upsert(
        {
          profile_id: profileId,
          role_type: primaryRole,
          total_score: scoreData.total,
          score_breakdown: scoreData.breakdown,
          calculation_version: version,
          calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'profile_id', // Update existing record if profile already has a score
        }
      );

      if (upsertError) {
        console.error('[CaaS] Failed to save score to database:', upsertError);
        throw new Error(`Failed to save score: ${upsertError.message}`);
      }

      console.log(
        `[CaaS] Score calculated and saved for ${primaryRole} ${profileId}: ${scoreData.total}/100`
      );

      return scoreData;
    } catch (error) {
      console.error('[CaaS] Error calculating score for profile', profileId, error);
      throw error;
    }
  }

  /**
   * Get cached CaaS score for a profile
   *
   * This is a simple read operation to fetch the pre-calculated score
   * from the caas_scores table. Used by the frontend to display scores.
   *
   * @param profileId - The profile_id to get score for
   * @param supabase - Supabase client (can be user session or service_role)
   * @returns CaaSScoreData with total score and breakdown, or null if not calculated
   */
  static async getScore(
    profileId: string,
    supabase: SupabaseClient
  ): Promise<CaaSScoreData | null> {
    try {
      const { data, error } = await supabase
        .from('caas_scores')
        .select('total_score, score_breakdown')
        .eq('profile_id', profileId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No score found - return null
          return null;
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        total: data.total_score,
        breakdown: data.score_breakdown as Record<string, number | string>,
      };
    } catch (error) {
      console.error('[CaaS] Error fetching score for profile', profileId, error);
      throw error;
    }
  }

  /**
   * Legacy method for backwards compatibility
   *
   * @deprecated Use calculateOrganisationCaaS() instead
   * @param organisationId - The connection_groups.id for the organisation
   * @param supabase - Supabase client (MUST be service_role for RPC access and score writes)
   * @returns CaaSScoreData with total score and breakdown
   */
  static async calculate_organisation_caas(
    organisationId: string,
    supabase: SupabaseClient
  ): Promise<CaaSScoreData> {
    return this.calculateOrganisationCaaS(organisationId, supabase);
  }

  /**
   * Legacy method for backwards compatibility
   *
   * @deprecated Use calculateProfileCaaS() instead for profile-based scoring
   * @param profileId - The profile_id to calculate score for
   * @param supabase - Supabase client (MUST be service_role for RPC access and score writes)
   * @returns CaaSScoreData with total score and breakdown
   */
  static async calculate_caas(
    profileId: string,
    supabase: SupabaseClient
  ): Promise<CaaSScoreData> {
    return this.calculateProfileCaaS(profileId, supabase);
  }

  /**
   * Queue a profile for CaaS score recalculation
   *
   * Adds the profile to the caas_recalculation_queue.
   * The score will be recalculated by the caas-worker within 10 minutes.
   *
   * @param profileId - The profile_id to queue for recalculation
   * @param supabase - Supabase client (can be user session or service_role)
   */
  static async queueRecalculation(profileId: string, supabase: SupabaseClient): Promise<void> {
    try {
      const { error } = await supabase
        .from('caas_recalculation_queue')
        .insert({ profile_id: profileId })
        .select();

      // Ignore conflict errors (profile already in queue)
      if (error && error.code !== '23505') {
        throw error;
      }

      console.log(`[CaaS] Profile ${profileId} queued for recalculation`);
    } catch (error) {
      console.error('[CaaS] Error queuing profile for recalculation', profileId, error);
      throw error;
    }
  }
}
