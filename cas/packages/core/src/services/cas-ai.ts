/**
 * CAS AI Client
 *
 * Shared LLM client for all CAS agents with 6-tier fallback chain.
 * Separate from the web app's ai.ts to avoid circular imports.
 *
 * Fallback chain:
 * 1. xAI Grok 4 Fast (primary)
 * 2. Google Gemini Flash (fallback 1)
 * 3. DeepSeek R1 (fallback 2)
 * 4. Anthropic Claude Sonnet 4.6 (fallback 3)
 * 5. OpenAI GPT-4o (fallback 4)
 * 6. Returns null (callers fall back to rules-based logic)
 *
 * - Temperature default: 0.3 (deterministic reasoning)
 * - Returns null on failure (callers fall back to rules-based logic)
 *
 * @module cas/packages/core/src/services/cas-ai
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 2048;

export interface CasGenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}

// --- Provider helpers ---

/** OpenAI-compatible API call (works for xAI, DeepSeek, OpenAI) */
async function callOpenAICompatible(
  baseURL: string,
  apiKey: string,
  model: string,
  options: CasGenerateOptions,
  jsonMode: boolean
): Promise<string | null> {
  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      max_tokens: options.maxOutputTokens || DEFAULT_MAX_TOKENS,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      ...(jsonMode && { response_format: { type: 'json_object' } }),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`API error ${response.status}: ${(err as { error?: { message?: string } }).error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

/** Gemini API call */
async function callGemini(
  options: CasGenerateOptions,
  jsonMode: boolean
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: options.model || 'gemini-2.0-flash',
    generationConfig: {
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      maxOutputTokens: options.maxOutputTokens || DEFAULT_MAX_TOKENS,
      ...(jsonMode && { responseMimeType: 'application/json' }),
    },
    systemInstruction: options.systemPrompt,
  });

  const result = await model.generateContent(options.userPrompt);
  return result.response.text() || null;
}

/** Claude API call */
async function callClaude(
  options: CasGenerateOptions,
  jsonMode: boolean
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_AI_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const systemPrompt = jsonMode
    ? `${options.systemPrompt}\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation — just the JSON object.`
    : options.systemPrompt;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6-20250929',
      max_tokens: options.maxOutputTokens || DEFAULT_MAX_TOKENS,
      temperature: options.temperature ?? DEFAULT_TEMPERATURE,
      system: systemPrompt,
      messages: [{ role: 'user', content: options.userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Claude API error ${response.status}: ${JSON.stringify(err)}`);
  }

  const data = await response.json();
  const content = data.content?.[0];
  return content?.type === 'text' ? content.text : null;
}

// --- Provider chain definition ---

interface CASProvider {
  name: string;
  available: () => boolean;
  call: (options: CasGenerateOptions, jsonMode: boolean) => Promise<string | null>;
}

const PROVIDER_CHAIN: CASProvider[] = [
  {
    name: 'xAI Grok 4 Fast',
    available: () => !!(process.env.XAI_AI_API_KEY || process.env.XAI_API_KEY),
    call: (opts, json) =>
      callOpenAICompatible('https://api.x.ai/v1', (process.env.XAI_AI_API_KEY || process.env.XAI_API_KEY)!, 'grok-4-1-fast-non-reasoning', opts, json),
  },
  {
    name: 'Google Gemini Flash',
    available: () => !!(process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY),
    call: (opts, json) => callGemini(opts, json),
  },
  {
    name: 'DeepSeek R1',
    available: () => !!(process.env.DEEPSEEK_AI_API_KEY || process.env.DEEPSEEK_API_KEY),
    call: (opts, json) =>
      callOpenAICompatible('https://api.deepseek.com', (process.env.DEEPSEEK_AI_API_KEY || process.env.DEEPSEEK_API_KEY)!, 'deepseek-reasoner', opts, json),
  },
  {
    name: 'Claude Sonnet 4.6',
    available: () => !!(process.env.ANTHROPIC_AI_API_KEY || process.env.ANTHROPIC_API_KEY),
    call: (opts, json) => callClaude(opts, json),
  },
  {
    name: 'OpenAI GPT-4o',
    available: () => !!(process.env.OPENAI_AI_API_KEY || process.env.OPENAI_API_KEY),
    call: (opts, json) =>
      callOpenAICompatible('https://api.openai.com/v1', (process.env.OPENAI_AI_API_KEY || process.env.OPENAI_API_KEY)!, 'gpt-4o', opts, json),
  },
];

/** Try each provider in chain order, return first success */
async function generateWithFallback(
  options: CasGenerateOptions,
  jsonMode: boolean
): Promise<string | null> {
  for (const provider of PROVIDER_CHAIN) {
    if (!provider.available()) continue;

    try {
      const result = await provider.call(options, jsonMode);
      if (result) {
        console.log(`[CAS AI] Generated with ${provider.name}`);
        return result;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[CAS AI] ${provider.name} failed: ${message}`);
    }
  }

  console.warn('[CAS AI] All providers failed. Falling back to rules-based logic.');
  return null;
}

/**
 * Generate text using the 6-tier fallback chain. Returns null on any failure.
 */
export async function casGenerate(options: CasGenerateOptions): Promise<string | null> {
  return generateWithFallback(options, false);
}

/**
 * Generate structured output using JSON mode with the fallback chain.
 * Parses the response as JSON matching the expected shape.
 * Returns null on any failure (parse error, API error, etc).
 */
export async function casGenerateStructured<T>(
  options: CasGenerateOptions & { jsonSchema: string }
): Promise<T | null> {
  const promptWithSchema = `${options.userPrompt}\n\nRespond with valid JSON matching this schema:\n${options.jsonSchema}`;
  const modifiedOptions = { ...options, userPrompt: promptWithSchema };

  const text = await generateWithFallback(modifiedOptions, true);
  if (!text) return null;

  try {
    // Clean potential markdown code fences
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    return JSON.parse(cleaned) as T;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[CAS AI] JSON parse failed: ${message}. Falling back to rules-based logic.`);
    return null;
  }
}
