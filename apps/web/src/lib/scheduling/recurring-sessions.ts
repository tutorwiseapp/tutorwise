/**
 * Filename: apps/web/src/lib/scheduling/recurring-sessions.ts
 * Purpose: Utilities for managing recurring booking sessions
 * Created: 2026-02-07
 *
 * Handles creation, generation, and management of recurring booking series
 * with support for weekly, biweekly, and monthly patterns.
 */

import { createClient } from '@/utils/supabase/server';
import { checkAllConflicts } from './conflict-detection';

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly';
export type RecurrenceEndType = 'after_count' | 'by_date' | 'never';
export type SeriesStatus = 'active' | 'paused' | 'cancelled';

export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday), only for weekly/biweekly
  endType: RecurrenceEndType;
  occurrences?: number; // Required if endType is 'after_count'
  endDate?: string; // Required if endType is 'by_date' (YYYY-MM-DD)
}

export interface RecurringSeries {
  id: string;
  client_id: string;
  tutor_id: string;
  parent_booking_id: string | null;
  recurrence_pattern: RecurrencePattern;
  status: SeriesStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateSeriesInput {
  client_id: string;
  tutor_id: string;
  template_booking: {
    service_name: string;
    session_duration: number;
    amount: number;
    subjects: string[];
    delivery_mode: string;
    location_city?: string;
  };
  first_session_time: Date;
  recurrence_pattern: RecurrencePattern;
}

/**
 * Validates a recurrence pattern
 */
export function validateRecurrencePattern(pattern: RecurrencePattern): {
  valid: boolean;
  error?: string;
} {
  // Validate frequency
  if (!['weekly', 'biweekly', 'monthly'].includes(pattern.frequency)) {
    return { valid: false, error: 'Invalid frequency. Must be: weekly, biweekly, or monthly' };
  }

  // Validate interval
  if (!pattern.interval || pattern.interval < 1) {
    return { valid: false, error: 'Interval must be at least 1' };
  }

  // Validate days of week for weekly/biweekly
  if (pattern.frequency !== 'monthly' && (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0)) {
    return { valid: false, error: 'daysOfWeek is required for weekly/biweekly patterns' };
  }

  if (pattern.daysOfWeek) {
    for (const day of pattern.daysOfWeek) {
      if (day < 0 || day > 6) {
        return { valid: false, error: 'daysOfWeek must be integers 0-6 (Sunday-Saturday)' };
      }
    }
  }

  // Validate end type
  if (!['after_count', 'by_date', 'never'].includes(pattern.endType)) {
    return { valid: false, error: 'Invalid endType. Must be: after_count, by_date, or never' };
  }

  // Validate occurrences if endType is after_count
  if (pattern.endType === 'after_count' && (!pattern.occurrences || pattern.occurrences < 1)) {
    return { valid: false, error: 'occurrences is required and must be >= 1 when endType is after_count' };
  }

  // Validate endDate if endType is by_date
  if (pattern.endType === 'by_date' && !pattern.endDate) {
    return { valid: false, error: 'endDate is required when endType is by_date' };
  }

  return { valid: true };
}

/**
 * Generates future session dates based on recurrence pattern
 *
 * @param startDate First session date
 * @param pattern Recurrence pattern
 * @param maxInstances Maximum number of instances to generate (default: 52)
 * @returns Array of session dates
 */
export function generateSessionDates(
  startDate: Date,
  pattern: RecurrencePattern,
  maxInstances: number = 52
): Date[] {
  const dates: Date[] = [new Date(startDate)];
  let currentDate = new Date(startDate);

  // Determine how many instances to generate
  let targetCount = maxInstances;
  if (pattern.endType === 'after_count' && pattern.occurrences) {
    targetCount = Math.min(pattern.occurrences, maxInstances);
  }

  // Generate dates
  while (dates.length < targetCount) {
    let nextDate: Date;

    switch (pattern.frequency) {
      case 'weekly':
        nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 7 * pattern.interval);
        break;

      case 'biweekly':
        nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 14 * pattern.interval);
        break;

      case 'monthly':
        nextDate = new Date(currentDate);
        nextDate.setMonth(nextDate.getMonth() + pattern.interval);
        break;

      default:
        throw new Error('Invalid frequency');
    }

