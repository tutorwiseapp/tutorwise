/*
 * Filename: src/lib/utils/image.ts
 * Purpose: A utility function to resolve the correct profile image URL for a user.
 * Change History:
 * C005 - 2025-12-09 : [Time] - Replaced academic avatars with teal initials for brand consistency.
 * C004 - 2025-10-21 : [Time] - Replaced human face avatars with academic-themed pattern avatars.
 * C003 - 2025-07-27 : 11:00 - Restored file and updated types for Clerk compatibility.
 * C002 - 2025-07-20 : 07:15 - Corrected property accessors to snake_case.
 * C001 - [Date] : [Time] - Initial creation of the utility.
 * Last Modified: 2025-12-09
 * Requirement ID: VIN-A-01.2
 * Change Summary: Replaced academic-themed avatars with simple teal gradient initials
 * (e.g., "Michael Quan" → "MQ", "Mathematics" → "MA"). Provides simpler, more
 * branded user experience consistent with Tutorwise design system.
 * Impact Analysis: All users without custom avatars will now see teal initials avatars
 * instead of academic pattern avatars. Custom uploaded avatars are still prioritized.
 * Dependencies: "@/types", "./tealAvatar".
 */
import { getTealAvatarUrl, type AvatarVariant } from './tealAvatar';

/** Accepts any object with optional nullable avatar fields — permissive for DB rows */
type AvatarUser = {
  id?: string | null;
  avatar_url?: string | null;
  full_name?: string | null;
  referral_id?: string | null;
};

/**
 * Returns the appropriate profile image URL for a user.
 * It prioritizes a custom picture URL and falls back to gradient initials avatars.
 *
 * @param user - Object with optional avatar_url, full_name, id (nullable values accepted)
 * @param isListing - If true, use first 2 characters (for listing titles)
 * @param subject - Subject for color mapping (only used when isListing=true)
 * @param variant - Avatar variant: 'profile' (teal), 'ai-agent' (blue), 'listing' (subject-based)
 */
const getProfileImageUrl = (
  user: AvatarUser,
  isListing: boolean = false,
  subject?: string,
  variant?: AvatarVariant
): string => {
  // Use getTealAvatarUrl which handles both custom avatars and gradient initials fallback
  // Prioritizes: 1) Custom avatar, 2) Gradient initials based on name/subject/variant
  const name = user.full_name || user.id || user.referral_id || 'default';
  return getTealAvatarUrl(user.avatar_url, name, isListing, subject, variant);
};

export default getProfileImageUrl;