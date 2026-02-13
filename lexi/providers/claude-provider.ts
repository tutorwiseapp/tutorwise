/**
 * Claude API Provider
 *
 * Uses Anthropic's Claude API for intelligent response generation.
 * Supports both streaming and non-streaming completions.
 *
 * Required environment variable: ANTHROPIC_API_KEY
 *
 * @module lexi/providers/claude-provider
 */

import { BaseLLMProvider, PERSONA_PROMPTS } from './base-provider';
import type {
  LLMProviderType,
  LLMProviderConfig,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
  LLMMessage,
} from './types';
import type { PersonaType, DetectedIntent, IntentCategory } from '../types';
import type { AgentContext } from '../../cas/packages/core/src/context';

// --- Constants ---

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.7;

// --- Claude Provider ---

export class ClaudeProvider extends BaseLLMProvider {
  readonly type: LLMProviderType = 'claude';
  readonly name = 'Claude (Anthropic)';

  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = config.model || DEFAULT_MODEL;
    this.maxTokens = config.maxTokens || DEFAULT_MAX_TOKENS;
    this.temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    if (!this.isAvailable()) {
      throw new Error('Claude API key not configured');
    }

    const { messages, persona, context } = request;

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt({
      persona,
      userName: context.user?.metadata?.displayName as string | undefined,
      userRole: context.user?.role,
      organisationName: context.user?.metadata?.organisationName as string | undefined,
      capabilities: this.getCapabilities(persona),
    });

    // Convert messages to Claude format
    const claudeMessages = this.convertMessages(messages);

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens || this.maxTokens,
          temperature: request.temperature ?? this.temperature,
          system: systemPrompt,
          messages: claudeMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.content[0]?.text || '';

      // Detect intent from response
      const intent = await this.detectIntent(
        messages[messages.length - 1]?.content || '',
        persona,
        context
      );

      return {
        content,
        intent,
        suggestions: this.extractSuggestions(content),
        usage: {
          promptTokens: data.usage?.input_tokens || 0,
          completionTokens: data.usage?.output_tokens || 0,
          totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        },
        finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
      };
    } catch (error) {
      console.error('[ClaudeProvider] API error:', error);
      throw error;
    }
  }

  async *stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk> {
    if (!this.isAvailable()) {
      throw new Error('Claude API key not configured');
    }

    const { messages, persona, context } = request;

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt({
      persona,
      userName: context.user?.metadata?.displayName as string | undefined,
      userRole: context.user?.role,
      organisationName: context.user?.metadata?.organisationName as string | undefined,
      capabilities: this.getCapabilities(persona),
    });

    // Convert messages to Claude format
    const claudeMessages = this.convertMessages(messages);

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens || this.maxTokens,
          temperature: request.temperature ?? this.temperature,
          system: systemPrompt,
          messages: claudeMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                const text = parsed.delta?.text || '';
                if (text) {
                  yield { content: text, done: false };
                }
              } else if (parsed.type === 'message_stop') {
                yield { content: '', done: true };
                return;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      console.error('[ClaudeProvider] Stream error:', error);
      throw error;
    }
  }

  async detectIntent(
    message: string,
    persona: PersonaType,
    context: AgentContext
  ): Promise<DetectedIntent> {
    // Use a quick classification prompt
    const classificationPrompt = `Classify the following user message into one of these categories:
- learning (homework help, explanations, lessons)
- scheduling (booking, canceling, rescheduling)
- resources (materials, documents, files)
- progress (analytics, reports, performance)
- billing (payments, invoices, pricing)
- support (help, problems, issues)
- feedback (reviews, ratings)
- general (greetings, other)

Also identify the specific action:
- learning: help, lesson, explain
- scheduling: book, modify, check
- resources: access, search, upload
- progress: view, analytics
- billing: view, pay
- support: request
- feedback: submit, view
- general: chat, greet

User message: "${message}"

Respond in JSON format only:
{"category": "...", "action": "...", "confidence": 0.0-1.0, "requiresConfirmation": true/false}`;

    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-20250514', // Use faster model for classification
          max_tokens: 100,
          temperature: 0,
          messages: [{ role: 'user', content: classificationPrompt }],
        }),
      });

      if (!response.ok) {
        throw new Error('Classification request failed');
      }

      const data = await response.json();
      const content = data.content[0]?.text || '';

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          category: parsed.category as IntentCategory,
          action: parsed.action,
          confidence: parsed.confidence || 0.8,
          entities: {},
          requiresConfirmation: parsed.requiresConfirmation || false,
        };
      }
    } catch (error) {
      console.error('[ClaudeProvider] Intent detection error:', error);
    }

    // Fallback to general
    return {
      category: 'general',
      action: 'chat',
      confidence: 0.5,
      entities: {},
      requiresConfirmation: false,
    };
  }

  // --- Private Methods ---

  private convertMessages(messages: LLMMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  private getCapabilities(persona: PersonaType): string[] {
    const capabilities: Record<PersonaType, string[]> = {
      student: ['homework help', 'lesson scheduling', 'progress tracking', 'resource access'],
      tutor: ['schedule management', 'student overview', 'resource creation', 'earnings tracking'],
      client: ['tutor search', 'booking management', 'progress monitoring', 'payment handling'],
      agent: ['user support', 'booking coordination', 'issue resolution', 'onboarding help'],
      organisation: ['tutor management', 'analytics dashboard', 'billing overview', 'settings management'],
    };
    return capabilities[persona] || [];
  }
}

export default ClaudeProvider;
