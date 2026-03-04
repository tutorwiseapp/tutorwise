/**
 * POST /api/stripe/growth/set-default-card
 * Sets the default payment method for the user's Growth Pro Stripe customer.
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

    const { paymentMethodId } = await req.json();

    if (!paymentMethodId) {
      return NextResponse.json({ error: 'Payment Method ID is required' }, { status: 400 });
    }

    const { data: subscription, error: subError } = await supabase
      .from('growth_pro_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription?.stripe_customer_id) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 404 });
    }

    await stripe.customers.update(subscription.stripe_customer_id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    return NextResponse.json({ success: true, message: 'Default payment method updated' });
  } catch (error) {
    console.error('Error setting default Growth Pro card:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
