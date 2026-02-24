-- Migration: Add Analytics Functions for AI Tutor Dashboard
-- Created: 2026-02-24
-- Purpose: Phase 2 Feature #3 - Advanced Analytics Dashboard
-- Version: v1.0

-- Function: Get skill performance analytics for an AI tutor
CREATE OR REPLACE FUNCTION get_ai_tutor_skill_analytics(
  p_ai_tutor_id uuid,
  p_start_date timestamptz
)
RETURNS TABLE (
  skill_name varchar(100),
  session_count bigint,
  avg_rating numeric,
  review_count bigint,
  escalation_rate numeric,
  total_revenue numeric
) AS $$
BEGIN
  -- Note: We join with ai_tutor_skills to get all skills,
  -- even ones with no sessions yet (they'll have 0 counts)
  RETURN QUERY
  WITH skill_sessions AS (
    SELECT
      ats.skill_name,
      sess.id as session_id,
      sess.rating,
      sess.reviewed,
      sess.escalated_to_human,
      sess.owner_earnings
    FROM ai_tutor_skills ats
    LEFT JOIN ai_tutor_sessions sess
      ON sess.ai_tutor_id = ats.ai_tutor_id
      AND sess.started_at >= p_start_date
    WHERE ats.ai_tutor_id = p_ai_tutor_id
  )
  SELECT
    s.skill_name,
    COUNT(s.session_id) as session_count,
    COALESCE(
      AVG(s.rating) FILTER (WHERE s.reviewed = true AND s.rating IS NOT NULL),
      0
    )::numeric as avg_rating,
    COUNT(s.session_id) FILTER (WHERE s.reviewed = true) as review_count,
    CASE
      WHEN COUNT(s.session_id) > 0 THEN
        (COUNT(s.session_id) FILTER (WHERE s.escalated_to_human = true)::numeric
          / COUNT(s.session_id) * 100)
      ELSE 0
    END as escalation_rate,
    COALESCE(SUM(s.owner_earnings), 0)::numeric as total_revenue
  FROM skill_sessions s
  GROUP BY s.skill_name
  ORDER BY session_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON FUNCTION get_ai_tutor_skill_analytics(uuid, timestamptz) IS 'Get skill performance analytics for AI tutor dashboard (session count, ratings, escalation rate, revenue by skill)';
