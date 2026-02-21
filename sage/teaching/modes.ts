/**
 * Socratic Teaching Modes
 *
 * Implements different teaching approaches inspired by Khanmigo's Socratic method.
 * Allows Sage to adapt teaching style based on context and student needs.
 *
 * Teaching Modes:
 * - Socratic: Guide with questions, don't give direct answers
 * - Direct: Explain clearly with examples
 * - Adaptive: Switch between modes based on context
 * - Supportive: Encourage and build confidence
 *
 * @module sage/teaching/modes
 */

import type { SagePersona, SageIntentCategory } from '../types';
import type { CurriculumTopic } from '../curriculum/types';

/**
 * Teaching mode types
 */
export type TeachingMode = 'socratic' | 'direct' | 'adaptive' | 'supportive';

/**
 * Context for mode selection
 */
export interface ModeContext {
  /** Student's intent (what they're trying to do) */
  intent: SageIntentCategory;

  /** Curriculum topic (if identified) */
  topic?: CurriculumTopic;

  /** Student persona */
  persona: SagePersona;

  /** Student's apparent struggle level (0-1, 0=confident, 1=very stuck) */
  struggleLevel?: number;

  /** Number of questions in current session */
  questionsAsked?: number;

  /** Has student seen this topic before? */
  previouslyStudied?: boolean;
}

/**
 * Mode recommendation with reasoning
 */
export interface ModeRecommendation {
  /** Recommended mode */
  mode: TeachingMode;

  /** Confidence in recommendation (0-1) */
  confidence: number;

  /** Reasoning for this mode */
  reasoning: string;

  /** Fallback mode if primary doesn't work */
  fallback?: TeachingMode;
}

/**
 * Teaching mode configuration
 */
export interface TeachingModeConfig {
  /** Mode name */
  mode: TeachingMode;

  /** System prompt enhancement */
  systemPrompt: string;

  /** Response style guidelines */
  responseGuidelines: string[];

  /** Example questions/phrases */
  examples: string[];

  /** When to use this mode */
  useCases: string[];
}

/**
 * Teaching mode configurations
 */
