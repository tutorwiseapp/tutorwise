/**
 * Filename: apps/web/src/app/api/reviews/given/route.ts
 * Purpose: API endpoint to fetch reviews given by the authenticated user
 * Created: 2025-11-08
 * Related: reviews-solution-design-v4.5.md
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/reviews/given
 * Returns all reviews written by the authenticated user
 * Query params:
 *   - limit (optional): Number of reviews to return (default: 50)
 *   - offset (optional): Pagination offset (default: 0)
 *   - status (optional): Filter by session status ('pending' | 'published')
 */
export async function GET(req: Request) {
  const supabase = await createClient();

  try {
    // 1. Authenticate user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const statusFilter = searchParams.get('status');

    // 3. Fetch reviews written by the user
    const { data: reviews, error: reviewsError } = await supabase
      .from('profile_reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        reviewee:reviewee_id(id, full_name, avatar_url, active_role),
        session:session_id(
          id,
          status,
          published_at,
          publish_at,
          booking:booking_id(
            id,
            service_name,
            session_start_time
          )
        )
      `)
      .eq('reviewer_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (reviewsError) throw reviewsError;

    // 4. Filter by status if provided
    let filteredReviews = reviews || [];
    if (statusFilter) {
      filteredReviews = filteredReviews.filter(
        (review: any) => review.session?.status === statusFilter
      );
    }

    // 5. Separate into pending and published
    const pendingReviews = filteredReviews.filter(
      (review: any) => review.session?.status === 'pending'
    );
    const publishedReviews = filteredReviews.filter(
      (review: any) => review.session?.status === 'published'
    );

    return NextResponse.json({
      reviews: filteredReviews,
      stats: {
        total: filteredReviews.length,
        pending: pendingReviews.length,
        published: publishedReviews.length,
      },
    });

  } catch (error) {
    console.error('[API] GET /api/reviews/given error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
