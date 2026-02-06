/**
 * Filename: apps/web/src/lib/booking-policies/cancellation.ts
 * Purpose: Cancellation and refund policy configuration
 * Created: 2026-02-06
 *
 * Policy Summary:
 * - Client cancels 24h+: 100% refund
 * - Client cancels <24h: No refund (tutor protected)
 * - Tutor cancels (anytime): 100% refund + CaaS penalty
 * - Tutor no-show: 100% refund + major CaaS penalty
 */

export const CANCELLATION_POLICY = {
  // Time threshold for client cancellations (hours)
  CLIENT_FULL_REFUND_THRESHOLD: 24,

  // Client cancellation rules
  client: {
    beforeThreshold: {
      refundPercent: 100,
      tutorPayoutPercent: 0,
      description: '24+ hours notice: Full refund'
    },
    afterThreshold: {
      refundPercent: 0,
      tutorPayoutPercent: 100,
      description: 'Less than 24 hours notice: No refund'
    },
    noShow: {
      refundPercent: 0,
      tutorPayoutPercent: 100,
      description: 'Client no-show: No refund'
    }
  },

  // Tutor cancellation rules (SIMPLIFIED)
  tutor: {
    cancellation: {
      refundPercent: 100,      // Always full refund
      caasImpact: -10,         // CaaS points deduction
      description: 'Tutor cancels: Full refund to client + CaaS penalty'
    },
    noShow: {
      refundPercent: 100,      // Always full refund
      caasImpact: -50,         // Major CaaS penalty
      description: 'Tutor no-show: Full refund to client + major CaaS penalty'
    }
  }
} as const;

export type CancellationActor = 'client' | 'tutor';
export type CancellationReason = 'no-show' | 'cancelled';

export interface RefundCalculation {
  clientRefund: number;
  clientCredit: number;
  tutorPayout: number;
  tutorPenalty: number;
  caasImpact: number;
  policyApplied: string;
  description: string;
}

/**
 * Calculate refund based on cancellation policy
 * @param bookingAmount - Total booking amount in pounds
 * @param hoursUntilSession - Hours until session start time
 * @param cancelledBy - Who initiated the cancellation
 * @param reason - Reason for cancellation
 * @returns RefundCalculation object with all financial impacts
 */
export function calculateRefund(
  bookingAmount: number,
  hoursUntilSession: number,
  cancelledBy: CancellationActor,
  reason: CancellationReason = 'cancelled'
): RefundCalculation {
  if (cancelledBy === 'tutor') {
    // Tutor cancellations: Always full refund + CaaS penalty
    const policy = reason === 'no-show'
      ? CANCELLATION_POLICY.tutor.noShow
      : CANCELLATION_POLICY.tutor.cancellation;

    return {
      clientRefund: bookingAmount,
      clientCredit: 0,           // No extra credit
      tutorPayout: 0,            // No payout
      tutorPenalty: 0,           // No monetary penalty
      caasImpact: policy.caasImpact,
      policyApplied: reason === 'no-show' ? 'tutor_no_show' : 'tutor_cancellation',
      description: policy.description
    };
  }

  // Client cancellations: Time-based
  const isBeforeThreshold = hoursUntilSession >= CANCELLATION_POLICY.CLIENT_FULL_REFUND_THRESHOLD;

  let policy;
  let policyApplied;

  if (reason === 'no-show') {
    policy = CANCELLATION_POLICY.client.noShow;
    policyApplied = 'client_no_show';
  } else if (isBeforeThreshold) {
    policy = CANCELLATION_POLICY.client.beforeThreshold;
    policyApplied = 'client_24h+';
  } else {
    policy = CANCELLATION_POLICY.client.afterThreshold;
    policyApplied = 'client_<24h';
  }

  return {
    clientRefund: (bookingAmount * policy.refundPercent) / 100,
    clientCredit: 0,
    tutorPayout: (bookingAmount * policy.tutorPayoutPercent) / 100,
    tutorPenalty: 0,
    caasImpact: 0,  // No CaaS impact for client cancellations
    policyApplied,
    description: policy.description
  };
}

/**
 * Get human-readable policy description for display
 * @param hoursUntilSession - Hours until session start time
 * @param amount - Booking amount
 * @returns Formatted policy description
 */
export function getCancellationPolicyPreview(
  hoursUntilSession: number,
  amount: number
): {
  clientRefund: string;
  tutorPayout: string;
  warning: string | null;
} {
  const isBeforeThreshold = hoursUntilSession >= CANCELLATION_POLICY.CLIENT_FULL_REFUND_THRESHOLD;

  if (isBeforeThreshold) {
    return {
      clientRefund: `£${amount.toFixed(2)} (100% refund)`,
      tutorPayout: '£0.00',
      warning: null
    };
  } else {
    return {
      clientRefund: '£0.00 (No refund)',
      tutorPayout: `£${amount.toFixed(2)} (Tutor receives full payment)`,
      warning: `Less than 24 hours notice - cancellation fee applies`
    };
  }
}
