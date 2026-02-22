/**
 * Curriculum Resolver
 *
 * Maps user queries to relevant curriculum topics and provides context-aware guidance.
 * Integrates with Sage's RAG system to inject curriculum-aligned knowledge.
 *
 * Features:
 * - Topic detection from user messages
 * - Prerequisite checking
 * - Difficulty assessment
 * - Related topic suggestions
 * - Learning path generation
 *
 * @module sage/curriculum/resolver
 */

import type { CurriculumTopic, DifficultyLevel, GCSETier, CurriculumSubject } from './types';
import { allTopics, getTopicById, getChildTopics, getTopicsBySubject } from './data/index';

export interface TopicMatch {
  /** Matched topic */
  topic: CurriculumTopic;
  /** Confidence score (0-1) */
  confidence: number;
  /** Keywords that triggered the match */
  matchedKeywords: string[];
}

export interface CurriculumContext {
  /** Primary topic(s) identified */
  topics: TopicMatch[];
  /** Prerequisites the student should know */
  prerequisites: CurriculumTopic[];
  /** Related topics for deeper learning */
  relatedTopics: CurriculumTopic[];
  /** Suggested difficulty level */
  suggestedDifficulty: DifficultyLevel;
  /** Suggested tier (foundation/higher) */
  suggestedTier: GCSETier;
  /** Learning objectives relevant to query */
  learningObjectives: string[];
  /** Common misconceptions to address */
  misconceptions: string[];
  /** Key vocabulary to introduce */
  vocabulary: string[];
}

/**
 * Detect curriculum topics from user message
 */
export function detectTopics(
  message: string,
  subject: CurriculumSubject = 'maths'
): TopicMatch[] {
  const lowerMessage = message.toLowerCase();
  const matches: TopicMatch[] = [];

  // Get relevant curriculum data based on subject
  // For 'science' generic, search across all science subjects
  let curriculumTopics: CurriculumTopic[];
  if (subject === 'combined-science') {
    curriculumTopics = [
      ...getTopicsBySubject('biology'),
      ...getTopicsBySubject('chemistry'),
      ...getTopicsBySubject('physics'),
    ];
  } else {
    curriculumTopics = getTopicsBySubject(subject);
  }

  for (const topic of curriculumTopics) {
    const matchedKeywords: string[] = [];
    let confidence = 0;

    // Check topic name
    const topicName = topic.name.toLowerCase();
    if (lowerMessage.includes(topicName)) {
      confidence += 0.5;
      matchedKeywords.push(topic.name);
    }

    // Check vocabulary terms
    if (topic.vocabulary) {
      for (const term of topic.vocabulary) {
        const termLower = term.toLowerCase();
        if (lowerMessage.includes(termLower)) {
          confidence += 0.2;
          matchedKeywords.push(term);
        }
      }
    }

    // Check learning objectives (partial match)
    for (const objective of topic.learningObjectives) {
      const objectiveLower = objective.toLowerCase();
      const keywords = extractKeywords(objectiveLower);
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          confidence += 0.1;
          matchedKeywords.push(keyword);
        }
      }
    }

    // If we found matches, add to results
    if (confidence > 0.3) { // Minimum threshold
      matches.push({
        topic,
        confidence: Math.min(confidence, 1.0),
        matchedKeywords: [...new Set(matchedKeywords)], // Remove duplicates
      });
    }
  }

  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);

  // Return top 3 matches
  return matches.slice(0, 3);
}

/**
 * Extract important keywords from text
 */
function extractKeywords(text: string): string[] {
  // Remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'shall',
  ]);

  return text
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .map(word => word.replace(/[^a-z0-9]/g, ''));
}

/**
 * Resolve full curriculum context for a user query
 */
