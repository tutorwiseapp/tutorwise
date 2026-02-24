/**
 * Filename: api/ai-tutors/bundles/[bundleId]/purchase/route.ts
 * Purpose: Purchase a session bundle
 * Created: 2026-02-24
 * Phase: 3C - Bundle Pricing
 *
 * Allows clients to purchase session bundles with Stripe integration.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitError, rateLimitHeaders } from '@/middleware/rateLimiting';

export const dynamic = 'force-dynamic';

interface PurchaseBundleRequest {
  stripe_payment_intent_id?: string; // Optional for testing, required for production
}

/**
 * POST /api/ai-tutors/bundles/[bundleId]/purchase
 * Purchase a bundle
 *
 * Body: { stripe_payment_intent_id?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bundleId: string }> }
) {
  const supabase = await createClient();
  const { bundleId } = await params;

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1a. Rate limit check
    const rateLimitResult = await checkRateLimit(user.id, 'payment:bundle_purchase');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimitResult),
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetAt)
        }
      );
    }

    // 2. Parse request body
    const body: PurchaseBundleRequest = await request.json();
    const { stripe_payment_intent_id } = body;

    // 3. Fetch bundle details
    const { data: bundle, error: bundleError } = await supabase
      .from('ai_tutor_bundles')
      .select('*, ai_tutor:ai_tutors!ai_tutor_id(id, name, owner_id)')
      .eq('id', bundleId)
      .single();

    if (bundleError || !bundle) {
      return NextResponse.json({ error: 'Bundle not found' }, { status: 404 });
    }

    // 4. Verify bundle is active
    if (!bundle.is_active) {
      return NextResponse.json(
        { error: 'This bundle is no longer available' },
        { status: 400 }
      );
    }

    // 5. Check if client already has active bundle for this AI tutor
    const { data: existingPurchase } = await supabase
      .from('ai_tutor_bundle_purchases')
      .select('id')
      .eq('client_id', user.id)
      .eq('ai_tutor_id', bundle.ai_tutor_id)
      .eq('status', 'active')
      .single();

    if (existingPurchase) {
      return NextResponse.json(
        { error: 'You already have an active bundle for this AI tutor. Use your existing sessions first.' },
        { status: 400 }
      );
    }

    // 6. TODO: Verify Stripe payment
    // In production, validate stripe_payment_intent_id and verify payment succeeded
    // const stripe = require('@/lib/stripe').stripe;
    // const paymentIntent = await stripe.paymentIntents.retrieve(stripe_payment_intent_id);
    // if (paymentIntent.status !== 'succeeded') {
    //   return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    // }

    // 7. Calculate expiration date
    const expiresAt = bundle.valid_days
      ? new Date(Date.now() + bundle.valid_days * 24 * 60 * 60 * 1000)
      : null;

    // 8. Create bundle purchase
    const { data: purchase, error: purchaseError } = await supabase
      .from('ai_tutor_bundle_purchases')
      .insert({
        bundle_id: bundleId,
        ai_tutor_id: bundle.ai_tutor_id,
        client_id: user.id,
        ai_sessions_remaining: bundle.ai_sessions_count,
        human_sessions_remaining: bundle.human_sessions_count,
        total_paid_pence: bundle.total_price_pence,
        stripe_payment_intent_id: stripe_payment_intent_id || null,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('[Purchase Bundle] Database error:', purchaseError);
      throw purchaseError;
    }

    console.log('[Purchase Bundle] Bundle purchased:', {
      purchaseId: purchase.id,
      bundleId,
      clientId: user.id,
      aiTutorId: bundle.ai_tutor_id,
      totalPaid: bundle.total_price_pence
    });

    return NextResponse.json({
      success: true,
      purchase,
      message: `Bundle purchased successfully! You have ${bundle.ai_sessions_count} AI sessions and ${bundle.human_sessions_count} human sessions.`,
      expires_at: expiresAt
    }, { status: 201 });

  } catch (error) {
    console.error('[Purchase Bundle] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
