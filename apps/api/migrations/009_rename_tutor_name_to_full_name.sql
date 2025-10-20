-- Migration 009: Rename tutor_name to full_name
-- Purpose: Standardize naming convention across the application
-- All user display names should use full_name (consistent with profiles table)

-- 1. Rename the column in listings table
ALTER TABLE listings
RENAME COLUMN tutor_name TO full_name;

-- 2. Update the comment for clarity
COMMENT ON COLUMN listings.full_name IS 'Full name of the tutor (display name for the listing)';

-- Note: This is a breaking change that requires coordinated deployment
-- The application code must be updated before running this migration