export function resolveCurriculumContext(
  message: string,
  subject: CurriculumSubject = 'maths',
  userLevel?: 'foundation' | 'higher'
): CurriculumContext | null {
  const topicMatches = detectTopics(message, subject);

  if (topicMatches.length === 0) {
    return null; // No curriculum match found
  }

  const primaryTopic = topicMatches[0].topic;
  const allTopics = topicMatches.map(m => m.topic);

  // Collect prerequisites
  const prerequisites: CurriculumTopic[] = [];
  const prerequisiteIds = new Set<string>();

  for (const topic of allTopics) {
    for (const prereqId of topic.prerequisites) {
      if (!prerequisiteIds.has(prereqId)) {
        const prereq = getTopicById(prereqId);
        if (prereq) {
          prerequisites.push(prereq);
          prerequisiteIds.add(prereqId);
        }
      }
    }
  }

  // Collect related topics
  const relatedTopics: CurriculumTopic[] = [];
  const relatedIds = new Set<string>();

  for (const topic of allTopics) {
    // Add explicitly related topics
    if (topic.relatedTopics) {
      for (const relatedId of topic.relatedTopics) {
        if (!relatedIds.has(relatedId) && relatedId !== topic.id) {
          const related = getTopicById(relatedId);
          if (related) {
            relatedTopics.push(related);
            relatedIds.add(relatedId);
          }
        }
      }
    }

    // Add sibling topics (same parent)
    if (topic.parentId) {
      const siblings = getChildTopics(topic.parentId);
      for (const sibling of siblings) {
        if (!relatedIds.has(sibling.id) && sibling.id !== topic.id) {
          relatedTopics.push(sibling);
          relatedIds.add(sibling.id);
        }
      }
    }
  }

  // Determine suggested difficulty and tier
  const suggestedDifficulty = primaryTopic.difficulty;
  const suggestedTier = userLevel || (primaryTopic.tier === 'both' ? 'foundation' : primaryTopic.tier);

  // Collect learning objectives
  const learningObjectives = allTopics.flatMap(t => t.learningObjectives);

  // Collect misconceptions
  const misconceptions = allTopics.flatMap(t => t.misconceptions || []);

  // Collect vocabulary
  const vocabulary = allTopics.flatMap(t => t.vocabulary || []);

  return {
    topics: topicMatches,
    prerequisites,
    relatedTopics: relatedTopics.slice(0, 5), // Limit to 5 related topics
    suggestedDifficulty,
    suggestedTier,
    learningObjectives: [...new Set(learningObjectives)], // Remove duplicates
    misconceptions: [...new Set(misconceptions)],
    vocabulary: [...new Set(vocabulary)],
  };
}

/**
 * Format curriculum context for injection into Sage's RAG context
 */
export function formatCurriculumContext(context: CurriculumContext): string {
  const parts: string[] = [];

  parts.push('### CURRICULUM CONTEXT');
  parts.push('');

  // Primary topic(s)
  if (context.topics.length > 0) {
    parts.push('**Topic:** ' + context.topics[0].topic.name);
    parts.push('**Difficulty:** GCSE ' + context.suggestedTier + ' (' + context.suggestedDifficulty + ')');
    parts.push('**Exam Boards:** ' + context.topics[0].topic.examBoards.join(', '));
    parts.push('');
  }

  // Learning objectives
  if (context.learningObjectives.length > 0) {
    parts.push('**Learning Objectives:**');
    context.learningObjectives.slice(0, 3).forEach(obj => {
      parts.push('- ' + obj);
    });
    parts.push('');
  }

  // Prerequisites
  if (context.prerequisites.length > 0) {
    parts.push('**Prerequisites Students Should Know:**');
    context.prerequisites.forEach(prereq => {
      parts.push('- ' + prereq.name);
    });
    parts.push('');
  }

  // Common misconceptions
  if (context.misconceptions.length > 0) {
    parts.push('**Common Misconceptions to Address:**');
    context.misconceptions.slice(0, 3).forEach(misc => {
      parts.push('- ' + misc);
    });
    parts.push('');
  }

  // Key vocabulary
  if (context.vocabulary.length > 0) {
    parts.push('**Key Vocabulary:** ' + context.vocabulary.slice(0, 8).join(', '));
    parts.push('');
  }

  // Related topics (for follow-up suggestions)
  if (context.relatedTopics.length > 0) {
    parts.push('**Related Topics for Follow-up:**');
    context.relatedTopics.slice(0, 3).forEach(topic => {
      parts.push('- ' + topic.name);
    });
    parts.push('');
  }

  return parts.join('\n');
}

/**
 * Get topic hierarchy path (breadcrumb trail)
 * Example: Maths > Number > Fractions
 */
export function getTopicPath(topicId: string): string[] {
  const path: string[] = [];
  let currentTopic = getTopicById(topicId);

  while (currentTopic) {
    path.unshift(currentTopic.name);
    if (currentTopic.parentId) {
      currentTopic = getTopicById(currentTopic.parentId);
    } else {
      break;
    }
  }

  return path;
}

/**
 * Check if a topic is appropriate for a given difficulty level
 */
export function isTopicAppropriate(
  topic: CurriculumTopic,
  userTier: 'foundation' | 'higher',
  userGrade?: number
): boolean {
  // Check tier compatibility
  if (topic.tier === 'foundation' && userTier === 'higher') {
    return true; // Higher tier can access foundation content
  }
  if (topic.tier === 'higher' && userTier === 'foundation') {
    return false; // Foundation tier cannot access higher-only content
  }

  // Check grade level if provided
  if (userGrade !== undefined) {
    const topicGradeMin = parseInt(topic.difficulty.split('-')[1]);
    const topicGradeMax = parseInt(topic.difficulty.split('-')[2] || topic.difficulty.split('-')[1]);

    return userGrade >= topicGradeMin - 1; // Allow one grade below
  }

  return true;
}
