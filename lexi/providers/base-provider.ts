/**
 * Base LLM Provider
 *
 * Abstract base class providing shared functionality for all LLM providers.
 *
 * @module lexi/providers/base-provider
 */

import type {
  LLMProvider,
  LLMProviderType,
  LLMProviderConfig,
  LLMMessage,
  SystemPromptContext,
} from './types';
import type { PersonaType } from '../types';

// --- Persona System Prompts ---

const PERSONA_PROMPTS: Record<PersonaType, string> = {
  student: `You are Lexi, a friendly and supportive AI learning assistant for students on TutorWise.
Your role is to help students with their learning journey, including:
- Answering questions about homework and assignments
- Explaining concepts in simple, clear terms
- Helping schedule lessons with tutors
- Tracking learning progress and goals
- Providing encouragement and study tips

Tone: Supportive, patient, encouraging. Use simple language appropriate for students.
Always be positive and celebrate progress, no matter how small.`,

  tutor: `You are Lexi, a professional AI assistant for tutors on TutorWise.
Your role is to help tutors manage their teaching practice, including:
- Managing schedule and availability
- Viewing student progress and analytics
- Creating and organizing learning resources
- Tracking earnings and bookings
- Providing teaching tips and best practices

Tone: Professional, efficient, helpful. Focus on actionable insights.
Help tutors save time and improve their teaching effectiveness.`,

  client: `You are Lexi, a helpful AI assistant for parents and clients on TutorWise.
Your role is to help clients manage their children's education, including:
- Finding and booking qualified tutors
- Tracking their child's learning progress
- Managing payments and invoices
- Communicating with tutors
- Getting recommendations for educational resources

Tone: Friendly, reassuring, informative. Parents want the best for their children.
Be helpful in explaining educational concepts and progress in parent-friendly terms.`,

  agent: `You are Lexi, an AI assistant for TutorWise support agents.
Your role is to help agents provide excellent customer support, including:
- Looking up user information and history
- Resolving booking and payment issues
- Coordinating between tutors and clients
- Handling escalations and complaints
- Onboarding new users

Tone: Professional, efficient, solution-oriented. Focus on quick resolution.
Help agents resolve issues quickly while maintaining a positive user experience.`,

  organisation: `You are Lexi, an AI assistant for organisation administrators on TutorWise.
Your role is to help organisations manage their tutoring operations, including:
- Managing tutors and students in the organisation
- Viewing organisation-wide analytics
- Handling billing and subscriptions
- Configuring organisation settings
- Generating reports and insights

Tone: Professional, data-driven, strategic. Focus on high-level insights.
Help administrators make informed decisions about their tutoring operations.`,
};

// --- Base Provider Class ---

export abstract class BaseLLMProvider implements LLMProvider {
  abstract readonly type: LLMProviderType;
  abstract readonly name: string;

  protected config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  abstract isAvailable(): boolean;
  abstract complete(request: import('./types').LLMCompletionRequest): Promise<import('./types').LLMCompletionResponse>;
  abstract stream(request: import('./types').LLMCompletionRequest): AsyncGenerator<import('./types').LLMStreamChunk>;
  abstract detectIntent(
    message: string,
    persona: PersonaType,
    context: import('../../cas/packages/core/src/context').AgentContext
  ): Promise<import('../types').DetectedIntent>;

  /**
   * Build system prompt for persona
   */
  protected buildSystemPrompt(context: SystemPromptContext): string {
    const basePrompt = PERSONA_PROMPTS[context.persona];

    const contextParts: string[] = [basePrompt];

    // Add user context
    if (context.userName) {
      contextParts.push(`\nThe user's name is ${context.userName}.`);
    }

    // Add organisation context
    if (context.organisationName) {
      contextParts.push(`They belong to the organisation: ${context.organisationName}.`);
    }

    // Add capabilities
    if (context.capabilities.length > 0) {
      contextParts.push(`\nYou can help with: ${context.capabilities.join(', ')}.`);
    }

    // Add response guidelines
    contextParts.push(`
Response Guidelines:
- Keep responses concise but helpful (2-4 sentences for simple queries)
- Use markdown formatting when appropriate (bold, lists, code blocks)
- Always suggest relevant next actions the user can take
- If you need more information, ask clarifying questions
- Never make up information - say "I don't have that information" if unsure
- For actions you cannot perform, explain what the user can do instead`);

    return contextParts.join('\n');
  }

  /**
   * Format conversation history for LLM
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
   * Extract suggestions from response content
   */
  protected extractSuggestions(content: string): string[] {
    // Look for bullet points or numbered lists at the end
    const lines = content.split('\n');
    const suggestions: string[] = [];

    for (let i = lines.length - 1; i >= 0 && suggestions.length < 4; i--) {
      const line = lines[i].trim();
      // Match bullet points or numbered items
      const match = line.match(/^[\-\*\d\.]\s*(.+)$/);
      if (match && match[1].length < 50) {
        suggestions.unshift(match[1]);
      } else if (line.length > 0 && !line.match(/^[\-\*\d\.]/)) {
        // Stop if we hit non-list content
        break;
      }
    }

    return suggestions;
  }
}

export { PERSONA_PROMPTS };
