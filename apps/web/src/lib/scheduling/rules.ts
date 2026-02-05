/**
 * Filename: apps/web/src/lib/scheduling/rules.ts
 * Purpose: Scheduling rules and validation for the 5-stage booking workflow
 * Created: 2026-02-05
 *
 * This module provides:
 * - Scheduling rules configuration
 * - Time slot validation
 * - Availability checking
 * - Timezone handling (platform default: Europe/London)
 */

export interface SchedulingRules {
  minimumNoticeHours: number;      // Minimum hours before session (24h)
  maximumAdvanceDays: number;      // Maximum days in advance (30 days)
  slotReservationMinutes: number;  // Temporary hold duration (15 min)
  rescheduleLimit: number;         // Max reschedules per party (2)
  platformTimezone: string;        // Platform timezone (Europe/London)
}

export const DEFAULT_SCHEDULING_RULES: SchedulingRules = {
  minimumNoticeHours: 24,
  maximumAdvanceDays: 30,
  slotReservationMinutes: 15,
  rescheduleLimit: 2,
  platformTimezone: 'Europe/London',
};

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  code?: 'MINIMUM_NOTICE' | 'MAXIMUM_ADVANCE' | 'OUTSIDE_AVAILABILITY' | 'SLOT_CONFLICT' | 'RESCHEDULE_LIMIT';
}

/**
 * Validate a proposed session time against scheduling rules
 */
export function validateProposedTime(
  proposedTime: Date,
  rules: SchedulingRules = DEFAULT_SCHEDULING_RULES
): ValidationResult {
  const now = new Date();

  // Check minimum notice (24 hours)
  const hoursUntil = (proposedTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntil < rules.minimumNoticeHours) {
    return {
      valid: false,
      reason: `Sessions must be scheduled at least ${rules.minimumNoticeHours} hours in advance`,
      code: 'MINIMUM_NOTICE',
    };
  }

  // Check maximum advance (30 days)
  const daysUntil = hoursUntil / 24;
  if (daysUntil > rules.maximumAdvanceDays) {
    return {
      valid: false,
      reason: `Sessions cannot be scheduled more than ${rules.maximumAdvanceDays} days in advance`,
      code: 'MAXIMUM_ADVANCE',
    };
  }

  return { valid: true };
}

/**
 * Check if reschedule count has reached the limit
 */
export function canReschedule(
  currentCount: number,
  rules: SchedulingRules = DEFAULT_SCHEDULING_RULES
): ValidationResult {
  // Total limit is 2 reschedules per party = 4 total
  const totalLimit = rules.rescheduleLimit * 2;

  if (currentCount >= totalLimit) {
    return {
      valid: false,
      reason: 'Maximum number of reschedules reached. Please contact support for assistance.',
      code: 'RESCHEDULE_LIMIT',
    };
  }

  return { valid: true };
}

/**
 * Calculate slot reservation expiry time
 */
export function getSlotReservationExpiry(
  rules: SchedulingRules = DEFAULT_SCHEDULING_RULES
): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + rules.slotReservationMinutes);
  return expiry;
}

/**
 * Check if a slot reservation has expired
 */
export function isSlotReservationExpired(slotReservedUntil: Date | string | null): boolean {
  if (!slotReservedUntil) return true;
  const expiryTime = typeof slotReservedUntil === 'string' ? new Date(slotReservedUntil) : slotReservedUntil;
  return new Date() > expiryTime;
}

/**
 * Format a date for display in the platform timezone
 */
export function formatInPlatformTimezone(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: DEFAULT_SCHEDULING_RULES.platformTimezone,
  }
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-GB', options);
}

/**
 * Get the platform timezone display string
 */
export function getPlatformTimezoneDisplay(): string {
  return 'UK time (London)';
}
