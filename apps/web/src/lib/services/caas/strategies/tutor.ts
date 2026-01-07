/**
 * Filename: apps/web/src/lib/services/caas/strategies/tutor.ts
 * Purpose: Tutor CaaS scoring strategy - 30/30/20/10/10/10 model (v5.9 with Social Impact)
 * Created: 2025-11-15
 * Updated: 2025-12-15 - Added Bucket 6 (Social Impact) for Free Help Now integration
 * Pattern: Strategy Pattern (Service Layer - API Solution Design v5.1)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  IProfileCaaSStrategy,
  CaaSScoreData,
  CaaSProfile,
  PerformanceStats,
  NetworkStats,
  DigitalStats,
} from '../types';
import {
  defaultPerformanceStats,
  defaultNetworkStats,
  defaultDigitalStats,
} from '../types';

/**
 * TutorCaaSStrategy
 * Implements the 6-bucket scoring model for TUTOR role (v5.9 with Free Help Now)
 *
 * Scoring Buckets (110 points raw, normalized to /100 for display):
 * 1. Performance & Quality: 30 points
 * 2. Qualifications & Authority: 30 points
 * 3. Network & Referrals: 20 points
 * 4. Verification & Safety: 10 points
 * 5. Digital Professionalism: 10 points
 * 6. Social Impact (Free Help Now): 10 points
 *
 * Safety Gate: identity_verified must be true, otherwise score = 0
 *
 * Note: Total is 110 points. Scores are normalized to /100 scale for consistency.
 */
