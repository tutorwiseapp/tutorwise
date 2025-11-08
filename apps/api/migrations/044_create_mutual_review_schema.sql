-- Migration 044: Create Mutual Review Schema (v4.5)
-- Purpose: Implement 6-way mutual review system with 7-day blind escrow
-- Author: Senior Architect + Claude AI
-- Date: 2025-11-08
-- Related: reviews-solution-design-v4.5.md

-- ============================================================
-- 1. CREATE REVIEW SESSION STATUS ENUM
-- ============================================================

CREATE TYPE booking_review_status AS ENUM (
  'pending',   -- In 7-day 'blind' escrow
  'published', -- All reviews are live
  'expired'    -- Deadline passed, auto-published
);

COMMENT ON TYPE booking_review_status IS
  'Status of a review session: pending (in escrow), published (live), expired (auto-published after 7 days)';

-- ============================================================
-- 2. CREATE BOOKING REVIEW SESSIONS TABLE (Escrow)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.booking_review_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    status booking_review_status NOT NULL DEFAULT 'pending',

    -- The 7-day deadline for blind escrow
    publish_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + '7 days'::interval),
    published_at TIMESTAMPTZ, -- Actual publication timestamp

    -- All profiles involved in this booking (student, tutor, agent if applicable)
    participant_ids UUID[] NOT NULL,

    -- Profiles who have submitted their reviews
    submitted_ids UUID[] DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_review_session_booking UNIQUE (booking_id)
);

-- Indexes for performance
CREATE INDEX idx_booking_review_sessions_status
  ON public.booking_review_sessions (status);

CREATE INDEX idx_booking_review_sessions_publish_at
  ON public.booking_review_sessions (publish_at)
  WHERE status = 'pending';

CREATE INDEX idx_booking_review_sessions_participant_ids
  ON public.booking_review_sessions USING GIN (participant_ids);

COMMENT ON TABLE public.booking_review_sessions IS
  'Manages the 7-day blind escrow review process for bookings.
  Created automatically when a booking is completed and paid.
  Reviews remain hidden until all participants submit or 7 days pass.';

-- ============================================================
-- 3. CREATE PROFILE REVIEWS TABLE (Actual Reviews)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profile_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.booking_review_sessions(id) ON DELETE CASCADE,

    -- Who wrote this review
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Who this review is about
    reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Rating (1-5 stars)
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),

    -- Review content
    comment TEXT,

    -- Metadata for rich reviews
    metadata JSONB DEFAULT '{}'::jsonb, -- For future: helpful_votes, photos, etc.

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT reviewer_cannot_be_reviewee CHECK (reviewer_id <> reviewee_id),
    CONSTRAINT unique_review_pair_per_session UNIQUE (session_id, reviewer_id, reviewee_id)
);

-- Indexes for performance
CREATE INDEX idx_profile_reviews_session_id
  ON public.profile_reviews (session_id);

CREATE INDEX idx_profile_reviews_reviewer_id
  ON public.profile_reviews (reviewer_id);

CREATE INDEX idx_profile_reviews_reviewee_id
  ON public.profile_reviews (reviewee_id);

CREATE INDEX idx_profile_reviews_rating
  ON public.profile_reviews (rating);

CREATE INDEX idx_profile_reviews_created_at
  ON public.profile_reviews (created_at DESC);

COMMENT ON TABLE public.profile_reviews IS
  'User-centric mutual reviews (v4.5).
  Each booking can generate 2-6 reviews depending on participants:
  - Direct job: Client ↔ Tutor (2 reviews)
  - Referral job: Client ↔ Tutor ↔ Agent (6 reviews)';

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on both tables
ALTER TABLE public.booking_review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_reviews ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4A. BOOKING REVIEW SESSIONS POLICIES
-- ============================================================

-- Users can view/manage sessions they are a participant in
CREATE POLICY "Users can view review sessions they are in"
    ON public.booking_review_sessions FOR SELECT
    USING (auth.uid() = ANY (participant_ids));

CREATE POLICY "Service role can manage all review sessions"
    ON public.booking_review_sessions FOR ALL
    USING (auth.uid() IS NOT NULL AND auth.jwt()->>'role' = 'service_role');

-- ============================================================
-- 4B. PROFILE REVIEWS POLICIES
-- ============================================================

-- Users can view PUBLISHED reviews for sessions they are in
CREATE POLICY "Users can view published reviews in their sessions"
    ON public.profile_reviews FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.booking_review_sessions
            WHERE id = session_id
            AND status = 'published'
            AND auth.uid() = ANY (participant_ids)
        )
    );

-- Users can view ALL reviews about themselves (even pending ones)
CREATE POLICY "Users can view all reviews about themselves"
    ON public.profile_reviews FOR SELECT
    USING (auth.uid() = reviewee_id);

-- Users can submit their own reviews while session is pending
CREATE POLICY "Users can submit their own reviews"
    ON public.profile_reviews FOR INSERT
    WITH CHECK (
        auth.uid() = reviewer_id
        AND EXISTS (
            SELECT 1 FROM public.booking_review_sessions
            WHERE id = session_id
            AND status = 'pending'
            AND auth.uid() = ANY (participant_ids)
            AND NOT (auth.uid() = ANY (submitted_ids))
        )
    );

-- Users can update their own reviews while session is pending
CREATE POLICY "Users can update their pending reviews"
    ON public.profile_reviews FOR UPDATE
    USING (
        auth.uid() = reviewer_id
        AND EXISTS (
            SELECT 1 FROM public.booking_review_sessions
            WHERE id = session_id
            AND status = 'pending'
        )
    );

-- Users can delete their own reviews while session is pending
CREATE POLICY "Users can delete their pending reviews"
    ON public.profile_reviews FOR DELETE
    USING (
        auth.uid() = reviewer_id
        AND EXISTS (
            SELECT 1 FROM public.booking_review_sessions
            WHERE id = session_id
            AND status = 'pending'
        )
    );

-- Service role can view all reviews (for admin/moderation)
CREATE POLICY "Service role can view all reviews"
    ON public.profile_reviews FOR SELECT
    USING (auth.uid() IS NOT NULL AND auth.jwt()->>'role' = 'service_role');

-- ============================================================
-- 5. UPDATED_AT TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking_review_sessions_updated_at
    BEFORE UPDATE ON public.booking_review_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profile_reviews_updated_at
    BEFORE UPDATE ON public.profile_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 6. AUDIT LOG
-- ============================================================

INSERT INTO public.audit_log (action_type, module, details)
VALUES (
  'review_system.schema_created',
  'Reviews',
  jsonb_build_object(
    'migration', '044',
    'tables', ARRAY['booking_review_sessions', 'profile_reviews'],
    'timestamp', NOW()
  )
);
