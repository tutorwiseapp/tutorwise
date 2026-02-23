-- ===================================================================
-- Migration: 302_add_ai_tutor_hybrid_search.sql
-- Purpose: Add hybrid search RPC for AI tutors in marketplace
-- Version: v1.0
-- Date: 2026-02-23
-- ===================================================================

-- ===================================================================
-- SECTION 1: CREATE HYBRID SEARCH RPC FOR AI TUTORS
-- ===================================================================

CREATE OR REPLACE FUNCTION public.search_ai_tutors_hybrid(
  query_embedding text DEFAULT NULL,
  filter_subjects text[] DEFAULT NULL,
  filter_min_price numeric DEFAULT NULL,
  filter_max_price numeric DEFAULT NULL,
  filter_search_text text DEFAULT NULL,
  match_count integer DEFAULT 10,
  match_offset integer DEFAULT 0,
  match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  name varchar,
  display_name varchar,
  description text,
  avatar_url text,
  subject varchar,
  price_per_hour numeric,
  currency varchar,
  status varchar,
  subscription_status varchar,
  avg_rating numeric,
  total_reviews integer,
  total_sessions integer,
  total_revenue numeric,
  created_at timestamptz,
  published_at timestamptz,
  similarity float,
  rank_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH embedding_search AS (
    -- Semantic search using description embeddings (if query_embedding provided)
    SELECT
      t.id,
      t.name,
      t.display_name,
      t.description,
      t.avatar_url,
      t.subject,
      t.price_per_hour,
      t.currency,
      t.status,
      t.subscription_status,
      t.avg_rating,
      t.total_reviews,
      t.total_sessions,
      t.total_revenue,
      t.created_at,
      t.published_at,
      CASE
        WHEN query_embedding IS NOT NULL THEN
          -- Vector similarity: use description embedding
          -- For MVP, we use a simple text similarity score
          -- TODO: Add ai_tutors.description_embedding column for true semantic search
          1.0 - (
            CASE
              WHEN t.description IS NULL THEN 1.0
              ELSE similarity(COALESCE(filter_search_text, ''), COALESCE(t.description, ''))
            END
          )
        ELSE 0.0
      END AS similarity_score
    FROM public.ai_tutors t
    WHERE
      -- Must be published and subscription active
      t.status = 'published'
      AND t.subscription_status = 'active'
      -- Subject filter
      AND (filter_subjects IS NULL OR t.subject = ANY(filter_subjects))
      -- Price filters
      AND (filter_min_price IS NULL OR t.price_per_hour >= filter_min_price)
      AND (filter_max_price IS NULL OR t.price_per_hour <= filter_max_price)
      -- Text search filter (if no embedding)
      AND (
        filter_search_text IS NULL
        OR query_embedding IS NOT NULL
        OR (
          t.display_name ILIKE '%' || filter_search_text || '%'
          OR t.description ILIKE '%' || filter_search_text || '%'
          OR t.subject ILIKE '%' || filter_search_text || '%'
        )
      )
  ),
  ranked_results AS (
    SELECT
      *,
      -- Ranking: combine similarity + popularity + quality
      (
        COALESCE(similarity_score, 0.0) * 0.4 +  -- Semantic similarity weight
        (COALESCE(total_sessions, 0) / NULLIF((SELECT MAX(total_sessions) FROM embedding_search), 0)) * 0.3 +  -- Popularity
        COALESCE(avg_rating, 0.0) / 5.0 * 0.2 +  -- Quality (rating)
        (COALESCE(total_reviews, 0) / NULLIF((SELECT MAX(total_reviews) FROM embedding_search), 0)) * 0.1  -- Social proof
      ) AS rank_score
    FROM embedding_search
  )
  SELECT
    r.id,
    r.name,
    r.display_name,
    r.description,
    r.avatar_url,
    r.subject,
    r.price_per_hour,
    r.currency,
    r.status,
    r.subscription_status,
    r.avg_rating,
    r.total_reviews,
    r.total_sessions,
    r.total_revenue,
    r.created_at,
    r.published_at,
    r.similarity_score::float AS similarity,
    r.rank_score::float AS rank_score
  FROM ranked_results r
  WHERE
    -- Filter by similarity threshold (if using embeddings)
    (query_embedding IS NULL OR r.similarity_score >= match_threshold)
  ORDER BY
    r.rank_score DESC,
    r.total_sessions DESC,
    r.created_at DESC
  LIMIT match_count
  OFFSET match_offset;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION public.search_ai_tutors_hybrid IS 'v1.0: Hybrid search for AI tutors (semantic + structured filters)';

-- ===================================================================
-- SECTION 2: CREATE MATCH_AI_TUTOR_CHUNKS RPC (if not exists)
-- ===================================================================
-- This RPC is used for RAG retrieval during AI tutor sessions

CREATE OR REPLACE FUNCTION public.match_ai_tutor_chunks(
  query_embedding vector(768),
  ai_tutor_id_filter uuid,
  match_count integer DEFAULT 5,
  match_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  material_id uuid,
  chunk_text text,
  chunk_index integer,
  page_number integer,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.material_id,
    c.chunk_text,
    c.chunk_index,
    c.page_number,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.ai_tutor_material_chunks c
  WHERE
    c.ai_tutor_id = ai_tutor_id_filter
    AND 1 - (c.embedding <=> query_embedding) >= match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.match_ai_tutor_chunks IS 'v1.0: Vector similarity search for AI tutor material chunks (RAG)';

-- ===================================================================
-- SECTION 3: ENABLE pg_trgm EXTENSION FOR TEXT SIMILARITY
-- ===================================================================
-- Required for similarity() function in hybrid search

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ===================================================================
-- SECTION 4: VALIDATION
-- ===================================================================

DO $$
BEGIN
  -- Test search_ai_tutors_hybrid function
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'search_ai_tutors_hybrid'
  ) THEN
    RAISE EXCEPTION 'Function search_ai_tutors_hybrid was not created successfully';
  END IF;

  -- Test match_ai_tutor_chunks function
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'match_ai_tutor_chunks'
  ) THEN
    RAISE EXCEPTION 'Function match_ai_tutor_chunks was not created successfully';
  END IF;

  RAISE NOTICE 'Migration 302_add_ai_tutor_hybrid_search completed successfully';
  RAISE NOTICE '✓ Created search_ai_tutors_hybrid RPC';
  RAISE NOTICE '✓ Created match_ai_tutor_chunks RPC';
  RAISE NOTICE '✓ Enabled pg_trgm extension';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
