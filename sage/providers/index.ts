/**
 * Sage LLM Providers
 *
 * Factory and registry for LLM providers with automatic fallback.
 *
 * Fallback order: DeepSeek > Gemini > Claude > Rules
 * - DeepSeek: Excellent reasoning at low cost (primary)
 * - Gemini: Good alternative, fast responses
 * - Claude: Best for tutoring (excellent explanations)
 * - Rules: Offline fallback, always available
 *
 * @module sage/providers
 */

import { SageRulesProvider } from './rules-provider';
import { SageClaudeProvider } from './claude-provider';
import { SageGeminiProvider } from './gemini-provider';
import { SageDeepSeekProvider } from './deepseek-provider';
import type {
  LLMProvider,
  LLMProviderType,
  LLMProviderConfig,
} from './types';

// --- Provider Registry ---

const PROVIDER_REGISTRY: Record<LLMProviderType, new (config: LLMProviderConfig) => LLMProvider> = {
  rules: SageRulesProvider,
  claude: SageClaudeProvider,
  gemini: SageGeminiProvider,
  deepseek: SageDeepSeekProvider,
};

// --- Provider Factory ---

export interface SageProviderFactory {
  create(config: LLMProviderConfig): LLMProvider;
  getAvailableProviders(): LLMProviderType[];
}

export const providerFactory: SageProviderFactory = {
  /**
   * Create a provider instance
   */
  create(config: LLMProviderConfig): LLMProvider {
    const ProviderClass = PROVIDER_REGISTRY[config.type];
    if (!ProviderClass) {
      throw new Error(`Unknown provider type: ${config.type}`);
    }
    return new ProviderClass(config);
  },

  /**
   * Get list of available provider types based on environment
   */
  getAvailableProviders(): LLMProviderType[] {
    const available: LLMProviderType[] = [];

    // Rules is always available
    available.push('rules');

    // Check for API keys
    if (process.env.DEEPSEEK_API_KEY) {
      available.push('deepseek');
    }
    if (process.env.ANTHROPIC_API_KEY) {
      available.push('claude');
    }
    if (process.env.GOOGLE_AI_API_KEY) {
      available.push('gemini');
    }

    return available;
  },
};

/**
 * Create a Sage provider by type
 */
export function createSageProvider(config: LLMProviderConfig): LLMProvider {
  return providerFactory.create(config);
}

/**
 * Get the default provider based on environment.
 * Uses fallback chain: Claude > Gemini > Rules
 */
export function getDefaultSageProvider(): LLMProvider {
  // Check environment variable for preferred provider
  const preferred = process.env.SAGE_LLM_PROVIDER as LLMProviderType | undefined;

  if (preferred && PROVIDER_REGISTRY[preferred]) {
    const provider = providerFactory.create({ type: preferred });
    if (provider.isAvailable()) {
      console.log(`[Sage] Using preferred provider: ${preferred}`);
      return provider;
    }
    console.warn(`[Sage] Preferred provider ${preferred} not available, using fallback`);
  }

  // Fallback order: DeepSeek > Gemini > Claude > Rules
  if (process.env.DEEPSEEK_API_KEY) {
    console.log('[Sage] Using DeepSeek provider');
    return providerFactory.create({ type: 'deepseek' });
  }
  if (process.env.GOOGLE_AI_API_KEY) {
    console.log('[Sage] Using Gemini provider');
    return providerFactory.create({ type: 'gemini' });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('[Sage] Using Claude provider');
    return providerFactory.create({ type: 'claude' });
  }

  // Default to rules-based (always available)
  console.log('[Sage] Using Rules provider (offline mode)');
  return providerFactory.create({ type: 'rules' });
}

/**
 * Get provider info for display
 */
export function getProviderInfo(type: LLMProviderType): {
  name: string;
  description: string;
  requiresApiKey: boolean;
  envVar?: string;
} {
  const info: Record<LLMProviderType, {
    name: string;
    description: string;
    requiresApiKey: boolean;
    envVar?: string;
  }> = {
    rules: {
      name: 'Rules-Based (Offline)',
      description: 'Pattern matching and guided responses. No API calls. Always available.',
      requiresApiKey: false,
    },
    deepseek: {
      name: 'DeepSeek V3',
      description: 'Excellent reasoning at low cost. OpenAI-compatible API. Requires DeepSeek API key.',
      requiresApiKey: true,
      envVar: 'DEEPSEEK_API_KEY',
    },
    claude: {
      name: 'Claude (Anthropic)',
      description: 'Excellent for detailed explanations and tutoring. Requires Anthropic API key.',
      requiresApiKey: true,
      envVar: 'ANTHROPIC_API_KEY',
    },
    gemini: {
      name: 'Gemini (Google)',
      description: 'Fast, capable tutoring responses. Requires Google AI API key.',
      requiresApiKey: true,
      envVar: 'GOOGLE_AI_API_KEY',
    },
  };

  return info[type];
}

/**
 * Check if a specific provider is available
 */
export function isProviderAvailable(type: LLMProviderType): boolean {
  const provider = providerFactory.create({ type });
  return provider.isAvailable();
}

// --- Type Exports ---

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

// --- Provider Exports ---

export {
  BaseSageProvider,
  SUBJECT_PROMPTS,
  LEVEL_ADJUSTMENTS,
  PERSONA_PROMPTS,
} from './base-provider';

export { SageRulesProvider } from './rules-provider';
export { SageClaudeProvider } from './claude-provider';
export { SageGeminiProvider } from './gemini-provider';
export { SageDeepSeekProvider } from './deepseek-provider';
