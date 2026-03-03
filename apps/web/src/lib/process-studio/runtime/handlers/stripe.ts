/**
 * Handlers: stripe.validate_connect_account + stripe.connect_payout
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

import { canReceivePayouts, createConnectPayout } from '@/lib/stripe/payouts';
import { createServiceRoleClient } from '@/utils/supabase/server';
import type { HandlerContext, HandlerOptions } from '../NodeHandlerRegistry';

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
