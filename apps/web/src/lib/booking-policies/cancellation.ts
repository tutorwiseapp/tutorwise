/**
 * Filename: apps/web/src/lib/booking-policies/cancellation.ts
 * Purpose: Cancellation and refund policy configuration
 * Created: 2026-02-06
 * Updated: 2026-02-06 - Updated to official UK/EU Stripe rates
 *
 * Policy Summary:
 * - Client cancels 24h+: 100% refund (minus Stripe processing fee ~1.7%)
 * - Client cancels <24h: No refund (tutor protected)
 * - Tutor cancels (anytime): 100% refund (minus Stripe fee) + CaaS penalty
 * - Tutor no-show: 100% refund (minus Stripe fee) + major CaaS penalty
 *
 * Stripe Fee Policy (UK/EU Cards):
 * - Stripe charges 1.5% + £0.20 per transaction (UK/European cards)
 * - Stripe does NOT refund processing fees when issuing refunds
 * - Refunds are calculated on the net amount (after Stripe fees)
 * - This protects the platform from absorbing Stripe costs
 * - Source: https://stripe.com/gb/pricing
 */

export const CANCELLATION_POLICY = {
  // Stripe processing fee structure (UK/EU cards - official rates)
  STRIPE_FEE_PERCENT: 1.5,
  STRIPE_FEE_FIXED: 0.20, // £0.20 in GBP

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
  clientRefund: number;         // Amount refunded to client (net after Stripe fees)
  clientRefundGross: number;     // Original amount before Stripe fees
  stripeFee: number;             // Stripe processing fee (non-refundable)
  clientCredit: number;
  tutorPayout: number;
  tutorPenalty: number;
  caasImpact: number;
  policyApplied: string;
  description: string;
}

/**
 * Calculate Stripe processing fee
 * Stripe UK/EU rate: 1.5% + £0.20
 * @param amount - Transaction amount in pounds
 * @returns Stripe fee amount
 */
export function calculateStripeFee(amount: number): number {
  return (amount * CANCELLATION_POLICY.STRIPE_FEE_PERCENT / 100) + CANCELLATION_POLICY.STRIPE_FEE_FIXED;
}

/**
 * Calculate net refund amount (after Stripe fees)
 * When a £100 payment is refunded, Stripe keeps their fee (~£1.70)
 * So the client gets back ~£98.30
 * @param grossAmount - Original payment amount
 * @returns Net refund amount (what client actually receives)
 */
export function calculateNetRefund(grossAmount: number): number {
  const stripeFee = calculateStripeFee(grossAmount);
  return grossAmount - stripeFee;
}

/**
 * Calculate refund based on cancellation policy
 * @param bookingAmount - Total booking amount in pounds
 * @param hoursUntilSession - Hours until session start time
 * @param cancelledBy - Who initiated the cancellation
 * @param reason - Reason for cancellation
 * @returns RefundCalculation object with all financial impacts
 *
 * IMPORTANT: Refunds are NET amounts (after Stripe fees)
 * - Stripe keeps their processing fee (1.5% + £0.20) when refunds are issued
 * - Client receives back the amount minus Stripe's fee
 * - This protects the platform from absorbing Stripe costs
 */
export function calculateRefund(
  bookingAmount: number,
  hoursUntilSession: number,
  cancelledBy: CancellationActor,
  reason: CancellationReason = 'cancelled'
): RefundCalculation {
  const stripeFee = calculateStripeFee(bookingAmount);

  if (cancelledBy === 'tutor') {
    // Tutor cancellations: Always full refund (minus Stripe fee) + CaaS penalty
    const policy = reason === 'no-show'
      ? CANCELLATION_POLICY.tutor.noShow
      : CANCELLATION_POLICY.tutor.cancellation;

    const netRefund = calculateNetRefund(bookingAmount);

    return {
      clientRefund: netRefund,                // Net amount (after Stripe fee)
      clientRefundGross: bookingAmount,       // Original amount
      stripeFee: stripeFee,                   // Non-refundable Stripe fee
      clientCredit: 0,                        // No extra credit
      tutorPayout: 0,                         // No payout
      tutorPenalty: 0,                        // No monetary penalty
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

  const refundGrossAmount = (bookingAmount * policy.refundPercent) / 100;
  const refundNetAmount = policy.refundPercent === 100
    ? calculateNetRefund(refundGrossAmount)  // Deduct Stripe fee for full refunds
    : refundGrossAmount;  // No refund = no Stripe fee deduction needed

  return {
    clientRefund: refundNetAmount,           // Net refund (after Stripe fee if applicable)
    clientRefundGross: refundGrossAmount,    // Original refund amount
    stripeFee: policy.refundPercent === 100 ? stripeFee : 0,  // Only applies if refund issued
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
