-- ===================================================================
-- Migration: 084_add_booking_referrer_id.sql
-- Purpose: Add booking_referrer_id to bookings for Wiselists (v5.7)
-- Created: 2025-11-15
-- Author: Senior Architect
-- Prerequisites: bookings, profiles tables exist
-- ===================================================================
-- This column is the lynchpin for the "in-network sales attribution" loop.
-- When a user clicks a booking from a shared Wiselist (/w/[slug]), the
-- wiselist owner's profile_id is stored here for commission tracking (v4.9).
-- ===================================================================

-- Add booking_referrer_id column
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS booking_referrer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.bookings.booking_referrer_id IS
'v5.7: Tracks if this booking was initiated from a shared Wiselist (e.g., /w/[slug]).
Used for in-network sales attribution and commission payouts (v4.9 Payments System).';

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_bookings_referrer_id
ON public.bookings(booking_referrer_id)
WHERE booking_referrer_id IS NOT NULL;

-- Validation
DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_index_exists BOOLEAN;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bookings'
    AND column_name = 'booking_referrer_id'
  ) INTO v_column_exists;

  -- Check if index exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'bookings'
    AND indexname = 'idx_bookings_referrer_id'
  ) INTO v_index_exists;

  -- Report status
  RAISE NOTICE 'Migration 084 completed successfully';
  RAISE NOTICE 'booking_referrer_id column added: %', v_column_exists;
  RAISE NOTICE 'Index created: %', v_index_exists;
  RAISE NOTICE 'Ready for in-network sales attribution (v5.7 + v4.9)';
  RAISE NOTICE 'Integration points: middleware.ts, checkout API, Stripe webhook';
END $$;