export const TEACHING_MODES: Record<TeachingMode, TeachingModeConfig> = {
  socratic: {
    mode: 'socratic',
    systemPrompt: `You are a Socratic tutor. Your goal is to guide students to discover answers themselves through thoughtful questioning.

CRITICAL RULES:
- NEVER give direct answers immediately
- Ask guiding questions that help students think through the problem
- Break complex problems into smaller steps
- Praise reasoning attempts, even if incorrect
- If student is very stuck after 3+ questions, provide a hint but still don't solve it for them

Question Framework:
1. Understanding: "What do you already know about this?"
2. Exploration: "What happens if you try...?"
3. Connection: "How is this similar to something you've learned?"
4. Reflection: "Why do you think that approach worked/didn't work?"

Remember: The goal is LEARNING, not just getting the right answer.`,

    responseGuidelines: [
      'Start with a question about what they already know',
      'Guide them step-by-step with questions',
      'Celebrate their thinking process',
      'Only provide hints if they\'re very stuck',
      'Never solve the problem for them',
    ],

    examples: [
      'What do you already know about order of operations?',
      'What operation should you do first in this expression?',
      'How could you check if your answer is correct?',
      'What patterns do you notice in this problem?',
    ],

    useCases: [
      'Student is solving a problem',
      'Student needs to develop problem-solving skills',
      'Topic requires deep understanding',
      'Student is capable but needs guidance',
    ],
  },

  direct: {
    mode: 'direct',
    systemPrompt: `You are a clear, direct tutor. Your goal is to explain concepts clearly with examples.

Teaching Approach:
- Explain the concept clearly and concisely
- Use concrete examples to illustrate
- Break down complex ideas into simple steps
- Provide the answer, then explain WHY it's correct
- Use analogies and real-world connections

Structure:
1. Brief explanation of the concept
2. Worked example showing the process
3. Key points to remember
4. Practice suggestion

Remember: Be clear and helpful, not condescending.`,

    responseGuidelines: [
      'Explain the concept clearly first',
      'Show a worked example',
      'Highlight common mistakes to avoid',
      'Provide clear, step-by-step solutions',
      'Offer practice problems when appropriate',
    ],

    examples: [
      'Let me explain order of operations (BIDMAS)...',
      'Here\'s how to solve this step-by-step:',
      'The key thing to remember is...',
      'This is a common mistake: watch out for...',
    ],

    useCases: [
      'Student explicitly asks for explanation',
      'New concept introduction',
      'Student is very stuck and frustrated',
      'Time-sensitive (exam prep)',
    ],
  },

  adaptive: {
    mode: 'adaptive',
    systemPrompt: `You are an adaptive tutor. You adjust your teaching style based on student needs.

Adaptive Strategy:
- Start with Socratic questioning to assess understanding
- Switch to Direct if student is very stuck (after 2-3 questions)
- Use Supportive mode if student shows frustration
- Return to Socratic once student gains confidence

Decision Framework:
- First question: Socratic (assess understanding)
- If student struggles: Provide hint + Socratic question
- If student very stuck: Direct explanation + practice
- If student frustrated: Supportive + simpler problem

Always match the teaching style to the student's current needs.`,

    responseGuidelines: [
      'Assess student understanding first',
      'Start Socratic, switch to Direct if needed',
      'Provide hints before full explanations',
      'Build confidence gradually',
      'Adapt based on student responses',
    ],

    examples: [
      'Let me first check what you know about this...',
      'I see you\'re stuck. Let me give you a hint...',
      'You\'re on the right track! What\'s the next step?',
      'Let me explain this part, then you try the next one...',
    ],

    useCases: [
      'Default mode (most flexible)',
      'Mixed ability students',
      'Uncertain about student level',
      'Long tutoring sessions',
    ],
  },

  supportive: {
    mode: 'supportive',
    systemPrompt: `You are a supportive, encouraging tutor. Your goal is to build confidence while teaching.

Supportive Approach:
- Emphasize growth mindset ("You're getting better!")
- Celebrate small wins and effort
- Normalize mistakes as learning opportunities
- Break problems into very small, manageable steps
- Provide positive reinforcement frequently

Emotional Support:
- Acknowledge frustration: "This is tricky, and that's okay!"
- Praise effort: "I love how you're thinking about this!"
- Build confidence: "You can do this - let's take it one step at a time"

Remember: Emotional safety enables learning.`,

    responseGuidelines: [
      'Acknowledge feelings and frustration',
      'Celebrate effort and progress',
      'Break tasks into tiny steps',
      'Provide frequent positive feedback',
      'Normalize mistakes as learning',
    ],

    examples: [
      'That\'s a great attempt! You\'re thinking about this in the right way.',
      'This is a tough topic - it\'s completely normal to find it challenging.',
      'You\'re making progress! Let\'s try this smaller step first.',
      'Mistakes help us learn. What can we learn from this one?',
    ],

    useCases: [
      'Student shows frustration or anxiety',
      'Student has low confidence',
      'After repeated failures',
      'Younger students or beginners',
    ],
  },
};

/**
 * Recommend teaching mode based on context
 */
