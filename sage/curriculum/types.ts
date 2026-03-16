/**
 * Curriculum Taxonomy Types
 *
 * Structured curriculum data aligned to exam board specifications:
 * - AQA, Edexcel, OCR, WJEC, CCEA (UK)
 * - SQA (Scottish Qualifications Authority)
 * - CIE (Cambridge International Examinations)
 * - IBO (International Baccalaureate)
 * - College Board (AP)
 *
 * Supports UK Primary (KS1-KS2), KS3, GCSE Foundation/Higher, A-Level,
 * SQA National 5/Higher, IB SL/HL, and AP across 15+ subjects.
 *
 * @module sage/curriculum/types
 */

/**
 * Exam Boards — UK + International
 */
export type ExamBoard =
  | 'AQA' | 'Edexcel' | 'OCR' | 'WJEC' | 'CCEA'  // UK GCSE/A-Level
  | 'SQA'                                            // Scottish
  | 'CIE'                                            // Cambridge International
  | 'IBO'                                            // International Baccalaureate
  | 'CollegeBoard';                                   // AP (USA)

/**
 * Curriculum Tier
 * GCSE: Foundation (Grades 1-5) / Higher (Grades 4-9)
 * Primary/KS3: Single tier
 * IB: SL (Standard Level) / HL (Higher Level)
 */
export type CurriculumTier = 'foundation' | 'higher' | 'both' | 'single' | 'sl' | 'hl';

/** @deprecated Use CurriculumTier instead */
export type GCSETier = CurriculumTier;

/**
 * Curriculum level — which key stage or qualification
 */
export type CurriculumLevel =
  | 'KS1' | 'KS2' | 'KS3' | 'GCSE' | 'A-Level'
  | 'IB' | 'AP'
  | 'SQA-N5' | 'SQA-Higher';

/**
 * Subject areas — fine-grained curriculum subjects
 */
export type CurriculumSubject =
  // Core UK subjects
  | 'maths'
  | 'english-language'
  | 'english-literature'
  | 'biology'
  | 'chemistry'
  | 'physics'
  | 'combined-science'
  | 'history'
  | 'geography'
  | 'computer-science'
  // Languages
  | 'french'
  | 'spanish'
  | 'german'
  | 'latin'
  | 'mandarin'
  // Social Sciences & Humanities
  | 'psychology'
  | 'sociology'
  | 'religious-education'
  | 'philosophy'
  // Business
  | 'business-studies'
  | 'economics'
  | 'accounting'
  // Creative & Practical
  | 'music'
  | 'art-design'
  | 'design-technology'
  | 'pe'
  | 'drama'
  // Primary-specific (combined subjects at KS1-KS2)
  | 'primary-maths'
  | 'primary-english'
  | 'primary-science'
  // IB subjects
  | 'ib-maths-aa'         // Analysis & Approaches
  | 'ib-maths-ai'         // Applications & Interpretation
  | 'ib-english-langlit'  // Language & Literature
  | 'ib-english-lit'      // Literature
  | 'ib-biology'
  | 'ib-chemistry'
  | 'ib-physics'
  | 'ib-tok'              // Theory of Knowledge
  // AP subjects
  | 'ap-calculus-ab'
  | 'ap-calculus-bc'
  | 'ap-statistics'
  | 'ap-english-lang'
  | 'ap-english-lit'
  | 'ap-biology'
  | 'ap-chemistry'
  | 'ap-physics-1'
  | 'ap-physics-2'
  | 'ap-physics-c-mech'
  | 'ap-physics-c-em';

/**
 * Difficulty level across all curriculum levels
 *
 * Primary (KS1-KS2): Year bands
 * KS3: Developing / Secure / Extending
 * GCSE: Grade bands (1-2 through 9)
 * A-Level: AS / A2
 * SQA: National 5 / Higher
 * IB: SL / HL
 * AP: Intro / Core / Advanced
 */
export type DifficultyLevel =
  // Primary (KS1-KS2)
  | 'year-1-2' | 'year-3-4' | 'year-5-6'
  // KS3
  | 'ks3-developing' | 'ks3-secure' | 'ks3-extending'
  // GCSE
  | 'grade-1-2' | 'grade-3-4' | 'grade-5-6' | 'grade-7-8' | 'grade-9'
  // A-Level
  | 'a-level-as' | 'a-level-a2'
  // SQA
  | 'sqa-n5' | 'sqa-higher'
  // IB
  | 'ib-sl' | 'ib-hl'
  // AP
  | 'ap-intro' | 'ap-core' | 'ap-advanced';

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

  /** Curriculum tier (foundation/higher for GCSE, sl/hl for IB, single for Primary/KS3) */
  tier: CurriculumTier;

  /** Curriculum level (KS1, KS2, KS3, GCSE, A-Level, etc.) */
  level?: CurriculumLevel;

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
