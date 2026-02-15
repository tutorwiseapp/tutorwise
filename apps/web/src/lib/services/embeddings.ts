/**
 * Filename: apps/web/src/lib/services/embeddings.ts
 * Purpose: Generate embeddings for semantic search using multiple AI providers
 * Created: 2025-12-10
 * Phase: Marketplace Phase 1 - Smart Search
 *
 * Supported AI Providers:
 * - OpenAI: text-embedding-3-small (1536 dims, $0.02/1M tokens) - for embeddings
 * - Anthropic Claude: Sonnet/Opus models - for text generation and analysis
 * - Google Gemini: text-embedding-004 (768 dims) + Gemini Pro - for embeddings and generation
 *
 * Note: Claude doesn't provide embeddings directly. For embeddings with Claude ecosystem,
 * use Voyage AI (recommended by Anthropic) or OpenAI/Gemini embeddings.
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build',
});

// Claude client for text generation tasks
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key-for-build',
});

// Gemini client for embeddings and generation
const gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || 'dummy-key-for-build');

// Default embedding provider (openai or gemini)
const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || 'openai';

/**
 * Generate embedding vector for text using specified provider
 * @param text Text to embed (max 8191 tokens for OpenAI, unlimited for Gemini)
 * @param provider 'openai' or 'gemini' (defaults to EMBEDDING_PROVIDER env var)
 * @returns Embedding vector (1536 dims for OpenAI, 768 dims for Gemini)
 */
export async function generateEmbedding(text: string, provider?: 'openai' | 'gemini'): Promise<number[]> {
  const selectedProvider = provider || EMBEDDING_PROVIDER;

  try {
    if (selectedProvider === 'gemini') {
      // Use Gemini embeddings (768 dimensions)
      const model = gemini.getGenerativeModel({ model: 'text-embedding-004' });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } else {
      // Use OpenAI embeddings (1536 dimensions) - default
      // Truncate text if too long (rough estimate: 1 token ≈ 4 characters)
      const maxChars = 8191 * 4;
      const truncatedText = text.slice(0, maxChars);

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small', // 1536 dimensions, $0.02/1M tokens
        input: truncatedText,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    }
  } catch (error) {
    console.error(`Error generating embedding with ${selectedProvider}:`, error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    // OpenAI supports batch requests up to 2048 texts
    const maxBatchSize = 2048;

    if (texts.length > maxBatchSize) {
      // Split into smaller batches
      const batches: number[][][] = [];
      for (let i = 0; i < texts.length; i += maxBatchSize) {
        const batch = texts.slice(i, i + maxBatchSize);
        const embeddings = await generateEmbeddingsBatch(batch);
        batches.push(embeddings);
      }
      return batches.flat();
    }

    // Truncate texts
    const maxChars = 8191 * 4;
    const truncatedTexts = texts.map(text => text.slice(0, maxChars));

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: truncatedTexts,
      encoding_format: 'float',
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings batch:', error);
    throw new Error(`Failed to generate embeddings batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embedding text representation for a listing
 * Matches the SQL function get_listing_embedding_text()
 */
export function getListingEmbeddingText(listing: {
  title?: string | null;
  description?: string | null;
  subjects?: string[] | null;
  levels?: string[] | null;
  specializations?: string[] | null;
  location_type?: string | null;
  location_city?: string | null;
}): string {
  return [
    listing.title || '',
    listing.description || '',
    `Subjects: ${listing.subjects?.join(', ') || ''}`,
    `Levels: ${listing.levels?.join(', ') || ''}`,
    `Specializations: ${listing.specializations?.join(', ') || ''}`,
    `Location: ${listing.location_type || ''}`,
    listing.location_city || '',
  ].filter(Boolean).join(' ');
}

/**
 * Generate embedding text representation for a profile
 * Matches the SQL function get_profile_embedding_text()
 */
export function getProfileEmbeddingText(profile: {
  full_name?: string | null;
  bio?: string | null;
  active_role?: string | null;
}): string {
  return [
    profile.full_name || '',
    profile.bio || '',
    `Role: ${profile.active_role || ''}`,
  ].filter(Boolean).join(' ');
}

/**
 * Calculate cosine similarity between two vectors
 * @param a First vector
 * @param b Second vector
 * @returns Similarity score between 0 and 1 (1 = identical)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
