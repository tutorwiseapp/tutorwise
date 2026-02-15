/**
 * Filename: apps/web/src/lib/services/ai.ts
 * Purpose: Unified AI services providing access to OpenAI, Claude, and Gemini
 * Created: 2025-12-10
 * Phase: Marketplace Phase 1 - Smart Search
 *
 * This module provides a unified interface for:
 * - Text generation (Claude Sonnet 4.5, GPT-4, Gemini Pro)
 * - Embeddings (OpenAI, Gemini)
 * - Streaming responses
 * - Function calling / Tool use
 *
 * Usage:
 * ```typescript
 * import { openai, claude, gemini } from '@/lib/services/ai';
 *
 * // Generate text with Claude
 * const response = await claude.messages.create({
 *   model: 'claude-sonnet-4-5-20250929',
 *   max_tokens: 1024,
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 *
 * // Generate text with OpenAI
 * const completion = await openai.chat.completions.create({
 *   model: 'gpt-4-turbo-preview',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 *
 * // Generate text with Gemini
 * const model = gemini.getGenerativeModel({ model: 'gemini-pro' });
 * const result = await model.generateContent('Hello!');
 * ```
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// OpenAI Client
// ============================================================================
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Recommended OpenAI models:
 * - gpt-4-turbo-preview: Most capable, best for complex tasks
 * - gpt-4: Previous generation, still very capable
 * - gpt-3.5-turbo: Fast and cost-effective
 * - text-embedding-3-small: Embeddings (1536 dims, $0.02/1M tokens)
 * - text-embedding-3-large: Embeddings (3072 dims, $0.13/1M tokens)
 */

// ============================================================================
// Anthropic Claude Client
// ============================================================================
export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Recommended Claude models:
 * - claude-sonnet-4-5-20250929: Latest Sonnet 4.5 (most balanced)
 * - claude-opus-4-5-20251101: Most capable (Opus 4.5)
 * - claude-3-5-sonnet-20241022: Previous Sonnet 3.5
 * - claude-3-opus-20240229: Previous Opus 3
 * - claude-3-haiku-20240307: Fast and economical
 *
 * Note: Claude doesn't provide embeddings. Use OpenAI or Voyage AI instead.
 */

// ============================================================================
// Google Gemini Client
// ============================================================================
export const gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

/**
 * Recommended Gemini models:
 * - gemini-pro: Text generation (multimodal capable)
 * - gemini-pro-vision: Vision + text (deprecated, use gemini-pro)
 * - text-embedding-004: Embeddings (768 dimensions)
 *
 * Usage:
 * const model = gemini.getGenerativeModel({ model: 'gemini-pro' });
 */

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate text completion with Claude (streaming)
 */
export async function generateWithClaude(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    system?: string;
  }
) {
  const response = await claude.messages.create({
    model: options?.model || 'claude-sonnet-4-5-20250929',
    max_tokens: options?.maxTokens || 1024,
    temperature: options?.temperature,
    system: options?.system,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].type === 'text' ? response.content[0].text : '';
}

/**
 * Generate text completion with OpenAI
 */
export async function generateWithOpenAI(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }
) {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const completion = await openai.chat.completions.create({
    model: options?.model || 'gpt-4-turbo-preview',
    max_tokens: options?.maxTokens || 1024,
    temperature: options?.temperature,
    messages,
  });

  return completion.choices[0].message.content || '';
}

/**
 * Generate text completion with Gemini
 */
export async function generateWithGemini(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  }
) {
  const model = gemini.getGenerativeModel({
    model: options?.model || 'gemini-pro',
    generationConfig: {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxOutputTokens || 1024,
    },
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Generate streaming completion with Claude
 */
export async function* streamWithClaude(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    system?: string;
  }
) {
  const stream = await claude.messages.create({
    model: options?.model || 'claude-sonnet-4-5-20250929',
    max_tokens: options?.maxTokens || 1024,
    temperature: options?.temperature,
    system: options?.system,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

/**
 * Generate streaming completion with OpenAI
 */
export async function* streamWithOpenAI(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }
) {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const stream = await openai.chat.completions.create({
    model: options?.model || 'gpt-4-turbo-preview',
    max_tokens: options?.maxTokens || 1024,
    temperature: options?.temperature,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

/**
 * Generate streaming completion with Gemini
 */
export async function* streamWithGemini(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
  }
) {
  const model = gemini.getGenerativeModel({
    model: options?.model || 'gemini-pro',
    generationConfig: {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxOutputTokens || 1024,
    },
  });

  const result = await model.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}

// ============================================================================
// Type Exports
// ============================================================================

export type AIProvider = 'openai' | 'claude' | 'gemini';

export interface GenerateOptions {
  provider: AIProvider;
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
}

/**
 * Unified generate function - automatically routes to correct provider
 */
export async function generate(options: GenerateOptions): Promise<string> {
  switch (options.provider) {
    case 'claude':
      return generateWithClaude(options.prompt, {
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        system: options.systemPrompt,
      });

    case 'openai':
      return generateWithOpenAI(options.prompt, {
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        systemPrompt: options.systemPrompt,
      });

    case 'gemini':
      return generateWithGemini(options.prompt, {
        model: options.model,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      });

    default:
      throw new Error(`Unknown AI provider: ${options.provider}`);
  }
}
