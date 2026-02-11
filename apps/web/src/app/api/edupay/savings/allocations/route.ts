/**
 * Filename: apps/web/src/app/api/edupay/savings/allocations/route.ts
 * Purpose: GET user's savings allocations
 * Route: GET /api/edupay/savings/allocations
 * Created: 2026-02-11
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/edupay/savings/allocations
 * Returns the user's EP allocations to ISA/Savings accounts
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: allocations, error } = await supabase
    .from('edupay_savings_allocations')
    .select(`
      *,
      linked_account:edupay_linked_accounts(
        id, provider_id, provider_name, provider_type,
        provider_logo_url, account_name, interest_rate
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Savings Allocations] Query error:', error);
    return NextResponse.json({ error: 'Failed to fetch allocations' }, { status: 500 });
  }

  return NextResponse.json({ allocations: allocations ?? [] });
}
