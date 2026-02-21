/**
 * GCSE Curriculum Taxonomy Types
 *
 * Structured curriculum data aligned to UK exam board specifications:
 * - AQA (Assessment and Qualifications Alliance)
 * - Edexcel (Pearson)
 * - OCR (Oxford, Cambridge and RSA)
 *
 * Supports GCSE Foundation and Higher tiers across core subjects.
 *
 * @module sage/curriculum/types
 */

/**
 * UK Exam Boards
 */
export type ExamBoard = 'AQA' | 'Edexcel' | 'OCR' | 'WJEC' | 'CCEA';

/**
 * GCSE Tiers
 */
export type GCSETier = 'foundation' | 'higher' | 'both';

/**
 * Subject areas (aligns with SageSubject but more specific)
 */
export type CurriculumSubject =
  | 'maths'
  | 'english-language'
  | 'english-literature'
  | 'biology'
  | 'chemistry'
  | 'physics'
  | 'combined-science'
  | 'history'
  | 'geography'
  | 'computer-science';

/**
 * Difficulty level based on GCSE grading
 * Foundation: Grades 1-5
 * Higher: Grades 4-9
 */
export type DifficultyLevel = 'grade-1-2' | 'grade-3-4' | 'grade-5-6' | 'grade-7-8' | 'grade-9';

/**
 * Topic taxonomy - hierarchical structure
 * Example: Number → Fractions → Adding Fractions with Different Denominators
 */
export interface CurriculumTopic {
  /** Unique identifier (e.g., "maths-number-fractions-001") */
  id: string;

  /** Display name */
  name: string;

  /** Short description */
  description: string;

  /** Parent topic ID (null for top-level topics) */
  parentId: string | null;

  /** Subject area */
  subject: CurriculumSubject;

  /** Exam boards that include this topic */
  examBoards: ExamBoard[];

  /** GCSE tier(s) this topic appears in */
  tier: GCSETier;

  /** Difficulty level */
  difficulty: DifficultyLevel;

  /** Learning objectives (what students should be able to do) */
  learningObjectives: string[];

  /** Prerequisites (topic IDs that should be mastered first) */
  prerequisites: string[];

  /** Common misconceptions */
  misconceptions?: string[];

  /** Key vocabulary terms */
  vocabulary?: string[];

  /** Related topics (topic IDs) */
  relatedTopics?: string[];

  /** Metadata */
  metadata?: {
    /** Approximate teaching hours */
    teachingHours?: number;
    /** Exam weighting (percentage) */
    examWeight?: number;
    /** National curriculum reference */
    ncReference?: string;
  };
}

/**
 * Topic with resolved children (for hierarchical navigation)
 */
export interface CurriculumTopicTree extends CurriculumTopic {
  children: CurriculumTopicTree[];
}

/**
 * Learning resource linked to a topic
 */
export interface CurriculumResource {
  id: string;
  topicId: string;
  type: 'video' | 'worksheet' | 'quiz' | 'article' | 'interactive' | 'past-paper';
  title: string;
  description: string;
  url?: string;
  source: 'internal' | 'bbc-bitesize' | 'seneca' | 'mathsgenie' | 'other';
  difficulty: DifficultyLevel;
  examBoard?: ExamBoard;
}

/**
 * Assessment question metadata
 */
export interface AssessmentQuestion {
  id: string;
  topicId: string;
  question: string;
  answer: string;
  explanation?: string;
  difficulty: DifficultyLevel;
  examBoard?: ExamBoard;
  marks?: number;
  year?: number;
}

/**
 * Student progress on a topic
 */
export interface TopicProgress {
  userId: string;
  topicId: string;
  status: 'not-started' | 'in-progress' | 'mastered';
  confidenceLevel: 1 | 2 | 3 | 4 | 5; // 1 = struggling, 5 = confident
  lastPracticed?: Date;
  questionsAttempted: number;
  questionsCorrect: number;
  strengthAreas: string[];
  weaknessAreas: string[];
}
