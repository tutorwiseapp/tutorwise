/**
 * Filename: initials.ts
 * Purpose: Generate consistent initials for avatar fallbacks across the platform
 * Created: 2025-12-09
 *
 * Design Pattern: Teal Initials Fallback
 * - Two names (e.g., "Michael Quan") → First letter of each = "MQ"
 * - One name/word (e.g., "Mathematics") → First 2 characters = "MA"
 * - Empty/null → "?"
 *
 * Used by:
 * - Marketplace cards (profile & listing avatars)
 * - Hub cards (bookings, wiselists, referrals)
 * - Navigation menu
 * - Any other avatar displays
 */

/**
 * Generate 2-character initials from a name or title
 *
 * @param name - Full name or title (e.g., "Michael Quan", "Mathematics")
 * @param isListing - If true, always use first 2 characters (for listing titles)
 * @returns 2-character uppercase initials (e.g., "MQ", "MA", "AI", "?")
 *
 * @example
 * // Profile names (isListing = false, default)
 * getInitials("Michael Quan")  // "MQ" (first letter of each word)
 * getInitials("John Smith")    // "JS" (first letter of each word)
 * getInitials("Mathematics")   // "MA" (first 2 chars of single word)
 *
 * // Listing titles (isListing = true)
 * getInitials("AI Tutor Study Support", true)  // "AI" (first 2 chars)
 * getInitials("GCSE Mathematics Tutoring", true)  // "GC" (first 2 chars)
 * getInitials("Advanced Physics Lessons", true)   // "AD" (first 2 chars)
 *
 * getInitials("")              // "?"
 * getInitials(null)            // "?"
 */
export function getInitials(name: string | null | undefined, isListing: boolean = false): string {
  // Handle null/undefined/empty
  if (!name || name.trim() === '') {
    return '?';
  }

  const cleaned = name.trim();

  // For listings: ALWAYS use first 2 characters
  if (isListing) {
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2).toUpperCase();
    }
    if (cleaned.length === 1) {
      return cleaned.charAt(0).toUpperCase() + '?';
    }
    return '?';
  }

  // For profiles: Use name initials logic
  const words = cleaned.split(/\s+/); // Split by whitespace

  // Case 1: Two or more words → First letter of first two words
  if (words.length >= 2) {
    const firstInitial = words[0].charAt(0).toUpperCase();
    const secondInitial = words[1].charAt(0).toUpperCase();
    return firstInitial + secondInitial;
  }

  // Case 2: One word → First 2 characters
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].substring(0, 2).toUpperCase();
  }

  // Case 3: One word with only 1 character → That char + "?"
  if (words.length === 1 && words[0].length === 1) {
    return words[0].charAt(0).toUpperCase() + '?';
  }

  // Fallback (should rarely hit this)
  return '?';
}

/**
 * Convenience function for getting initials with explicit fallback
 *
 * @param name - Full name or title
 * @param fallback - Custom fallback string (default: "?")
 * @returns 2-character uppercase initials or fallback
 */
export function getInitialsWithFallback(
  name: string | null | undefined,
  fallback: string = '?'
): string {
  const initials = getInitials(name);
  return initials === '?' ? fallback : initials;
}
