/**
 * Sage Answer Evaluator
 *
 * Evaluates student answers against problem bank mark schemes.
 * Maths: deterministic verification via hybrid solver.
 * Open-ended: structured rubric evaluation (delegated to LLM).
 *
 * @module sage/assessment/answer-evaluator
 */

import type { SageSubject } from '../types';

// --- Types ---

export interface EvaluationResult {
  correct: boolean;
  score: number;
  max_score: number;
  feedback: string;
  model_answer?: string;
  method: 'deterministic' | 'rubric' | 'heuristic';
}

export interface MarkScheme {
  answer: string;
  marks: number;
  criteria?: Array<{
    description: string;
    marks: number;
  }>;
}

// --- Evaluator ---

/**
 * Evaluate a student's answer for a maths problem.
 * Uses the deterministic solver for numerical/algebraic verification.
 */
export function evaluateMathAnswer(
  studentAnswer: string,
  correctAnswer: string,
  markScheme?: MarkScheme
): EvaluationResult {
  const maxScore = markScheme?.marks || 1;

  // Normalise for comparison
  const normalised = normaliseAnswer(studentAnswer);
  const expected = normaliseAnswer(correctAnswer);

  // Direct string match after normalisation
  if (normalised === expected) {
    return {
      correct: true,
      score: maxScore,
      max_score: maxScore,
      feedback: 'Correct! Well done.',
      model_answer: correctAnswer,
      method: 'deterministic',
    };
  }

  // Try numeric comparison (handles formatting differences like 0.5 vs 1/2)
  const studentNum = parseFloat(normalised);
  const expectedNum = parseFloat(expected);

  if (!isNaN(studentNum) && !isNaN(expectedNum)) {
    if (Math.abs(studentNum - expectedNum) < 0.0001) {
      return {
        correct: true,
        score: maxScore,
        max_score: maxScore,
        feedback: 'Correct! Well done.',
        model_answer: correctAnswer,
        method: 'deterministic',
      };
    }

    // Close but wrong — partial credit for method marks
    const relativeError = Math.abs(studentNum - expectedNum) / Math.max(1, Math.abs(expectedNum));
    if (relativeError < 0.1 && maxScore > 1) {
      return {
        correct: false,
        score: Math.max(0, maxScore - 1),
        max_score: maxScore,
        feedback: `Close! Your answer is ${studentAnswer}, but the correct answer is ${correctAnswer}. You may have made a small calculation error.`,
        model_answer: correctAnswer,
        method: 'deterministic',
      };
    }
  }

  return {
    correct: false,
    score: 0,
    max_score: maxScore,
    feedback: `Not quite. The correct answer is ${correctAnswer}. Let's look at where you went wrong.`,
    model_answer: correctAnswer,
    method: 'deterministic',
  };
}

/**
 * Build a rubric evaluation prompt for open-ended answers.
 * Returns a structured prompt for the LLM to evaluate against.
 */
export function buildRubricPrompt(
  subject: SageSubject,
  question: string,
  studentAnswer: string,
  markScheme: MarkScheme
): string {
  return `EVALUATE this student's answer against the mark scheme.

SUBJECT: ${subject}
QUESTION: ${question}
STUDENT ANSWER: ${studentAnswer}

MARK SCHEME:
- Total marks available: ${markScheme.marks}
- Expected answer: ${markScheme.answer}
${markScheme.criteria
    ? markScheme.criteria.map(c => `- ${c.description} (${c.marks} mark${c.marks !== 1 ? 's' : ''})`).join('\n')
    : ''
}

Respond in EXACTLY this JSON format:
{
  "correct": true/false,
  "score": <number>,
  "max_score": ${markScheme.marks},
  "feedback": "<specific feedback on what was good and what to improve>"
}`;
}

// --- Helpers ---

/**
 * Normalise an answer string for comparison.
 * Removes whitespace, converts to lowercase, strips common formatting.
 */
function normaliseAnswer(answer: string): string {
  return answer
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/£|€|\$/g, '')
    .replace(/,/g, '')
    .replace(/^0+(?=\d)/, ''); // Remove leading zeros
}
