/**
 * Filename: apps/web/src/lib/scheduling/conflict-detection.ts
 * Purpose: Centralized conflict detection for booking scheduling
 * Created: 2026-02-07
 *
 * Provides utilities to detect scheduling conflicts between bookings,
 * preventing double-booking and overlapping sessions.
 */

import { createClient } from '@/utils/supabase/server';

export interface BookingTimeSlot {
  id: string;
  session_start_time: string;
  session_duration: number; // minutes
  status: string;
  scheduling_status?: string;
}

export interface ConflictCheckOptions {
  /** Booking ID to exclude from conflict check (for updates) */
  excludeBookingId?: string;
  /** Buffer time in minutes to add between sessions (default: 0) */
  bufferMinutes?: number;
  /** Check only specific booking statuses (default: ['Pending', 'Confirmed']) */
  statuses?: string[];
  /** Check only specific scheduling statuses */
  schedulingStatuses?: string[];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictingBookings: BookingTimeSlot[];
  message?: string;
}

/**
 * Checks if two time ranges overlap
 *
 * @param start1 Start time of first range (timestamp in ms)
 * @param end1 End time of first range (timestamp in ms)
 * @param start2 Start time of second range (timestamp in ms)
 * @param end2 End time of second range (timestamp in ms)
 * @returns true if ranges overlap
 */
export function hasTimeOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  // Classic interval overlap check:
  // Two intervals [a,b] and [c,d] overlap if: a < d AND c < b
  return start1 < end2 && start2 < end1;
}

/**
 * Checks if a booking time slot overlaps with another
 *
 * @param booking1 First booking time slot
 * @param booking2 Second booking time slot
 * @param bufferMinutes Optional buffer time to add between sessions
 * @returns true if bookings overlap
 */
export function hasBookingOverlap(
  booking1: { session_start_time: string; session_duration: number },
  booking2: { session_start_time: string; session_duration: number },
  bufferMinutes: number = 0
): boolean {
  const start1 = new Date(booking1.session_start_time).getTime();
  const end1 = start1 + booking1.session_duration * 60000;

  const start2 = new Date(booking2.session_start_time).getTime();
  const end2 = start2 + booking2.session_duration * 60000;

  // Add buffer time to both ranges
  const buffer = bufferMinutes * 60000;
  return hasTimeOverlap(start1 - buffer, end1 + buffer, start2 - buffer, end2 + buffer);
}

/**
 * Checks for booking conflicts for a given tutor and time slot
 *
 * @param tutorId Tutor's profile ID
 * @param sessionStartTime Proposed session start time
 * @param sessionDuration Session duration in minutes
 * @param options Optional configuration
 * @returns Conflict check result with conflicting bookings if any
 */
export async function checkBookingConflicts(
  tutorId: string,
  sessionStartTime: Date,
  sessionDuration: number,
  options: ConflictCheckOptions = {}
): Promise<ConflictCheckResult> {
  const {
    excludeBookingId,
    bufferMinutes = 0,
    statuses = ['Pending', 'Confirmed'],
    schedulingStatuses,
  } = options;

  const supabase = await createClient();

  // Calculate time range to check (current day + previous day to catch overlaps)
  const checkFromTime = new Date(sessionStartTime);
  checkFromTime.setDate(checkFromTime.getDate() - 1);

  // Build query
  let query = supabase
    .from('bookings')
    .select('id, session_start_time, session_duration, status, scheduling_status')
    .eq('tutor_id', tutorId)
    .in('status', statuses)
    .gte('session_start_time', checkFromTime.toISOString());

  // Exclude specific booking if provided
  if (excludeBookingId) {
    query = query.neq('id', excludeBookingId);
  }

  // Filter by scheduling status if provided
  if (schedulingStatuses && schedulingStatuses.length > 0) {
    query = query.in('scheduling_status', schedulingStatuses);
  }

  const { data: existingBookings, error } = await query;

  if (error) {
    console.error('[Conflict Detection] Database error:', error);
    throw new Error('Failed to check booking conflicts');
  }

  if (!existingBookings || existingBookings.length === 0) {
    return {
      hasConflict: false,
      conflictingBookings: [],
    };
  }

  // Check for overlaps
  const proposedBooking = {
    session_start_time: sessionStartTime.toISOString(),
    session_duration: sessionDuration,
  };

  const conflicts = existingBookings.filter((booking) =>
    hasBookingOverlap(proposedBooking, booking, bufferMinutes)
  );

  if (conflicts.length > 0) {
    // Format conflict message
    const message = bufferMinutes > 0
      ? `This time slot conflicts with an existing booking (including ${bufferMinutes}-minute buffer).`
      : 'This time slot conflicts with an existing booking.';

    return {
      hasConflict: true,
      conflictingBookings: conflicts,
      message,
    };
  }

  return {
    hasConflict: false,
    conflictingBookings: [],
  };
}

