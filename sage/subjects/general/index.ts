/**
 * General Subject Module
 *
 * Fallback domain logic for general tutoring and study skills.
 */

import type { SubjectConfig } from '../types';

// DSPy Engine
export {
  GENERAL_SIGNATURES,
  GENERAL_STUDY_STRATEGY,
  GENERAL_EXAM_TECHNIQUE,
  GENERAL_NOTE_TAKING,
  GENERAL_QUESTION_INTERPRETER,
  GENERAL_MOTIVATION_HELPER,
  getGeneralSignature,
} from './engine';

export const generalConfig: SubjectConfig = {
  subject: 'general',
  displayName: 'General',
  description: 'Study skills, revision techniques, and cross-curricular support',
  levels: ['GCSE', 'A-Level', 'University', 'Other'],
  examBoards: [],
  icon: '📖',
  color: '#6B7280',  // Gray
};

// --- Study Skills Topics ---

export const STUDY_SKILLS_TOPICS = [
  {
    id: 'revision',
    name: 'Revision Techniques',
    skills: [
      'active recall',
      'spaced repetition',
      'mind mapping',
      'summarisation',
      'practice questions',
    ],
  },
  {
    id: 'time-management',
    name: 'Time Management',
    skills: [
      'creating revision timetables',
      'prioritisation',
      'avoiding procrastination',
      'pomodoro technique',
    ],
  },
  {
    id: 'exam-technique',
    name: 'Exam Technique',
    skills: [
      'time allocation',
      'question analysis',
      'answer structure',
      'checking work',
    ],
  },
  {
    id: 'note-taking',
    name: 'Note Taking',
    skills: [
      'Cornell method',
      'bullet journaling',
      'visual notes',
      'digital note-taking',
    ],
  },
];
