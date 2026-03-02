/**
 * Sage LLM Providers
 *
 * Factory and registry for LLM providers with automatic fallback.
 *
 * Fallback order: xAI > Gemini > DeepSeek > Claude > OpenAI > Rules
 * - xAI Grok 4 Fast: Primary provider (fast, cheap)
 * - Gemini: Proven JSON, education (fallback 1)
 * - DeepSeek: Strong reasoning at low cost (fallback 2)
 * - Claude: Quality explanations (fallback 3)
 * - OpenAI: Quality fallback (fallback 4)
 * - Rules: Offline fallback, always available
 *
 * @module sage/providers
 */

import { SageXAIProvider } from './xai-provider';
import { SageGeminiProvider } from './gemini-provider';
import { SageDeepSeekProvider } from './deepseek-provider';
import { SageClaudeProvider } from './claude-provider';
import { SageOpenAIProvider } from './openai-provider';
import { SageRulesProvider } from './rules-provider';
import type {
  LLMProvider,
  LLMProviderType,
  LLMProviderConfig,
} from './types';

// --- Provider Registry ---

const PROVIDER_REGISTRY: Record<LLMProviderType, new (config: LLMProviderConfig) => LLMProvider> = {
  xai: SageXAIProvider,
  gemini: SageGeminiProvider,
  deepseek: SageDeepSeekProvider,
  claude: SageClaudeProvider,
  openai: SageOpenAIProvider,
  rules: SageRulesProvider,
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
    if (process.env.XAI_AI_API_KEY || process.env.XAI_API_KEY) {
      available.push('xai');
    }
    if (process.env.GOOGLE_AI_API_KEY) {
      available.push('gemini');
    }
    if (process.env.DEEPSEEK_AI_API_KEY || process.env.DEEPSEEK_API_KEY) {
      available.push('deepseek');
    }
    if (process.env.ANTHROPIC_AI_API_KEY || process.env.ANTHROPIC_API_KEY) {
      available.push('claude');
    }
    if (process.env.OPENAI_AI_API_KEY || process.env.OPENAI_API_KEY) {
      available.push('openai');
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

  // Fallback order: xAI > Gemini > DeepSeek > Claude > OpenAI > Rules
  if (process.env.XAI_AI_API_KEY || process.env.XAI_API_KEY) {
    console.log('[Sage] Using xAI Grok 4 Fast provider');
    return providerFactory.create({ type: 'xai' });
  }
  if (process.env.GOOGLE_AI_API_KEY) {
    console.log('[Sage] Using Gemini provider');
    return providerFactory.create({ type: 'gemini' });
  }
  if (process.env.DEEPSEEK_AI_API_KEY || process.env.DEEPSEEK_API_KEY) {
    console.log('[Sage] Using DeepSeek provider');
    return providerFactory.create({ type: 'deepseek' });
  }
  if (process.env.ANTHROPIC_AI_API_KEY || process.env.ANTHROPIC_API_KEY) {
    console.log('[Sage] Using Claude provider');
    return providerFactory.create({ type: 'claude' });
  }
  if (process.env.OPENAI_AI_API_KEY || process.env.OPENAI_API_KEY) {
    console.log('[Sage] Using OpenAI provider');
    return providerFactory.create({ type: 'openai' });
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
    xai: {
      name: 'xAI Grok 4 Fast',
      description: 'Fast, cost-effective AI. Primary provider. Requires xAI API key.',
      requiresApiKey: true,
      envVar: 'XAI_API_KEY',
    },
    gemini: {
      name: 'Gemini (Google)',
      description: 'Fast, capable tutoring responses. Requires Google AI API key.',
      requiresApiKey: true,
      envVar: 'GOOGLE_AI_API_KEY',
    },
    deepseek: {
      name: 'DeepSeek R1',
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
    openai: {
      name: 'OpenAI GPT-4o',
      description: 'Quality AI responses using GPT-4o. Requires OpenAI API key.',
      requiresApiKey: true,
      envVar: 'OPENAI_API_KEY',
    },
    rules: {
      name: 'Rules-Based (Offline)',
      description: 'Pattern matching and guided responses. No API calls. Always available.',
      requiresApiKey: false,
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

export { SageXAIProvider } from './xai-provider';
export { SageGeminiProvider } from './gemini-provider';
export { SageDeepSeekProvider } from './deepseek-provider';
export { SageClaudeProvider } from './claude-provider';
export { SageOpenAIProvider } from './openai-provider';
export { SageRulesProvider } from './rules-provider';
