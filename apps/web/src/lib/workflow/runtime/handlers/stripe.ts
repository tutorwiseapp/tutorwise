/**
 * Stripe handlers:
 *
 * stripe.charge
 *   Creates a Stripe Checkout Session for a booking. Webhook-mode: suspends until
 *   checkout.session.completed fires. Used in Booking Lifecycle workflows.
 *   Context inputs:  { booking_id: string }
 *   Context outputs: { checkout_session_id, payment_intent_id, checkout_url }
 *
 * stripe.refund
 *   Issues a full refund for a booking via Stripe.
 *   Context inputs:  { payment_intent_id: string }
 *   Context outputs: { refund_id, status }
 *
 * stripe.validate_connect_account
 *   Context inputs:  { stripe_account_id: string } OR { creators: Creator[] }
 *   Context outputs: { account_ready: boolean, reason?: string }
 *
 * stripe.connect_payout
 *   Processes ALL eligible creators from context.creators (set by commission.query_available).
 *   Uses idempotency keys per creator to prevent double payouts.
 *   Context inputs:  { creators: Creator[], execution_id: string }
 *   Context outputs: { payouts_processed: number, payouts_failed: number, payout_results: PayoutResult[] }
 */

import { stripe } from '@/lib/stripe';
import { canReceivePayouts, createConnectPayout } from '@/lib/stripe/payouts';
import { createServiceRoleClient } from '@/utils/supabase/server';
import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

// ---------------------------------------------------------------------------
// stripe.charge
// Creates a Stripe Checkout Session for the booking and suspends (webhook-mode).
// Phase 4 live: the Stripe webhook resumes the execution on checkout.session.completed.
// ---------------------------------------------------------------------------

export async function handleStripeCharge(
  context: HandlerContext,
  opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const bookingId = context.booking_id as string | undefined;
  if (!bookingId) throw new Error('stripe.charge: booking_id required in context');

  const supabase = createServiceRoleClient();

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      id, amount, service_name, client_id, tutor_id,
      tutor:tutor_id(stripe_account_id)
    `)
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    throw new Error(`stripe.charge: booking ${bookingId} not found — ${error?.message}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tutorwise.io';
  const tutorAccount = (booking.tutor as unknown as { stripe_account_id?: string } | null);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'gbp',
          product_data: { name: booking.service_name },
          unit_amount: Math.round((booking.amount as number) * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: bookingId,
      execution_id: opts.executionId,
      node_id: opts.nodeId,
    },
    success_url: `${appUrl}/bookings?payment=success`,
    cancel_url: `${appUrl}/bookings?payment=cancel`,
    ...(tutorAccount?.stripe_account_id
      ? {
          payment_intent_data: {
            application_fee_amount: Math.round((booking.amount as number) * 10),
            transfer_data: { destination: tutorAccount.stripe_account_id },
          },
        }
      : {}),
  });

  console.log(`[stripe.charge] Created checkout session ${session.id} for booking ${bookingId}`);

  return {
    checkout_session_id: session.id,
    payment_intent_id: session.payment_intent as string ?? null,
    checkout_url: session.url,
  };
}

// ---------------------------------------------------------------------------
// stripe.refund
// Issues a full refund for a payment intent. Used in cancellation paths.
// Idempotency key is required (enforced in NodeHandlerRegistry).
// ---------------------------------------------------------------------------

export async function handleStripeRefund(
  context: HandlerContext,
  opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const paymentIntentId = context.payment_intent_id as string | undefined;
  if (!paymentIntentId) throw new Error('stripe.refund: payment_intent_id required in context');

  const idempotencyKey = opts.idempotencyKey ?? `refund:${opts.executionId}:${opts.nodeId}`;

  const refund = await stripe.refunds.create(
    { payment_intent: paymentIntentId },
    { idempotencyKey }
  );

  console.log(`[stripe.refund] Refund ${refund.id} for payment_intent ${paymentIntentId} — status: ${refund.status}`);

  return { refund_id: refund.id, status: refund.status };
}

interface Creator {
  profile_id: string;
  stripe_account_id: string | null;
  email: string | null;
  full_name: string | null;
  balance: number;
  transaction_ids: string[];
}

// ---------------------------------------------------------------------------
// stripe.validate_connect_account
// ---------------------------------------------------------------------------

export async function handleStripeValidateConnectAccount(
  context: HandlerContext,
  _opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const accountId = context.stripe_account_id as string | undefined;

  if (!accountId) {
    // May be called before creator loop — just pass through
    return { account_ready: true };
  }

  const result = await canReceivePayouts(accountId);

  return {
    account_ready: result.ready,
    account_ready_reason: result.reason ?? null,
  };
}

// ---------------------------------------------------------------------------
// stripe.connect_payout
// Processes all creators from context.creators in a single handler call.
// Idempotency key per creator: {execution_id}:{node_id}:{profile_id}
// ---------------------------------------------------------------------------

export async function handleStripeConnectPayout(
  context: HandlerContext,
  opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const creators = (context.creators as Creator[] | undefined) ?? [];

  if (creators.length === 0) {
    return { payouts_processed: 0, payouts_failed: 0, payout_results: [] };
  }

  const supabase = createServiceRoleClient();

  const results: Array<{
    profile_id: string;
    success: boolean;
    payout_id?: string;
    amount?: number;
    error?: string;
  }> = [];

  for (const creator of creators) {
    if (!creator.stripe_account_id) {
      results.push({ profile_id: creator.profile_id, success: false, error: 'no_stripe_account' });
      continue;
    }

    // Validate account before attempting payout
    const canPay = await canReceivePayouts(creator.stripe_account_id);
    if (!canPay.ready) {
      results.push({
        profile_id: creator.profile_id,
        success: false,
        error: `account_not_ready: ${canPay.reason}`,
      });
      continue;
    }

    // Idempotency key: enforced per creator per execution
    const idempotencyKey = `${opts.executionId}:${opts.nodeId}:${creator.profile_id}`;
    const description = `TutorWise commission payout — ${creator.full_name ?? creator.profile_id}`;

    try {
      const payout = await createConnectPayout(
        creator.stripe_account_id,
        creator.balance,
        description,
        idempotencyKey
      );

      if (payout.success && payout.payoutId) {
        // Mark transactions as paid_out
        await supabase
          .from('transactions')
          .update({
            status: 'paid_out',
            stripe_payout_id: payout.payoutId,
            paid_out_at: new Date().toISOString(),
          })
          .in('id', creator.transaction_ids);

        results.push({
          profile_id: creator.profile_id,
          success: true,
          payout_id: payout.payoutId,
          amount: creator.balance,
        });

        console.log(
          `[stripe.connect_payout] Paid £${creator.balance.toFixed(2)} to ${creator.profile_id} — payout: ${payout.payoutId}`
        );
      } else {
        results.push({
          profile_id: creator.profile_id,
          success: false,
          error: payout.error ?? 'payout_failed',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ profile_id: creator.profile_id, success: false, error: message });
      console.error(`[stripe.connect_payout] Error for ${creator.profile_id}:`, err);
    }
  }

  const processed = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  // Expose payout amounts for the notification handler
  const totalPaid = processed.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const payoutIds = processed.map((r) => r.payout_id).filter(Boolean);

  return {
    payouts_processed: processed.length,
    payouts_failed: failed.length,
    payout_results: results,
    // For notification.send context:
    payout_amount: totalPaid,
    payout_id: payoutIds.join(', '),
    // Enrich creators with their payout results for per-creator notifications
    creators_paid: processed.map((r) => ({
      profile_id: r.profile_id,
      payout_id: r.payout_id,
      amount: r.amount,
    })),
  };
}