    // Check if we've passed the end date
    if (pattern.endType === 'by_date' && pattern.endDate) {
      const endDate = new Date(pattern.endDate);
      if (nextDate > endDate) {
        break;
      }
    }

    dates.push(nextDate);
    currentDate = nextDate;
  }

  return dates;
}

/**
 * Creates a recurring booking series with the first instance
 *
 * @param input Series creation input
 * @returns Created series and first booking
 */
export async function createRecurringSeries(input: CreateSeriesInput): Promise<{
  series: RecurringSeries;
  first_booking_id: string;
}> {
  const supabase = await createClient();

  // Validate recurrence pattern
  const validation = validateRecurrencePattern(input.recurrence_pattern);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  try {
    // 1. Create the first booking (template)
    const { data: firstBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        client_id: input.client_id,
        tutor_id: input.tutor_id,
        service_name: input.template_booking.service_name,
        session_duration: input.template_booking.session_duration,
        session_start_time: input.first_session_time.toISOString(),
        amount: input.template_booking.amount,
        subjects: input.template_booking.subjects,
        delivery_mode: input.template_booking.delivery_mode,
        location_city: input.template_booking.location_city,
        status: 'Pending',
        scheduling_status: 'proposed',
        series_instance_number: 1,
      })
      .select()
      .single();

    if (bookingError || !firstBooking) {
      console.error('[Recurring Sessions] Failed to create first booking:', bookingError);
      throw new Error('Failed to create first booking');
    }

    // 2. Create the recurring series
    const { data: series, error: seriesError } = await supabase
      .from('recurring_booking_series')
      .insert({
        client_id: input.client_id,
        tutor_id: input.tutor_id,
        parent_booking_id: firstBooking.id,
        recurrence_pattern: input.recurrence_pattern,
        status: 'active',
      })
      .select()
      .single();

    if (seriesError || !series) {
      console.error('[Recurring Sessions] Failed to create series:', seriesError);
      // Rollback: delete the first booking
      await supabase.from('bookings').delete().eq('id', firstBooking.id);
      throw new Error('Failed to create recurring series');
    }

    // 3. Link the first booking to the series
    await supabase
      .from('bookings')
      .update({ recurring_series_id: series.id })
      .eq('id', firstBooking.id);

    console.log('[Recurring Sessions] Created series:', series.id);

    return {
      series: series as RecurringSeries,
      first_booking_id: firstBooking.id,
    };
  } catch (error) {
    console.error('[Recurring Sessions] Error creating series:', error);
    throw error;
  }
}

/**
 * Generates the next N instances of a recurring series
 *
 * @param seriesId Series ID
 * @param count Number of instances to generate
 * @returns Array of created booking IDs
 */
