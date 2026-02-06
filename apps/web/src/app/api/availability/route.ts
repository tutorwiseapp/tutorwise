/**
 * Filename: availability/route.ts
 * Purpose: API endpoint to check tutor availability for scheduling
 * Returns: Available dates for a given month based on tutor's weekly schedule and existing bookings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tutorId = searchParams.get('tutorId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!tutorId || !month || !year) {
      return NextResponse.json(
        { error: 'Missing required parameters: tutorId, month, year' },
        { status: 400 }
      );
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 0 || monthNum > 11) {
      return NextResponse.json(
        { error: 'Invalid month or year parameter' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // 1. Get tutor's weekly availability from their listing
    // Include both published and draft listings (drafts may have existing bookings)
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('availability, timezone')
      .eq('profile_id', tutorId)
      .in('status', ['published', 'draft'])
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: 'Tutor listing not found' },
        { status: 404 }
      );
    }

    // 2. Get existing bookings for the month to exclude booked times
    const startOfMonth = new Date(yearNum, monthNum, 1);
    const endOfMonth = new Date(yearNum, monthNum + 1, 0, 23, 59, 59);

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('session_start_time, duration_minutes')
      .eq('tutor_id', tutorId)
      .gte('session_start_time', startOfMonth.toISOString())
      .lte('session_start_time', endOfMonth.toISOString())
      .in('status', ['Pending', 'Confirmed', 'Completed'])
      .in('scheduling_status', ['proposed', 'scheduled']);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    // 3. Calculate available dates
    const availableDates = calculateAvailability(
      listing.availability || {},
      bookings || [],
      monthNum,
      yearNum
    );

    return NextResponse.json({
      availableDates,
      timezone: listing.timezone || 'Europe/London',
    });
  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate available dates for a month based on weekly schedule and existing bookings
 */
function calculateAvailability(
  weeklyAvailability: Record<string, string[]>,
  bookings: Array<{ session_start_time: string; duration_minutes: number }>,
  month: number,
  year: number
): string[] {
  const availableDates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);

    // Skip past dates
    if (date < today) {
      continue;
    }

    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

    // Check if tutor has availability on this day of week
    const dayAvailability = weeklyAvailability[dayOfWeek];
    if (!dayAvailability || dayAvailability.length === 0) {
      continue;
    }

    // Check if day has at least some available time slots
    // (Even if fully booked, we'll show it and filter time slots later)
    // For now, we'll include any day that the tutor has weekly availability for
    const hasAnyAvailability = dayAvailability.some(timeRange => {
      const [start, end] = timeRange.split('-');
      return start && end; // Valid time range exists
    });

    if (hasAnyAvailability) {
      availableDates.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
    }
  }

  return availableDates;
}
