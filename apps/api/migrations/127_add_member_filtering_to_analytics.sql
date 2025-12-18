-- Migration: 127_add_member_filtering_to_analytics.sql
-- Purpose: Add member-level filtering to organisation analytics functions
-- Created: 2025-12-17
-- Version: v7.1 - Role-based analytics filtering
--
-- This migration updates analytics functions to support role-based data filtering:
-- - Owners/Admins: See full organisation metrics (member_profile_id = NULL)
-- - Members: See only their own contribution to org metrics (member_profile_id = their UUID)

-- ============================================================================
-- FUNCTION 1: Update get_organisation_kpis to support member filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_organisation_kpis(
  org_id UUID,
  period TEXT DEFAULT 'month',
  member_profile_id UUID DEFAULT NULL
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
    LEFT JOIN public.profile_reviews pr ON pr.reviewee_id = b.tutor_id AND pr.booking_id::UUID = b.id
    WHERE gm.group_id = org_id
      AND b.status = 'Completed'
      AND b.session_start_time >= date_trunc(period::TEXT, CURRENT_DATE)
      AND (member_profile_id IS NULL OR b.tutor_id = member_profile_id)
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
      AND (member_profile_id IS NULL OR b.tutor_id = member_profile_id)
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
    -- Team utilization rate: sessions per member
    CASE
      WHEN ts.total_members > 0 AND member_profile_id IS NULL
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
  'v7.1: Performance Analytics - Returns organisation-level KPIs with period-over-period comparison. '
  'Supports member filtering: pass member_profile_id to see individual member metrics, or NULL for org-wide metrics. '
  'Used by Performance tab to display revenue, students, ratings, and utilization metrics.';

-- ============================================================================
-- FUNCTION 2: Update get_organisation_revenue_trend to support member filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_organisation_revenue_trend(
  org_id UUID,
  weeks INT DEFAULT 6,
  member_profile_id UUID DEFAULT NULL
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
  LEFT JOIN public.transactions t ON t.booking_id = b.id AND t.type = 'Tutoring Payout'
  WHERE gm.group_id = org_id
    AND b.status = 'Completed'
    AND b.session_start_time >= CURRENT_DATE - (weeks || ' weeks')::INTERVAL
    AND (member_profile_id IS NULL OR b.tutor_id = member_profile_id)
  GROUP BY date_trunc('week', b.session_start_time)
  ORDER BY date_trunc('week', b.session_start_time);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_organisation_revenue_trend IS
  'v7.1: Performance Analytics - Returns weekly revenue trend data for the last N weeks. '
  'Supports member filtering: pass member_profile_id to see individual member revenue, or NULL for org-wide revenue. '
  'Used by Performance tab to render revenue trend line chart.';

-- ============================================================================
-- FUNCTION 3: Update get_organisation_student_breakdown to support member filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_organisation_student_breakdown(
  org_id UUID,
  member_profile_id UUID DEFAULT NULL
)
RETURNS TABLE (
  new_students INT,
  returning_students INT
) AS $$
BEGIN
  RETURN QUERY
  WITH student_sessions AS (
    SELECT
      b.client_id,
      MIN(b.session_start_time) AS first_session,
      COUNT(*) AS session_count
    FROM public.group_members gm
    JOIN public.profile_graph pg ON pg.id = gm.connection_id
    JOIN public.bookings b ON b.tutor_id = CASE
      WHEN pg.source_profile_id = (SELECT profile_id FROM public.connection_groups WHERE id = org_id)
      THEN pg.target_profile_id
      ELSE pg.source_profile_id
    END
    WHERE gm.group_id = org_id
      AND b.status = 'Completed'
      AND (member_profile_id IS NULL OR b.tutor_id = member_profile_id)
    GROUP BY b.client_id
  )
  SELECT
    COUNT(CASE WHEN session_count = 1 THEN 1 END)::INT AS new_students,
    COUNT(CASE WHEN session_count > 1 THEN 1 END)::INT AS returning_students
  FROM student_sessions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_organisation_student_breakdown IS
  'v7.1: Performance Analytics - Returns new vs returning student breakdown. '
  'Supports member filtering: pass member_profile_id to see individual member student breakdown, or NULL for org-wide breakdown. '
  'Used by Performance tab to render student type breakdown chart.';

-- ============================================================================
-- FUNCTION 4: Update get_team_performance to support member filtering
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_team_performance(
  org_id UUID,
  period TEXT DEFAULT 'month',
  member_profile_id UUID DEFAULT NULL
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
  LEFT JOIN public.transactions t ON t.booking_id = b.id AND t.type = 'Tutoring Payout'
  LEFT JOIN public.profile_reviews pr ON pr.reviewee_id = p.id AND pr.booking_id::UUID = b.id
  WHERE gm.group_id = org_id
    AND (member_profile_id IS NULL OR p.id = member_profile_id)
  GROUP BY p.id, p.full_name, p.email, p.avatar_url
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_team_performance IS
  'v7.1: Performance Analytics - Returns performance metrics for all team members. '
  'Supports member filtering: pass member_profile_id to see only that member, or NULL for all members. '
  'Used by Performance tab to render team performance comparison chart and table.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 127 complete: Role-based analytics filtering added';
  RAISE NOTICE '  ✓ Updated get_organisation_kpis() - now supports member_profile_id';
  RAISE NOTICE '  ✓ Updated get_organisation_revenue_trend() - now supports member_profile_id';
  RAISE NOTICE '  ✓ Created get_organisation_student_breakdown() - returns new vs returning students';
  RAISE NOTICE '  ✓ Updated get_team_performance() - now supports member_profile_id';
END $$;
