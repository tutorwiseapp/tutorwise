-- Migration 043: Deprecate Listing Reviews (v4.1 → v4.5)
-- Purpose: Transition from listing-centric to user-centric mutual review system
-- Author: Senior Architect + Claude AI
-- Date: 2025-11-08
-- Related: reviews-solution-design-v4.5.md

-- ============================================================
-- 1. RENAME OLD LISTING-CENTRIC REVIEWS TABLE
-- ============================================================

-- Rename the old table from migration 032 to preserve data
ALTER TABLE IF EXISTS public.reviews RENAME TO listing_reviews;

COMMENT ON TABLE public.listing_reviews IS
  'DEPRECATED (Nov 8 2025): This table was for listing-centric reviews (v4.1).
  It is replaced by profile_reviews and booking_review_sessions
  to support the mutual 6-way review system (v4.5).';

-- Drop the old unique constraint (will conflict with new system)
ALTER TABLE IF EXISTS public.listing_reviews
  DROP CONSTRAINT IF EXISTS reviews_unique_listing_reviewer;

-- ============================================================
-- 2. DROP OLD TRIGGER (if it exists)
-- ============================================================

DROP TRIGGER IF EXISTS trigger_update_listing_rating ON public.listing_reviews;
DROP FUNCTION IF EXISTS public.update_listing_rating();

-- ============================================================
-- 3. UPDATE PROFILES TABLE FOR USER-CENTRIC RATINGS
-- ============================================================

-- The average_rating column already exists from migration 032
-- Just add an index and update the comment

CREATE INDEX IF NOT EXISTS idx_profiles_average_rating
  ON public.profiles(average_rating)
  WHERE average_rating IS NOT NULL;

COMMENT ON COLUMN public.profiles.average_rating IS
  'Cached average rating from the user-centric profile_reviews table (v4.5).
  Calculated from all published mutual reviews where this user is the reviewee.
  Updated automatically via trigger when review sessions are published.';

-- ============================================================
-- 4. ADD REVIEW STATS TO PROFILES
-- ============================================================

-- Add total review count (separate from total_reviews which might be listing-specific)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_profiles_review_count
  ON public.profiles(review_count)
  WHERE review_count > 0;

COMMENT ON COLUMN public.profiles.review_count IS
  'Total number of published reviews received by this user (v4.5).
  Updated automatically via trigger when review sessions are published.';

-- ============================================================
-- 5. AUDIT LOG
-- ============================================================

-- Log this deprecation for tracking
INSERT INTO public.audit_log (action_type, module, details)
VALUES (
  'review_system.deprecated_listing_reviews',
  'Reviews',
  jsonb_build_object(
    'migration', '043',
    'old_table', 'reviews',
    'new_table', 'listing_reviews',
    'timestamp', NOW()
  )
);
