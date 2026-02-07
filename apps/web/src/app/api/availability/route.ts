/**
 * Filename: availability/route.ts
 * Purpose: API endpoint to check tutor availability for scheduling
 * Returns: Available dates for a given month based on tutor's weekly schedule, existing bookings, and exceptions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getTutorExceptions } from '@/lib/availability/exceptions';

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

    const supabase = await createClient();

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

    // 3. Get availability exceptions for the month
    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];
    const exceptions = await getTutorExceptions(tutorId, startDateStr, endDateStr);

    // 4. Calculate available dates
    const availableDates = calculateAvailability(
      listing.availability || {},
      bookings || [],
      exceptions,
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
 * Calculate available dates for a month based on weekly schedule, existing bookings, and exceptions
 */
function calculateAvailability(
  weeklyAvailability: Record<string, string[]>,
  bookings: Array<{ session_start_time: string; duration_minutes: number }>,
  exceptions: Array<{ start_date: string; end_date: string; blocks_all_day: boolean }>,
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

    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if date has an all-day exception
    const hasException = exceptions.some(exception => {
      if (!exception.blocks_all_day) {
        return false; // Partial day exceptions still allow some availability
      }
      return dateStr >= exception.start_date && dateStr <= exception.end_date;
    });

    if (hasException) {
      continue; // Skip dates with all-day exceptions
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
      availableDates.push(dateStr);
    }
  }

  return availableDates;
}
