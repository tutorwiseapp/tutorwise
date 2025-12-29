/**
 * Filename: src/app/api/admin/revenue-stats/route.ts
 * Purpose: API endpoint to fetch revenue statistics for admin dashboard
 * Created: 2025-12-29
 * Pattern: Server-only API route with real-time revenue calculations
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

interface RevenueStatsResponse {
  totalRevenue: number;
  platformFees: number;
  pendingPayouts: number;
  processedPayouts: number;
}

/**
 * GET /api/admin/revenue-stats
 * Fetch revenue statistics from last 30 days
 */
export async function GET() {
  try {
    // Verify user is authenticated and is an admin
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is an admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', user.id)
      .single();

    if (!profile?.admin_role) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Fetch all completed bookings from last 30 days
    const { data: completedBookings, error: completedError } = await supabase
      .from('bookings')
      .select('total_price, tutor_earnings, platform_fee, status, booking_type')
      .eq('status', 'completed')
      .gte('session_start_time', thirtyDaysAgo.toISOString());

    if (completedError) {
      console.error('Error fetching completed bookings:', completedError);
      return NextResponse.json(
        { error: 'Failed to fetch completed bookings' },
        { status: 500 }
      );
    }

    // Fetch pending bookings (confirmed but not completed)
    const { data: pendingBookings, error: pendingError } = await supabase
      .from('bookings')
      .select('total_price, tutor_earnings, platform_fee, booking_type')
      .eq('status', 'confirmed')
      .gte('session_start_time', thirtyDaysAgo.toISOString());

    if (pendingError) {
      console.error('Error fetching pending bookings:', pendingError);
      return NextResponse.json(
        { error: 'Failed to fetch pending bookings' },
        { status: 500 }
      );
    }

    // Calculate statistics
    let totalRevenue = 0;
    let platformFees = 0;
    let processedPayouts = 0;

    // Process completed bookings
    completedBookings?.forEach((booking) => {
      const price = Number(booking.total_price) || 0;
      const fee = Number(booking.platform_fee) || 0;
      const tutorEarning = Number(booking.tutor_earnings) || 0;

      // Only count paid bookings (exclude free help)
      if (booking.booking_type !== 'free_help' && price > 0) {
        totalRevenue += price;
        platformFees += fee;
        processedPayouts += tutorEarning;
      }
    });

    // Calculate pending payouts
    let pendingPayouts = 0;
    pendingBookings?.forEach((booking) => {
      const tutorEarning = Number(booking.tutor_earnings) || 0;
      if (booking.booking_type !== 'free_help' && tutorEarning > 0) {
        pendingPayouts += tutorEarning;
      }
    });

    const stats: RevenueStatsResponse = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      platformFees: Math.round(platformFees * 100) / 100,
      pendingPayouts: Math.round(pendingPayouts * 100) / 100,
      processedPayouts: Math.round(processedPayouts * 100) / 100,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching revenue stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue statistics' },
      { status: 500 }
    );
  }
}
