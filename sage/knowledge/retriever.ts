/**
 * Sage Knowledge Retriever
 *
 * Role-aware RAG retrieval with priority ordering.
 * Searches across user uploads, shared content, and global resources.
 *
 * @module sage/knowledge
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
  ScoredChunk,
  KnowledgeNamespace,
} from './types';
import type { KnowledgeSource } from '../context';

// --- Retriever Class ---

export class KnowledgeRetriever {
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
   * Search knowledge sources with priority ordering.
   *
   * Results are merged from multiple namespaces, with higher-priority
   * sources (user uploads) ranked above lower-priority (global).
   */
  async search(
    request: KnowledgeSearchRequest,
    sources: KnowledgeSource[]
  ): Promise<KnowledgeSearchResult> {
    const startTime = Date.now();

    if (!this.supabase) {
      console.warn('[KnowledgeRetriever] Not initialized');
      return { chunks: [], totalResults: 0, searchTime: 0 };
    }

    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(request.query);

    if (!queryEmbedding) {
      console.warn('[KnowledgeRetriever] Failed to generate query embedding');
      return { chunks: [], totalResults: 0, searchTime: 0 };
    }

    // Search each source in priority order
    const allResults: ScoredChunk[] = [];

    for (const source of sources) {
      const sourceResults = await this.searchNamespace(
        queryEmbedding,
        source.namespace,
        request,
        source.priority
      );
      allResults.push(...sourceResults);
    }

    // Sort by adjusted score (considering priority)
    allResults.sort((a, b) => b.score - a.score);

    // Limit to topK
    const topK = request.topK || 10;
    const results = allResults.slice(0, topK);

    // Filter by minScore
    const minScore = request.minScore || 0.5;
    const filtered = results.filter(r => r.score >= minScore);

    return {
      chunks: filtered,
      totalResults: allResults.length,
      searchTime: Date.now() - startTime,
    };
  }

  /**
   * Search a single namespace.
   */
  private async searchNamespace(
    queryEmbedding: number[],
    namespace: string,
    request: KnowledgeSearchRequest,
    priorityBoost: number
  ): Promise<ScoredChunk[]> {
    if (!this.supabase) return [];

    try {
      // Use pgvector similarity search
      const { data, error } = await this.supabase.rpc('match_knowledge_chunks', {
        query_embedding: queryEmbedding,
        match_namespace: namespace,
        match_subject: request.subject || null,
        match_level: request.level || null,
        match_count: request.topK || 10,
      });

      if (error) {
        console.error(`[KnowledgeRetriever] Search error for ${namespace}:`, error);
        return [];
      }

      // Adjust scores based on priority (lower priority number = higher boost)
      const priorityFactor = 1 + (0.1 * (4 - priorityBoost));  // Priority 1 gets +0.3, priority 3 gets +0.1

      return (data || []).map((row: any) => ({
        id: row.id,
        documentId: row.document_id,
        content: row.content,
        metadata: row.metadata || {},
        position: row.position || 0,
        pageNumber: row.page_number,
        score: row.similarity * priorityFactor,
        document: {
          id: row.document_id,
          filename: row.filename,
          ownerId: row.owner_id,
          subject: row.subject,
          level: row.level,
        },
      }));
    } catch (error) {
      console.error(`[KnowledgeRetriever] Search exception for ${namespace}:`, error);
      return [];
    }
  }

  /**
   * Generate embedding for a text query.
   * Uses the same embedding model as document processing.
   */
  private async generateEmbedding(text: string): Promise<number[] | null> {
    // TODO: Implement with actual embedding API (OpenAI, Gemini, etc.)
    // For now, return null to indicate not implemented
    console.warn('[KnowledgeRetriever] Embedding generation not implemented');
    return null;
  }

  /**
   * Get documents in a namespace.
   */
  async getDocuments(
    namespace: string,
    options?: {
      subject?: string;
      level?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    if (!this.supabase) return [];

    let query = this.supabase
      .from('sage_uploads')
      .select('*')
      .eq('namespace', namespace)
      .eq('embedding_status', 'completed')
      .order('created_at', { ascending: false });

    if (options?.subject) {
      query = query.eq('subject', options.subject);
    }
    if (options?.level) {
      query = query.eq('level', options.level);
    }
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[KnowledgeRetriever] getDocuments error:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Format retrieved chunks into context for LLM.
   */
  formatForContext(chunks: ScoredChunk[], maxTokens: number = 2000): string {
    const parts: string[] = [];
    let totalLength = 0;
    const avgTokensPerChar = 0.25;  // Rough estimate

    for (const chunk of chunks) {
      const chunkText = `[Source: ${chunk.document.filename}]\n${chunk.content}`;
      const estimatedTokens = chunkText.length * avgTokensPerChar;

      if (totalLength + estimatedTokens > maxTokens) {
        break;
      }

      parts.push(chunkText);
      totalLength += estimatedTokens;
    }

    if (parts.length === 0) {
      return '';
    }

    return `Relevant context from teaching materials:\n\n${parts.join('\n\n---\n\n')}`;
  }
}

// --- Singleton Export ---

export const knowledgeRetriever = new KnowledgeRetriever();

export default KnowledgeRetriever;
