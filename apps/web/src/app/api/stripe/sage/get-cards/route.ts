/**
 * Filename: route.ts
 * Purpose: Get saved payment methods for Sage Pro subscription
 * Created: 2026-02-22
 *
 * GET /api/stripe/sage/get-cards
 * Returns list of saved payment methods for the user's Sage Pro Stripe customer
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const dynamic = 'force-dynamic';

export async function GET() {
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

    // Get Stripe customer ID from sage_pro_subscriptions table
    const { data: subscription, error: subError } = await supabase
      .from('sage_pro_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'No subscription found' },
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
    console.error('Error fetching Sage Pro cards:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
