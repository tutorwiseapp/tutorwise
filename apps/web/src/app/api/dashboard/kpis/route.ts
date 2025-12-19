/**
 * Filename: apps/web/src/app/api/dashboard/kpis/route.ts
 * Purpose: Fetch comprehensive KPI metrics for dashboard
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

    // Calculate date ranges for this month and last month
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Parallel fetch all KPI data
    const [
      upcomingBookingsResult,
      completedBookingsResult,
      completedBookingsLastMonthResult,
      allCompletedBookingsResult,
      earningsResult,
      earningsLastMonthResult,
      ratingsResult,
      ratingsGivenResult,
      caasResult,
    ] = await Promise.all([
      // 1. Upcoming bookings (next 7 days)
      supabase
        .from('bookings')
        .select('id, session_start_time, session_duration_hours')
        .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id},student_id.eq.${user.id}`)
        .gte('session_start_time', new Date().toISOString())
        .lte('session_start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('session_start_time', { ascending: true }),

      // 2. Completed bookings this month
      supabase
        .from('bookings')
        .select('id, client_id, tutor_id')
        .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id},student_id.eq.${user.id}`)
        .eq('status', 'completed')
        .gte('session_start_time', thisMonthStart.toISOString()),

      // 3. Completed bookings last month (for comparison)
      supabase
        .from('bookings')
        .select('id, client_id, tutor_id')
        .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id},student_id.eq.${user.id}`)
        .eq('status', 'completed')
        .gte('session_start_time', lastMonthStart.toISOString())
        .lte('session_start_time', lastMonthEnd.toISOString()),

      // 4. All completed bookings (for total hours learned)
      supabase
        .from('bookings')
        .select('session_duration_hours')
        .eq('client_id', user.id)
        .eq('status', 'completed'),

      // 5. Earnings/Spending this month (role-specific)
      role === 'client'
        ? supabase
            .from('bookings')
            .select('total_price')
            .eq('client_id', user.id)
            .eq('status', 'completed')
            .gte('session_start_time', thisMonthStart.toISOString())
        : supabase
            .from('bookings')
            .select('tutor_earnings, agent_commission, tutor_id, agent_id')
            .or(`tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
            .eq('status', 'completed')
            .gte('session_start_time', thisMonthStart.toISOString()),

      // 6. Earnings/Spending last month (for comparison)
      role === 'client'
        ? supabase
            .from('bookings')
            .select('total_price')
            .eq('client_id', user.id)
            .eq('status', 'completed')
            .gte('session_start_time', lastMonthStart.toISOString())
            .lte('session_start_time', lastMonthEnd.toISOString())
        : supabase
            .from('bookings')
            .select('tutor_earnings, agent_commission, tutor_id, agent_id')
            .or(`tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
            .eq('status', 'completed')
            .gte('session_start_time', lastMonthStart.toISOString())
            .lte('session_start_time', lastMonthEnd.toISOString()),

      // 7. Ratings received
      supabase
        .from('reviews')
        .select('rating, created_at')
        .eq('reviewee_id', user.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false }),

      // 8. Ratings given (for clients)
      supabase
        .from('reviews')
        .select('rating')
        .eq('reviewer_id', user.id)
        .eq('status', 'published'),

      // 9. CaaS score from caas_scores table
      supabase
        .from('caas_scores')
        .select('total_score')
        .eq('profile_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single(),
    ]);

    // Process upcoming bookings
    const upcomingBookings = upcomingBookingsResult.data || [];
    const upcomingSessions = upcomingBookings.length;
    const upcomingHours = upcomingBookings.reduce(
      (sum, b) => sum + (b.session_duration_hours || 1),
      0
    );

    // Process completed bookings
    const completedBookings = completedBookingsResult.data || [];
    const completedSessionsThisMonth = completedBookings.length;

    const completedBookingsLastMonth = completedBookingsLastMonthResult.data || [];
    const completedSessionsLastMonth = completedBookingsLastMonth.length;

    // Process total hours learned (for clients)
    const allCompletedBookings = allCompletedBookingsResult.data || [];
    const totalHoursLearned = allCompletedBookings.reduce(
      (sum, b) => sum + (b.session_duration_hours || 0),
      0
    );

    // Calculate repeat students (for tutors/agents)
    let repeatStudentsPercent = 0;
    let repeatStudentsCount = 0;
    let totalStudents = 0;

    if (role !== 'client') {
      const clientCounts = completedBookings.reduce((acc: Record<string, number>, booking) => {
        const clientId = booking.client_id;
        if (clientId) {
          acc[clientId] = (acc[clientId] || 0) + 1;
        }
        return acc;
      }, {});

      totalStudents = Object.keys(clientCounts).length;
      repeatStudentsCount = Object.values(clientCounts).filter(count => count > 1).length;
      repeatStudentsPercent = totalStudents > 0 ? Math.round((repeatStudentsCount / totalStudents) * 100) : 0;
    }

    // Process earnings/spending
    let totalEarnings = 0;
    let totalSpent = 0;
    let totalEarningsLastMonth = 0;
    let totalSpentLastMonth = 0;

    if (role === 'client') {
      // Client: total spent this month
      totalSpent = (earningsResult.data || []).reduce(
        (sum: number, b: any) => sum + (b.total_price || 0),
        0
      );
      // Client: total spent last month
      totalSpentLastMonth = (earningsLastMonthResult.data || []).reduce(
        (sum: number, b: any) => sum + (b.total_price || 0),
        0
      );
      totalEarnings = 0; // Clients don't earn
    } else if (role === 'tutor') {
      // Tutor: tutor earnings only this month
      totalEarnings = (earningsResult.data || []).reduce(
        (sum: number, b: any) => {
          if (b.tutor_id === user.id) {
            return sum + (b.tutor_earnings || 0);
          }
          return sum;
        },
        0
      );
      // Tutor: tutor earnings last month
      totalEarningsLastMonth = (earningsLastMonthResult.data || []).reduce(
        (sum: number, b: any) => {
          if (b.tutor_id === user.id) {
            return sum + (b.tutor_earnings || 0);
          }
          return sum;
        },
        0
      );
    } else if (role === 'agent') {
      // Agent: agent commissions only this month
      totalEarnings = (earningsResult.data || []).reduce(
        (sum: number, b: any) => {
          if (b.agent_id === user.id) {
            return sum + (b.agent_commission || 0);
          }
          return sum;
        },
        0
      );
      // Agent: agent commissions last month
      totalEarningsLastMonth = (earningsLastMonthResult.data || []).reduce(
        (sum: number, b: any) => {
          if (b.agent_id === user.id) {
            return sum + (b.agent_commission || 0);
          }
          return sum;
        },
        0
      );
    }

    // Process average rating received
    const ratings = ratingsResult.data || [];
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
        : 0;

    // Last 10 ratings average
    const last10Ratings = ratings.slice(0, 10);
    const last10Rating =
      last10Ratings.length > 0
        ? last10Ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / last10Ratings.length
        : averageRating;

    // Process average rating given (for clients)
    const ratingsGiven = ratingsGivenResult.data || [];
    const averageRatingGiven =
      ratingsGiven.length > 0
        ? ratingsGiven.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingsGiven.length
        : 0;
    const reviewsGiven = ratingsGiven.length;

    // Process CaaS score
    const caasScore = caasResult.data?.total_score || 0;

    // Calculate month-over-month changes
    // Helper to calculate percentage change
    const calculatePercentChange = (current: number, previous: number): number | null => {
      if (previous === 0) {
        // If previous was 0 but current has value, show as positive growth
        return current > 0 ? 100 : null;
      }
      const change = ((current - previous) / previous) * 100;
      return Math.round(change);
    };

    // Calculate changes
    const earningsChange = calculatePercentChange(totalEarnings, totalEarningsLastMonth);
    const spentChange = calculatePercentChange(totalSpent, totalSpentLastMonth);
    const sessionsChange = completedSessionsThisMonth - completedSessionsLastMonth;

    // Build KPI response
    const kpis = {
      totalEarnings: Math.round(totalEarnings),
      totalSpent: Math.round(totalSpent),
      upcomingSessions,
      upcomingHours,
      completedSessionsThisMonth,
      completedSessionsLastMonth,
      averageRating: averageRating > 0 ? Math.round(averageRating * 10) / 10 : 0,
      totalReviews: ratings.length,
      last10Rating: last10Rating > 0 ? Math.round(last10Rating * 10) / 10 : 0,
      repeatStudentsPercent,
      repeatStudentsCount,
      totalStudents,
      responseRate: 92, // TODO: Calculate from messaging data when available
      acceptanceRate: 78, // TODO: Calculate from booking requests when available
      caasScore: caasScore,
      activeBookings: upcomingSessions,
      favoriteTutors: 2, // TODO: Calculate from profile_graph or favorites table when available
      totalHoursLearned: Math.round(totalHoursLearned * 10) / 10,
      averageRatingGiven: averageRatingGiven > 0 ? Math.round(averageRatingGiven * 10) / 10 : 0,
      reviewsGiven: reviewsGiven,
      // Month-over-month comparisons
      earningsChangePercent: earningsChange,
      spentChangePercent: spentChange,
      sessionsChange: sessionsChange,
    };

    return NextResponse.json(kpis);
  } catch (error) {
    console.error('[Dashboard KPIs API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard KPIs' },
      { status: 500 }
    );
  }
}
