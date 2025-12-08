-- ================================================
-- Profile Views Analytics Helper Functions
-- ================================================
-- File: 097_analytics_helper_functions.sql
-- Purpose: Optional helper functions for analytics dashboard
-- Status: OPTIONAL - API will use fallback queries if not installed
-- Created: 2025-12-08

-- ================================================
-- FUNCTION: get_profile_views_by_day
-- Purpose: Get daily profile views aggregated by date
-- ================================================
CREATE OR REPLACE FUNCTION public.get_profile_views_by_day(
    p_profile_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    date TEXT,
    total_views BIGINT,
    unique_viewers BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(viewed_at::DATE, 'Mon DD') as date,
        COUNT(*) as total_views,
        COUNT(DISTINCT viewer_id) FILTER (WHERE viewer_id IS NOT NULL) as unique_viewers
    FROM public.profile_views
    WHERE profile_id = p_profile_id
      AND viewed_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY viewed_at::DATE
    ORDER BY viewed_at::DATE ASC;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_profile_views_by_day(UUID, INTEGER) TO authenticated;

-- ================================================
-- USAGE EXAMPLES
-- ================================================
-- Get last 30 days of profile views for a specific profile:
-- SELECT * FROM get_profile_views_by_day('profile-uuid-here', 30);
--
-- Get last 7 days:
-- SELECT * FROM get_profile_views_by_day('profile-uuid-here', 7);

-- ================================================
-- NOTES
-- ================================================
-- This function is OPTIONAL. The API endpoint /api/dashboard/profile-views-trend
-- has a fallback implementation that will work if this function is not installed.
--
-- Installing this function provides better performance for analytics queries
-- by using server-side aggregation instead of client-side processing.
