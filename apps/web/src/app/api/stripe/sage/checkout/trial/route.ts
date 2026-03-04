/*
 * Filename: src/app/api/stripe/sage/checkout/trial/route.ts
 * Purpose: Sage Pro subscription checkout (route kept for URL stability)
 * Note: Trial removed — model is 10 free questions/day, subscribe when ready.
 * Created: 2026-02-22 | Updated: 2026-03-05
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createCheckoutSession } from '@/lib/stripe/sage-pro-subscription';

/**
 * POST /api/stripe/sage/checkout/trial
 * Create Stripe Checkout Session for Sage Pro (direct subscription, no trial)
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
    const session = await createCheckoutSession(user.id);

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
