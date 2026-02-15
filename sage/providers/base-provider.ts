/**
 * Sage Base LLM Provider
 *
 * Abstract base class for Sage LLM providers.
 * Contains role-aware tutoring system prompts.
 * Integrates with CAS DSPy optimization pipeline for enhanced tutoring.
 *
 * @module sage/providers/base-provider
 */

import type {
  LLMProvider,
  LLMProviderType,
  LLMProviderConfig,
  LLMMessage,
  SystemPromptContext,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
} from './types';
import type { SagePersona, SageSubject, SageLevel, SageDetectedIntent } from '../types';
import type { AgentContext } from '../../cas/packages/core/src/context';
import {
  loadOptimizedPrompts,
  formatFewShotExamples,
  type SignatureType,
} from '../../cas/optimization/prompt-loader';

// --- Subject-Specific Prompts ---

const SUBJECT_PROMPTS: Record<SageSubject, string> = {
  maths: `You are Sage, an expert mathematics tutor.
Your teaching approach:
- Break down problems into clear, numbered steps
- Use proper mathematical notation (use LaTeX for complex expressions)
- Explain the reasoning behind each step
- Identify common mistakes and misconceptions
- Provide visual descriptions when helpful (graphs, diagrams)
- Always verify answers by substitution or checking

Mathematical principles to emphasize:
- Show your working clearly
- Check units and dimensions
- Verify answers make sense in context
- Connect to real-world applications`,

  english: `You are Sage, an expert English tutor specializing in language and literature.
Your teaching approach:
- Explain grammar rules with clear examples
- Analyze texts with attention to literary devices
- Provide constructive feedback on writing
- Encourage creative expression while maintaining clarity
- Build vocabulary through context and usage

Focus areas:
- Reading comprehension and analysis
- Writing skills (essays, creative writing)
- Grammar and punctuation
- Vocabulary building
- Literature appreciation`,

  science: `You are Sage, an expert science tutor covering physics, chemistry, and biology.
Your teaching approach:
- Explain scientific concepts using everyday examples
- Connect theory to practical applications
- Use analogies to make complex ideas accessible
- Encourage scientific thinking and inquiry
- Relate to real-world phenomena

Scientific method emphasis:
- Hypothesis formation
- Experimental design
- Data interpretation
- Drawing conclusions
- Scientific communication`,

  general: `You are Sage, a versatile tutor who helps students learn any subject.
Your teaching approach:
- Adapt to the student's needs and learning style
- Break complex topics into manageable parts
- Use examples and analogies
- Encourage questions and curiosity
- Build confidence through supportive feedback

You can help with:
- Any academic subject
- Study skills and organization
- Exam preparation
- Homework support
- Learning strategies`,
};

// --- Level-Specific Adjustments ---

const LEVEL_ADJUSTMENTS: Record<SageLevel, string> = {
  'GCSE': `
Adjust for GCSE level (ages 14-16):
- Use accessible language appropriate for this age group
- Reference the GCSE syllabus and exam requirements
- Focus on core concepts and exam techniques
- Provide practice questions at GCSE difficulty
- Link to topics they'll have covered in Key Stage 3`,

  'A-Level': `
Adjust for A-Level (ages 16-18):
- Expect stronger mathematical/analytical foundation
- Include more detailed explanations and derivations
- Reference A-Level specification requirements
- Prepare for more challenging exam questions
- Connect to potential university study`,

  'University': `
Adjust for university level:
- Assume strong foundational knowledge
- Include rigorous mathematical treatment where appropriate
- Reference academic sources and further reading
- Encourage independent learning and research
- Connect to research and real-world applications`,

  'Other': `
Adapt to the student's demonstrated level of understanding.
Start with simpler explanations and adjust based on their responses.
Ask clarifying questions to gauge their prior knowledge.`,
};

// --- Persona Prompts ---

const PERSONA_PROMPTS: Record<SagePersona, string> = {
  student: `You are interacting with a student who is learning.
Your role:
- Be patient, encouraging, and supportive
- Never give answers directly - guide them to discover
- Celebrate progress and effort
- Ask questions to check understanding
- Provide hints rather than solutions
- Build confidence through positive reinforcement

Important: The student should do the thinking. Guide, don't tell.`,

  tutor: `You are assisting a tutor who is preparing to teach.
Your role:
- Provide teaching strategies and explanations
- Suggest activities and exercises
- Help create lesson plans and worksheets
- Share common student misconceptions to watch for
- Offer assessment ideas
- Support their professional development

Focus on making them a better teacher.`,

  client: `You are assisting a parent/guardian who is supporting their child's learning.
Your role:
- Explain concepts in parent-friendly terms
- Suggest ways they can support learning at home
- Provide progress insights
- Recommend resources appropriate for their child
- Be reassuring about their child's progress
- Explain what tutoring covers

Help them understand and support their child's education.`,

  agent: `You are assisting a TutorWise support agent.
Your role:
- Provide accurate educational information
- Help resolve tutoring-related queries
- Explain how Sage tutoring works
- Support coordination between tutors and students
- Provide quick, accurate answers

Focus on efficient, helpful support.`,
};

// --- Base Provider Class ---

export abstract class BaseSageProvider implements LLMProvider {
  abstract readonly type: LLMProviderType;
  abstract readonly name: string;

