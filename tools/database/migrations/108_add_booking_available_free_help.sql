-- ============================================================================
-- Migration 108: Add available_free_help to Bookings
-- ============================================================================
-- Purpose: Add missing available_free_help field to bookings snapshot
-- Author: AI Architect
-- Date: 2025-12-10
-- Related: Migration 104 (Booking Snapshot Fields), v5.9 Free Help Feature
--
-- Problem:
-- - Migration 104 added 7 snapshot fields to bookings
-- - However, available_free_help field was missed from original analysis
-- - Listing has available_free_help (v5.9 feature) but booking doesn't snapshot it
-- - Important for tracking whether booking was made during free help promotion
--
-- Solution:
-- Add available_free_help field to bookings:
-- - available_free_help: Whether tutor was offering free help at booking time
--
-- Benefits:
-- 1. Complete snapshot of listing state at booking time
-- 2. Can track free help promotion effectiveness
-- 3. Analytics: conversion rate of free help listings
-- 4. Historical record of promotional bookings
-- ============================================================================

-- Step 1: Add column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS available_free_help BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN bookings.available_free_help IS 'Whether tutor was offering free help at booking time (v5.9 snapshot from listing)';

-- Step 2: Backfill not possible - available_free_help not yet in listings table (v5.9 pending)
-- Once listings.available_free_help is added, run:
-- UPDATE bookings b
-- SET available_free_help = COALESCE(l.available_free_help, FALSE)
-- FROM listings l
-- WHERE b.listing_id = l.id AND l.available_free_help = TRUE;

-- Step 3: Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_bookings_available_free_help ON bookings (available_free_help) WHERE available_free_help = TRUE;

-- Step 4: Show migration results
DO $$
DECLARE
  total_bookings INTEGER;
  free_help_bookings INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_bookings FROM bookings;
  SELECT COUNT(*) INTO free_help_bookings FROM bookings WHERE available_free_help = TRUE;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 108 Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total bookings: %', total_bookings;
  RAISE NOTICE 'Free help bookings: %', free_help_bookings;
  RAISE NOTICE '========================================';
END $$;