export async function generateFutureInstances(
  seriesId: string,
  count: number = 4
): Promise<string[]> {
  const supabase = await createClient();

  try {
    // Get series details
    const { data: series, error: seriesError } = await supabase
      .from('recurring_booking_series')
      .select('*')
      .eq('id', seriesId)
      .single();

    if (seriesError || !series) {
      throw new Error('Series not found');
    }

    if (series.status !== 'active') {
      throw new Error('Cannot generate instances for inactive series');
    }

    // Get template booking (parent)
    const { data: template, error: templateError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', series.parent_booking_id)
      .single();

    if (templateError || !template) {
      throw new Error('Template booking not found');
    }

    // Get existing instances to determine next instance number
    const { data: existingInstances, error: instancesError } = await supabase
      .from('bookings')
      .select('series_instance_number')
      .eq('recurring_series_id', seriesId)
      .order('series_instance_number', { ascending: false })
      .limit(1);

    if (instancesError) {
      throw new Error('Failed to fetch existing instances');
    }

    const lastInstanceNumber = existingInstances?.[0]?.series_instance_number || 0;
    const nextInstanceNumber = lastInstanceNumber + 1;

    // Generate session dates
    const firstSessionTime = new Date(template.session_start_time);
    const allDates = generateSessionDates(
      firstSessionTime,
      series.recurrence_pattern as RecurrencePattern,
      nextInstanceNumber + count
    );

    // Get only the new dates (skip existing instances)
    const newDates = allDates.slice(nextInstanceNumber);

    // Check for conflicts
    for (const date of newDates) {
      const conflictCheck = await checkAllConflicts(
        series.tutor_id,
        date,
        template.session_duration
      );

      if (conflictCheck.hasConflict) {
        console.warn(`[Recurring Sessions] Conflict detected for ${date.toISOString()}`);
        // Skip this date but continue with others
        continue;
      }
    }

    // Create new booking instances
    const newBookings = newDates.map((date, index) => ({
      client_id: series.client_id,
      tutor_id: series.tutor_id,
      recurring_series_id: seriesId,
      series_instance_number: nextInstanceNumber + index,
      service_name: template.service_name,
      session_duration: template.session_duration,
      session_start_time: date.toISOString(),
      amount: template.amount,
      subjects: template.subjects,
      delivery_mode: template.delivery_mode,
      location_city: template.location_city,
      status: 'Pending',
      scheduling_status: 'proposed',
    }));

    const { data: createdBookings, error: createError } = await supabase
      .from('bookings')
      .insert(newBookings)
      .select('id');

    if (createError) {
      console.error('[Recurring Sessions] Failed to create instances:', createError);
      throw new Error('Failed to create future instances');
    }

    const bookingIds = (createdBookings || []).map((b) => b.id);
    console.log(`[Recurring Sessions] Generated ${bookingIds.length} instances for series ${seriesId}`);

    return bookingIds;
  } catch (error) {
    console.error('[Recurring Sessions] Error generating instances:', error);
    throw error;
  }
}

/**
 * Cancels a recurring series (marks all future instances as cancelled)
 *
 * @param seriesId Series ID
 * @returns Number of instances cancelled
 */
export async function cancelRecurringSeries(seriesId: string): Promise<number> {
  const supabase = await createClient();

  try {
    // Mark series as cancelled
    await supabase
      .from('recurring_booking_series')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', seriesId);

    // Cancel all future instances (Pending or Confirmed)
    const now = new Date();
    const { data: cancelledBookings, error } = await supabase
      .from('bookings')
      .update({ status: 'Cancelled' })
      .eq('recurring_series_id', seriesId)
      .in('status', ['Pending', 'Confirmed'])
      .gte('session_start_time', now.toISOString())
      .select('id');

    if (error) {
      console.error('[Recurring Sessions] Failed to cancel instances:', error);
      throw new Error('Failed to cancel series instances');
    }

    const count = cancelledBookings?.length || 0;
    console.log(`[Recurring Sessions] Cancelled ${count} future instances for series ${seriesId}`);

    return count;
  } catch (error) {
    console.error('[Recurring Sessions] Error cancelling series:', error);
    throw error;
  }
}

/**
 * Pauses a recurring series (prevents auto-generation of new instances)
 *
 * @param seriesId Series ID
 */
export async function pauseRecurringSeries(seriesId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('recurring_booking_series')
    .update({ status: 'paused', updated_at: new Date().toISOString() })
    .eq('id', seriesId);

  console.log(`[Recurring Sessions] Paused series ${seriesId}`);
}

/**
 * Resumes a paused recurring series
 *
 * @param seriesId Series ID
 */
export async function resumeRecurringSeries(seriesId: string): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('recurring_booking_series')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', seriesId);

  console.log(`[Recurring Sessions] Resumed series ${seriesId}`);
}

/**
 * Gets all instances of a recurring series
 *
 * @param seriesId Series ID
 * @returns Array of bookings
 */
export async function getSeriesInstances(seriesId: string): Promise<any[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('recurring_series_id', seriesId)
    .order('series_instance_number', { ascending: true });

  if (error) {
    console.error('[Recurring Sessions] Failed to fetch instances:', error);
    return [];
  }

  return data || [];
}
