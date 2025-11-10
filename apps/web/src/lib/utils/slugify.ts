/**
 * Filename: lib/utils/slugify.ts
 * Purpose: URL slug generation utilities
 * Created: Original function - legacy
 * Updated: 2025-11-10 - Added v4.8 public profile slug support
 */

/**
 * Legacy slugify function (retained for backward compatibility)
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

/**
 * Converts a full name to a URL-safe slug for public profiles (v4.8)
 * Must match the SQL generate_slug() function in migration 053.
 *
 * @param fullName - User's full name (e.g., "John Smith")
 * @returns URL-safe slug (e.g., "john-smith")
 *
 * @example
 * generateSlug("John Smith") // "john-smith"
 * generateSlug("Mary O'Brien") // "mary-o-brien"
 * generateSlug("José García") // "jose-garcia"
 */
export function generateSlug(fullName: string): string {
  return fullName
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (é -> e)
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens
}

/**
 * Validates that a slug matches the expected format
 *
 * @param slug - Slug to validate
 * @returns true if slug is valid
 */
export function isValidSlug(slug: string): boolean {
  // Slug must be lowercase alphanumeric with hyphens
  // No leading/trailing hyphens
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}
