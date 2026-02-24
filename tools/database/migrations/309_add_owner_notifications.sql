-- Migration: Add Owner Notification Triggers
-- Created: 2026-02-24
-- Purpose: Phase 2 Feature #5 - Notify AI tutor owners about important events
-- Version: v1.0

-- Function: Notify owner when session escalates to human
CREATE OR REPLACE FUNCTION notify_owner_on_session_escalation()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id uuid;
  v_tutor_name text;
BEGIN
  -- Only trigger on escalation change
  IF NEW.escalated_to_human = true AND (OLD.escalated_to_human IS NULL OR OLD.escalated_to_human = false) THEN
    -- Get AI tutor owner and name
    SELECT owner_id, display_name
    INTO v_owner_id, v_tutor_name
    FROM ai_tutors
    WHERE id = NEW.ai_tutor_id;

    -- Insert notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      created_at,
      read
    )
    VALUES (
      v_owner_id,
      'ai_tutor_escalation',
      'Session Escalated to Human',
      'A client requested human help during a session with "' || v_tutor_name || '"',
      '/ai-tutors/' || NEW.ai_tutor_id,
      NOW(),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ai_tutor_session_escalation
  AFTER UPDATE ON ai_tutor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_session_escalation();

-- Function: Notify owner on low rating (≤2 stars)
CREATE OR REPLACE FUNCTION notify_owner_on_low_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id uuid;
  v_tutor_name text;
BEGIN
  -- Only trigger on new reviews with low ratings
  IF NEW.rating <= 2 THEN
    -- Get AI tutor owner and name
    SELECT owner_id, display_name
    INTO v_owner_id, v_tutor_name
    FROM ai_tutors
    WHERE id = NEW.ai_tutor_id;

    -- Insert notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      created_at,
      read
    )
    VALUES (
      v_owner_id,
      'ai_tutor_low_rating',
      'Low Rating Alert',
      'Your AI tutor "' || v_tutor_name || '" received a ' || NEW.rating || '-star review. Review feedback to improve quality.',
      '/ai-tutors/' || NEW.ai_tutor_id,
      NOW(),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ai_tutor_low_rating
  AFTER INSERT ON ai_tutor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_low_rating();

-- Function: Notify owner on quality score drop (>10 points)
CREATE OR REPLACE FUNCTION notify_owner_on_quality_drop()
RETURNS TRIGGER AS $$
DECLARE
  v_drop integer;
BEGIN
  -- Calculate drop
  v_drop := COALESCE(OLD.quality_score, 0) - COALESCE(NEW.quality_score, 0);

  -- Only notify if score dropped by more than 10 points
  IF v_drop > 10 THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      created_at,
      read
    )
    VALUES (
      NEW.owner_id,
      'ai_tutor_quality_drop',
      'Quality Score Drop',
      'Your AI tutor "' || NEW.display_name || '" quality score dropped by ' || v_drop || ' points (now ' || NEW.quality_score || '/100). Check analytics for details.',
      '/ai-tutors/' || NEW.id,
      NOW(),
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ai_tutor_quality_score_drop
  AFTER UPDATE ON ai_tutors
  FOR EACH ROW
  WHEN (OLD.quality_score IS DISTINCT FROM NEW.quality_score)
  EXECUTE FUNCTION notify_owner_on_quality_drop();

-- Comments
COMMENT ON FUNCTION notify_owner_on_session_escalation() IS 'Notify AI tutor owner when client escalates session to human help';
COMMENT ON FUNCTION notify_owner_on_low_rating() IS 'Notify AI tutor owner when receiving low rating (≤2 stars)';
COMMENT ON FUNCTION notify_owner_on_quality_drop() IS 'Notify AI tutor owner when quality score drops significantly (>10 points)';
