/**
 * Filename: apps/web/src/lib/booking-policies/penalty-calculator.ts
 * Purpose: Calculate cancellation penalties and track repeat late cancellations
 * Created: 2026-02-07
 *
 * Enhances the cancellation policy with:
 * - Repeat offender detection (3+ late cancels in 30 days)
 * - Graduated penalty system
 * - Warning messages before cancellation
 */

import { createClient } from '@/utils/supabase/server';
import { CANCELLATION_POLICY, calculateRefund, type CancellationActor } from './cancellation';

export interface CancellationPenaltyResult {
  refundAmount: number;
  penaltyAmount: number;
  caasImpact: number;
  warningMessage: string;
  isRepeatOffender: boolean;
  previousLateCancellations: number;
  canProceed: boolean;
}

/**
 * Gets the number of late cancellations for a user in the last 30 days
 *
 * @param userId User's profile ID
 * @returns Number of late cancellations
 */
export async function getRecentLateCancellations(userId: string): Promise<number> {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from('cancellation_penalties')
    .select('id')
    .eq('user_id', userId)
    .eq('penalty_type', 'late_cancel')
    .gte('applied_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('[Penalty Calculator] Error fetching cancellation history:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Checks if a user is a repeat offender (3+ late cancellations in 30 days)
 *
 * @param userId User's profile ID
 * @returns true if repeat offender
 */
export async function isRepeatOffender(userId: string): Promise<boolean> {
  const count = await getRecentLateCancellations(userId);
  return count >= 3;
}

/**
 * Records a cancellation penalty
 *
 * @param userId User ID
 * @param bookingId Booking ID
 * @param penaltyType Type of penalty
 * @param penaltyAmount Amount (CaaS points or money)
 */
export async function recordCancellationPenalty(
  userId: string,
  bookingId: string,
  penaltyType: 'late_cancel' | 'repeat_offender' | 'no_refund',
  penaltyAmount: number
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('cancellation_penalties')
    .insert({
      user_id: userId,
      booking_id: bookingId,
      penalty_type: penaltyType,
      penalty_amount: penaltyAmount,
    });

  if (error) {
    console.error('[Penalty Calculator] Error recording penalty:', error);
    throw new Error('Failed to record cancellation penalty');
  }
}

/**
 * Calculates the complete cancellation penalty including warnings
 *
 * @param booking Booking object with amount, client_id, tutor_id
 * @param cancelledBy Who is cancelling ('client' or 'tutor')
 * @param hoursUntilSession Hours until session start
 * @returns Complete penalty calculation with warnings
 */
export async function calculateCancellationPenalty(
  booking: {
    id: string;
    amount: number;
    client_id: string;
    tutor_id: string;
  },
  cancelledBy: CancellationActor,
  hoursUntilSession: number
): Promise<CancellationPenaltyResult> {
  // Get refund calculation from existing policy
  const refundCalc = calculateRefund(booking.amount, cancelledBy, hoursUntilSession, 'cancelled');

  // Determine who's getting penalized
  const penalizedUserId = cancelledBy === 'client' ? booking.client_id : booking.tutor_id;

  // Check repeat offender status
  const lateCancellationCount = await getRecentLateCancellations(penalizedUserId);
  const isRepeat = lateCancellationCount >= 3;

  // Build warning message
  let warningMessage = '';
  let canProceed = true;

  if (cancelledBy === 'client') {
    if (hoursUntilSession >= CANCELLATION_POLICY.CLIENT_FULL_REFUND_THRESHOLD) {
      // Early cancellation - full refund (minus Stripe fee)
      warningMessage = `You will receive a refund of £${(refundCalc.clientRefund / 100).toFixed(2)} (minus £${(refundCalc.stripeFee / 100).toFixed(2)} Stripe processing fee which is non-refundable).`;
    } else {
      // Late cancellation - no refund
      warningMessage = `⚠️ LATE CANCELLATION WARNING\n\n`;
      warningMessage += `You are cancelling with less than 24 hours notice. According to our cancellation policy:\n\n`;
      warningMessage += `• You will NOT receive a refund (£${(booking.amount / 100).toFixed(2)})\n`;
      warningMessage += `• The tutor will be paid in full as compensation\n`;
      warningMessage += `• This will be recorded as a late cancellation\n\n`;

      if (lateCancellationCount > 0) {
        warningMessage += `⚠️ PREVIOUS LATE CANCELLATIONS: ${lateCancellationCount} in the last 30 days\n\n`;
      }

      if (isRepeat) {
        warningMessage += `🚨 REPEAT OFFENDER STATUS\n\n`;
        warningMessage += `You have ${lateCancellationCount} late cancellations in the past 30 days. `;
        warningMessage += `Continued late cancellations may result in account restrictions.\n\n`;
      }

      warningMessage += `Are you sure you want to proceed with this late cancellation?`;
    }
  } else {
    // Tutor cancellation - always full refund + CaaS penalty
    warningMessage = `⚠️ TUTOR CANCELLATION PENALTY\n\n`;
    warningMessage += `Cancelling this booking will:\n\n`;
    warningMessage += `• Issue a full refund to the client (£${(refundCalc.clientRefund / 100).toFixed(2)})\n`;
    warningMessage += `• Deduct ${Math.abs(refundCalc.caasImpact)} CaaS points from your score\n`;
    warningMessage += `• Negatively impact your tutor rating and reliability score\n\n`;

    if (lateCancellationCount > 0) {
      warningMessage += `⚠️ PREVIOUS CANCELLATIONS: ${lateCancellationCount} in the last 30 days\n\n`;
    }

    if (isRepeat) {
      warningMessage += `🚨 WARNING: Repeated cancellations may result in account suspension.\n\n`;
    }

    warningMessage += `Are you absolutely sure you need to cancel?`;
  }

  return {
    refundAmount: refundCalc.clientRefund,
    penaltyAmount: cancelledBy === 'client' && hoursUntilSession < 24 ? booking.amount : 0,
    caasImpact: refundCalc.caasImpact,
    warningMessage,
    isRepeatOffender: isRepeat,
    previousLateCancellations: lateCancellationCount,
    canProceed: true, // Always allow cancellation, but show warnings
  };
}

/**
 * Processes a cancellation including recording penalties
 *
 * @param booking Booking object
 * @param cancelledBy Who is cancelling
 * @param hoursUntilSession Hours until session
 * @returns Penalty result
 */
export async function processCancellation(
  booking: {
    id: string;
    amount: number;
    client_id: string;
    tutor_id: string;
  },
  cancelledBy: CancellationActor,
  hoursUntilSession: number
): Promise<CancellationPenaltyResult> {
  const result = await calculateCancellationPenalty(booking, cancelledBy, hoursUntilSession);

  const penalizedUserId = cancelledBy === 'client' ? booking.client_id : booking.tutor_id;

  // Record penalty if it's a late cancellation
  if (cancelledBy === 'client' && hoursUntilSession < CANCELLATION_POLICY.CLIENT_FULL_REFUND_THRESHOLD) {
    await recordCancellationPenalty(
      penalizedUserId,
      booking.id,
      result.isRepeatOffender ? 'repeat_offender' : 'late_cancel',
      booking.amount
    );
  }

  // Record tutor cancellation penalty
  if (cancelledBy === 'tutor') {
    await recordCancellationPenalty(
      penalizedUserId,
      booking.id,
      'late_cancel',
      Math.abs(result.caasImpact)
    );
  }

  return result;
}

/**
 * Gets cancellation penalty history for a user
 *
 * @param userId User ID
 * @param limit Number of records to return
 * @returns Array of penalty records
 */
export async function getCancellationHistory(
  userId: string,
  limit: number = 10
): Promise<Array<{
  id: string;
  booking_id: string;
  penalty_type: string;
  penalty_amount: number;
  applied_at: string;
}>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('cancellation_penalties')
    .select('*')
    .eq('user_id', userId)
    .order('applied_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Penalty Calculator] Error fetching history:', error);
    return [];
  }

  return data || [];
}
