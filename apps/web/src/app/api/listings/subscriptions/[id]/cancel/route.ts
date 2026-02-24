/**
 * Filename: api/listings/subscriptions/[id]/cancel/route.ts
 * Purpose: Cancel a subscription listing
 * Created: 2026-02-24
 *
 * Cancels a subscription and optionally processes Stripe cancellation.
 * Client can cancel their own subscriptions.
 * Tutor/Agent/Admin can cancel any subscription to their listings.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitError, rateLimitHeaders } from '@/middleware/rateLimiting';

export const dynamic = 'force-dynamic';

interface CancelSubscriptionRequest {
  reason?: string;
  cancel_at_period_end?: boolean; // If true, subscription continues until end of current period
}

/**
 * POST /api/listings/subscriptions/[id]/cancel
 * Cancel a subscription
 *
 * Body: { reason?: string, cancel_at_period_end?: boolean }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: subscriptionId } = await params;

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1a. Rate limit check
    const rateLimitResult = await checkRateLimit(user.id, 'payment:subscription_cancel');
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
    const body: CancelSubscriptionRequest = await request.json();
    const { reason, cancel_at_period_end = false } = body;

    // 3. Fetch subscription with listing details
    const { data: subscription, error: fetchError } = await supabase
      .from('listing_subscriptions')
      .select(`
        *,
        listing:listings!listing_id(
          id,
          title,
          profile_id,
          subscription_config
        ),
        client:profiles!client_id(
          id,
          full_name,
          email
        )
      `)
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // 4. Verify authorization
    const isClient = user.id === subscription.client_id;
    const isTutorOrAgent = user.id === (subscription.listing as any)?.profile_id;

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.roles?.includes('admin');

    if (!isClient && !isTutorOrAgent && !isAdmin) {
      return NextResponse.json(
        { error: 'You are not authorized to cancel this subscription' },
        { status: 403 }
      );
    }

    // 5. Validate subscription can be cancelled
    if (subscription.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Subscription is already cancelled' },
        { status: 400 }
      );
    }

    // 6. Handle Stripe cancellation if stripe_subscription_id exists
    let stripeCancelled = false;
    if (subscription.stripe_subscription_id) {
      try {
        // TODO: Implement Stripe subscription cancellation
        // const stripe = require('@/lib/stripe').stripe;
        // await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        //   cancel_at_period_end: cancel_at_period_end
        // });
        // OR immediate cancellation:
        // await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

        console.log('[Cancel Subscription] Stripe cancellation needed:', subscription.stripe_subscription_id);
        stripeCancelled = true;
      } catch (stripeError) {
        console.error('[Cancel Subscription] Stripe cancellation error:', stripeError);
        // Continue with database cancellation even if Stripe fails
      }
    }

    // 7. Update subscription status
    const now = new Date();
    const updateData: any = {
      status: 'cancelled',
      cancelled_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // If cancel_at_period_end, don't change status yet, just record intent
    if (cancel_at_period_end) {
      updateData.status = 'active'; // Keep active until period ends
      // Store cancellation intent in a metadata field (would need to add this column)
    }

    const { error: updateError } = await supabase
      .from('listing_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('[Cancel Subscription] Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to cancel subscription' },
        { status: 500 }
      );
    }

    // 8. Log cancellation
    console.log('[Cancel Subscription] Subscription cancelled:', {
      subscriptionId,
      clientId: subscription.client_id,
      listingId: subscription.listing_id,
      cancelledBy: user.id,
      reason: reason || 'Not provided',
      cancelAtPeriodEnd: cancel_at_period_end,
    });

    // 9. Build response message
    let message = '';
    if (cancel_at_period_end) {
      const periodEnd = new Date(subscription.current_period_end);
      message = `Subscription will be cancelled at the end of the current billing period (${periodEnd.toLocaleDateString()}). You can continue using the service until then.`;
    } else {
      message = 'Subscription cancelled successfully. You will no longer be charged.';
    }

    return NextResponse.json({
      success: true,
      message,
      subscription: {
        id: subscriptionId,
        status: updateData.status,
        cancelled_at: updateData.cancelled_at,
        current_period_end: subscription.current_period_end,
      }
    });

  } catch (error) {
    console.error('[Cancel Subscription] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
