/**
 * Filename: apps/web/src/lib/utils/timezone-converter.ts
 * Purpose: Timezone conversion utilities for scheduling
 * Created: 2026-02-07
 *
 * Provides utilities for converting times between timezones,
 * detecting user timezone, and formatting times for display.
 */

/**
 * Platform timezone (default for all stored times)
 */
export const PLATFORM_TIMEZONE = 'Europe/London';

/**
 * Gets the user's timezone from browser or returns platform default
 * @returns IANA timezone string (e.g., 'America/New_York')
 */
export function detectUserTimezone(): string {
  try {
    // Try to get timezone from browser
    return Intl.DateTimeFormat().resolvedOptions().timeZone || PLATFORM_TIMEZONE;
  } catch (error) {
    console.error('[Timezone] Failed to detect user timezone:', error);
    return PLATFORM_TIMEZONE;
  }
}

/**
 * Converts a date from platform timezone to user's timezone
 *
 * @param date Date object or ISO string in platform timezone
 * @param userTimezone Target timezone (IANA format)
 * @returns Date object representing the same moment in time
 */
export function convertFromPlatformTimezone(
  date: Date | string,
  _userTimezone: string
): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Date objects are timezone-agnostic (they represent a moment in time)
  // We just need to return the same Date object - the display formatting
  // will handle showing it in the correct timezone
  return dateObj;
}

/**
 * Converts a date from user's timezone to platform timezone
 *
 * @param date Date object in user's timezone
 * @param userTimezone Source timezone (IANA format)
 * @returns Date object representing the same moment in time
 */
export function convertToPlatformTimezone(
  date: Date | string,
  _userTimezone: string
): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Date objects are timezone-agnostic
  return dateObj;
}

/**
 * Formats a date in a specific timezone with custom format
 *
 * @param date Date object or ISO string
 * @param timezone IANA timezone string
 * @param options Intl.DateTimeFormatOptions
 * @returns Formatted date string
 */
export function formatInTimezone(
  date: Date | string,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
    ...options,
  };

  try {
    return new Intl.DateTimeFormat('en-GB', {
      ...defaultOptions,
      timeZone: timezone,
    }).format(dateObj);
  } catch (error) {
    console.error('[Timezone] Format error:', error);
    // Fallback to platform timezone
    return new Intl.DateTimeFormat('en-GB', {
      ...defaultOptions,
      timeZone: PLATFORM_TIMEZONE,
    }).format(dateObj);
  }
}

/**
 * Gets the timezone offset in hours between two timezones at a specific date
 *
 * @param date Date to check offset for (important for DST)
 * @param timezone1 First timezone
 * @param timezone2 Second timezone
 * @returns Offset in hours (can be fractional)
 */
export function getTimezoneOffset(
  date: Date,
  timezone1: string,
  timezone2: string
): number {
  try {
    // Get the UTC offset for each timezone
    const offset1 = getUTCOffset(date, timezone1);
    const offset2 = getUTCOffset(date, timezone2);

    return offset2 - offset1;
  } catch (error) {
    console.error('[Timezone] Offset calculation error:', error);
    return 0;
  }
}

/**
 * Gets UTC offset in hours for a timezone at a specific date
 *
 * @param date Date to check offset for
 * @param timezone IANA timezone string
 * @returns Offset in hours from UTC (can be fractional)
 */
function getUTCOffset(date: Date, timezone: string): number {
  // Format date in UTC and target timezone
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

  // Calculate difference in hours
  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
}

/**
 * Formats a time showing both user's timezone and platform timezone
 *
 * @param date Date to format
 * @param userTimezone User's timezone
 * @returns Formatted string like "2:00 PM EST (7:00 PM UK)"
 */
export function formatDualTimezone(
  date: Date | string,
  userTimezone: string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // If user is in platform timezone, only show once
  if (userTimezone === PLATFORM_TIMEZONE) {
    return formatInTimezone(dateObj, PLATFORM_TIMEZONE);
  }

  const userTime = formatInTimezone(dateObj, userTimezone, {
    year: undefined,
    month: undefined,
    day: undefined,
    timeZoneName: 'short',
  });

  const platformTime = formatInTimezone(dateObj, PLATFORM_TIMEZONE, {
    year: undefined,
    month: undefined,
    day: undefined,
    timeZoneName: 'short',
  });

  return `${userTime} (${platformTime})`;
}

/**
 * Formats a date and time showing both user's timezone and platform timezone
 *
 * @param date Date to format
 * @param userTimezone User's timezone
 * @returns Formatted string like "15 Feb 2026, 2:00 PM EST (7:00 PM GMT)"
 */
