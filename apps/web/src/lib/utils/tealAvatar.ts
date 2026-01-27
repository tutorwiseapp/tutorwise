/**
 * Filename: tealAvatar.ts
 * Purpose: Generate gradient avatars with initials
 * Created: 2025-12-09
 *
 * Design:
 * - Profiles: Tutorwise branded teal gradient (#66b2b2 → #99cccc)
 * - Listings: Subject-based gradient colors
 *   - Science: Orange (#ff8c42 → #ffb366)
 *   - Humanities: Yellow (#ffd700 → #ffe14d)
 *   - English: Blue (#4a90e2 → #73b3ff)
 *   - Maths: Green (#50c878 → #7dd99a)
 *   - Arts: Purple (#9966cc → #b399dd)
 *   - Other: Grey (#808080 → #a6a6a6)
 *
 * Initials Logic:
 * - Profiles: Name initials (e.g., "Michael Quan" → "MQ")
 * - Listings: First 2 characters of title (e.g., "AI Tutor" → "AI")
 */

import { getInitials } from './initials';

/**
 * Subject category type for color mapping
 */
type SubjectCategory = 'Science' | 'Humanities' | 'English' | 'Maths' | 'Arts' | 'Other';

/**
 * Get subject category from a subject string
 * Maps subjects to color categories for gradient generation
 *
 * @param subject - Subject name (e.g., "Physics", "Mathematics", "English Literature")
 * @returns Subject category for color mapping
 */
function getSubjectCategory(subject: string | null | undefined): SubjectCategory {
  if (!subject) return 'Other';

  const normalized = subject.toLowerCase().trim();

  // Science subjects (Orange)
  if (
    normalized.includes('physics') ||
    normalized.includes('chemistry') ||
    normalized.includes('biology') ||
    normalized.includes('science')
  ) {
    return 'Science';
  }

  // Maths subjects (Green)
  if (
    normalized.includes('math') ||
    normalized.includes('calculus') ||
    normalized.includes('algebra') ||
    normalized.includes('geometry') ||
    normalized.includes('statistics')
  ) {
    return 'Maths';
  }

  // English subjects (Blue)
  if (
    normalized.includes('english') ||
    normalized.includes('literature') ||
    normalized.includes('writing')
  ) {
    return 'English';
  }

  // Humanities subjects (Yellow)
  if (
    normalized.includes('history') ||
    normalized.includes('geography') ||
    normalized.includes('social') ||
    normalized.includes('humanit') ||
    normalized.includes('philosophy') ||
    normalized.includes('psychology')
  ) {
    return 'Humanities';
  }

  // Arts subjects (Purple)
  if (
    normalized.includes('art') ||
    normalized.includes('music') ||
    normalized.includes('drama') ||
    normalized.includes('theatre') ||
    normalized.includes('dance') ||
    normalized.includes('design')
  ) {
    return 'Arts';
  }

  // Default
  return 'Other';
}

/**
 * Get gradient colors based on subject category
 *
 * @param category - Subject category
 * @returns Object with gradientStart and gradientEnd colors
 */
function getGradientColors(category: SubjectCategory): { gradientStart: string; gradientEnd: string } {
  switch (category) {
    case 'Science':
      return { gradientStart: '#ff8c42', gradientEnd: '#ffb366' }; // Medium orange gradient
    case 'Humanities':
      return { gradientStart: '#ffd700', gradientEnd: '#ffe14d' }; // Medium yellow gradient
    case 'English':
      return { gradientStart: '#4a90e2', gradientEnd: '#73b3ff' }; // Medium blue gradient
    case 'Maths':
      return { gradientStart: '#50c878', gradientEnd: '#7dd99a' }; // Medium green gradient
    case 'Arts':
      return { gradientStart: '#9966cc', gradientEnd: '#b399dd' }; // Medium purple gradient
    case 'Other':
    default:
      return { gradientStart: '#808080', gradientEnd: '#a6a6a6' }; // Medium grey gradient
  }
}

/**
 * Generate a gradient SVG avatar with initials
 *
 * @param name - Full name or title to generate initials from
 * @param size - Size of the avatar in pixels (default: 150)
 * @param isListing - If true, use first 2 characters for listing titles
 * @param subject - Subject for color mapping (only used when isListing=true)
 * @returns Data URL of the generated SVG avatar
 *
 * @example
 * // Profile avatars (teal gradient)
 * generateTealAvatar("Michael Quan")  // Teal avatar with "MQ"
 *
 * // Listing avatars (subject-based gradients)
 * generateTealAvatar("AI Tutor Study Support", 150, true, "Mathematics")  // Green avatar with "AI"
 * generateTealAvatar("Physics Tutoring", 150, true, "Physics")  // Orange avatar with "PH"
 */
export function generateTealAvatar(
  name: string | null | undefined,
  size: number = 150,
  isListing: boolean = false,
  subject?: string
): string {
  const initials = getInitials(name, isListing);

  let gradientStart: string;
  let gradientEnd: string;
  let gradientId: string;

  if (isListing) {
    // Listings: Use subject-based gradient colors
    const category = getSubjectCategory(subject);
    const colors = getGradientColors(category);
    gradientStart = colors.gradientStart;
    gradientEnd = colors.gradientEnd;
    gradientId = `${category.toLowerCase()}-gradient`;
  } else {
    // Profiles: Use Tutorwise teal gradient
    gradientStart = '#26B0B9'; // Teal (start)
    gradientEnd = '#5cc9d1';   // Lighter teal (end)
    gradientId = 'teal-gradient';
  }

  const textColor = '#ffffff'; // White initials

  // Generate SVG with gradient and initials
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
      <!-- Background gradient -->
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${gradientStart};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${gradientEnd};stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Background with gradient (no rounded corners) -->
      <rect width="150" height="150" fill="url(#${gradientId})"/>

      <!-- Initials text -->
      <text
        x="50%"
        y="50%"
        dominant-baseline="central"
        text-anchor="middle"
        font-size="60"
        font-weight="600"
        fill="${textColor}"
        font-family="Inter, system-ui, -apple-system, 'Segoe UI', sans-serif"
      >${initials}</text>
    </svg>
  `;

  // Convert SVG to data URL
  const encoded = encodeURIComponent(svg.trim());
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Get avatar URL for a user profile or listing
 * Prioritizes uploaded avatar, falls back to gradient initials
 *
 * @param avatarUrl - Custom uploaded avatar URL (optional)
 * @param name - User's name or listing title for generating initials
 * @param isListing - If true, use first 2 characters (for listing titles)
 * @param subject - Subject for color mapping (only used when isListing=true)
 * @returns Avatar URL (either custom or generated gradient avatar)
 */
export function getTealAvatarUrl(
  avatarUrl: string | null | undefined,
  name: string | null | undefined,
  isListing: boolean = false,
  subject?: string
): string {
  // 1. Use custom avatar if available
  if (avatarUrl) {
    return avatarUrl;
  }

  // 2. Fallback to gradient initials avatar
  return generateTealAvatar(name, 150, isListing, subject);
}
