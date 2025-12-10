/**
 * Filename: apps/web/src/app/api/dashboard/booking-heatmap/route.ts
 * Purpose: Fetch booking heatmap data for next 14 days
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

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '14');

    // Calculate date range
    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + days);

    // Fetch all bookings in the next N days
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('session_start_time, session_duration')
      .or(`client_id.eq.${user.id},tutor_id.eq.${user.id},agent_id.eq.${user.id}`)
      .gte('session_start_time', now.toISOString())
      .lte('session_start_time', endDate.toISOString())
      .order('session_start_time', { ascending: true });

    if (bookingsError) {
      throw bookingsError;
    }

    // Group bookings by date
    const dailyBookings: Record<string, { count: number; hours: number }> = {};

    (bookings || []).forEach((booking) => {
      const date = new Date(booking.session_start_time).toISOString().split('T')[0];
      if (!dailyBookings[date]) {
        dailyBookings[date] = { count: 0, hours: 0 };
      }
      dailyBookings[date].count += 1;
      // Convert minutes to hours
      dailyBookings[date].hours += (booking.session_duration || 60) / 60;
    });

    // Convert to array format expected by component
    const heatmapData = Object.entries(dailyBookings).map(([date, data]) => ({
      date,
      count: data.count,
      hours: Math.round(data.hours * 10) / 10,
    }));

    return NextResponse.json(heatmapData);
  } catch (error) {
    console.error('[Booking Heatmap API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking heatmap' },
      { status: 500 }
    );
  }
}
