/**
 * Filename: apps/web/src/lib/availability/exceptions.ts
 * Purpose: Utilities for managing tutor availability exceptions (holidays, vacations)
 * Created: 2026-02-07
 *
 * Handles creation, retrieval, and validation of availability exceptions
 * to block booking times when tutors are unavailable.
 */

import { createClient } from '@/utils/supabase/server';

export type ExceptionType = 'holiday' | 'vacation' | 'personal' | 'unavailable';

export interface TimeRange {
  start_time: string; // HH:MM format
  end_time: string;   // HH:MM format
}

export interface AvailabilityException {
  id: string;
  tutor_id: string;
  exception_type: ExceptionType;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  title: string;
  blocks_all_day: boolean;
  time_ranges?: TimeRange[];
  created_at: string;
  updated_at: string;
}

export interface CreateExceptionInput {
  tutor_id: string;
  exception_type: ExceptionType;
  start_date: string;
  end_date: string;
  title: string;
  blocks_all_day?: boolean;
  time_ranges?: TimeRange[];
}

/**
 * Checks if a specific date has any exceptions for a tutor
 *
 * @param tutorId Tutor's profile ID
 * @param date Date to check (YYYY-MM-DD or Date object)
 * @returns Exception object if found, null otherwise
 */
export async function checkDateHasException(
  tutorId: string,
  date: string | Date
): Promise<AvailabilityException | null> {
  const supabase = await createClient();

  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('tutor_availability_exceptions')
    .select('*')
    .eq('tutor_id', tutorId)
    .lte('start_date', dateStr)
    .gte('end_date', dateStr)
    .limit(1)
    .single();

  if (error) {
    // No exception found is not an error
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('[Availability Exceptions] Check error:', error);
    return null;
  }

  return data as AvailabilityException;
}

/**
 * Gets all exceptions for a tutor within a date range
 *
 * @param tutorId Tutor's profile ID
 * @param startDate Start of range (YYYY-MM-DD)
 * @param endDate End of range (YYYY-MM-DD)
 * @returns Array of exceptions
 */
export async function getTutorExceptions(
  tutorId: string,
  startDate: string,
  endDate: string
): Promise<AvailabilityException[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tutor_availability_exceptions')
    .select('*')
    .eq('tutor_id', tutorId)
    .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('[Availability Exceptions] Fetch error:', error);
    return [];
  }

  return (data || []) as AvailabilityException[];
}

/**
 * Creates a new availability exception
 *
 * @param input Exception details
 * @returns Created exception object
 */
export async function createException(
  input: CreateExceptionInput
): Promise<AvailabilityException> {
  const supabase = await createClient();

  // Validate dates
  const startDate = new Date(input.start_date);
  const endDate = new Date(input.end_date);

  if (endDate < startDate) {
    throw new Error('End date must be after start date');
  }

  // Validate time ranges if provided
  if (!input.blocks_all_day && input.time_ranges && input.time_ranges.length > 0) {
    for (const range of input.time_ranges) {
      if (!isValidTimeFormat(range.start_time) || !isValidTimeFormat(range.end_time)) {
        throw new Error('Invalid time format. Use HH:MM format (24-hour)');
      }
    }
  }

  const { data, error } = await supabase
    .from('tutor_availability_exceptions')
    .insert({
      tutor_id: input.tutor_id,
      exception_type: input.exception_type,
      start_date: input.start_date,
      end_date: input.end_date,
      title: input.title,
      blocks_all_day: input.blocks_all_day ?? true,
      time_ranges: input.time_ranges || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[Availability Exceptions] Create error:', error);
    throw new Error('Failed to create exception');
  }

  return data as AvailabilityException;
}

/**
 * Updates an existing availability exception
 *
 * @param exceptionId Exception ID
 * @param updates Partial exception data to update
 * @returns Updated exception object
 */
export async function updateException(
  exceptionId: string,
  updates: Partial<CreateExceptionInput>
): Promise<AvailabilityException> {
  const supabase = await createClient();

  // Validate dates if provided
  if (updates.start_date && updates.end_date) {
    const startDate = new Date(updates.start_date);
    const endDate = new Date(updates.end_date);

    if (endDate < startDate) {
      throw new Error('End date must be after start date');
    }
  }

  const { data, error } = await supabase
    .from('tutor_availability_exceptions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', exceptionId)
    .select()
    .single();

  if (error) {
    console.error('[Availability Exceptions] Update error:', error);
    throw new Error('Failed to update exception');
  }

  return data as AvailabilityException;
}

/**
 * Deletes an availability exception
 *
 * @param exceptionId Exception ID
 * @returns true if deleted successfully
 */
export async function deleteException(exceptionId: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('tutor_availability_exceptions')
    .delete()
    .eq('id', exceptionId);

  if (error) {
    console.error('[Availability Exceptions] Delete error:', error);
    throw new Error('Failed to delete exception');
  }

  return true;
}

/**
 * Gets all exceptions for the authenticated user (tutor)
 *
 * @returns Array of exceptions
 */
export async function getMyExceptions(): Promise<AvailabilityException[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data, error } = await supabase
    .from('tutor_availability_exceptions')
    .select('*')
    .eq('tutor_id', user.id)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('[Availability Exceptions] Fetch error:', error);
    return [];
  }

  return (data || []) as AvailabilityException[];
}

