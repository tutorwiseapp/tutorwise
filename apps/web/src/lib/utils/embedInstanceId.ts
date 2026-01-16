/**
 * Filename: apps/web/src/lib/utils/embedInstanceId.ts
 * Purpose: Generate stable embed instance IDs for performance tracking
 * Created: 2026-01-16
 *
 * Implements stable hash-based embed instance IDs:
 * - Deterministic: same (article + component + position) = same ID
 * - Enables: "position 1 vs position 2" performance comparison
 * - Not random: same embed across different users gets same ID
 */

/**
 * Component types that can be embedded in blog articles
 */
export type EmbedComponent =
  | 'tutor_embed'
  | 'listing_grid'
  | 'tutor_carousel'
  | 'cta_button'
  | 'inline_link'
  | 'floating_save'
  | 'article_header';

/**
 * Simple string hash function (djb2 algorithm)
 *
 * @param str - String to hash
 * @returns Positive integer hash
 */
function hashString(str: string): number {
  let hash = 5381;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i); // hash * 33 + char
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash);
}

/**
 * Generate stable embed instance ID
 *
 * Creates deterministic ID from article ID, component type, and position.
 * Same input parameters always produce same ID, enabling cross-user performance comparison.
 *
 * @param articleId - Blog article UUID
 * @param component - Component type (e.g., 'tutor_embed', 'listing_grid')
 * @param position - Zero-indexed position in article (default: 0)
 * @returns Stable embed instance ID (format: "embed_[hash]")
 *
 * @example
 * ```typescript
 * const embedId = generateEmbedInstanceId(
 *   '550e8400-e29b-41d4-a716-446655440000',
 *   'tutor_embed',
 *   0
 * );
 * // Returns: "embed_1a2b3c4d"
 *
 * // Same inputs always produce same output
 * const embedId2 = generateEmbedInstanceId(
 *   '550e8400-e29b-41d4-a716-446655440000',
 *   'tutor_embed',
 *   0
 * );
 * // embedId === embedId2 (true)
 * ```
 */
export function generateEmbedInstanceId(
  articleId: string,
  component: EmbedComponent,
  position: number = 0
): string {
  // Create payload from inputs
  const payload = `${articleId}:${component}:${position}`;

  // Generate hash
  const hash = hashString(payload);

  // Convert to base36 for compact representation
  const hashBase36 = hash.toString(36);

  return `embed_${hashBase36}`;
}

/**
 * Parse embed instance ID to extract components
 *
 * Note: This cannot reverse the hash to get original values.
 * This is only useful for validation and debugging.
 *
 * @param embedInstanceId - Embed instance ID (format: "embed_[hash]")
 * @returns Object with valid flag and hash
 *
 * @example
 * ```typescript
 * const parsed = parseEmbedInstanceId('embed_1a2b3c4d');
 * // Returns: { valid: true, hash: '1a2b3c4d' }
 *
 * const invalid = parseEmbedInstanceId('invalid_id');
 * // Returns: { valid: false, hash: null }
 * ```
 */
export function parseEmbedInstanceId(embedInstanceId: string): {
  valid: boolean;
  hash: string | null;
} {
  if (!embedInstanceId.startsWith('embed_')) {
    return { valid: false, hash: null };
  }

  const hash = embedInstanceId.substring(6); // Remove "embed_" prefix

  if (hash.length === 0) {
    return { valid: false, hash: null };
  }

  return { valid: true, hash };
}

/**
 * Validate embed instance ID format
 *
 * @param embedInstanceId - Embed instance ID to validate
 * @returns true if valid format
 *
 * @example
 * ```typescript
 * isValidEmbedInstanceId('embed_1a2b3c4d'); // true
 * isValidEmbedInstanceId('invalid_id');     // false
 * isValidEmbedInstanceId('embed_');         // false
 * ```
 */
export function isValidEmbedInstanceId(embedInstanceId: string): boolean {
  return parseEmbedInstanceId(embedInstanceId).valid;
}
