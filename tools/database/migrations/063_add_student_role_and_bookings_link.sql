-- ===================================================================
-- Migration: 048_add_student_role_and_bookings_link.sql
-- Purpose: Add 'student' role and re-architect bookings for 3-party transactions (v5.0)
-- Created: 2025-11-12
-- Author: Senior Architect
-- Prerequisites: profile_graph table exists (002_add_profile_graph_v4_6.sql)
-- ===================================================================
-- This migration enables the "Student Onboarding" feature (v5.0) by:
-- 1. Adding 'student' to the user_role enum
-- 2. Adding student_id column to bookings table for attendee tracking
-- 3. Backfilling existing bookings (client was attendee)
-- ===================================================================

-- ===================================================================
-- SECTION 1: ADD STUDENT ROLE (NOTE: Using text[] not enum)
-- ===================================================================

-- NOTE: This database uses text[] for roles, not an enum type.
-- The 'student' role will be added dynamically when users sign up with student role.
-- No schema changes needed for the role itself.

DO $$
BEGIN
  RAISE NOTICE 'Profiles table uses text[] for roles - no enum modification needed';
  RAISE NOTICE 'Student role will be available for new user signups';
END $$;

-- ===================================================================
-- SECTION 2: ADD STUDENT_ID TO BOOKINGS TABLE
-- ===================================================================

-- Add the new student_id column to bookings
-- It is NULL by default, supporting the "adult learner" use case
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bookings_student_id ON public.bookings(student_id);

-- ===================================================================
-- SECTION 3: BACKFILL EXISTING DATA
-- ===================================================================

-- For all past bookings, we assume the Client (payer) was also the attendee.
-- This ensures data integrity and backward compatibility.
UPDATE public.bookings
SET student_id = client_id
WHERE student_id IS NULL;

-- ===================================================================
-- SECTION 4: ADD DOCUMENTATION COMMENTS
-- ===================================================================

COMMENT ON COLUMN public.bookings.client_id IS 'The profile_id of the user who paid for the booking (e.g., the Parent or adult learner).';
COMMENT ON COLUMN public.bookings.student_id IS 'v5.0: The profile_id of the user attending the lesson (e.g., the Student or the Client themselves). Can be NULL initially and assigned later via POST /api/bookings/assign.';

-- ===================================================================
-- SECTION 5: VERIFICATION
-- ===================================================================

DO $$
DECLARE
  student_column_exists BOOLEAN;
  null_student_count INTEGER;
  total_bookings_count INTEGER;
BEGIN
  -- Verify student_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bookings'
    AND column_name = 'student_id'
  ) INTO student_column_exists;

  IF NOT student_column_exists THEN
    RAISE EXCEPTION 'student_id column was not added to bookings table';
  END IF;

  -- Check for any NULL student_id values
  SELECT COUNT(*) INTO null_student_count
  FROM public.bookings
  WHERE student_id IS NULL;

  -- Check total bookings
  SELECT COUNT(*) INTO total_bookings_count
  FROM public.bookings;

  RAISE NOTICE 'Migration 063 completed successfully';
  RAISE NOTICE 'student_id column added: %', student_column_exists;
  RAISE NOTICE 'Total bookings: %', total_bookings_count;
  RAISE NOTICE 'Bookings with NULL student_id: %', null_student_count;
  RAISE NOTICE 'Student role will be available as text[] value in profiles.roles';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
