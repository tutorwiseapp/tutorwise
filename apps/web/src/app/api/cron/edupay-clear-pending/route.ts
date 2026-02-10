/**
 * Filename: apps/web/src/app/api/cron/edupay-clear-pending/route.ts
 * Purpose: Daily cron to transition pending EP → available after 7-day clearing period
 * Route: GET /api/cron/edupay-clear-pending
 * Created: 2026-02-10
 *
 * Schedule: Daily at 6:00 AM UTC (configured in vercel.json)
 * Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Calls the clear_pending_ep() RPC which:
 * - Updates edupay_ledger rows where status='pending' AND available_at <= NOW() to 'available'
 * - Recalculates edupay_wallets available_ep / pending_ep for all affected users
 * - Returns count of cleared entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/edupay-clear-pending
 * Processes pending EP entries and transitions them to available.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.error('[EduPay Cron] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log('[EduPay Cron] Starting pending EP clearing...');

  const supabase = await createClient();

  const { data: cleared, error } = await supabase.rpc('clear_pending_ep');

  if (error) {
    console.error('[EduPay Cron] RPC error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'RPC failed' },
      { status: 500 }
    );
  }

  const clearedCount = typeof cleared === 'number' ? cleared : 0;
  console.log(`[EduPay Cron] Cleared ${clearedCount} pending EP entries`);

  return NextResponse.json({
    success: true,
    cleared: clearedCount,
  });
}
