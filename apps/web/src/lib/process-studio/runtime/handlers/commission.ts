/**
 * Handler: commission.query_available
 * Queries transactions with status='available' grouped by profile_id.
 * Filters to the minimum payout threshold per creator.
 *
 * handler_config: { min?: number }  — minimum balance to include (default £25)
 *
 * Context inputs:  (none required — reads from DB)
 * Context outputs: {
 *   creators: Array<{ profile_id, stripe_account_id, email, full_name, balance, transaction_ids }>,
 *   payout_count: number,      — number of creators above threshold (for rules.evaluate)
 *   total_payout_amount: number
 * }
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