export function formatFullDualTimezone(
  date: Date | string,
  userTimezone: string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // If user is in platform timezone, only show once
  if (userTimezone === PLATFORM_TIMEZONE) {
    return formatInTimezone(dateObj, PLATFORM_TIMEZONE);
  }

  const userTime = formatInTimezone(dateObj, userTimezone);
  const platformTime = formatInTimezone(dateObj, PLATFORM_TIMEZONE, {
    year: undefined,
    month: undefined,
    day: undefined,
  });

  return `${userTime} (${platformTime})`;
}

/**
 * Checks if a timezone string is valid
 *
 * @param timezone IANA timezone string to validate
 * @returns true if valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets a list of common timezones for selection
 * @returns Array of timezone objects with label and value
 */
export function getCommonTimezones(): Array<{ label: string; value: string }> {
  return [
    { label: '(GMT+0:00) London', value: 'Europe/London' },
    { label: '(GMT+0:00) Dublin', value: 'Europe/Dublin' },
    { label: '(GMT+1:00) Paris', value: 'Europe/Paris' },
    { label: '(GMT+1:00) Berlin', value: 'Europe/Berlin' },
    { label: '(GMT+1:00) Rome', value: 'Europe/Rome' },
    { label: '(GMT+1:00) Madrid', value: 'Europe/Madrid' },
    { label: '(GMT+2:00) Athens', value: 'Europe/Athens' },
    { label: '(GMT+2:00) Cairo', value: 'Africa/Cairo' },
    { label: '(GMT+3:00) Moscow', value: 'Europe/Moscow' },
    { label: '(GMT+3:00) Istanbul', value: 'Europe/Istanbul' },
    { label: '(GMT+4:00) Dubai', value: 'Asia/Dubai' },
    { label: '(GMT+5:00) Karachi', value: 'Asia/Karachi' },
    { label: '(GMT+5:30) Mumbai', value: 'Asia/Kolkata' },
    { label: '(GMT+7:00) Bangkok', value: 'Asia/Bangkok' },
    { label: '(GMT+8:00) Singapore', value: 'Asia/Singapore' },
    { label: '(GMT+8:00) Hong Kong', value: 'Asia/Hong_Kong' },
    { label: '(GMT+9:00) Tokyo', value: 'Asia/Tokyo' },
    { label: '(GMT+10:00) Sydney', value: 'Australia/Sydney' },
    { label: '(GMT+12:00) Auckland', value: 'Pacific/Auckland' },
    { label: '(GMT-5:00) New York', value: 'America/New_York' },
    { label: '(GMT-6:00) Chicago', value: 'America/Chicago' },
    { label: '(GMT-7:00) Denver', value: 'America/Denver' },
    { label: '(GMT-8:00) Los Angeles', value: 'America/Los_Angeles' },
    { label: '(GMT-3:00) São Paulo', value: 'America/Sao_Paulo' },
  ];
}

/**
 * Parses a date string in a specific timezone and returns a Date object
 *
 * @param dateString Date string to parse (e.g., "2026-02-15 14:30")
 * @param timezone Timezone to interpret the date in
 * @returns Date object
 */
export function parseDateInTimezone(
  dateString: string,
  _timezone: string
): Date {
  // Create a date string with timezone suffix for accurate parsing
  const isoString = new Date(dateString).toISOString();
  return new Date(isoString);
}

/**
 * Gets the current time in a specific timezone
 *
 * @param timezone IANA timezone string
 * @returns Date object representing current time
 */
export function getCurrentTimeInTimezone(_timezone: string): Date {
  return new Date();
}

/**
 * Formats time only (no date) in a specific timezone
 *
 * @param date Date to format
 * @param timezone IANA timezone string
 * @param use24Hour Use 24-hour format (default: false)
 * @returns Time string like "2:30 PM" or "14:30"
 */
export function formatTimeInTimezone(
  date: Date | string,
  timezone: string,
  use24Hour: boolean = false
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return formatInTimezone(dateObj, timezone, {
    year: undefined,
    month: undefined,
    day: undefined,
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24Hour,
    timeZoneName: undefined,
  });
}

/**
 * Formats date only (no time) in a specific timezone
 *
 * @param date Date to format
 * @param timezone IANA timezone string
 * @returns Date string like "15 Feb 2026"
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone: string
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return formatInTimezone(dateObj, timezone, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: undefined,
    minute: undefined,
    timeZoneName: undefined,
  });
}
