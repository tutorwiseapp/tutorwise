/**
 * OpenAI GPT-4o Provider for Lexi
 *
 * Fallback 4. Uses OpenAI API.
 * Required environment variable: OPENAI_API_KEY
 *
 * @module lexi/providers/openai-provider
 */

import { BaseLLMProvider } from './base-provider';
import type {
  LLMProviderType,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
  LLMMessage,
} from './types';
import type { PersonaType, DetectedIntent, IntentCategory } from '../types';
import type { AgentContext } from '../../cas/packages/core/src/context';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.7;

export class OpenAILLMProvider extends BaseLLMProvider {
  readonly type: LLMProviderType = 'openai' as LLMProviderType;
  readonly name = 'OpenAI GPT-4o';

  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: import('./types').LLMProviderConfig) {
    super(config);
    this.apiKey = config.apiKey || process.env.OPENAI_AI_API_KEY || process.env.OPENAI_API_KEY || '';
    this.model = config.model || DEFAULT_MODEL;
    this.maxTokens = config.maxTokens || DEFAULT_MAX_TOKENS;
    this.temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    const { messages, persona, context } = request;

    const systemPrompt = this.buildSystemPrompt({
      persona,
      userName: context.user?.metadata?.displayName as string | undefined,
      userRole: context.user?.role,
      organisationName: context.user?.metadata?.organisationName as string | undefined,
      capabilities: this.getCapabilities(persona),
      ragContext: request.ragContext,
    });

    const openaiMessages = this.convertMessages(systemPrompt, messages);

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens || this.maxTokens,
          temperature: request.temperature ?? this.temperature,
          messages: openaiMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

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
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        finishReason: data.choices?.[0]?.finish_reason === 'stop' ? 'stop' : 'length',
      };
    } catch (error) {
      console.error('[OpenAIProvider] API error:', error);
      throw error;
    }
  }

  async *stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    const { messages, persona, context } = request;

    const systemPrompt = this.buildSystemPrompt({
      persona,
      userName: context.user?.metadata?.displayName as string | undefined,
      userRole: context.user?.role,
      organisationName: context.user?.metadata?.organisationName as string | undefined,
      capabilities: this.getCapabilities(persona),
      ragContext: request.ragContext,
    });

    const openaiMessages = this.convertMessages(systemPrompt, messages);

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens || this.maxTokens,
          temperature: request.temperature ?? this.temperature,
          messages: openaiMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
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
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const text = parsed.choices?.[0]?.delta?.content || '';
              if (text) {
                yield { content: text, done: false };
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      yield { content: '', done: true };
    } catch (error) {
      console.error('[OpenAIProvider] Stream error:', error);
      throw error;
    }
  }

  async detectIntent(
    message: string,
    persona: PersonaType,
    _context: AgentContext
  ): Promise<DetectedIntent> {
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
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 100,
          temperature: 0,
          messages: [{ role: 'user', content: classificationPrompt }],
        }),
      });

      if (!response.ok) {
        throw new Error('Classification request failed');
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

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
      console.error('[OpenAIProvider] Intent detection error:', error);
    }

    return {
      category: 'general',
      action: 'chat',
      confidence: 0.5,
      entities: {},
      requiresConfirmation: false,
    };
  }

  private convertMessages(
    systemPrompt: string,
    messages: LLMMessage[]
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    return [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    ];
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

export default OpenAILLMProvider;
