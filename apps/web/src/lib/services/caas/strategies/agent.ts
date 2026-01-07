/**
 * Filename: apps/web/src/lib/services/caas/strategies/agent.ts
 * Purpose: Agent CaaS Strategy - Organisation-Centric Scoring Model (v1.0)
 * Created: 2026-01-07
 * Pattern: Strategy Pattern (ICaaSStrategy implementation)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CaaSScoreData, IProfileCaaSStrategy, CaaSProfile } from '../types';

/**
 * Agent Recruitment Stats (from RPC function)
 */
interface AgentRecruitmentStats {
  total_recruited_tutors: number;
  recruited_tutors_in_org: number;
  recent_recruits_90d: number;
  avg_recruited_tutor_caas: number;
  total_sessions_by_recruited: number;
  avg_rating_of_recruited: number;
  active_after_6_months: number;
  unique_subjects: number;
  org_avg_caas: number;
  avg_member_caas_improvement: number;
}

/**
 * Organisation Business Stats (from RPC function)
 */
interface OrgBusinessStats {
  org_page_bookings: number;
  org_acquired_clients: number;
  internal_referral_bookings: number;
  total_bookings: number;
  current_active_members: number;
  new_members_90d: number;
  service_area_count: number;
}

/**
 * Organisation Details (from connection_groups)
 */
interface OrganisationDetails {
  id: string;
  business_verified: boolean;
  safeguarding_certified: boolean;
  professional_insurance: boolean;
  association_member: string | null;
}

/**
 * AgentCaaSStrategy
 *
 * Implements Agent credibility scoring with embedded organisation subscription bonuses.
 *
 * Scoring Model (4 buckets, 100 points max):
 * - Bucket 1: Team Quality & Development (25 base + 10 org = 35 max)
 * - Bucket 2: Business Operations & Scale (20 base + 10 org = 30 max)
 * - Bucket 3: Growth & Expansion (15 base + 5 org = 20 max)
 * - Bucket 4: Professional Standards (10 base + 5 org = 15 max)
 *
 * Free tier max: 70 points (realistically 60-75 for most solo agents)
 * With organisation: 100 points (requires active subscription + feature usage)
 *
 * Design Philosophy: Steer agents toward building scalable tutoring businesses
 * using organisation features, not just recruiting individuals.
 */
