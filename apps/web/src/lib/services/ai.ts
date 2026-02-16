/**
 * Unified AI Services
 *
 * Provides access to Gemini (default), DeepSeek (alternative), and Claude.
 * OpenAI has been removed — all AI runs on these three providers.
 *
 * Provider priority: Gemini > DeepSeek > Claude
 *
 * Usage:
 * ```typescript
 * import { gemini, claude, generate } from '@/lib/services/ai';
 *
 * // Generate text with Gemini (default)
 * const text = await generateWithGemini('Hello!');
 *
 * // Generate text with DeepSeek
 * const text = await generateWithDeepSeek('Hello!');
 *
 * // Generate text with Claude
 * const text = await generateWithClaude('Hello!');
 *
 * // Unified generate — routes to correct provider
 * const text = await generate({ provider: 'gemini', prompt: 'Hello!' });
 * ```
 *
 * @module lib/services/ai
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// Google Gemini Client (Default Provider)
// ============================================================================
export const gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// ============================================================================
// Anthropic Claude Client
// ============================================================================
export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// DeepSeek Configuration (OpenAI-compatible REST API)
// ============================================================================
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

// ============================================================================
// Generation Functions
// ============================================================================

/**
 * Generate text completion with Gemini (default provider).
 */
export async function generateWithGemini(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    systemPrompt?: string;
  }
) {
  const model = gemini.getGenerativeModel({
    model: options?.model || 'gemini-2.0-flash',
    generationConfig: {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxOutputTokens || 1024,
    },
    ...(options?.systemPrompt ? { systemInstruction: options.systemPrompt } : {}),
  });

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Generate text completion with DeepSeek (OpenAI-compatible API).
 */
export async function generateWithDeepSeek(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }
) {
  const messages: { role: string; content: string }[] = [];

  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: options?.model || 'deepseek-chat',
      max_tokens: options?.maxTokens || 1024,
      temperature: options?.temperature,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

/**
 * Generate text completion with Claude.
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

// ============================================================================
// Streaming Functions
// ============================================================================

/**
 * Generate streaming completion with Gemini.
 */
export async function* streamWithGemini(
  prompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
    systemPrompt?: string;
  }
) {
  const model = gemini.getGenerativeModel({
    model: options?.model || 'gemini-2.0-flash',
    generationConfig: {
      temperature: options?.temperature,
      maxOutputTokens: options?.maxOutputTokens || 1024,
    },
    ...(options?.systemPrompt ? { systemInstruction: options.systemPrompt } : {}),
  });

  const result = await model.generateContentStream(prompt);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}

/**
 * Generate streaming completion with DeepSeek.
 */
export async function* streamWithDeepSeek(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }
) {
  const messages: { role: string; content: string }[] = [];

  if (options?.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: options?.model || 'deepseek-chat',
      max_tokens: options?.maxTokens || 1024,
      temperature: options?.temperature,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // Skip malformed chunks
      }
    }
  }
}

/**
 * Generate streaming completion with Claude.
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

// ============================================================================
// Unified Interface
// ============================================================================

export type AIProvider = 'gemini' | 'deepseek' | 'claude';

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
 * Unified generate function — routes to correct provider.
 * Provider priority: Gemini (default) > DeepSeek > Claude
 */
export async function generate(options: GenerateOptions): Promise<string> {
  switch (options.provider) {
    case 'gemini':
      return generateWithGemini(options.prompt, {
        model: options.model,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
        systemPrompt: options.systemPrompt,
      });

    case 'deepseek':
      return generateWithDeepSeek(options.prompt, {
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        systemPrompt: options.systemPrompt,
      });

    case 'claude':
      return generateWithClaude(options.prompt, {
        model: options.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
        system: options.systemPrompt,
      });

    default:
      throw new Error(`Unknown AI provider: ${options.provider}`);
  }
}
