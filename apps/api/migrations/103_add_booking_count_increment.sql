-- Migration: Add booking count auto-increment for listings
-- Version: 103
-- Date: 2025-12-09
-- Purpose: Create RPC function to increment listing booking_count when bookings are created

-- Create RPC function to increment listing booking count
CREATE OR REPLACE FUNCTION increment_listing_booking_count(listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE listings
  SET booking_count = COALESCE(booking_count, 0) + 1
  WHERE id = listing_id;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION increment_listing_booking_count IS 'Increments the booking_count for a listing when a new booking is created. Called from booking creation endpoint.';
