/**
 * Filename: route.ts
 * Purpose: Get saved payment methods for organisation subscription
 * Created: 2026-01-08
 *
 * POST /api/stripe/organisation/get-cards
 * Returns list of saved payment methods for the organisation's Stripe customer
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
      // No Stripe customer yet - return empty cards list
      return NextResponse.json({
        cards: [],
        defaultPaymentMethodId: null,
      });
    }

    // Fetch payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: subscription.stripe_customer_id,
      type: 'card',
    });

    // Get customer to find default payment method
    const customer = await stripe.customers.retrieve(
      subscription.stripe_customer_id
    ) as Stripe.Customer;

    const defaultPaymentMethodId =
      typeof customer.invoice_settings.default_payment_method === 'string'
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings.default_payment_method?.id || null;

    const cards = paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
    }));

    return NextResponse.json({
      cards,
      defaultPaymentMethodId,
    });
  } catch (error) {
    console.error('Error fetching organisation cards:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