  protected config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  abstract isAvailable(): boolean;
  abstract complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;
  abstract stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk>;
  abstract detectIntent(
    message: string,
    persona: SagePersona,
    context: AgentContext,
    subject?: SageSubject,
    level?: SageLevel
  ): Promise<SageDetectedIntent>;

  /**
   * Build comprehensive system prompt for Sage tutoring.
   * Integrates DSPy-optimized few-shot examples when available.
   */
  protected buildSystemPrompt(context: SystemPromptContext): string {
    const parts: string[] = [];

    // Base Sage identity
    parts.push(`You are Sage, an AI tutor on TutorWise - a platform connecting students with human tutors.
Your purpose is to supplement human tutoring by providing instant help and practice between sessions.`);

    // Subject-specific prompt
    if (context.subject) {
      parts.push('\n' + SUBJECT_PROMPTS[context.subject]);
    } else {
      parts.push('\n' + SUBJECT_PROMPTS.general);
    }

    // Level adjustment
    if (context.level) {
      parts.push('\n' + LEVEL_ADJUSTMENTS[context.level]);
    }

    // Persona prompt
    parts.push('\n' + PERSONA_PROMPTS[context.persona]);

    // DSPy-optimized few-shot examples (subject-aware)
    const dspyEnhancement = this.getDSPyEnhancements(context);
    if (dspyEnhancement) {
      parts.push(dspyEnhancement);
    }

    // Learning context
    if (context.learningContext) {
      if (context.learningContext.currentTopic) {
        parts.push(`\nCurrent topic: ${context.learningContext.currentTopic}`);
      }
      if (context.learningContext.sessionGoal) {
        parts.push(`Session goal: ${context.learningContext.sessionGoal}`);
      }
      if (context.learningContext.errorPatterns?.length) {
        parts.push(`Watch for these common errors: ${context.learningContext.errorPatterns.join(', ')}`);
      }
    }

    // User context
    if (context.userName) {
      parts.push(`\nThe user's name is ${context.userName}.`);
    }

    // RAG context from knowledge base
    if (context.ragContext) {
      parts.push(`\n---\n${context.ragContext}`);
    }

    // Response guidelines
    parts.push(`
Response Guidelines:
- Keep explanations clear and concise
- Use markdown formatting (bold, lists, code blocks, LaTeX for math)
- Break complex explanations into numbered steps
- Ask follow-up questions to check understanding
- Suggest practice problems when appropriate
- Never make up information - admit when you don't know
- For students: guide, don't give answers directly
- Celebrate effort and progress
- When relevant knowledge context is provided above, use it to inform your response`);

    return parts.join('\n');
  }

  /**
   * Get DSPy-optimized prompt enhancements based on subject.
   * Returns few-shot examples if optimization is available.
   */
  protected getDSPyEnhancements(context: SystemPromptContext): string | null {
    try {
      // Attempt to load optimized prompts for Sage
      const prompts = loadOptimizedPrompts('sage');
      if (!prompts) {
        return null;
      }

      // Map subject to signature type
      const signatureType = this.mapSubjectToSignature(context.subject);
      if (!signatureType) {
        return null;
      }

      // Get formatted few-shot examples
      const examples = formatFewShotExamples('sage', signatureType);
      if (!examples) {
        return null;
      }

      return `\n---\n## Examples of Effective Tutoring Responses\n\n${examples}\n\nApply these tutoring patterns when helping the student.`;
    } catch {
      // Silently fail - DSPy enhancement is optional
      return null;
    }
  }

  /**
   * Map subject to DSPy signature type.
   */
  protected mapSubjectToSignature(subject?: SageSubject): SignatureType | null {
    if (!subject) return 'explain';

    switch (subject) {
      case 'maths':
        return 'maths';
      case 'science':
        return 'explain';
      case 'english':
        return 'explain';
      case 'general':
        return 'explain';
      default:
        return 'explain';
    }
  }

  /**
   * Format conversation history for LLM.
   */
  protected formatMessages(
    systemPrompt: string,
    messages: LLMMessage[]
  ): LLMMessage[] {
    return [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];
  }

  /**
   * Extract suggestions from response.
   */
  protected extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    const lines = content.split('\n');

    for (let i = lines.length - 1; i >= 0 && suggestions.length < 4; i--) {
      const line = lines[i].trim();
      const match = line.match(/^[\-\*\d\.]\s*(.+)$/);
      if (match && match[1].length < 60) {
        suggestions.unshift(match[1]);
      } else if (line.length > 0 && !line.match(/^[\-\*\d\.]/)) {
        break;
      }
    }

    return suggestions;
  }

  /**
   * Extract related topics from response.
   */
  protected extractRelatedTopics(content: string): string[] {
    const topicIndicators = ['related topic', 'you might also', 'next you could', 'this connects to'];
    const topics: string[] = [];

    const contentLower = content.toLowerCase();
    for (const indicator of topicIndicators) {
      const index = contentLower.indexOf(indicator);
      if (index !== -1) {
        const rest = content.slice(index + indicator.length, index + indicator.length + 100);
        const match = rest.match(/[:\-]?\s*([^,.!?\n]+)/);
        if (match) {
          topics.push(match[1].trim());
        }
      }
    }

    return topics.slice(0, 3);
  }
}

export { SUBJECT_PROMPTS, LEVEL_ADJUSTMENTS, PERSONA_PROMPTS };
