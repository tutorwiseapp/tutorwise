/**
 * Filename: apps/web/src/app/api/edupay/linked-accounts/route.ts
 * Purpose: GET/POST linked ISA/Savings accounts
 * Route: GET /api/edupay/linked-accounts - List accounts
 *        POST /api/edupay/linked-accounts - Link a new account
 * Created: 2026-02-11
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getProviderById } from '@/lib/edupay/savings-providers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/edupay/linked-accounts
 * Returns the user's linked ISA/Savings accounts
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: accounts, error } = await supabase
    .from('edupay_linked_accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('connected_at', { ascending: false });

  if (error) {
    console.error('[Linked Accounts] Query error:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }

  return NextResponse.json({ accounts: accounts ?? [] });
}

/**
 * POST /api/edupay/linked-accounts
 * Link a new ISA/Savings account (mock provider)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { provider_id: string; account_name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { provider_id, account_name } = body;

  if (!provider_id) {
    return NextResponse.json({ error: 'provider_id is required' }, { status: 400 });
  }

  // Get provider details from mock data
  const provider = getProviderById(provider_id);
  if (!provider) {
    return NextResponse.json({ error: 'Invalid provider_id' }, { status: 400 });
  }

  if (!provider.isAvailable) {
    return NextResponse.json({ error: 'Provider not available' }, { status: 400 });
  }

  // Check if user already has this provider linked
  const { data: existing } = await supabase
    .from('edupay_linked_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider_id', provider_id)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Account already linked' }, { status: 409 });
  }

  // Generate mock account details
  const mockLast4 = Math.floor(1000 + Math.random() * 9000).toString();

  // Insert linked account
  const { data: account, error: insertError } = await supabase
    .from('edupay_linked_accounts')
    .insert({
      user_id: user.id,
      provider_id: provider.id,
      provider_name: provider.name,
      provider_type: provider.type,
      provider_logo_url: provider.logoUrl,
      account_name: account_name || `My ${provider.name}`,
      account_last4: mockLast4,
      interest_rate: provider.interestRate,
      status: 'active',
      is_mock: true,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[Linked Accounts] Insert error:', insertError);
    return NextResponse.json({ error: 'Failed to link account' }, { status: 500 });
  }

  return NextResponse.json({ account }, { status: 201 });
}
