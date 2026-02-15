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

// Provider factory will be added when concrete providers are implemented
// For now, Sage can reuse Lexi's Gemini provider with the Sage base
