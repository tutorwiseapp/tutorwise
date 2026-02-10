/**
 * Filename: apps/web/src/app/api/edupay/wallet/route.ts
 * Purpose: GET user's EduPay EP wallet balance
 * Route: GET /api/edupay/wallet
 * Created: 2026-02-10
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/edupay/wallet
 * Returns the authenticated user's EP wallet balance.
 * If no wallet row exists yet (user hasn't earned EP), returns zeroed wallet.
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: wallet, error } = await supabase
    .from('edupay_wallets')
    .select('total_ep, available_ep, pending_ep, converted_ep, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('[EduPay Wallet] Query error:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet' }, { status: 500 });
  }

  // Return zeroed wallet if user hasn't earned EP yet (no row)
  const walletData = wallet ?? {
    total_ep: 0,
    available_ep: 0,
    pending_ep: 0,
    converted_ep: 0,
    updated_at: null,
  };

  return NextResponse.json({
    wallet: {
      ...walletData,
      // GBP equivalent: 100 EP = £1
      gbp_value: walletData.available_ep / 100,
      total_gbp_value: walletData.total_ep / 100,
    },
  });
}