export function recommendMode(context: ModeContext): ModeRecommendation {
  const { intent, persona, struggleLevel = 0.5, questionsAsked = 0, previouslyStudied = false } = context;

  // Rule 1: If student explicitly asking for explanation → Direct
  if (intent === 'explain' || intent === 'general') {
    return {
      mode: 'direct',
      confidence: 0.9,
      reasoning: 'Student is asking for an explanation, direct teaching is most appropriate',
      fallback: 'adaptive',
    };
  }

  // Rule 2: If student is solving and not very stuck → Socratic
  if ((intent === 'solve' || intent === 'practice') && struggleLevel < 0.6) {
    return {
      mode: 'socratic',
      confidence: 0.85,
      reasoning: 'Student is problem-solving and capable - guide with questions',
      fallback: 'adaptive',
    };
  }

  // Rule 3: If student very stuck (high struggle) → Direct
  if (struggleLevel > 0.8 || questionsAsked > 3) {
    return {
      mode: 'direct',
      confidence: 0.9,
      reasoning: 'Student is very stuck or has asked many questions - provide clear explanation',
      fallback: 'supportive',
    };
  }

  // Rule 4: If student shows frustration/checking mistakes → Supportive
  if (intent === 'diagnose') {
    return {
      mode: 'supportive',
      confidence: 0.8,
      reasoning: 'Student is checking mistakes - provide supportive feedback',
      fallback: 'direct',
    };
  }

  // Rule 5: Exam prep or homework → Mix of Direct + Socratic
  if (intent === 'exam' || intent === 'homework') {
    return {
      mode: 'adaptive',
      confidence: 0.75,
      reasoning: 'Exam/homework requires both understanding and efficiency - use adaptive mode',
      fallback: 'direct',
    };
  }

  // Rule 6: For tutors/parents → Direct (they need quick, clear answers)
  if (persona === 'tutor' || persona === 'client') {
    return {
      mode: 'direct',
      confidence: 0.9,
      reasoning: 'Tutors and parents need clear, direct information to help their students',
      fallback: 'adaptive',
    };
  }

  // Default: Adaptive (safest for unknown contexts)
  return {
    mode: 'adaptive',
    confidence: 0.6,
    reasoning: 'Context unclear - using adaptive mode to adjust based on student responses',
    fallback: 'socratic',
  };
}

/**
 * Get system prompt enhancement for a teaching mode
 */
export function getSystemPrompt(mode: TeachingMode): string {
  return TEACHING_MODES[mode].systemPrompt;
}

/**
 * Get response guidelines for a teaching mode
 */
export function getResponseGuidelines(mode: TeachingMode): string[] {
  return TEACHING_MODES[mode].responseGuidelines;
}

/**
 * Generate Socratic questions based on topic and student message
 */
export function generateSocraticQuestions(topic: string, studentMessage: string): string[] {
  // These would be generated dynamically in production
  // For now, return template questions

  const questions: string[] = [];

  // Understanding check
  questions.push(`What do you already know about ${topic}?`);

  // Exploration
  questions.push(`What happens if you try working through this step by step?`);

  // Connection
  questions.push(`How is this similar to other problems you've solved?`);

  // Reflection
  questions.push(`What made you choose that approach?`);

  return questions;
}

/**
 * Estimate student struggle level from message
 * Returns 0-1 (0=confident, 1=very stuck)
 */
export function estimateStruggleLevel(message: string): number {
  const lower = message.toLowerCase();

  // Indicators of high struggle
  const struggleIndicators = [
    /i don't understand/i,
    /confused/i,
    /stuck/i,
    /help me/i,
    /i can't/i,
    /no idea/i,
    /don't know/i,
    /tried everything/i,
  ];

  // Indicators of confidence
  const confidenceIndicators = [
    /i think/i,
    /is this right/i,
    /check my/i,
    /got.*but/i,
  ];

  let struggleScore = 0.5; // Neutral

  for (const pattern of struggleIndicators) {
    if (pattern.test(lower)) {
      struggleScore += 0.15;
    }
  }

  for (const pattern of confidenceIndicators) {
    if (pattern.test(lower)) {
      struggleScore -= 0.1;
    }
  }

  return Math.max(0, Math.min(1, struggleScore));
}

/**
 * Format teaching mode context for logging
 */
export function formatModeContext(recommendation: ModeRecommendation): string {
  return `Teaching Mode: ${recommendation.mode} (confidence: ${(recommendation.confidence * 100).toFixed(0)}%) - ${recommendation.reasoning}`;
}
