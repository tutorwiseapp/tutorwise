/**
 * Lexi Personas
 *
 * Exports all persona implementations for Lexi.
 *
 * User roles: tutor, client, agent, student
 * Entity: organisation (manages multiple users)
 *
 * Sub-personas: specialized experts for specific domains
 */

export { BasePersona, withIntentHandlers, type IPersona, type IntentHandlerMap } from './base-persona';
export { StudentPersona } from './student';
export { TutorPersona } from './tutor';
export { ClientPersona } from './client';
export { AgentPersona } from './agent';
export { OrganisationPersona } from './organisation';

// Sub-personas
export {
  TutorEarningsExpert,
  ClientMatchingHelper,
  OrganisationAdmin,
  NewUserGuide,
  getSubPersona,
  detectSubPersona,
  subPersonas,
  type SubPersonaType,
} from './sub-personas';

import { StudentPersona } from './student';
import { TutorPersona } from './tutor';
import { ClientPersona } from './client';
import { AgentPersona } from './agent';
import { OrganisationPersona } from './organisation';
import type { PersonaType } from '../types';
import type { IPersona } from './base-persona';

/**
 * Get persona instance by type
 */
export function getPersona(type: PersonaType): IPersona {
  switch (type) {
    case 'student':
      return StudentPersona;
    case 'tutor':
      return TutorPersona;
    case 'client':
      return ClientPersona;
    case 'agent':
      return AgentPersona;
    case 'organisation':
      return OrganisationPersona;
    default:
      throw new Error(`Unknown persona type: ${type}`);
  }
}

/**
 * All available personas
 */
export const personas = {
  student: StudentPersona,
  tutor: TutorPersona,
  client: ClientPersona,
  agent: AgentPersona,
  organisation: OrganisationPersona,
};
