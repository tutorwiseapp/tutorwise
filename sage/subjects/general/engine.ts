/**
 * General DSPy Engine
 *
 * Chain-of-Thought signatures for general tutoring and study skills.
 * Covers cross-subject skills, revision strategies, and exam technique.
 *
 * @module sage/subjects/general/engine
 */

import type { DSPySignature, DSPyExample } from '../maths/engine';

// --- Study Strategy Signature ---

export const GENERAL_STUDY_STRATEGY: DSPySignature = {
  name: 'GeneralStudyStrategy',
  description: 'Create personalized study plans and revision strategies',
  inputs: ['subjects', 'time_available', 'exam_date', 'learning_style', 'weak_areas'],
  outputs: ['study_plan', 'priority_topics', 'revision_techniques', 'schedule_tips'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        subjects: 'Maths, English, Science',
        time_available: '2 hours per day',
        exam_date: '4 weeks away',
        learning_style: 'visual',
        weak_areas: 'algebra, essay writing',
      },
      outputs: {
        study_plan: 'Week 1-2: Focus on weak areas (algebra daily, essay practice 3x week)\nWeek 3: Mixed revision with past papers\nWeek 4: Timed practice and review',
        priority_topics: '1. Algebra (highest priority)\n2. Essay structure\n3. Science practicals',
        revision_techniques: 'Use mind maps for concepts, color-coded notes, draw diagrams for processes',
        schedule_tips: 'Split 2 hours: 45min focused study, 10min break, 45min different subject, 10min review',
      },
      reasoning: 'Visual learner with specific weak areas. Prioritize early, use visual techniques.',
    },
  ],
};

// --- Exam Technique Signature ---

export const GENERAL_EXAM_TECHNIQUE: DSPySignature = {
  name: 'GeneralExamTechnique',
  description: 'Teach exam skills including time management and question interpretation',
  inputs: ['exam_type', 'subject', 'level', 'specific_concern'],
  outputs: ['time_allocation', 'approach_strategy', 'command_words', 'common_mistakes'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        exam_type: 'written_paper',
        subject: 'any',
        level: 'GCSE',
        specific_concern: 'running out of time',
      },
      outputs: {
        time_allocation: 'Roughly 1 minute per mark. For a 90-minute, 80-mark paper: ~1.1 mins/mark. Check paper length first.',
        approach_strategy: '1. Skim all questions first (2 mins)\n2. Answer confident questions first\n3. Leave harder ones, return with remaining time\n4. Never leave blanks',
        command_words: 'Describe = say what happens | Explain = say why | Evaluate = weigh up both sides | Calculate = show working',
        common_mistakes: 'Spending too long on low-mark questions, not reading the question fully, leaving blanks',
      },
      reasoning: 'Address time concern directly with practical strategies.',
    },
  ],
};

// --- Note-Taking Helper Signature ---

export const GENERAL_NOTE_TAKING: DSPySignature = {
  name: 'GeneralNoteTaking',
  description: 'Transform content into effective revision notes',
  inputs: ['content', 'subject', 'note_style', 'purpose'],
  outputs: ['formatted_notes', 'key_points', 'memory_triggers', 'review_questions'],
  chainOfThought: true,
};

// --- Question Interpreter Signature ---

export const GENERAL_QUESTION_INTERPRETER: DSPySignature = {
  name: 'GeneralQuestionInterpreter',
  description: 'Break down exam questions to identify what is being asked',
  inputs: ['question_text', 'subject', 'marks_available', 'level'],
  outputs: ['command_word_analysis', 'topic_required', 'expected_points', 'answer_structure'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        question_text: 'Evaluate the view that social media has a negative impact on teenagers.',
        subject: 'english',
        marks_available: '15',
        level: 'GCSE',
      },
      outputs: {
        command_word_analysis: 'EVALUATE = consider multiple viewpoints, weigh evidence, reach a conclusion',
        topic_required: 'Social media effects on teenagers - both positive and negative impacts',
        expected_points: '15 marks suggests 5-6 developed points with evidence and evaluation',
        answer_structure: 'Introduction (stance) -> Argument for -> Counter-argument -> Another point for -> Another counter -> Conclusion (balanced judgement)',
      },
      reasoning: 'High-mark evaluative question. Must show both sides and reach reasoned conclusion.',
    },
  ],
};

// --- Motivation and Confidence Signature ---

export const GENERAL_MOTIVATION_HELPER: DSPySignature = {
  name: 'GeneralMotivationHelper',
  description: 'Provide encouragement and help overcome learning blocks',
  inputs: ['current_feeling', 'specific_challenge', 'past_successes', 'goal'],
  outputs: ['acknowledgement', 'perspective_shift', 'actionable_step', 'encouragement'],
  chainOfThought: true,
};

// --- Export All Signatures ---

export const GENERAL_SIGNATURES: DSPySignature[] = [
  GENERAL_STUDY_STRATEGY,
  GENERAL_EXAM_TECHNIQUE,
  GENERAL_NOTE_TAKING,
  GENERAL_QUESTION_INTERPRETER,
  GENERAL_MOTIVATION_HELPER,
];

/**
 * Get a signature by name
 */
export function getGeneralSignature(name: string): DSPySignature | undefined {
  return GENERAL_SIGNATURES.find(s => s.name === name);
}

export default GENERAL_SIGNATURES;