export class TutorCaaSStrategy implements IProfileCaaSStrategy {
  /**
   * Calculate CaaS score for a TUTOR
   * @param userId - The profile_id to calculate score for
   * @param supabase - Supabase client (should be service_role for RPC access)
   * @returns CaaSScoreData with total score (normalized to /100) and 6-bucket breakdown
   */
  async calculate(userId: string, supabase: SupabaseClient): Promise<CaaSScoreData> {
    try {
      // ================================================================
      // STEP 1: THE SAFETY GATE
      // ================================================================
      // Fetch profile data with role_details JOIN
      // qualifications and teaching_experience are in role_details table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(
          `
          id,
          roles,
          identity_verified,
          dbs_verified,
          dbs_expiry_date,
          created_at,
          bio_video_url,
          available_free_help,
          role_details!inner(
            qualifications,
            teaching_experience
          )
          `
        )
        .eq('id', userId)
        .eq('role_details.role_type', 'tutor')
        .single();

      if (profileError) {
        console.error('[TutorCaaS] Failed to fetch profile:', profileError);
        throw new Error(`Failed to fetch profile: ${profileError.message}`);
      }

      if (!profileData) {
        return { total: 0, breakdown: { gate: 'Profile not found' } };
      }

      // Extract role_details (should be single object since inner join)
      const roleDetails = Array.isArray(profileData.role_details)
        ? profileData.role_details[0]
        : profileData.role_details;

      // Map to CaaSProfile format
      const profile: CaaSProfile = {
        ...profileData,
        qualifications: roleDetails?.qualifications || null,
        teaching_experience: roleDetails?.teaching_experience || null,
        degree_level: null, // Will extract from qualifications.education below
        bio: null,
        avatar_url: null,
      };

      // Extract degree_level from qualifications.education
      if (profile.qualifications?.education) {
        const edu = profile.qualifications.education;
        if (edu === 'phd') profile.degree_level = 'PHD';
        else if (edu === 'masters') profile.degree_level = 'MASTERS';
        else if (edu === 'bachelors') profile.degree_level = 'BACHELORS';
        else profile.degree_level = 'NONE';
      }

      if (!profile.identity_verified) {
        return { total: 0, breakdown: { gate: 'Identity not verified' } };
      }

      // ================================================================
      // STEP 2: FETCH ALL METRICS (using RPC functions)
      // ================================================================
      // Use Promise.allSettled for graceful degradation if an RPC fails
      const [networkResult, performanceResult, digitalResult] = await Promise.allSettled([
        supabase.rpc('get_network_stats', { user_id: userId }),
        supabase.rpc('get_performance_stats', { user_id: userId }),
        supabase.rpc('get_digital_stats', { user_id: userId }),
      ]);

      // Extract data with fallbacks
      // RPC functions return arrays, so we need to extract the first element
      const network: NetworkStats =
        networkResult.status === 'fulfilled' && networkResult.value.data && Array.isArray(networkResult.value.data) && networkResult.value.data.length > 0
          ? (networkResult.value.data[0] as NetworkStats)
          : defaultNetworkStats;

      const performance: PerformanceStats =
        performanceResult.status === 'fulfilled' && performanceResult.value.data && Array.isArray(performanceResult.value.data) && performanceResult.value.data.length > 0
          ? (performanceResult.value.data[0] as PerformanceStats)
          : defaultPerformanceStats;

      const digital: DigitalStats =
        digitalResult.status === 'fulfilled' && digitalResult.value.data && Array.isArray(digitalResult.value.data) && digitalResult.value.data.length > 0
          ? (digitalResult.value.data[0] as DigitalStats)
          : defaultDigitalStats;

      // Log any RPC failures for debugging
      if (networkResult.status === 'rejected') {
        console.error('[TutorCaaS] Network stats RPC failed:', networkResult.reason);
      }
      if (performanceResult.status === 'rejected') {
        console.error('[TutorCaaS] Performance stats RPC failed:', performanceResult.reason);
      }
      if (digitalResult.status === 'rejected') {
        console.error('[TutorCaaS] Digital stats RPC failed:', digitalResult.reason);
      }

      // ================================================================
      // STEP 3: CALCULATE THE 6 BUCKETS
      // ================================================================
      const b_performance = this.calcPerformance(performance);
      const b_qualifications = this.calcQualifications(profile);
      const b_network = this.calcNetwork(network);
      const b_safety = this.calcSafety(profile);
      const b_digital = this.calcDigital(digital, performance, profile);
      const b_social_impact = this.calcSocialImpact(profile, performance);

      // Raw total out of 110 points
      const rawTotal = b_performance + b_qualifications + b_network + b_safety + b_digital + b_social_impact;

      // Normalize to /100 scale: (rawTotal / 110) * 100
      const normalizedTotal = Math.round((rawTotal / 110) * 100);

      return {
        total: normalizedTotal,
        breakdown: {
          performance: b_performance,
          qualifications: b_qualifications,
          network: b_network,
          safety: b_safety,
          digital: b_digital,
          social_impact: b_social_impact,
        } as any,
      };
    } catch (error) {
      console.error('[TutorCaaS] Calculation error for user', userId, error);
      throw error;
    }
  }

  /**
   * BUCKET 1: PERFORMANCE & QUALITY (30 points)
   * Rewards proven results and client satisfaction
   */
  private calcPerformance(stats: PerformanceStats): number {
    // PROVISIONAL SCORE LOGIC (solves cold start problem)
    // If tutor has 0 completed sessions, give them full 30 points provisionally
    // This ensures new tutors with strong qualifications aren't penalized
    if (stats.completed_sessions === 0) {
      return 30;
    }

    // For tutors with session history:
    // - Rating Score: (avg_rating / 5) * 15 points
    // - Retention Score: retention_rate * 15 points
    const ratingScore = (stats.avg_rating / 5) * 15;
    const retentionScore = stats.retention_rate * 15;

    return Math.round(ratingScore + retentionScore);
  }

  /**
   * BUCKET 2: QUALIFICATIONS & AUTHORITY (30 points)
   * Honors institutional credibility and veteran experience
   */
  private calcQualifications(profile: CaaSProfile): number {
    let score = 0;

    // 10 points for having a degree (Bachelors, Masters, or PhD)
    if (profile.degree_level && ['BACHELORS', 'MASTERS', 'PHD'].includes(profile.degree_level)) {
      score += 10;
    }

    // 10 points for having QTS (Qualified Teacher Status - UK teaching qualification)
    // Check certifications array in JSONB qualifications
    if (
      profile.qualifications?.certifications &&
      Array.isArray(profile.qualifications.certifications) &&
      profile.qualifications.certifications.includes('qts')
    ) {
      score += 10;
    }

    // 10 points for 10+ years of teaching experience
    // teaching_experience is JSONB in role_details - for now skip this check
    // TODO: Implement proper teaching_experience extraction from JSONB
    // if (profile.teaching_experience?.years >= 10) {
    //   score += 10;
    // }

    return score;
  }

  /**
   * BUCKET 3: NETWORK & REFERRALS (20 points)
   * Drives viral growth and rewards social proof
   */
  private calcNetwork(stats: NetworkStats): number {
    let score = 0;

    // 12 points max for referrals (4 points per referral, max 3 referrals)
    // This incentivizes Agents to recruit new tutors
    score += Math.min(stats.referral_count * 4, 12);

    // 8 points bonus for being well-networked OR agent-referred
    // - Well-networked: >10 SOCIAL connections
    // - Agent-referred: Has an incoming AGENT_REFERRAL link (replaces deprecated is_partner_verified)
    if (stats.connection_count > 10 || stats.is_agent_referred) {
      score += 8;
    }

    return score;
  }

  /**
   * BUCKET 4: VERIFICATION & SAFETY (10 points)
   * The "scored" component of safety (identity_verified is the gate, not scored here)
   */
  private calcSafety(profile: CaaSProfile): number {
    let score = 0;

    // 5 points for passing the Identity Gate
    // This is always true if we reach this function (gate check happens first)
    score += 5;

    // 5 points bonus for having a valid DBS check
    // DBS = Disclosure and Barring Service (UK background check for working with children)
    // Check expiry date - no grace period, must be current
    if (profile.dbs_verified && profile.dbs_expiry_date) {
      const expiryDate = new Date(profile.dbs_expiry_date);
      const now = new Date();

      if (expiryDate > now) {
        score += 5;
      }
    }

    return score;
  }

  /**
   * BUCKET 5: DIGITAL PROFESSIONALISM (10 points)
   * Nudges tutors to use platform tools and be responsive
   */
  private calcDigital(digital: DigitalStats, perf: PerformanceStats, profile: CaaSProfile): number {
    let score = 0;

    // ========================================
    // Part 1: Integrated Tools (5 points)
    // ========================================
    // 5 points if tutor has synced Google Calendar OR Google Classroom
    if (digital.google_calendar_synced || digital.google_classroom_synced) {
      score += 5;
    }

    // ========================================
    // Part 2: Engagement (5 points) - "The OR Rule"
    // ========================================
    // Tutor gets 5 points if EITHER:
    //   Path A: They diligently log their session data (high manual log rate > 80%)
    //   Path B: They have uploaded a "Credibility Clip" (bio_video_url)
    //
    // Note: Removed Lessonspace-specific metric to be platform-agnostic

    const hasHighSessionLogging = perf.manual_session_log_rate > 0.8;

    const hasCredibilityClip = profile.bio_video_url && profile.bio_video_url !== '';

    if (hasHighSessionLogging || hasCredibilityClip) {
      score += 5;
    }

    return score;
  }

  /**
   * BUCKET 6: SOCIAL IMPACT (10 points) - v5.9 Free Help Now Integration
   * Rewards tutors who contribute to educational access through free sessions
   * This aligns with platform mission and creates a virtuous cycle where
   * community contribution drives reputation and paid business growth
   */
  private calcSocialImpact(profile: CaaSProfile, perf: PerformanceStats): number {
    let score = 0;

    // ========================================
    // Part 1: Availability Bonus (5 points)
    // ========================================
    // Tutor has enabled "Offer Free Help" toggle and maintains heartbeat presence
    // This makes them discoverable in the marketplace with the "Free Help Now" badge
    if ((profile as any).available_free_help === true) {
      score += 5;
    }

    // ========================================
    // Part 2: Delivery Bonus (5 points progressive)
    // ========================================
    // Award 1 point per completed free help session, capped at 5
    // Data comes from get_performance_stats RPC which queries:
    //   SELECT COUNT(*) FROM bookings b
    //   INNER JOIN listings l ON b.listing_id = l.id
    //   WHERE l.profile_id = ? AND b.type = 'free_help' AND b.status = 'Completed'
    const completedFreeSessions = perf.completed_free_sessions_count || 0;
    score += Math.min(5, completedFreeSessions);

    return score;
  }
}
