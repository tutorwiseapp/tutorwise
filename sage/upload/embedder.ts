/**
 * Sage Embedder
 *
 * Generates embeddings for document chunks and stores them
 * in pgvector for similarity search.
 *
 * Supports:
 * - Google Gemini embeddings (GOOGLE_AI_API_KEY)
 * - OpenAI embeddings (OPENAI_API_KEY) - fallback
 *
 * Note: Claude does not have an embeddings API.
 *
 * @module sage/upload
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SageSubject, SageLevel } from '../types';
import type { ProcessedDocument, ExtractedChunk } from './processor';

// --- Embedder Types ---

export interface EmbeddingResult {
  documentId: string;
  chunksEmbedded: number;
  totalChunks: number;
  processingTime: number;
  errors: string[];
}

export type EmbeddingProvider = 'gemini' | 'openai';

export interface EmbedderConfig {
  provider?: EmbeddingProvider;
  model?: string;
  batchSize?: number;
  dimensions?: number;
}

const DEFAULT_CONFIG: Required<EmbedderConfig> = {
  provider: 'gemini',
  model: 'text-embedding-004', // Gemini embedding model
  batchSize: 20, // Gemini has lower batch limits
  dimensions: 1536,
};

// --- Embedder Class ---

export class DocumentEmbedder {
  private supabase: SupabaseClient | null = null;
  private config: Required<EmbedderConfig>;
  private geminiClient: GoogleGenerativeAI | null = null;
  private openaiApiKey: string | null = null;

  constructor(config?: EmbedderConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize with Supabase client and embedding providers.
   */
  initialize(supabaseClient?: SupabaseClient): void {
    // Initialize Supabase
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && key) {
        this.supabase = createClient(url, key);
      }
    }

    // Initialize embedding providers
    const googleKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (googleKey) {
      this.geminiClient = new GoogleGenerativeAI(googleKey);
      console.log('[DocumentEmbedder] Initialized with Gemini embeddings');
    }

    if (openaiKey) {
      this.openaiApiKey = openaiKey;
      if (!googleKey) {
        console.log('[DocumentEmbedder] Initialized with OpenAI embeddings');
      }
    }

    if (!googleKey && !openaiKey) {
      console.warn('[DocumentEmbedder] No embedding API key found. Set GOOGLE_AI_API_KEY or OPENAI_API_KEY');
    }
  }

  /**
   * Get the active embedding provider.
   */
  getProvider(): EmbeddingProvider | null {
    if (this.config.provider === 'gemini' && this.geminiClient) return 'gemini';
    if (this.config.provider === 'openai' && this.openaiApiKey) return 'openai';
    if (this.geminiClient) return 'gemini';
    if (this.openaiApiKey) return 'openai';
    return null;
  }

  /**
   * Embed a processed document and store in database.
   */
  async embedDocument(
    document: ProcessedDocument,
    options: {
      documentId: string;
      ownerId: string;
      namespace: string;
      subject?: SageSubject;
      level?: SageLevel;
      visibility?: 'private' | 'shared' | 'public';
    }
  ): Promise<EmbeddingResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let chunksEmbedded = 0;

    if (!this.supabase) {
      return {
        documentId: options.documentId,
        chunksEmbedded: 0,
        totalChunks: document.chunks.length,
        processingTime: 0,
        errors: ['Embedder not initialized'],
      };
    }

    // Update document status to processing
    await this.updateDocumentStatus(options.documentId, 'processing');

    // Process chunks in batches
    const batches = this.batchChunks(document.chunks, this.config.batchSize);

    for (const batch of batches) {
      try {
        // Generate embeddings for batch
        const embeddings = await this.generateEmbeddings(batch.map(c => c.content));

        // Store chunks with embeddings
        for (let i = 0; i < batch.length; i++) {
          const chunk = batch[i];
          const embedding = embeddings[i];

          if (embedding) {
            await this.storeChunk({
              documentId: options.documentId,
              content: chunk.content,
              embedding,
              metadata: chunk.metadata,
              position: chunk.position,
              pageNumber: chunk.pageNumber,
              namespace: options.namespace,
              subject: options.subject,
              level: options.level,
            });
            chunksEmbedded++;
          } else {
            errors.push(`Failed to embed chunk ${chunk.position}`);
          }
        }
      } catch (error) {
        errors.push(`Batch processing error: ${(error as Error).message}`);
      }
    }

    // Update document status
    const finalStatus = chunksEmbedded === document.chunks.length ? 'completed' : 'failed';
    await this.updateDocumentStatus(options.documentId, finalStatus, chunksEmbedded);

    return {
      documentId: options.documentId,
      chunksEmbedded,
      totalChunks: document.chunks.length,
      processingTime: Date.now() - startTime,
      errors,
    };
  }

  /**
   * Generate embeddings for a batch of texts.
   * Uses Gemini (primary) or OpenAI (fallback).
   */
  private async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    const provider = this.getProvider();

    if (!provider) {
      console.error('[DocumentEmbedder] No embedding provider available');
      return texts.map(() => null);
    }

    if (provider === 'gemini') {
      return this.generateGeminiEmbeddings(texts);
    } else {
      return this.generateOpenAIEmbeddings(texts);
    }
  }

  /**
   * Generate embeddings using Google Gemini.
   */
  private async generateGeminiEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.geminiClient) {
      return texts.map(() => null);
    }

    const results: (number[] | null)[] = [];
    const model = this.geminiClient.getGenerativeModel({ model: this.config.model });

    // Gemini processes one at a time or in small batches
    for (const text of texts) {
      try {
        // Truncate if too long (Gemini has ~8000 token limit for embeddings)
        const truncatedText = text.slice(0, 8000);

        const result = await model.embedContent(truncatedText);
        const embedding = result.embedding.values;

        // Gemini returns 768 dims by default, pad to 1536 if needed for compatibility
        if (embedding.length < this.config.dimensions) {
          const padded = new Array(this.config.dimensions).fill(0);
          for (let i = 0; i < embedding.length; i++) {
            padded[i] = embedding[i];
          }
          results.push(padded);
        } else {
          results.push(embedding.slice(0, this.config.dimensions));
        }
      } catch (error) {
        console.error('[DocumentEmbedder] Gemini embedding error:', error);
        results.push(null);
      }
    }

    return results;
  }

  /**
   * Generate embeddings using OpenAI.
   */
  private async generateOpenAIEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.openaiApiKey) {
      return texts.map(() => null);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts.map(t => t.slice(0, 8000)), // Truncate long texts
          dimensions: this.config.dimensions,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[DocumentEmbedder] OpenAI API error:', error);
        return texts.map(() => null);
      }

      const data = await response.json();

      // Map results back, handling any errors
      return texts.map((_, index) => {
        const result = data.data?.find((d: any) => d.index === index);
        return result?.embedding || null;
      });
    } catch (error) {
      console.error('[DocumentEmbedder] OpenAI embedding error:', error);
      return texts.map(() => null);
    }
  }

  /**
   * Generate a single embedding for a query.
   * Used by the knowledge retriever for search.
   */
  async generateQueryEmbedding(text: string): Promise<number[] | null> {
    const results = await this.generateEmbeddings([text]);
    return results[0];
  }

  /**
   * Store a chunk with its embedding in the database.
   */
  private async storeChunk(data: {
    documentId: string;
    content: string;
    embedding: number[];
    metadata: any;
    position: number;
    pageNumber?: number;
    namespace: string;
    subject?: SageSubject;
    level?: SageLevel;
  }): Promise<void> {
    if (!this.supabase) return;

    const { error } = await this.supabase
      .from('sage_knowledge_chunks')
      .insert({
        document_id: data.documentId,
        content: data.content,
        embedding: data.embedding,
        metadata: data.metadata,
        position: data.position,
        page_number: data.pageNumber,
        namespace: data.namespace,
        subject: data.subject,
        level: data.level,
      });

    if (error) {
      throw new Error(`Failed to store chunk: ${error.message}`);
    }
  }

  /**
   * Update document embedding status.
   */
  private async updateDocumentStatus(
    documentId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    chunkCount?: number
  ): Promise<void> {
    if (!this.supabase) return;

    const updateData: any = {
      embedding_status: status,
      updated_at: new Date().toISOString(),
    };

    if (chunkCount !== undefined) {
      updateData.chunk_count = chunkCount;
    }

    await this.supabase
      .from('sage_uploads')
      .update(updateData)
      .eq('id', documentId);
  }

  /**
   * Split chunks into batches.
   */
  private batchChunks(
    chunks: ExtractedChunk[],
    batchSize: number
  ): ExtractedChunk[][] {
    const batches: ExtractedChunk[][] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      batches.push(chunks.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Delete embeddings for a document.
   */
  async deleteDocumentEmbeddings(documentId: string): Promise<void> {
    if (!this.supabase) return;

    await this.supabase
      .from('sage_knowledge_chunks')
      .delete()
      .eq('document_id', documentId);
  }
}

// --- Singleton Export ---

export const documentEmbedder = new DocumentEmbedder();

export default DocumentEmbedder;
