/**
 * Filename: src/app/api/stripe/checkout/trial/route.ts
 * Purpose: API endpoint to create Stripe Checkout Session for Organisation Premium trial
 * Created: 2025-12-15
 * Version: v7.0 - Organisation Premium Subscription
 *
 * POST /api/stripe/checkout/trial
 * Creates a Stripe Checkout Session with 14-day free trial for Organisation Premium (£50/month)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createTrialCheckoutSession } from '@/lib/stripe/organisation-subscription';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await req.json();
    const { organisationId } = body;

    if (!organisationId) {
      return NextResponse.json(
        { error: 'Missing organisationId' },
        { status: 400 }
      );
    }

    // Verify user owns this organisation
    const { data: org, error: orgError } = await supabase
      .from('connection_groups')
      .select('profile_id, name')
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
        { error: 'You do not own this organisation' },
        { status: 403 }
      );
    }

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('organisation_subscriptions')
      .select('status')
      .eq('organisation_id', organisationId)
      .single();

    if (existingSubscription && ['trialing', 'active'].includes(existingSubscription.status)) {
      return NextResponse.json(
        { error: 'Organisation already has an active subscription' },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const session = await createTrialCheckoutSession(organisationId);

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });

  } catch (error) {
    console.error('Error creating trial checkout session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
