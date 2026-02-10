/**
 * Filename: apps/web/src/app/api/edupay/conversion/status/route.ts
 * Purpose: Poll TrueLayer payment status and sync to DB
 * Route: GET /api/edupay/conversion/status?conversion_id=...
 * Created: 2026-02-10
 *
 * Called by the UI to check conversion progress. When status=processing,
 * polls TrueLayer and syncs executed→completed or failed→failed.
 * On failure, restores available_ep and inserts an offsetting ledger entry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isConfigured } from '@/lib/truelayer/client';
import { getPaymentStatus } from '@/lib/truelayer/payment';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conversionId = searchParams.get('conversion_id');

  if (!conversionId) {
    return NextResponse.json({ error: 'conversion_id is required' }, { status: 400 });
  }

  // Fetch conversion (ownership check)
  const { data: conversion, error } = await supabase
    .from('edupay_conversions')
    .select('id, user_id, ep_amount, gbp_amount, status, completed_at, truelayer_payment_id')
    .eq('id', conversionId)
    .eq('user_id', user.id)
    .single();

  if (error || !conversion) {
    return NextResponse.json({ error: 'Conversion not found' }, { status: 404 });
  }

  // If terminal, return current state immediately
  if (conversion.status === 'completed' || conversion.status === 'failed') {
    return NextResponse.json({
      status: conversion.status,
      gbp_amount: conversion.gbp_amount,
      ep_amount: conversion.ep_amount,
      completed_at: conversion.completed_at,
    });
  }

  // If processing + TrueLayer configured, poll for latest status
  if (
    conversion.status === 'processing' &&
    isConfigured() &&
    conversion.truelayer_payment_id
  ) {
    try {
      const { status: tlStatus } = await getPaymentStatus(
        conversion.truelayer_payment_id as string
      );

      if (tlStatus === 'executed' || tlStatus === 'settled') {
        await supabase
          .from('edupay_conversions')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', conversionId);

        return NextResponse.json({
          status: 'completed',
          gbp_amount: conversion.gbp_amount,
          ep_amount: conversion.ep_amount,
          completed_at: new Date().toISOString(),
        });
      }

      if (tlStatus === 'failed') {
        // Restore EP on failure
        await Promise.all([
          supabase
            .from('edupay_conversions')
            .update({ status: 'failed' })
            .eq('id', conversionId),
          // Offsetting ledger entry to restore EP
          supabase.from('edupay_ledger').insert({
            user_id: user.id,
            ep_delta: conversion.ep_amount as number,
            type: 'convert',
            status: 'available',
            description: `EP conversion reversed (payment failed)`,
            reference_id: conversion.id,
            reference_type: 'edupay_conversion',
          }),
          // Restore wallet balance
          supabase.rpc('recalculate_edupay_wallet', { p_user_id: user.id }),
        ]);

        return NextResponse.json({
          status: 'failed',
          gbp_amount: conversion.gbp_amount,
          ep_amount: conversion.ep_amount,
          completed_at: null,
        });
      }
    } catch (err) {
      console.error('[Conversion Status] TrueLayer poll error:', err);
      // Return current DB state on poll error
    }
  }

  return NextResponse.json({
    status: conversion.status,
    gbp_amount: conversion.gbp_amount,
    ep_amount: conversion.ep_amount,
    completed_at: conversion.completed_at ?? null,
  });
}
