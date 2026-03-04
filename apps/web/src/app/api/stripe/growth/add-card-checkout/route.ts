/**
 * POST /api/stripe/growth/add-card-checkout
 * Creates a Stripe Checkout Session in setup mode to add a payment method.
 * Auto-creates a Stripe customer if one doesn't exist yet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { data: subscription } = await supabase
      .from('growth_pro_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let stripeCustomerId = subscription?.stripe_customer_id;

    if (!stripeCustomerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email!,
        name: profile?.full_name || user.email!,
        metadata: { supabaseUserId: user.id, subscriptionType: 'growth_pro' },
      });
      stripeCustomerId = newCustomer.id;

      if (subscription) {
        await supabase
          .from('growth_pro_subscriptions')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('user_id', user.id);
      }
    }

    const origin = new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      success_url: `${origin}/growth/billing?status=success&customer_id=${stripeCustomerId}`,
      cancel_url: `${origin}/growth/billing?status=cancelled`,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating Growth Pro add-card checkout session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
