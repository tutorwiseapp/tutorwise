/**
 * Filename: apps/web/src/app/api/webhooks/truelayer/route.ts
 * Purpose: Receive TrueLayer payment status webhooks
 * Route: POST /api/webhooks/truelayer
 * Created: 2026-02-10
 *
 * Handles payment_executed and payment_failed events.
 * Always returns 200 (idempotent).
 * Signature verification: sandbox passes all; live requires ES512 JWS (TODO).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyTruelayerWebhook, TruelayerPaymentEvent } from '@/lib/truelayer/webhook';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('Tl-Signature');

  // Verify webhook signature
  const valid = await verifyTruelayerWebhook(rawBody, signature);
  if (!valid) {
    console.error('[TrueLayer Webhook] Invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: TruelayerPaymentEvent;
  try {
    event = JSON.parse(rawBody) as TruelayerPaymentEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { type, payload } = event;
  const paymentId = payload?.payment_id;

  if (!paymentId) {
    return NextResponse.json({ received: true }); // Ignore events without payment_id
  }

  const supabase = await createClient();

  // Find conversion
  const { data: conversion } = await supabase
    .from('edupay_conversions')
    .select('id, user_id, ep_amount, status')
    .eq('truelayer_payment_id', paymentId)
    .maybeSingle();

  if (!conversion) {
    console.warn('[TrueLayer Webhook] No conversion found for payment_id:', paymentId);
    return NextResponse.json({ received: true }); // Idempotent
  }

  if (type === 'payment_executed' || type === 'payment_settled') {
    if (conversion.status !== 'completed') {
      await supabase
        .from('edupay_conversions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', conversion.id);

      console.log('[TrueLayer Webhook] Payment completed:', paymentId);
    }
    return NextResponse.json({ received: true });
  }

  if (type === 'payment_failed') {
    if (conversion.status !== 'failed') {
      await Promise.all([
        supabase
          .from('edupay_conversions')
          .update({ status: 'failed' })
          .eq('id', conversion.id),
        // Offsetting ledger entry to restore EP
        supabase.from('edupay_ledger').insert({
          user_id: conversion.user_id,
          ep_delta: conversion.ep_amount as number,
          type: 'convert',
          status: 'available',
          description: `EP conversion reversed (payment failed via webhook)`,
          reference_id: conversion.id,
          reference_type: 'edupay_conversion',
        }),
        supabase.rpc('recalculate_edupay_wallet', { p_user_id: conversion.user_id }),
      ]);

      console.log('[TrueLayer Webhook] Payment failed, EP restored:', paymentId);
    }
    return NextResponse.json({ received: true });
  }

  // Unknown event type — log and acknowledge
  console.log('[TrueLayer Webhook] Unhandled event type:', type);
  return NextResponse.json({ received: true });
}
