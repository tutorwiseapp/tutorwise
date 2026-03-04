/**
 * POST /api/stripe/growth/remove-card
 * Detaches a payment method from the user's Growth Pro Stripe customer.
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

    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true, message: 'Payment method removed' });
  } catch (error) {
    console.error('Error removing Growth Pro card:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
