/**
 * Unified AI Service
 *
 * Provides a single entry point for all AI generation across the platform.
 * Automatically falls through the provider chain on failure.
 *
 * Chain order:
 * 1. xAI Grok 4 Fast (primary)
 * 2. Google Gemini Flash (fallback 1)
 * 3. DeepSeek R1 (fallback 2)
 * 4. Anthropic Claude Sonnet 4.6 (fallback 3)
 * 5. OpenAI GPT-4o (fallback 4)
 * 6. Rules-based (fallback 5)
 *
 * @module lib/ai
 */

import type { AIProvider, AIProviderName, AIGenerateOptions, AIGenerateResult, AIStreamChunk } from './types';
import { XAIProvider } from './providers/xai';
import { GeminiProvider } from './providers/gemini';
import { DeepSeekProvider } from './providers/deepseek';
import { ClaudeProvider } from './providers/claude';
import { OpenAIProvider } from './providers/openai';
import { RulesProvider } from './providers/rules';

// --- Provider Chain (ordered) ---

const PROVIDER_CHAIN: AIProvider[] = [
  new XAIProvider(),
  new GeminiProvider(),
  new DeepSeekProvider(),
  new ClaudeProvider(),
  new OpenAIProvider(),
  new RulesProvider(),
];

// --- AI Service ---

export class AIService {
  private chain: AIProvider[];

  constructor(chain?: AIProvider[]) {
    this.chain = chain || PROVIDER_CHAIN;
  }

  /**
   * Generate a completion, automatically falling through providers on failure.
   */
  async generate(options: AIGenerateOptions): Promise<AIGenerateResult> {
    const errors: string[] = [];

    for (const provider of this.chain) {
      if (!provider.isAvailable()) continue;

      try {
        const result = await provider.generate(options);
        if (provider.name !== 'rules') {
          console.log(`[AI] Generated with ${provider.displayName}`);
        }
        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[AI] ${provider.displayName} failed: ${message}`);
        errors.push(`${provider.name}: ${message}`);
      }
    }

    // Should never reach here since RulesProvider always succeeds
    throw new Error(`All AI providers failed: ${errors.join('; ')}`);
  }

  /**
   * Generate a JSON completion. Sets jsonMode and parses the result.
   */
  async generateJSON<T = unknown>(options: Omit<AIGenerateOptions, 'jsonMode'>): Promise<{
    data: T;
    provider: AIProviderName;
  }> {
    const result = await this.generate({ ...options, jsonMode: true });

    // Clean potential markdown code fences
    const cleaned = result.content
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();

    const data = JSON.parse(cleaned) as T;
    return { data, provider: result.provider };
  }

  /**
   * Stream a completion, automatically falling through providers on failure.
   */
  async *stream(options: AIGenerateOptions): AsyncGenerator<AIStreamChunk> {
    const errors: string[] = [];

    for (const provider of this.chain) {
      if (!provider.isAvailable()) continue;

      try {
        console.log(`[AI] Streaming with ${provider.displayName}`);
        yield* provider.stream(options);
        return;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[AI] ${provider.displayName} stream failed: ${message}`);
        errors.push(`${provider.name}: ${message}`);
      }
    }

    // Fallback text if everything fails
    yield { content: 'AI service temporarily unavailable. Please try again.', done: false };
    yield { content: '', done: true };
  }

  /**
   * Get list of available providers (have API keys configured).
   */
  getAvailableProviders(): AIProviderName[] {
    return this.chain.filter((p) => p.isAvailable()).map((p) => p.name);
  }
}

// --- Singleton ---

let _instance: AIService | null = null;

export function getAIService(): AIService {
  if (!_instance) {
    _instance = new AIService();
  }
  return _instance;
}

// --- Re-exports ---

export type { AIProvider, AIProviderName, AIGenerateOptions, AIGenerateResult, AIStreamChunk } from './types';
