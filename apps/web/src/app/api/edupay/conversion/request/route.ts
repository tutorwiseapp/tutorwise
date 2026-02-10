/**
 * Filename: apps/web/src/app/api/edupay/conversion/request/route.ts
 * Purpose: POST EP → loan payment conversion request via TrueLayer PISP
 * Route: POST /api/edupay/conversion/request
 * Created: 2026-02-10
 *
 * Stub mode: when TrueLayer credentials are placeholders, returns { stub: true }
 * Live mode: creates a TrueLayer payment and returns { conversion_id, auth_url }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isConfigured } from '@/lib/truelayer/client';
import { createPayment } from '@/lib/truelayer/payment';

export const dynamic = 'force-dynamic';

const DESTINATIONS = ['student_loan', 'isa', 'savings'] as const;
type Destination = (typeof DESTINATIONS)[number];

/**
 * POST /api/edupay/conversion/request
 * Body: { ep_amount: number, destination: 'student_loan' | 'isa' | 'savings' }
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
  let body: { ep_amount?: unknown; destination?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ep_amount, destination } = body;

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

  // GBP pennies = EP ÷ 100 × 100 (1 EP = £0.01, so ep_amount pennies)
  const gbpPennies = ep_amount;
  const gbpAmount = ep_amount / 100;

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
