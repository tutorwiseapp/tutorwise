/**
 * Utility functions for formatting availability and unavailability data
 * for display in public profile pages
 */

export interface AvailabilityPeriod {
  id: string;
  type: 'recurring' | 'one-time';
  days?: string[]; // For recurring (e.g., ['Monday', 'Wednesday'])
  fromDate: string;
  toDate?: string;
  startTime: string;
  endTime: string;
}

export interface UnavailabilityPeriod {
  id: string;
  fromDate: string;
  toDate: string;
}

/**
 * Format an availability period for display
 * @param period - The availability period to format
 * @returns Formatted string representation
 */
export function formatAvailabilityPeriod(period: AvailabilityPeriod): string {
  if (period.type === 'recurring') {
    const daysList = period.days?.join(', ') || '';
    return `Every ${daysList}, ${period.startTime} - ${period.endTime}`;
  } else {
    return `${period.fromDate}, ${period.startTime} - ${period.endTime}`;
  }
}

/**
 * Format an unavailability period for display
 * @param period - The unavailability period to format
 * @returns Formatted string representation
 */
export function formatUnavailabilityPeriod(period: UnavailabilityPeriod): string {
  return `${period.fromDate} - ${period.toDate}`;
}

/**
 * Group availability periods by type
 * @param periods - Array of availability periods
 * @returns Object with recurring and oneTime arrays
 */
export function groupAvailabilityByType(periods: AvailabilityPeriod[]) {
  const recurring = periods.filter(p => p.type === 'recurring');
  const oneTime = periods.filter(p => p.type === 'one-time');

  return { recurring, oneTime };
}
