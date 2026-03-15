/**
 * Sage Age Adapter
 *
 * Adapts Sage's language, vocabulary, and content restrictions
 * based on the student's age bracket.
 *
 * Age brackets:
 * - primary: under 11 (KS2)
 * - secondary: 11-16 (KS3/KS4 / GCSE)
 * - adult: 16+ (A-Level, University, professional)
 *
 * @module sage/safety/age-adapter
 */

import type { AgeBracket, AgeAdaptation } from './types';

// --- Age Bracket Configs ---

const AGE_ADAPTATIONS: Record<AgeBracket, AgeAdaptation> = {
  primary: {
    bracket: 'primary',
    vocabularyLevel: 'simple',
    forbiddenTopics: [
      'violence', 'weapons', 'drugs', 'alcohol', 'smoking',
      'sexual content', 'gambling', 'self-harm', 'suicide',
      'graphic descriptions of injury or illness',
    ],
    toneGuidelines: [
      'Use simple, short sentences',
      'Avoid jargon — explain any technical words in brackets',
      'Use encouraging and playful tone',
      'Use concrete examples from everyday life (sports, cooking, games)',
      'Avoid sarcasm or irony — young children take things literally',
      'Use "we" language: "Let\'s figure this out together!"',
      'Celebrate every attempt: "Great try!"',
    ],
    systemPromptBlock:
      `STUDENT AGE: Primary school (under 11).\n` +
      `LANGUAGE RULES:\n` +
      `- Use simple, clear English. Short sentences.\n` +
      `- Explain any technical word in brackets: "the denominator (the bottom number)"\n` +
      `- Use concrete examples: "If you have 3 apples and give away 1..."\n` +
      `- Be warm and encouraging. Say "great try!" and "well done!" often.\n` +
      `- Never use sarcasm, irony, or complex idioms.\n` +
      `- Keep responses concise — this student has a shorter attention span.\n` +
      `- Do NOT discuss topics unsuitable for children under 11.`,
  },

  secondary: {
    bracket: 'secondary',
    vocabularyLevel: 'intermediate',
    forbiddenTopics: [
      'graphic violence', 'weapons manufacture', 'drug manufacture',
      'sexual content', 'gambling', 'self-harm methods',
    ],
    toneGuidelines: [
      'Use curriculum vocabulary — students need to learn subject-specific terms',
      'Match GCSE/KS3 reading level',
      'Be encouraging but not patronising',
      'Use real-world examples relevant to teenagers',
      'Mild humour is fine but avoid sarcasm that could be hurtful',
      'Acknowledge difficulty honestly: "This is a challenging topic"',
    ],
    systemPromptBlock:
      `STUDENT AGE: Secondary school (11-16, GCSE level).\n` +
      `LANGUAGE RULES:\n` +
      `- Use appropriate curriculum vocabulary for their subject and level.\n` +
      `- Match GCSE-level reading complexity.\n` +
      `- Be encouraging and relatable. Avoid being patronising.\n` +
      `- Use examples relevant to teenagers.\n` +
      `- Introduce technical terms with brief definitions on first use.\n` +
      `- Do NOT discuss topics unsuitable for under-16s.`,
  },

  adult: {
    bracket: 'adult',
    vocabularyLevel: 'advanced',
    forbiddenTopics: [
      'weapons manufacture', 'drug manufacture',
      'explicit sexual content',
    ],
    toneGuidelines: [
      'Use full academic vocabulary',
      'Assume A-Level or university reading level',
      'Treat as a peer learner — professional and respectful',
      'Complex examples and real-world applications are appropriate',
      'Can reference academic papers, industry practices, current events',
    ],
    systemPromptBlock:
      `STUDENT AGE: Adult learner (16+, A-Level / University / professional).\n` +
      `LANGUAGE RULES:\n` +
      `- Use full academic vocabulary appropriate to their level.\n` +
      `- Treat as an adult peer learner — professional, respectful tone.\n` +
      `- Complex examples, real-world applications, and nuanced discussion are appropriate.\n` +
      `- Reference academic concepts and frameworks where relevant.`,
  },
};

// --- Functions ---

/**
 * Determine age bracket from date of birth.
 * Returns 'secondary' as default if DOB is unavailable.
 */
export function getAgeBracket(dateOfBirth?: string | Date | null): AgeBracket {
  if (!dateOfBirth) return 'secondary'; // Safe default for education platform

  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  if (isNaN(dob.getTime())) return 'secondary';

  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 11) return 'primary';
  if (age < 16) return 'secondary';
  return 'adult';
}

/**
 * Get the full age adaptation config for an age bracket.
 */
export function getAgeAdaptation(bracket: AgeBracket): AgeAdaptation {
  return AGE_ADAPTATIONS[bracket];
}

/**
 * Get the system prompt block for an age bracket.
 * This is injected into the LLM system prompt to guide language level.
 */
export function getAgeSystemPrompt(bracket: AgeBracket): string {
  return AGE_ADAPTATIONS[bracket].systemPromptBlock;
}

/**
 * Check if a topic is forbidden for the given age bracket.
 */
export function isTopicForbidden(topic: string, bracket: AgeBracket): boolean {
  const adaptation = AGE_ADAPTATIONS[bracket];
  const lowerTopic = topic.toLowerCase();

  return adaptation.forbiddenTopics.some(forbidden =>
    lowerTopic.includes(forbidden.toLowerCase())
  );
}
