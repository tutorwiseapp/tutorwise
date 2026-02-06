/**
 * Filename: apps/web/src/app/api/cron/process-pending-commissions/route.ts
 * Purpose: Transition Pending → Available commissions after 7-day clearing period
 * Created: 2025-02-05
 *
 * Called by pg_cron every hour to process pending referral commissions
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendCommissionAvailableEmail } from '@/lib/email/commission-available';

export const dynamic = 'force-dynamic';

const CLEARING_PERIOD_DAYS = 7;

/**
 * GET /api/cron/process-pending-commissions
 * Transitions Pending referral commissions to Available after 7-day clearing period
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Process Pending] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    const clearingCutoff = new Date(Date.now() - CLEARING_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    console.log('[Process Pending] Looking for commissions older than:', clearingCutoff.toISOString());

    // Find all Pending transactions past clearing period
    const { data: pendingTransactions, error } = await supabase
      .from('transactions')
      .select(`
        id,
        profile_id,
        amount,
        booking_id,
        created_at,
        profile:profiles!profile_id(id, full_name, email)
      `)
      .eq('type', 'Referral Commission')
      .eq('status', 'clearing')
      .lt('created_at', clearingCutoff.toISOString());

    if (error) {
      console.error('[Process Pending] Failed to fetch pending commissions:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!pendingTransactions || pendingTransactions.length === 0) {
      console.log('[Process Pending] No pending commissions to process');
      return NextResponse.json({ success: true, processed: 0 });
    }

    console.log(`[Process Pending] Processing ${pendingTransactions.length} pending commissions`);

    const results = {
      processed: 0,
      errors: 0,
      emailsSent: 0,
    };

    for (const tx of pendingTransactions) {
      try {
        // Update status to Available
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            status: 'available',
            available_at: new Date().toISOString(),
          })
          .eq('id', tx.id);

        if (updateError) {
          console.error(`[Process Pending] Failed to update transaction ${tx.id}:`, updateError);
          results.errors++;
          continue;
        }

        console.log(`[Process Pending] Transaction ${tx.id} -> Available (£${tx.amount})`);
        results.processed++;

        // Send notification email
        // Supabase returns joined data as array, get first element
        const profileData = Array.isArray(tx.profile) ? tx.profile[0] : tx.profile;
        const profile = profileData as { id: string; full_name: string | null; email: string | null } | null;
        if (profile?.email) {
          try {
            await sendCommissionAvailableEmail({
              to: profile.email,
              userName: profile.full_name || 'there',
              amount: tx.amount,
            });
            results.emailsSent++;
          } catch (emailErr) {
            console.error(`[Process Pending] Failed to send email for ${tx.id}:`, emailErr);
          }
        }
      } catch (txError) {
        console.error(`[Process Pending] Error processing transaction ${tx.id}:`, txError);
        results.errors++;
      }
    }

    console.log('[Process Pending] Complete:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('[Process Pending] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
