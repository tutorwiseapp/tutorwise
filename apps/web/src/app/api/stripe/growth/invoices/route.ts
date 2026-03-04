/**
 * GET /api/stripe/growth/invoices
 * Lists Stripe invoices for the user's Growth Pro subscription.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: subscription } = await supabase
      .from('growth_pro_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!subscription?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] });
    }

    const invoiceList = await stripe.invoices.list({
      customer: subscription.stripe_customer_id,
      limit: 12,
    });

    const invoices = invoiceList.data.map((inv) => ({
      id: inv.id,
      number: inv.number ?? null,
      created: new Date(inv.created * 1000).toISOString(),
      amount_paid: inv.amount_paid,
      currency: inv.currency,
      status: inv.status ?? 'draft',
      hosted_invoice_url: inv.hosted_invoice_url ?? null,
    }));

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching Growth invoices:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
