/**
 * Lexi Knowledge Retriever
 *
 * RAG retrieval for platform knowledge (Help Centre articles).
 * Uses dedicated lexi_knowledge_chunks table with HNSW vector index.
 *
 * @module lexi/knowledge
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  LexiKnowledgeSearchRequest,
  LexiKnowledgeSearchResult,
  LexiScoredChunk,
} from './types';

const EMBEDDING_DIMENSIONS = 768;

export class LexiKnowledgeRetriever {
  private supabase: SupabaseClient | null = null;

  /**
   * Initialize with Supabase client.
   */
  initialize(supabaseClient?: SupabaseClient): void {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && key) {
        this.supabase = createClient(url, key);
      }
    }
  }

  /**
   * Check if the retriever is ready.
   */
  isReady(): boolean {
    return this.supabase !== null;
  }

  /**
   * Search platform knowledge base using vector similarity.
   */
  async search(request: LexiKnowledgeSearchRequest): Promise<LexiKnowledgeSearchResult> {
    const startTime = Date.now();

    if (!this.supabase) {
      return { chunks: [], totalResults: 0, searchTime: 0 };
    }

    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(request.query);
    if (!queryEmbedding) {
      return { chunks: [], totalResults: 0, searchTime: 0 };
    }

    try {
      const { data, error } = await this.supabase.rpc('match_lexi_knowledge_chunks', {
        query_embedding: queryEmbedding,
        match_category: request.category || null,
        match_count: request.topK || 5,
        match_threshold: request.minScore || 0.5,
      });

      if (error) {
        console.error('[LexiRetriever] Search error:', error);
        return { chunks: [], totalResults: 0, searchTime: Date.now() - startTime };
      }

      const chunks: LexiScoredChunk[] = (data || [])
        .filter((row: any) => {
          if (request.audience && row.metadata?.audience) {
            return row.metadata.audience === 'all' || row.metadata.audience === request.audience;
          }
          return true;
        })
        .map((row: any) => ({
          id: row.id,
          content: row.content,
          score: row.similarity,
          source: {
            title: row.metadata?.title || 'Unknown',
            category: row.metadata?.category || row.category || 'general',
            slug: row.metadata?.slug || '',
            audience: row.metadata?.audience,
          },
        }));

      return {
        chunks,
        totalResults: chunks.length,
        searchTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[LexiRetriever] Search exception:', error);
      return { chunks: [], totalResults: 0, searchTime: Date.now() - startTime };
    }
  }

  /**
   * Format retrieved chunks into context string for LLM.
   */
  formatForContext(chunks: LexiScoredChunk[], maxTokens: number = 1500): string {
    const parts: string[] = [];
    let totalLength = 0;
    const avgTokensPerChar = 0.25;

    for (const chunk of chunks) {
      const chunkText = `[${chunk.source.title} — ${chunk.source.category}]\n${chunk.content}`;
      const estimatedTokens = chunkText.length * avgTokensPerChar;

      if (totalLength + estimatedTokens > maxTokens) break;
      parts.push(chunkText);
      totalLength += estimatedTokens;
    }

    if (parts.length === 0) return '';

    return `Relevant platform knowledge:\n\n${parts.join('\n\n---\n\n')}`;
  }

  /**
   * Generate embedding using Gemini gemini-embedding-001.
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!apiKey) return null;

      const gemini = new GoogleGenerativeAI(apiKey);
      const model = gemini.getGenerativeModel({ model: 'gemini-embedding-001' });
      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
        outputDimensionality: EMBEDDING_DIMENSIONS,
      } as any);
      return result.embedding.values;
    } catch (error) {
      console.error('[LexiRetriever] Embedding generation failed:', error);
      return null;
    }
  }
}

// --- Singleton Export ---

export const lexiKnowledgeRetriever = new LexiKnowledgeRetriever();

export default LexiKnowledgeRetriever;
