/*
 * Filename: src/app/api/stripe/growth/checkout/route.ts
 * Purpose: Growth Pro subscription checkout
 * Created: 2026-03-05
 * Note: No trial — model is 10 free questions/day, subscribe when ready.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createGrowthCheckoutSession } from '@/lib/stripe/growth-pro-subscription';

/**
 * POST /api/stripe/growth/checkout
 * Create Stripe Checkout Session for Growth Pro (direct subscription, no trial)
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already has a subscription
    const { data: existingSubscription } = await supabase
      .from('growth_pro_subscriptions')
      .select('status')
      .eq('user_id', user.id)
      .single();

    if (existingSubscription && existingSubscription.status !== 'canceled') {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    const session = await createGrowthCheckoutSession(user.id);

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Error creating Growth checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
