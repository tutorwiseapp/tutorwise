/**
 * Sage OpenAI GPT-4o Provider
 *
 * Fallback 4. Uses OpenAI API.
 * Required environment variable: OPENAI_API_KEY
 *
 * @module sage/providers/openai-provider
 */

import { BaseSageProvider } from './base-provider';
import type {
  LLMProviderType,
  LLMProviderConfig,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
  LLMMessage,
} from './types';
import type {
  SagePersona,
  SageSubject,
  SageLevel,
  SageDetectedIntent,
  SageIntentCategory,
} from '../types';
import type { AgentContext } from '../../cas/packages/core/src/context';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.7;

export class SageOpenAIProvider extends BaseSageProvider {
  readonly type: LLMProviderType = 'openai' as LLMProviderType;
  readonly name = 'Sage OpenAI GPT-4o';

  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: LLMProviderConfig) {
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

    const { messages, persona, subject, level, context, topic, ragContext } = request;

    const systemPrompt = this.buildSystemPrompt({
      persona,
      subject,
      level,
      topic,
      userName: context.user?.metadata?.displayName as string | undefined,
      organisationName: context.user?.metadata?.organisationName as string | undefined,
      capabilities: this.getCapabilities(persona, subject),
      learningContext: request.intent?.entities?.topic
        ? { currentTopic: request.intent.entities.topic }
        : undefined,
      ragContext,
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
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          messages: openaiMessages,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      return {
        content,
        suggestions: this.extractSuggestions(content),
        relatedTopics: this.extractRelatedTopics(content),
        metadata: {
          provider: 'openai',
          model: this.model,
          usage: {
            promptTokens: data.usage?.prompt_tokens || 0,
            completionTokens: data.usage?.completion_tokens || 0,
            totalTokens: data.usage?.total_tokens || 0,
          },
        },
      };
    } catch (error) {
      console.error('[SageOpenAIProvider] API error:', error);
      throw error;
    }
  }

  async *stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI API key not configured');
    }

    const { messages, persona, subject, level, context, topic, ragContext } = request;

    const systemPrompt = this.buildSystemPrompt({
      persona,
      subject,
      level,
      topic,
      userName: context.user?.metadata?.displayName as string | undefined,
      organisationName: context.user?.metadata?.organisationName as string | undefined,
      capabilities: this.getCapabilities(persona, subject),
      ragContext,
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
          max_tokens: this.maxTokens,
          temperature: this.temperature,
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
      console.error('[SageOpenAIProvider] Stream error:', error);
      throw error;
    }
  }

  async detectIntent(
    message: string,
    persona: SagePersona,
    _context: AgentContext,
    subject?: SageSubject,
    level?: SageLevel
  ): Promise<SageDetectedIntent> {
    const classificationPrompt = `Classify this message from a ${persona} in an educational tutoring context.

Categories:
- explain: Wants a concept explained
- solve: Needs help solving a problem
- practice: Wants practice exercises
- diagnose: Asking why something is wrong
- review: Reviewing material
- homework: Homework help
- exam: Exam preparation
- resources: Finding resources
- progress: Checking progress
- general: General conversation/greeting

Also identify:
- topic: What topic is being discussed (e.g., "quadratic equations", "grammar")
- subject: maths, english, science, or general
- level: GCSE, A-Level, University, or Other

Message: "${message}"

Respond in JSON only:
{"category": "...", "action": "...", "confidence": 0.0-1.0, "topic": "...", "subject": "...", "level": "...", "requiresConfirmation": false}`;

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 150,
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
          category: parsed.category as SageIntentCategory,
          action: parsed.action || parsed.category,
          confidence: parsed.confidence || 0.8,
          entities: {
            topic: parsed.topic,
            subject: (parsed.subject || subject) as SageSubject | undefined,
            level: (parsed.level || level) as SageLevel | undefined,
          },
          requiresConfirmation: parsed.requiresConfirmation || false,
        };
      }
    } catch (error) {
      console.error('[SageOpenAIProvider] Intent detection error:', error);
    }

    return {
      category: 'general',
      action: 'chat',
      confidence: 0.5,
      entities: { subject, level },
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

  private getCapabilities(persona: SagePersona, subject?: SageSubject): string[] {
    const baseCapabilities: Record<SagePersona, string[]> = {
      student: ['explain concepts step-by-step', 'help with homework', 'provide practice problems', 'check understanding with questions', 'track progress'],
      tutor: ['create lesson plans', 'generate worksheets', 'suggest teaching strategies', 'identify student misconceptions', 'provide assessment ideas'],
      client: ['explain progress reports', 'suggest home learning activities', 'overview curriculum topics', 'answer questions about tutoring'],
      agent: ['answer educational queries', 'explain tutoring programs', 'support user queries', 'coordinate learning support'],
    };

    const subjectCapabilities: Record<SageSubject, string[]> = {
      maths: ['solve equations', 'explain mathematical proofs', 'graph functions', 'work through word problems'],
      english: ['improve writing', 'analyze literature', 'correct grammar', 'expand vocabulary'],
      science: ['explain experiments', 'connect theory to practice', 'interpret data', 'understand scientific method'],
      general: ['help with any subject', 'teach study skills', 'prepare for exams'],
    };

    return [
      ...baseCapabilities[persona],
      ...(subject ? subjectCapabilities[subject] : subjectCapabilities.general),
    ];
  }
}

export default SageOpenAIProvider;
