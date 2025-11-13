-- ===================================================================
-- Rollback Migration: 048_add_student_role_and_bookings_link_rollback.sql
-- Purpose: Rollback student role and bookings student_id column
-- Created: 2025-11-12
-- Author: Senior Architect
-- ===================================================================
-- WARNING: This rollback will:
-- 1. Remove the student_id column from bookings (data loss)
-- 2. NOT remove 'student' from user_role enum (PostgreSQL limitation)
-- ===================================================================

-- ===================================================================
-- SECTION 1: REMOVE STUDENT_ID COLUMN FROM BOOKINGS
-- ===================================================================

-- Drop the index first
DROP INDEX IF EXISTS public.idx_bookings_student_id;

-- Remove the student_id column
ALTER TABLE public.bookings
DROP COLUMN IF EXISTS student_id;

-- ===================================================================
-- SECTION 2: ENUM ROLLBACK NOTE
-- ===================================================================

-- NOTE: PostgreSQL does not support removing enum values once added
-- The 'student' value will remain in the user_role enum
-- To fully remove it requires recreating the enum type, which is complex
-- and risky in production. We accept this technical debt.

DO $$
BEGIN
  RAISE WARNING 'The student role remains in the user_role enum due to PostgreSQL limitations';
  RAISE WARNING 'If you need to fully remove it, you must:';
  RAISE WARNING '1. Create a new enum without student';
  RAISE WARNING '2. Migrate all columns using user_role to the new enum';
  RAISE WARNING '3. Drop the old enum and rename the new one';
  RAISE NOTICE 'Rollback 048 completed (student_id column removed)';
END $$;

-- ===================================================================
-- SECTION 3: VERIFICATION
-- ===================================================================

DO $$
DECLARE
  student_column_exists BOOLEAN;
BEGIN
  -- Verify student_id column was removed
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bookings'
    AND column_name = 'student_id'
  ) INTO student_column_exists;

  IF student_column_exists THEN
    RAISE EXCEPTION 'student_id column still exists in bookings table';
  END IF;

  RAISE NOTICE 'Verification passed: student_id column removed';
END $$;

-- ===================================================================
-- END OF ROLLBACK
-- ===================================================================
