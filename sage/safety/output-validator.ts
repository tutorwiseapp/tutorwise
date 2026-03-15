/**
 * Sage Output Validator
 *
 * Validates LLM responses before delivery to students.
 * Enforces: Socratic mode compliance, content safety, PII stripping.
 *
 * Runs AFTER the LLM generates a response, BEFORE streaming to client.
 *
 * @module sage/safety/output-validator
 */

import type { OutputValidation, OutputViolationType } from './types';
import type { TeachingMode } from '../teaching/modes';

// --- Direct Answer Detection ---

/**
 * Patterns that indicate a direct answer is being given.
 * Used to enforce Socratic mode — Sage should guide, not answer.
 */
const DIRECT_ANSWER_PATTERNS: RegExp[] = [
  /\bthe\s+answer\s+is\b/i,
  /\bthe\s+solution\s+is\b/i,
  /\bthe\s+correct\s+answer\b/i,
  /\b(?:equals?|=)\s*-?\d+(?:\.\d+)?\s*$/m,
  /\btherefore,?\s+(?:x|y|z|the\s+(?:answer|result|value))\s*(?:=|is|equals)\s*-?\d/i,
  /\bso\s+the\s+(?:answer|result|value)\s+is\b/i,
  /\bhere(?:'s| is) the (?:full |complete )?(?:answer|solution)\b/i,
];

/**
 * Patterns for inappropriate/harmful content in output.
 */
const INAPPROPRIATE_OUTPUT_PATTERNS: RegExp[] = [
  /\bf+u+c+k+\b/i,
  /\bs+h+i+t+\b/i,
  /\bc+u+n+t+\b/i,
  /\bn+i+g+g+/i,
];

/**
 * PII patterns in output (LLM might echo back or hallucinate PII).
 */
const OUTPUT_PII_PATTERNS: RegExp[] = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  /\b0[0-9]{10}\b/,
  /\b\+44[0-9]{10}\b/,
  /\b[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}\b/,
];

/**
 * Hallucinated exam info patterns — dates/grades that Sage shouldn't claim to know.
 */
const HALLUCINATED_EXAM_PATTERNS: RegExp[] = [
  /\byour\s+(?:exam|test|assessment)\s+(?:is|will\s+be)\s+on\s+\d/i,
  /\byou(?:'ve| have)\s+(?:scored|achieved|got|received)\s+(?:a\s+)?(?:grade\s+)?[A-U*]\b/i,
  /\byour\s+predicted\s+grade\s+is\b/i,
];

// --- Validator ---

/**
 * Validate an LLM response before delivery.
 *
 * @param response - The raw LLM response text
 * @param teachingMode - Current teaching mode (Socratic enforcement only applies in 'socratic' mode)
 * @param isStudentPersona - Whether the current user is a student (Socratic only applies to students)
 */
export function validateOutput(
  response: string,
  teachingMode: TeachingMode = 'adaptive',
  isStudentPersona: boolean = true
): OutputValidation {
  const violations: OutputViolationType[] = [];
  let rewritten: string | undefined;
  const details: string[] = [];

  // 1. Check for inappropriate content (applies to ALL responses)
  for (const pattern of INAPPROPRIATE_OUTPUT_PATTERNS) {
    if (pattern.test(response)) {
      violations.push('inappropriate_content');
      details.push('Response contains inappropriate language');
      break;
    }
  }

  // 2. Check for PII leakage
  for (const pattern of OUTPUT_PII_PATTERNS) {
    if (pattern.test(response)) {
      violations.push('pii_leakage');
      details.push('Response contains potential PII');
      break;
    }
  }

  // 3. Check for hallucinated exam info
  for (const pattern of HALLUCINATED_EXAM_PATTERNS) {
    if (pattern.test(response)) {
      violations.push('hallucinated_exam_info');
      details.push('Response contains potentially hallucinated exam dates or grades');
      break;
    }
  }

  // 4. Socratic mode enforcement (only for students in Socratic mode)
  if (teachingMode === 'socratic' && isStudentPersona) {
    for (const pattern of DIRECT_ANSWER_PATTERNS) {
      if (pattern.test(response)) {
        violations.push('direct_answer_in_socratic');
        details.push('Direct answer detected in Socratic mode');

        // Attempt to rewrite as a guiding question
        rewritten = rewriteAsSocratic(response);
        break;
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    rewritten: violations.length > 0 ? rewritten : undefined,
    details: details.length > 0 ? details.join('; ') : undefined,
  };
}

/**
 * Strip PII from an LLM response.
 */
export function stripOutputPII(response: string): string {
  let cleaned = response;

  cleaned = cleaned.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[email removed]'
  );
  cleaned = cleaned.replace(/\b0[0-9]{10}\b/g, '[phone removed]');
  cleaned = cleaned.replace(/\b\+44[0-9]{10}\b/g, '[phone removed]');
  cleaned = cleaned.replace(
    /\b[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}\b/gi,
    '[postcode removed]'
  );

  return cleaned;
}

/**
 * Attempt to rewrite a direct-answer response as a Socratic guiding question.
 * This is a lightweight heuristic — not perfect, but catches obvious cases.
 *
 * Returns the rewritten response, or undefined if rewriting isn't possible.
 */
function rewriteAsSocratic(response: string): string | undefined {
  // Strategy: prepend a Socratic nudge and remove the most obvious direct answer line
  const lines = response.split('\n');
  const filteredLines: string[] = [];
  let removedAnswer = false;

  for (const line of lines) {
    // Check if this specific line contains the direct answer
    let isDirectAnswer = false;
    for (const pattern of DIRECT_ANSWER_PATTERNS) {
      if (pattern.test(line)) {
        isDirectAnswer = true;
        break;
      }
    }

    if (isDirectAnswer && !removedAnswer) {
      // Replace the first direct answer line with a guiding question
      filteredLines.push("That's a great question! Before I show you, what do you think the answer might be? What approach would you try first?");
      removedAnswer = true;
    } else {
      filteredLines.push(line);
    }
  }

  if (!removedAnswer) {
    // Couldn't isolate the answer line — prepend Socratic prompt
    return "Let's think through this together. " + response;
  }

  return filteredLines.join('\n');
}

/**
 * Check if a response seems to be entirely off-topic for education.
 * Lightweight heuristic — checks for certain non-educational patterns.
 */
export function isOffTopic(response: string, expectedSubject?: string): boolean {
  // If response is very short, don't flag
  if (response.length < 50) return false;

  const offTopicPatterns: RegExp[] = [
    /\b(buy|purchase|order|shop|discount|coupon|promo)\b.*\b(now|today|here)\b/i,
    /\b(click|visit|go\s+to)\s+(this|the)\s+(link|url|website)\b/i,
    /\b(invest|crypto|bitcoin|stocks|trading)\b/i,
  ];

  for (const pattern of offTopicPatterns) {
    if (pattern.test(response)) {
      return true;
    }
  }

  return false;
}
