/**
 * English DSPy Engine
 *
 * Chain-of-Thought signatures for English tutoring.
 * Covers writing, reading comprehension, grammar, and literature.
 *
 * @module sage/subjects/english/engine
 */

import type { DSPySignature, DSPyExample } from '../maths/engine';

// --- Writing Feedback Signature ---

export const ENGLISH_WRITING_FEEDBACK: DSPySignature = {
  name: 'EnglishWritingFeedback',
  description: 'Provide constructive feedback on student writing with specific improvements',
  inputs: ['writing_sample', 'writing_type', 'level', 'focus_areas'],
  outputs: ['strengths', 'areas_for_improvement', 'specific_suggestions', 'revised_example'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        writing_sample: 'The man walked down the street. He was sad. It was raining.',
        writing_type: 'creative_writing',
        level: 'GCSE',
        focus_areas: 'descriptive language, sentence variety',
      },
      outputs: {
        strengths: 'Clear, simple sentences that convey the scene',
        areas_for_improvement: 'Sentence variety, show-not-tell, sensory details',
        specific_suggestions: 'Vary sentence length. Use descriptive verbs. Add sensory details.',
        revised_example: 'Rain hammered against the pavement as the man trudged down the empty street, shoulders hunched beneath the weight of his grief.',
      },
      reasoning: 'Student needs help with descriptive writing. Focus on show-not-tell technique.',
    },
  ],
};

// --- Reading Comprehension Signature ---

export const ENGLISH_COMPREHENSION: DSPySignature = {
  name: 'EnglishComprehension',
  description: 'Guide student through reading comprehension with evidence-based analysis',
  inputs: ['text_excerpt', 'question', 'level', 'question_type'],
  outputs: ['approach', 'key_evidence', 'model_answer', 'mark_scheme_points'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        text_excerpt: 'The fog crept through the streets like a living thing...',
        question: 'How does the writer create a sense of unease?',
        level: 'GCSE',
        question_type: 'language_analysis',
      },
      outputs: {
        approach: 'Identify language techniques, explain effects, use quotes as evidence',
        key_evidence: 'Personification of fog, verb "crept", simile "like a living thing"',
        model_answer: 'The writer creates unease through personification of the fog...',
        mark_scheme_points: 'Technique identification [1], effect explanation [2], quote integration [1]',
      },
      reasoning: 'GCSE AO2 question requiring language analysis with evidence.',
    },
  ],
};

// --- Grammar Correction Signature ---

export const ENGLISH_GRAMMAR_HELPER: DSPySignature = {
  name: 'EnglishGrammarHelper',
  description: 'Identify and explain grammar errors with clear rules',
  inputs: ['sentence', 'error_type', 'level'],
  outputs: ['errors_found', 'corrections', 'rule_explanation', 'practice_sentences'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        sentence: 'Me and him went to the shops.',
        error_type: 'any',
        level: 'GCSE',
      },
      outputs: {
        errors_found: 'Incorrect pronoun case (me/him as subjects)',
        corrections: 'He and I went to the shops.',
        rule_explanation: 'Use subject pronouns (I, he, she, we, they) as the subject of a verb. Test by removing the other person.',
        practice_sentences: '1. ___ went to the cinema. (I/Me)\n2. ___ and Sarah are friends. (He/Him)',
      },
      reasoning: 'Common pronoun case error. Provide memorable test strategy.',
    },
  ],
};

// --- Essay Structure Signature ---

export const ENGLISH_ESSAY_PLANNER: DSPySignature = {
  name: 'EnglishEssayPlanner',
  description: 'Help structure essays with clear paragraphs and argument flow',
  inputs: ['essay_question', 'text_studied', 'level', 'word_limit'],
  outputs: ['thesis_statement', 'paragraph_plan', 'key_quotes', 'conclusion_points'],
  chainOfThought: true,
};

// --- Literature Analysis Signature ---

export const ENGLISH_LIT_ANALYSIS: DSPySignature = {
  name: 'EnglishLiteratureAnalysis',
  description: 'Analyze literary texts with focus on themes, characters, and techniques',
  inputs: ['text_title', 'analysis_focus', 'extract', 'level'],
  outputs: ['key_themes', 'technique_analysis', 'context_links', 'exam_tips'],
  chainOfThought: true,
};

// --- Export All Signatures ---

export const ENGLISH_SIGNATURES: DSPySignature[] = [
  ENGLISH_WRITING_FEEDBACK,
  ENGLISH_COMPREHENSION,
  ENGLISH_GRAMMAR_HELPER,
  ENGLISH_ESSAY_PLANNER,
  ENGLISH_LIT_ANALYSIS,
];

/**
 * Get a signature by name
 */
export function getEnglishSignature(name: string): DSPySignature | undefined {
  return ENGLISH_SIGNATURES.find(s => s.name === name);
}

export default ENGLISH_SIGNATURES;
