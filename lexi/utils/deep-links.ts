/**
 * Lexi Deep Links
 *
 * Maps Lexi suggestions to app navigation routes.
 * Used to make suggestion buttons actionable.
 *
 * @module lexi/utils/deep-links
 */

import type { PersonaType } from '../types';

// --- Types ---

export interface DeepLink {
  href: string;
  external?: boolean;
  action?: string; // Optional action to trigger
}

// --- Deep Link Mappings ---

/**
 * Maps suggestion text to navigation routes
 * Case-insensitive matching with keyword extraction
 */
const SUGGESTION_ROUTES: Record<string, DeepLink> = {
  // Dashboard & General
  'view your dashboard': { href: '/dashboard' },
  'view dashboard': { href: '/dashboard' },
  'go to dashboard': { href: '/dashboard' },
  'dashboard': { href: '/dashboard' },
  'check notifications': { href: '/dashboard' },

  // Bookings & Scheduling
  'view bookings': { href: '/bookings' },
  'view my bookings': { href: '/bookings' },
  'view all bookings': { href: '/bookings' },
  'book a lesson': { href: '/bookings/new' },
  'book a new lesson': { href: '/bookings/new' },
  'find a tutor': { href: '/listings' },
  'find tutors': { href: '/listings' },
  'search tutors': { href: '/listings' },
  'browse availability': { href: '/listings' },
  'view upcoming lessons': { href: '/bookings?tab=upcoming' },
  'view upcoming sessions': { href: '/bookings?tab=upcoming' },
  'see upcoming lessons': { href: '/bookings?tab=upcoming' },
  'reschedule a lesson': { href: '/bookings?action=reschedule' },
  'reschedule': { href: '/bookings?action=reschedule' },
  'cancel a lesson': { href: '/bookings?action=cancel' },
  'cancel booking': { href: '/bookings?action=cancel' },

  // Schedule & Availability (Tutor)
  'manage your availability': { href: '/bookings/availability' },
  'update availability': { href: '/bookings/availability' },
  'go to schedule': { href: '/bookings/availability' },
  'view pending bookings': { href: '/bookings?tab=pending' },

  // Progress & Analytics
  'view my progress': { href: '/dashboard?tab=progress' },
  'view progress': { href: '/dashboard?tab=progress' },
  'show my progress': { href: '/dashboard?tab=progress' },
  'view detailed progress report': { href: '/dashboard?tab=progress' },
  'view progress report': { href: '/dashboard?tab=progress' },
  "view your child's progress": { href: '/dashboard?tab=progress' },
  "my child's progress": { href: '/dashboard?tab=progress' },
  'view student progress': { href: '/dashboard?tab=students' },
  'see subject breakdown': { href: '/dashboard?tab=progress' },
  'set goals': { href: '/dashboard?tab=goals' },
  'set new learning goals': { href: '/dashboard?tab=goals' },
  'view teaching analytics': { href: '/dashboard?tab=analytics' },
  'view detailed analytics': { href: '/dashboard?tab=analytics' },
  'view organisation analytics': { href: '/dashboard?tab=analytics' },
  'see analytics': { href: '/dashboard?tab=analytics' },
  'analytics': { href: '/dashboard?tab=analytics' },

  // Learning & Resources
  'view homework': { href: '/bookings?tab=homework' },
  'show homework': { href: '/bookings?tab=homework' },
  'check homework': { href: '/bookings?tab=homework' },
  'browse resources': { href: '/resources' },
  'show resources': { href: '/resources' },
  'browse learning materials': { href: '/resources' },
  'view recommended resources': { href: '/resources?tab=recommended' },
  'show all resources': { href: '/resources' },
  'search resources': { href: '/resources?search=true' },
  'search for topic': { href: '/resources?search=true' },
  'filter by type': { href: '/resources?filter=true' },
  'access shared materials': { href: '/resources?tab=shared' },
  'create new resources': { href: '/resources/create' },
  'upload new materials': { href: '/resources/create' },
  'organize your library': { href: '/resources?tab=library' },
  'manage resource library': { href: '/resources' },

  // Financials & Billing
  'view payment history': { href: '/financials' },
  'view invoices': { href: '/financials?tab=invoices' },
  'view earnings': { href: '/financials?tab=earnings' },
  'update payment method': { href: '/payments' },
  'download tax documents': { href: '/financials?tab=tax' },
  'view organisation billing': { href: '/financials?tab=billing' },
  'manage subscriptions': { href: '/financials?tab=subscriptions' },

  // Reviews & Feedback
  'leave a review': { href: '/reviews/new' },
  'rate your last lesson': { href: '/reviews/new' },
  'view past reviews': { href: '/reviews' },
  'view my reviews': { href: '/reviews' },
  'view student reviews': { href: '/reviews?tab=received' },
  'view all reviews': { href: '/reviews' },
  'see student feedback': { href: '/reviews?tab=received' },
  'review student feedback': { href: '/reviews?tab=received' },
  'respond to feedback': { href: '/reviews?tab=received' },
  'view all feedback': { href: '/reviews' },

  // Support & Help
  'contact support': { href: '/help-centre' },
  'contact your tutor': { href: '/messages' },
  'message the tutor': { href: '/messages' },
  'report an issue': { href: '/help-centre/report' },
  'access help center': { href: '/help-centre' },
  'access admin support': { href: '/help-centre' },

  // Admin & Organisation
  'view admin dashboard': { href: '/admin' },
  'view support dashboard': { href: '/admin/support' },
  'manage users': { href: '/organisations?tab=team' },
  'assist a user': { href: '/admin/support' },
  'view support tickets': { href: '/admin/support?tab=tickets' },
  'assist users': { href: '/admin/support' },
  'generate report': { href: '/dashboard?tab=reports' },
  'generate reports': { href: '/dashboard?tab=reports' },
  'view reports': { href: '/dashboard?tab=reports' },

  // Agent-specific
  'support queue': { href: '/admin/support?tab=queue' },
  'user lookup': { href: '/admin/users' },
  'booking issues': { href: '/admin/support?tab=bookings' },
  'coordinate bookings': { href: '/admin/bookings' },
  'check tutor availability': { href: '/admin/tutors?tab=availability' },
  'review user activity': { href: '/admin/users?tab=activity' },
  'review billing issues': { href: '/admin/billing' },
  'process refunds': { href: '/admin/billing?tab=refunds' },
  'escalate issues': { href: '/admin/support?tab=escalations' },
};

// --- Functions ---

/**
 * Get deep link for a suggestion
 */
export function getDeepLink(suggestion: string, persona?: PersonaType): DeepLink | null {
  const normalized = suggestion.toLowerCase().trim();

  // Direct match
  if (SUGGESTION_ROUTES[normalized]) {
    return SUGGESTION_ROUTES[normalized];
  }

  // Partial match - find best match
  for (const [key, link] of Object.entries(SUGGESTION_ROUTES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return link;
    }
  }

  // Keyword-based matching
  const keywords = normalized.split(' ');
  for (const [key, link] of Object.entries(SUGGESTION_ROUTES)) {
    const keyKeywords = key.split(' ');
    const matchCount = keywords.filter(kw => keyKeywords.includes(kw)).length;
    if (matchCount >= 2) {
      return link;
    }
  }

  return null;
}

/**
 * Check if a suggestion is navigable
 */
export function isNavigableSuggestion(suggestion: string): boolean {
  return getDeepLink(suggestion) !== null;
}

/**
 * Get all available deep links (for debugging)
 */
export function getAllDeepLinks(): Record<string, DeepLink> {
  return { ...SUGGESTION_ROUTES };
}

export default { getDeepLink, isNavigableSuggestion, getAllDeepLinks };
