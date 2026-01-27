/**
 * Filename: apps/web/src/app/api/reviews/submit/route.ts
 * Purpose: API endpoint to submit reviews for a booking session
 * Created: 2025-11-08
 * Related: reviews-solution-design-v4.5.md
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { notifySessionPublished } from '@/lib/review-notifications';
import { sendNewReviewEmail } from '@/lib/email-templates/review';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

interface ReviewSubmission {
  reviewee_id: string;
  rating: number;
  comment?: string;
}

/**
 * POST /api/reviews/submit
 * Submits reviews for all participants in a booking session
 * Body: {
 *   session_id: string,
 *   reviews: Array<{ reviewee_id, rating, comment? }>
 * }
 */
export async function POST(req: Request) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Parse request body
    const body = await req.json();
    const { session_id, reviews } = body as {
      session_id: string;
      reviews: ReviewSubmission[];
    };

    if (!session_id || !reviews || reviews.length === 0) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // 3. Validate session exists and is pending, fetch booking for snapshot (migration 105)
    const { data: session, error: sessionError } = await supabase
      .from('booking_review_sessions')
      .select(`
        id,
        status,
        participant_ids,
        submitted_ids,
        booking_id,
        booking:booking_id(
          id,
          service_name,
          subjects,
          levels,
          session_start_time,
          location_type
        )
      `)
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return new NextResponse('Session not found', { status: 404 });
    }

    if (session.status !== 'pending') {
      return new NextResponse('Session is no longer pending', { status: 400 });
    }

    // 4. Verify user is a participant and has not already submitted
    if (!session.participant_ids.includes(user.id)) {
      return new NextResponse('You are not a participant in this session', { status: 403 });
    }

    if (session.submitted_ids?.includes(user.id)) {
      return new NextResponse('You have already submitted reviews for this session', { status: 400 });
    }

    // 5. Validate all reviewee_ids are participants (except current user)
    const validRevieweeIds = session.participant_ids.filter((id: string) => id !== user.id);
    for (const review of reviews) {
      if (!validRevieweeIds.includes(review.reviewee_id)) {
        return new NextResponse(
          `Invalid reviewee_id: ${review.reviewee_id}`,
          { status: 400 }
        );
      }
      if (review.rating < 1 || review.rating > 5) {
        return new NextResponse(
          'Rating must be between 1 and 5',
          { status: 400 }
        );
      }
    }

    // 6. Insert all reviews with snapshot fields (migration 105)
    // Extract booking data for snapshot
    const booking: any = Array.isArray((session as any).booking)
      ? (session as any).booking[0]
      : (session as any).booking;

    if (!booking) {
      console.warn('[API] Warning: No booking data found for snapshot fields');
    }

    const reviewInserts = reviews.map((review) => ({
      session_id,
      reviewer_id: user.id,
      reviewee_id: review.reviewee_id,
      rating: review.rating,
      comment: review.comment || null,
      // Snapshot fields from booking (migration 105)
      service_name: booking?.service_name,
      subjects: booking?.subjects,
      levels: booking?.levels,
      session_date: booking?.session_start_time,
      location_type: booking?.location_type,
      booking_id: (session as any).booking_id,
    }));

    const { data: insertedReviews, error: insertError } = await supabase
      .from('profile_reviews')
      .insert(reviewInserts)
      .select();

    if (insertError) {
      console.error('[API] Review insert error:', insertError);
      throw insertError;
    }

    // 7. Fetch updated session to check if it was published
    const { data: updatedSession, error: updatedSessionError } = await supabase
      .from('booking_review_sessions')
      .select(`
        id,
        status,
        published_at,
        participant_ids,
        booking:booking_id(
          id,
          service_name
        )
      `)
      .eq('id', session_id)
      .single();

    if (updatedSessionError) throw updatedSessionError;

    // 8. If session was auto-published, send Ably notifications and emails to all participants
    if (updatedSession.status === 'published' && updatedSession.booking) {
      const booking: any = Array.isArray(updatedSession.booking)
        ? updatedSession.booking[0]
        : updatedSession.booking;

      if (booking) {
        // Send Ably real-time notifications
        await notifySessionPublished(
          updatedSession.participant_ids,
          session_id,
          booking.id,
          booking.service_name
        );

        // Send email notifications for each review
        // Fetch all published reviews for this session with reviewer/reviewee info
        const { data: publishedReviews } = await supabase
          .from('profile_reviews')
          .select(`
            rating,
            comment,
            service_name,
            session_date,
            reviewer:reviewer_id(full_name),
            reviewee:reviewee_id(full_name, email)
          `)
          .eq('session_id', session_id);

        if (publishedReviews) {
          for (const review of publishedReviews) {
            const reviewer: any = Array.isArray(review.reviewer) ? review.reviewer[0] : review.reviewer;
            const reviewee: any = Array.isArray(review.reviewee) ? review.reviewee[0] : review.reviewee;

            if (reviewee?.email) {
              try {
                await sendNewReviewEmail({
                  recipientName: reviewee.full_name || 'User',
                  recipientEmail: reviewee.email,
                  reviewerName: reviewer?.full_name || 'A user',
                  rating: review.rating,
                  comment: review.comment || undefined,
                  serviceName: review.service_name || booking.service_name,
                  sessionDate: review.session_date ? new Date(review.session_date) : undefined,
                });
                console.log(`[API] Review email sent to: ${reviewee.email}`);
              } catch (emailErr) {
                console.error('[API] Failed to send review email:', emailErr);
              }
            }
          }
        }
      }
    }

    // 9. Log submission to audit_log
    await supabase.from('audit_log').insert({
      action_type: 'review.submitted',
      module: 'Reviews',
      details: {
        session_id,
        reviewer_id: user.id,
        reviews_count: reviews.length,
        auto_published: updatedSession.status === 'published',
      },
    });

    return NextResponse.json({
      success: true,
      reviews: insertedReviews,
      session_status: updatedSession.status,
      auto_published: updatedSession.status === 'published',
    });

  } catch (error) {
    console.error('[API] POST /api/reviews/submit error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
