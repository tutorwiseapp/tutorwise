/*
 * Filename: src/lib/utils/image.ts
 * Purpose: A utility function to resolve the correct profile image URL for a user.
 *
 * Change History:
 * C002 - 2025-07-20 : 07:15 - Applied new standard header format and corrected property accessors to snake_case.
 * C001 - [Date] : [Time] - Initial creation of the utility.
 *
 * Last Modified: 2025-07-20 : 07:15
 * Requirement ID: VIN-A-01.2
 *
 * Change Summary:
 * Updated the function to use snake_case for all properties (e.g., user.custom_picture_url) to align with the
 * canonical Profile interface. This also involved applying the new, detailed header format for documentation.
 *
 * Impact Analysis:
 * This is the final fix required to resolve the data inconsistency bug. It ensures that components like
 * ProfileSidebar and ProfileCard can correctly fetch and display user profile images.
 *
 * Dependencies:
 * - @/types
 *
 * Props (if applicable):
 * - user: A partial User/Profile object.
 *
 * TODO: None
 */
import { User } from '@/types';

// Using a simple, non-crypto hash for client-side consistency.
const simpleHash = (str: string = ''): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

// This is a default export.
const getProfileImageUrl = (user: Partial<User>): string => {
  if (user.custom_picture_url) {
    return user.custom_picture_url;
  }
  if (user.email) {
    const emailHash = simpleHash(user.email.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${emailHash}?d=mp&s=150`;
  }
  return `https://i.pravatar.cc/150?u=${user.agent_id || 'default'}`;
};

export default getProfileImageUrl;
