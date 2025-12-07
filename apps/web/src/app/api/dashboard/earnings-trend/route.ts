/**
 * Filename: apps/web/src/app/api/dashboard/earnings-trend/route.ts
 * Purpose: Fetch weekly earnings trend data for dashboard chart
 * Created: 2025-12-07
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

    // Get user profile for role context
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, active_role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const role = profile.active_role;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const weeks = parseInt(searchParams.get('weeks') || '6');

    // Calculate date ranges for last N weeks
    const weeklyData = [];
    const now = new Date();

    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i + 1) * 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);
      weekEnd.setHours(23, 59, 59, 999);

      // Fetch earnings for this week
      const { data: bookings } = await supabase
        .from('bookings')
        .select('tutor_earnings, agent_commission, total_price, tutor_id, agent_id, client_id')
        .or(`tutor_id.eq.${user.id},agent_id.eq.${user.id},client_id.eq.${user.id}`)
        .eq('status', 'completed')
        .gte('session_start_time', weekStart.toISOString())
        .lte('session_start_time', weekEnd.toISOString());

      // Calculate earnings based on role
      let weekEarnings = 0;
      if (role === 'client') {
        weekEarnings = (bookings || []).reduce(
          (sum, b) => sum + (b.total_price || 0),
          0
        );
      } else if (role === 'tutor') {
        weekEarnings = (bookings || []).reduce(
          (sum, b) => {
            if (b.tutor_id === user.id) {
              return sum + (b.tutor_earnings || 0);
            }
            return sum;
          },
          0
        );
      } else if (role === 'agent') {
        weekEarnings = (bookings || []).reduce(
          (sum, b) => {
            if (b.agent_id === user.id) {
              return sum + (b.agent_commission || 0);
            }
            return sum;
          },
          0
        );
      }

      // Format week label
      const weekLabel = weekStart.toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric'
      });

      weeklyData.push({
        week: weekLabel,
        earnings: Math.round(weekEarnings * 100) / 100,
      });
    }

    return NextResponse.json(weeklyData);
  } catch (error) {
    console.error('[Earnings Trend API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings trend' },
      { status: 500 }
    );
  }
}
