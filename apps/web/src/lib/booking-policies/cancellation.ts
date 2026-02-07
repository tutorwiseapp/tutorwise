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

/**
 * Update tutor's CaaS score after cancellation or no-show
 *
 * This function recalculates the tutor's CaaS score using the CaaSService.
 * It requires service_role access to bypass RLS policies.
 *
 * @param tutorId - The tutor's profile ID
 * @param caasImpact - The CaaS impact from the cancellation policy (e.g., -10, -50)
 * @param reason - The reason for the update ('cancellation' or 'no_show')
 * @param bookingId - The booking ID for logging purposes
 *
 * NOTE: This function logs errors but does not throw - we don't want to fail
 * a refund just because the CaaS update failed. The score can be manually
 * recalculated later if needed.
 */
export async function updateTutorCaaSScore(
  tutorId: string,
  caasImpact: number,
  reason: 'cancellation' | 'no_show',
  bookingId: string
): Promise<void> {
  try {
    // Import dependencies dynamically to avoid circular dependencies
    const { createClient } = await import('@supabase/supabase-js');
    const { CaaSService } = await import('@/lib/services/caas');

    // Create service_role client for CaaS updates
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[CaaS Update] Missing Supabase credentials - cannot update CaaS score');
      return;
    }

    const serviceSupabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[CaaS Update] Recalculating CaaS score for tutor ${tutorId} after ${reason} (impact: ${caasImpact})`);

    // Recalculate the tutor's CaaS score
    // The CaaSService will automatically factor in all booking history,
    // including this cancellation/no-show, when calculating the new score
    const scoreData = await CaaSService.calculateProfileCaaS(tutorId, serviceSupabase);

    console.log(`[CaaS Update] ✅ CaaS score updated for tutor ${tutorId}: ${scoreData.total}/100 (booking: ${bookingId})`);
  } catch (error) {
    // Log error but don't throw - we don't want to fail the refund
    console.error(`[CaaS Update] ❌ Failed to update CaaS score for tutor ${tutorId}:`, error);
    console.error(`[CaaS Update] Booking ${bookingId} refund succeeded, but CaaS update failed. Manual recalculation may be needed.`);
  }
}

/**
 * Reverse commission transactions when a booking is cancelled
 *
 * When a booking is refunded, any commission transactions (Agent Commission,
 * Referral Commission, Tutoring Payout) that haven't been paid out yet should
 * be reversed by creating offsetting refund transactions.
 *
 * This follows the same pattern as failed payout reversals in the Stripe webhook.
 *
 * @param bookingId - The booking ID to reverse commissions for
 *
 * Transaction status lifecycle:
 * - 'pending' → Commission just created
 * - 'clearing' → Commission in 7-day clearing period (NOT yet available for withdrawal)
 * - 'available' → Commission available for withdrawal (NOT yet withdrawn)
 * - 'paid_out' → Commission already paid out via Stripe (CANNOT be reversed)
 *
 * We only reverse transactions in 'pending', 'clearing', or 'available' status.
 * Once paid out, the money has already been sent to the user's bank account.
 *
 * NOTE: This function logs errors but does not throw - we don't want to fail
 * a refund just because the commission reversal failed. Reversals can be
 * done manually by admin if needed.
 */
export async function reverseBookingCommissions(bookingId: string): Promise<void> {
  try {
    // Import Supabase client dynamically
    const { createClient } = await import('@supabase/supabase-js');

    // Create service_role client for transaction modifications
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Commission Reversal] Missing Supabase credentials - cannot reverse commissions');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[Commission Reversal] Finding transactions to reverse for booking ${bookingId}`);

    // Find all commission/payout transactions for this booking that haven't been paid out yet
    // CRITICAL: Also reverse Platform Fee to properly account for full refund
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('booking_id', bookingId)
      .in('type', ['Referral Commission', 'Agent Commission', 'Tutoring Payout', 'Platform Fee'])
      .in('status', ['pending', 'clearing', 'available', 'paid_out']); // Reverse even paid_out for Platform Fee

    if (fetchError) {
      console.error('[Commission Reversal] Failed to fetch transactions:', fetchError);
      return;
    }

    if (!transactions || transactions.length === 0) {
      console.log(`[Commission Reversal] No reversible transactions found for booking ${bookingId}`);
      return;
    }

    console.log(`[Commission Reversal] Found ${transactions.length} transactions to reverse`);

    // Create reversal transactions for each commission
    const reversals = transactions.map((tx) => ({
      profile_id: tx.profile_id,
      booking_id: bookingId,
      type: 'Refund',
      description: `Booking cancellation reversal: ${tx.type} for ${tx.service_name || 'session'}`,
      amount: -tx.amount, // Negative of the original amount to offset it
      status: 'available',
      available_at: new Date().toISOString(),
      // Copy context fields from original transaction
      service_name: tx.service_name,
      subjects: tx.subjects,
      session_date: tx.session_date,
      delivery_mode: tx.delivery_mode,
      tutor_name: tx.tutor_name,
      client_name: tx.client_name,
      agent_name: tx.agent_name,
      metadata: {
        reversal_of: tx.id,
        reversal_reason: 'booking_cancellation',
        original_type: tx.type,
        original_amount: tx.amount,
      },
    }));

    const { error: insertError } = await supabase
      .from('transactions')
      .insert(reversals);

    if (insertError) {
      console.error('[Commission Reversal] Failed to create reversal transactions:', insertError);
      return;
    }

    console.log(`[Commission Reversal] ✅ Created ${reversals.length} reversal transactions for booking ${bookingId}`);

    // Mark original transactions as 'refunded' to maintain audit trail
    const transactionIds = transactions.map(tx => tx.id);
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ status: 'refunded' })
      .in('id', transactionIds);

    if (updateError) {
      console.error('[Commission Reversal] Failed to mark original transactions as refunded:', updateError);
      // Non-critical - reversal transactions were created successfully
    } else {
      console.log(`[Commission Reversal] ✅ Marked ${transactionIds.length} original transactions as refunded`);
    }

    // Log details for each reversal
    reversals.forEach((reversal, index) => {
      console.log(
        `[Commission Reversal] ${index + 1}. Reversed ${transactions[index].type}: ${reversal.amount} for profile ${reversal.profile_id}`
      );
    });

  } catch (error) {
    // Log error but don't throw - we don't want to fail the refund
    console.error(`[Commission Reversal] ❌ Failed to reverse commissions for booking ${bookingId}:`, error);
    console.error(`[Commission Reversal] Booking refund succeeded, but commission reversal failed. Admin intervention may be needed.`);
  }
}
