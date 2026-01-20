/*
 * Migration: 196_consolidate_to_hourly_rate.sql
 * Purpose: Remove hourly_rate_min/max, use single hourly_rate field
 * Created: 2026-01-20
 *
 * Background:
 * - Migration 194 added hourly_rate_min and hourly_rate_max
 * - This created unnecessary complexity (3 rate fields!)
 * - Most tutors charge a single rate, not a range
 * - Revert to using the original hourly_rate field
 *
 * Strategy:
 * 1. Migrate hourly_rate_min to hourly_rate where hourly_rate is NULL
 * 2. Drop hourly_rate_min and hourly_rate_max columns
 */

-- Step 1: Migrate hourly_rate_min to hourly_rate for records where hourly_rate is NULL
UPDATE listings
SET hourly_rate = hourly_rate_min
WHERE hourly_rate IS NULL AND hourly_rate_min IS NOT NULL;

-- Step 2: Drop the unnecessary columns
ALTER TABLE listings
DROP COLUMN IF EXISTS hourly_rate_min,
DROP COLUMN IF EXISTS hourly_rate_max;

-- Step 3: Update comment
COMMENT ON COLUMN listings.hourly_rate IS 'Hourly rate for the service in the specified currency';
