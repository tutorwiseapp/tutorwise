/*
 * Filename: src/app/api/stripe/sage/checkout/trial/route.ts
 * Purpose: Start Sage Pro trial checkout session
 * Created: 2026-02-22
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createTrialCheckoutSession } from '@/lib/stripe/sage-pro-subscription';

/**
 * POST /api/stripe/sage/checkout/trial
 * Create Stripe Checkout Session for Sage Pro trial
 *
 * Flow:
 * 1. User clicks "Start Free Trial" button
 * 2. This endpoint creates a Stripe Checkout Session
 * 3. Returns checkout URL for redirect
 * 4. User completes checkout (14-day trial, no payment required)
 * 5. Webhook creates sage_pro_subscriptions record
 * 6. User redirected to /sage?subscription=success
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user already has a subscription
    const { data: existingSubscription } = await supabase
      .from('sage_pro_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();

    if (existingSubscription && existingSubscription.status !== 'canceled') {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const session = await createTrialCheckoutSession(user.id);

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating trial checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
