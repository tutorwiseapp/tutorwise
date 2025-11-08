/**
 * Filename: apps/web/src/app/api/reviews/session/[session_id]/route.ts
 * Purpose: API endpoint to fetch details of a specific review session
 * Created: 2025-11-08
 * Related: reviews-solution-design-v4.5.md
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/reviews/session/[session_id]
 * Returns details of a specific review session including all reviews
 * Only accessible to participants in the session
 */
export async function GET(
  req: Request,
  { params }: { params: { session_id: string } }
) {
  const supabase = createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { session_id } = params;

    // 2. Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('booking_review_sessions')
      .select(`
        id,
        booking_id,
        status,
        publish_at,
        published_at,
        participant_ids,
        submitted_ids,
        created_at,
        booking:booking_id(
          id,
          service_name,
          session_start_time,
          session_duration,
          amount,
          booking_type,
          client:client_id(id, full_name, avatar_url),
          tutor:tutor_id(id, full_name, avatar_url),
          agent:agent_profile_id(id, full_name, avatar_url)
        )
      `)
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return new NextResponse('Session not found', { status: 404 });
    }

    // 3. Verify user is a participant
    if (!session.participant_ids.includes(user.id)) {
      return new NextResponse('You are not a participant in this session', { status: 403 });
    }

    // 4. Fetch all reviews for this session (only if published OR user is reviewee)
    const { data: reviews, error: reviewsError } = await supabase
      .from('profile_reviews')
      .select(`
        id,
        reviewer_id,
        reviewee_id,
        rating,
        comment,
        created_at,
        reviewer:reviewer_id(id, full_name, avatar_url),
        reviewee:reviewee_id(id, full_name, avatar_url)
      `)
      .eq('session_id', session_id);

    if (reviewsError) throw reviewsError;

    // 5. Filter reviews based on session status and user access
    let visibleReviews = reviews || [];
    if (session.status === 'pending') {
      // Only show reviews where current user is the reviewee
      visibleReviews = visibleReviews.filter((r) => r.reviewee_id === user.id);
    }

    // 6. Determine who user needs to review (if session is pending)
    let revieweesNeeded: string[] = [];
    if (session.status === 'pending' && !session.submitted_ids?.includes(user.id)) {
      revieweesNeeded = session.participant_ids.filter((id: string) => id !== user.id);
    }

    // 7. Calculate time remaining
    const timeRemaining = session.status === 'pending'
      ? new Date(session.publish_at).getTime() - Date.now()
      : 0;

    const daysRemaining = Math.max(0, Math.ceil(timeRemaining / (1000 * 60 * 60 * 24)));

    return NextResponse.json({
      session: {
        ...session,
        days_remaining: daysRemaining,
        user_has_submitted: session.submitted_ids?.includes(user.id) || false,
        reviewees_needed: revieweesNeeded,
      },
      reviews: visibleReviews,
    });

  } catch (error) {
    console.error('[API] GET /api/reviews/session/[session_id] error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
