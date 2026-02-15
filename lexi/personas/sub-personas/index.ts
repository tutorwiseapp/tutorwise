/**
 * Lexi Sub-Personas
 *
 * Specialized personas that extend base personas with focused capabilities.
 * Sub-personas provide expert-level assistance in specific domains.
 *
 * @module lexi/personas/sub-personas
 */

export { TutorEarningsExpert, tutorEarningsExpert } from './tutor-earnings-expert';
export { ClientMatchingHelper, clientMatchingHelper } from './client-matching-helper';
export { OrganisationAdmin, organisationAdmin } from './organisation-admin';
export { NewUserGuide, newUserGuide } from './new-user-guide';

import { tutorEarningsExpert } from './tutor-earnings-expert';
import { clientMatchingHelper } from './client-matching-helper';
import { organisationAdmin } from './organisation-admin';
import { newUserGuide } from './new-user-guide';
import type { IPersona } from '../base-persona';

export type SubPersonaType =
  | 'tutor_earnings_expert'
  | 'client_matching_helper'
  | 'organisation_admin'
  | 'new_user_guide';

/**
 * Get sub-persona by type
 */
export function getSubPersona(type: SubPersonaType): IPersona {
  switch (type) {
    case 'tutor_earnings_expert':
      return tutorEarningsExpert;
    case 'client_matching_helper':
      return clientMatchingHelper;
    case 'organisation_admin':
      return organisationAdmin;
    case 'new_user_guide':
      return newUserGuide;
    default:
      throw new Error(`Unknown sub-persona type: ${type}`);
  }
}

/**
 * Detect which sub-persona should handle a query based on intent
 */
export function detectSubPersona(
  basePersona: string,
  intentCategory: string,
  query: string
): SubPersonaType | null {
  const lowerQuery = query.toLowerCase();

  // Tutor queries about earnings
  if (basePersona === 'tutor') {
    if (
      intentCategory === 'billing' ||
      lowerQuery.includes('earning') ||
      lowerQuery.includes('payout') ||
      lowerQuery.includes('payment') ||
      lowerQuery.includes('invoice') ||
      lowerQuery.includes('commission') ||
      lowerQuery.includes('fee')
    ) {
      return 'tutor_earnings_expert';
    }
  }

  // Client queries about finding tutors
  if (basePersona === 'client') {
    if (
      intentCategory === 'tutors' ||
      lowerQuery.includes('find') ||
      lowerQuery.includes('search') ||
      lowerQuery.includes('tutor for') ||
      lowerQuery.includes('recommend') ||
      lowerQuery.includes('match')
    ) {
      return 'client_matching_helper';
    }
  }

  // Organisation queries
  if (basePersona === 'organisation') {
    if (
      intentCategory === 'analytics' ||
      lowerQuery.includes('dashboard') ||
      lowerQuery.includes('manage') ||
      lowerQuery.includes('report') ||
      lowerQuery.includes('admin')
    ) {
      return 'organisation_admin';
    }
  }

  // New user queries (any persona)
  if (
    lowerQuery.includes('how do i') ||
    lowerQuery.includes('get started') ||
    lowerQuery.includes('new to') ||
    lowerQuery.includes('first time') ||
    lowerQuery.includes('set up') ||
    lowerQuery.includes('getting started')
  ) {
    return 'new_user_guide';
  }

  return null;
}

/**
 * All sub-personas
 */
export const subPersonas = {
  tutor_earnings_expert: tutorEarningsExpert,
  client_matching_helper: clientMatchingHelper,
  organisation_admin: organisationAdmin,
  new_user_guide: newUserGuide,
};
