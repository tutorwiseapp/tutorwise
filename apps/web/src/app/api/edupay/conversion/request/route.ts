/**
 * Filename: apps/web/src/app/api/edupay/conversion/request/route.ts
 * Purpose: POST EP → loan payment or ISA/Savings allocation
 * Route: POST /api/edupay/conversion/request
 * Created: 2026-02-10
 * Updated: 2026-02-11 — Added ISA/Savings allocation support
 *
 * For student_loan destination:
 *   - Stub mode: returns { stub: true } when TrueLayer not configured
 *   - Live mode: creates TrueLayer payment and returns { conversion_id, auth_url }
 *
 * For isa/savings destination:
 *   - Requires linked_account_id
 *   - Creates allocation and deducts EP immediately (simulated)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isConfigured } from '@/lib/truelayer/client';
import { createPayment } from '@/lib/truelayer/payment';
import { calculateInterest } from '@/lib/edupay/savings-providers';

export const dynamic = 'force-dynamic';

const DESTINATIONS = ['student_loan', 'isa', 'savings'] as const;
type Destination = (typeof DESTINATIONS)[number];

interface RequestBody {
  ep_amount?: unknown;
  destination?: unknown;
  linked_account_id?: unknown;
}

/**
 * POST /api/edupay/conversion/request
 * Body: { ep_amount: number, destination: 'student_loan' | 'isa' | 'savings', linked_account_id?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ep_amount, destination, linked_account_id } = body;

  if (typeof ep_amount !== 'number' || ep_amount <= 0 || !Number.isInteger(ep_amount)) {
    return NextResponse.json(
      { error: 'ep_amount must be a positive integer' },
      { status: 400 }
    );
  }

  if (!DESTINATIONS.includes(destination as Destination)) {
    return NextResponse.json(
      { error: `destination must be one of: ${DESTINATIONS.join(', ')}` },
      { status: 400 }
    );
  }

  // For ISA/Savings, require linked_account_id
  const isSavingsDestination = destination === 'isa' || destination === 'savings';
  if (isSavingsDestination && !linked_account_id) {
    return NextResponse.json(
      { error: 'linked_account_id is required for ISA/Savings destination' },
      { status: 400 }
    );
  }

  // Fetch wallet and check balance
  const { data: wallet, error: walletError } = await supabase
    .from('edupay_wallets')
    .select('available_ep')
    .eq('user_id', user.id)
    .single();

  if (walletError || !wallet) {
    return NextResponse.json({ error: 'No EduPay wallet found' }, { status: 404 });
  }

  if ((wallet.available_ep as number) < ep_amount) {
    return NextResponse.json(
      { error: 'Insufficient available EP' },
      { status: 422 }
    );
  }

  // Check no active conversion in progress
  const { data: activeConversion } = await supabase
    .from('edupay_conversions')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['pending', 'processing'])
    .maybeSingle();

  if (activeConversion) {
    return NextResponse.json(
      { error: 'A conversion is already in progress' },
      { status: 409 }
    );
  }

  const gbpAmount = ep_amount / 100;

  // ============================================================================
  // ISA/Savings flow — Create allocation (simulated)
  // ============================================================================
  if (isSavingsDestination && linked_account_id) {
    // Verify linked account ownership and get interest rate
    const { data: linkedAccount, error: accountError } = await supabase
      .from('edupay_linked_accounts')
      .select('id, interest_rate, provider_name')
      .eq('id', linked_account_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (accountError || !linkedAccount) {
      return NextResponse.json({ error: 'Linked account not found' }, { status: 404 });
    }

    const interestRate = linkedAccount.interest_rate as number;

    // Insert conversion row (completed immediately for simulation)
    const { data: conversion, error: conversionError } = await supabase
      .from('edupay_conversions')
      .insert({
        user_id: user.id,
        ep_amount,
        gbp_amount: gbpAmount,
        destination: destination as string,
        status: 'completed',
        partner: 'simulation',
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (conversionError || !conversion) {
      console.error('[Conversion] Insert error:', conversionError);
      return NextResponse.json({ error: 'Failed to create conversion' }, { status: 500 });
    }

    const conversionId = conversion.id as string;

    // Calculate projected interest for 12 months
    const projected12mo = calculateInterest(gbpAmount, interestRate, 12);

    // Insert savings allocation
    const { data: allocation, error: allocationError } = await supabase
      .from('edupay_savings_allocations')
      .insert({
        user_id: user.id,
        linked_account_id: linked_account_id as string,
        conversion_id: conversionId,
        ep_amount,
        gbp_amount: gbpAmount,
        interest_rate_at_creation: interestRate,
        projected_interest_12mo: projected12mo,
        status: 'allocated',
      })
      .select('id')
      .single();

    if (allocationError || !allocation) {
      console.error('[Allocation] Insert error:', allocationError);
      // Rollback conversion
      await supabase.from('edupay_conversions').delete().eq('id', conversionId);
      return NextResponse.json({ error: 'Failed to create allocation' }, { status: 500 });
    }

    // Deduct EP from wallet and add ledger entry
    await supabase
      .from('edupay_wallets')
      .update({
        available_ep: (wallet.available_ep as number) - ep_amount,
        converted_ep: supabase.rpc('increment_converted_ep', { amount: ep_amount }),
      })
      .eq('user_id', user.id);

    // Insert ledger entry
    await supabase.from('edupay_ledger').insert({
      user_id: user.id,
      ep_amount: -ep_amount,
      type: 'convert',
      status: 'processed',
      note: `Allocated to ${linkedAccount.provider_name}`,
    });

    return NextResponse.json({
      conversion_id: conversionId,
      allocation_id: allocation.id,
      stub: true, // Simulated for now
      message: `£${gbpAmount.toFixed(2)} allocated to ${linkedAccount.provider_name}. Projected interest: £${projected12mo.toFixed(2)}/year at ${interestRate}% APY.`,
    });
  }

  // ============================================================================
  // Student Loan flow — TrueLayer PISP
  // ============================================================================
  const gbpPennies = ep_amount;

  // Insert conversion row (status: pending)
  const { data: conversion, error: insertError } = await supabase
    .from('edupay_conversions')
    .insert({
      user_id: user.id,
      ep_amount,
      gbp_amount: gbpAmount,
      destination: destination as string,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !conversion) {
    console.error('[Conversion] Insert error:', insertError);
    return NextResponse.json({ error: 'Failed to create conversion' }, { status: 500 });
  }

  const conversionId = conversion.id as string;

  // Stub mode — TrueLayer not yet configured
  if (!isConfigured()) {
    return NextResponse.json({
      conversion_id: conversionId,
      auth_url: null,
      stub: true,
      message:
        'TrueLayer credentials not yet configured. Your conversion has been recorded and will be processed once the integration is live.',
    });
  }

  // Live mode — create TrueLayer payment
  const returnUri =
    process.env.TRUELAYER_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/edupay/conversion/callback`;

  try {
    const { payment_id, resource_token, auth_uri } = await createPayment(
      gbpPennies,
      returnUri,
      `TW-EP-${conversionId.slice(0, 8).toUpperCase()}`
    );

    // Update conversion row with TrueLayer IDs
    await supabase
      .from('edupay_conversions')
      .update({
        truelayer_payment_id: payment_id,
        truelayer_resource_token: resource_token,
        initiated_at: new Date().toISOString(),
      })
      .eq('id', conversionId);

    return NextResponse.json({
      conversion_id: conversionId,
      auth_url: auth_uri,
      stub: false,
    });
  } catch (err) {
    console.error('[Conversion] TrueLayer createPayment error:', err);
    // Clean up pending conversion on TrueLayer error
    await supabase
      .from('edupay_conversions')
      .update({ status: 'failed' })
      .eq('id', conversionId);
    return NextResponse.json(
      { error: 'Failed to initiate bank payment' },
      { status: 502 }
    );
  }
}
