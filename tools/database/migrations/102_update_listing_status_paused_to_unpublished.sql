-- Migration: Update listing status from 'paused' to 'unpublished'
-- Version: 102
-- Date: 2025-12-09
-- Purpose: Align database status values with UI terminology for better clarity

-- Step 1: Update existing 'paused' listings to 'unpublished'
UPDATE listings
SET status = 'unpublished'
WHERE status = 'paused';

-- Step 2: Drop the old CHECK constraint
ALTER TABLE listings
DROP CONSTRAINT IF EXISTS listings_status_check;

-- Step 3: Add new CHECK constraint with 'unpublished' instead of 'paused'
ALTER TABLE listings
ADD CONSTRAINT listings_status_check
CHECK (status IN ('draft', 'published', 'unpublished', 'archived'));

-- Add comment explaining the status values and workflow
COMMENT ON COLUMN listings.status IS 'Listing status workflow: draft (work in progress, not visible) → published (live in marketplace) → unpublished (temporarily hidden, can be re-published) → archived (permanently removed with 5-day grace period before manual deletion allowed). Note: Only unpublished listings can be archived, and only archived listings can be deleted (after 5 days).';
