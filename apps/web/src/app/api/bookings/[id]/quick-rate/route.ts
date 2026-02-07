/**
 * Filename: apps/web/src/app/api/bookings/[id]/quick-rate/route.ts
 * Purpose: Capture immediate post-session ratings (hybrid review system)
 * Created: 2026-02-07
 *
 * Allows users to quickly rate a session (1-5 stars) immediately after completion.
 * These ratings are private until the full 7-day review window and can pre-fill
 * the full review form.
 */

import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface QuickRateBody {
  rating: number; // 1-5 stars
}

/**
 * POST /api/bookings/[id]/quick-rate
 * Capture a quick rating immediately after session completion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: bookingId } = await params;

  try {
    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: QuickRateBody = await request.json();
    const { rating } = body;

    // 3. Validate rating
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    // 4. Get booking and verify user is a participant
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, client_id, tutor_id, status')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 5. Verify user is a participant
    if (user.id !== booking.client_id && user.id !== booking.tutor_id) {
      return NextResponse.json(
        { error: 'You are not authorized to rate this booking' },
        { status: 403 }
      );
    }

    // 6. Verify booking is completed
    if (booking.status !== 'Completed') {
      return NextResponse.json(
        { error: 'Can only rate completed bookings' },
        { status: 400 }
      );
    }

    // 7. Determine rater and ratee
    const isRaterTutor = user.id === booking.tutor_id;
    const raterId = user.id;
    const rateeId = isRaterTutor ? booking.client_id : booking.tutor_id;

    // 8. Create or update quick rating
    const { data: existingRating } = await supabase
      .from('session_quick_ratings')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('rater_id', raterId)
      .eq('ratee_id', rateeId)
      .single();

    let quickRating;

    if (existingRating) {
      // Update existing quick rating
      const { data, error } = await supabase
        .from('session_quick_ratings')
        .update({
          rating,
          captured_at: new Date().toISOString(),
        })
        .eq('id', existingRating.id)
        .select()
        .single();

      if (error) {
        console.error('[Quick Rate] Update error:', error);
        return NextResponse.json(
          { error: 'Failed to update rating' },
          { status: 500 }
        );
      }

      quickRating = data;
    } else {
      // Create new quick rating
      const { data, error } = await supabase
        .from('session_quick_ratings')
        .insert({
          booking_id: bookingId,
          rater_id: raterId,
          ratee_id: rateeId,
          rating,
        })
        .select()
        .single();

      if (error) {
        console.error('[Quick Rate] Create error:', error);
        return NextResponse.json(
          { error: 'Failed to save rating' },
          { status: 500 }
        );
      }

      quickRating = data;
    }

    return NextResponse.json({
      success: true,
      quick_rating: quickRating,
      message: 'Thank you for your quick rating! You can still submit a full review with comments later.',
    });
  } catch (error) {
    console.error('[Quick Rate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bookings/[id]/quick-rate
 * Retrieve quick rating for a booking (to pre-fill review form)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: bookingId } = await params;

  try {
    // 1. Authenticate user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get booking and verify user is a participant
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, client_id, tutor_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // 3. Verify user is a participant
    if (user.id !== booking.client_id && user.id !== booking.tutor_id) {
      return NextResponse.json(
        { error: 'You are not authorized to view ratings for this booking' },
        { status: 403 }
      );
    }

    // 4. Get quick rating
    const { data: quickRating, error: ratingError } = await supabase
      .from('session_quick_ratings')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('rater_id', user.id)
      .single();

    if (ratingError) {
      // No quick rating found is not an error
      if (ratingError.code === 'PGRST116') {
        return NextResponse.json({
          has_quick_rating: false,
          quick_rating: null,
        });
      }

      console.error('[Quick Rate] Fetch error:', ratingError);
      return NextResponse.json(
        { error: 'Failed to fetch rating' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      has_quick_rating: true,
      quick_rating: quickRating,
    });
  } catch (error) {
    console.error('[Quick Rate] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
