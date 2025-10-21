/*
 * Filename: src/lib/utils/image.ts
 * Purpose: A utility function to resolve the correct profile image URL for a user.
 * Change History:
 * C004 - 2025-10-21 : [Time] - Replaced human face avatars with academic-themed pattern avatars.
 * C003 - 2025-07-27 : 11:00 - Restored file and updated types for Clerk compatibility.
 * C002 - 2025-07-20 : 07:15 - Corrected property accessors to snake_case.
 * C001 - [Date] : [Time] - Initial creation of the utility.
 * Last Modified: 2025-10-21
 * Requirement ID: VIN-A-01.2
 * Change Summary: Replaced pravatar.cc (human faces) with custom academic-themed avatars
 * featuring math, science, and English symbols. Provides more professional and
 * education-focused user experience.
 * Impact Analysis: All users without custom avatars will now see academic pattern avatars
 * instead of random human faces. Custom uploaded avatars are still prioritized.
 * Dependencies: "@/types", "./academicAvatar".
 */
import type { Profile } from '@/types';
import { getAcademicAvatarUrl } from './academicAvatar';

/**
 * Returns the appropriate profile image URL for a user.
 * It prioritizes a custom picture URL and falls back to academic-themed avatars.
 */
const getProfileImageUrl = (user: Partial<Profile>): string => {
  // 1. Use the custom avatar URL from the profile if available
  if (user.avatar_url) {
    return user.avatar_url;
  }

  // 2. Fallback to academic-themed pattern avatar (math, science, English symbols)
  // This generates a unique, deterministic avatar based on user ID
  const userId = user.id || user.referral_id || 'default';
  return getAcademicAvatarUrl(userId, 'symbols');
};

export default getProfileImageUrl;