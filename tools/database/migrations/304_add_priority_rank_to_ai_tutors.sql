/*
 * Migration: Add priority_rank to ai_tutors table
 * Phase: 2A - Priority Ranking
 * Created: 2026-02-25
 * Purpose: Enable admins to control AI tutor search ordering
 */

-- Step 1: Add priority_rank column
ALTER TABLE public.ai_tutors
ADD COLUMN priority_rank INTEGER NOT NULL DEFAULT 0;

-- Step 2: Add comment
COMMENT ON COLUMN public.ai_tutors.priority_rank IS
'Priority rank for marketplace ordering. Higher = appears first. 0 = default (no priority).';

-- Step 3: Create index for efficient ordering
CREATE INDEX idx_ai_tutors_priority_rank
ON public.ai_tutors(priority_rank DESC, created_at DESC);

-- Step 4: Add check constraint (prevent negative ranks)
ALTER TABLE public.ai_tutors
ADD CONSTRAINT chk_priority_rank_non_negative
CHECK (priority_rank >= 0);

-- Rollback Plan:
-- DROP INDEX IF EXISTS idx_ai_tutors_priority_rank;
-- ALTER TABLE public.ai_tutors DROP CONSTRAINT IF EXISTS chk_priority_rank_non_negative;
-- ALTER TABLE public.ai_tutors DROP COLUMN IF EXISTS priority_rank;