export class AgentCaaSStrategy implements IProfileCaaSStrategy {
  async calculate(profileId: string, supabase: SupabaseClient): Promise<CaaSScoreData> {
    try {
      // ================================================================
      // STEP 1: FETCH AGENT PROFILE
      // ================================================================
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single<CaaSProfile>();

      if (profileError || !profile) {
        throw new Error(`Failed to fetch agent profile: ${profileError?.message}`);
      }

      // SAFETY GATE: Identity verification required
      if (!profile.identity_verified) {
        return {
          total: 0,
          breakdown: {
            gate: 'Identity verification required - Complete identity verification to unlock Agent CaaS scoring',
          },
        };
      }

      // ================================================================
      // STEP 2: CHECK ORGANISATION SUBSCRIPTION STATUS
      // ================================================================
      const { data: hasActiveOrg, error: subError } = await supabase.rpc(
        'check_org_subscription_active',
        { agent_id: profileId }
      );

      if (subError) {
        console.error('[Agent CaaS] Error checking subscription:', subError);
      }

      const subscriptionActive = hasActiveOrg || false;

      // ================================================================
      // STEP 3: FETCH RECRUITMENT STATS (via RPC)
      // ================================================================
      const { data: recruitmentStats, error: statsError } = await supabase
        .rpc('get_agent_recruitment_stats', { agent_id: profileId })
        .single<AgentRecruitmentStats>();

      if (statsError) {
        console.error('[Agent CaaS] Failed to fetch recruitment stats:', statsError);
        throw new Error(`Failed to fetch recruitment stats: ${statsError.message}`);
      }

      if (!recruitmentStats) {
        throw new Error('No recruitment stats returned');
      }

      // ================================================================
      // STEP 4: FETCH ORGANISATION STATS (if has active subscription)
      // ================================================================
      let orgStats: OrgBusinessStats | null = null;
      let orgDetails: OrganisationDetails | null = null;

      if (subscriptionActive) {
        // Get agent's organisation
        const { data: org } = await supabase
          .from('connection_groups')
          .select('id, business_verified, safeguarding_certified, professional_insurance, association_member')
          .eq('profile_id', profileId)
          .eq('type', 'organisation')
          .single<OrganisationDetails>();

        if (org) {
          orgDetails = org;

          // Get organisation business stats
          const { data: stats, error: orgStatsError } = await supabase
            .rpc('get_organisation_business_stats', { org_id: org.id })
            .single<OrgBusinessStats>();

          if (orgStatsError) {
            console.error('[Agent CaaS] Error fetching org stats:', orgStatsError);
          } else {
            orgStats = stats;
          }
        }
      }

      // ================================================================
      // STEP 5: CALCULATE BUCKET SCORES
      // ================================================================
      const bucket1 = this.calcBucket1_TeamQuality(recruitmentStats, subscriptionActive);
      const bucket2 = this.calcBucket2_BusinessOps(recruitmentStats, orgStats, subscriptionActive);
      const bucket3 = this.calcBucket3_Growth(recruitmentStats, orgStats, subscriptionActive);
      const bucket4 = this.calcBucket4_ProfessionalStandards(
        profile,
        orgDetails,
        subscriptionActive
      );

      const total = bucket1.total + bucket2.total + bucket3.total + bucket4.total;

      return {
        total: Math.round(total),
        breakdown: {
          team_quality_development: Math.round(bucket1.total * 10) / 10,
          team_quality_base: Math.round(bucket1.base * 10) / 10,
          team_quality_bonus: Math.round(bucket1.bonus * 10) / 10,
          business_operations_scale: Math.round(bucket2.total * 10) / 10,
          business_ops_base: Math.round(bucket2.base * 10) / 10,
          business_ops_bonus: Math.round(bucket2.bonus * 10) / 10,
          growth_expansion: Math.round(bucket3.total * 10) / 10,
          growth_base: Math.round(bucket3.base * 10) / 10,
          growth_bonus: Math.round(bucket3.bonus * 10) / 10,
          professional_standards: Math.round(bucket4.total * 10) / 10,
          professional_standards_base: Math.round(bucket4.base * 10) / 10,
          professional_standards_bonus: Math.round(bucket4.bonus * 10) / 10,
          subscription_active: subscriptionActive,
          total_base_points: Math.round((bucket1.base + bucket2.base + bucket3.base + bucket4.base) * 10) / 10,
          total_org_bonus_points: Math.round((bucket1.bonus + bucket2.bonus + bucket3.bonus + bucket4.bonus) * 10) / 10,
        },
      };
    } catch (error) {
      console.error('[Agent CaaS] Error calculating score:', error);
      throw error;
    }
  }

  // ====================================================================
  // BUCKET 1: Team Quality & Development (25 base + 10 org = 35 max)
  // ====================================================================
  private calcBucket1_TeamQuality(
    stats: AgentRecruitmentStats,
    hasActiveOrg: boolean
  ): { total: number; base: number; bonus: number } {
    // BASE SCORING (25 max): Average CaaS of recruited tutors
    let base = 0;
    const avgTutorCaaS = stats.avg_recruited_tutor_caas || 0;

    if (avgTutorCaaS >= 85) base = 25;
    else if (avgTutorCaaS >= 80) base = 23;
    else if (avgTutorCaaS >= 75) base = 21;
    else if (avgTutorCaaS >= 70) base = 19;
    else if (avgTutorCaaS >= 65) base = 16;
    else if (avgTutorCaaS >= 60) base = 13;
    else if (avgTutorCaaS >= 55) base = 10;
    else if (avgTutorCaaS >= 50) base = 7;
    else if (stats.total_recruited_tutors > 0) base = 5;

    // ORGANISATION BONUS (10 max)
    let bonus = 0;
    if (hasActiveOrg && stats.total_recruited_tutors > 0) {
      // Sub-metric 1: Team integration rate (max +4)
      const integrationRate = stats.recruited_tutors_in_org / stats.total_recruited_tutors;
      if (integrationRate >= 0.8) bonus += 4;
      else if (integrationRate >= 0.6) bonus += 3;
      else if (integrationRate >= 0.4) bonus += 2;
      else if (integrationRate >= 0.2) bonus += 1;

      // Sub-metric 2: Org team quality (max +3)
      const orgAvgCaaS = stats.org_avg_caas || 0;
      if (orgAvgCaaS >= 80) bonus += 3;
      else if (orgAvgCaaS >= 75) bonus += 2.5;
      else if (orgAvgCaaS >= 70) bonus += 2;
      else if (orgAvgCaaS >= 65) bonus += 1.5;
      else if (orgAvgCaaS >= 60) bonus += 1;

      // Sub-metric 3: Member development (max +3)
      const avgImprovement = stats.avg_member_caas_improvement || 0;
      if (avgImprovement >= 20) bonus += 3;
      else if (avgImprovement >= 15) bonus += 2.5;
      else if (avgImprovement >= 10) bonus += 2;
      else if (avgImprovement >= 7) bonus += 1.5;
      else if (avgImprovement >= 5) bonus += 1;

      bonus = Math.min(bonus, 10);
    }

    return { total: base + bonus, base, bonus };
  }

