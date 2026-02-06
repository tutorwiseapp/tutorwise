/**
 * Filename: apps/web/src/app/api/cron/process-batch-payouts/route.ts
 * Purpose: Weekly batch payout processor for referral commissions
 * Created: 2025-02-05
 *
 * Called by pg_cron every Friday at 10:00 AM UTC to automatically
 * pay out all available referral commissions to agents.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createConnectPayout, canReceivePayouts } from '@/lib/stripe/payouts';
import { sendPayoutProcessedEmail } from '@/lib/email/commission-available';

export const dynamic = 'force-dynamic';

const MIN_PAYOUT_AMOUNT = 25; // £25 minimum

interface ProfileBalance {
  profileId: string;
  total: number;
  txIds: string[];
  profile: {
    stripe_account_id: string | null;
    full_name: string | null;
    email: string | null;
  } | null;
}

/**
 * GET /api/cron/process-batch-payouts
 * Processes weekly batch payouts for all available referral commissions
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Batch Payout] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    console.log('[Batch Payout] Starting weekly payout processing');

    // Get all available referral commissions grouped by profile
    const { data: availableCommissions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        profile_id,
        amount,
        profile:profiles!profile_id(
          id,
          stripe_account_id,
          full_name,
          email
        )
      `)
      .eq('type', 'Referral Commission')
      .eq('status', 'available');

    if (error) {
      console.error('[Batch Payout] Failed to fetch available commissions:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!availableCommissions || availableCommissions.length === 0) {
      console.log('[Batch Payout] No available commissions to process');
      return NextResponse.json({ success: true, processed: 0, totalAmount: 0 });
    }

    // Group by profile and calculate totals
    const profileBalances = new Map<string, ProfileBalance>();

    for (const tx of availableCommissions) {
      // Supabase returns joined data as array, get first element
      const profileData = Array.isArray(tx.profile) ? tx.profile[0] : tx.profile;
      const existing = profileBalances.get(tx.profile_id) || {
        profileId: tx.profile_id,
        total: 0,
        txIds: [],
        profile: profileData as ProfileBalance['profile'],
      };

      profileBalances.set(tx.profile_id, {
        ...existing,
        total: existing.total + tx.amount,
        txIds: [...existing.txIds, tx.id],
      });
    }

    console.log(`[Batch Payout] Processing ${profileBalances.size} profiles`);

    const results = {
      processed: 0,
      skippedBelowMin: 0,
      skippedNoStripe: 0,
      skippedNotReady: 0,
      failed: 0,
      totalAmount: 0,
    };

    // Process each profile
    for (const [profileId, balanceInfo] of profileBalances.entries()) {
      const { total, txIds, profile } = balanceInfo;

      // Skip if below minimum
      if (total < MIN_PAYOUT_AMOUNT) {
        console.log(`[Batch Payout] Profile ${profileId}: £${total.toFixed(2)} below minimum £${MIN_PAYOUT_AMOUNT}`);
        results.skippedBelowMin++;
        continue;
      }

      // Check Stripe Connect account
      if (!profile?.stripe_account_id) {
        console.warn(`[Batch Payout] Profile ${profileId}: No Stripe Connect account`);
        results.skippedNoStripe++;
        continue;
      }

      // Verify account can receive payouts
      const { ready, reason } = await canReceivePayouts(profile.stripe_account_id);
      if (!ready) {
        console.warn(`[Batch Payout] Profile ${profileId}: Cannot receive payouts - ${reason}`);
        results.skippedNotReady++;
        continue;
      }

      try {
        // Create payout
        const idempotencyKey = `batch_payout_${profileId}_${new Date().toISOString().split('T')[0]}`;

        const payoutResult = await createConnectPayout(
          profile.stripe_account_id,
          total,
          'Weekly referral commission payout',
          idempotencyKey
        );

        if (!payoutResult.success) {
          console.error(`[Batch Payout] Profile ${profileId}: Payout failed - ${payoutResult.error}`);

          // Mark transactions with error but don't change status
          // They'll be retried next week
          await supabase
            .from('transactions')
            .update({
              metadata: {
                last_payout_error: payoutResult.error,
                last_payout_attempt: new Date().toISOString(),
              },
            })
            .in('id', txIds);

          results.failed++;
          continue;
        }

        // Success! Update all transactions to paid_out
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            status: 'paid_out',
            stripe_payout_id: payoutResult.payoutId,
            paid_out_at: new Date().toISOString(),
          })
          .in('id', txIds);

        if (updateError) {
          console.error(`[Batch Payout] Failed to update transactions for ${profileId}:`, updateError);
          // Non-critical - payout was successful
        }

        console.log(`[Batch Payout] Profile ${profileId}: £${total.toFixed(2)} paid (${payoutResult.payoutId})`);
        results.processed++;
        results.totalAmount += total;

        // Send confirmation email
        if (profile.email) {
          try {
            await sendPayoutProcessedEmail({
              to: profile.email,
              userName: profile.full_name || 'there',
              amount: total,
              estimatedArrival: payoutResult.estimatedArrival,
              payoutId: payoutResult.payoutId,
            });
          } catch (emailErr) {
            console.error(`[Batch Payout] Failed to send email for ${profileId}:`, emailErr);
          }
        }
      } catch (payoutError) {
        console.error(`[Batch Payout] Error processing profile ${profileId}:`, payoutError);
        results.failed++;
      }
    }

    console.log('[Batch Payout] Complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('[Batch Payout] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
