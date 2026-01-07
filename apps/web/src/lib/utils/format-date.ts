/**
 * Filename: apps/web/src/lib/utils/format-date.ts
 * Purpose: Standardized date formatting utilities
 * Created: 2026-01-07
 * Format Standard: "DD MMM YYYY" (e.g., "20 Dec 2025")
 */

/**
 * Format a date to "DD MMM YYYY" format (e.g., "20 Dec 2025")
 * @param date - Date string, Date object, or null
 * @returns Formatted date string or "—" if null
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';

  const d = new Date(date);

  // Check if date is valid
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a date to "DD MMM" format without year (e.g., "20 Dec")
 * @param date - Date string, Date object, or null
 * @returns Formatted date string or "—" if null
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return '—';

  const d = new Date(date);

  // Check if date is valid
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format a date with time to "DD MMM YYYY, HH:MM" format
 * @param date - Date string, Date object, or null
 * @returns Formatted datetime string or "—" if null
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';

  const d = new Date(date);

  // Check if date is valid
  if (isNaN(d.getTime())) return '—';

  const datePart = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const timePart = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${datePart}, ${timePart}`;
}

/**
 * Calculate days remaining until a future date
 * @param futureDate - Target date
 * @returns Number of days remaining (positive for future, negative for past)
 */
export function calculateDaysRemaining(futureDate: string | Date): number {
  const now = new Date();
  const target = new Date(futureDate);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Format days remaining with context
 * @param futureDate - Target date
 * @returns Object with formatted text and variant for styling
 */
export function formatDaysRemaining(futureDate: string | Date): {
  text: string;
  variant: 'success' | 'warning' | 'danger';
  daysRemaining: number;
} {
  const daysRemaining = calculateDaysRemaining(futureDate);

  if (daysRemaining > 7) {
    return {
      text: `${daysRemaining}d left`,
      variant: 'success',
      daysRemaining,
    };
  } else if (daysRemaining > 3) {
    return {
      text: `${daysRemaining}d left`,
      variant: 'warning',
      daysRemaining,
    };
  } else if (daysRemaining > 0) {
    return {
      text: `${daysRemaining}d left`,
      variant: 'danger',
      daysRemaining,
    };
  } else {
    return {
      text: `Expired ${Math.abs(daysRemaining)}d ago`,
      variant: 'danger',
      daysRemaining,
    };
  }
}

/**
 * Format a date range to "DD MMM YYYY → DD MMM YYYY"
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range
 */
export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string {
  const start = formatDate(startDate);
  const end = formatDate(endDate);

  if (start === '—' && end === '—') return '—';
  if (start === '—') return end;
  if (end === '—') return start;

  return `${start} → ${end}`;
}
