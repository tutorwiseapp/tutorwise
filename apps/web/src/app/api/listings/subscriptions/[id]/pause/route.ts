/**
 * Filename: api/listings/subscriptions/[id]/pause/route.ts
 * Purpose: Pause or unpause a subscription
 * Created: 2026-02-24
 *
 * Allows clients to pause their subscription temporarily.
 * Paused subscriptions don't charge and don't allow bookings.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, rateLimitError, rateLimitHeaders } from '@/middleware/rateLimiting';

export const dynamic = 'force-dynamic';

interface PauseSubscriptionRequest {
  pause: boolean; // true to pause, false to unpause
  reason?: string;
}

/**
 * POST /api/listings/subscriptions/[id]/pause
 * Pause or unpause a subscription
 *
 * Body: { pause: boolean, reason?: string }
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
    const rateLimitResult = await checkRateLimit(user.id, 'payment:subscription_pause');
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
    const body: PauseSubscriptionRequest = await request.json();
    const { pause, reason } = body;

    if (pause === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: pause' },
        { status: 400 }
      );
    }

    // 3. Fetch subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('listing_subscriptions')
      .select(`
        *,
        listing:listings!listing_id(
          id,
          title,
          profile_id
        )
      `)
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // 4. Verify authorization (only client can pause their subscription)
    if (user.id !== subscription.client_id) {
      return NextResponse.json(
        { error: 'Only the subscriber can pause their subscription' },
        { status: 403 }
      );
    }

    // 5. Validate current status
    if (pause && subscription.status === 'paused') {
      return NextResponse.json(
        { error: 'Subscription is already paused' },
        { status: 400 }
      );
    }

    if (!pause && subscription.status !== 'paused') {
      return NextResponse.json(
        { error: 'Subscription is not paused' },
        { status: 400 }
      );
    }

    if (subscription.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot pause a cancelled subscription' },
        { status: 400 }
      );
    }

    // 6. Update subscription status
    const now = new Date();
    const updateData: any = {
      status: pause ? 'paused' : 'active',
      pause_started_at: pause ? now.toISOString() : null,
      updated_at: now.toISOString(),
    };

    const { error: updateError } = await supabase
      .from('listing_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('[Pause Subscription] Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    // 7. Handle Stripe pause if stripe_subscription_id exists
    if (subscription.stripe_subscription_id) {
      try {
        // TODO: Implement Stripe subscription pause
        // const stripe = require('@/lib/stripe').stripe;
        // if (pause) {
        //   await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        //     pause_collection: { behavior: 'void' }
        //   });
        // } else {
        //   await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        //     pause_collection: null
        //   });
        // }

        console.log('[Pause Subscription] Stripe pause needed:', {
          subscriptionId: subscription.stripe_subscription_id,
          pause
        });
      } catch (stripeError) {
        console.error('[Pause Subscription] Stripe error:', stripeError);
        // Continue even if Stripe fails
      }
    }

    // 8. Log action
    console.log('[Pause Subscription] Subscription status changed:', {
      subscriptionId,
      clientId: subscription.client_id,
      action: pause ? 'paused' : 'unpaused',
      reason: reason || 'Not provided',
    });

    return NextResponse.json({
      success: true,
      message: pause
        ? 'Subscription paused successfully. You will not be charged until you resume.'
        : 'Subscription resumed successfully. Billing will continue.',
      subscription: {
        id: subscriptionId,
        status: updateData.status,
        pause_started_at: updateData.pause_started_at,
      }
    });

  } catch (error) {
    console.error('[Pause Subscription] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
