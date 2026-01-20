/*
 * Migration: 195_migrate_location_type_to_delivery_mode.sql
 * Purpose: Consolidate location_type into delivery_mode and remove location_type
 * Created: 2026-01-20
 *
 * Background:
 * - location_type (VARCHAR, NOT NULL) - legacy single-value field
 * - delivery_mode (TEXT[]) - modern array field, more flexible
 * - Both fields serve the same purpose, causing confusion
 *
 * Strategy:
 * 1. Migrate location_type data to delivery_mode where delivery_mode is empty
 * 2. Make location_type nullable (remove NOT NULL constraint)
 * 3. Drop location_type column entirely
 */

-- Step 1: Migrate existing location_type to delivery_mode for records with empty delivery_mode
UPDATE listings
SET delivery_mode = ARRAY[location_type]::TEXT[]
WHERE delivery_mode = '{}' OR delivery_mode IS NULL;

-- Step 2: Make location_type nullable (in case we need to rollback)
ALTER TABLE listings
ALTER COLUMN location_type DROP NOT NULL;

-- Step 3: Drop location_type column
ALTER TABLE listings
DROP COLUMN location_type;

-- Step 4: Add comment
COMMENT ON COLUMN listings.delivery_mode IS 'Delivery modes for the service (online, in_person, hybrid). Replaces deprecated location_type field.';
