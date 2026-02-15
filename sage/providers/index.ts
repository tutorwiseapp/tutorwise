/**
 * Sage Providers
 *
 * LLM provider exports for Sage.
 */

export type {
  LLMProviderType,
  LLMProviderConfig,
  LLMMessage,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
  SystemPromptContext,
  LLMProvider,
} from './types';

export {
  BaseSageProvider,
  SUBJECT_PROMPTS,
  LEVEL_ADJUSTMENTS,
  PERSONA_PROMPTS,
} from './base-provider';

export { SageGeminiProvider } from './gemini-provider';

// --- Provider Factory ---

import type { LLMProviderConfig, LLMProvider } from './types';
import { SageGeminiProvider } from './gemini-provider';

export function createSageProvider(config: LLMProviderConfig): LLMProvider {
  switch (config.type) {
    case 'gemini':
      return new SageGeminiProvider(config);
    case 'claude':
      // TODO: Implement Claude provider
      throw new Error('Claude provider not yet implemented');
    case 'rules':
      // TODO: Implement rules-based provider
      throw new Error('Rules provider not yet implemented');
    default:
      throw new Error(`Unknown provider type: ${config.type}`);
  }
}

// Default provider
export function getDefaultSageProvider(): LLMProvider {
  return new SageGeminiProvider({ type: 'gemini' });
}
