/*
 * Migration: 233_rename_location_type_to_delivery_mode_in_bookings.sql
 * Purpose: Rename location_type to delivery_mode in bookings table for consistency
 * Created: 2026-02-06
 *
 * Background:
 * - Listings use delivery_mode (TEXT[]) - Migration 195
 * - Bookings use location_type (TEXT) - Legacy naming
 * - Inconsistent naming causes confusion
 *
 * Strategy:
 * 1. Rename bookings.location_type to bookings.delivery_mode
 * 2. Update constraint to match new column name
 * 3. Update index to match new column name
 * 4. Update column comment
 *
 * Note: Bookings.delivery_mode is TEXT (single value), not array
 *       Listings.delivery_mode is TEXT[] (array)
 *       This is intentional - a listing offers multiple modes, a booking uses one
 */

BEGIN;

-- Step 1: Rename the column
ALTER TABLE bookings
RENAME COLUMN location_type TO delivery_mode;

-- Step 2: Drop old constraint and create new one with updated name
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS check_location_type;

ALTER TABLE bookings
ADD CONSTRAINT check_delivery_mode
  CHECK (delivery_mode IS NULL OR delivery_mode IN ('online', 'in_person', 'hybrid'));

-- Step 3: Recreate index with new column name
DROP INDEX IF EXISTS idx_bookings_location_type;

CREATE INDEX idx_bookings_delivery_mode
  ON bookings(delivery_mode);

-- Step 4: Update column comment
COMMENT ON COLUMN bookings.delivery_mode IS 'Snapshot of delivery mode at booking time (online, in_person, hybrid). Single value, unlike listings.delivery_mode which is an array.';

-- Step 5: Update location_city comment to reference delivery_mode
COMMENT ON COLUMN bookings.location_city IS 'Snapshot of location city at booking time for in-person sessions. Used when delivery_mode is in_person or hybrid.';

COMMIT;
