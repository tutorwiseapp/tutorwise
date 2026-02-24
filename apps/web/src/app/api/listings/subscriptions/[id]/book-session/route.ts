/**
 * Filename: api/listings/subscriptions/[id]/book-session/route.ts
 * Purpose: Book a session using a subscription
 * Created: 2026-02-24
 *
 * Creates a booking linked to an active subscription.
 * Validates session limits and decrements remaining sessions.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAllConflicts } from '@/lib/scheduling/conflict-detection';
import { checkRateLimit, rateLimitError, rateLimitHeaders } from '@/middleware/rateLimiting';

export const dynamic = 'force-dynamic';

interface BookSessionRequest {
  session_start_time: string; // ISO datetime
  session_duration: number; // minutes
  service_name: string;
}

/**
 * POST /api/listings/subscriptions/[id]/book-session
 * Book a session using an active subscription
 *
 * Body: {
 *   session_start_time: string,
 *   session_duration: number,
 *   service_name: string
 * }
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
    const rateLimitResult = await checkRateLimit(user.id, 'payment:subscription_booking');
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
    const body: BookSessionRequest = await request.json();
    const { session_start_time, session_duration, service_name } = body;

    if (!session_start_time || !session_duration || !service_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 3. Fetch subscription with listing details
    const { data: subscription, error: fetchError } = await supabase
      .from('listing_subscriptions')
      .select(`
        *,
        listing:listings!listing_id(
          id,
          title,
          profile_id,
          subscription_config,
          availability,
          timezone,
          subjects,
          levels,
          delivery_mode,
          location_city,
          hourly_rate,
          slug
        )
      `)
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // 4. Verify authorization (must be the subscriber)
    if (user.id !== subscription.client_id) {
      return NextResponse.json(
        { error: 'Only the subscriber can book sessions' },
        { status: 403 }
      );
    }

    // 5. Validate subscription is active
    if (subscription.status !== 'active') {
      return NextResponse.json(
        { error: `Cannot book sessions - subscription is ${subscription.status}` },
        { status: 400 }
      );
    }

    // 6. Check session limits
    if (subscription.sessions_remaining_this_period !== null) {
      if (subscription.sessions_remaining_this_period <= 0) {
        return NextResponse.json(
          {
            error: 'Session limit reached for this billing period',
            sessions_remaining: 0,
            period_end: subscription.current_period_end
          },
          { status: 400 }
        );
      }
    }

    // 7. Validate session duration matches subscription config
    const config = (subscription.listing as any)?.subscription_config || {};
    const expectedDuration = config.session_duration_minutes;

    if (expectedDuration && session_duration !== expectedDuration) {
      return NextResponse.json(
        {
          error: `Session duration must be ${expectedDuration} minutes according to subscription plan`,
          expected_duration: expectedDuration
        },
        { status: 400 }
      );
    }

    // 8. Get tutor ID from listing
    const tutorId = (subscription.listing as any)?.profile_id;
    if (!tutorId) {
      return NextResponse.json(
        { error: 'Invalid listing configuration' },
        { status: 500 }
      );
    }

    // 9. Check for conflicts
    try {
      const conflictCheck = await checkAllConflicts(
        tutorId,
        new Date(session_start_time),
        session_duration
      );

      if (conflictCheck.hasConflict) {
        const conflictingTime = conflictCheck.conflictingBookings.length > 0
          ? conflictCheck.conflictingBookings[0].session_start_time
          : undefined;

        return NextResponse.json(
          {
            error: conflictCheck.message || 'This time slot is not available',
            conflicting_time: conflictingTime
          },
          { status: 409 }
        );
      }
    } catch (conflictError) {
      console.error('[Book Subscription Session] Conflict check error:', conflictError);
      return NextResponse.json(
        { error: 'Failed to verify availability' },
        { status: 500 }
      );
    }

    // 10. Create booking with listing_subscription_id
    const listing = subscription.listing as any;
    const bookingData: any = {
      client_id: user.id,
      tutor_id: tutorId,
      listing_id: subscription.listing_id,
      listing_subscription_id: subscriptionId,
      service_name,
      session_start_time,
      session_duration,
      amount: 0, // Subscriptions are pre-paid, individual sessions are free
      status: 'Confirmed', // Subscription bookings are auto-confirmed
      payment_status: 'Paid', // Paid through subscription
      booking_type: 'subscription',
      booking_source: 'subscription',
      // Snapshot fields from listing
      subjects: listing.subjects,
      levels: listing.levels,
      delivery_mode: listing.delivery_mode?.[0] as 'online' | 'in_person' | 'hybrid',
      location_city: listing.location_city,
      hourly_rate: listing.hourly_rate,
      listing_slug: listing.slug,
    };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();

    if (bookingError) {
      console.error('[Book Subscription Session] Booking creation error:', bookingError);
      throw bookingError;
    }

    // 11. Update subscription session counts
    const updateData: any = {
      sessions_booked_this_period: subscription.sessions_booked_this_period + 1,
      updated_at: new Date().toISOString(),
    };

    // Decrement remaining sessions if not unlimited
    if (subscription.sessions_remaining_this_period !== null) {
      updateData.sessions_remaining_this_period = subscription.sessions_remaining_this_period - 1;
    }

    const { error: updateError } = await supabase
      .from('listing_subscriptions')
      .update(updateData)
      .eq('id', subscriptionId);

    if (updateError) {
      console.error('[Book Subscription Session] Subscription update error:', updateError);
      // Don't fail the request if update fails - booking was successful
    }

    console.log('[Book Subscription Session] Session booked:', {
      bookingId: booking.id,
      subscriptionId,
      sessionStart: session_start_time,
      sessionsBooked: updateData.sessions_booked_this_period,
      sessionsRemaining: updateData.sessions_remaining_this_period,
    });

    return NextResponse.json({
      success: true,
      booking,
      subscription: {
        sessions_booked: updateData.sessions_booked_this_period,
        sessions_remaining: updateData.sessions_remaining_this_period,
        period_end: subscription.current_period_end,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[Book Subscription Session] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
