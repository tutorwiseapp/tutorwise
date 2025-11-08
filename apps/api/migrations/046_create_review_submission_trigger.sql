-- Migration 046: Create Review Submission Trigger (v4.5)
-- Purpose: Handle review submission and early publication when all participants submit
-- Author: Senior Architect + Claude AI
-- Date: 2025-11-08
-- Related: reviews-solution-design-v4.5.md

-- ============================================================
-- 1. TRIGGER FUNCTION: HANDLE REVIEW SUBMISSION
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_review_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID := NEW.session_id;
    v_reviewer_id UUID := NEW.reviewer_id;
    v_participant_ids UUID[];
    v_submitted_ids UUID[];
    v_all_submitted BOOLEAN;
BEGIN
    -- 1. Add this reviewer to the list of submitted users (if not already there)
    UPDATE public.booking_review_sessions
    SET
        submitted_ids = CASE
            WHEN v_reviewer_id = ANY(submitted_ids) THEN submitted_ids
            ELSE array_append(submitted_ids, v_reviewer_id)
        END,
        updated_at = NOW()
    WHERE id = v_session_id
    RETURNING participant_ids, submitted_ids
    INTO v_participant_ids, v_submitted_ids;

    -- 2. Check if all participants have now submitted
    -- (using array containment operators: @> means "contains")
    v_all_submitted := (
        v_submitted_ids @> v_participant_ids
        AND v_participant_ids @> v_submitted_ids
    );

    -- 3. If everyone has submitted, publish immediately
    IF v_all_submitted THEN
        UPDATE public.booking_review_sessions
        SET
            status = 'published',
            publish_at = NOW(),
            published_at = NOW(),
            updated_at = NOW()
        WHERE id = v_session_id;

        -- Log early publication
        INSERT INTO public.audit_log (action_type, module, details)
        VALUES (
            'review_session.published_early',
            'Reviews',
            jsonb_build_object(
                'session_id', v_session_id,
                'reason', 'all_participants_submitted',
                'participant_count', array_length(v_participant_ids, 1)
            )
        );
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_review_submission() IS
  'Triggered after a review is submitted.
  Adds the reviewer to the submitted list and publishes the session early
  if all participants have submitted their reviews.';

-- ============================================================
-- 2. CREATE THE TRIGGER
-- ============================================================

-- Drop existing trigger if it exists (for re-run safety)
DROP TRIGGER IF EXISTS on_review_submitted_check_publish ON public.profile_reviews;

-- Create the trigger on the profile_reviews table
CREATE TRIGGER on_review_submitted_check_publish
    AFTER INSERT ON public.profile_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_review_submission();

COMMENT ON TRIGGER on_review_submitted_check_publish ON public.profile_reviews IS
  'Checks if all participants have submitted after each review insertion.
  Publishes the session early if all reviews are in, bypassing the 7-day wait.';

-- ============================================================
-- 3. AUDIT LOG
-- ============================================================

INSERT INTO public.audit_log (action_type, module, details)
VALUES (
  'review_system.submission_trigger_created',
  'Reviews',
  jsonb_build_object(
    'migration', '046',
    'trigger', 'on_review_submitted_check_publish',
    'function', 'handle_review_submission',
    'timestamp', NOW()
  )
);
