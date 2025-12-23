-- Migration 047: Create Profile Rating Update Trigger (v4.5)
-- Purpose: Automatically update user ratings when review sessions are published
-- Author: Senior Architect + Claude AI
-- Date: 2025-11-08
-- Related: reviews-solution-design-v4.5.md

-- ============================================================
-- 1. TRIGGER FUNCTION: UPDATE PROFILE RATINGS ON PUBLISH
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_profile_ratings_on_publish()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    reviewee_id_to_update UUID;
    v_new_avg_rating DECIMAL(3,2);
    v_new_review_count INTEGER;
BEGIN
    -- 1. Find all users who were reviewed in this session
    FOR reviewee_id_to_update IN
        SELECT DISTINCT reviewee_id
        FROM public.profile_reviews
        WHERE session_id = NEW.id
    LOOP
        -- 2. Calculate their new average rating and review count
        SELECT
            ROUND(AVG(r.rating)::numeric, 2),
            COUNT(r.id)::integer
        INTO
            v_new_avg_rating,
            v_new_review_count
        FROM public.profile_reviews r
        JOIN public.booking_review_sessions s ON r.session_id = s.id
        WHERE r.reviewee_id = reviewee_id_to_update
        AND s.status = 'published';

        -- 3. Update their profile with the new ratings
        UPDATE public.profiles
        SET
            average_rating = COALESCE(v_new_avg_rating, 0.00),
            review_count = COALESCE(v_new_review_count, 0),
            updated_at = NOW()
        WHERE id = reviewee_id_to_update;

        -- 4. Log the rating update
        INSERT INTO public.audit_log (profile_id, action_type, module, details)
        VALUES (
            reviewee_id_to_update,
            'profile.rating_updated',
            'Reviews',
            jsonb_build_object(
                'session_id', NEW.id,
                'new_average_rating', v_new_avg_rating,
                'new_review_count', v_new_review_count
            )
        );
    END LOOP;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_profile_ratings_on_publish() IS
  'Recalculates and updates user ratings when a review session is published.
  This ensures profile ratings reflect only published reviews (not pending ones).';

-- ============================================================
-- 2. CREATE THE TRIGGER
-- ============================================================

-- Drop existing trigger if it exists (for re-run safety)
DROP TRIGGER IF EXISTS on_session_published_update_ratings ON public.booking_review_sessions;

-- Create the trigger on the booking_review_sessions table
CREATE TRIGGER on_session_published_update_ratings
    AFTER UPDATE ON public.booking_review_sessions
    FOR EACH ROW
    WHEN (NEW.status = 'published' AND OLD.status != 'published')
    EXECUTE FUNCTION public.update_profile_ratings_on_publish();

COMMENT ON TRIGGER on_session_published_update_ratings ON public.booking_review_sessions IS
  'Automatically updates all participant profile ratings when a review session is published.
  This maintains accurate, real-time rating statistics on user profiles.';

-- ============================================================
-- 3. AUDIT LOG
-- ============================================================

INSERT INTO public.audit_log (action_type, module, details)
VALUES (
  'review_system.rating_trigger_created',
  'Reviews',
  jsonb_build_object(
    'migration', '047',
    'trigger', 'on_session_published_update_ratings',
    'function', 'update_profile_ratings_on_publish',
    'timestamp', NOW()
  )
);
