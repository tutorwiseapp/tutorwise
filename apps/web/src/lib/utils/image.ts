/*
 * Filename: src/lib/utils/image.ts
 * Purpose: A utility function to resolve the correct profile image URL for a user.
 * Change History:
 * C003 - 2025-07-27 : 11:00 - Restored file and updated types for Clerk compatibility.
 * C002 - 2025-07-20 : 07:15 - Corrected property accessors to snake_case.
 * C001 - [Date] : [Time] - Initial creation of the utility.
 * Last Modified: 2025-07-27 : 11:00
 * Requirement ID: VIN-A-01.2
 * Change Summary: This file has been restored. The function signature has been updated to
 * accept a `Partial<Profile>` type to align with the data structure now passed from the
 * parent components, which is derived from Clerk's user object.
 * Impact Analysis: Restoring this file resolves a critical missing dependency for several
 * profile components, allowing them to correctly render user avatars.
 * Dependencies: "@/types".
 */
import type { Profile } from '@/types';

/**
 * Returns the appropriate profile image URL for a user.
 * It prioritizes a custom picture URL and falls back to a placeholder.
 */
const getProfileImageUrl = (user: Partial<Profile>): string => {
  // --- UPDATED LOGIC ---
  // 1. Use the URL from the profile (which includes avatar URL).
  if (user.avatar_url) {
    return user.avatar_url;
  }

  // 2. Fallback to a placeholder if no picture URL exists.
  return `https://i.pravatar.cc/150?u=${user.id || user.referral_id || 'default'}`;
};

export default getProfileImageUrl;