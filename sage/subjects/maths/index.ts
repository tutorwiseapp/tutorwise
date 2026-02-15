/**
 * Maths Subject Module
 *
 * Domain logic for mathematics tutoring.
 */

export {
  GCSE_MATHS_TOPICS,
  gcseMathsTopicHierarchy,
  findTopic,
  getTopicsByCategory,
  getAllTopicIds,
} from './topics';

// DSPy Engine
export {
  MATHS_SIGNATURES,
  MATHS_PROBLEM_SOLVER,
  MATHS_HINT_GENERATOR,
  MATHS_ERROR_ANALYZER,
  MATHS_PRACTICE_GENERATOR,
  getMathsSignature,
} from './engine';

import type { SubjectConfig } from '../types';

export const mathsConfig: SubjectConfig = {
  subject: 'maths',
  displayName: 'Mathematics',
  description: 'Number, Algebra, Geometry, Statistics and Probability',
  levels: ['GCSE', 'A-Level', 'University'],
  examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC'],
  icon: '📐',
  color: '#3B82F6',  // Blue
};
