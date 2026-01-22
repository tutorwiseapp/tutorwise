// ===================================================================
// Universal CaaS Strategy - Single Implementation for All Roles
// ===================================================================
// This strategy uses 6 buckets with semantic reinterpretation per role:
// 1. Delivery (40%): Core service delivery metrics
// 2. Credentials (20%): Qualifications and profile authority
// 3. Network (15%): Connections and referrals
// 4. Trust (10%): Verification and safety signals
// 5. Digital (10%): Platform integration and tech usage
// 6. Impact (5%): Community contribution
// ===================================================================

import { SupabaseClient } from '@supabase/supabase-js';
import type { CaaSProfile, CaaSScoreData, IProfileCaaSStrategy } from '../types';

interface UniversalBucketWeights {
  delivery: number;      // 40%
  credentials: number;   // 20%
  network: number;       // 15%
  trust: number;        // 10%
  digital: number;      // 10%
  impact: number;       // 5%
}

const BUCKET_WEIGHTS: UniversalBucketWeights = {
  delivery: 0.40,
  credentials: 0.20,
  network: 0.15,
  trust: 0.10,
  digital: 0.10,
  impact: 0.05,
};

interface VerificationMultipliers {
  provisional: number;   // 0.70 - After onboarding, before verification
  identity: number;      // 0.85 - Identity verified
  full: number;         // 1.00 - All verifications complete
}

const VERIFICATION_MULTIPLIERS: VerificationMultipliers = {
  provisional: 0.70,
  identity: 0.85,
  full: 1.00,
};

export class UniversalCaaSStrategy implements IProfileCaaSStrategy {
  /**
   * Calculate CaaS score for any role using universal 6-bucket model
   *
   * This method is the adapter for IProfileCaaSStrategy interface.
   * It fetches the full profile and delegates to calculateFromProfile().
   */
  async calculate(
    profileId: string,
    supabase: SupabaseClient
  ): Promise<CaaSScoreData> {
    // Fetch full profile data
    const { data: profile, error } = await supabase
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

    if (error || !profile) {
      throw new Error(`Failed to fetch profile: ${error?.message || 'Profile not found'}`);
    }

    return this.calculateFromProfile(profile as any, supabase);
  }

