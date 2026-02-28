/**
 * Migration 324: Link Content Indexing
 * Purpose: Store crawled and chunked link content for vector search
 * Created: 2026-02-28
 *
 * Enables vector search on actual link page content (Tier 2 RAG upgrade).
 * Previously Tier 2 only matched on link title/description keywords.
 */

-- 1. Link chunks table
CREATE TABLE IF NOT EXISTS public.ai_agent_link_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.ai_agent_links(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER DEFAULT 0,
  embedding vector(768),
  search_vector tsvector,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX idx_ai_agent_link_chunks_link ON public.ai_agent_link_chunks(link_id);
CREATE INDEX idx_ai_agent_link_chunks_agent ON public.ai_agent_link_chunks(agent_id);
CREATE INDEX idx_ai_agent_link_chunks_embedding ON public.ai_agent_link_chunks
  USING hnsw(embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_ai_agent_link_chunks_fts ON public.ai_agent_link_chunks USING gin(search_vector);

-- 3. Auto-update tsvector trigger
CREATE OR REPLACE FUNCTION public.ai_agent_link_chunks_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.chunk_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_agent_link_chunks_search_vector
  BEFORE INSERT OR UPDATE OF chunk_text ON public.ai_agent_link_chunks
  FOR EACH ROW EXECUTE FUNCTION public.ai_agent_link_chunks_update_search_vector();

-- 4. Add crawl status to links table
ALTER TABLE public.ai_agent_links ADD COLUMN IF NOT EXISTS crawl_status TEXT DEFAULT 'pending';
ALTER TABLE public.ai_agent_links ADD COLUMN IF NOT EXISTS crawled_at TIMESTAMPTZ;

-- 5. RLS
ALTER TABLE public.ai_agent_link_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "link_chunks_owner_read" ON public.ai_agent_link_chunks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      WHERE a.id = ai_agent_link_chunks.agent_id
      AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "link_chunks_service_all" ON public.ai_agent_link_chunks
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Hybrid search RPC for link chunks
CREATE OR REPLACE FUNCTION public.search_ai_agent_link_chunks_hybrid(
  query_embedding vector(768),
  query_text TEXT,
  p_agent_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  link_id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  similarity FLOAT,
  text_rank FLOAT,
  combined_score FLOAT,
  link_url TEXT,
  link_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.link_id,
    c.chunk_text,
    c.chunk_index,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity,
    COALESCE(ts_rank_cd(c.search_vector, plainto_tsquery('english', query_text)), 0)::FLOAT AS text_rank,
    (
      0.7 * (1 - (c.embedding <=> query_embedding)) +
      0.3 * COALESCE(ts_rank_cd(c.search_vector, plainto_tsquery('english', query_text)), 0)
    )::FLOAT AS combined_score,
    l.url AS link_url,
    l.title AS link_title
  FROM public.ai_agent_link_chunks c
  JOIN public.ai_agent_links l ON l.id = c.link_id
  WHERE c.agent_id = p_agent_id
    AND (
      (1 - (c.embedding <=> query_embedding)) >= match_threshold
      OR c.search_vector @@ plainto_tsquery('english', query_text)
    )
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
