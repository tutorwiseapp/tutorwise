/**
 * Filename: route.ts
 * Purpose: Create Stripe Customer Portal session for subscription management
 * Created: 2026-01-07
 *
 * POST /api/stripe/customer-portal
 * Creates a Stripe Customer Portal session where users can manage their subscription,
 * update payment methods, view billing history, and cancel subscriptions.
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

    const { organisationId, returnUrl } = await req.json();

    if (!organisationId) {
      return NextResponse.json(
        { error: 'Organisation ID is required' },
        { status: 400 }
      );
    }

    // Verify user has access to this organisation
    const { data: org, error: orgError } = await supabase
      .from('connection_groups')
      .select('id, name, stripe_customer_id')
      .eq('id', organisationId)
      .eq('type', 'organisation')
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      );
    }

    if (!org.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this organisation' },
        { status: 400 }
      );
    }

    // Create Stripe Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/organisation`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
