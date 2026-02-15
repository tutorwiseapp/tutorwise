/**
 * English Subject Module
 *
 * Domain logic for English Language and Literature tutoring.
 */

import type { SubjectConfig, TopicCategory } from '../types';

// DSPy Engine
export {
  ENGLISH_SIGNATURES,
  ENGLISH_WRITING_FEEDBACK,
  ENGLISH_COMPREHENSION,
  ENGLISH_GRAMMAR_HELPER,
  ENGLISH_ESSAY_PLANNER,
  ENGLISH_LIT_ANALYSIS,
  getEnglishSignature,
} from './engine';

export const englishConfig: SubjectConfig = {
  subject: 'english',
  displayName: 'English',
  description: 'Language, Literature, Writing and Communication',
  levels: ['GCSE', 'A-Level', 'University'],
  examBoards: ['AQA', 'Edexcel', 'OCR', 'WJEC'],
  icon: '📚',
  color: '#8B5CF6',  // Purple
};

// --- GCSE English Topics (Placeholder) ---

export const GCSE_ENGLISH_TOPICS: TopicCategory[] = [
  {
    id: 'language',
    name: 'English Language',
    topics: [
      {
        id: 'reading',
        name: 'Reading Skills',
        skills: ['inference', 'analysis', 'evaluation', 'comparison'],
        keyTerms: ['explicit', 'implicit', 'inference', 'connotation'],
      },
      {
        id: 'writing',
        name: 'Writing Skills',
        skills: ['descriptive writing', 'narrative writing', 'persuasive writing', 'transactional writing'],
        keyTerms: ['register', 'tone', 'audience', 'purpose'],
      },
      {
        id: 'grammar',
        name: 'Grammar and Punctuation',
        skills: ['sentence structure', 'punctuation', 'spelling', 'vocabulary'],
        keyTerms: ['clause', 'phrase', 'syntax', 'semantics'],
      },
    ],
  },
  {
    id: 'literature',
    name: 'English Literature',
    topics: [
      {
        id: 'poetry',
        name: 'Poetry',
        skills: ['analysis', 'comparison', 'context', 'language techniques'],
        keyTerms: ['metaphor', 'simile', 'imagery', 'rhythm', 'rhyme', 'enjambment'],
      },
      {
        id: 'prose',
        name: 'Prose (Novels)',
        skills: ['character analysis', 'theme analysis', 'context', 'narrative voice'],
        keyTerms: ['protagonist', 'antagonist', 'narrative', 'plot', 'setting'],
      },
      {
        id: 'drama',
        name: 'Drama',
        skills: ['stagecraft', 'character analysis', 'dramatic irony', 'context'],
        keyTerms: ['soliloquy', 'aside', 'dramatic irony', 'tension'],
      },
    ],
  },
];
