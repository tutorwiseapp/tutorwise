/**
 * Filename: route.ts
 * Purpose: Create Stripe Checkout Session to add payment method for Sage Pro subscription
 * Created: 2026-02-22
 *
 * POST /api/stripe/sage/add-card-checkout
 * Creates a Stripe Checkout Session in setup mode to collect payment method
 * Automatically creates Stripe customer if doesn't exist
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    // Get or create subscription record
    let { data: subscription } = await supabase
      .from('sage_pro_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let stripeCustomerId = subscription?.stripe_customer_id;

    // If no Stripe customer exists, create one
    if (!stripeCustomerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email!,
        name: profile?.full_name || user.email!,
        metadata: {
          supabaseUserId: user.id,
          subscriptionType: 'sage_pro',
        },
      });

      stripeCustomerId = newCustomer.id;

      // Update subscription record with new Stripe customer ID
      if (subscription) {
        await supabase
          .from('sage_pro_subscriptions')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('user_id', user.id);
      }
    }

    // Get origin URL from request
    const origin = new URL(req.url).origin;

    // Create Stripe Checkout Session in setup mode (collect payment method only)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      success_url: `${origin}/sage/billing?status=success&customer_id=${stripeCustomerId}`,
      cancel_url: `${origin}/sage/billing?status=cancelled`,
    });

    return NextResponse.json({
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating Sage Pro add card checkout session:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
