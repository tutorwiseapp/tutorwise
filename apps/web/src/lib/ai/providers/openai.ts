/**
 * OpenAI GPT-4o Provider
 *
 * Fallback 4. Uses OpenAI SDK.
 * Required env: OPENAI_API_KEY
 *
 * @module lib/ai/providers/openai
 */

import OpenAI from 'openai';
import type { AIProvider, AIGenerateOptions, AIGenerateResult, AIStreamChunk } from '../types';

const MODEL = 'gpt-4o';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const;
  readonly displayName = 'OpenAI GPT-4o';

  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: (process.env.OPENAI_AI_API_KEY || process.env.OPENAI_API_KEY),
      });
    }
    return this.client;
  }

  isAvailable(): boolean {
    return !!(process.env.OPENAI_AI_API_KEY || process.env.OPENAI_API_KEY);
  }

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const client = this.getClient();

    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      ...(options.jsonMode && { response_format: { type: 'json_object' } }),
    });

    return {
      content: response.choices[0]?.message?.content || '',
      provider: 'openai',
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *stream(options: AIGenerateOptions): AsyncGenerator<AIStreamChunk> {
    const client = this.getClient();

    const stream = await client.chat.completions.create({
      model: MODEL,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      stream: true,
      ...(options.jsonMode && { response_format: { type: 'json_object' } }),
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield { content, done: false };
      }
    }
    yield { content: '', done: true };
  }
}
