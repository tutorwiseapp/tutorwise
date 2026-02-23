-- ===================================================================
-- Migration: 302_create_ai_tutor_functions.sql
-- Purpose: Create helper functions for AI Tutor Studio
-- Version: v1.0
-- Date: 2026-02-23
-- ===================================================================
-- This migration creates database functions for AI Tutor Studio:
-- - check_ai_tutor_limit: Graduated limits based on CaaS score
-- - ai_tutor_check_storage_quota: Storage quota validation
-- - ai_tutor_increment_session_stats: Update session counters
-- - ai_tutor_update_rating: Recalculate average rating
-- - match_ai_tutor_chunks: Vector similarity search
-- ===================================================================

-- ===================================================================
-- SECTION 1: GRADUATED LIMITS FUNCTION
-- ===================================================================

-- Function: Check if user can create more AI tutors
-- Based on CaaS score: 1-50 AI tutors
-- Score 0-20: 1, 21-40: 2, ..., 981-1000: 50
CREATE OR REPLACE FUNCTION public.check_ai_tutor_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_caas_score INTEGER;
  v_limit INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Get CaaS score from profiles
  SELECT caas_score INTO v_caas_score
  FROM public.profiles
  WHERE id = p_user_id;

  -- Calculate limit: 1-50 based on score
  -- Formula: FLOOR(score / 20) + 1, capped at 50
  v_limit := GREATEST(1, LEAST(50, FLOOR(COALESCE(v_caas_score, 0) / 20) + 1));

  -- Count active AI tutors (exclude suspended)
  SELECT COUNT(*) INTO v_current_count
  FROM public.ai_tutors
  WHERE owner_id = p_user_id
    AND status != 'suspended';

  -- Return true if under limit
  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_ai_tutor_limit IS 'v1.0: Check if user can create more AI tutors based on CaaS score (1-50 limit)';

-- ===================================================================
-- SECTION 2: STORAGE QUOTA FUNCTION
-- ===================================================================

-- Function: Check if file upload would exceed storage quota
-- Returns: allowed (boolean), remaining (int), quota (int), used (int)
CREATE OR REPLACE FUNCTION public.ai_tutor_check_storage_quota(
  p_ai_tutor_id UUID,
  p_new_file_size INTEGER
) RETURNS TABLE (
  allowed BOOLEAN,
  remaining INTEGER,
  quota INTEGER,
  used INTEGER
) AS $$
DECLARE
  v_tutor RECORD;
BEGIN
  -- Get storage details for AI tutor
  SELECT storage_used_mb, storage_limit_mb INTO v_tutor
  FROM public.ai_tutors
  WHERE id = p_ai_tutor_id;

  -- Check if new file would exceed quota
  RETURN QUERY SELECT
    (v_tutor.storage_used_mb + p_new_file_size) <= v_tutor.storage_limit_mb,
    GREATEST(0, v_tutor.storage_limit_mb - v_tutor.storage_used_mb),
    v_tutor.storage_limit_mb,
    v_tutor.storage_used_mb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.ai_tutor_check_storage_quota IS 'v1.0: Check if file upload would exceed AI tutor storage quota';

-- ===================================================================
-- SECTION 3: SESSION STATS FUNCTION
-- ===================================================================

-- Function: Increment session stats after session completion
-- Updates: total_sessions, total_revenue, last_session_at
CREATE OR REPLACE FUNCTION public.ai_tutor_increment_session_stats(
  p_ai_tutor_id UUID,
  p_revenue DECIMAL
) RETURNS VOID AS $$
BEGIN
  UPDATE public.ai_tutors
  SET
    total_sessions = total_sessions + 1,
    total_revenue = total_revenue + p_revenue,
    last_session_at = NOW(),
    updated_at = NOW()
  WHERE id = p_ai_tutor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.ai_tutor_increment_session_stats IS 'v1.0: Increment session count and revenue after session completion';

-- ===================================================================
-- SECTION 4: RATING UPDATE FUNCTION
-- ===================================================================

