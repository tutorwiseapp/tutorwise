/**
 * DeepSeek R1 Provider
 *
 * Fallback 2. Uses OpenAI-compatible API.
 * Required env: DEEPSEEK_API_KEY
 *
 * @module lib/ai/providers/deepseek
 */

import OpenAI from 'openai';
import type { AIProvider, AIGenerateOptions, AIGenerateResult, AIStreamChunk } from '../types';

const MODEL = 'deepseek-reasoner';

export class DeepSeekProvider implements AIProvider {
  readonly name = 'deepseek' as const;
  readonly displayName = 'DeepSeek R1';

  private client: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        apiKey: (process.env.DEEPSEEK_AI_API_KEY || process.env.DEEPSEEK_API_KEY),
        baseURL: 'https://api.deepseek.com',
      });
    }
    return this.client;
  }

  isAvailable(): boolean {
    return !!(process.env.DEEPSEEK_AI_API_KEY || process.env.DEEPSEEK_API_KEY);
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
      provider: 'deepseek',
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