  /**
   * Calculate CaaS score from a profile object (internal method)
   *
   * This is the main calculation logic used by both:
   * - calculate() - IProfileCaaSStrategy interface method
   * - Direct calls from CaaSService with pre-fetched profile
   */
  async calculateFromProfile(
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<CaaSScoreData> {
    // Determine role from roles array
    const role = this.getPrimaryRole(profile);

    if (!role) {
      return {
        total: 0,
        breakdown: {
          gate: 'No scoreable role found',
        },
      };
    }

    // Gate check: Must complete onboarding or verify identity
    const hasCompletedOnboarding = profile.onboarding_progress?.onboarding_completed === true;
    if (!profile.identity_verified && !hasCompletedOnboarding) {
      return {
        total: 0,
        breakdown: {
          gate: 'Complete onboarding or verify identity to unlock CaaS score',
        },
      };
    }

    // Calculate raw bucket scores (unbounded, 0-100% normalized)
    const delivery = await this.calcDelivery(role, profile, supabase);
    const credentials = await this.calcCredentials(role, profile, supabase);
    const network = await this.calcNetwork(role, profile, supabase);
    const trust = await this.calcTrust(role, profile, supabase);
    const digital = await this.calcDigital(role, profile, supabase);
    const impact = await this.calcImpact(role, profile, supabase);

    // Apply bucket weights to get weighted score
    const weightedScore =
      delivery * BUCKET_WEIGHTS.delivery +
      credentials * BUCKET_WEIGHTS.credentials +
      network * BUCKET_WEIGHTS.network +
      trust * BUCKET_WEIGHTS.trust +
      digital * BUCKET_WEIGHTS.digital +
      impact * BUCKET_WEIGHTS.impact;

    // Determine verification multiplier
    const multiplier = this.getVerificationMultiplier(profile);

    // Apply verification multiplier to final score
    const finalScore = Math.round(weightedScore * multiplier);

    return {
      total: Math.min(finalScore, 100),
      breakdown: {
        role,
        verification_status: this.getVerificationStatus(profile),
        multiplier,
        raw_buckets: {
          delivery: Math.round(delivery),
          credentials: Math.round(credentials),
          network: Math.round(network),
          trust: Math.round(trust),
          digital: Math.round(digital),
          impact: Math.round(impact),
        },
        weighted_buckets: {
          delivery: Math.round(delivery * BUCKET_WEIGHTS.delivery),
          credentials: Math.round(credentials * BUCKET_WEIGHTS.credentials),
          network: Math.round(network * BUCKET_WEIGHTS.network),
          trust: Math.round(trust * BUCKET_WEIGHTS.trust),
          digital: Math.round(digital * BUCKET_WEIGHTS.digital),
          impact: Math.round(impact * BUCKET_WEIGHTS.impact),
        },
        weighted_score: Math.round(weightedScore),
        final_score: finalScore,
      },
    };
  }

  // ===================================================================
  // BUCKET 1: DELIVERY (40%)
  // Core service delivery - role-specific metrics
  // ===================================================================

  private async calcDelivery(
    role: string,
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<number> {
    if (role === 'tutor') {
      return this.calcTutorDelivery(profile, supabase);
    }
    if (role === 'client') {
      return this.calcClientDelivery(profile, supabase);
    }
    if (role === 'agent') {
      return this.calcAgentDelivery(profile, supabase);
    }
    return 0;
  }

  /**
   * TUTOR DELIVERY: Teaching sessions + ratings
   */
  private async calcTutorDelivery(
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<number> {
    // Count completed teaching sessions
    const { count: completedSessions } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tutor_id', profile.id)
      .eq('status', 'Completed');

    const sessionCount = completedSessions || 0;

    // Provisional: If no sessions yet, give baseline 40 points
    if (sessionCount === 0) {
      return 40;
    }

    // Booking volume score (0-70 points, normalized)
    // 100 sessions = 100%, logarithmic curve
    const volumeScore = Math.min((Math.log10(sessionCount + 1) / Math.log10(100)) * 70, 70);

    // Rating score (0-30 points)
    const avgRating = profile.average_rating || 0;
    const ratingScore = (avgRating / 5.0) * 30;

    const totalScore = volumeScore + ratingScore;
    return Math.min(totalScore, 100);
  }

  /**
   * CLIENT DELIVERY: Booking completion rate + consistency
   */
  private async calcClientDelivery(
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<number> {
    // Count total and completed bookings
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', profile.id);

    const { count: completedBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', profile.id)
      .eq('status', 'Completed');

    const total = totalBookings || 0;
    const completed = completedBookings || 0;

    // Provisional: If no bookings yet, give baseline 30 points
    if (total === 0) {
      return 30;
    }

    // Completion rate (0-60 points)
    const completionRate = total > 0 ? completed / total : 0;
    const completionScore = completionRate * 60;

    // Volume score (0-40 points, logarithmic)
    // 50 bookings = 100%
    const volumeScore = Math.min((Math.log10(completed + 1) / Math.log10(50)) * 40, 40);

    const totalScore = completionScore + volumeScore;
    return Math.min(totalScore, 100);
  }

  /**
   * AGENT DELIVERY: Same as tutor (agents ARE tutors who also recruit)
   */
  private async calcAgentDelivery(
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<number> {
    // Agents are tutors, so use same teaching delivery metrics
    return this.calcTutorDelivery(profile, supabase);
  }

  // ===================================================================
  // BUCKET 2: CREDENTIALS (20%)
  // Qualifications, expertise, profile authority
  // ===================================================================

  private async calcCredentials(
    role: string,
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<number> {
    if (role === 'tutor') {
      return this.calcTutorCredentials(profile, supabase);
    }
    if (role === 'client') {
      return this.calcClientCredentials(profile, supabase);
    }
    if (role === 'agent') {
      return this.calcAgentCredentials(profile, supabase);
    }
    return 0;
  }

  /**
   * TUTOR CREDENTIALS: Degrees + certifications + experience
   */
  private async calcTutorCredentials(
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<number> {
    let score = 0;

    // Academic qualifications (0-40 points)
    const hasUndergrad = profile.qualifications?.some((q) => q.type === 'undergraduate');
    const hasMasters = profile.qualifications?.some((q) => q.type === 'masters');
    const hasPhd = profile.qualifications?.some((q) => q.type === 'phd');

    if (hasPhd) score += 40;
    else if (hasMasters) score += 30;
    else if (hasUndergrad) score += 20;
    else {
      // Provisional: Check onboarding data
      const onboardingEducation = profile.onboarding_progress?.highest_education;
      if (onboardingEducation === 'phd') score += 15;
      else if (onboardingEducation === 'masters') score += 10;
      else if (onboardingEducation === 'undergraduate') score += 5;
    }

    // Certifications (0-30 points, 10 pts each)
    const certCount = profile.qualifications?.filter((q) => q.type === 'certification').length || 0;
    score += Math.min(certCount * 10, 30);

    // Teaching experience (0-30 points)
    const yearsExperience = profile.onboarding_progress?.years_experience || 0;
    score += Math.min(yearsExperience * 6, 30); // 5 years = 30 points

    return Math.min(score, 100);
  }

  /**
   * CLIENT CREDENTIALS: Profile completeness + engagement quality
   */
  private async calcClientCredentials(
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<number> {
    let score = 0;

    // Profile completeness (0-50 points)
    if (profile.bio && profile.bio.length > 50) score += 20;
    if (profile.avatar_url) score += 15;
    if (profile.location) score += 15;

    // Engagement quality - reviews given (0-50 points, 10 pts per review)
    const { count: reviewsGiven } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('giver_id', profile.id);

    score += Math.min((reviewsGiven || 0) * 10, 50);

    return Math.min(score, 100);
  }

  /**
   * AGENT CREDENTIALS: Same as tutor (agents ARE tutors)
   */
  private async calcAgentCredentials(
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<number> {
    // Agents are tutors, so use same academic credentials
    return this.calcTutorCredentials(profile, supabase);
  }

  // ===================================================================
  // BUCKET 3: NETWORK (15%)
  // Connections, referrals made/received - UNIVERSAL for all roles
  // ===================================================================

  private async calcNetwork(
    role: string,
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<number> {
    let score = 0;

    // Social connections (0-30 points, 5 pts per connection)
    const { count: socialConnections } = await supabase
      .from('profile_graph')
      .select('*', { count: 'exact', head: true })
      .eq('source_id', profile.id)
      .eq('relationship_type', 'SOCIAL');

    score += Math.min((socialConnections || 0) * 5, 30);

    // Referrals MADE - everyone can refer others (0-35 points, 7 pts per referral)
    const { count: referralsMade } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', profile.id);

    score += Math.min((referralsMade || 0) * 7, 35);

    // Referrals RECEIVED - everyone can be referred (0-35 points, 7 pts per referral)
    const { count: referralsReceived } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referred_profile_id', profile.id);

    score += Math.min((referralsReceived || 0) * 7, 35);

    return Math.min(score, 100);
  }

  // ===================================================================
  // BUCKET 4: TRUST (10%)
  // Verification status and safety signals
  // ===================================================================

  private async calcTrust(
    role: string,
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<number> {
    let score = 0;

    // Onboarding completion (0-30 points)
    if (profile.onboarding_progress?.onboarding_completed) {
      score += 30;
    }

    // Identity verification (0-40 points)
    if (profile.identity_verified) {
      score += 40;
    }

    // Additional verifications (0-30 points)
    if (profile.email_verified) score += 10;
    if (profile.phone_verified) score += 10;
    if (profile.background_check_completed) score += 10;

    return Math.min(score, 100);
  }

  // ===================================================================
  // BUCKET 5: DIGITAL (10%)
  // Platform integration and technology usage
  // ===================================================================

  private async calcDigital(
    role: string,
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<number> {
    let score = 0;

    // Integration links (0-60 points, 20 pts each)
    const { count: integrations } = await supabase
      .from('student_integration_links')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id);

    score += Math.min((integrations || 0) * 20, 60);

    // Recording URLs (0-40 points, 10 pts each for tutors)
    if (role === 'tutor') {
      const { count: recordingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('tutor_id', profile.id)
        .not('recording_url', 'is', null);

      score += Math.min((recordingsCount || 0) * 10, 40);
    }

    return Math.min(score, 100);
  }

  // ===================================================================
  // BUCKET 6: IMPACT (5%)
  // Community contribution and giving back
  // ===================================================================

  private async calcImpact(
    role: string,
    profile: CaaSProfile,
    supabase: SupabaseClient
  ): Promise<number> {
    let score = 0;

    if (role === 'tutor') {
      // Tutors: Free help sessions delivered (10 pts each)
      const { count: freeHelpGiven } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('tutor_id', profile.id)
        .eq('type', 'free_help')
        .eq('status', 'Completed');

      score += (freeHelpGiven || 0) * 10;
    }

    if (role === 'client') {
      // Clients: Free help sessions taken - helps new tutors improve (10 pts each)
      const { count: freeHelpTaken } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', profile.id)
        .eq('type', 'free_help')
        .eq('status', 'Completed');

      score += (freeHelpTaken || 0) * 10;
    }

    if (role === 'agent') {
      // Agents: Same as tutors - free help sessions delivered (10 pts each)
      const { count: freeHelpGiven } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('tutor_id', profile.id)
        .eq('type', 'free_help')
        .eq('status', 'Completed');

      score += (freeHelpGiven || 0) * 10;
    }

    return Math.min(score, 100);
  }

  // ===================================================================
  // HELPER METHODS
  // ===================================================================

  /**
   * Determine primary role from roles array
   * Priority: tutor > client > agent
   */
  private getPrimaryRole(profile: CaaSProfile): 'tutor' | 'client' | 'agent' | null {
    if (!profile.roles || profile.roles.length === 0) {
      return null;
    }

    const upperRoles = profile.roles.map((r) => r.toUpperCase());

    if (upperRoles.includes('TUTOR')) return 'tutor';
    if (upperRoles.includes('CLIENT')) return 'client';
    if (upperRoles.includes('AGENT')) return 'agent';

    return null;
  }

  // ===================================================================
  // VERIFICATION MULTIPLIER LOGIC
  // ===================================================================

  private getVerificationMultiplier(profile: CaaSProfile): number {
    // Full verification: identity + email + phone + background
    const isFullyVerified =
      profile.identity_verified &&
      profile.email_verified &&
      profile.phone_verified &&
      profile.background_check_completed;

    if (isFullyVerified) {
      return VERIFICATION_MULTIPLIERS.full; // 1.00
    }

    // Identity verified
    if (profile.identity_verified) {
      return VERIFICATION_MULTIPLIERS.identity; // 0.85
    }

    // Provisional (onboarding completed but not verified)
    return VERIFICATION_MULTIPLIERS.provisional; // 0.70
  }

  private getVerificationStatus(profile: CaaSProfile): string {
    const isFullyVerified =
      profile.identity_verified &&
      profile.email_verified &&
      profile.phone_verified &&
      profile.background_check_completed;

    if (isFullyVerified) return 'full';
    if (profile.identity_verified) return 'identity';
    return 'provisional';
  }
}
