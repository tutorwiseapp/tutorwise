/**
 * Commission handlers:
 *
 * commission.query_available
 *   Queries transactions with status='available' grouped by profile_id.
 *   handler_config: { min?: number }  — minimum balance (default £25)
 *   Context inputs:  (none required — reads from DB)
 *   Context outputs: { creators: [...], payout_count, total_payout_amount }
 *
 * commission.create
 *   Calls the handle_successful_payment Supabase RPC for a booking.
 *   Creates clearing transactions (7-day hold) for all commission splits.
 *   This is the Booking Lifecycle version — does NOT pay out, just records commission.
 *   Context inputs:  { booking_id: string, checkout_session_id?: string }
 *   Context outputs: { transaction_id, commission_created }
 *
 * commission.void
 *   Voids all clearing transactions for a booking (cancellation path).
 *   Context inputs:  { booking_id: string }
 *   Context outputs: { voided_count, voided }
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

const DEFAULT_MIN_PAYOUT = 25; // £25

export async function handleCommissionQueryAvailable(
  _context: HandlerContext,
  opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const minPayout = (opts.handlerConfig?.min as number | undefined) ?? DEFAULT_MIN_PAYOUT;

  const supabase = createServiceRoleClient();

  // Fetch all available commission/payout transactions
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('id, profile_id, amount, type, status')
    .eq('status', 'available')
    .in('type', ['Referral Commission', 'Agent Commission', 'Tutoring Payout']);

  if (error) {
    throw new Error(`commission.query_available: DB error — ${error.message}`);
  }

  if (!transactions || transactions.length === 0) {
    return { creators: [], payout_count: 0, total_payout_amount: 0 };
  }

  // Group by profile_id
  const grouped = new Map<string, { total: number; txIds: string[] }>();
  for (const tx of transactions) {
    if (!tx.profile_id) continue;
    const entry = grouped.get(tx.profile_id) ?? { total: 0, txIds: [] };
    entry.total += tx.amount ?? 0;
    entry.txIds.push(tx.id);
    grouped.set(tx.profile_id, entry);
  }

  // Filter to creators above minimum threshold
  const eligibleProfileIds = [...grouped.entries()]
    .filter(([, v]) => v.total >= minPayout)
    .map(([profileId]) => profileId);

  if (eligibleProfileIds.length === 0) {
    return { creators: [], payout_count: 0, total_payout_amount: 0 };
  }

  // Fetch profile details
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, stripe_account_id')
    .in('id', eligibleProfileIds);

  if (profileError) {
    throw new Error(`commission.query_available: profile fetch error — ${profileError.message}`);
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const creators = eligibleProfileIds
    .map((profileId) => {
      const profile = profileMap.get(profileId);
      const entry = grouped.get(profileId)!;
      return {
        profile_id: profileId,
        stripe_account_id: profile?.stripe_account_id ?? null,
        email: profile?.email ?? null,
        full_name: profile?.full_name ?? null,
        balance: entry.total,
        transaction_ids: entry.txIds,
      };
    })
    .filter((c) => c.stripe_account_id); // only creators with a Stripe Connect account

  const totalAmount = creators.reduce((sum, c) => sum + c.balance, 0);

  console.log(
    `[commission.query_available] Found ${creators.length} eligible creators, total £${totalAmount.toFixed(2)}`
  );

  return {
    creators,
    payout_count: creators.length,
    total_payout_amount: totalAmount,
  };
}

// ---------------------------------------------------------------------------
// commission.create
// Calls handle_successful_payment RPC to create clearing transactions for all
// commission splits (platform 10%, agent 20%, referrer 10%, tutor remainder).
// This creates 'clearing' status transactions — NOT the payout itself.
// The payout happens later via the Commission Payout weekly workflow.
// ---------------------------------------------------------------------------

export async function handleCommissionCreate(
  context: HandlerContext,
  _opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const bookingId = context.booking_id as string | undefined;
  if (!bookingId) throw new Error('commission.create: booking_id required in context');

  const checkoutSessionId = (context.checkout_session_id as string | undefined) ?? null;

  const supabase = createServiceRoleClient();

  // Call the handle_successful_payment RPC — creates all commission split transactions
  const { error } = await supabase.rpc('handle_successful_payment', {
    p_booking_id: bookingId,
    p_stripe_checkout_id: checkoutSessionId,
  });

  if (error) {
    throw new Error(`commission.create: RPC failed for booking ${bookingId} — ${error.message}`);
  }

  // Fetch the newly created transactions for context
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, type, amount, status')
    .eq('booking_id', bookingId)
    .in('status', ['clearing', 'available', 'paid_out']);

  const tutorTx = transactions?.find((t) => t.type === 'Tutoring Payout');

  console.log(
    `[commission.create] Commission created for booking ${bookingId}. ` +
    `${transactions?.length ?? 0} transactions. Tutor payout: £${tutorTx?.amount?.toFixed(2) ?? '0'}`
  );

  return {
    commission_created: true,
    transaction_count: transactions?.length ?? 0,
    tutor_transaction_id: tutorTx?.id ?? null,
  };
}

// ---------------------------------------------------------------------------
// commission.void
// Voids all clearing transactions for a booking (used in cancellation path).
// Does NOT touch paid_out transactions — those require a Stripe refund first.
// ---------------------------------------------------------------------------

export async function handleCommissionVoid(
  context: HandlerContext,
  _opts: HandlerOptions
): Promise<Record<string, unknown>> {
  const bookingId = context.booking_id as string | undefined;
  if (!bookingId) throw new Error('commission.void: booking_id required in context');

  const supabase = createServiceRoleClient();

  const { data: voidedRows, error } = await supabase
    .from('transactions')
    .update({ status: 'void' })
    .eq('booking_id', bookingId)
    .eq('status', 'clearing')
    .select('id');

  if (error) {
    throw new Error(`commission.void: failed to void transactions for booking ${bookingId} — ${error.message}`);
  }

  const count = voidedRows?.length ?? 0;
  console.log(`[commission.void] Voided ${count} clearing transactions for booking ${bookingId}`);

  return { voided_count: count, voided: count > 0 };
}
