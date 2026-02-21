/**
 * Adaptive Practice Generator
 *
 * Generates personalized practice problems based on student weaknesses and gaps.
 * Implements spaced repetition for optimal learning retention.
 *
 * Inspired by StarSpark's gap detection and Khan Academy's mastery learning.
 *
 * Features:
 * - Gap detection (identify weak topics)
 * - Difficulty adaptation (adjust based on performance)
 * - Spaced repetition (optimal review timing)
 * - Mixed practice (interleave topics)
 *
 * @module sage/teaching/adaptive-practice
 */

import type { CurriculumTopic, DifficultyLevel } from '../curriculum/types';

/**
 * Student performance on a topic
 */
export interface TopicPerformance {
  /** Topic ID */
  topicId: string;

  /** Topic name */
  topicName: string;

  /** Questions attempted */
  attempted: number;

  /** Questions answered correctly */
  correct: number;

  /** Accuracy rate (0-1) */
  accuracy: number;

  /** Last practiced timestamp */
  lastPracticed?: Date;

  /** Current mastery level (0-1) */
  mastery: number;

  /** Confidence interval (0-1) */
  confidence: number;

  /** Trend: improving, declining, or stable */
  trend: 'improving' | 'declining' | 'stable';
}

/**
 * Detected knowledge gap
 */
export interface KnowledgeGap {
  /** Topic with the gap */
  topic: CurriculumTopic;

  /** Severity (0-1, 1=critical gap) */
  severity: number;

  /** Evidence of gap */
  evidence: string[];

  /** Recommended next steps */
  recommendations: string[];

  /** Priority for practice (0-1, 1=highest) */
  priority: number;
}

/**
 * Practice problem
 */
export interface PracticeProblem {
  /** Problem ID */
  id: string;

  /** Topic this problem covers */
  topicId: string;

  /** Difficulty level */
  difficulty: DifficultyLevel;

  /** Problem statement */
  question: string;

  /** Correct answer */
  answer: string;

  /** Step-by-step solution */
  solution?: string[];

  /** Hints (progressively more specific) */
  hints?: string[];

  /** Common mistakes to watch for */
  commonMistakes?: string[];

  /** Why this problem was selected */
  rationale?: string;
}

/**
 * Practice session recommendation
 */
export interface PracticeSession {
  /** Recommended problems */
  problems: PracticeProblem[];

  /** Session focus (what we're working on) */
  focus: string;

  /** Expected duration (minutes) */
  duration: number;

  /** Topics covered */
  topics: string[];

  /** Mix strategy (focused or interleaved) */
  strategy: 'focused' | 'interleaved';
}

/**
 * Spaced repetition schedule
 */
export interface SpacedRepetitionSchedule {
  /** Topic ID */
  topicId: string;

  /** Next review date */
  nextReview: Date;

  /** Review interval (days) */
  interval: number;

  /** Ease factor (how easy topic is, 1.3-2.5) */
  easeFactor: number;

  /** Number of successful reviews */
  successCount: number;
}

/**
 * Detect knowledge gaps from student performance
 */
