/*
 * Migration: Add is_featured to ai_tutors table
 * Phase: 2A - Featured AI Tutors
 * Created: 2026-02-25
 * Purpose: Enable admins to feature AI tutors on homepage
 */

-- Step 1: Add is_featured column
ALTER TABLE public.ai_tutors
ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;

-- Step 2: Add comment
COMMENT ON COLUMN public.ai_tutors.is_featured IS
'Whether this AI tutor is featured on the homepage. Only admins can set this flag.';

-- Step 3: Create index for efficient filtering (partial index for featured only)
CREATE INDEX idx_ai_tutors_is_featured
ON public.ai_tutors(is_featured)
WHERE is_featured = true;

-- Step 4: Add index for homepage query (featured + published + created_at)
CREATE INDEX idx_ai_tutors_featured_published
ON public.ai_tutors(is_featured, status, created_at DESC)
WHERE is_featured = true AND status = 'published';

-- Verification query (optional - comment out for production)
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'ai_tutors' AND column_name = 'is_featured';

-- Rollback Plan (if needed):
-- DROP INDEX IF EXISTS idx_ai_tutors_featured_published;
-- DROP INDEX IF EXISTS idx_ai_tutors_is_featured;
-- ALTER TABLE public.ai_tutors DROP COLUMN IF EXISTS is_featured;
