/**
 * Filename: lib/ai-agents/link-indexer.ts
 * Purpose: Chunk and embed crawled link content
 * Created: 2026-02-28
 *
 * Takes crawled text, splits into overlapping chunks,
 * generates Gemini embeddings, and inserts into ai_agent_link_chunks.
 */

import { createServiceRoleClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { crawlLink } from './link-crawler';

const CHUNK_SIZE = 500; // ~500 tokens per chunk
const CHUNK_OVERLAP = 50; // 50 token overlap between chunks

/**
 * Crawl a link, chunk its content, generate embeddings, and store.
 */
export async function indexLink(
  linkId: string,
  agentId: string,
  url: string
): Promise<{ success: boolean; chunksCreated: number; error?: string }> {
  const supabase = createServiceRoleClient();

  try {
    // Update crawl status
    await supabase
      .from('ai_agent_links')
      .update({ crawl_status: 'crawling' })
      .eq('id', linkId);

    // Crawl the URL
    const crawlResult = await crawlLink(url);

    if (!crawlResult.success) {
      await supabase
        .from('ai_agent_links')
        .update({ crawl_status: 'failed' })
        .eq('id', linkId);
      return { success: false, chunksCreated: 0, error: crawlResult.error };
    }

    // Chunk the text
    const chunks = chunkText(crawlResult.text, CHUNK_SIZE, CHUNK_OVERLAP);

    if (chunks.length === 0) {
      await supabase
        .from('ai_agent_links')
        .update({ crawl_status: 'failed' })
        .eq('id', linkId);
      return { success: false, chunksCreated: 0, error: 'No chunks generated' };
    }

    // Generate embeddings for all chunks
    const embeddings = await generateEmbeddings(chunks);

    // Delete existing chunks for this link (re-crawl)
    await supabase
      .from('ai_agent_link_chunks')
      .delete()
      .eq('link_id', linkId);

    // Insert chunks with embeddings
    const rows = chunks.map((text, idx) => ({
      link_id: linkId,
      agent_id: agentId,
      chunk_text: text,
      chunk_index: idx,
      embedding: JSON.stringify(embeddings[idx]),
    }));

    // Batch insert (max 50 at a time)
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabase
        .from('ai_agent_link_chunks')
        .insert(batch);

      if (error) {
        console.error(`[LinkIndexer] Batch insert error:`, error.message);
      }
    }

    // Update link crawl status
    await supabase
      .from('ai_agent_links')
      .update({
        crawl_status: 'completed',
        crawled_at: new Date().toISOString(),
      })
      .eq('id', linkId);

    return { success: true, chunksCreated: chunks.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LinkIndexer] Error:', message);

    await supabase
      .from('ai_agent_links')
      .update({ crawl_status: 'failed' })
      .eq('id', linkId);

    return { success: false, chunksCreated: 0, error: message };
  }
}

/**
 * Split text into overlapping chunks by word count.
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length <= chunkSize) {
    return [words.join(' ')];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(' '));
    start += chunkSize - overlap;
  }

  return chunks;
}

/**
 * Generate embeddings for multiple texts using Gemini.
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const googleKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!googleKey) throw new Error('Google AI API key not configured');

  const genAI = new GoogleGenerativeAI(googleKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

  const embeddings: number[][] = [];

  // Process in batches of 10 (API limit)
  for (let i = 0; i < texts.length; i += 10) {
    const batch = texts.slice(i, i + 10);
    const results = await Promise.all(
      batch.map(text =>
        model.embedContent({
          content: { role: 'user', parts: [{ text: text.slice(0, 8000) }] },
          outputDimensionality: 768,
        } as any)
      )
    );
    embeddings.push(...results.map(r => r.embedding.values));
  }

  return embeddings;
}
