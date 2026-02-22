/**
 * Curriculum Data Index
 *
 * Centralized export for all curriculum data across subjects.
 * Provides unified access to Maths, Science, and Humanities topics.
 *
 * @module sage/curriculum/data
 */

import type { CurriculumTopic } from '../types';
import { mathsTopics } from './maths';
import { scienceTopics } from './science';
import { humanitiesTopics } from './humanities';

/**
 * All curriculum topics across all subjects
 */
export const allTopics: CurriculumTopic[] = [
  ...mathsTopics,
  ...scienceTopics,
  ...humanitiesTopics,
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
