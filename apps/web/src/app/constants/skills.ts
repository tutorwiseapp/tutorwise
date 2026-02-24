/**
 * Filename: constants/skills.ts
 * Purpose: Predefined skills for AI tutors
 * Created: 2026-02-24
 * Version: v1.0
 *
 * These are common skills that can be selected without creating custom skills.
 * Tutors can also create custom skills for specific topics.
 */

export const PREDEFINED_SKILLS = [
  // Academic Levels
  'GCSE',
  'A-Level',
  'IB',
  'University',
  'KS1',
  'KS2',
  'KS3',
  'KS4',

  // Core Subjects
  'Maths',
  'English',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
  'Computing',
  'Computer Science',

  // Languages
  'Spanish',
  'French',
  'German',
  'Mandarin',
  'Latin',

  // Humanities
  'History',
  'Geography',
  'Religious Studies',
  'Philosophy',

  // Business & Economics
  'Economics',
  'Business Studies',
  'Accounting',

  // Social Sciences
  'Psychology',
  'Sociology',

  // Exam Boards
  'AQA',
  'Edexcel',
  'OCR',
  'WJEC',
  'SQA',

  // Skills
  'Exam Preparation',
  'Homework Help',
  'Essay Writing',
  'Coursework Support',
  'Revision Techniques',
  'Study Skills',
  'Time Management',
  'Critical Thinking',
  'Problem Solving',

  // Specializations
  'Special Educational Needs',
  'Dyslexia Support',
  'Gifted and Talented',
  'English as Additional Language',
  'Adult Learning',
  'Homeschooling',
];

// Group skills for better UX
export const SKILL_GROUPS = {
  'Academic Levels': [
    'GCSE',
    'A-Level',
    'IB',
    'University',
    'KS1',
    'KS2',
    'KS3',
    'KS4',
  ],
  'Core Subjects': [
    'Maths',
    'English',
    'Science',
    'Physics',
    'Chemistry',
    'Biology',
    'Computing',
    'Computer Science',
  ],
  'Languages': ['Spanish', 'French', 'German', 'Mandarin', 'Latin'],
  'Humanities': ['History', 'Geography', 'Religious Studies', 'Philosophy'],
  'Business & Economics': ['Economics', 'Business Studies', 'Accounting'],
  'Social Sciences': ['Psychology', 'Sociology'],
  'Exam Boards': ['AQA', 'Edexcel', 'OCR', 'WJEC', 'SQA'],
  'Skills': [
    'Exam Preparation',
    'Homework Help',
    'Essay Writing',
    'Coursework Support',
    'Revision Techniques',
    'Study Skills',
    'Time Management',
    'Critical Thinking',
    'Problem Solving',
  ],
  'Specializations': [
    'Special Educational Needs',
    'Dyslexia Support',
    'Gifted and Talented',
    'English as Additional Language',
    'Adult Learning',
    'Homeschooling',
  ],
};
