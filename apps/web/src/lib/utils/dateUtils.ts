/**
 * Date utility functions
 * Created: 2025-11-26
 * Updated: 2026-02-09 - Added calculateAge utility
 */

/**
 * Calculate age from date of birth
 * @param dateOfBirth - Date of birth as ISO string or Date object
 * @returns Age in years
 */
export function calculateAge(dateOfBirth: string | Date): number {
  const today = new Date();
  const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Adjust if birthday hasn't occurred yet this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Format a date as a relative time string (e.g. "2 hours ago", "3 days ago")
 * @param dateString - ISO date string or null
 * @returns Formatted relative time string or "No activity"
 */
export function formatTimeAgo(dateString: string | null): string {
  if (!dateString) {
    return 'No activity';
  }

  const date = new Date(dateString);
  const now = new Date();
  const secondsAgo = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (secondsAgo < 60) {
    return 'Just now';
  }

  const minutesAgo = Math.floor(secondsAgo / 60);
  if (minutesAgo < 60) {
    return minutesAgo === 1 ? '1 min ago' : `${minutesAgo} mins ago`;
  }

  const hoursAgo = Math.floor(minutesAgo / 60);
  if (hoursAgo < 24) {
    return hoursAgo === 1 ? '1 hour ago' : `${hoursAgo} hours ago`;
  }

  const daysAgo = Math.floor(hoursAgo / 24);
  if (daysAgo < 7) {
    return daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;
  }

  const weeksAgo = Math.floor(daysAgo / 7);
  if (weeksAgo < 4) {
    return weeksAgo === 1 ? '1 week ago' : `${weeksAgo} weeks ago`;
  }

  const monthsAgo = Math.floor(daysAgo / 30);
  if (monthsAgo < 12) {
    return monthsAgo === 1 ? '1 month ago' : `${monthsAgo} months ago`;
  }

  const yearsAgo = Math.floor(daysAgo / 365);
  return yearsAgo === 1 ? '1 year ago' : `${yearsAgo} years ago`;
}
