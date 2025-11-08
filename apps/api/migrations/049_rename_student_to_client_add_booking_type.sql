-- Migration 049: Rename student_id to client_id and add booking_type
-- Purpose: Improve naming consistency and add explicit booking type tracking
-- Author: Senior Architect + Claude AI
-- Date: 2025-11-08
-- Related: reviews-solution-design-v4.5.md

-- =====================================================================
-- This migration improves the booking schema by:
-- 1. Renaming student_id to client_id (more accurate for all use cases)
-- 2. Adding booking_type enum to explicitly track booking scenarios
-- 3. Updating all foreign key constraints and indexes
-- =====================================================================

BEGIN;

-- ============================================================
-- 1. CREATE BOOKING TYPE ENUM
-- ============================================================

CREATE TYPE booking_type_enum AS ENUM (
  'direct',      -- Client books tutor directly (Client ↔ Tutor)
  'referred',    -- Agent refers client who books tutor (Client ↔ Tutor ↔ Agent)
  'agent_job'    -- Agent hires tutor for a job (Agent ↔ Tutor)
);

COMMENT ON TYPE booking_type_enum IS
  'Type of booking: direct (client→tutor), referred (agent refers client→tutor), agent_job (agent hires tutor)';

-- ============================================================
-- 2. ADD BOOKING_TYPE COLUMN (temporarily nullable)
-- ============================================================

ALTER TABLE public.bookings
ADD COLUMN booking_type booking_type_enum;

COMMENT ON COLUMN public.bookings.booking_type IS
  'Type of booking relationship: direct, referred, or agent_job';

-- ============================================================
-- 3. POPULATE BOOKING_TYPE BASED ON EXISTING DATA
-- ============================================================

-- Logic:
-- - If referrer_profile_id exists AND student is different from referrer → 'referred'
-- - If referrer_profile_id is NULL → could be 'direct' or 'agent_job' (check active_role)
-- For now, we'll use a simple heuristic:
-- - If referrer_profile_id IS NOT NULL → 'referred'
-- - If referrer_profile_id IS NULL → 'direct' (we'll update agent_job cases manually or via app logic)

UPDATE public.bookings
SET booking_type = CASE
  WHEN referrer_profile_id IS NOT NULL THEN 'referred'::booking_type_enum
  ELSE 'direct'::booking_type_enum
END;

-- ============================================================
-- 4. RENAME STUDENT_ID TO CLIENT_ID
-- ============================================================

-- Step 4a: Rename the column
ALTER TABLE public.bookings
RENAME COLUMN student_id TO client_id;

-- Step 4b: Rename the foreign key constraint
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_student_id_fkey;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Step 4c: Rename the index
DROP INDEX IF EXISTS idx_bookings_student_id;

CREATE INDEX idx_bookings_client_id
  ON public.bookings(client_id);

-- ============================================================
-- 5. ADD BOOKING_TYPE INDEX AND MAKE COLUMN NOT NULL
-- ============================================================

ALTER TABLE public.bookings
ALTER COLUMN booking_type SET NOT NULL;

CREATE INDEX idx_bookings_booking_type
  ON public.bookings(booking_type);

-- ============================================================
-- 6. UPDATE TRIGGER FUNCTION TO SET BOOKING_TYPE
-- ============================================================

-- Update the review session creation trigger to use client_id
-- (This will be handled in migration 050)

-- ============================================================
-- 7. AUDIT LOG
-- ============================================================

INSERT INTO public.audit_log (action_type, module, details)
VALUES (
  'schema.bookings_renamed_and_enhanced',
  'Bookings',
  jsonb_build_object(
    'migration', '049',
    'changes', ARRAY[
      'Renamed student_id to client_id',
      'Added booking_type enum (direct, referred, agent_job)',
      'Populated booking_type based on referrer_profile_id'
    ],
    'timestamp', NOW()
  )
);

COMMIT;
