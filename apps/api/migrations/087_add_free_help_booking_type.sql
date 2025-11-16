-- ===================================================================
-- Migration: 087_add_free_help_booking_type.sql
-- Purpose: Add 'free_help' booking type for Free Help Now (v5.9)
-- Created: 2025-11-16
-- Author: Senior Architect
-- Prerequisites: bookings table exists
-- ===================================================================
-- This migration adds a new booking type for free help sessions.
-- These sessions bypass all payment systems and are rewarded with CaaS points.
-- ===================================================================

-- Add 'free_help' type column to bookings
-- Note: We're adding a 'type' column instead of modifying an enum
-- This is more flexible and doesn't require enum alterations
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'paid' CHECK (type IN ('paid', 'free_help'));

COMMENT ON COLUMN public.bookings.type IS
'v5.9: Booking type - "paid" for standard paid bookings, "free_help" for Free Help Now sessions.
free_help sessions bypass Stripe entirely and tutor is compensated with CaaS score boost.';

-- Create index for fast filtering of free help sessions
CREATE INDEX IF NOT EXISTS idx_bookings_type
ON public.bookings(type)
WHERE type = 'free_help';

-- Create index for CaaS calculation queries
CREATE INDEX IF NOT EXISTS idx_bookings_type_status_tutor
ON public.bookings(type, status, tutor_id)
WHERE type = 'free_help' AND status = 'Completed';

-- Add duration column if it doesn't exist (for 30-minute sessions)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;

COMMENT ON COLUMN public.bookings.duration_minutes IS
'v5.9: Session duration in minutes. Default 60 for paid bookings, 30 for free_help sessions.';

-- Validation
DO $$
DECLARE
  v_type_column_exists BOOLEAN;
  v_duration_column_exists BOOLEAN;
  v_index_count INTEGER;
BEGIN
  -- Check if type column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bookings'
    AND column_name = 'type'
  ) INTO v_type_column_exists;

  -- Check if duration column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bookings'
    AND column_name = 'duration_minutes'
  ) INTO v_duration_column_exists;

  -- Count indexes
  SELECT COUNT(*)
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename = 'bookings'
  AND indexname LIKE 'idx_bookings_type%'
  INTO v_index_count;

  -- Report status
  RAISE NOTICE 'Migration 087 completed successfully';
  RAISE NOTICE 'bookings.type column added: %', v_type_column_exists;
  RAISE NOTICE 'bookings.duration_minutes column added: %', v_duration_column_exists;
  RAISE NOTICE 'Indexes created: %', v_index_count;
  RAISE NOTICE 'Ready for free_help booking creation (v5.9)';
  RAISE NOTICE 'Integration point: POST /api/sessions/create-free-help-session';
END $$;
