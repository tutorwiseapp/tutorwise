/**
 * CAS AI Client
 *
 * Shared LLM client for all CAS agents. Wraps @google/generative-ai SDK.
 * Separate from the web app's ai.ts to avoid circular imports.
 *
 * - Model: gemini-2.0-flash (matching web app usage)
 * - Returns null on failure (callers fall back to rules-based logic)
 * - Temperature default: 0.3 (deterministic reasoning)
 *
 * @module cas/packages/core/src/services/cas-ai
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy-initialized client
let _client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (_client) return _client;
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn('⚠️ CAS AI: No GOOGLE_AI_API_KEY or GOOGLE_API_KEY set. LLM calls will return null (falling back to rules-based logic).');
    return null;
  }
  _client = new GoogleGenerativeAI(apiKey);
  return _client;
}

const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 2048;

export interface CasGenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}

/**
 * Generate text with Gemini. Returns null on any failure.
 */
export async function casGenerate(options: CasGenerateOptions): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const model = client.getGenerativeModel({
      model: options.model || DEFAULT_MODEL,
      generationConfig: {
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        maxOutputTokens: options.maxOutputTokens || DEFAULT_MAX_TOKENS,
      },
      systemInstruction: options.systemPrompt,
    });

    const result = await model.generateContent(options.userPrompt);
    const text = result.response.text();
    return text || null;
  } catch (error: any) {
    console.warn(`⚠️ CAS AI: Generation failed: ${error.message}. Falling back to rules-based logic.`);
    return null;
  }
}

/**
 * Generate structured output with Gemini using JSON mode.
 * Parses the response as JSON matching the expected shape.
 * Returns null on any failure (parse error, API error, etc).
 *
 * @param options - Generation options plus a jsonSchema description
 * @returns Parsed object of type T, or null on failure
 */
export async function casGenerateStructured<T>(
  options: CasGenerateOptions & { jsonSchema: string }
): Promise<T | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const model = client.getGenerativeModel({
      model: options.model || DEFAULT_MODEL,
      generationConfig: {
        temperature: options.temperature ?? DEFAULT_TEMPERATURE,
        maxOutputTokens: options.maxOutputTokens || DEFAULT_MAX_TOKENS,
        responseMimeType: 'application/json',
      },
      systemInstruction: options.systemPrompt,
    });

    const promptWithSchema = `${options.userPrompt}\n\nRespond with valid JSON matching this schema:\n${options.jsonSchema}`;
    const result = await model.generateContent(promptWithSchema);
    const text = result.response.text();

    if (!text) return null;

    // Clean potential markdown code fences
    const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    return JSON.parse(cleaned) as T;
  } catch (error: any) {
    console.warn(`⚠️ CAS AI: Structured generation failed: ${error.message}. Falling back to rules-based logic.`);
    return null;
  }
}
