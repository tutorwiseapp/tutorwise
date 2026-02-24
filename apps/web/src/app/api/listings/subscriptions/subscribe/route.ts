/**
 * Filename: api/listings/subscriptions/subscribe/route.ts
 * Purpose: Create new subscription to a subscription listing
 * Created: 2026-02-24
 *
 * Handles subscription purchases for both human tutors and AI tutors.
 * Integrates with Stripe for recurring billing.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitError, rateLimitHeaders } from '@/middleware/rateLimiting';

export const dynamic = 'force-dynamic';

interface SubscribeRequest {
  listing_id: string;
  stripe_customer_id?: string; // Optional for initial request
}

/**
 * POST /api/listings/subscriptions/subscribe
 * Create a new subscription to a listing
 *
 * Body: { listing_id: string, stripe_customer_id?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1a. Rate limit check (prevent subscription spam)
    const rateLimitResult = await checkRateLimit(user.id, 'payment:subscription_create');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        rateLimitError(rateLimitResult),
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult.remaining, rateLimitResult.resetAt)
        }
      );
    }

    // 2. Parse request body
    const body: SubscribeRequest = await request.json();
    const { listing_id, stripe_customer_id } = body;

    if (!listing_id) {
      return NextResponse.json({ error: 'Missing listing_id' }, { status: 400 });
    }

    // 3. Fetch listing and validate it's a subscription type
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('id, title, listing_type, status, subscription_config, profile_id')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    if (listing.listing_type !== 'subscription') {
      return NextResponse.json(
        { error: 'This listing is not a subscription service' },
        { status: 400 }
      );
    }

    if (listing.status !== 'published') {
      return NextResponse.json(
        { error: 'This listing is not available for subscription' },
        { status: 400 }
      );
    }

    // 4. Check for existing active subscription (one per client per listing)
    const { data: existingSubscription, error: existingError } = await supabase
      .from('listing_subscriptions')
      .select('id, status')
      .eq('listing_id', listing_id)
      .eq('client_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'You already have an active subscription to this listing' },
        { status: 400 }
      );
    }

    // 5. Parse subscription config
    const config = listing.subscription_config as any;
    if (!config || !config.price_per_month_pence) {
      return NextResponse.json(
        { error: 'Invalid subscription configuration' },
        { status: 500 }
      );
    }

    const sessionLimitPerPeriod = config.session_limit_per_period || null;

    // 6. Calculate period dates (1 month from now)
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // 7. Create subscription record
    // Note: Stripe subscription will be created separately on frontend/payment flow
    // This is just the database record
    const { data: subscription, error: subscriptionError } = await supabase
      .from('listing_subscriptions')
      .insert({
        listing_id,
        client_id: user.id,
        stripe_customer_id: stripe_customer_id || null,
        stripe_subscription_id: null, // Will be updated after Stripe checkout
        status: 'active',
        sessions_booked_this_period: 0,
        sessions_remaining_this_period: sessionLimitPerPeriod,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('[Subscribe API] Database error:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      );
    }

    // 8. Fetch complete subscription details for response
    const { data: subscriptionDetails } = await supabase
      .rpc('get_subscription_details', { p_subscription_id: subscription.id });

    console.log('[Subscribe API] Subscription created:', {
      subscriptionId: subscription.id,
      listingId: listing_id,
      clientId: user.id,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    });

    return NextResponse.json({
      subscription,
      details: subscriptionDetails?.[0] || null,
      message: 'Subscription created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[Subscribe API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