export function detectGaps(performances: TopicPerformance[], curriculum: CurriculumTopic[]): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];

  for (const perf of performances) {
    // Gap detection criteria
    const hasLowAccuracy = perf.accuracy < 0.6;
    const hasLowMastery = perf.mastery < 0.5;
    const isDecl ining = perf.trend === 'declining';
    const hasEnoughAttempts = perf.attempted >= 3;

    if (hasEnoughAttempts && (hasLowAccuracy || hasLowMastery || isDecl ining)) {
      const topic = curriculum.find(t => t.id === perf.topicId);
      if (!topic) continue;

      // Calculate severity
      let severity = 0;
      if (hasLowAccuracy) severity += 0.4;
      if (hasLowMastery) severity += 0.3;
      if (isDecl ining) severity += 0.2;
      if (perf.accuracy < 0.4) severity += 0.1; // Very low accuracy

      // Build evidence
      const evidence: string[] = [];
      if (hasLowAccuracy) {
        evidence.push(`Low accuracy: ${(perf.accuracy * 100).toFixed(0)}% correct (${perf.correct}/${perf.attempted})`);
      }
      if (hasLowMastery) {
        evidence.push(`Mastery level: ${(perf.mastery * 100).toFixed(0)}%`);
      }
      if (isDecl ining) {
        evidence.push('Performance declining over recent attempts');
      }

      // Build recommendations
      const recommendations: string[] = [];

      // Check prerequisites
      if (topic.prerequisites.length > 0) {
        recommendations.push(`Review prerequisites: ${topic.prerequisites.join(', ')}`);
      }

      recommendations.push(`Practice more ${topic.name} problems at current difficulty`);

      if (perf.accuracy < 0.4) {
        recommendations.push('Consider easier problems or guided examples first');
      }

      // Priority based on severity and prerequisite importance
      const isPrerequisite = curriculum.some(t =>
        t.prerequisites.includes(topic.id)
      );
      const priority = severity * (isPrerequisite ? 1.2 : 1.0);

      gaps.push({
        topic,
        severity,
        evidence,
        recommendations,
        priority: Math.min(priority, 1.0),
      });
    }
  }

  // Sort by priority (highest first)
  gaps.sort((a, b) => b.priority - a.priority);

  return gaps;
}

/**
 * Generate adaptive practice session
 */
export function generatePracticeSession(
  gaps: KnowledgeGap[],
  performances: TopicPerformance[],
  maxProblems: number = 10,
  strategy: 'focused' | 'interleaved' = 'interleaved'
): PracticeSession {
  const problems: PracticeProblem[] = [];

  if (strategy === 'focused') {
    // Focus on highest priority gap
    if (gaps.length > 0) {
      const primaryGap = gaps[0];
      const perf = performances.find(p => p.topicId === primaryGap.topic.id);

      // Generate problems for this topic only
      for (let i = 0; i < maxProblems; i++) {
        problems.push(generateProblem(primaryGap.topic, perf));
      }

      return {
        problems,
        focus: `Focused practice on ${primaryGap.topic.name}`,
        duration: maxProblems * 3, // 3 minutes per problem
        topics: [primaryGap.topic.name],
        strategy: 'focused',
      };
    }
  } else {
    // Interleaved: Mix problems from multiple gaps
    const topGaps = gaps.slice(0, 3); // Top 3 gaps
    const problemsPerGap = Math.floor(maxProblems / topGaps.length);

    for (const gap of topGaps) {
      const perf = performances.find(p => p.topicId === gap.topic.id);
      for (let i = 0; i < problemsPerGap; i++) {
        problems.push(generateProblem(gap.topic, perf));
      }
    }

    // Shuffle for interleaving
    shuffleArray(problems);

    return {
      problems,
      focus: 'Mixed practice covering multiple weak areas',
      duration: maxProblems * 3,
      topics: topGaps.map(g => g.topic.name),
      strategy: 'interleaved',
    };
  }

  // Fallback: general practice
  return {
    problems: [],
    focus: 'General practice',
    duration: 0,
    topics: [],
    strategy: 'interleaved',
  };
}

/**
 * Generate a practice problem for a topic
 */
