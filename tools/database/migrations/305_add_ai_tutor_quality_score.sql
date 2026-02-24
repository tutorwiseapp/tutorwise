-- Migration: Add AI Quality Score system to ai_tutors
-- Created: 2026-02-24
-- Purpose: Phase 2 - Track and calculate AI tutor quality based on performance metrics
-- Version: v1.0

-- Add quality score columns to ai_tutors table
ALTER TABLE ai_tutors ADD COLUMN IF NOT EXISTS quality_score integer DEFAULT 0;
ALTER TABLE ai_tutors ADD COLUMN IF NOT EXISTS quality_metrics jsonb DEFAULT '{
  "session_completion_rate": 0,
  "avg_rating": 0,
  "total_sessions": 0,
  "escalation_rate": 0,
  "material_completeness": 0,
  "response_quality": 0,
  "last_calculated_at": null
}'::jsonb;

-- Add index for quality score queries (for sorting/filtering)
CREATE INDEX IF NOT EXISTS idx_ai_tutors_quality_score ON ai_tutors(quality_score DESC);

-- Add comments
COMMENT ON COLUMN ai_tutors.quality_score IS 'AI tutor quality score (0-100) calculated from multiple performance metrics';
COMMENT ON COLUMN ai_tutors.quality_metrics IS 'JSONB object containing detailed quality metrics breakdown';

-- Function to calculate AI tutor quality score
CREATE OR REPLACE FUNCTION calculate_ai_tutor_quality_score(
  tutor_id uuid
) RETURNS integer AS $$
DECLARE
  score integer := 0;
  metrics jsonb;
  total_sessions integer;
  completed_sessions integer;
  escalated_sessions integer;
  avg_rating numeric;
  review_count integer;
  material_count integer;
  link_count integer;
BEGIN
  -- Get session statistics
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE escalated_to_human = true) as escalated
  INTO total_sessions, completed_sessions, escalated_sessions
  FROM ai_tutor_sessions
  WHERE ai_tutor_id = tutor_id;

  -- Get review statistics
  SELECT
    AVG(rating),
    COUNT(*)
  INTO avg_rating, review_count
  FROM ai_tutor_reviews
  WHERE ai_tutor_id = tutor_id;

  -- Get material statistics
  SELECT COUNT(*)
  INTO material_count
  FROM ai_tutor_materials
  WHERE ai_tutor_id = tutor_id AND status = 'ready';

  -- Get link statistics
  SELECT COUNT(*)
  INTO link_count
  FROM ai_tutor_links
  WHERE ai_tutor_id = tutor_id;

  -- Build metrics object
  metrics := jsonb_build_object(
    'session_completion_rate',
      CASE WHEN total_sessions > 0
        THEN ROUND((completed_sessions::numeric / total_sessions * 100)::numeric, 1)
        ELSE 0
      END,
    'avg_rating', COALESCE(ROUND(avg_rating, 2), 0),
    'total_sessions', total_sessions,
    'review_count', review_count,
    'escalation_rate',
      CASE WHEN total_sessions > 0
        THEN ROUND((escalated_sessions::numeric / total_sessions * 100)::numeric, 1)
        ELSE 0
      END,
    'material_completeness',
      CASE
        WHEN (material_count + link_count) >= 10 THEN 100
        WHEN (material_count + link_count) >= 5 THEN 75
        WHEN (material_count + link_count) >= 3 THEN 50
        WHEN (material_count + link_count) >= 1 THEN 25
        ELSE 0
      END,
    'material_count', material_count,
    'link_count', link_count,
    'last_calculated_at', now()
  );

  -- Calculate weighted quality score (0-100)
  -- Formula:
  -- - Session completion rate: 25%
  -- - Average rating: 20% (5-star → 100, 0-star → 0)
  -- - Total sessions: 20% (capped at 50 sessions = 100%)
  -- - Escalation rate: 15% (lower is better: 0% escalation = 100, 100% escalation = 0)
  -- - Material completeness: 20%

  score := (
    -- Session completion (25%)
    (metrics->>'session_completion_rate')::numeric * 0.25 +

    -- Average rating (20%): Convert 5-star to 0-100 scale
    COALESCE((metrics->>'avg_rating')::numeric, 0) * 20 +

    -- Total sessions (20%): 50+ sessions = 100%
    LEAST(100, (metrics->>'total_sessions')::numeric * 2) * 0.20 +

    -- Escalation rate (15%): Inverse - lower is better
    (100 - (metrics->>'escalation_rate')::numeric) * 0.15 +

    -- Material completeness (20%)
    (metrics->>'material_completeness')::numeric * 0.20
  )::integer;

  -- Ensure score is between 0-100
  score := GREATEST(0, LEAST(100, score));

  -- Update ai_tutors table
  UPDATE ai_tutors
  SET
    quality_score = score,
    quality_metrics = metrics,
    updated_at = now()
  WHERE id = tutor_id;

  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Comment on function
COMMENT ON FUNCTION calculate_ai_tutor_quality_score(uuid) IS 'Calculate and update AI tutor quality score based on sessions, reviews, and materials';

-- Function to recalculate quality scores for all AI tutors
CREATE OR REPLACE FUNCTION recalculate_all_quality_scores()
RETURNS TABLE (ai_tutor_id uuid, old_score integer, new_score integer) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    quality_score as old_score,
    calculate_ai_tutor_quality_score(id) as new_score
  FROM ai_tutors
  WHERE status != 'deleted'
  ORDER BY quality_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update quality score after session completion
CREATE OR REPLACE FUNCTION trigger_update_quality_score_on_session_end()
RETURNS TRIGGER AS $$
BEGIN
  -- Only recalculate when session is completed or escalated
  IF NEW.status IN ('completed', 'escalated') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    PERFORM calculate_ai_tutor_quality_score(NEW.ai_tutor_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_session_completion_update_quality
  AFTER UPDATE ON ai_tutor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_quality_score_on_session_end();

-- Trigger to auto-update quality score after review submission
CREATE OR REPLACE FUNCTION trigger_update_quality_score_on_review()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM calculate_ai_tutor_quality_score(NEW.ai_tutor_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_review_submission_update_quality
  AFTER INSERT OR UPDATE ON ai_tutor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_quality_score_on_review();

-- Trigger to auto-update quality score when materials are added/updated
CREATE OR REPLACE FUNCTION trigger_update_quality_score_on_material()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'ready' THEN
    PERFORM calculate_ai_tutor_quality_score(NEW.ai_tutor_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_material_ready_update_quality
  AFTER INSERT OR UPDATE ON ai_tutor_materials
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_quality_score_on_material();

-- Initial calculation for existing AI tutors (run once)
SELECT recalculate_all_quality_scores();
