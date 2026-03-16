/**
 * SEN/SEND Module
 *
 * Special Educational Needs and Disabilities support for Sage.
 * Provides system prompt adaptations and content modifications for 11 SEN categories.
 *
 * @module sage/sen
 */

export type { SENCategory, SENAdaptation, SENProfile } from './types';

export {
  getSENAdaptations,
  getSENSystemPrompt,
  getRecommendedModes,
} from './adapter';
