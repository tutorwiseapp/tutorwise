-- ============================================================================
-- Migration 268: Migrate to Gemini 768-Dimension Embeddings
-- ============================================================================
-- Purpose: Standardise all embeddings on Google Gemini text-embedding-004 (768-dim)
--          Replace OpenAI text-embedding-3-small (1536-dim)
--          Upgrade from IVFFLAT to HNSW indexes for 200K+ scale
--          Add organisation embeddings and hybrid search RPCs
--
-- Changes:
--   1. Drop old IVFFLAT indexes
--   2. NULL out existing 1536-dim embeddings (incompatible with 768)
--   3. ALTER embedding columns from vector(1536) → vector(768)
--   4. Add embedding column to connection_groups (organisations)
--   5. Create HNSW indexes (better recall, no periodic REINDEX)
--   6. Recreate existing RPCs with vector(768) signatures
--   7. Create new hybrid search RPCs (listings, profiles, organisations)
--
-- Requires: pgvector extension (already enabled in migration 112)
-- ============================================================================

BEGIN;

-- =====================================================================
-- STEP 1: Drop existing IVFFLAT indexes (required before dimension change)
-- =====================================================================

DROP INDEX IF EXISTS idx_listings_embedding_cosine;
DROP INDEX IF EXISTS idx_profiles_embedding_cosine;
DROP INDEX IF EXISTS idx_sage_chunks_embedding;

-- =====================================================================
-- STEP 2: NULL out existing embeddings (1536-dim incompatible with 768)
-- =====================================================================

UPDATE listings SET embedding = NULL WHERE embedding IS NOT NULL;
UPDATE profiles SET embedding = NULL WHERE embedding IS NOT NULL;
UPDATE sage_knowledge_chunks SET embedding = NULL WHERE embedding IS NOT NULL;

-- =====================================================================
-- STEP 3: ALTER embedding columns from vector(1536) → vector(768)
-- =====================================================================

ALTER TABLE listings ALTER COLUMN embedding TYPE vector(768);
ALTER TABLE profiles ALTER COLUMN embedding TYPE vector(768);
ALTER TABLE sage_knowledge_chunks ALTER COLUMN embedding TYPE vector(768);

-- =====================================================================
-- STEP 4: Add embedding column to connection_groups (organisations)
-- =====================================================================

ALTER TABLE connection_groups ADD COLUMN IF NOT EXISTS embedding vector(768);

COMMENT ON COLUMN connection_groups.embedding IS
'Semantic embedding vector for organisation profile. Generated using Google Gemini text-embedding-004 (768 dimensions)';

-- Update comments on existing columns
COMMENT ON COLUMN listings.embedding IS
'Semantic embedding vector for listing content. Generated using Google Gemini text-embedding-004 (768 dimensions)';

COMMENT ON COLUMN profiles.embedding IS
'Semantic embedding vector for profile content. Generated using Google Gemini text-embedding-004 (768 dimensions)';

COMMENT ON COLUMN sage_knowledge_chunks.embedding IS
'Semantic embedding vector for knowledge chunk. Generated using Google Gemini text-embedding-004 (768 dimensions)';

-- =====================================================================
-- STEP 5: Create HNSW indexes (future-proofed for 200K+ entities)
-- =====================================================================
-- HNSW advantages over IVFFLAT:
--   - Better recall (99%+ vs ~90%)
--   - No periodic REINDEX needed (self-maintaining)
--   - O(log n) query time
--   - m=16: connections per node (good for 768-dim)
--   - ef_construction=64: build-time accuracy (standard)

CREATE INDEX idx_listings_embedding_hnsw
ON listings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_profiles_embedding_hnsw
ON profiles
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_organisations_embedding_hnsw
ON connection_groups
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_sage_chunks_embedding_hnsw
ON sage_knowledge_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- =====================================================================
-- STEP 6: Update existing RPC functions with vector(768) signatures
-- =====================================================================

-- Drop old functions (signatures changed)
DROP FUNCTION IF EXISTS search_listings_semantic(vector(1536), float, int, text);
DROP FUNCTION IF EXISTS search_profiles_semantic(vector(1536), float, int);
DROP FUNCTION IF EXISTS match_knowledge_chunks(vector(1536), text, text, text, int, float);

