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
import { UniversalCaaSStrategy } from './strategies/universal';
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
 * Main service for Credibility as a Service (CaaS) Engine v6.0
 *
 * This service implements a dual-path Strategy Pattern:
 * 1. PROFILE-based scoring (Tutor, Client, Agent, Student) → caas_scores table
 * 2. ENTITY-based scoring (Organisation, Team, Group) → entity's own table
 *
 * Architecture:
 * - Profile path: calculateProfileCaaS() → UniversalCaaSStrategy → caas_scores table
 * - Entity path: calculateEntityCaaS() → OrganisationCaaSStrategy → entity's table
 * - Legacy path: calculate_caas() → Wrapper for backwards compatibility
 *
 * v6.0 Universal Model:
 * - Single 6-bucket model for all roles (Tutor, Client, Agent)
 * - No hard ceilings - weighted bucket normalization
 * - Provisional scoring (no more 0/100 after onboarding)
 * - Verification multipliers (0.70 → 0.85 → 1.00)
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

      // ================================================================
      // STEP 2: FETCH FULL PROFILE DATA FOR UNIVERSAL STRATEGY
      // ================================================================
      const { data: fullProfile, error: fullProfileError } = await supabase
        .from('profiles')
        .select(`
          id,
          roles,
          identity_verified,
          email_verified,
          phone_verified,
          background_check_completed,
          onboarding_progress,
          bio,
          avatar_url,
          location,
          average_rating,
          qualifications
        `)
        .eq('id', profileId)
        .single();

      if (fullProfileError || !fullProfile) {
        throw new Error(`Failed to fetch full profile: ${fullProfileError?.message || 'Not found'}`);
      }

      // ================================================================
      // STEP 3: CALCULATE SCORE USING UNIVERSAL STRATEGY
      // ================================================================
      const universalStrategy = new UniversalCaaSStrategy();
      const scoreData = await universalStrategy.calculateFromProfile(fullProfile as any, supabase);

      // Determine primary role for logging and database record
      const upperRoles = profile.roles.map((r) => r.toUpperCase());
      let primaryRole: CaaSRole;

      if (upperRoles.includes('TUTOR')) {
        primaryRole = 'TUTOR';
      } else if (upperRoles.includes('CLIENT')) {
        primaryRole = 'CLIENT';
      } else if (upperRoles.includes('AGENT')) {
        primaryRole = 'AGENT';
      } else if (upperRoles.includes('STUDENT')) {
        primaryRole = 'STUDENT';
      } else {
        console.warn(`[CaaS] Profile ${profileId} has no scoreable role:`, profile.roles);
        return { total: 0, breakdown: { gate: 'No scoreable role' } };
      }

      const version = CaaSVersions.UNIVERSAL;
      console.log(`[CaaS] Universal Model v6.0 calculated ${scoreData.total}/100 for ${primaryRole} ${profileId}`);

      // ================================================================
      // STEP 4: SAVE SCORE TO DATABASE (UPSERT)
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

}
