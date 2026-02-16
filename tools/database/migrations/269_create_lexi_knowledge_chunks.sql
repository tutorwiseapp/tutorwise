-- Lexi Knowledge Chunks Table (pgvector)
-- Migration: 269_create_lexi_knowledge_chunks.sql
--
-- Stores platform knowledge (Help Centre articles) for Lexi RAG retrieval.
-- Uses pgvector HNSW index for semantic similarity search.
-- Requires: vector extension (enabled in migration 112)

-- ============================================
-- LEXI KNOWLEDGE CHUNKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lexi_knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB DEFAULT '{}',
    namespace TEXT NOT NULL DEFAULT 'lexi/platform',
    category TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lexi_chunks_namespace ON lexi_knowledge_chunks(namespace);
CREATE INDEX IF NOT EXISTS idx_lexi_chunks_category ON lexi_knowledge_chunks(category);

-- HNSW vector index (better recall than IVFFlat, no REINDEX needed)
CREATE INDEX IF NOT EXISTS idx_lexi_chunks_embedding_hnsw
ON lexi_knowledge_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE lexi_knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read platform knowledge
DROP POLICY IF EXISTS "Authenticated users can read lexi chunks" ON lexi_knowledge_chunks;
CREATE POLICY "Authenticated users can read lexi chunks" ON lexi_knowledge_chunks
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role full access (for seeding)
DROP POLICY IF EXISTS "Service role full access to lexi chunks" ON lexi_knowledge_chunks;
CREATE POLICY "Service role full access to lexi chunks" ON lexi_knowledge_chunks
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- SEMANTIC SEARCH FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION match_lexi_knowledge_chunks(
    query_embedding vector(768),
    match_category TEXT DEFAULT NULL,
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    category TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.content,
        c.metadata,
        c.category,
        1 - (c.embedding <=> query_embedding) as similarity
    FROM lexi_knowledge_chunks c
    WHERE
        c.embedding IS NOT NULL
        AND (match_category IS NULL OR c.category = match_category)
        AND 1 - (c.embedding <=> query_embedding) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON TABLE lexi_knowledge_chunks IS 'Stores embedded platform knowledge for Lexi AI assistant RAG retrieval';
COMMENT ON FUNCTION match_lexi_knowledge_chunks IS 'Semantic search for Lexi platform knowledge chunks';
