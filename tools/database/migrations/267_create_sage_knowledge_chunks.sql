-- Sage Knowledge Chunks Table (pgvector)
-- Migration: 267_create_sage_knowledge_chunks.sql
--
-- Creates the knowledge chunks table for RAG retrieval in Sage.
-- Uses pgvector for semantic similarity search.
-- Requires: vector extension (enabled in migration 112)

-- ============================================
-- SAGE KNOWLEDGE CHUNKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sage_knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES sage_uploads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI/Gemini embedding dimensions
    metadata JSONB DEFAULT '{}',
    position INTEGER NOT NULL DEFAULT 0,
    page_number INTEGER,
    namespace TEXT NOT NULL,
    subject TEXT, -- maths, english, science, general
    level TEXT, -- GCSE, A-Level, University, Other
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sage_knowledge_chunks
CREATE INDEX IF NOT EXISTS idx_sage_chunks_document_id ON sage_knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_sage_chunks_namespace ON sage_knowledge_chunks(namespace);
CREATE INDEX IF NOT EXISTS idx_sage_chunks_subject ON sage_knowledge_chunks(subject);
CREATE INDEX IF NOT EXISTS idx_sage_chunks_level ON sage_knowledge_chunks(level);

-- Vector similarity index using IVFFlat
-- Note: Index is created after initial data load for better quality
-- Run REINDEX after loading significant data
CREATE INDEX IF NOT EXISTS idx_sage_chunks_embedding
ON sage_knowledge_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE sage_knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================
-- Users can view chunks from documents they own
DROP POLICY IF EXISTS "Users can view own document chunks" ON sage_knowledge_chunks;
CREATE POLICY "Users can view own document chunks" ON sage_knowledge_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sage_uploads
            WHERE sage_uploads.id = sage_knowledge_chunks.document_id
            AND sage_uploads.owner_id = auth.uid()
        )
    );

-- Users can view chunks from documents shared with them
DROP POLICY IF EXISTS "Users can view shared document chunks" ON sage_knowledge_chunks;
CREATE POLICY "Users can view shared document chunks" ON sage_knowledge_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sage_uploads
            WHERE sage_uploads.id = sage_knowledge_chunks.document_id
            AND auth.uid() = ANY(sage_uploads.shared_with)
        )
    );

-- Users can view chunks from public documents
DROP POLICY IF EXISTS "Users can view public document chunks" ON sage_knowledge_chunks;
CREATE POLICY "Users can view public document chunks" ON sage_knowledge_chunks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sage_uploads
            WHERE sage_uploads.id = sage_knowledge_chunks.document_id
            AND sage_uploads.visibility = 'public'
        )
    );

-- Service role full access
DROP POLICY IF EXISTS "Service role full access to chunks" ON sage_knowledge_chunks;
CREATE POLICY "Service role full access to chunks" ON sage_knowledge_chunks
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- SEMANTIC SEARCH FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
    query_embedding vector(1536),
    match_namespace TEXT DEFAULT NULL,
    match_subject TEXT DEFAULT NULL,
    match_level TEXT DEFAULT NULL,
    match_count INT DEFAULT 10,
    match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    metadata JSONB,
    chunk_position INTEGER,
    page_number INTEGER,
    similarity FLOAT,
    filename TEXT,
    owner_id UUID,
    subject TEXT,
    level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.document_id,
        c.content,
        c.metadata,
        c."position" as chunk_position,
        c.page_number,
        1 - (c.embedding <=> query_embedding) as similarity,
        u.filename,
        u.owner_id,
        c.subject,
        c.level
    FROM sage_knowledge_chunks c
    JOIN sage_uploads u ON u.id = c.document_id
    WHERE
        c.embedding IS NOT NULL
        AND (match_namespace IS NULL OR c.namespace = match_namespace)
        AND (match_subject IS NULL OR c.subject = match_subject)
        AND (match_level IS NULL OR c.level = match_level)
        AND 1 - (c.embedding <=> query_embedding) > match_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_knowledge_chunks IS
'Semantic search for knowledge chunks using vector similarity. Supports filtering by namespace, subject, and level.';

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE sage_knowledge_chunks IS 'Stores embedded chunks from uploaded teaching materials for RAG retrieval';
COMMENT ON COLUMN sage_knowledge_chunks.embedding IS 'Vector embedding (1536 dims) generated by OpenAI or Gemini';
COMMENT ON COLUMN sage_knowledge_chunks.namespace IS 'Access namespace: users/{id}, shared/{id}, or global';
COMMENT ON COLUMN sage_knowledge_chunks.metadata IS 'Chunk metadata: type (heading/text/formula), page info, etc.';