/**
 * Bulk creates exceptions (useful for importing holidays)
 *
 * @param exceptions Array of exception inputs
 * @returns Array of created exceptions
 */
export async function bulkCreateExceptions(
  exceptions: CreateExceptionInput[]
): Promise<AvailabilityException[]> {
  const supabase = await createClient();

  // Validate all exceptions first
  for (const exception of exceptions) {
    const startDate = new Date(exception.start_date);
    const endDate = new Date(exception.end_date);

    if (endDate < startDate) {
      throw new Error(`Invalid date range for exception: ${exception.title}`);
    }
  }

  const { data, error } = await supabase
    .from('tutor_availability_exceptions')
    .insert(
      exceptions.map((e) => ({
        tutor_id: e.tutor_id,
        exception_type: e.exception_type,
        start_date: e.start_date,
        end_date: e.end_date,
        title: e.title,
        blocks_all_day: e.blocks_all_day ?? true,
        time_ranges: e.time_ranges || null,
      }))
    )
    .select();

  if (error) {
    console.error('[Availability Exceptions] Bulk create error:', error);
    throw new Error('Failed to create exceptions');
  }

  return (data || []) as AvailabilityException[];
}

/**
 * Gets UK bank holidays for a given year
 * Returns predefined list for 2026
 *
 * @param year Year to get holidays for
 * @returns Array of holiday exception inputs
 */
export function getUKBankHolidays(
  year: number,
  tutorId: string
): CreateExceptionInput[] {
  // UK Bank Holidays for 2026
  if (year === 2026) {
    return [
      {
        tutor_id: tutorId,
        exception_type: 'holiday',
        start_date: '2026-01-01',
        end_date: '2026-01-01',
        title: 'New Year\'s Day',
        blocks_all_day: true,
      },
      {
        tutor_id: tutorId,
        exception_type: 'holiday',
        start_date: '2026-04-03',
        end_date: '2026-04-03',
        title: 'Good Friday',
        blocks_all_day: true,
      },
      {
        tutor_id: tutorId,
        exception_type: 'holiday',
        start_date: '2026-04-06',
        end_date: '2026-04-06',
        title: 'Easter Monday',
        blocks_all_day: true,
      },
      {
        tutor_id: tutorId,
        exception_type: 'holiday',
        start_date: '2026-05-04',
        end_date: '2026-05-04',
        title: 'Early May Bank Holiday',
        blocks_all_day: true,
      },
      {
        tutor_id: tutorId,
        exception_type: 'holiday',
        start_date: '2026-05-25',
        end_date: '2026-05-25',
        title: 'Spring Bank Holiday',
        blocks_all_day: true,
      },
      {
        tutor_id: tutorId,
        exception_type: 'holiday',
        start_date: '2026-08-31',
        end_date: '2026-08-31',
        title: 'Summer Bank Holiday',
        blocks_all_day: true,
      },
      {
        tutor_id: tutorId,
        exception_type: 'holiday',
        start_date: '2026-12-25',
        end_date: '2026-12-25',
        title: 'Christmas Day',
        blocks_all_day: true,
      },
      {
        tutor_id: tutorId,
        exception_type: 'holiday',
        start_date: '2026-12-28',
        end_date: '2026-12-28',
        title: 'Boxing Day (substitute)',
        blocks_all_day: true,
      },
    ];
  }

  // For other years, return empty array (could be extended)
  return [];
}

/**
 * Validates time format (HH:MM in 24-hour format)
 *
 * @param time Time string to validate
 * @returns true if valid
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

/**
 * Checks if a date range overlaps with any existing exceptions
 *
 * @param tutorId Tutor's profile ID
 * @param startDate Start date (YYYY-MM-DD)
 * @param endDate End date (YYYY-MM-DD)
 * @returns Array of overlapping exceptions
 */
export async function findOverlappingExceptions(
  tutorId: string,
  startDate: string,
  endDate: string
): Promise<AvailabilityException[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('tutor_availability_exceptions')
    .select('*')
    .eq('tutor_id', tutorId)
    .or(`start_date.lte.${endDate},end_date.gte.${startDate}`)
    .order('start_date', { ascending: true });

  if (error) {
    console.error('[Availability Exceptions] Overlap check error:', error);
    return [];
  }

  return (data || []) as AvailabilityException[];
}
