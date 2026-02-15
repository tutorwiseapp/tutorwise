/**
 * Subject Engine Executor
 *
 * Maps detected intents to DSPy signatures and formats structured
 * prompts for LLM providers. This bridges the gap between intent
 * detection and subject-specific response generation.
 *
 * @module sage/subjects/engine-executor
 */

import type { SageSubject, SageLevel, SageIntentCategory } from '../types';
import type { DSPySignature, DSPyExample } from './dspy-types';
import { getMathsSignature, MATHS_SIGNATURES } from './maths/engine';
import { getEnglishSignature, ENGLISH_SIGNATURES } from './english/engine';
import { getScienceSignature, SCIENCE_SIGNATURES } from './science/engine';
import { getGeneralSignature, GENERAL_SIGNATURES } from './general/engine';

// --- Intent to Signature Mapping ---

/**
 * Maps intent categories to the most appropriate DSPy signature per subject.
 */
const INTENT_SIGNATURE_MAP: Record<SageSubject, Record<string, string>> = {
  maths: {
    solve: 'MathsProblemSolver',
    explain: 'MathsProblemSolver',
    homework: 'MathsProblemSolver',
    practice: 'MathsPracticeGenerator',
    diagnose: 'MathsErrorAnalyzer',
    review: 'MathsHintGenerator',
    exam: 'MathsPracticeGenerator',
    general: 'MathsProblemSolver',
    resources: 'MathsPracticeGenerator',
    progress: 'MathsProblemSolver',
  },
  english: {
    solve: 'EnglishWritingFeedback',
    explain: 'EnglishComprehension',
    homework: 'EnglishWritingFeedback',
    practice: 'EnglishEssayPlanner',
    diagnose: 'EnglishGrammarHelper',
    review: 'EnglishLitAnalysis',
    exam: 'EnglishEssayPlanner',
    general: 'EnglishComprehension',
    resources: 'EnglishComprehension',
    progress: 'EnglishComprehension',
  },
  science: {
    solve: 'ScienceCalculationHelper',
    explain: 'ScienceConceptExplainer',
    homework: 'ScienceConceptExplainer',
    practice: 'SciencePracticalGuide',
    diagnose: 'ScienceConceptExplainer',
    review: 'ScienceConceptExplainer',
    exam: 'SciencePracticalGuide',
    general: 'ScienceConceptExplainer',
    resources: 'ScienceConceptExplainer',
    progress: 'ScienceConceptExplainer',
  },
  general: {
    solve: 'GeneralStudyStrategy',
    explain: 'GeneralStudyStrategy',
    homework: 'GeneralStudyStrategy',
    practice: 'GeneralExamTechnique',
    diagnose: 'GeneralQuestionInterpreter',
    review: 'GeneralNoteTaking',
    exam: 'GeneralExamTechnique',
    general: 'GeneralStudyStrategy',
    resources: 'GeneralStudyStrategy',
    progress: 'GeneralStudyStrategy',
  },
};

// --- Engine Executor ---

export interface SignatureContext {
  /** The resolved DSPy signature */
  signature: DSPySignature;
  /** Formatted prompt enhancement from the signature */
  promptEnhancement: string;
  /** Expected output structure */
  outputStructure: string[];
}

/**
 * Resolve the appropriate DSPy signature for a given intent and subject.
 */
export function resolveSignature(
  intent: SageIntentCategory,
  subject: SageSubject
): DSPySignature | null {
  const signatureMap = INTENT_SIGNATURE_MAP[subject] || INTENT_SIGNATURE_MAP.general;
  const signatureName = signatureMap[intent] || signatureMap.general;

  if (!signatureName) return null;

  // Look up the signature in the appropriate engine
  const lookupFn = {
    maths: getMathsSignature,
    english: getEnglishSignature,
    science: getScienceSignature,
    general: getGeneralSignature,
  }[subject];

  return lookupFn ? lookupFn(signatureName) || null : null;
}

/**
 * Format a DSPy signature into a prompt enhancement.
 * This injects the signature's structure and examples into the system prompt
 * so the LLM follows the optimized reasoning pattern.
 */
export function formatSignaturePrompt(
  signature: DSPySignature,
  context: {
    topic?: string;
    level?: SageLevel;
    userMessage?: string;
  }
): string {
  const parts: string[] = [];

  parts.push(`\n---\n## Structured Response Pattern: ${signature.description}`);

  // Define expected output structure
  parts.push(`\nYour response should include these components:`);
  signature.outputs.forEach((output, i) => {
    const label = output.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    parts.push(`${i + 1}. **${label}**`);
  });

  // Include chain-of-thought instruction
  if (signature.chainOfThought) {
    parts.push(`\nUse step-by-step reasoning to work through this. Show your thinking process clearly.`);
  }

  // Include examples if available
  if (signature.examples && signature.examples.length > 0) {
    parts.push(`\n### Example of a good response:`);
    for (const example of signature.examples.slice(0, 2)) {
      if (example.reasoning) {
        parts.push(`\n**Reasoning:** ${example.reasoning}`);
      }
      for (const [key, value] of Object.entries(example.outputs)) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        parts.push(`**${label}:** ${value}`);
      }
    }
  }

  // Add level-specific context
  if (context.level) {
    parts.push(`\nTarget level: ${context.level}`);
  }

  if (context.topic) {
    parts.push(`Current topic: ${context.topic}`);
  }

  return parts.join('\n');
}

/**
 * Get the full signature context for a given intent and subject.
 * Returns null if no matching signature is found.
 */
export function getSignatureContext(
  intent: SageIntentCategory,
  subject: SageSubject,
  context: {
    topic?: string;
    level?: SageLevel;
    userMessage?: string;
  }
): SignatureContext | null {
  const signature = resolveSignature(intent, subject);
  if (!signature) return null;

  return {
    signature,
    promptEnhancement: formatSignaturePrompt(signature, context),
    outputStructure: signature.outputs,
  };
}

/**
 * Get all available signatures for a subject.
 */
export function getSubjectSignatures(subject: SageSubject): DSPySignature[] {
  const signaturesMap: Record<SageSubject, DSPySignature[]> = {
    maths: MATHS_SIGNATURES,
    english: ENGLISH_SIGNATURES,
    science: SCIENCE_SIGNATURES,
    general: GENERAL_SIGNATURES,
  };

  return signaturesMap[subject] || GENERAL_SIGNATURES;
}
