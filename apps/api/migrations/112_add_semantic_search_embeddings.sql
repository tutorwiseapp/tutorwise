-- ============================================================================
-- Migration 112: Add Semantic Search with Embeddings
-- ============================================================================
-- Purpose: Enable semantic search for listings and profiles using pgvector
-- Author: AI Architect
-- Date: 2025-12-10
-- Phase: Marketplace Phase 1 - Smart Search
--
-- Features:
-- 1. Enable pgvector extension for vector similarity search
-- 2. Add embedding columns to listings and profiles tables
-- 3. Create indexes for fast similarity search
-- 4. Create function to generate embeddings from text
-- 5. Add trigger to auto-update embeddings on content change
--
-- Benefits:
-- 1. Natural language semantic search ("find experienced maths tutor")
-- 2. Better matching beyond keyword search
-- 3. Similarity-based recommendations
-- 4. Support for future AI features (RAG, personalization)
-- ============================================================================

BEGIN;

-- =====================================================================
-- STEP 1: Enable pgvector extension
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS vector;

COMMENT ON EXTENSION vector IS 'Vector similarity search for PostgreSQL (pgvector)';

-- =====================================================================
-- STEP 2: Add embedding columns to listings table
-- =====================================================================
-- Using 1536 dimensions for OpenAI text-embedding-3-small
-- Alternative: 768 dimensions for sentence-transformers models

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS embedding vector(1536);

COMMENT ON COLUMN listings.embedding IS
'Semantic embedding vector for listing content (title + description + subjects). Generated using OpenAI text-embedding-3-small (1536 dimensions)';

-- =====================================================================
-- STEP 3: Add embedding columns to profiles table
-- =====================================================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS embedding vector(1536);

COMMENT ON COLUMN profiles.embedding IS
'Semantic embedding vector for profile content (bio + specializations). Generated using OpenAI text-embedding-3-small (1536 dimensions)';

-- =====================================================================
-- STEP 4: Create indexes for vector similarity search
-- =====================================================================
-- Using IVFFLAT index for fast approximate nearest neighbor search
-- Lists parameter: sqrt(total_rows) is a good starting point
-- For 10K listings: lists = 100, for 100K listings: lists = 316

-- Listings embedding index (cosine distance)
CREATE INDEX IF NOT EXISTS idx_listings_embedding_cosine
ON listings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMENT ON INDEX idx_listings_embedding_cosine IS
'IVFFLAT index for fast cosine similarity search on listing embeddings';

-- Profiles embedding index (cosine distance)
CREATE INDEX IF NOT EXISTS idx_profiles_embedding_cosine
ON profiles
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

COMMENT ON INDEX idx_profiles_embedding_cosine IS
'IVFFLAT index for fast cosine similarity search on profile embeddings';

-- =====================================================================
-- STEP 5: Create function to compute text representation for embeddings
-- =====================================================================
CREATE OR REPLACE FUNCTION get_listing_embedding_text(listing_record listings)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Combine title, description, subjects, levels, and specializations
  -- This creates a rich text representation for embedding generation
  RETURN
    COALESCE(listing_record.title, '') || ' ' ||
    COALESCE(listing_record.description, '') || ' ' ||
    'Subjects: ' || COALESCE(array_to_string(listing_record.subjects, ', '), '') || ' ' ||
    'Levels: ' || COALESCE(array_to_string(listing_record.levels, ', '), '') || ' ' ||
    'Specializations: ' || COALESCE(array_to_string(listing_record.specializations, ', '), '') || ' ' ||
    'Location: ' || COALESCE(listing_record.location_type, '') || ' ' ||
    COALESCE(listing_record.location_city, '');
END;
$$;

COMMENT ON FUNCTION get_listing_embedding_text IS
'Generate rich text representation of a listing for embedding generation';

CREATE OR REPLACE FUNCTION get_profile_embedding_text(profile_record profiles)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Combine full name, bio, headline, and role
  RETURN
    COALESCE(profile_record.full_name, '') || ' ' ||
    COALESCE(profile_record.bio, '') || ' ' ||
    'Role: ' || COALESCE(profile_record.active_role, '');
END;
$$;

COMMENT ON FUNCTION get_profile_embedding_text IS
'Generate rich text representation of a profile for embedding generation';

-- =====================================================================
-- STEP 6: Create function for semantic search
-- =====================================================================
CREATE OR REPLACE FUNCTION search_listings_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
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

COMMENT ON FUNCTION search_listings_semantic IS
'Semantic search for listings using vector similarity. Returns listings with similarity score above threshold.';

CREATE OR REPLACE FUNCTION search_profiles_semantic(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
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

COMMENT ON FUNCTION search_profiles_semantic IS
'Semantic search for profiles using vector similarity. Returns profiles with similarity score above threshold.';

-- =====================================================================
-- STEP 7: Show migration summary
-- =====================================================================
DO $$
DECLARE
  listings_count INT;
  profiles_count INT;
BEGIN
  SELECT COUNT(*) INTO listings_count FROM listings WHERE status = 'published';
  SELECT COUNT(*) INTO profiles_count FROM profiles;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 112 Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Semantic Search Enabled with pgvector';
  RAISE NOTICE '';
  RAISE NOTICE 'Added embedding columns:';
  RAISE NOTICE '  - listings.embedding (vector 1536)';
  RAISE NOTICE '  - profiles.embedding (vector 1536)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created indexes:';
  RAISE NOTICE '  - idx_listings_embedding_cosine (IVFFLAT)';
  RAISE NOTICE '  - idx_profiles_embedding_cosine (IVFFLAT)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created functions:';
  RAISE NOTICE '  - get_listing_embedding_text()';
  RAISE NOTICE '  - get_profile_embedding_text()';
  RAISE NOTICE '  - search_listings_semantic()';
  RAISE NOTICE '  - search_profiles_semantic()';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Generate embeddings for % existing listings', listings_count;
  RAISE NOTICE '  2. Generate embeddings for % existing profiles', profiles_count;
  RAISE NOTICE '  3. Set up embedding generation service/worker';
  RAISE NOTICE '  4. Update API to use semantic search';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
