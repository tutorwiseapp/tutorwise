/**
 * Filename: route.ts
 * Purpose: Create Stripe Checkout Session to add payment method for organisation subscription
 * Created: 2026-01-08
 *
 * POST /api/stripe/organisation/add-card-checkout
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

    const { organisationId } = await req.json();

    if (!organisationId) {
      return NextResponse.json(
        { error: 'Organisation ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this organisation
    const { data: org, error: orgError } = await supabase
      .from('connection_groups')
      .select('id, profile_id, name')
      .eq('id', organisationId)
      .eq('type', 'organisation')
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      );
    }

    if (org.profile_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this organisation' },
        { status: 403 }
      );
    }

    // Get or create subscription record
    let { data: subscription, error: subError } = await supabase
      .from('organisation_subscriptions')
      .select('stripe_customer_id')
      .eq('organisation_id', organisationId)
      .single();

    let stripeCustomerId = subscription?.stripe_customer_id;

    // If no Stripe customer exists, create one
    if (!stripeCustomerId) {
      const newCustomer = await stripe.customers.create({
        email: user.email!,
        name: org.name,
        metadata: {
          supabaseUserId: user.id,
          organisationId: organisationId,
          organisationName: org.name,
        },
      });

      stripeCustomerId = newCustomer.id;

      // Update subscription record with new Stripe customer ID
      if (subscription) {
        await supabase
          .from('organisation_subscriptions')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('organisation_id', organisationId);
      }
    }

    // Get origin URL from request
    const origin = new URL(req.url).origin;

    // Create Stripe Checkout Session in setup mode (collect payment method only)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'setup',
      customer: stripeCustomerId,
      success_url: `${origin}/organisation/settings/billing?status=success&customer_id=${stripeCustomerId}&organisation_id=${organisationId}`,
      cancel_url: `${origin}/organisation/settings/billing?status=cancelled`,
    });

    return NextResponse.json({
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating add card checkout session:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
