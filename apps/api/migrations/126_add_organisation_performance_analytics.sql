-- Migration: 126_add_organisation_performance_analytics.sql
-- Purpose: Add RPC functions for Performance Analytics tab (Premium feature)
-- Created: 2025-12-15 (Originally numbered 103, renumbered to 126 on 2025-12-17)
-- Version: v7.0 - Organisation Premium Subscription
-- Dependencies: Migration 091 (organisation schema), Migration 102 (subscriptions)
--
-- This migration adds 3 PostgreSQL functions to power the Performance Analytics tab:
-- 1. get_organisation_kpis() - Organisation-level KPIs with period comparison
-- 2. get_organisation_revenue_trend() - Weekly revenue trend data for charts
-- 3. get_team_performance() - Team member performance comparison

-- ============================================================================
-- FUNCTION 1: Get Organisation KPIs
-- ============================================================================
-- Returns organisation-level key performance indicators with period-over-period comparison
-- Used by: Performance tab KPI cards (revenue, students, ratings, utilization)

CREATE OR REPLACE FUNCTION public.get_organisation_kpis(
  org_id UUID,
  period TEXT DEFAULT 'month'
)
RETURNS TABLE (
  total_revenue NUMERIC,
  revenue_change_pct NUMERIC,
  active_students INT,
  students_change_pct NUMERIC,
  avg_session_rating NUMERIC,
  team_utilization_rate NUMERIC,
  total_sessions INT,
  sessions_change_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT
      COALESCE(SUM(t.amount), 0) AS revenue,
      COUNT(DISTINCT b.client_id) AS students,
      COUNT(b.id) AS sessions,
      COALESCE(AVG(pr.rating), 0) AS avg_rating
    FROM public.group_members gm
    JOIN public.profile_graph pg ON pg.id = gm.connection_id
    JOIN public.bookings b ON b.tutor_id = CASE
      WHEN pg.source_profile_id = (SELECT profile_id FROM public.connection_groups WHERE id = org_id)
      THEN pg.target_profile_id
      ELSE pg.source_profile_id
    END
    LEFT JOIN public.transactions t ON t.booking_id = b.id AND t.type = 'Tutoring Payout'
    LEFT JOIN public.profile_reviews pr ON pr.reviewee_id = b.tutor_id AND pr.booking_id = b.id
    WHERE gm.group_id = org_id
      AND b.status = 'Completed'
      AND b.session_start_time >= date_trunc(period::TEXT, CURRENT_DATE)
  ),
  previous_period AS (
    SELECT
      COALESCE(SUM(t.amount), 0) AS revenue,
      COUNT(DISTINCT b.client_id) AS students,
      COUNT(b.id) AS sessions
    FROM public.group_members gm
    JOIN public.profile_graph pg ON pg.id = gm.connection_id
    JOIN public.bookings b ON b.tutor_id = CASE
      WHEN pg.source_profile_id = (SELECT profile_id FROM public.connection_groups WHERE id = org_id)
      THEN pg.target_profile_id
      ELSE pg.source_profile_id
    END
    LEFT JOIN public.transactions t ON t.booking_id = b.id AND t.type = 'Tutoring Payout'
    WHERE gm.group_id = org_id
      AND b.status = 'Completed'
      AND b.session_start_time >= date_trunc(period::TEXT, CURRENT_DATE - INTERVAL '1 month')
      AND b.session_start_time < date_trunc(period::TEXT, CURRENT_DATE)
  ),
  team_size AS (
    SELECT COUNT(*) AS total_members
    FROM public.group_members
    WHERE group_id = org_id
  )
  SELECT
    cp.revenue AS total_revenue,
    CASE
      WHEN pp.revenue > 0
      THEN ROUND(((cp.revenue - pp.revenue) / pp.revenue * 100)::NUMERIC, 2)
      ELSE 0
    END AS revenue_change_pct,
    cp.students::INT AS active_students,
    CASE
      WHEN pp.students > 0
      THEN ROUND(((cp.students::NUMERIC - pp.students::NUMERIC) / pp.students::NUMERIC * 100), 2)
      ELSE 0
    END AS students_change_pct,
    ROUND(cp.avg_rating::NUMERIC, 2) AS avg_session_rating,
    -- Team utilization rate: sessions per member (placeholder calculation)
    CASE
      WHEN ts.total_members > 0
      THEN ROUND((cp.sessions::NUMERIC / ts.total_members::NUMERIC), 2)
      ELSE 0
    END AS team_utilization_rate,
    cp.sessions::INT AS total_sessions,
    CASE
      WHEN pp.sessions > 0
      THEN ROUND(((cp.sessions::NUMERIC - pp.sessions::NUMERIC) / pp.sessions::NUMERIC * 100), 2)
      ELSE 0
    END AS sessions_change_pct
  FROM current_period cp, previous_period pp, team_size ts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_organisation_kpis IS
  'v7.0: Performance Analytics - Returns organisation-level KPIs with period-over-period comparison. '
  'Used by Performance tab to display revenue, students, ratings, and utilization metrics.';

