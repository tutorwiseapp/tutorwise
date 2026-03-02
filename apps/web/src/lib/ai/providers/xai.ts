/**
 * xAI Grok 4 Fast Provider
 *
 * Primary AI provider. Uses OpenAI-compatible API.
 * Required env: XAI_AI_API_KEY or XAI_API_KEY
 *
 * @module lib/ai/providers/xai
 */

import OpenAI from 'openai';
import type { AIProvider, AIGenerateOptions, AIGenerateResult, AIStreamChunk } from '../types';

const MODEL = 'grok-4-1-fast-non-reasoning';

export class XAIProvider implements AIProvider {
  readonly name = 'xai' as const;
  readonly displayName = 'xAI Grok 4 Fast';

  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: (process.env.XAI_AI_API_KEY || process.env.XAI_API_KEY),
        baseURL: 'https://api.x.ai/v1',
      });
    }
    return this.client;
  }

  isAvailable(): boolean {
    return !!(process.env.XAI_AI_API_KEY || process.env.XAI_API_KEY);
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
      provider: 'xai',
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
