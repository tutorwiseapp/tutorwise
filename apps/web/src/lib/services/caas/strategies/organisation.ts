/**
 * Filename: apps/web/src/lib/services/caas/strategies/organisation.ts
 * Purpose: Organisation CaaS Scoring Strategy (Entity-Based)
 * Created: 2026-01-07
 * Reference: Agent CaaS Subscription Incentive Model (Organisation Scoring)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { IEntityCaaSStrategy, CaaSScoreData } from '../types';

/**
 * OrganisationCaaSStrategy
 *
 * Entity-based CaaS scoring strategy for organisations (connection_groups with type='organisation').
 *
 * IMPORTANT: This is an ENTITY-based strategy, not a profile-based strategy.
 * - Organisations are stored in connection_groups table, NOT profiles table
 * - Scores are stored in connection_groups.caas_score, NOT caas_scores table
 * - Called via CaaSService.calculateOrganisationCaaS(orgId), NOT calculateProfileCaaS(userId)
 *
 * Scoring Model:
 * - Base Score: Weighted team average CaaS score (activity-weighted by sessions in last 90 days)
 * - Verification Bonuses: business_verified (+2), safeguarding_certified (+2),
 *   professional_insurance (+1), association_member (+1)
 * - Minimum Requirements: 3 active members required for valid score
 *
 * This score represents organisation credibility and is independent from Agent CaaS.
 * An agent who owns an organisation has TWO separate scores:
 * - Their personal Agent CaaS (based on recruitment activities) → stored in caas_scores
 * - Their Organisation CaaS (based on team performance) → stored in connection_groups.caas_score
 *
 * Data Source: Uses calculate_organisation_caas RPC function (migration 158)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OrganisationCaaSResult {
  total_score: number;
  base_score: number;
  verification_bonus: number;
  active_member_count: number;
  team_avg_caas: number;
}

// ============================================================================
// STRATEGY IMPLEMENTATION
// ============================================================================

export class OrganisationCaaSStrategy implements IEntityCaaSStrategy<'organisation'> {
  /**
   * Get the entity type this strategy scores
   * @returns 'organisation'
   */
  getEntityType(): 'organisation' {
    return 'organisation';
  }

  /**
   * Get the table where organisation scores are stored
   * @returns 'connection_groups'
   */
  getStorageTable(): string {
    return 'connection_groups';
  }

  /**
   * Get the column name where scores are stored
   * @returns 'caas_score'
   */
  getStorageColumn(): string {
    return 'caas_score';
  }

  /**
   * Calculate Organisation CaaS Score
   *
   * @param entityId - The connection_groups.id for the organisation
   * @param supabase - Supabase client (MUST be service_role for RPC access)
   * @returns CaaSScoreData with total score and breakdown
   */
  async calculate(entityId: string, supabase: SupabaseClient): Promise<CaaSScoreData> {
    const organisationId = entityId; // Semantic alias for clarity
    try {
      // ================================================================
      // STEP 1: VERIFY ORGANISATION EXISTS AND IS PUBLIC
      // ================================================================
      const { data: org, error: orgError } = await supabase
        .from('connection_groups')
        .select('id, type, profile_id, public_visible')
        .eq('id', organisationId)
        .eq('type', 'organisation')
        .single();

      if (orgError || !org) {
        console.warn(
          `[OrgCaaS] Organisation ${organisationId} not found or not an organisation:`,
          orgError
        );
        return {
          total: 0,
          breakdown: {
            error: 'Organisation not found or invalid type',
          },
        };
      }

      // ================================================================
      // STEP 2: CALL RPC FUNCTION TO GET ORGANISATION CAAS
      // ================================================================
      const { data: orgCaaSData, error: rpcError } = await supabase
        .rpc('calculate_organisation_caas', { org_id: organisationId })
        .single<OrganisationCaaSResult>();

      if (rpcError) {
        console.error(
          `[OrgCaaS] RPC error calculating organisation CaaS for ${organisationId}:`,
          rpcError
        );
        throw new Error(`Failed to calculate organisation CaaS: ${rpcError.message}`);
      }

      if (!orgCaaSData) {
        console.warn(`[OrgCaaS] No data returned from RPC for ${organisationId}`);
        return {
          total: 0,
          breakdown: {
            error: 'No data returned from calculation',
          },
        };
      }

      // ================================================================
      // STEP 3: CHECK MINIMUM MEMBER REQUIREMENT
      // ================================================================
      if (orgCaaSData.active_member_count < 3) {
        return {
          total: 0,
          breakdown: {
            gate: 'Minimum 3 active members required',
            current_members: orgCaaSData.active_member_count,
            message:
              'Organisations need at least 3 active members (active in last 30 days) to receive a credibility score',
          },
        };
      }

      // ================================================================
      // STEP 4: BUILD BREAKDOWN AND RETURN SCORE
      // ================================================================
      const total = Math.round(orgCaaSData.total_score);

      return {
        total,
        breakdown: {
          // Overall Score Components
          total_score: total,
          base_score: Math.round(orgCaaSData.base_score * 10) / 10,
          verification_bonus: orgCaaSData.verification_bonus,

          // Team Metrics
          active_member_count: orgCaaSData.active_member_count,
          team_avg_caas: Math.round(orgCaaSData.team_avg_caas * 10) / 10,

          // Calculation Method
          calculation_method:
            'Activity-weighted team average (members with more sessions in last 90 days contribute more)',

          // Score Composition Details
          score_composition: {
            weighted_team_average: Math.round(orgCaaSData.base_score * 10) / 10,
            verification_bonuses: orgCaaSData.verification_bonus,
          },

          // Context
          organisation_id: organisationId,
          owner_id: org.profile_id,
          public_visible: org.public_visible,
        },
      };
    } catch (error) {
      console.error('[OrgCaaS] Error calculating organisation CaaS:', error);
      throw error;
    }
  }

  /**
   * Get Organisation Details for Display
   *
   * Helper method to fetch organisation details for dashboard/profile display.
   * Returns verification status and member statistics.
   *
   * @param organisationId - The connection_groups.id for the organisation
   * @param supabase - Supabase client
   * @returns Organisation details with CaaS score and verification info
   */
  static async getOrganisationDetails(
    organisationId: string,
    supabase: SupabaseClient
  ): Promise<{
    name: string;
    slug: string;
    caas_score: number | null;
    business_verified: boolean;
    safeguarding_certified: boolean;
    professional_insurance: boolean;
    association_member: string | null;
    active_member_count: number;
    team_avg_caas: number;
  } | null> {
    try {
      // Fetch organisation details
      const { data: org, error: orgError } = await supabase
        .from('connection_groups')
        .select(
          `
          name,
          slug,
          caas_score,
          business_verified,
          safeguarding_certified,
          professional_insurance,
          association_member
        `
        )
        .eq('id', organisationId)
        .eq('type', 'organisation')
        .single();

      if (orgError || !org) {
        console.error('[OrgCaaS] Failed to fetch organisation details:', orgError);
        return null;
      }

      // Get team statistics from RPC
      const { data: orgCaaSData } = await supabase
        .rpc('calculate_organisation_caas', { org_id: organisationId })
        .single<OrganisationCaaSResult>();

      return {
        name: org.name,
        slug: org.slug,
        caas_score: org.caas_score,
        business_verified: org.business_verified || false,
        safeguarding_certified: org.safeguarding_certified || false,
        professional_insurance: org.professional_insurance || false,
        association_member: org.association_member,
        active_member_count: orgCaaSData?.active_member_count || 0,
        team_avg_caas: orgCaaSData?.team_avg_caas || 0,
      };
    } catch (error) {
      console.error('[OrgCaaS] Error fetching organisation details:', error);
      return null;
    }
  }
}
