-- Migration 116: Add Free Sessions Count to Performance Stats RPC
-- Purpose: Complete CaaS v5.9 Social Impact bucket by tracking completed free help sessions
-- Author: CaaS v5.9 Social Impact Implementation
-- Date: 2025-12-15
--
-- This migration updates the get_performance_stats RPC function to include
-- completed_free_sessions_count, enabling the delivery bonus (5 points) in
-- Bucket 6: Social Impact.
--
-- Integration: Free Help Now (v5.9) + CaaS Scoring

-- ==================================================================
-- STEP 1: Drop existing function
-- ==================================================================
DROP FUNCTION IF EXISTS public.get_performance_stats(uuid);

-- ==================================================================
-- STEP 2: Create updated function with free sessions count
-- ==================================================================
CREATE OR REPLACE FUNCTION public.get_performance_stats(user_id uuid)
RETURNS TABLE(
  avg_rating numeric,
  completed_sessions integer,
  retention_rate numeric,
  manual_session_log_rate numeric,
  completed_free_sessions_count integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_avg_rating NUMERIC;
  v_completed_sessions INTEGER;
  v_retention_rate NUMERIC;
  v_manual_session_log_rate NUMERIC;
  v_completed_free_sessions INTEGER;
  v_unique_repeat_clients INTEGER;
  v_total_unique_clients INTEGER;
  v_manual_logs INTEGER;
  v_total_offline_sessions INTEGER;
BEGIN
  -- 1. Calculate average rating from profile_reviews table
  SELECT COALESCE(AVG(rating), 0)
  INTO v_avg_rating
  FROM public.profile_reviews
  WHERE reviewee_id = user_id;

  -- 2. Calculate completed sessions from bookings (paid sessions only)
  SELECT COUNT(*)
  INTO v_completed_sessions
  FROM public.bookings b
  INNER JOIN public.listings l ON b.listing_id = l.id
  WHERE l.profile_id = user_id
  AND b.status = 'Completed'
  AND (b.type IS NULL OR b.type != 'free_help'); -- Exclude free help sessions

  -- 3. Calculate retention rate
  -- Definition: "Percentage of unique clients who have booked more than once"
  WITH client_booking_counts AS (
    SELECT b.client_id, COUNT(*) as booking_count
    FROM public.bookings b
    INNER JOIN public.listings l ON b.listing_id = l.id
    WHERE l.profile_id = user_id
    AND b.status = 'Completed'
    AND (b.type IS NULL OR b.type != 'free_help')
    GROUP BY b.client_id
  )
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE booking_count > 1), 0),
    COALESCE(COUNT(*), 0)
  INTO v_unique_repeat_clients, v_total_unique_clients
  FROM client_booking_counts;

  IF v_total_unique_clients > 0 THEN
    v_retention_rate := v_unique_repeat_clients::NUMERIC / v_total_unique_clients::NUMERIC;
  ELSE
    v_retention_rate := 0;
  END IF;

  -- 4. Calculate manual_session_log_rate
  -- Note: recording_url column doesn't exist yet, so we default to 0
  -- This can be implemented later when Lessonspace integration is added
  v_manual_session_log_rate := 0;

  -- 5. Calculate completed free help sessions (NEW for v5.9)
  -- Count bookings where type = 'free_help' AND status = 'Completed'
  -- This feeds into Bucket 6: Social Impact delivery bonus (1 point per session, max 5)
  SELECT COUNT(*)
  INTO v_completed_free_sessions
  FROM public.bookings b
  INNER JOIN public.listings l ON b.listing_id = l.id
  WHERE l.profile_id = user_id
  AND b.status = 'Completed'
  AND b.type = 'free_help';

  -- Return all stats as a single row
  RETURN QUERY SELECT
    v_avg_rating,
    v_completed_sessions,
    v_retention_rate,
    v_manual_session_log_rate,
    v_completed_free_sessions;
END;
$$;

COMMENT ON FUNCTION public.get_performance_stats(uuid) IS
'Returns performance statistics for a tutor including avg rating, completed sessions, retention rate, manual log rate, and completed free help sessions (v5.9). Used by CaaS scoring engine.';

-- ==================================================================
-- VERIFICATION QUERIES
-- ==================================================================

-- Uncomment to test the function:

-- 1. Test with a tutor profile
-- SELECT * FROM get_performance_stats('6426553c-7e84-48da-b7c5-c420dca912f6');

-- 2. Verify function signature
-- SELECT
--   routine_name,
--   data_type,
--   ordinal_position,
--   parameter_name
-- FROM information_schema.parameters
-- WHERE specific_name = 'get_performance_stats'
-- ORDER BY ordinal_position;

-- 3. Check that free sessions are being counted separately
-- SELECT
--   p.full_name,
--   (SELECT completed_free_sessions_count FROM get_performance_stats(p.id)) as free_sessions,
--   (SELECT COUNT(*) FROM bookings b
--    INNER JOIN listings l ON b.listing_id = l.id
--    WHERE l.profile_id = p.id AND b.type = 'free_help' AND b.status = 'Completed') as direct_count
-- FROM profiles p
-- WHERE 'tutor' = ANY(p.roles)
-- ORDER BY p.full_name;
