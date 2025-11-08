/**
 * Filename: apps/web/src/app/api/reviews/pending-tasks/route.ts
 * Purpose: API endpoint to fetch pending review tasks for the authenticated user
 * Created: 2025-11-08
 * Related: reviews-solution-design-v4.5.md
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/reviews/pending-tasks
 * Returns all review sessions where the user needs to submit reviews
 * - Only shows sessions in 'pending' status
 * - Only shows sessions where user is a participant
 * - Only shows sessions where user has not yet submitted
 */
export async function GET() {
  const supabase = createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Fetch pending review sessions where user is a participant
    // AND user has not yet submitted their reviews
    const { data: sessions, error: sessionsError } = await supabase
      .from('booking_review_sessions')
      .select(`
        id,
        booking_id,
        status,
        publish_at,
        participant_ids,
        submitted_ids,
        created_at,
        booking:booking_id(
          id,
          service_name,
          session_start_time,
          amount,
          client:client_id(id, full_name, avatar_url),
          tutor:tutor_id(id, full_name, avatar_url),
          referrer:referrer_profile_id(id, full_name, avatar_url)
        )
      `)
      .eq('status', 'pending')
      .contains('participant_ids', [user.id])
      .order('publish_at', { ascending: true });

    if (sessionsError) throw sessionsError;

    // 3. Filter out sessions where user has already submitted
    const pendingTasks = (sessions || []).filter(
      (session) => !session.submitted_ids?.includes(user.id)
    );

    // 4. For each pending task, determine who the user needs to review
    const tasksWithReviewees = pendingTasks.map((session) => {
      // Extract all participants except current user
      const reviewees = session.participant_ids.filter((id: string) => id !== user.id);

      return {
        ...session,
        reviewees_count: reviewees.length,
        days_remaining: Math.ceil(
          (new Date(session.publish_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      };
    });

    return NextResponse.json({
      tasks: tasksWithReviewees,
      count: tasksWithReviewees.length,
    });

  } catch (error) {
    console.error('[API] GET /api/reviews/pending-tasks error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
