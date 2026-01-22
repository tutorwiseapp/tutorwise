-- Migration 211: Add client request specific fields
-- Created: 2026-01-22
-- Purpose: Add tutoring_for and group_hourly_rate fields for client tutoring requests

-- Add tutoring_for field to identify who needs tutoring
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS tutoring_for VARCHAR(50);

COMMENT ON COLUMN listings.tutoring_for IS
'Who needs tutoring: myself, my_child, or other - used by client requests to identify the learner';

-- Add group_hourly_rate for client budget flexibility
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS group_hourly_rate NUMERIC(10,2);

COMMENT ON COLUMN listings.group_hourly_rate IS
'Budget for group sessions (£/hour) - used by client requests to specify their group session budget';

-- Create index for filtering client requests by tutoring_for
CREATE INDEX IF NOT EXISTS idx_listings_tutoring_for
ON listings(tutoring_for)
WHERE listing_type = 'request' AND status = 'published';

-- Add check constraint to ensure tutoring_for has valid values
ALTER TABLE listings
ADD CONSTRAINT chk_tutoring_for
CHECK (tutoring_for IS NULL OR tutoring_for IN ('myself', 'my_child', 'other'));

-- Add check constraint to ensure group_hourly_rate is positive
ALTER TABLE listings
ADD CONSTRAINT chk_group_hourly_rate_positive
CHECK (group_hourly_rate IS NULL OR group_hourly_rate > 0);