  // ====================================================================
  // BUCKET 2: Business Operations & Scale (20 base + 10 org = 30 max)
  // ====================================================================
  private calcBucket2_BusinessOps(
    stats: AgentRecruitmentStats,
    orgStats: OrgBusinessStats | null,
    hasActiveOrg: boolean
  ): { total: number; base: number; bonus: number } {
    // BASE SCORING (20 max): Recruited tutor performance
    let base = 0;

    // Total sessions (max 10)
    const totalSessions = stats.total_sessions_by_recruited || 0;
    if (totalSessions >= 1000) base += 10;
    else if (totalSessions >= 500) base += 8;
    else if (totalSessions >= 250) base += 6;
    else if (totalSessions >= 100) base += 4;
    else if (totalSessions >= 50) base += 2;

    // Average rating (max 6)
    const avgRating = stats.avg_rating_of_recruited || 0;
    if (avgRating >= 4.8) base += 6;
    else if (avgRating >= 4.7) base += 5;
    else if (avgRating >= 4.5) base += 4;
    else if (avgRating >= 4.3) base += 3;
    else if (avgRating >= 4.0) base += 2;
    else if (avgRating >= 3.5) base += 1;

    // Retention rate (max 4)
    if (stats.total_recruited_tutors > 0) {
      const retention = stats.active_after_6_months / stats.total_recruited_tutors;
      if (retention >= 0.85) base += 4;
      else if (retention >= 0.75) base += 3;
      else if (retention >= 0.65) base += 2;
      else if (retention >= 0.5) base += 1;
    }

    // ORGANISATION BONUS (10 max)
    let bonus = 0;
    if (hasActiveOrg && orgStats) {
      // Sub-metric 1: Brand & marketing (max +4)
      const orgBookings = orgStats.org_page_bookings || 0;
      if (orgBookings >= 200) bonus += 4;
      else if (orgBookings >= 100) bonus += 3;
      else if (orgBookings >= 50) bonus += 2;
      else if (orgBookings >= 20) bonus += 1;

      // Sub-metric 2: Client acquisition (max +3)
      const orgClients = orgStats.org_acquired_clients || 0;
      if (orgClients >= 100) bonus += 3;
      else if (orgClients >= 50) bonus += 2.5;
      else if (orgClients >= 25) bonus += 2;
      else if (orgClients >= 10) bonus += 1;

      // Sub-metric 3: Team collaboration (max +3)
      const totalBookings = orgStats.total_bookings || 0;
      if (totalBookings > 0) {
        const collabRate = (orgStats.internal_referral_bookings || 0) / totalBookings;
        if (collabRate >= 0.3) bonus += 3;
        else if (collabRate >= 0.2) bonus += 2;
        else if (collabRate >= 0.1) bonus += 1;
        else if (collabRate >= 0.05) bonus += 0.5;
      }

      bonus = Math.min(bonus, 10);
    }

    return { total: base + bonus, base, bonus };
  }

