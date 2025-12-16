/**
 * Filename: apps/web/src/app/api/dashboard/summary/route.ts
 * Purpose: Aggregated dashboard stats for unified hub right sidebar
 * Created: 2025-11-08
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

    // Parallel fetch all dashboard stats
    const [
      pendingReviewsResult,
      upcomingBookingsResult,
      earningsResult,
      ratingsResult,
      unreadMessagesResult,
    ] = await Promise.all([
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

      // 3. Earnings (role-specific)
      role === 'client'
        ? supabase
            .from('bookings')
            .select('total_price')
            .eq('client_id', user.id)
            .eq('status', 'completed')
        : supabase
            .from('bookings')
            .select('tutor_earnings, agent_commission')
            .or(`tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
            .eq('status', 'completed'),

      // 4. Average rating
      supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', user.id)
        .eq('status', 'published'),

      // 5. Unread messages (placeholder - actual implementation depends on messaging system)
      Promise.resolve({ data: [], count: 0 }),
    ]);

    // Process pending reviews
    const pendingReviews = pendingReviewsResult.data || [];
    // Calculate days remaining from publish_at date
    const urgentReviews = pendingReviews.filter((r) => {
      if (!r.publish_at) return false;
      const daysRemaining = Math.ceil((new Date(r.publish_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysRemaining <= 1;
    });

    // Process upcoming bookings
    const upcomingBookings = upcomingBookingsResult.data || [];
    const nextBooking = upcomingBookings[0] || null;

    // Process earnings
    let totalEarnings = 0;
    let totalSpent = 0;
    if (role === 'client') {
      // Client: total spent
      totalSpent = (earningsResult.data || []).reduce(
        (sum: number, b: any) => sum + (b.total_price || 0),
        0
      );
      totalEarnings = 0; // Clients don't earn from bookings
    } else if (role === 'tutor') {
      // Tutor: tutor earnings only
      totalEarnings = (earningsResult.data || []).reduce(
        (sum: number, b: any) => sum + (b.tutor_earnings || 0),
        0
      );
    } else if (role === 'agent') {
      // Agent: agent commissions only
      totalEarnings = (earningsResult.data || []).reduce(
        (sum: number, b: any) => sum + (b.agent_commission || 0),
        0
      );
    }

    // Process average rating
    const ratings = ratingsResult.data || [];
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
        : 0;

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
      financials: {
        total_earnings: totalEarnings,
        total_spent: totalSpent,
        currency: 'GBP', // Default currency
      },
      reputation: {
        average_rating: Math.round(averageRating * 10) / 10,
        total_reviews: ratings.length,
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
