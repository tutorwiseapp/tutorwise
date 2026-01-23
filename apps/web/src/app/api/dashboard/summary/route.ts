/**
 * Filename: apps/web/src/app/api/dashboard/summary/route.ts
 * Purpose: Aggregated dashboard stats for unified hub right sidebar
 * Created: 2025-11-08
 * Updated: 2026-01-22 - Phase 2: Migrated to use user_statistics_daily table
 *
 * MIGRATION NOTES:
 * - Now queries pre-aggregated user_statistics_daily table for most metrics
 * - Still queries live data for urgent/upcoming items (reviews, bookings)
 * - Simplified financial and reputation queries
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

    // Fetch today's statistics from pre-aggregated table
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayStats } = await supabase
      .from('user_statistics_daily')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today.toISOString().split('T')[0])
      .single();

    // Parallel fetch live data for urgent/time-sensitive items
    const [pendingReviewsResult, upcomingBookingsResult, unreadMessagesResult] = await Promise.all([
      // 1. Pending reviews (urgent)
      supabase
        .from('booking_review_sessions')
        .select('id, publish_at, status')
        .eq('status', 'pending')
        .contains('participant_ids', [user.id]),

      // 2. Upcoming bookings (next 7 days)
      supabase
        .from('bookings')
        .select('id, session_start_time, service_name')
        .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
        .gte('session_start_time', new Date().toISOString())
        .lte('session_start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('session_start_time', { ascending: true })
        .limit(5),

      // 3. Unread messages (placeholder - actual implementation depends on messaging system)
      Promise.resolve({ data: [], count: 0 }),
    ]);

    // Process pending reviews
    const pendingReviews = pendingReviewsResult.data || [];
    // Calculate days remaining from publish_at date
    const urgentReviews = pendingReviews.filter((r) => {
      if (!r.publish_at) return false;
      const daysRemaining = Math.ceil(
        (new Date(r.publish_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysRemaining <= 1;
    });

    // Process upcoming bookings
    const upcomingBookings = upcomingBookingsResult.data || [];
    const nextBooking = upcomingBookings[0] || null;

    // Get financial and reputation data from aggregated stats (role-specific)
    const averageRating = todayStats?.average_rating || 0;
    const totalReviews = todayStats?.total_reviews || 0;

    // Build role-specific financial data
    let financials;
    if (role === 'client') {
      financials = {
        total_spent: todayStats?.total_spending || 0,
        currency: 'GBP',
      };
    } else if (role === 'tutor' || role === 'agent') {
      financials = {
        total_earnings: todayStats?.total_earnings || 0,
        pending_earnings: todayStats?.pending_earnings || 0,
        currency: 'GBP',
      };
    } else {
      financials = {
        currency: 'GBP',
      };
    }

    // Build response
    const summary = {
      urgent: {
        pending_reviews: pendingReviews.length,
        urgent_reviews: urgentReviews.length,
      },
      upcoming: {
        next_booking: nextBooking
          ? {
              id: nextBooking.id,
              service_name: nextBooking.service_name,
              session_start_time: nextBooking.session_start_time,
            }
          : null,
        total_upcoming: upcomingBookings.length,
      },
      financials,
      reputation: {
        average_rating: Math.round(averageRating * 10) / 10,
        total_reviews: totalReviews,
      },
      messages: {
        unread_count: 0, // Placeholder
      },
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[Dashboard Summary API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}
