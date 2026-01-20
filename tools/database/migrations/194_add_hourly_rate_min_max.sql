/*
 * Migration: 194_add_hourly_rate_min_max.sql
 * Purpose: Add hourly_rate_min and hourly_rate_max columns for rate ranges
 * Created: 2026-01-20
 *
 * Background:
 * - Forms are sending hourly_rate_min and hourly_rate_max
 * - Database only has hourly_rate (singular)
 * - Need to support rate ranges for different service types
 */

-- Add hourly_rate_min column
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS hourly_rate_min NUMERIC(10, 2);

-- Add hourly_rate_max column
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS hourly_rate_max NUMERIC(10, 2);

-- Add check constraints
ALTER TABLE listings
ADD CONSTRAINT valid_hourly_rate_min
  CHECK (hourly_rate_min IS NULL OR hourly_rate_min >= 0);

ALTER TABLE listings
ADD CONSTRAINT valid_hourly_rate_max
  CHECK (hourly_rate_max IS NULL OR hourly_rate_max >= 0);

ALTER TABLE listings
ADD CONSTRAINT valid_rate_range
  CHECK (hourly_rate_max IS NULL OR hourly_rate_min IS NULL OR hourly_rate_max >= hourly_rate_min);

-- Add comments
COMMENT ON COLUMN listings.hourly_rate_min IS 'Minimum hourly rate (for rate ranges)';
COMMENT ON COLUMN listings.hourly_rate_max IS 'Maximum hourly rate (for rate ranges)';

-- Migrate existing hourly_rate to hourly_rate_min where hourly_rate exists
UPDATE listings
SET hourly_rate_min = hourly_rate
WHERE hourly_rate IS NOT NULL
  AND hourly_rate_min IS NULL;
