/**
 * Filename: apps/web/src/app/api/edupay/conversion/callback/route.ts
 * Purpose: TrueLayer OAuth callback after user authorises bank payment
 * Route: GET /api/edupay/conversion/callback?payment_id=...
 * Created: 2026-02-10
 *
 * TrueLayer redirects here after the user authorises (or declines) the payment
 * on the hosted payment page. This route:
 *   1. Finds the pending conversion by truelayer_payment_id
 *   2. Transitions status → processing
 *   3. Deducts EP from wallet + inserts 'convert' ledger entry
 *   4. Redirects user to /edupay?conversion=success (or ?conversion=failed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.tutorwise.io';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('payment_id');

  if (!paymentId) {
    return NextResponse.redirect(`${BASE_URL}/edupay?conversion=failed&reason=missing_payment_id`);
  }

  const supabase = await createClient();

  // Find conversion by TrueLayer payment ID
  const { data: conversion, error } = await supabase
    .from('edupay_conversions')
    .select('id, user_id, ep_amount, status')
    .eq('truelayer_payment_id', paymentId)
    .single();

  if (error || !conversion) {
    console.error('[Conversion Callback] Conversion not found for payment_id:', paymentId);
    return NextResponse.redirect(`${BASE_URL}/edupay?conversion=failed&reason=not_found`);
  }

  if (conversion.status !== 'pending') {
    // Already processed (idempotent)
    return NextResponse.redirect(`${BASE_URL}/edupay?conversion=success`);
  }

  // Transition to processing
  const { error: updateError } = await supabase
    .from('edupay_conversions')
    .update({ status: 'processing' })
    .eq('id', conversion.id);

  if (updateError) {
    console.error('[Conversion Callback] Failed to update status:', updateError);
    return NextResponse.redirect(`${BASE_URL}/edupay?conversion=failed&reason=update_error`);
  }

  // Deduct EP from wallet
  const { error: walletError } = await supabase
    .from('edupay_wallets')
    .update({
      available_ep: supabase.rpc('available_ep - :ep_amount', { ep_amount: conversion.ep_amount }),
    })
    .eq('user_id', conversion.user_id);

  if (walletError) {
    console.error('[Conversion Callback] Wallet deduct error:', walletError);
    // Non-fatal — webhook will handle final reconciliation
  }

  // Insert 'convert' ledger entry
  await supabase.from('edupay_ledger').insert({
    user_id: conversion.user_id,
    ep_delta: -(conversion.ep_amount as number),
    type: 'convert',
    status: 'available',
    description: `EP conversion to GBP (payment ${paymentId.slice(0, 8)})`,
    reference_id: conversion.id,
    reference_type: 'edupay_conversion',
  });

  return NextResponse.redirect(`${BASE_URL}/edupay?conversion=success`);
}
