/**
 * Filename: src/lib/utils/formatId.ts
 * Purpose: Shared utility for formatting UUIDs for display across the platform
 * Created: 2025-12-27
 * Standard: See docs/admin/identifier-standard.md
 */

/**
 * Formats a UUID for display in various UI contexts.
 *
 * This is the canonical function for ID formatting across the entire platform.
 * ALL components (admin tables, user cards, modals, etc.) MUST use this utility
 * instead of manual string manipulation.
 *
 * @param id - The full UUID string from the database
 * @param context - Display context ('truncated' | 'full')
 * @param options - Optional formatting options
 * @returns Formatted ID string ready for display
 *
 * @example
 * // Truncated format with # prefix (default) - for tables and cards
 * formatIdForDisplay('a1b2c3d4-5678-90ab-cdef-1234567890ab')
 * // Returns: '#a1b2c3d4'
 *
 * @example
 * // Full UUID format - for modals, exports, logs
 * formatIdForDisplay('a1b2c3d4-5678-90ab-cdef-1234567890ab', 'full')
 * // Returns: 'a1b2c3d4-5678-90ab-cdef-1234567890ab'
 *
 * @example
 * // Custom truncation length (not recommended - breaks consistency)
 * formatIdForDisplay('a1b2c3d4-5678-90ab-cdef-1234567890ab', 'truncated', { length: 12 })
 * // Returns: '#a1b2c3d4-567'
 *
 * @example
 * // Without prefix (not recommended - breaks consistency)
 * formatIdForDisplay('a1b2c3d4-5678-90ab-cdef-1234567890ab', 'truncated', { prefix: false })
 * // Returns: 'a1b2c3d4'
 *
 * @example
 * // Uppercase (not recommended - UUIDs are lowercase by convention)
 * formatIdForDisplay('a1b2c3d4-5678-90ab-cdef-1234567890ab', 'truncated', { uppercase: true })
 * // Returns: '#A1B2C3D4'
 *
 * @example
 * // Null/undefined handling
 * formatIdForDisplay(null)
 * // Returns: '—'
 * formatIdForDisplay(undefined)
 * // Returns: '—'
 * formatIdForDisplay('')
 * // Returns: '—'
 */
export function formatIdForDisplay(
  id: string | null | undefined,
  context: 'truncated' | 'full' = 'truncated',
  options?: {
    /**
     * Include # prefix before the ID
     * @default true (for truncated context)
     */
    prefix?: boolean;

    /**
     * Convert ID to uppercase
     * @default false
     * @note Not recommended - UUIDs are lowercase by convention
     */
    uppercase?: boolean;

    /**
     * Number of characters to show in truncated context
     * @default 8
     * @note Not recommended to change - breaks consistency
     */
    length?: number;
  }
): string {
  // Handle null, undefined, or empty string
  if (!id || id.trim() === '') {
    return '—';
  }

  // Full UUID context - return as-is
  if (context === 'full') {
    return id;
  }

  // Truncated context (default)
  const length = options?.length ?? 8;
  const prefix = options?.prefix ?? true;
  const uppercase = options?.uppercase ?? false;

  // Extract first N characters
  let truncated = id.slice(0, length);

  // Apply uppercase if requested
  if (uppercase) {
    truncated = truncated.toUpperCase();
  }

  // Add # prefix if requested (default)
  return prefix ? `#${truncated}` : truncated;
}

/**
 * Extracts a clean UUID from various input formats.
 *
 * Handles inputs like:
 * - '#a1b2c3d4' (truncated with prefix)
 * - 'a1b2c3d4' (truncated without prefix)
 * - 'a1b2c3d4-5678-90ab-cdef-1234567890ab' (full UUID)
 * - ' #a1b2c3d4 ' (with whitespace)
 *
 * @param input - The ID string in any format
 * @returns Clean UUID string without prefix or whitespace
 *
 * @example
 * cleanIdInput('#a1b2c3d4')
 * // Returns: 'a1b2c3d4'
 *
 * @example
 * cleanIdInput('a1b2c3d4-5678-90ab-cdef-1234567890ab')
 * // Returns: 'a1b2c3d4-5678-90ab-cdef-1234567890ab'
 */
