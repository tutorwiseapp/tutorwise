/**
 * Filename: apps/web/src/app/api/edupay/linked-accounts/[id]/route.ts
 * Purpose: DELETE (unlink) a linked account
 * Route: DELETE /api/edupay/linked-accounts/[id]
 * Created: 2026-02-11
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/edupay/linked-accounts/[id]
 * Unlink (soft delete) a linked account
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const { data: account } = await supabase
    .from('edupay_linked_accounts')
    .select('id, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 });
  }

  // Check for active allocations
  const { count } = await supabase
    .from('edupay_savings_allocations')
    .select('id', { count: 'exact', head: true })
    .eq('linked_account_id', id)
    .eq('status', 'allocated');

  if (count && count > 0) {
    return NextResponse.json(
      { error: 'Cannot unlink account with active allocations. Withdraw funds first.' },
      { status: 400 }
    );
  }

  // Soft delete by setting status to disconnected
  const { error: updateError } = await supabase
    .from('edupay_linked_accounts')
    .update({
      status: 'disconnected',
      disconnected_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('[Linked Accounts] Unlink error:', updateError);
    return NextResponse.json({ error: 'Failed to unlink account' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
