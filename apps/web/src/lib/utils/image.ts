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
 * branded user experience consistent with TutorWise design system.
 * Impact Analysis: All users without custom avatars will now see teal initials avatars
 * instead of academic pattern avatars. Custom uploaded avatars are still prioritized.
 * Dependencies: "@/types", "./tealAvatar".
 */
import type { Profile } from '@/types';
import { getTealAvatarUrl } from './tealAvatar';

/**
 * Returns the appropriate profile image URL for a user.
 * It prioritizes a custom picture URL and falls back to gradient initials avatars.
 *
 * @param user - Partial profile object with avatar_url, full_name, etc.
 * @param isListing - If true, use first 2 characters (for listing titles)
 * @param subject - Subject for color mapping (only used when isListing=true)
 */
const getProfileImageUrl = (
  user: Partial<Profile>,
  isListing: boolean = false,
  subject?: string
): string => {
  // Use getTealAvatarUrl which handles both custom avatars and gradient initials fallback
  // Prioritizes: 1) Custom avatar, 2) Gradient initials based on name/subject
  const name = user.full_name || user.id || user.referral_id || 'default';
  return getTealAvatarUrl(user.avatar_url, name, isListing, subject);
};

export default getProfileImageUrl;