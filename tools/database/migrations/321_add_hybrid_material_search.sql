/**
 * Migration 321: Add hybrid search for AI agent material chunks
 * Purpose: Combine vector similarity with BM25 full-text search
 * Created: 2026-02-28
 *
 * Adds tsvector column to ai_agent_material_chunks and creates
 * a hybrid search RPC that combines cosine similarity (70%) with
 * ts_rank_cd (30%) for better keyword+semantic matching.
 */

-- 1. Add tsvector column
ALTER TABLE public.ai_agent_material_chunks
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Backfill existing rows
UPDATE public.ai_agent_material_chunks
SET search_vector = to_tsvector('english', COALESCE(chunk_text, ''));

-- 3. GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_ai_agent_chunks_fts
  ON public.ai_agent_material_chunks USING gin(search_vector);

-- 4. Auto-update trigger on chunk_text changes
CREATE OR REPLACE FUNCTION public.ai_agent_chunks_update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.chunk_text, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_agent_chunks_search_vector ON public.ai_agent_material_chunks;
CREATE TRIGGER trg_ai_agent_chunks_search_vector
  BEFORE INSERT OR UPDATE OF chunk_text ON public.ai_agent_material_chunks
  FOR EACH ROW EXECUTE FUNCTION public.ai_agent_chunks_update_search_vector();

-- 5. Hybrid search RPC combining vector + BM25
CREATE OR REPLACE FUNCTION public.search_ai_agent_materials_hybrid(
  query_embedding vector(768),
  query_text TEXT,
  p_agent_id UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  material_id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  page_number INTEGER,
  similarity FLOAT,
  text_rank FLOAT,
  combined_score FLOAT,
  file_name VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.material_id,
    c.chunk_text,
    c.chunk_index,
    c.page_number,
    (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity,
    COALESCE(ts_rank_cd(c.search_vector, plainto_tsquery('english', query_text)), 0)::FLOAT AS text_rank,
    (
      0.7 * (1 - (c.embedding <=> query_embedding)) +
      0.3 * COALESCE(ts_rank_cd(c.search_vector, plainto_tsquery('english', query_text)), 0)
    )::FLOAT AS combined_score,
    m.file_name
  FROM public.ai_agent_material_chunks c
  JOIN public.ai_agent_materials m ON m.id = c.material_id
  WHERE c.agent_id = p_agent_id
    AND (
      (1 - (c.embedding <=> query_embedding)) >= match_threshold
      OR c.search_vector @@ plainto_tsquery('english', query_text)
    )
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.search_ai_agent_materials_hybrid IS 'v1.0: Hybrid vector + BM25 search for AI agent material chunks';
