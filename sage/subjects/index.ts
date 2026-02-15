/**
 * Sage Subjects
 *
 * Subject domain logic, curriculum data, and DSPy engines.
 */

export type {
  CurriculumSpec,
  TopicNode,
  AssessmentObjective,
  TopicHierarchy,
  TopicCategory,
  Topic,
  LearningObjective,
  SubjectConfig,
  FormulaReference,
  KeyTermDefinition,
} from './types';

// DSPy Types
export type { DSPySignature, DSPyExample, DSPyModule } from './dspy-types';

// Subject Configs
export { mathsConfig, GCSE_MATHS_TOPICS, gcseMathsTopicHierarchy, findTopic } from './maths';
export { englishConfig, GCSE_ENGLISH_TOPICS } from './english';
export { scienceConfig, GCSE_SCIENCE_TOPICS } from './science';
export { generalConfig, STUDY_SKILLS_TOPICS } from './general';

// DSPy Engines
export { MATHS_SIGNATURES, getMathsSignature } from './maths/engine';
export { ENGLISH_SIGNATURES, getEnglishSignature } from './english/engine';
export { SCIENCE_SIGNATURES, getScienceSignature } from './science/engine';
export { GENERAL_SIGNATURES, getGeneralSignature } from './general/engine';

import type { SageSubject } from '../types';
import type { SubjectConfig } from './types';
import { mathsConfig } from './maths';
import { englishConfig } from './english';
import { scienceConfig } from './science';
import { generalConfig } from './general';

// --- Subject Registry ---

export const SUBJECT_CONFIGS: Record<SageSubject, SubjectConfig> = {
  maths: mathsConfig,
  english: englishConfig,
  science: scienceConfig,
  general: generalConfig,
};

export function getSubjectConfig(subject: SageSubject): SubjectConfig {
  return SUBJECT_CONFIGS[subject] || generalConfig;
}

export function getAllSubjects(): SubjectConfig[] {
  return Object.values(SUBJECT_CONFIGS);
}
