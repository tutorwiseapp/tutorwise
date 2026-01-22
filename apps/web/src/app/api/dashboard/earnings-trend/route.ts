/**
 * Filename: apps/web/src/app/api/dashboard/earnings-trend/route.ts
 * Purpose: Fetch weekly earnings trend data for dashboard chart
 * Created: 2025-12-07
 * Updated: 2026-01-22 - Phase 2: Migrated to use user_statistics_daily table
 *
 * MIGRATION NOTES:
 * - Now queries pre-aggregated user_statistics_daily table
 * - Simplified from N queries (one per week) to 1 query with date range
 * - Supports daily granularity for better trend visualization
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
    const daysToFetch = weeks * 7;

    // Calculate date range
    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysToFetch);

    // Fetch all daily statistics for the date range
    const { data: dailyStats } = await supabase
      .from('user_statistics_daily')
      .select('date, total_earnings, total_spending, monthly_earnings, monthly_spending')
      .eq('user_id', user.id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (!dailyStats || dailyStats.length === 0) {
      // No data available yet, return empty array
      return NextResponse.json([]);
    }

    // Group by week and aggregate
    const weeklyData: { week: string; earnings: number }[] = [];
    let currentWeekStart = new Date(startDate);
    let weekEarnings = 0;
    let daysInWeek = 0;

    dailyStats.forEach((stat, index) => {
      const statDate = new Date(stat.date);

      // Check if we need to start a new week
      const daysSinceWeekStart = Math.floor(
        (statDate.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceWeekStart >= 7) {
        // Save current week if we have data
        if (daysInWeek > 0) {
          const weekLabel = currentWeekStart.toLocaleDateString('en-GB', {
            month: 'short',
            day: 'numeric',
          });
          weeklyData.push({
            week: weekLabel,
            earnings: Math.round(weekEarnings * 100) / 100,
          });
        }

        // Start new week
        currentWeekStart = new Date(stat.date);
        weekEarnings = 0;
        daysInWeek = 0;
      }

      // Add earnings for this day based on role
      const dayEarnings =
        role === 'client'
          ? stat.monthly_spending || 0
          : stat.monthly_earnings || 0;

      weekEarnings += dayEarnings;
      daysInWeek++;

      // If this is the last stat, close out the week
      if (index === dailyStats.length - 1 && daysInWeek > 0) {
        const weekLabel = currentWeekStart.toLocaleDateString('en-GB', {
          month: 'short',
          day: 'numeric',
        });
        weeklyData.push({
          week: weekLabel,
          earnings: Math.round(weekEarnings * 100) / 100,
        });
      }
    });

    return NextResponse.json(weeklyData);
  } catch (error) {
    console.error('[Earnings Trend API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings trend' },
      { status: 500 }
    );
  }
}
