/**
 * Filename: apps/web/src/app/api/edupay/ledger/route.ts
 * Purpose: GET user's EduPay EP transaction history (immutable ledger)
 * Route: GET /api/edupay/ledger
 * Created: 2026-02-10
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/edupay/ledger
 * Returns the authenticated user's EP ledger entries ordered by most recent.
 * Limit 200 entries (client-side pagination handles display).
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: ledger, error } = await supabase
    .from('edupay_ledger')
    .select('id, ep_amount, event_type, type, status, available_at, note, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[EduPay Ledger] Query error:', error);
    return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 });
  }

  return NextResponse.json({ ledger: ledger ?? [] });
}
