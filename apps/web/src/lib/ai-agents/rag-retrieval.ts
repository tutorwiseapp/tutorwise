/**
 * Filename: rag-retrieval.ts
 * Purpose: RAG Retrieval for AI Tutors - multi-tier priority search
 * Created: 2026-02-23
 * Version: v1.0
 *
 * 3-tier retrieval priority:
 * 1. AI tutor materials (uploaded files via vector similarity search)
 * 2. AI tutor links (URL references ordered by priority)
 * 3. Sage fallback (general knowledge from sage_knowledge_chunks)
 */

import { createClient } from '@/utils/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface RetrievedChunk {
  text: string;
  source: string;
  similarity: number;
  metadata: {
    file_name?: string;
    page_number?: number;
    url?: string;
  };
}

/**
 * Generate embedding for a query using Gemini
 */
async function generateQueryEmbedding(query: string): Promise<number[]> {
  const googleKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!googleKey) throw new Error('Google AI API key not configured');

  const genAI = new GoogleGenerativeAI(googleKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

  const result = await model.embedContent({
    content: { role: 'user', parts: [{ text: query.slice(0, 8000) }] },
    outputDimensionality: 768,
  } as any);

  return result.embedding.values;
}

/**
 * Retrieve context for AI tutor using multi-tier priority:
 * 1. AI tutor materials (uploaded files)
 * 2. AI tutor links (URLs)
 * 3. Sage fallback (general knowledge)
 */
export async function retrieveContext(
  query: string,
  aiAgentId: string,
  topK: number = 5
): Promise<{
  chunks: RetrievedChunk[];
  source: 'tutor_materials' | 'tutor_links' | 'sage_fallback';
  usedFallback: boolean;
}> {
  const supabase = await createClient();

  // Generate query embedding
  let queryEmbedding: number[];
  try {
    queryEmbedding = await generateQueryEmbedding(query);
  } catch (err) {
    console.error('[RAG] Failed to generate query embedding:', err);
    return { chunks: [], source: 'tutor_materials', usedFallback: false };
  }

  // Priority 1: Hybrid search AI tutor material chunks (vector + BM25)
  try {
    const { data: materialChunks, error } = await supabase.rpc('search_ai_agent_materials_hybrid', {
      query_embedding: JSON.stringify(queryEmbedding),
      query_text: query,
      p_agent_id: aiAgentId,
      match_threshold: 0.5,
      match_count: topK,
    });

    if (!error && materialChunks && materialChunks.length >= 2) {
      return {
        chunks: materialChunks.map((c: any) => ({
          text: c.chunk_text,
          source: 'tutor_materials',
          similarity: c.combined_score || c.similarity,
          metadata: {
            file_name: c.file_name,
            page_number: c.page_number,
          },
        })),
        source: 'tutor_materials',
        usedFallback: false,
      };
    }
  } catch (err) {
    console.warn('[RAG] Hybrid material search failed, trying links:', err);
  }

  // Priority 2: AI tutor link chunks (hybrid vector + BM25 search)
  try {
    const { data: linkChunks, error: linkError } = await supabase.rpc('search_ai_agent_link_chunks_hybrid', {
      query_embedding: JSON.stringify(queryEmbedding),
      query_text: query,
      p_agent_id: aiAgentId,
      match_threshold: 0.5,
      match_count: topK,
    });

    if (!linkError && linkChunks && linkChunks.length >= 1) {
      return {
        chunks: linkChunks.map((c: any) => ({
          text: c.chunk_text,
          source: 'tutor_links',
          similarity: c.combined_score || c.similarity,
          metadata: { url: c.link_url },
        })),
        source: 'tutor_links',
        usedFallback: false,
      };
    }

    // Fallback: keyword-filtered link metadata (for uncrawled links)
    const { data: links } = await supabase
      .from('ai_agent_links')
      .select('*')
      .eq('agent_id', aiAgentId)
      .eq('status', 'active')
      .order('priority', { ascending: true })
      .limit(topK);

    if (links && links.length > 0) {
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const relevantLinks = links.filter(link => {
        const text = `${link.title || ''} ${link.description || ''} ${(link.skills || []).join(' ')}`.toLowerCase();
        return queryWords.some(word => text.includes(word));
      });

      const linksToReturn = relevantLinks.length > 0 ? relevantLinks : links.slice(0, 2);

      if (linksToReturn.length > 0) {
        return {
          chunks: linksToReturn.map((link: any) => ({
            text: `Reference: ${link.title || link.url}\n${link.description || ''}\nURL: ${link.url}`,
            source: 'tutor_links',
            similarity: 0.75,
            metadata: { url: link.url },
          })),
          source: 'tutor_links',
          usedFallback: false,
        };
      }
    }
  } catch (err) {
    console.warn('[RAG] Link search failed, trying Sage fallback:', err);
  }

  // Priority 3: Sage fallback (general knowledge from sage_knowledge_chunks)
  try {
    const { data: sageChunks, error } = await supabase.rpc('match_sage_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.6,
      match_count: topK,
    });

    if (!error && sageChunks && sageChunks.length > 0) {
      return {
        chunks: sageChunks.map((c: any) => ({
          text: c.content,
          source: 'sage_fallback',
          similarity: c.similarity,
          metadata: {},
        })),
        source: 'sage_fallback',
        usedFallback: true,
      };
    }
  } catch (err) {
    console.warn('[RAG] Sage fallback search failed:', err);
  }

  // No results from any tier
  return {
    chunks: [],
    source: 'tutor_materials',
    usedFallback: false,
  };
}

/**
 * Format retrieved chunks into a context string for the AI model
 */
export function formatContextForPrompt(
  chunks: RetrievedChunk[],
  source: string
): string {
  if (chunks.length === 0) return '';

  const parts: string[] = [];

  if (source === 'tutor_materials') {
    parts.push('### Knowledge from uploaded materials:\n');
  } else if (source === 'tutor_links') {
    parts.push('### Reference links:\n');
  } else if (source === 'sage_fallback') {
    parts.push('### General knowledge (Sage):\n');
  }

  for (const chunk of chunks) {
    if (chunk.metadata.file_name) {
      parts.push(`[Source: ${chunk.metadata.file_name}${chunk.metadata.page_number ? `, p.${chunk.metadata.page_number}` : ''}]`);
    }
    parts.push(chunk.text);
    parts.push('');
  }

  return parts.join('\n');
}
