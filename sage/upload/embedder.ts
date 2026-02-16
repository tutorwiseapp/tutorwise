/**
 * Sage Embedder
 *
 * Generates embeddings for document chunks and stores them
 * in pgvector for similarity search.
 *
 * Uses Google Gemini text-embedding-004 (768 dimensions).
 * Standardised on Gemini as the sole embedding provider.
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

export interface EmbedderConfig {
  model?: string;
  batchSize?: number;
  dimensions?: number;
}

const DEFAULT_CONFIG: Required<EmbedderConfig> = {
  model: 'gemini-embedding-001',
  batchSize: 20,
  dimensions: 768,
};

// --- Embedder Class ---

export class DocumentEmbedder {
  private supabase: SupabaseClient | null = null;
  private config: Required<EmbedderConfig>;
  private geminiClient: GoogleGenerativeAI | null = null;

  constructor(config?: EmbedderConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize with Supabase client and Gemini embedding provider.
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

    // Initialize Gemini embedding provider
    const googleKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;

    if (googleKey) {
      this.geminiClient = new GoogleGenerativeAI(googleKey);
      console.log('[DocumentEmbedder] Initialized with Gemini embeddings (768-dim)');
    } else {
      console.warn('[DocumentEmbedder] No embedding API key found. Set GOOGLE_AI_API_KEY');
    }
  }

  /**
   * Check if the embedder is ready.
   */
  isReady(): boolean {
    return this.geminiClient !== null;
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
   * Generate embeddings for a batch of texts using Gemini.
   */
  private async generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
    if (!this.geminiClient) {
      console.error('[DocumentEmbedder] Gemini client not initialized');
      return texts.map(() => null);
    }

    const results: (number[] | null)[] = [];
    const model = this.geminiClient.getGenerativeModel({ model: this.config.model });

    for (const text of texts) {
      try {
        // Truncate if too long (Gemini has ~8000 token limit for embeddings)
        const truncatedText = text.slice(0, 8000);

        const result = await model.embedContent({
          content: { role: 'user', parts: [{ text: truncatedText }] },
          outputDimensionality: this.config.dimensions,
        } as any);
        results.push(result.embedding.values);
      } catch (error) {
        console.error('[DocumentEmbedder] Gemini embedding error:', error);
        results.push(null);
      }
    }

    return results;
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
