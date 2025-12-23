-- ===================================================================
-- Migration: 077_create_caas_rpc_functions.sql
-- Purpose: Create RPC functions for CaaS Engine data aggregation (v5.5)
-- Created: 2025-11-15
-- Author: Senior Architect
-- Prerequisites: profiles, bookings, reviews, profile_graph, student_integration_links tables exist
-- ===================================================================
-- This migration creates three critical RPC (Remote Procedure Call) functions
-- that aggregate data from multiple tables to calculate CaaS scores efficiently.
-- These functions are called by the TutorCaaSStrategy and ClientCaaSStrategy classes.
-- ===================================================================

-- ===================================================================
-- RPC 1: GET_PERFORMANCE_STATS
-- ===================================================================
-- Purpose: Calculate tutor performance metrics from bookings and reviews
-- Returns: { avg_rating, completed_sessions, retention_rate, manual_session_log_rate }
-- ===================================================================

CREATE OR REPLACE FUNCTION public.get_performance_stats(user_id UUID)
RETURNS TABLE (
  avg_rating NUMERIC,
  completed_sessions INTEGER,
  retention_rate NUMERIC,
  manual_session_log_rate NUMERIC
) AS $$
DECLARE
  v_avg_rating NUMERIC;
  v_completed_sessions INTEGER;
  v_retention_rate NUMERIC;
  v_manual_session_log_rate NUMERIC;
  v_unique_repeat_clients INTEGER;
  v_total_unique_clients INTEGER;
  v_manual_logs INTEGER;
  v_total_offline_sessions INTEGER;
BEGIN
  -- 1. Calculate average rating from reviews table
  -- Get the average of all ratings where the user is the tutor (receiver_id)
  SELECT COALESCE(AVG(rating), 0)
  INTO v_avg_rating
  FROM public.reviews
  WHERE receiver_id = user_id;

  -- 2. Calculate completed sessions from bookings
  -- Count bookings where tutor is the listing owner AND status is completed
  SELECT COUNT(*)
  INTO v_completed_sessions
  FROM public.bookings b
  INNER JOIN public.listings l ON b.listing_id = l.id
  WHERE l.profile_id = user_id
  AND b.status = 'completed';

  -- 3. Calculate retention rate
  -- Definition: "Percentage of unique clients who have booked more than once"
  -- Formula: (Clients with >1 booking) / (Total unique clients)

  -- Count unique clients who have booked this tutor more than once
  WITH client_booking_counts AS (
    SELECT b.client_id, COUNT(*) as booking_count
    FROM public.bookings b
    INNER JOIN public.listings l ON b.listing_id = l.id
    WHERE l.profile_id = user_id
    AND b.status = 'completed'
    GROUP BY b.client_id
  )
  SELECT
    COALESCE(COUNT(*) FILTER (WHERE booking_count > 1), 0),
    COALESCE(COUNT(*), 0)
  INTO v_unique_repeat_clients, v_total_unique_clients
  FROM client_booking_counts;

  -- Calculate retention rate (avoid division by zero)
  IF v_total_unique_clients > 0 THEN
    v_retention_rate := v_unique_repeat_clients::NUMERIC / v_total_unique_clients::NUMERIC;
  ELSE
    v_retention_rate := 0;
  END IF;

  -- 4. Calculate manual_session_log_rate
  -- Definition: "Percentage of offline sessions where tutor confirmed completion"
  -- Formula: (Completed offline sessions) / (Total offline sessions needing confirmation)
  -- Offline sessions are those WITHOUT recording_url (Lessonspace integration)

  -- Count manually logged sessions (status = 'completed', no recording_url)
  SELECT COUNT(*)
  INTO v_manual_logs
  FROM public.bookings b
  INNER JOIN public.listings l ON b.listing_id = l.id
  WHERE l.profile_id = user_id
  AND b.status = 'completed'
  AND b.recording_url IS NULL;

  -- Count total offline sessions needing logs (completed OR pending_log, no recording_url)
  SELECT COUNT(*)
  INTO v_total_offline_sessions
  FROM public.bookings b
  INNER JOIN public.listings l ON b.listing_id = l.id
  WHERE l.profile_id = user_id
  AND (b.status = 'completed' OR b.status = 'pending_log')
  AND b.recording_url IS NULL;

  -- Calculate manual log rate (avoid division by zero)
  IF v_total_offline_sessions > 0 THEN
    v_manual_session_log_rate := v_manual_logs::NUMERIC / v_total_offline_sessions::NUMERIC;
  ELSE
    v_manual_session_log_rate := 0;
  END IF;

  -- Return all stats as a single row
  RETURN QUERY SELECT v_avg_rating, v_completed_sessions, v_retention_rate, v_manual_session_log_rate;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_performance_stats(UUID) IS
