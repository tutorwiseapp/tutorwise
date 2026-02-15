/**
 * Sage Gemini API Provider
 *
 * Uses Google's Gemini API for intelligent tutoring responses.
 * Supports both streaming and non-streaming completions.
 *
 * Required environment variable: GOOGLE_AI_API_KEY
 *
 * @module sage/providers/gemini-provider
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

// --- Constants ---

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-1.5-flash';
const DEFAULT_MAX_TOKENS = 2048; // Higher for tutoring explanations
const DEFAULT_TEMPERATURE = 0.7;

// --- Gemini Provider ---

export class SageGeminiProvider extends BaseSageProvider {
  readonly type: LLMProviderType = 'gemini';
  readonly name = 'Sage Gemini (Google)';

  private apiKey: string;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: LLMProviderConfig) {
    super(config);
    this.apiKey = config.apiKey || process.env.GOOGLE_AI_API_KEY || '';
    this.model = config.model || DEFAULT_MODEL;
    this.maxTokens = config.maxTokens || DEFAULT_MAX_TOKENS;
    this.temperature = config.temperature ?? DEFAULT_TEMPERATURE;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key not configured');
    }

    const { messages, persona, subject, level, context, topic, ragContext } = request;

    // Build system prompt with tutoring context
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

    // Convert messages to Gemini format
    const geminiContents = this.convertMessages(messages, systemPrompt);

    const url = `${GEMINI_API_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: this.maxTokens,
            temperature: this.temperature,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        content,
        suggestions: this.extractSuggestions(content),
        relatedTopics: this.extractRelatedTopics(content),
        metadata: {
          provider: 'gemini',
          model: this.model,
          usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0,
          },
        },
      };
    } catch (error) {
      console.error('[SageGeminiProvider] API error:', error);
      throw error;
    }
  }

  async *stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key not configured');
    }

    const { messages, persona, subject, level, context, topic, ragContext } = request;

    // Build system prompt
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

    // Convert messages to Gemini format
    const geminiContents = this.convertMessages(messages, systemPrompt);

    const url = `${GEMINI_API_BASE}/models/${this.model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: this.maxTokens,
            temperature: this.temperature,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
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
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                yield { content: text, done: false };
              }

              if (parsed.candidates?.[0]?.finishReason === 'STOP') {
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
      console.error('[SageGeminiProvider] Stream error:', error);
      throw error;
    }
  }

  async detectIntent(
    message: string,
    persona: SagePersona,
    context: AgentContext,
    subject?: SageSubject,
    level?: SageLevel
  ): Promise<SageDetectedIntent> {
    // Use a quick classification prompt for tutoring intents
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

    const url = `${GEMINI_API_BASE}/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: classificationPrompt }] }],
          generationConfig: {
            maxOutputTokens: 150,
            temperature: 0,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Classification request failed');
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse JSON response
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
      console.error('[SageGeminiProvider] Intent detection error:', error);
    }

    // Fallback to general
    return {
      category: 'general',
      action: 'chat',
      confidence: 0.5,
      entities: {
        subject,
        level,
      },
      requiresConfirmation: false,
    };
  }

  // --- Private Methods ---

  private convertMessages(
    messages: LLMMessage[],
    systemPrompt: string
  ): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Add system prompt as first user message (Gemini doesn't have system role)
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: `System instructions for Sage AI Tutor:\n\n${systemPrompt}\n\nPlease acknowledge these tutoring guidelines.` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'I understand. I am Sage, your AI tutor. I will follow these guidelines to help you learn effectively. How can I help you today?' }],
      });
    }

    // Add conversation messages
    for (const msg of messages) {
      if (msg.role === 'system') continue;

      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    return contents;
  }

  private getCapabilities(persona: SagePersona, subject?: SageSubject): string[] {
    const baseCapabilities: Record<SagePersona, string[]> = {
      student: [
        'explain concepts step-by-step',
        'help with homework',
        'provide practice problems',
        'check understanding with questions',
        'track progress',
      ],
      tutor: [
        'create lesson plans',
        'generate worksheets',
        'suggest teaching strategies',
        'identify student misconceptions',
        'provide assessment ideas',
      ],
      client: [
        'explain progress reports',
        'suggest home learning activities',
        'overview curriculum topics',
        'answer questions about tutoring',
      ],
      agent: [
        'answer educational queries',
        'explain tutoring programs',
        'support user queries',
        'coordinate learning support',
      ],
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

export default SageGeminiProvider;
