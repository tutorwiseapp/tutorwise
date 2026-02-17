/**
 * Gemini API Provider
 *
 * Uses Google's Gemini API for intelligent response generation.
 * Supports both streaming and non-streaming completions.
 *
 * Required environment variable: GOOGLE_AI_API_KEY
 *
 * @module lexi/providers/gemini-provider
 */

import { BaseLLMProvider } from './base-provider';
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
import type { Tool, ToolCall } from '../tools/types';

// --- Constants ---

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.7;

// --- Gemini Provider ---

export class GeminiProvider extends BaseLLMProvider {
  readonly type: LLMProviderType = 'gemini';
  readonly name = 'Gemini (Google)';

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

    const { messages, persona, context } = request;

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt({
      persona,
      userName: context.user?.metadata?.displayName as string | undefined,
      userRole: context.user?.role,
      organisationName: context.user?.metadata?.organisationName as string | undefined,
      capabilities: this.getCapabilities(persona),
      ragContext: request.ragContext,
    });

    // Convert messages to Gemini format
    const geminiContents = this.convertMessages(messages, systemPrompt);

    const url = `${GEMINI_API_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;

    // Build request body
    const requestBody: Record<string, unknown> = {
      contents: geminiContents,
      generationConfig: {
        maxOutputTokens: request.maxTokens || this.maxTokens,
        temperature: request.temperature ?? this.temperature,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    };

    // Add tools if provided (Gemini function calling)
    if (request.tools && request.tools.length > 0) {
      requestBody.tools = this.convertToolsToGeminiFormat(request.tools);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const part = data.candidates?.[0]?.content?.parts?.[0];

      // Check for function call response (tool calling)
      if (part?.functionCall) {
        const toolCall: ToolCall = {
          id: `call_${Date.now()}`,
          type: 'function',
          function: {
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args || {}),
          },
        };

        return {
          content: '',
          toolCalls: [toolCall],
          finishReason: 'tool_call',
          usage: {
            promptTokens: data.usageMetadata?.promptTokenCount || 0,
            completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata?.totalTokenCount || 0,
          },
        };
      }

      // Standard text response
      const content = part?.text || '';

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
          promptTokens: data.usageMetadata?.promptTokenCount || 0,
          completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: data.usageMetadata?.totalTokenCount || 0,
        },
        finishReason: data.candidates?.[0]?.finishReason === 'STOP' ? 'stop' : 'length',
      };
    } catch (error) {
      console.error('[GeminiProvider] API error:', error);
      throw error;
    }
  }

  async *stream(request: LLMCompletionRequest): AsyncGenerator<LLMStreamChunk> {
    if (!this.isAvailable()) {
      throw new Error('Gemini API key not configured');
    }

    const { messages, persona, context } = request;

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt({
      persona,
      userName: context.user?.metadata?.displayName as string | undefined,
      userRole: context.user?.role,
      organisationName: context.user?.metadata?.organisationName as string | undefined,
      capabilities: this.getCapabilities(persona),
      ragContext: request.ragContext,
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
            maxOutputTokens: request.maxTokens || this.maxTokens,
            temperature: request.temperature ?? this.temperature,
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
      console.error('[GeminiProvider] Stream error:', error);
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
            maxOutputTokens: 100,
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
          category: parsed.category as IntentCategory,
          action: parsed.action,
          confidence: parsed.confidence || 0.8,
          entities: {},
          requiresConfirmation: parsed.requiresConfirmation || false,
        };
      }
    } catch (error) {
      console.error('[GeminiProvider] Intent detection error:', error);
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

  private convertToolsToGeminiFormat(tools: Tool[]): Array<{ functionDeclarations: Array<{ name: string; description: string; parameters: unknown }> }> {
    return [{
      functionDeclarations: tools.map(t => ({
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      })),
    }];
  }

  private convertMessages(
    messages: LLMMessage[],
    systemPrompt: string
  ): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Add system prompt as first user message (Gemini doesn't have system role)
    if (systemPrompt) {
      contents.push({
        role: 'user',
        parts: [{ text: `System instructions: ${systemPrompt}\n\nPlease acknowledge you understand these instructions.` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'I understand. I will follow these instructions and assist accordingly.' }],
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

export default GeminiProvider;
