/**
 * Lexi LLM Providers
 *
 * Factory and registry for LLM providers.
 *
 * @module lexi/providers
 */

import { RulesProvider } from './rules-provider';
import { ClaudeProvider } from './claude-provider';
import { GeminiProvider } from './gemini-provider';
import type {
  LLMProvider,
  LLMProviderType,
  LLMProviderConfig,
  LLMProviderFactory,
} from './types';

// --- Provider Registry ---

const PROVIDER_REGISTRY: Record<LLMProviderType, new (config: LLMProviderConfig) => LLMProvider> = {
  rules: RulesProvider,
  claude: ClaudeProvider,
  gemini: GeminiProvider,
};

// --- Factory Implementation ---

export const providerFactory: LLMProviderFactory = {
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
   * Get list of available provider types
   */
  getAvailableProviders(): LLMProviderType[] {
    const available: LLMProviderType[] = [];

    // Rules is always available
    available.push('rules');

    // Check for API keys
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
 * Get the default provider based on environment
 */
export function getDefaultProvider(): LLMProvider {
  // Check environment variable for preferred provider
  const preferred = process.env.LEXI_LLM_PROVIDER as LLMProviderType | undefined;

  if (preferred && PROVIDER_REGISTRY[preferred]) {
    const provider = providerFactory.create({ type: preferred });
    if (provider.isAvailable()) {
      return provider;
    }
  }

  // Fallback order: Claude > Gemini > Rules
  if (process.env.ANTHROPIC_API_KEY) {
    return providerFactory.create({ type: 'claude' });
  }
  if (process.env.GOOGLE_AI_API_KEY) {
    return providerFactory.create({ type: 'gemini' });
  }

  // Default to rules-based
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
      description: 'Pattern matching and predefined responses. No API calls. Always available.',
      requiresApiKey: false,
    },
    claude: {
      name: 'Claude (Anthropic)',
      description: 'Intelligent AI responses using Claude. Requires Anthropic API key.',
      requiresApiKey: true,
      envVar: 'ANTHROPIC_API_KEY',
    },
    gemini: {
      name: 'Gemini (Google)',
      description: 'Intelligent AI responses using Gemini. Requires Google AI API key.',
      requiresApiKey: true,
      envVar: 'GOOGLE_AI_API_KEY',
    },
  };

  return info[type];
}

// --- Re-exports ---

export { RulesProvider } from './rules-provider';
export { ClaudeProvider } from './claude-provider';
export { GeminiProvider } from './gemini-provider';
export { BaseLLMProvider, PERSONA_PROMPTS } from './base-provider';
export * from './types';
