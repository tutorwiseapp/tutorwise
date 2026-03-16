/**
 * SEN/SEND Adapter
 *
 * Generates system prompt blocks and content adaptations for students
 * with Special Educational Needs and Disabilities.
 *
 * Orthogonal to age adaptation — a 7-year-old with dyslexia gets both
 * the primary age bracket AND dyslexia adaptations combined.
 *
 * Privacy: Category labels are NEVER sent to the LLM. Only behavioural
 * instructions are injected into the system prompt.
 *
 * @module sage/sen/adapter
 */

import type { SENCategory, SENAdaptation } from './types';

// ---------------------------------------------------------------------------
// SEN Adaptation Profiles
// ---------------------------------------------------------------------------

const SEN_ADAPTATIONS: Record<SENCategory, SENAdaptation> = {
  dyslexia: {
    category: 'dyslexia',
    displayName: 'Dyslexia',
    promptGuidelines: [
      'Use short paragraphs (2-3 sentences maximum)',
      'Present information in bullet points rather than dense prose',
      'Bold key terms when first introduced',
      'Avoid walls of text — use clear visual spacing',
      'Provide phonetic pronunciation for complex vocabulary in brackets',
      'Use concrete, familiar words before introducing technical terms',
      'Never rush — allow time to process without pressure',
      'Offer structured vocabulary support (word → definition → example)',
    ],
    contentAdaptations: [
      'Break long paragraphs into bullet lists',
      'Add spacing between sections',
    ],
    forbiddenPatterns: [
      'Timed exercises or countdown pressure',
      'Dense blocks of unbroken text',
      'Multiple instructions in a single sentence',
    ],
    recommendedModes: ['direct', 'supportive'],
  },

  dyscalculia: {
    category: 'dyscalculia',
    displayName: 'Dyscalculia',
    promptGuidelines: [
      'Use visual representations for numbers (number lines, groups of objects)',
      'Always start with concrete examples before abstract concepts ("3 apples + 2 apples")',
      'Break multi-step calculations into tiny individual steps',
      'Encourage estimation before precise calculation',
      'Provide worked examples with every step shown explicitly',
      'Use consistent layouts for mathematical operations',
      'Never assume mental arithmetic ability — show every intermediate result',
      'Relate numbers to real-life quantities the student understands',
    ],
    contentAdaptations: [
      'Add step-by-step breakdowns to all calculations',
      'Include estimation prompts before exact answers',
    ],
    forbiddenPatterns: [
      'Timed maths exercises',
      'Skipping steps in calculations',
      '"This is easy" or "you should know this"',
      'Multiple operations in a single line without intermediate results',
    ],
    recommendedModes: ['direct', 'supportive'],
  },

  dyspraxia: {
    category: 'dyspraxia',
    displayName: 'Dyspraxia (DCD)',
    promptGuidelines: [
      'Give clear, sequential instructions (one step at a time)',
      'Use numbered lists for multi-step processes',
      'Allow extra time for responses without implying urgency',
      'Provide clear structure and organisation in all responses',
      'Use visual organisers (tables, lists) rather than flowing text',
      'Break complex tasks into smaller manageable chunks',
    ],
    contentAdaptations: [
      'Number all steps explicitly',
      'Use tables for comparisons',
    ],
    forbiddenPatterns: [
      'Multiple simultaneous instructions',
      'Assuming speed of processing',
    ],
    recommendedModes: ['direct', 'adaptive'],
  },

  adhd: {
    category: 'adhd',
    displayName: 'ADHD',
    promptGuidelines: [
      'Keep responses SHORT and focused (3-5 sentences per section)',
      'Use numbered steps for all procedures',
      'Include frequent check-in questions ("Does that make sense so far?")',
      'Provide clear structure with headers and visual breaks',
      'Offer gamified progress markers ("Great — 2 out of 3 steps done!")',
      'Vary the format between explanations (text, examples, questions)',
      'Use positive reinforcement frequently',
      'Minimise distractions — stay focused on one concept at a time',
    ],
    contentAdaptations: [
      'Shorten long responses',
      'Add progress markers between sections',
      'Insert check-in questions',
    ],
    forbiddenPatterns: [
      'Long unbroken explanations',
      'Multiple topics in one response',
      'Passive or monotonous tone',
    ],
    recommendedModes: ['adaptive', 'supportive'],
  },

  asd: {
    category: 'asd',
    displayName: 'Autism Spectrum',
    promptGuidelines: [
      'Use literal, precise language — avoid idioms, metaphors, and sarcasm',
      'Maintain consistent, predictable response structure',
      'Give explicit instructions (never assume implied meaning)',
      'Reduce ambiguity in questions — be specific about what is being asked',
      'Provide clear context for word problems (who, what, where, why)',
      'Use the same terminology consistently (do not switch between synonyms)',
      'Explain social context explicitly when relevant to problems',
      'Offer visual schedules or checklists for multi-step work',
    ],
    contentAdaptations: [
      'Replace idioms with literal equivalents',
      'Add explicit context to word problems',
    ],
    forbiddenPatterns: [
      'Idioms, sarcasm, or figurative language without explanation',
      'Vague instructions ("think about it")',
      'Changing terminology mid-explanation',
      'Open-ended questions without scaffolding',
    ],
    recommendedModes: ['direct', 'adaptive'],
  },

  'visual-impairment': {
    category: 'visual-impairment',
    displayName: 'Visual Impairment',
    promptGuidelines: [
      'Describe all visual content in text (diagrams, graphs, images)',
      'Never reference "see the image" or "look at the diagram"',
      'Use spatial language clearly ("the top row", "the left column")',
      'Provide text-based alternatives for all visual representations',
      'Use high-contrast formatting hints where possible',
      'Structure information with clear headings and numbered lists',
    ],
    contentAdaptations: [
      'Add text descriptions for any referenced visuals',
      'Replace visual references with spatial language',
    ],
    forbiddenPatterns: [
      '"See the diagram"',
      '"Look at" or "as shown"',
      'Relying on colour alone to convey meaning',
    ],
    recommendedModes: ['direct', 'adaptive'],
  },

  'hearing-impairment': {
    category: 'hearing-impairment',
    displayName: 'Hearing Impairment',
    promptGuidelines: [
      'Prioritise written/text-based explanations over audio references',
      'Use clear, well-structured written language',
      'Define terminology explicitly when first used',
      'Emphasise visual learning approaches (diagrams described in text, tables)',
      'Avoid references to audio content unless text alternative provided',
    ],
    contentAdaptations: [
      'Ensure all explanations are self-contained in text',
    ],
    forbiddenPatterns: [
      '"Listen to" or audio-only references',
      'Assuming phonics-based learning for literacy',
    ],
    recommendedModes: ['direct', 'adaptive'],
  },

  'speech-language': {
    category: 'speech-language',
    displayName: 'Speech & Language',
    promptGuidelines: [
      'Use simple, clear sentence structures',
      'Introduce one new concept at a time',
      'Provide word banks and vocabulary support',
      'Use visual cues and concrete examples alongside text',
      'Allow flexible response formats (short answers, multiple choice, pointing)',
      'Repeat key information in different ways',
    ],
    contentAdaptations: [
      'Simplify sentence structures',
      'Add vocabulary support for complex terms',
    ],
    forbiddenPatterns: [
      'Complex or compound sentences with multiple clauses',
      'Assuming verbal fluency',
    ],
    recommendedModes: ['direct', 'supportive'],
  },

  'social-emotional': {
    category: 'social-emotional',
    displayName: 'Social, Emotional & Mental Health (SEMH)',
    promptGuidelines: [
      'Maintain a warm, patient, and encouraging tone throughout',
      'Never create time pressure or imply urgency',
      'Celebrate every small success and effort',
      'Normalise mistakes as part of learning',
      'Include brief wellbeing check-ins when appropriate',
      'Use growth mindset language ("not yet" rather than "wrong")',
      'Be sensitive to frustration — offer breaks or topic changes',
      'Build confidence through scaffolded success',
    ],
    contentAdaptations: [
      'Add encouragement after challenging sections',
      'Use growth mindset framing for corrections',
    ],
    forbiddenPatterns: [
      'Negative framing ("you got it wrong")',
      'Time pressure or urgency cues',
      'Comparing to others or expected norms',
    ],
    recommendedModes: ['supportive', 'adaptive'],
  },

  'moderate-learning': {
    category: 'moderate-learning',
    displayName: 'Moderate Learning Difficulty (MLD)',
    promptGuidelines: [
      'Use language significantly below chronological age level',
      'Provide much more repetition than typical — revisit concepts frequently',
      'Use very small steps between concepts',
      'Always use concrete, real-world examples (never abstract)',
      'Provide visual supports alongside text',
      'Limit new information per response (1-2 concepts maximum)',
      'Use consistent, simple vocabulary throughout',
      'Offer praise and encouragement frequently',
    ],
    contentAdaptations: [
      'Simplify vocabulary to below age-norm',
      'Limit concepts per response to 1-2',
      'Add concrete examples for all abstract concepts',
    ],
    forbiddenPatterns: [
      'Abstract concepts without concrete grounding',
      'More than 2 new ideas in a single response',
      'Complex vocabulary without definition',
      'Assuming prior knowledge retention',
    ],
    recommendedModes: ['direct', 'supportive'],
  },

  'specific-learning': {
    category: 'specific-learning',
    displayName: 'Specific Learning Difficulty (SpLD)',
    promptGuidelines: [
      'Identify and work with the student\'s preferred learning style',
      'Provide multi-sensory explanations (visual + verbal + kinesthetic cues)',
      'Use structured, predictable formats for all responses',
      'Highlight key information clearly (bold, numbered lists)',
      'Provide scaffolding that can be gradually removed',
      'Allow alternative ways to demonstrate understanding',
      'Be patient with processing time — never rush',
    ],
    contentAdaptations: [
      'Add multi-sensory cues to explanations',
      'Highlight key terms prominently',
    ],
    forbiddenPatterns: [
      'One-size-fits-all approach',
      'Assuming a single correct way to learn or respond',
    ],
    recommendedModes: ['adaptive', 'supportive'],
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get SEN adaptations for one or more categories.
 */
export function getSENAdaptations(categories: SENCategory[]): SENAdaptation[] {
  return categories
    .filter((c) => c in SEN_ADAPTATIONS)
    .map((c) => SEN_ADAPTATIONS[c]);
}

/**
 * Generate a combined system prompt block for all active SEN categories.
 * Category labels are NOT included — only behavioural instructions.
 */
export function getSENSystemPrompt(categories: SENCategory[]): string {
  const adaptations = getSENAdaptations(categories);
  if (adaptations.length === 0) return '';

  const guidelines = adaptations.flatMap((a) => a.promptGuidelines);
  const forbidden = adaptations.flatMap((a) => a.forbiddenPatterns);

  // Deduplicate
  const uniqueGuidelines = [...new Set(guidelines)];
  const uniqueForbidden = [...new Set(forbidden)];

  const lines = [
    '### LEARNING SUPPORT ADAPTATIONS',
    '',
    'This student has specific learning needs. Follow these guidelines strictly:',
    '',
    '**DO:**',
    ...uniqueGuidelines.map((g) => `- ${g}`),
    '',
    '**DO NOT:**',
    ...uniqueForbidden.map((f) => `- ${f}`),
    '',
  ];

  return lines.join('\n');
}

/**
 * Get recommended teaching modes for the given SEN categories.
 * Returns modes sorted by frequency (most recommended first).
 */
export function getRecommendedModes(
  categories: SENCategory[]
): ('socratic' | 'direct' | 'adaptive' | 'supportive')[] {
  const adaptations = getSENAdaptations(categories);
  const modeCount = new Map<string, number>();

  for (const a of adaptations) {
    for (const mode of a.recommendedModes) {
      modeCount.set(mode, (modeCount.get(mode) ?? 0) + 1);
    }
  }

  return [...modeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([mode]) => mode as 'socratic' | 'direct' | 'adaptive' | 'supportive');
}
