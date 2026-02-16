/**
 * Lexi Knowledge Seeder
 *
 * Reads Help Centre MDX articles and seeds them as embedded chunks
 * into lexi_knowledge_chunks table.
 *
 * @module lexi/knowledge
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LexiKnowledgeArticle, LexiKnowledgeChunk } from './types';

const LEXI_NAMESPACE = 'lexi/platform';
const EMBEDDING_DIMENSIONS = 768;
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;
const BATCH_SIZE = 20;

export class LexiKnowledgeSeeder {
  private supabase: SupabaseClient | null = null;
  private gemini: GoogleGenerativeAI | null = null;

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

    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      this.gemini = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Seed articles into the knowledge base.
   * Clears existing lexi/platform chunks first, then inserts new ones.
   */
  async seed(articles: LexiKnowledgeArticle[]): Promise<{
    articlesProcessed: number;
    chunksCreated: number;
    errors: string[];
  }> {
    if (!this.supabase || !this.gemini) {
      return { articlesProcessed: 0, chunksCreated: 0, errors: ['Not initialized'] };
    }

    const errors: string[] = [];
    let chunksCreated = 0;

    // Clear existing Lexi chunks
    const { error: deleteError } = await this.supabase
      .from('lexi_knowledge_chunks')
      .delete()
      .eq('namespace', LEXI_NAMESPACE);

    if (deleteError) {
      errors.push(`Failed to clear existing chunks: ${deleteError.message}`);
      return { articlesProcessed: 0, chunksCreated: 0, errors };
    }

    console.log(`[LexiSeeder] Cleared existing lexi/platform chunks`);

    // Process each article
    for (const article of articles) {
      try {
        const chunks = this.chunkArticle(article);
        const stored = await this.embedAndStore(chunks);
        chunksCreated += stored;
        console.log(`[LexiSeeder] ${article.title}: ${stored} chunks`);
      } catch (error) {
        const msg = `Failed to process ${article.title}: ${error instanceof Error ? error.message : 'Unknown'}`;
        errors.push(msg);
        console.error(`[LexiSeeder] ${msg}`);
      }
    }

    console.log(`[LexiSeeder] Complete: ${articles.length} articles, ${chunksCreated} chunks`);

    return {
      articlesProcessed: articles.length,
      chunksCreated,
      errors,
    };
  }

  /**
   * Split an article into chunks with metadata.
   */
  private chunkArticle(article: LexiKnowledgeArticle): LexiKnowledgeChunk[] {
    // Strip MDX components and imports, keep text content
    const cleanContent = this.stripMDX(article.content);

    // Split by sections (## headings)
    const sections = this.splitBySections(cleanContent);
    const chunks: LexiKnowledgeChunk[] = [];

    // Always include the article description as first chunk
    chunks.push({
      content: `${article.title}: ${article.description}`,
      metadata: {
        title: article.title,
        category: article.category,
        slug: article.slug,
        audience: article.audience,
        section: 'overview',
        keywords: article.keywords,
      },
    });

    // Chunk each section
    for (const section of sections) {
      const sectionChunks = this.splitIntoChunks(section.content, CHUNK_SIZE, CHUNK_OVERLAP);

      for (const chunkContent of sectionChunks) {
        if (chunkContent.trim().length < 50) continue; // Skip tiny chunks

        chunks.push({
          content: section.heading ? `${section.heading}\n\n${chunkContent}` : chunkContent,
          metadata: {
            title: article.title,
            category: article.category,
            slug: article.slug,
            audience: article.audience,
            section: section.heading || undefined,
            keywords: article.keywords,
          },
        });
      }
    }

    return chunks;
  }

  /**
   * Generate embeddings and store chunks in the database.
   */
  private async embedAndStore(chunks: LexiKnowledgeChunk[]): Promise<number> {
    if (!this.supabase || !this.gemini) return 0;

    let stored = 0;
    const model = this.gemini.getGenerativeModel({ model: 'gemini-embedding-001' });

    // Process in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings: (number[] | null)[] = [];

      // Generate embeddings for batch
      for (const chunk of batch) {
        try {
          const result = await model.embedContent({
            content: { role: 'user', parts: [{ text: chunk.content.substring(0, 8000) }] },
            outputDimensionality: EMBEDDING_DIMENSIONS,
          } as any);
          embeddings.push(result.embedding.values);
        } catch {
          embeddings.push(null);
        }
      }

      // Store chunks with embeddings
      const rows = batch
        .map((chunk, idx) => {
          if (!embeddings[idx]) return null;
          return {
            content: chunk.content,
            embedding: `[${embeddings[idx]!.join(',')}]`,
            metadata: chunk.metadata,
            namespace: LEXI_NAMESPACE,
            category: chunk.metadata.category,
            position: i + idx,
          };
        })
        .filter(Boolean);

      if (rows.length > 0) {
        const { error } = await this.supabase
          .from('lexi_knowledge_chunks')
          .insert(rows);

        if (error) {
          console.error(`[LexiSeeder] Insert error:`, error.message);
        } else {
          stored += rows.length;
        }
      }
    }

    return stored;
  }

  /**
   * Strip MDX/JSX components, imports, and formatting artifacts.
   */
  private stripMDX(content: string): string {
    return content
      // Remove import statements
      .replace(/^import\s+.*$/gm, '')
      // Remove JSX components but keep text content inside them
      .replace(/<CalloutBox[^>]*>/g, '')
      .replace(/<\/CalloutBox>/g, '')
      .replace(/<Tabs[^>]*>[\s\S]*?<\/Tabs>/g, '')
      .replace(/<VideoEmbed[^>]*\/>/g, '')
      .replace(/<CodeBlock[^>]*>[\s\S]*?<\/CodeBlock>/g, '')
      // Remove inline HTML tags
      .replace(/<[^>]+>/g, '')
      // Clean up excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Split content by ## headings into sections.
   */
  private splitBySections(content: string): { heading: string; content: string }[] {
    const sections: { heading: string; content: string }[] = [];
    const parts = content.split(/^## /gm);

    for (const part of parts) {
      if (!part.trim()) continue;

      const firstNewline = part.indexOf('\n');
      if (firstNewline === -1) {
        sections.push({ heading: '', content: part.trim() });
      } else {
        const heading = part.substring(0, firstNewline).trim();
        const body = part.substring(firstNewline + 1).trim();
        sections.push({ heading, content: body });
      }
    }

    return sections;
  }

  /**
   * Split text into overlapping chunks.
   */
  private splitIntoChunks(text: string, size: number, overlap: number): string[] {
    if (text.length <= size) return [text];

    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = start + size;

      // Try to break at paragraph or sentence boundary
      if (end < text.length) {
        const paragraphBreak = text.lastIndexOf('\n\n', end);
        if (paragraphBreak > start + size * 0.5) {
          end = paragraphBreak;
        } else {
          const sentenceBreak = text.lastIndexOf('. ', end);
          if (sentenceBreak > start + size * 0.5) {
            end = sentenceBreak + 1;
          }
        }
      }

      chunks.push(text.substring(start, end).trim());
      start = end - overlap;
    }

    return chunks;
  }

}

// --- Singleton Export ---

export const lexiKnowledgeSeeder = new LexiKnowledgeSeeder();

export default LexiKnowledgeSeeder;