'v5.5: Aggregates tutor performance metrics for CaaS scoring (Bucket 1: Performance).
Returns avg_rating (0-5), completed_sessions (count), retention_rate (0-1), manual_session_log_rate (0-1).
Called by TutorCaaSStrategy.calcPerformance().';

-- ===================================================================
-- RPC 2: GET_NETWORK_STATS
-- ===================================================================
-- Purpose: Calculate tutor network metrics from profile_graph
-- Returns: { referral_count, connection_count, is_agent_referred }
-- ===================================================================

CREATE OR REPLACE FUNCTION public.get_network_stats(user_id UUID)
RETURNS TABLE (
  referral_count INTEGER,
  connection_count INTEGER,
  is_agent_referred BOOLEAN
) AS $$
DECLARE
  v_referral_count INTEGER;
  v_connection_count INTEGER;
  v_is_agent_referred BOOLEAN;
BEGIN
  -- 1. Calculate referral count (how many people this tutor has referred)
  -- Count profile_graph entries where this user is the source of an AGENT_REFERRAL relationship
  SELECT COUNT(*)
  INTO v_referral_count
  FROM public.profile_graph
  WHERE source_profile_id = user_id
  AND relationship_type = 'AGENT_REFERRAL'
  AND status = 'ACTIVE';

  -- 2. Calculate connection count (how many SOCIAL connections this user has)
  -- Count profile_graph entries where this user is source OR target of SOCIAL relationships
  SELECT COUNT(*)
  INTO v_connection_count
  FROM public.profile_graph
  WHERE (source_profile_id = user_id OR target_profile_id = user_id)
  AND relationship_type = 'SOCIAL'
  AND status = 'ACTIVE';

  -- 3. Check if user has been referred by an Agent (replaces deprecated is_partner_verified field)
  -- This gives the user the "network trust bonus" if an Agent vouched for them
  SELECT EXISTS (
    SELECT 1
    FROM public.profile_graph
    WHERE target_profile_id = user_id
    AND relationship_type = 'AGENT_REFERRAL'
    AND status = 'ACTIVE'
  ) INTO v_is_agent_referred;

  -- Return all stats as a single row
  RETURN QUERY SELECT v_referral_count, v_connection_count, v_is_agent_referred;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_network_stats(UUID) IS
'v5.5: Aggregates tutor network metrics for CaaS scoring (Bucket 3: Network).
Returns referral_count (outgoing AGENT_REFERRAL links), connection_count (SOCIAL links), is_agent_referred (boolean).
Called by TutorCaaSStrategy.calcNetwork().';

-- ===================================================================
-- RPC 3: GET_DIGITAL_STATS
-- ===================================================================
-- Purpose: Calculate tutor digital professionalism metrics
-- Returns: { google_calendar_synced, google_classroom_synced, lessonspace_usage_rate }
-- ===================================================================

CREATE OR REPLACE FUNCTION public.get_digital_stats(user_id UUID)
RETURNS TABLE (
  google_calendar_synced BOOLEAN,
  google_classroom_synced BOOLEAN,
  lessonspace_usage_rate NUMERIC
) AS $$
DECLARE
  v_google_calendar_synced BOOLEAN;
  v_google_classroom_synced BOOLEAN;
  v_lessonspace_usage_rate NUMERIC;
  v_lessonspace_sessions INTEGER;
  v_total_sessions INTEGER;
