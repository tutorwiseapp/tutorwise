/**
 * SEN/SEND Types
 *
 * Special Educational Needs and Disabilities support types.
 * Used by the SEN adapter to inject behavioural guidelines into LLM prompts.
 *
 * Privacy: SEN categories are sensitive under UK GDPR Children's Code.
 * Never send category labels to LLM — only send adapted behavioural instructions.
 *
 * @module sage/sen/types
 */

import type { SENCategory } from '../types';

export type { SENCategory } from '../types';

/**
 * SEN adaptation profile for a specific category
 */
export interface SENAdaptation {
  category: SENCategory;
  displayName: string;
  /** Guidelines injected into LLM system prompt */
  promptGuidelines: string[];
  /** Post-processing rules for response content */
  contentAdaptations: string[];
  /** Patterns to avoid in output */
  forbiddenPatterns: string[];
  /** Teaching modes that work best for this category */
  recommendedModes: ('socratic' | 'direct' | 'adaptive' | 'supportive')[];
}

/**
 * Student's SEN profile (stored in sage_student_profiles)
 */
export interface SENProfile {
  categories: SENCategory[];
  /** Free-text notes from parent or tutor */
  notes?: string;
  /** Overall adaptation intensity */
  adaptationLevel: 'mild' | 'moderate' | 'significant';
}
