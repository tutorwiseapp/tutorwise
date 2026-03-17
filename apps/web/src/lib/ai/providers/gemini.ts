/**
 * Google Gemini Flash Provider
 *
 * Fallback 1. Uses @google/generative-ai SDK.
 * Required env: GOOGLE_AI_API_KEY
 *
 * @module lib/ai/providers/gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider, AIGenerateOptions, AIGenerateResult, AIStreamChunk } from '../types';

const MODEL = 'gemini-2.0-flash';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;
  readonly displayName = 'Google Gemini Flash';

  private client: GoogleGenerativeAI | null = null;

  private getClient(): GoogleGenerativeAI {
    if (!this.client) {
      this.client = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);
    }
    return this.client;
  }

  isAvailable(): boolean {
    return !!process.env.GOOGLE_AI_API_KEY;
  }

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const client = this.getClient();

    const model = client.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens ?? 2048,
        ...(options.jsonMode && { responseMimeType: 'application/json' }),
      },
    });

    const result = await model.generateContent([
      { text: options.systemPrompt },
      { text: options.userPrompt },
    ]);

    return {
      content: result.response.text(),
      provider: 'gemini',
    };
  }

  async *stream(options: AIGenerateOptions): AsyncGenerator<AIStreamChunk> {
    const client = this.getClient();

    const model = client.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxTokens ?? 2048,
        ...(options.jsonMode && { responseMimeType: 'application/json' }),
      },
    });

    const result = await model.generateContentStream([
      { text: options.systemPrompt },
      { text: options.userPrompt },
    ]);

    for await (const chunk of result.stream) {
      try {
        const content = chunk.text();
        if (content) {
          yield { content, done: false };
        }
      } catch (chunkErr) {
        console.warn('[GeminiProvider] Chunk parse error, skipping:', chunkErr instanceof Error ? chunkErr.message : chunkErr);
      }
    }
    yield { content: '', done: true };
  }
}