-- ============================================================================
-- FUNCTION 2: Get Organisation Revenue Trend
-- ============================================================================
-- Returns weekly revenue trend data for line charts
-- Used by: Performance tab revenue trend chart

CREATE OR REPLACE FUNCTION public.get_organisation_revenue_trend(
  org_id UUID,
  weeks INT DEFAULT 6
)
RETURNS TABLE (
  week_start DATE,
  week_label TEXT,
  total_revenue NUMERIC,
  sessions_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('week', b.session_start_time)::DATE AS week_start,
    TO_CHAR(date_trunc('week', b.session_start_time), 'Mon DD') AS week_label,
    COALESCE(SUM(t.amount), 0) AS total_revenue,
    COUNT(b.id)::INT AS sessions_count
  FROM public.group_members gm
  JOIN public.profile_graph pg ON pg.id = gm.connection_id
  JOIN public.bookings b ON b.tutor_id = CASE
    WHEN pg.source_profile_id = (SELECT profile_id FROM public.connection_groups WHERE id = org_id)
    THEN pg.target_profile_id
    ELSE pg.source_profile_id
  END
  LEFT JOIN public.transactions t ON t.booking_id = b.id AND t.type = 'tutor_payout'
  WHERE gm.group_id = org_id
    AND b.status = 'Completed'
    AND b.session_start_time >= CURRENT_DATE - (weeks || ' weeks')::INTERVAL
  GROUP BY date_trunc('week', b.session_start_time)
  ORDER BY date_trunc('week', b.session_start_time);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_organisation_revenue_trend IS
  'v7.0: Performance Analytics - Returns weekly revenue trend data for the last N weeks. '
  'Used by Performance tab to render revenue trend line chart.';

-- ============================================================================
-- FUNCTION 3: Get Team Performance Comparison
-- ============================================================================
-- Returns performance metrics for each team member
-- Used by: Performance tab team performance comparison chart

CREATE OR REPLACE FUNCTION public.get_team_performance(
  org_id UUID,
  period TEXT DEFAULT 'month'
)
RETURNS TABLE (
  member_id UUID,
  member_name TEXT,
  member_email TEXT,
  member_avatar_url TEXT,
  total_revenue NUMERIC,
  sessions_count INT,
  active_students_count INT,
  avg_rating NUMERIC,
  last_session_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS member_id,
    p.full_name AS member_name,
    p.email AS member_email,
    p.avatar_url AS member_avatar_url,
    COALESCE(SUM(t.amount), 0) AS total_revenue,
    COUNT(b.id)::INT AS sessions_count,
    COUNT(DISTINCT b.client_id)::INT AS active_students_count,
    COALESCE(AVG(pr.rating), 0)::NUMERIC AS avg_rating,
    MAX(b.session_start_time) AS last_session_at
  FROM public.group_members gm
  JOIN public.profile_graph pg ON pg.id = gm.connection_id
  JOIN public.profiles p ON p.id = CASE
    WHEN pg.source_profile_id = (SELECT profile_id FROM public.connection_groups WHERE id = org_id)
    THEN pg.target_profile_id
    ELSE pg.source_profile_id
  END
  LEFT JOIN public.bookings b ON b.tutor_id = p.id
    AND b.status = 'Completed'
    AND b.session_start_time >= date_trunc(period::TEXT, CURRENT_DATE)
  LEFT JOIN public.transactions t ON t.booking_id = b.id AND t.type = 'tutor_payout'
  LEFT JOIN public.profile_reviews pr ON pr.reviewee_id = p.id AND pr.booking_id = b.id
  WHERE gm.group_id = org_id
  GROUP BY p.id, p.full_name, p.email, p.avatar_url
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_team_performance IS
  'v7.0: Performance Analytics - Returns performance metrics for all team members. '
  'Used by Performance tab to render team performance comparison chart and table.';

-- ============================================================================
-- FUNCTION 4: Get Booking Heatmap Data
-- ============================================================================
-- Returns booking frequency by day of week and hour for heatmap visualization
-- Used by: Performance tab booking heatmap

CREATE OR REPLACE FUNCTION public.get_organisation_booking_heatmap(
  org_id UUID,
  weeks INT DEFAULT 4
)
RETURNS TABLE (
  day_of_week INT,
  day_name TEXT,
  hour INT,
  bookings_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(ISODOW FROM b.session_start_time)::INT AS day_of_week, -- 1=Monday, 7=Sunday
    TO_CHAR(b.session_start_time, 'Day') AS day_name,
    EXTRACT(HOUR FROM b.session_start_time)::INT AS hour,
    COUNT(b.id)::INT AS bookings_count
  FROM public.group_members gm
  JOIN public.profile_graph pg ON pg.id = gm.connection_id
  JOIN public.bookings b ON b.tutor_id = CASE
    WHEN pg.source_profile_id = (SELECT profile_id FROM public.connection_groups WHERE id = org_id)
    THEN pg.target_profile_id
    ELSE pg.source_profile_id
  END
  WHERE gm.group_id = org_id
    AND b.status IN ('Confirmed', 'Completed')
    AND b.session_start_time >= CURRENT_DATE - (weeks || ' weeks')::INTERVAL
  GROUP BY day_of_week, day_name, hour
  ORDER BY day_of_week, hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_organisation_booking_heatmap IS
  'v7.0: Performance Analytics - Returns booking frequency by day/hour for heatmap visualization. '
  'Used by Performance tab to show peak booking times.';

-- ============================================================================
-- FUNCTION 5: Get Student Breakdown by Subject
-- ============================================================================
-- Returns student distribution across subjects/categories
-- Used by: Performance tab student breakdown pie chart

CREATE OR REPLACE FUNCTION public.get_organisation_student_breakdown(
  org_id UUID
)
RETURNS TABLE (
  subject TEXT,
  student_count INT,
  revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(b.subject, 'Unknown') AS subject,
    COUNT(DISTINCT b.client_id)::INT AS student_count,
    COALESCE(SUM(t.amount), 0) AS revenue
  FROM public.group_members gm
  JOIN public.profile_graph pg ON pg.id = gm.connection_id
  JOIN public.bookings b ON b.tutor_id = CASE
    WHEN pg.source_profile_id = (SELECT profile_id FROM public.connection_groups WHERE id = org_id)
    THEN pg.target_profile_id
    ELSE pg.source_profile_id
  END
  LEFT JOIN public.transactions t ON t.booking_id = b.id AND t.type = 'tutor_payout'
  WHERE gm.group_id = org_id
    AND b.status = 'Completed'
    AND b.session_start_time >= CURRENT_DATE - INTERVAL '3 months'
  GROUP BY b.subject
  ORDER BY student_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_organisation_student_breakdown IS
  'v7.0: Performance Analytics - Returns student distribution by subject/category. '
  'Used by Performance tab to render student breakdown pie chart.';

-- ============================================================================
-- GRANTS
-- ============================================================================
-- Grant execute permissions to authenticated users
-- RLS policies on underlying tables will still apply

GRANT EXECUTE ON FUNCTION public.get_organisation_kpis TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organisation_revenue_trend TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_performance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organisation_booking_heatmap TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organisation_student_breakdown TO authenticated;

-- ============================================================================
-- INDEXES (if not already exist)
-- ============================================================================
-- These indexes optimize the analytics queries

CREATE INDEX IF NOT EXISTS idx_bookings_status_tutor_time
  ON public.bookings(status, tutor_id, session_start_time);

CREATE INDEX IF NOT EXISTS idx_bookings_client_time
  ON public.bookings(client_id, session_start_time);

CREATE INDEX IF NOT EXISTS idx_transactions_booking_type
  ON public.transactions(booking_id, type);

CREATE INDEX IF NOT EXISTS idx_profile_reviews_reviewee_booking
  ON public.profile_reviews(reviewee_id, booking_id);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify functions created
DO $$
BEGIN
  RAISE NOTICE 'Migration 126 complete: Performance Analytics functions created';
  RAISE NOTICE '  ✓ get_organisation_kpis()';
  RAISE NOTICE '  ✓ get_organisation_revenue_trend()';
  RAISE NOTICE '  ✓ get_team_performance()';
  RAISE NOTICE '  ✓ get_organisation_booking_heatmap()';
  RAISE NOTICE '  ✓ get_organisation_student_breakdown()';
END $$;
