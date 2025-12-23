-- Migration 045: Create Review Session Trigger (v4.5)
-- Purpose: Automatically create review sessions when bookings are completed
-- Author: Senior Architect + Claude AI
-- Date: 2025-11-08
-- Related: reviews-solution-design-v4.5.md

-- ============================================================
-- 1. TRIGGER FUNCTION: CREATE REVIEW SESSION ON BOOKING COMPLETE
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_review_session_on_booking_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant_ids UUID[];
    v_student_id UUID;
    v_tutor_id UUID;
    v_referrer_id UUID;
BEGIN
    -- 1. Get all participants from the booking
    v_student_id := NEW.student_id;
    v_tutor_id := NEW.tutor_id;
    v_referrer_id := NEW.referrer_profile_id;

    -- 2. Build participant list based on whether there's a referrer (agent)
    IF v_referrer_id IS NULL THEN
        -- Direct job: Client and Tutor only
        v_participant_ids := ARRAY[v_student_id, v_tutor_id];
    ELSE
        -- Referral job: Client, Tutor, and Agent
        v_participant_ids := ARRAY[v_student_id, v_tutor_id, v_referrer_id];
    END IF;

    -- 3. Create the review session in escrow (7-day deadline)
    INSERT INTO public.booking_review_sessions (
        booking_id,
        publish_at,
        participant_ids
    )
    VALUES (
        NEW.id,
        (NOW() + '7 days'::interval),
        v_participant_ids
    )
    ON CONFLICT (booking_id) DO NOTHING; -- Prevent duplicates if trigger fires twice

    -- 4. Log to audit trail
    INSERT INTO public.audit_log (profile_id, action_type, module, details)
    VALUES (
        v_student_id,
        'review_session.created',
        'Reviews',
        jsonb_build_object(
            'booking_id', NEW.id,
            'participants', v_participant_ids,
            'deadline', (NOW() + '7 days'::interval)
        )
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_review_session_on_booking_complete() IS
  'Automatically creates a review session when a booking status changes to completed.
  This initiates the 7-day blind escrow period for mutual reviews.';

-- ============================================================
-- 2. CREATE THE TRIGGER
-- ============================================================

-- Drop existing trigger if it exists (for re-run safety)
DROP TRIGGER IF EXISTS on_booking_completed_create_review ON public.bookings;

-- Create the trigger on the bookings table
CREATE TRIGGER on_booking_completed_create_review
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    WHEN (
        NEW.status::TEXT = 'Completed'
        AND OLD.status::TEXT != 'Completed'
        AND NEW.payment_status::TEXT = 'Confirmed'
    )
    EXECUTE FUNCTION public.create_review_session_on_booking_complete();

COMMENT ON TRIGGER on_booking_completed_create_review ON public.bookings IS
  'Triggers review session creation when a booking is marked as completed and paid.
  This ensures reviews are only requested for successfully completed sessions.';

-- ============================================================
-- 3. AUDIT LOG
-- ============================================================

INSERT INTO public.audit_log (action_type, module, details)
VALUES (
  'review_system.trigger_created',
  'Reviews',
  jsonb_build_object(
    'migration', '045',
    'trigger', 'on_booking_completed_create_review',
    'function', 'create_review_session_on_booking_complete',
    'timestamp', NOW()
  )
);
