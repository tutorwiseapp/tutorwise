/**
 * Maths DSPy Engine
 *
 * Chain-of-Thought signatures for mathematics tutoring.
 * These signatures are optimizable via DSPy for improved performance.
 *
 * @module sage/subjects/maths/engine
 */

// --- DSPy Signature Types ---

export interface DSPySignature {
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  chainOfThought: boolean;
  examples?: DSPyExample[];
}

export interface DSPyExample {
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  reasoning?: string;
}

// --- Maths Problem Solver Signature ---

export const MATHS_PROBLEM_SOLVER: DSPySignature = {
  name: 'MathsProblemSolver',
  description: 'Solve a mathematics problem step-by-step, showing working',
  inputs: ['problem', 'level', 'topic'],
  outputs: ['steps', 'answer', 'verification'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        problem: 'Solve for x: 2x + 5 = 13',
        level: 'GCSE',
        topic: 'linear_equations',
      },
      outputs: {
        steps: '1. Subtract 5 from both sides: 2x = 8\n2. Divide both sides by 2: x = 4',
        answer: 'x = 4',
        verification: 'Check: 2(4) + 5 = 8 + 5 = 13',
      },
      reasoning: 'This is a linear equation. We isolate x by performing inverse operations.',
    },
  ],
};

// --- Maths Hint Generator Signature ---

export const MATHS_HINT_GENERATOR: DSPySignature = {
  name: 'MathsHintGenerator',
  description: 'Generate progressive hints without giving away the answer',
  inputs: ['problem', 'level', 'student_attempt', 'hint_level'],
  outputs: ['hint', 'next_hint_available', 'encouragement'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        problem: 'Factorise: x^2 + 5x + 6',
        level: 'GCSE',
        student_attempt: 'I do not know where to start',
        hint_level: 'minimal',
      },
      outputs: {
        hint: 'Think about two numbers that multiply to give 6 and add to give 5.',
        next_hint_available: 'yes',
        encouragement: 'You have got this! Start by listing factor pairs of 6.',
      },
      reasoning: 'Student needs initial direction. Give conceptual hint without revealing the factors.',
    },
  ],
};

// --- Maths Error Analyzer Signature ---

export const MATHS_ERROR_ANALYZER: DSPySignature = {
  name: 'MathsErrorAnalyzer',
  description: 'Identify error patterns in student work and provide targeted feedback',
  inputs: ['problem', 'correct_answer', 'student_answer', 'student_working'],
  outputs: ['error_type', 'error_explanation', 'remediation', 'similar_example'],
  chainOfThought: true,
  examples: [
    {
      inputs: {
        problem: '3 - (-2) = ?',
        correct_answer: '5',
        student_answer: '1',
        student_working: '3 - 2 = 1',
      },
      outputs: {
        error_type: 'sign_error',
        error_explanation: 'The student ignored the double negative. Subtracting a negative equals adding.',
        remediation: 'Remember: minus a negative = plus. Think of removing a debt.',
        similar_example: 'Try: 7 - (-3) = ?',
      },
      reasoning: 'Common misconception with negative numbers.',
    },
  ],
};

// --- Maths Practice Generator Signature ---

export const MATHS_PRACTICE_GENERATOR: DSPySignature = {
  name: 'MathsPracticeGenerator',
  description: 'Generate practice problems at appropriate difficulty with marking criteria',
  inputs: ['topic', 'level', 'difficulty', 'count', 'avoid_types'],
  outputs: ['problems', 'answers', 'mark_scheme', 'time_estimate'],
  chainOfThought: true,
};

// --- Export All Signatures ---

export const MATHS_SIGNATURES: DSPySignature[] = [
  MATHS_PROBLEM_SOLVER,
  MATHS_HINT_GENERATOR,
  MATHS_ERROR_ANALYZER,
  MATHS_PRACTICE_GENERATOR,
];

/**
 * Get a signature by name
 */
export function getMathsSignature(name: string): DSPySignature | undefined {
  return MATHS_SIGNATURES.find(s => s.name === name);
}

export default MATHS_SIGNATURES;