function generateProblem(topic: CurriculumTopic, performance?: TopicPerformance): PracticeProblem {
  // Adjust difficulty based on performance
  let difficulty: DifficultyLevel = topic.difficulty;

  if (performance) {
    if (performance.accuracy < 0.4) {
      // Very struggling: easier problems
      difficulty = 'grade-1-2';
    } else if (performance.accuracy > 0.8 && performance.mastery > 0.7) {
      // Doing well: harder problems
      difficulty = 'grade-7-8';
    }
  }

  // Generate problem (templates based on topic)
  // In production, this would use problem banks or AI generation

  const problemTemplates = getProblemTemplates(topic.id);
  const template = problemTemplates[Math.floor(Math.random() * problemTemplates.length)];

  return {
    id: `prob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    topicId: topic.id,
    difficulty,
    question: template.question,
    answer: template.answer,
    solution: template.solution,
    hints: template.hints,
    commonMistakes: topic.misconceptions,
    rationale: performance
      ? `Targeting weak area: ${(performance.accuracy * 100).toFixed(0)}% accuracy`
      : 'Practice problem',
  };
}

/**
 * Get problem templates for a topic
 * In production, this would query a problem bank
 */
function getProblemTemplates(topicId: string): Array<{
  question: string;
  answer: string;
  solution?: string[];
  hints?: string[];
}> {
  // Mock templates for BIDMAS
  if (topicId === 'maths-number-four-operations') {
    return [
      {
        question: 'Calculate: 20 + 5 × 3',
        answer: '35',
        solution: [
          'Following BIDMAS, multiply first: 5 × 3 = 15',
          'Then add: 20 + 15 = 35',
        ],
        hints: [
          'Remember BIDMAS: Brackets, Indices, Division/Multiplication, Addition/Subtraction',
          'Which operation should you do first?',
        ],
      },
      {
        question: 'Calculate: 48 ÷ 6 + 2',
        answer: '10',
        solution: [
          'Division comes before addition in BIDMAS',
          'First: 48 ÷ 6 = 8',
          'Then: 8 + 2 = 10',
        ],
        hints: [
          'Check the order of operations',
          'Division before addition',
        ],
      },
      {
        question: 'Calculate: (12 - 4) × 2',
        answer: '16',
        solution: [
          'Brackets first: 12 - 4 = 8',
          'Then multiply: 8 × 2 = 16',
        ],
        hints: [
          'What do brackets tell you?',
          'Do operations inside brackets first',
        ],
      },
    ];
  }

  // Default generic template
  return [
    {
      question: `Practice problem for ${topicId}`,
      answer: 'Answer',
      solution: ['Step 1', 'Step 2'],
    },
  ];
}

/**
 * Calculate next review date using spaced repetition (SM-2 algorithm)
 */
export function calculateNextReview(
  schedule: SpacedRepetitionSchedule,
  quality: number // 0-5 (0=total blackout, 5=perfect)
): SpacedRepetitionSchedule {
  const { interval, easeFactor, successCount } = schedule;

  // Update ease factor
  const newEaseFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // Calculate new interval
  let newInterval: number;
  if (quality < 3) {
    // Failed: reset to 1 day
    newInterval = 1;
  } else if (successCount === 0) {
    // First success: 1 day
    newInterval = 1;
  } else if (successCount === 1) {
    // Second success: 6 days
    newInterval = 6;
  } else {
    // Subsequent: multiply by ease factor
    newInterval = Math.round(interval * newEaseFactor);
  }

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + newInterval);

  return {
    topicId: schedule.topicId,
    nextReview,
    interval: newInterval,
    easeFactor: newEaseFactor,
    successCount: quality >= 3 ? successCount + 1 : 0,
  };
}

/**
 * Get topics due for review today
 */
export function getTopicsDueToday(schedules: SpacedRepetitionSchedule[]): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return schedules
    .filter(s => s.nextReview <= today)
    .map(s => s.topicId);
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Format gap report for logging
 */
export function formatGapReport(gaps: KnowledgeGap[]): string {
  if (gaps.length === 0) {
    return 'No significant knowledge gaps detected';
  }

  const lines = [`Detected ${gaps.length} knowledge gap(s):`];

  for (const gap of gaps.slice(0, 3)) {
    lines.push(`\n${gap.topic.name} (severity: ${(gap.severity * 100).toFixed(0)}%)`);
    lines.push(`  Evidence: ${gap.evidence[0]}`);
    lines.push(`  Recommendation: ${gap.recommendations[0]}`);
  }

  return lines.join('\n');
}
