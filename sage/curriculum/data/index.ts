/**
 * Curriculum Data Index
 *
 * Centralized export for all curriculum data across subjects and levels.
 * Provides unified access to UK Primary through A-Level, IB, AP, SQA, and CIE topics.
 *
 * @module sage/curriculum/data
 */

import type { CurriculumTopic } from '../types';
import { mathsTopics } from './maths';
import { scienceTopics } from './science';
import { humanitiesTopics } from './humanities';
import { ibTopics } from './ib';
import { apTopics } from './ap';
import { englishTopics } from './english';
import { computingTopics } from './computing';
import { aLevelMathsTopics } from './a-level-maths';
import { aLevelScienceTopics } from './a-level-sciences';
import { primaryTopics } from './primary';
import { sqaTopics } from './sqa';
import { cieTopics } from './cie';
import { socialSciencesTopics } from './social-sciences';
import { languagesTopics } from './languages';
import { businessEconomicsTopics } from './business-economics';
import { creativePracticalTopics } from './creative-practical';
import { ks3MathsTopics } from './ks3-maths';
import { ks3ScienceTopics } from './ks3-science';
import { ks3EnglishTopics } from './ks3-english';
import { ks3HumanitiesTopics } from './ks3-humanities';
import { aLevelHumanitiesTopics } from './a-level-humanities';
import { aLevelOtherTopics } from './a-level-other';

/**
 * All curriculum topics across all subjects and levels
 */
export const allTopics: CurriculumTopic[] = [
  // GCSE core
  ...mathsTopics,
  ...scienceTopics,
  ...humanitiesTopics,
  ...englishTopics,
  ...computingTopics,
  // GCSE expanded
  ...socialSciencesTopics,
  ...languagesTopics,
  ...businessEconomicsTopics,
  ...creativePracticalTopics,
  // Primary (KS1-KS2)
  ...primaryTopics,
  // KS3
  ...ks3MathsTopics,
  ...ks3ScienceTopics,
  ...ks3EnglishTopics,
  ...ks3HumanitiesTopics,
  // A-Level
  ...aLevelMathsTopics,
  ...aLevelScienceTopics,
  ...aLevelHumanitiesTopics,
  ...aLevelOtherTopics,
  // International
  ...ibTopics,
  ...apTopics,
  ...sqaTopics,
  ...cieTopics,
];

/**
 * Get all topics for a specific subject
 */
export function getTopicsBySubject(subject: string): CurriculumTopic[] {
  return allTopics.filter(t => t.subject === subject);
}

/**
 * Get a topic by ID (across all subjects)
 */
export function getTopicById(id: string): CurriculumTopic | undefined {
  return allTopics.find(t => t.id === id);
}

/**
 * Get all child topics of a parent topic (across all subjects)
 */
export function getChildTopics(parentId: string): CurriculumTopic[] {
  return allTopics.filter(t => t.parentId === parentId);
}

/**
 * Get all top-level topics (main subject areas)
 */
export function getTopLevelTopics(): CurriculumTopic[] {
  return allTopics.filter(t => t.parentId === null);
}

/**
 * Get all topics for a specific curriculum level (KS1, KS2, KS3, GCSE, A-Level, etc.)
 */
export function getTopicsByLevel(level: string): CurriculumTopic[] {
  return allTopics.filter(t => t.level === level);
}

/**
 * Search topics by keyword
 */
export function searchTopics(query: string): CurriculumTopic[] {
  const lowerQuery = query.toLowerCase();
  return allTopics.filter(topic =>
    topic.name.toLowerCase().includes(lowerQuery) ||
    topic.description.toLowerCase().includes(lowerQuery) ||
    topic.vocabulary?.some(v => v.toLowerCase().includes(lowerQuery)) ||
    topic.learningObjectives.some(obj => obj.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Export individual curriculum datasets
 */
export { mathsTopics } from './maths';
export { scienceTopics } from './science';
export { humanitiesTopics } from './humanities';
export { ibTopics } from './ib';
export { apTopics } from './ap';
export { englishTopics } from './english';
export { computingTopics } from './computing';
export { aLevelMathsTopics } from './a-level-maths';
export { aLevelScienceTopics } from './a-level-sciences';
export { primaryTopics } from './primary';
export { sqaTopics } from './sqa';
export { cieTopics } from './cie';
export { socialSciencesTopics } from './social-sciences';
export { languagesTopics } from './languages';
export { businessEconomicsTopics } from './business-economics';
export { creativePracticalTopics } from './creative-practical';
export { ks3MathsTopics } from './ks3-maths';
export { ks3ScienceTopics } from './ks3-science';
export { ks3EnglishTopics } from './ks3-english';
export { ks3HumanitiesTopics } from './ks3-humanities';
export { aLevelHumanitiesTopics } from './a-level-humanities';
export { aLevelOtherTopics } from './a-level-other';
