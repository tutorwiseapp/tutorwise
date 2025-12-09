-- Migration: Fix inline status constraint on listings table
-- Version: 102b
-- Date: 2025-12-09
-- Purpose: Remove the inline CHECK constraint created with the table and replace with named constraint

-- The problem: The original table creation (002_create_listings_table_simplified.sql line 12)
-- created an inline constraint: CHECK (status IN ('draft', 'published', 'paused', 'archived'))
-- This constraint has an auto-generated name like "listings_status_check1" or similar.

-- Step 1: Find and drop ALL status check constraints (including inline ones)
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'listings'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE listings DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Step 2: Update any existing 'paused' listings to 'unpublished'
UPDATE listings
SET status = 'unpublished'
WHERE status = 'paused';

-- Step 3: Add the new named constraint with correct values
ALTER TABLE listings
ADD CONSTRAINT listings_status_check
CHECK (status IN ('draft', 'published', 'unpublished', 'archived'));

-- Add comment explaining the status values and workflow
COMMENT ON COLUMN listings.status IS 'Listing status workflow: draft (work in progress, not visible) → published (live in marketplace) → unpublished (temporarily hidden, can be re-published) → archived (permanently removed with 5-day grace period before manual deletion allowed). Note: Only unpublished listings can be archived, and only archived listings can be deleted (after 5 days).';

-- Verify the new constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'listings_status_check'
          AND conrelid = 'listings'::regclass
    ) THEN
        RAISE NOTICE '✅ Successfully created listings_status_check constraint';
    ELSE
        RAISE EXCEPTION '❌ Failed to create listings_status_check constraint';
    END IF;
END $$;
