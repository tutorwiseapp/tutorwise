/**
 * POST /api/stripe/organisations/invoices
 * Lists Stripe invoices for an organisation's subscription.
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

    const { organisationId } = await req.json();

    if (!organisationId) {
      return NextResponse.json({ error: 'Organisation ID is required' }, { status: 400 });
    }

    // Verify ownership
    const { data: org } = await supabase
      .from('connection_groups')
      .select('profile_id')
      .eq('id', organisationId)
      .single();

    if (!org || org.profile_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: subscription } = await supabase
      .from('organisation_subscriptions')
      .select('stripe_customer_id')
      .eq('organisation_id', organisationId)
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
    console.error('Error fetching Organisation invoices:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