export function cleanIdInput(input: string | null | undefined): string | null {
  if (input === null || input === undefined) {
    return null;
  }

  // Trim whitespace
  let cleaned = input.trim();

  // Return empty string if input was empty or whitespace only
  if (cleaned === '') {
    return '';
  }

  // Remove # prefix if present
  if (cleaned.startsWith('#')) {
    cleaned = cleaned.substring(1);
  }

  return cleaned;
}

/**
 * Validates if a string is a valid UUID format.
 *
 * Checks for standard UUID format: 8-4-4-4-12 hexadecimal characters
 *
 * @param id - The string to validate
 * @returns true if valid UUID format, false otherwise
 *
 * @example
 * isValidUuid('a1b2c3d4-5678-90ab-cdef-1234567890ab')
 * // Returns: true
 *
 * @example
 * isValidUuid('#a1b2c3d4')
 * // Returns: false (truncated, not full UUID)
 *
 * @example
 * isValidUuid('not-a-uuid')
 * // Returns: false
 */
export function isValidUuid(id: string | null | undefined): boolean {
  if (!id) {
    return false;
  }

  // UUID regex: 8-4-4-4-12 hexadecimal format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return uuidRegex.test(id);
}

/**
 * Compares two IDs for equality, handling both truncated and full formats.
 *
 * Useful for matching user input against database IDs.
 *
 * @param id1 - First ID (any format)
 * @param id2 - Second ID (any format)
 * @returns true if IDs match (considering truncation), false otherwise
 *
 * @example
 * // Truncated vs full
 * compareIds('#a1b2c3d4', 'a1b2c3d4-5678-90ab-cdef-1234567890ab')
 * // Returns: true
 *
 * @example
 * // Both truncated
 * compareIds('a1b2c3d4', '#a1b2c3d4')
 * // Returns: true
 *
 * @example
 * // Both full
 * compareIds(
 *   'a1b2c3d4-5678-90ab-cdef-1234567890ab',
 *   'a1b2c3d4-5678-90ab-cdef-1234567890ab'
 * )
 * // Returns: true
 *
 * @example
 * // Different IDs
 * compareIds('a1b2c3d4', 'ffffffff')
 * // Returns: false
 */
export function compareIds(
  id1: string | null | undefined,
  id2: string | null | undefined
): boolean {
  if (!id1 || !id2) {
    return false;
  }

  // Clean both inputs (remove #, trim whitespace)
  const clean1 = cleanIdInput(id1);
  const clean2 = cleanIdInput(id2);

  if (!clean1 || !clean2) {
    return false;
  }

  // If both are full UUIDs, compare exactly
  if (isValidUuid(clean1) && isValidUuid(clean2)) {
    return clean1.toLowerCase() === clean2.toLowerCase();
  }

  // If one is truncated, compare the truncated portions
  // (assumes 8-character truncation - matches the standard)
  const truncated1 = clean1.toLowerCase().slice(0, 8);
  const truncated2 = clean2.toLowerCase().slice(0, 8);

  return truncated1 === truncated2;
}

/**
 * Generates a random UUID (for testing purposes).
 *
 * ⚠️ WARNING: This is NOT cryptographically secure.
 * Use only for testing/development. In production, rely on Supabase's gen_random_uuid().
 *
 * @returns A valid UUID string
 *
 * @example
 * generateMockUuid()
 * // Returns: 'a1b2c3d4-5678-90ab-cdef-1234567890ab' (random)
 */
export function generateMockUuid(): string {
  // Generate random hex string
  const hex = () => Math.floor(Math.random() * 16).toString(16);

  // Build UUID in 8-4-4-4-12 format
  return (
    Array.from({ length: 8 }, hex).join('') +
    '-' +
    Array.from({ length: 4 }, hex).join('') +
    '-' +
    '4' + // Version 4 UUID
    Array.from({ length: 3 }, hex).join('') +
    '-' +
    ['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)] + // Variant bits
    Array.from({ length: 3 }, hex).join('') +
    '-' +
    Array.from({ length: 12 }, hex).join('')
  );
}
