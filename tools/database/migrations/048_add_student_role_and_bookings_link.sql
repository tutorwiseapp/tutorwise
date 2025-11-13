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
-- SECTION 1: ADD STUDENT ROLE TO ENUM
-- ===================================================================

-- Add 'student' to the existing 'user_role' enum
-- We must do this in a separate transaction
DO $$
BEGIN
  -- Check if 'student' value already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'student'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'student';
    RAISE NOTICE 'Added student role to user_role enum';
  ELSE
    RAISE NOTICE 'Student role already exists in user_role enum';
  END IF;
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
  student_role_exists BOOLEAN;
  student_column_exists BOOLEAN;
  null_student_count INTEGER;
BEGIN
  -- Verify student role was added
  SELECT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'student'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) INTO student_role_exists;

  IF NOT student_role_exists THEN
    RAISE EXCEPTION 'Student role was not added to user_role enum';
  END IF;

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

  -- Check for any NULL student_id values (should be none after backfill)
  SELECT COUNT(*) INTO null_student_count
  FROM public.bookings
  WHERE student_id IS NULL;

  RAISE NOTICE 'Migration 048 completed successfully';
  RAISE NOTICE 'Student role added: %', student_role_exists;
  RAISE NOTICE 'student_id column added: %', student_column_exists;
  RAISE NOTICE 'Bookings with NULL student_id: %', null_student_count;
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
