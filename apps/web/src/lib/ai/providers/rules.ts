/**
 * Rules-Based Provider
 *
 * Last-resort fallback (fallback 5). No API calls.
 * Returns a generic error/fallback message when all AI providers fail.
 *
 * @module lib/ai/providers/rules
 */

import type { AIProvider, AIGenerateOptions, AIGenerateResult, AIStreamChunk } from '../types';

export class RulesProvider implements AIProvider {
  readonly name = 'rules' as const;
  readonly displayName = 'Rules-Based (Offline)';

  isAvailable(): boolean {
    return true; // Always available
  }

  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const content = options.jsonMode
      ? '{"error": "AI service temporarily unavailable. Please try again shortly."}'
      : 'I apologise, but the AI service is temporarily unavailable. Please try again in a moment.';

    return {
      content,
      provider: 'rules',
    };
  }

  async *stream(options: AIGenerateOptions): AsyncGenerator<AIStreamChunk> {
    const content = options.jsonMode
      ? '{"error": "AI service temporarily unavailable. Please try again shortly."}'
      : 'I apologise, but the AI service is temporarily unavailable. Please try again in a moment.';

    yield { content, done: false };
    yield { content: '', done: true };
  }
}
