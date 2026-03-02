/**
 * Anthropic Claude Sonnet 4.6 Provider
 *
 * Fallback 3. Uses @anthropic-ai/sdk.
 * Required env: ANTHROPIC_API_KEY
 *
 * @module lib/ai/providers/claude
 */

import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIGenerateOptions, AIGenerateResult, AIStreamChunk } from '../types';

const MODEL = 'claude-sonnet-4-6-20250929';

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude' as const;
  readonly displayName = 'Anthropic Claude Sonnet 4.6';

  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic({
        apiKey: (process.env.ANTHROPIC_AI_API_KEY || process.env.ANTHROPIC_API_KEY),
      });
    }
    return this.client;
  }

  isAvailable(): boolean {
    return !!(process.env.ANTHROPIC_AI_API_KEY || process.env.ANTHROPIC_API_KEY);
  }

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const client = this.getClient();

    const systemPrompt = options.jsonMode
      ? `${options.systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation — just the JSON object.`
      : options.systemPrompt;

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: options.userPrompt }],
    });

    const content =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    return {
      content,
      provider: 'claude',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  async *stream(options: AIGenerateOptions): AsyncGenerator<AIStreamChunk> {
    const client = this.getClient();

    const systemPrompt = options.jsonMode
      ? `${options.systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation — just the JSON object.`
      : options.systemPrompt;

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: options.userPrompt }],
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield { content: event.delta.text, done: false };
      }
    }
    yield { content: '', done: true };
  }
}
