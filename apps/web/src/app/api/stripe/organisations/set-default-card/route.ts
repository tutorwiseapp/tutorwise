/**
 * Filename: route.ts
 * Purpose: Set default payment method for organisation subscription
 * Created: 2026-01-08
 *
 * POST /api/stripe/organisation/set-default-card
 * Sets the default payment method for the organisation's Stripe customer
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

    const { organisationId, paymentMethodId } = await req.json();

    if (!organisationId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Organisation ID and Payment Method ID are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this organisation
    const { data: org, error: orgError } = await supabase
      .from('connection_groups')
      .select('id, profile_id')
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

    // Get Stripe customer ID from organisation_subscriptions table
    const { data: subscription, error: subError } = await supabase
      .from('organisation_subscriptions')
      .select('stripe_customer_id')
      .eq('organisation_id', organisationId)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No subscription found for this organisation' },
        { status: 404 }
      );
    }

    if (!subscription.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this organisation' },
        { status: 400 }
      );
    }

    // Set default payment method in Stripe
    await stripe.customers.update(subscription.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Default payment method updated',
    });
  } catch (error) {
    console.error('Error setting default card:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
