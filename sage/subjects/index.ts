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

// --- Expanded Subject Configs (fall through to general engine until dedicated engines are built) ---

const computingConfig: SubjectConfig = {
  subject: 'computing',
  displayName: 'Computing',
  description: 'Computer Science, programming, and digital literacy',
  levels: ['KS3', 'GCSE', 'A-Level'],
  examBoards: ['AQA', 'OCR', 'Edexcel', 'WJEC', 'CCEA'],
};

const humanitiesConfig: SubjectConfig = {
  subject: 'humanities',
  displayName: 'Humanities',
  description: 'History, Geography, and related humanities subjects',
  levels: ['KS3', 'GCSE', 'A-Level'],
  examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
};

const languagesConfig: SubjectConfig = {
  subject: 'languages',
  displayName: 'Languages',
  description: 'French, Spanish, German, and other modern foreign languages',
  levels: ['KS3', 'GCSE', 'A-Level'],
  examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
};

const socialSciencesConfig: SubjectConfig = {
  subject: 'social-sciences',
  displayName: 'Social Sciences',
  description: 'Psychology, Sociology, and Religious Education',
  levels: ['GCSE', 'A-Level'],
  examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
};

const businessConfig: SubjectConfig = {
  subject: 'business',
  displayName: 'Business & Economics',
  description: 'Business Studies, Economics, and Accounting',
  levels: ['GCSE', 'A-Level'],
  examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
};

const artsConfig: SubjectConfig = {
  subject: 'arts',
  displayName: 'Arts & Creative',
  description: 'Music, Art & Design, Design & Technology, PE, and Drama',
  levels: ['KS3', 'GCSE', 'A-Level'],
  examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC', 'CCEA'],
};

// --- Subject Registry ---

export const SUBJECT_CONFIGS: Record<SageSubject, SubjectConfig> = {
  maths: mathsConfig,
  english: englishConfig,
  science: scienceConfig,
  computing: computingConfig,
  humanities: humanitiesConfig,
  languages: languagesConfig,
  'social-sciences': socialSciencesConfig,
  business: businessConfig,
  arts: artsConfig,
  general: generalConfig,
};

export function getSubjectConfig(subject: SageSubject): SubjectConfig {
  return SUBJECT_CONFIGS[subject] || generalConfig;
}

export function getAllSubjects(): SubjectConfig[] {
  return Object.values(SUBJECT_CONFIGS);
}