-- Recreate search_listings_semantic with 768-dim
CREATE OR REPLACE FUNCTION search_listings_semantic(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20,
  filter_status text DEFAULT 'published'
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title,
    l.description,
    1 - (l.embedding <=> query_embedding) as similarity
  FROM listings l
  WHERE
    l.embedding IS NOT NULL
    AND l.status = filter_status
    AND 1 - (l.embedding <=> query_embedding) > match_threshold
  ORDER BY l.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Recreate search_profiles_semantic with 768-dim
CREATE OR REPLACE FUNCTION search_profiles_semantic(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  full_name text,
  bio text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.bio,
    1 - (p.embedding <=> query_embedding) as similarity
  FROM profiles p
  WHERE
    p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Recreate match_knowledge_chunks with 768-dim
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(768),
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

-- =====================================================================
-- STEP 7: Create hybrid search RPCs
-- =====================================================================

-- --- Listings Hybrid Search ---
CREATE OR REPLACE FUNCTION search_listings_hybrid(
  query_embedding vector(768) DEFAULT NULL,
  filter_subjects text[] DEFAULT NULL,
  filter_levels text[] DEFAULT NULL,
  filter_location_city text DEFAULT NULL,
  filter_delivery_modes text[] DEFAULT NULL,
  filter_min_price numeric DEFAULT NULL,
  filter_max_price numeric DEFAULT NULL,
  filter_free_trial boolean DEFAULT NULL,
  filter_listing_type text DEFAULT NULL,
  filter_search_text text DEFAULT NULL,
  match_count int DEFAULT 20,
  match_offset int DEFAULT 0,
  match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  subjects text[],
  levels text[],
  hourly_rate numeric,
  currency varchar,
  work_location text,
  location_city varchar,
  delivery_mode text[],
  free_trial boolean,
  slug varchar,
  profile_id uuid,
  images text[],
  listing_type varchar,
  published_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.title::text,
    l.description::text,
    l.subjects,
    l.levels,
    l.hourly_rate,
    l.currency,
    l.work_location,
    l.location_city,
    l.delivery_mode,
    l.free_trial,
    l.slug,
    l.profile_id,
    l.images,
    l.listing_type,
    l.published_at,
    CASE
      WHEN query_embedding IS NOT NULL AND l.embedding IS NOT NULL
      THEN (1 - (l.embedding <=> query_embedding))::float
      ELSE 0.0::float
    END as similarity
  FROM listings l
  WHERE
    l.status = 'published'
    -- Structured filters
    AND (filter_subjects IS NULL OR l.subjects && filter_subjects)
    AND (filter_levels IS NULL OR l.levels && filter_levels)
    AND (filter_location_city IS NULL OR l.location_city ILIKE '%' || filter_location_city || '%')
    AND (filter_delivery_modes IS NULL OR l.delivery_mode && filter_delivery_modes)
    AND (filter_min_price IS NULL OR l.hourly_rate >= filter_min_price)
    AND (filter_max_price IS NULL OR l.hourly_rate <= filter_max_price)
    AND (filter_free_trial IS NULL OR l.free_trial = filter_free_trial)
    AND (filter_listing_type IS NULL OR l.listing_type::text = filter_listing_type)
    -- Full-text search on title + description (uses existing GIN index)
    AND (filter_search_text IS NULL OR
         to_tsvector('english', COALESCE(l.title, '') || ' ' || COALESCE(l.description, ''))
         @@ websearch_to_tsquery('english', filter_search_text))
    -- Semantic threshold (only when embedding search is active)
    AND (query_embedding IS NULL OR l.embedding IS NULL OR
         1 - (l.embedding <=> query_embedding) > match_threshold)
  ORDER BY
    CASE
      WHEN query_embedding IS NOT NULL AND l.embedding IS NOT NULL
      THEN l.embedding <=> query_embedding  -- similarity DESC (distance ASC)
      ELSE 0  -- fall back to secondary sort
    END ASC,
    l.published_at DESC NULLS LAST
  LIMIT match_count
  OFFSET match_offset;
END;
$$;

COMMENT ON FUNCTION search_listings_hybrid IS
'Hybrid search: combines structured SQL filters with pgvector semantic similarity. When query_embedding is NULL, behaves as structured-only search.';

-- --- Profiles Hybrid Search ---
CREATE OR REPLACE FUNCTION search_profiles_hybrid(
  query_embedding vector(768) DEFAULT NULL,
  filter_subjects text[] DEFAULT NULL,
  filter_levels text[] DEFAULT NULL,
  filter_city text DEFAULT NULL,
  match_count int DEFAULT 20,
  match_offset int DEFAULT 0,
  match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  full_name text,
  bio text,
  avatar_url text,
  city text,
  identity_verified boolean,
  dbs_verified boolean,
  subjects text[],
  levels text[],
  min_hourly_rate numeric,
  listing_count bigint,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.bio,
    p.avatar_url,
    p.city,
    p.identity_verified,
    COALESCE(p.dbs_verified, false) as dbs_verified,
    -- Aggregate subjects from role_details + listings
    (
      SELECT COALESCE(array_agg(DISTINCT s), '{}')
      FROM (
        SELECT unnest(rd.subjects) as s
        FROM role_details rd
        WHERE rd.profile_id = p.id AND rd.role_type = 'provider'
        UNION
        SELECT unnest(li.subjects) as s
        FROM listings li
        WHERE li.profile_id = p.id AND li.status = 'published'
      ) sub
    ) as subjects,
    -- Aggregate levels from listings
    (
      SELECT COALESCE(array_agg(DISTINCT lv), '{}')
      FROM (
        SELECT unnest(li.levels) as lv
        FROM listings li
        WHERE li.profile_id = p.id AND li.status = 'published'
      ) sub
    ) as levels,
    -- Min hourly rate from published listings
    (
      SELECT MIN(li.hourly_rate)
      FROM listings li
      WHERE li.profile_id = p.id AND li.status = 'published' AND li.hourly_rate IS NOT NULL
    ) as min_hourly_rate,
    -- Count of published listings
    (
      SELECT COUNT(*)
      FROM listings li
      WHERE li.profile_id = p.id AND li.status = 'published'
    ) as listing_count,
    -- Similarity score
    CASE
      WHEN query_embedding IS NOT NULL AND p.embedding IS NOT NULL
      THEN 1 - (p.embedding <=> query_embedding)
      ELSE 0.0
    END as similarity
  FROM profiles p
  WHERE
    p.profile_completed = true
    AND 'tutor' = ANY(p.roles)
    -- City filter
    AND (filter_city IS NULL OR p.city ILIKE '%' || filter_city || '%')
    -- Subject filter: check if tutor has matching subjects in role_details or listings
    AND (filter_subjects IS NULL OR EXISTS (
      SELECT 1 FROM role_details rd
      WHERE rd.profile_id = p.id AND rd.role_type = 'provider' AND rd.subjects && filter_subjects
    ) OR EXISTS (
      SELECT 1 FROM listings li
      WHERE li.profile_id = p.id AND li.status = 'published' AND li.subjects && filter_subjects
    ))
    -- Level filter
    AND (filter_levels IS NULL OR EXISTS (
      SELECT 1 FROM listings li
      WHERE li.profile_id = p.id AND li.status = 'published' AND li.levels && filter_levels
    ))
    -- Semantic threshold
    AND (query_embedding IS NULL OR p.embedding IS NULL OR
         1 - (p.embedding <=> query_embedding) > match_threshold)
  ORDER BY
    CASE
      WHEN query_embedding IS NOT NULL AND p.embedding IS NOT NULL
      THEN p.embedding <=> query_embedding
      ELSE 0
    END ASC,
    p.created_at DESC NULLS LAST
  LIMIT match_count
  OFFSET match_offset;
END;
$$;

COMMENT ON FUNCTION search_profiles_hybrid IS
'Hybrid search for tutor profiles: combines structured filters (subjects, levels, city) with pgvector semantic similarity. Aggregates data from role_details and published listings.';

-- --- Organisations Hybrid Search ---
CREATE OR REPLACE FUNCTION search_organisations_hybrid(
  query_embedding vector(768) DEFAULT NULL,
  filter_subjects text[] DEFAULT NULL,
  filter_city text DEFAULT NULL,
  filter_category text DEFAULT NULL,
  match_count int DEFAULT 10,
  match_offset int DEFAULT 0,
  match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  tagline text,
  avatar_url text,
  location_city text,
  location_country text,
  subjects_offered text[],
  category text,
  caas_score integer,
  business_verified boolean,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cg.id,
    cg.name,
    cg.slug,
    cg.tagline,
    cg.avatar_url,
    cg.location_city,
    cg.location_country,
    cg.subjects_offered,
    cg.category,
    cg.caas_score,
    COALESCE(cg.business_verified, false) as business_verified,
    CASE
      WHEN query_embedding IS NOT NULL AND cg.embedding IS NOT NULL
      THEN 1 - (cg.embedding <=> query_embedding)
      ELSE 0.0
    END as similarity
  FROM connection_groups cg
  WHERE
    cg.type = 'organisation'
    AND COALESCE(cg.public_visible, false) = true
    -- Subject filter
    AND (filter_subjects IS NULL OR cg.subjects_offered && filter_subjects)
    -- City filter
    AND (filter_city IS NULL OR cg.location_city ILIKE '%' || filter_city || '%')
    -- Category filter
    AND (filter_category IS NULL OR cg.category = filter_category)
    -- Semantic threshold
    AND (query_embedding IS NULL OR cg.embedding IS NULL OR
         1 - (cg.embedding <=> query_embedding) > match_threshold)
  ORDER BY
    CASE
      WHEN query_embedding IS NOT NULL AND cg.embedding IS NOT NULL
      THEN cg.embedding <=> query_embedding
      ELSE 0
    END ASC,
    COALESCE(cg.caas_score, 0) DESC,
    cg.created_at DESC NULLS LAST
  LIMIT match_count
  OFFSET match_offset;
END;
$$;

COMMENT ON FUNCTION search_organisations_hybrid IS
'Hybrid search for organisations: combines structured filters (subjects, city, category) with pgvector semantic similarity.';

-- --- Organisation Embedding Text Helper ---
CREATE OR REPLACE FUNCTION get_organisation_embedding_text(org_record connection_groups)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN
    COALESCE(org_record.name, '') || ' ' ||
    COALESCE(org_record.tagline, '') || ' ' ||
    COALESCE(org_record.bio, '') || ' ' ||
    'Subjects: ' || COALESCE(array_to_string(org_record.subjects_offered, ', '), '') || ' ' ||
    'Service Area: ' || COALESCE(array_to_string(org_record.service_area, ', '), '') || ' ' ||
    'Location: ' || COALESCE(org_record.location_city, '') || ' ' ||
    COALESCE(org_record.location_country, '');
END;
$$;

COMMENT ON FUNCTION get_organisation_embedding_text IS
'Generate rich text representation of an organisation for embedding generation';

-- =====================================================================
-- STEP 8: Migration summary
-- =====================================================================

DO $$
DECLARE
  listings_count INT;
  profiles_count INT;
  orgs_count INT;
  chunks_count INT;
BEGIN
  SELECT COUNT(*) INTO listings_count FROM listings WHERE status = 'published';
  SELECT COUNT(*) INTO profiles_count FROM profiles WHERE profile_completed = true;
  SELECT COUNT(*) INTO orgs_count FROM connection_groups WHERE type = 'organisation';
  SELECT COUNT(*) INTO chunks_count FROM sage_knowledge_chunks;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 268 Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migrated to Gemini text-embedding-004 (768 dimensions)';
  RAISE NOTICE '';
  RAISE NOTICE 'Schema changes:';
  RAISE NOTICE '  - listings.embedding: vector(1536) → vector(768)';
  RAISE NOTICE '  - profiles.embedding: vector(1536) → vector(768)';
  RAISE NOTICE '  - sage_knowledge_chunks.embedding: vector(1536) → vector(768)';
  RAISE NOTICE '  - connection_groups.embedding: NEW vector(768)';
  RAISE NOTICE '';
  RAISE NOTICE 'Index upgrade: IVFFLAT → HNSW (m=16, ef_construction=64)';
  RAISE NOTICE '';
  RAISE NOTICE 'New hybrid search RPCs:';
  RAISE NOTICE '  - search_listings_hybrid()';
  RAISE NOTICE '  - search_profiles_hybrid()';
  RAISE NOTICE '  - search_organisations_hybrid()';
  RAISE NOTICE '';
  RAISE NOTICE 'Entities requiring re-embedding:';
  RAISE NOTICE '  - % published listings', listings_count;
  RAISE NOTICE '  - % completed profiles', profiles_count;
  RAISE NOTICE '  - % organisations', orgs_count;
  RAISE NOTICE '  - % knowledge chunks', chunks_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Run backfill script: tools/scripts/backfill-embeddings.ts';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