BEGIN
  -- 1. Check if Google Calendar is synced
  -- Look for an active integration_link with integration_type = 'GOOGLE_CALENDAR'
  SELECT EXISTS (
    SELECT 1
    FROM public.student_integration_links
    WHERE profile_id = user_id
    AND integration_type = 'GOOGLE_CALENDAR'
    AND is_active = true
  ) INTO v_google_calendar_synced;

  -- 2. Check if Google Classroom is synced
  -- Look for an active integration_link with integration_type = 'GOOGLE_CLASSROOM'
  SELECT EXISTS (
    SELECT 1
    FROM public.student_integration_links
    WHERE profile_id = user_id
    AND integration_type = 'GOOGLE_CLASSROOM'
    AND is_active = true
  ) INTO v_google_classroom_synced;

  -- 3. Calculate Lessonspace usage rate
  -- Definition: "Percentage of completed sessions that used Lessonspace (have recording_url)"
  -- Formula: (Sessions with recording_url) / (Total completed sessions)

  -- Count sessions with recording_url (Lessonspace was used)
  SELECT COUNT(*)
  INTO v_lessonspace_sessions
  FROM public.bookings b
  INNER JOIN public.listings l ON b.listing_id = l.id
  WHERE l.profile_id = user_id
  AND b.status = 'completed'
  AND b.recording_url IS NOT NULL;

  -- Count total completed sessions
  SELECT COUNT(*)
  INTO v_total_sessions
  FROM public.bookings b
  INNER JOIN public.listings l ON b.listing_id = l.id
  WHERE l.profile_id = user_id
  AND b.status = 'completed';

  -- Calculate Lessonspace usage rate (avoid division by zero)
  IF v_total_sessions > 0 THEN
    v_lessonspace_usage_rate := v_lessonspace_sessions::NUMERIC / v_total_sessions::NUMERIC;
  ELSE
    v_lessonspace_usage_rate := 0;
  END IF;

  -- Return all stats as a single row
  RETURN QUERY SELECT v_google_calendar_synced, v_google_classroom_synced, v_lessonspace_usage_rate;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_digital_stats(UUID) IS
'v5.5: Aggregates tutor digital professionalism metrics for CaaS scoring (Bucket 5: Digital).
Returns google_calendar_synced (boolean), google_classroom_synced (boolean), lessonspace_usage_rate (0-1).
Called by TutorCaaSStrategy.calcDigital().';

-- ===================================================================
-- SECTION 4: GRANT EXECUTE PERMISSIONS
-- ===================================================================

-- Allow authenticated users to call these functions for their own data
GRANT EXECUTE ON FUNCTION public.get_performance_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_network_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_digital_stats(UUID) TO authenticated;

-- Allow service role (caas-worker) to call these functions for any user
GRANT EXECUTE ON FUNCTION public.get_performance_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_network_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_digital_stats(UUID) TO service_role;

-- ===================================================================
-- SECTION 5: VERIFICATION
-- ===================================================================

DO $$
DECLARE
  function_count INTEGER;
BEGIN
  -- Count created functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('get_performance_stats', 'get_network_stats', 'get_digital_stats')
  AND pronamespace = 'public'::regnamespace;

  IF function_count != 3 THEN
    RAISE EXCEPTION 'Expected 3 CaaS RPC functions, found %', function_count;
  END IF;

  RAISE NOTICE 'Migration 077 completed successfully';
  RAISE NOTICE 'CaaS RPC functions created: %', function_count;
  RAISE NOTICE 'Functions available:';
  RAISE NOTICE '  - get_performance_stats(user_id UUID)';
  RAISE NOTICE '  - get_network_stats(user_id UUID)';
  RAISE NOTICE '  - get_digital_stats(user_id UUID)';
  RAISE NOTICE 'Ready for TutorCaaSStrategy calculations';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