-- Function: Recalculate average rating from reviews
-- Called after new review submission
CREATE OR REPLACE FUNCTION public.ai_tutor_update_rating(p_ai_tutor_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.ai_tutors
  SET
    avg_rating = (
      SELECT AVG(rating)::DECIMAL(3,2)
      FROM public.ai_tutor_sessions
      WHERE ai_tutor_id = p_ai_tutor_id
        AND reviewed = TRUE
        AND rating IS NOT NULL
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM public.ai_tutor_sessions
      WHERE ai_tutor_id = p_ai_tutor_id
        AND reviewed = TRUE
    ),
    updated_at = NOW()
  WHERE id = p_ai_tutor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.ai_tutor_update_rating IS 'v1.0: Recalculate average rating from session reviews';

-- ===================================================================
-- SECTION 5: VECTOR SIMILARITY SEARCH FUNCTION
-- ===================================================================

-- Function: Vector similarity search for AI tutor materials
-- Uses cosine similarity with pgvector HNSW index
CREATE OR REPLACE FUNCTION public.match_ai_tutor_chunks(
  query_embedding vector(768),
  ai_tutor_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  material_id UUID,
  chunk_text TEXT,
  chunk_index INTEGER,
  page_number INTEGER,
  similarity FLOAT,
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
    1 - (c.embedding <=> query_embedding) AS similarity,
    m.file_name
  FROM public.ai_tutor_material_chunks c
  JOIN public.ai_tutor_materials m ON m.id = c.material_id
  WHERE c.ai_tutor_id = match_ai_tutor_chunks.ai_tutor_id
    AND 1 - (c.embedding <=> query_embedding) >= match_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.match_ai_tutor_chunks IS 'v1.0: Vector similarity search for AI tutor materials using cosine distance';

-- ===================================================================
-- SECTION 6: CALCULATE STORAGE USED FUNCTION
-- ===================================================================

-- Function: Calculate total storage used by AI tutor
-- Sums file_size_mb from all materials
CREATE OR REPLACE FUNCTION public.calculate_storage_used(p_ai_tutor_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_mb INTEGER;
BEGIN
  SELECT COALESCE(SUM(file_size_mb::INTEGER), 0) INTO v_total_mb
  FROM public.ai_tutor_materials
  WHERE ai_tutor_id = p_ai_tutor_id
    AND status != 'failed';

  RETURN v_total_mb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.calculate_storage_used IS 'v1.0: Calculate total storage used by AI tutor materials';

-- ===================================================================
-- SECTION 7: GET AI TUTOR LIMIT FUNCTION
-- ===================================================================

-- Function: Get AI tutor creation limit details for user
-- Returns current count, limit, and CaaS score
CREATE OR REPLACE FUNCTION public.get_ai_tutor_limit(p_user_id UUID)
RETURNS TABLE (
  current_count INTEGER,
  limit_count INTEGER,
  caas_score INTEGER
) AS $$
DECLARE
  v_caas_score INTEGER;
  v_limit INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Get CaaS score
  SELECT profiles.caas_score INTO v_caas_score
  FROM public.profiles
  WHERE id = p_user_id;

  -- Calculate limit
  v_limit := GREATEST(1, LEAST(50, FLOOR(COALESCE(v_caas_score, 0) / 20) + 1));

  -- Count active AI tutors
  SELECT COUNT(*) INTO v_current_count
  FROM public.ai_tutors
  WHERE owner_id = p_user_id
    AND status != 'suspended';

  RETURN QUERY SELECT
    v_current_count,
    v_limit,
    COALESCE(v_caas_score, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_ai_tutor_limit IS 'v1.0: Get AI tutor creation limit details for display in UI';

-- ===================================================================
-- SECTION 8: VALIDATION
-- ===================================================================

-- Verify functions were created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'check_ai_tutor_limit'
  ) THEN
    RAISE EXCEPTION 'Function check_ai_tutor_limit was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'ai_tutor_check_storage_quota'
  ) THEN
    RAISE EXCEPTION 'Function ai_tutor_check_storage_quota was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'ai_tutor_increment_session_stats'
  ) THEN
    RAISE EXCEPTION 'Function ai_tutor_increment_session_stats was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'ai_tutor_update_rating'
  ) THEN
    RAISE EXCEPTION 'Function ai_tutor_update_rating was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'match_ai_tutor_chunks'
  ) THEN
    RAISE EXCEPTION 'Function match_ai_tutor_chunks was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'calculate_storage_used'
  ) THEN
    RAISE EXCEPTION 'Function calculate_storage_used was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_proc
    WHERE proname = 'get_ai_tutor_limit'
  ) THEN
    RAISE EXCEPTION 'Function get_ai_tutor_limit was not created successfully';
  END IF;

  RAISE NOTICE 'Migration 302_create_ai_tutor_functions completed successfully';
  RAISE NOTICE '✓ Created check_ai_tutor_limit function';
  RAISE NOTICE '✓ Created ai_tutor_check_storage_quota function';
  RAISE NOTICE '✓ Created ai_tutor_increment_session_stats function';
  RAISE NOTICE '✓ Created ai_tutor_update_rating function';
  RAISE NOTICE '✓ Created match_ai_tutor_chunks function (vector search)';
  RAISE NOTICE '✓ Created calculate_storage_used function';
  RAISE NOTICE '✓ Created get_ai_tutor_limit function';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
