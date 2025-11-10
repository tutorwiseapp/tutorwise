/**
 * Filename: apps/web/src/app/api/reviews/received/route.ts
 * Purpose: API endpoint to fetch reviews received by the authenticated user
 * Created: 2025-11-08
 * Related: reviews-solution-design-v4.5.md
 */

import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews/received
 * Returns all published reviews where the authenticated user is the reviewee
 * Query params:
 *   - limit (optional): Number of reviews to return (default: 50)
 *   - offset (optional): Pagination offset (default: 0)
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

    // 3. Fetch published reviews where user is the reviewee
    const { data: reviews, error: reviewsError } = await supabase
      .from('profile_reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        reviewer:reviewer_id(id, full_name, avatar_url, active_role),
        session:session_id(
          id,
          status,
          published_at,
          booking:booking_id(
            id,
            service_name,
            session_start_time
          )
        )
      `)
      .eq('reviewee_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (reviewsError) throw reviewsError;

    // 4. Filter to only show reviews from published sessions
    const publishedReviews = (reviews || []).filter(
      (review: any) => review.session?.status === 'published'
    );

    // 5. Calculate aggregate stats
    const totalReviews = publishedReviews.length;
    const averageRating = totalReviews > 0
      ? publishedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;

    const ratingDistribution = {
      5: publishedReviews.filter((r) => r.rating === 5).length,
      4: publishedReviews.filter((r) => r.rating === 4).length,
      3: publishedReviews.filter((r) => r.rating === 3).length,
      2: publishedReviews.filter((r) => r.rating === 2).length,
      1: publishedReviews.filter((r) => r.rating === 1).length,
    };

    return NextResponse.json({
      reviews: publishedReviews,
      stats: {
        total: totalReviews,
        average: parseFloat(averageRating.toFixed(2)),
        distribution: ratingDistribution,
      },
    });

  } catch (error) {
    console.error('[API] GET /api/reviews/received error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