  // ====================================================================
  // BUCKET 3: Growth & Expansion (15 base + 5 org = 20 max)
  // ====================================================================
  private calcBucket3_Growth(
    stats: AgentRecruitmentStats,
    orgStats: OrgBusinessStats | null,
    hasActiveOrg: boolean
  ): { total: number; base: number; bonus: number } {
    // BASE SCORING (15 max): Recruitment activity
    let base = 0;

    // Total recruited (max 8)
    const totalRecruited = stats.total_recruited_tutors || 0;
    if (totalRecruited >= 100) base += 8;
    else if (totalRecruited >= 50) base += 7;
    else if (totalRecruited >= 25) base += 6;
    else if (totalRecruited >= 15) base += 4;
    else if (totalRecruited >= 10) base += 3;
    else if (totalRecruited >= 5) base += 2;
    else if (totalRecruited >= 1) base += 1;

    // Recent activity (max 4)
    const recent90d = stats.recent_recruits_90d || 0;
    if (recent90d >= 10) base += 4;
    else if (recent90d >= 5) base += 3;
    else if (recent90d >= 3) base += 2;
    else if (recent90d >= 1) base += 1;

    // Subject diversity (max 3)
    const uniqueSubjects = stats.unique_subjects || 0;
    if (uniqueSubjects >= 15) base += 3;
    else if (uniqueSubjects >= 10) base += 2.5;
    else if (uniqueSubjects >= 7) base += 2;
    else if (uniqueSubjects >= 5) base += 1.5;
    else if (uniqueSubjects >= 3) base += 1;

    // ORGANISATION BONUS (5 max)
    let bonus = 0;
    if (hasActiveOrg && orgStats) {
      // Sub-metric 1: Team size (max +2)
      const activeMembers = orgStats.current_active_members || 0;
      if (activeMembers >= 50) bonus += 2;
      else if (activeMembers >= 30) bonus += 1.75;
      else if (activeMembers >= 20) bonus += 1.5;
      else if (activeMembers >= 15) bonus += 1.25;
      else if (activeMembers >= 10) bonus += 1;
      else if (activeMembers >= 5) bonus += 0.5;

      // Sub-metric 2: Growth momentum (max +2)
      const newMembers = orgStats.new_members_90d || 0;
      if (newMembers >= 15) bonus += 2;
      else if (newMembers >= 10) bonus += 1.75;
      else if (newMembers >= 7) bonus += 1.5;
      else if (newMembers >= 5) bonus += 1.25;
      else if (newMembers >= 3) bonus += 1;

      // Sub-metric 3: Geographic expansion (max +1)
      const serviceAreas = orgStats.service_area_count || 0;
      if (serviceAreas >= 10) bonus += 1;
      else if (serviceAreas >= 7) bonus += 0.75;
      else if (serviceAreas >= 5) bonus += 0.5;
      else if (serviceAreas >= 3) bonus += 0.25;

      bonus = Math.min(bonus, 5);
    }

    return { total: base + bonus, base, bonus };
  }

  // ====================================================================
  // BUCKET 4: Professional Standards (10 base + 5 org = 15 max)
  // ====================================================================
  private calcBucket4_ProfessionalStandards(
    profile: CaaSProfile,
    orgDetails: OrganisationDetails | null,
    hasActiveOrg: boolean
  ): { total: number; base: number; bonus: number } {
    // BASE SCORING (10 max): Personal credentials
    let base = 3; // Base points for identity verification (already checked)

    if (profile.dbs_verified) base += 3;
    if ((profile as any).professional_insurance) base += 2;
    if ((profile as any).association_member) base += 2;

    // ORGANISATION BONUS (5 max)
    let bonus = 0;
    if (hasActiveOrg && orgDetails) {
      // Sub-metric 1: Business verification (+2)
      if (orgDetails.business_verified) bonus += 2;

      // Sub-metric 2: Safeguarding cert (+2)
      if (orgDetails.safeguarding_certified) bonus += 2;

      // Sub-metric 3: Org insurance/association (+1)
      if (orgDetails.professional_insurance) bonus += 0.5;
      if (orgDetails.association_member) bonus += 0.5;

      bonus = Math.min(bonus, 5);
    }

    return { total: base + bonus, base, bonus };
  }
}