/**
 * Checks for conflicts with tutor's availability exceptions (holidays, vacations)
 *
 * @param tutorId Tutor's profile ID
 * @param sessionStartTime Proposed session start time
 * @param sessionDuration Session duration in minutes
 * @returns true if the proposed time conflicts with an exception
 */
export async function checkAvailabilityExceptions(
  tutorId: string,
  sessionStartTime: Date,
  sessionDuration: number
): Promise<{ hasException: boolean; exceptionTitle?: string }> {
  const supabase = await createClient();

  const sessionDate = sessionStartTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const sessionEndTime = new Date(sessionStartTime.getTime() + sessionDuration * 60000);

  // Check if session date falls within any exception date range
  const { data: exceptions, error } = await supabase
    .from('tutor_availability_exceptions')
    .select('id, title, start_date, end_date, blocks_all_day, time_ranges')
    .eq('tutor_id', tutorId)
    .lte('start_date', sessionDate)
    .gte('end_date', sessionDate);

  if (error) {
    console.error('[Conflict Detection] Exception check error:', error);
    return { hasException: false };
  }

  if (!exceptions || exceptions.length === 0) {
    return { hasException: false };
  }

  // Check if any exception blocks this time
  for (const exception of exceptions) {
    // If it blocks all day, it's a conflict
    if (exception.blocks_all_day) {
      return { hasException: true, exceptionTitle: exception.title };
    }

    // Check specific time ranges if not all-day
    if (exception.time_ranges && Array.isArray(exception.time_ranges)) {
      const sessionStart = sessionStartTime.getTime();
      const sessionEnd = sessionEndTime.getTime();

      for (const range of exception.time_ranges) {
        const rangeStart = new Date(`${sessionDate}T${range.start_time}`).getTime();
        const rangeEnd = new Date(`${sessionDate}T${range.end_time}`).getTime();

        if (hasTimeOverlap(sessionStart, sessionEnd, rangeStart, rangeEnd)) {
          return { hasException: true, exceptionTitle: exception.title };
        }
      }
    }
  }

  return { hasException: false };
}

/**
 * Comprehensive conflict check that includes both booking conflicts and availability exceptions
 *
 * @param tutorId Tutor's profile ID
 * @param sessionStartTime Proposed session start time
 * @param sessionDuration Session duration in minutes
 * @param options Optional configuration
 * @returns Combined conflict check result
 */
export async function checkAllConflicts(
  tutorId: string,
  sessionStartTime: Date,
  sessionDuration: number,
  options: ConflictCheckOptions = {}
): Promise<ConflictCheckResult> {
  // Check booking conflicts
  const bookingConflicts = await checkBookingConflicts(
    tutorId,
    sessionStartTime,
    sessionDuration,
    options
  );

  if (bookingConflicts.hasConflict) {
    return bookingConflicts;
  }

  // Check availability exceptions
  const exceptionCheck = await checkAvailabilityExceptions(
    tutorId,
    sessionStartTime,
    sessionDuration
  );

  if (exceptionCheck.hasException) {
    return {
      hasConflict: true,
      conflictingBookings: [],
      message: exceptionCheck.exceptionTitle
        ? `Tutor is unavailable (${exceptionCheck.exceptionTitle}).`
        : 'Tutor is unavailable at this time.',
    };
  }

  return {
    hasConflict: false,
    conflictingBookings: [],
  };
}
