/**
 * Filename: apps/web/src/lib/services/caas/strategies/client.ts
 * Purpose: Client CaaS scoring strategy - Basic implementation (v1.0)
 * Created: 2025-11-15
 * Pattern: Strategy Pattern (Service Layer - API Solution Design v5.1)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ICaaSStrategy, CaaSScoreData, CaaSProfile } from '../types';

/**
 * ClientCaaSStrategy
 * Basic scoring model for CLIENT role (v1.0)
 *
 * This is a simplified scoring model that will be expanded in future iterations.
 * Current model focuses on basic trust signals for tutors vetting potential clients.
 *
 * Scoring Buckets (100 points total):
 * 1. Identity Verification: 40 points (safety gate + bonus)
 * 2. Booking History: 40 points (completed bookings = reliable client)
 * 3. Profile Completeness: 20 points (has bio, avatar, etc.)
 *
 * Future enhancements (v2.0+):
 * - Payment history (on-time payments, disputes)
 * - Response rate to tutor messages
 * - Review feedback from tutors (tutor→client reviews)
 * - Session attendance rate
 */
export class ClientCaaSStrategy implements ICaaSStrategy {
  /**
   * Calculate CaaS score for a CLIENT
   * @param userId - The profile_id to calculate score for
   * @param supabase - Supabase client (should be service_role for RPC access)
   * @returns CaaSScoreData with total score and breakdown
   */
  async calculate(userId: string, supabase: SupabaseClient): Promise<CaaSScoreData> {
    try {
      // ================================================================
      // STEP 1: FETCH CLIENT PROFILE
      // ================================================================
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, roles, identity_verified, bio, avatar_url, created_at')
        .eq('id', userId)
        .single<CaaSProfile>();

      if (profileError) {
        console.error('[ClientCaaS] Failed to fetch profile:', profileError);
        throw new Error(`Failed to fetch profile: ${profileError.message}`);
      }

      if (!profile) {
        return { total: 0, breakdown: { gate: 'Profile not found' } };
      }

      // ================================================================
      // STEP 2: FETCH BOOKING HISTORY
      // ================================================================
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status')
        .eq('client_id', userId);

      if (bookingsError) {
        console.error('[ClientCaaS] Failed to fetch bookings:', bookingsError);
      }

      const completedBookings = (bookings || []).filter((b) => b.status === 'completed').length;
      const totalBookings = (bookings || []).length;

      // ================================================================
      // STEP 3: CALCULATE THE 3 BUCKETS
      // ================================================================
      const b_verification = this.calcVerification(profile);
      const b_history = this.calcHistory(completedBookings);
      const b_profile = this.calcProfileCompleteness(profile);

      const total = Math.round(b_verification + b_history + b_profile);

      return {
        total,
        breakdown: {
          // Using generic "breakdown" keys for client
          responsiveness: b_verification, // Reusing this key for verification
          payment_history: b_history, // Reusing this key for booking history
          engagement: b_profile, // Reusing this key for profile completeness
        },
      };
    } catch (error) {
      console.error('[ClientCaaS] Calculation error for user', userId, error);
      throw error;
    }
  }

  /**
   * BUCKET 1: IDENTITY VERIFICATION (40 points)
   * Basic trust signal - is this a verified, real person?
   */
  private calcVerification(profile: CaaSProfile): number {
    // 40 points if identity verified, 0 if not
    // This is the strongest signal for clients - tutors want to know they're booking with real people
    return profile.identity_verified ? 40 : 0;
  }

  /**
   * BUCKET 2: BOOKING HISTORY (40 points)
   * Rewards clients who have completed bookings (reliable, engaged users)
   */
  private calcHistory(completedBookings: number): number {
    // Progressive scoring based on completed bookings
    // 0 bookings = 0 points (new user)
    // 1-2 bookings = 10 points
    // 3-5 bookings = 20 points
    // 6-10 bookings = 30 points
    // 11+ bookings = 40 points (max)

    if (completedBookings === 0) return 0;
    if (completedBookings <= 2) return 10;
    if (completedBookings <= 5) return 20;
    if (completedBookings <= 10) return 30;
    return 40;
  }

  /**
   * BUCKET 3: PROFILE COMPLETENESS (20 points)
   * Rewards clients who filled out their profile (shows engagement)
   */
  private calcProfileCompleteness(profile: CaaSProfile): number {
    let score = 0;

    // 10 points for having a bio
    if (profile.bio && profile.bio.length > 50) {
      score += 10;
    }

    // 10 points for having an avatar
    if (profile.avatar_url) {
      score += 10;
    }

    return score;
  }
}
