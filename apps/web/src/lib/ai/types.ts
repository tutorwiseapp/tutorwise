/**
 * Unified AI Provider Types
 *
 * Shared type definitions for the multi-provider AI service
 * with automatic fallback chain.
 *
 * Provider chain:
 * 1. xAI Grok 4 Fast (primary)
 * 2. Google Gemini Flash (fallback 1)
 * 3. DeepSeek R1 (fallback 2)
 * 4. Anthropic Claude Sonnet 4.6 (fallback 3)
 * 5. OpenAI GPT-4o (fallback 4)
 * 6. Rules-based (fallback 5)
 *
 * @module lib/ai/types
 */

// --- Provider Identifiers ---

export type AIProviderName =
  | 'xai'
  | 'gemini'
  | 'deepseek'
  | 'claude'
  | 'openai'
  | 'rules';

// --- Request/Response Types ---

export interface AIGenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  /** Force JSON output (provider-specific implementation) */
  jsonMode?: boolean;
}

export interface AIGenerateResult {
  content: string;
  provider: AIProviderName;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
}

// --- Provider Interface ---

export interface AIProvider {
  readonly name: AIProviderName;
  readonly displayName: string;

  /** Check if provider has required API key configured */
  isAvailable(): boolean;

  /** Generate a completion (non-streaming) */
  generate(options: AIGenerateOptions): Promise<AIGenerateResult>;

  /** Generate a streaming completion */
  stream(options: AIGenerateOptions): AsyncGenerator<AIStreamChunk>;
}
