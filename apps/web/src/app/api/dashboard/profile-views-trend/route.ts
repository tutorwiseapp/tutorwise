/**
 * Filename: apps/web/src/app/api/dashboard/profile-views-trend/route.ts
 * Purpose: Fetch profile views trend data for analytics dashboard
 * Created: 2025-12-08
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Mark route as dynamic (required for cookies() in Next.js 15)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch daily views data
    const { data: viewsData, error: viewsError } = await supabase.rpc(
      'get_profile_views_by_day',
      {
        p_profile_id: user.id,
        p_days: days
      }
    );

    // If RPC doesn't exist, fall back to manual aggregation
    if (viewsError?.code === '42883') {
      // Function doesn't exist, use fallback query
      const { data: rawViews, error: rawError } = await supabase
        .from('profile_views')
        .select('viewed_at, viewer_id')
        .eq('profile_id', user.id)
        .gte('viewed_at', startDate.toISOString())
        .order('viewed_at', { ascending: true });

      if (rawError) throw rawError;

      // Group by date manually
      const viewsByDate: { [key: string]: { total: number; unique: Set<string> } } = {};

      rawViews?.forEach((view) => {
        const date = new Date(view.viewed_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });

        if (!viewsByDate[date]) {
          viewsByDate[date] = { total: 0, unique: new Set() };
        }

        viewsByDate[date].total += 1;
        if (view.viewer_id) {
          viewsByDate[date].unique.add(view.viewer_id);
        }
      });

      // Convert to array format
      const trendData = Object.entries(viewsByDate).map(([date, data]) => ({
        date,
        total_views: data.total,
        unique_viewers: data.unique.size
      }));

      return NextResponse.json(trendData);
    }

    if (viewsError) throw viewsError;

    return NextResponse.json(viewsData || []);
  } catch (error) {
    console.error('Error fetching profile views trend:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
