/**
 * Embedding Service
 *
 * Generates embeddings for semantic search using Google Gemini gemini-embedding-001 (768 dimensions).
 * Standardised on Gemini as the sole embedding provider across the platform.
 *
 * Used by: Marketplace search, Sage knowledge base, match scoring, recommendations.
 *
 * @module lib/services/embeddings
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || 'dummy-key-for-build');

/** Embedding dimensions: gemini-embedding-001 configured for 768-dim vectors */
export const EMBEDDING_DIMENSIONS = 768;

/**
 * Generate embedding vector for text using Gemini gemini-embedding-001.
 * Uses outputDimensionality=768 to produce 768-dim vectors (model default is 3072).
 * @param text Text to embed
 * @returns 768-dimensional embedding vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const model = gemini.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
      content: { role: 'user', parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    } as any);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embedding and format as pgvector literal for direct database storage.
 * Returns format: '[0.1,0.2,0.3,...]' (native pgvector vector literal).
 */
export async function generateEmbeddingForStorage(text: string): Promise<string> {
  const embedding = await generateEmbedding(text);
  return `[${embedding.join(',')}]`;
}

/**
 * Generate embeddings for multiple texts sequentially.
 * @param texts Array of texts to embed
 * @returns Array of 768-dimensional embedding vectors
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const results: number[][] = [];
  for (const text of texts) {
    const embedding = await generateEmbedding(text);
    results.push(embedding);
  }
  return results;
}

/**
 * Generate embedding text representation for a listing.
 * Matches the SQL function get_listing_embedding_text().
 */
export function getListingEmbeddingText(listing: {
  title?: string | null;
  description?: string | null;
  subjects?: string[] | null;
  levels?: string[] | null;
  specializations?: string[] | null;
  delivery_mode?: string[] | null;
  location_city?: string | null;
}): string {
  return [
    listing.title || '',
    listing.description || '',
    `Subjects: ${listing.subjects?.join(', ') || ''}`,
    `Levels: ${listing.levels?.join(', ') || ''}`,
    `Specializations: ${listing.specializations?.join(', ') || ''}`,
    `Delivery: ${listing.delivery_mode?.join(', ') || ''}`,
    listing.location_city || '',
  ].filter(Boolean).join(' ');
}

/**
 * Generate embedding text representation for a profile.
 * Matches the SQL function get_profile_embedding_text().
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
 * Generate embedding text representation for an organisation.
 * Matches the SQL function get_organisation_embedding_text().
 */
export function getOrganisationEmbeddingText(org: {
  name?: string | null;
  tagline?: string | null;
  bio?: string | null;
  subjects_offered?: string[] | null;
  service_area?: string[] | null;
  location_city?: string | null;
  location_country?: string | null;
}): string {
  return [
    org.name || '',
    org.tagline || '',
    org.bio || '',
    `Subjects: ${org.subjects_offered?.join(', ') || ''}`,
    `Service Area: ${org.service_area?.join(', ') || ''}`,
    `Location: ${org.location_city || ''}`,
    org.location_country || '',
  ].filter(Boolean).join(' ');
}
