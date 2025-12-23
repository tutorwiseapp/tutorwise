-- Migration 025: Add MVP Listing Fields for One-on-One Session Type
-- Purpose: Add new columns to listings table for MVP listing creation refactor
-- Author: Claude AI
-- Date: 2025-01-26
-- Related: CreateListings.tsx refactor - Step 4 MVP

-- Add listing_type column (for future expansion to 13 types)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS listing_type VARCHAR(100) DEFAULT 'Tutor: One-on-One Session';

-- Add instant booking feature
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS instant_booking_enabled BOOLEAN DEFAULT FALSE;

-- Add AI tools used (predefined list: ChatGPT, Claude, Grammarly, Khan Academy, etc.)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS ai_tools_used TEXT[];

-- Add cancellation policy
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT;

-- Add duration options (stores array of minutes: [30, 60, 90, 120])
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS duration_options INTEGER[];

-- Add free trial option
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS free_trial BOOLEAN DEFAULT FALSE;

-- Add location details (optional descriptive text for in-person/hybrid)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS location_details TEXT;

-- Add delivery_mode if not exists (should already exist, but ensuring)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'listings' AND column_name = 'delivery_mode'
    ) THEN
        ALTER TABLE listings ADD COLUMN delivery_mode VARCHAR(50);
    END IF;
END $$;

-- Create index on listing_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_listings_listing_type ON listings(listing_type);

-- Create index on instant_booking_enabled for marketplace filtering
CREATE INDEX IF NOT EXISTS idx_listings_instant_booking ON listings(instant_booking_enabled);

-- Add comment to document the schema change
COMMENT ON COLUMN listings.listing_type IS 'Type of listing (MVP: "Tutor: One-on-One Session", future: 13 types total)';
COMMENT ON COLUMN listings.instant_booking_enabled IS 'Whether listing supports instant booking without approval';
COMMENT ON COLUMN listings.ai_tools_used IS 'Array of AI tools used in tutoring (ChatGPT, Claude, Grammarly, Khan Academy, etc.)';
COMMENT ON COLUMN listings.duration_options IS 'Available session durations in minutes [30, 60, 90, 120]';
COMMENT ON COLUMN listings.free_trial IS 'Whether listing offers a free trial session';
COMMENT ON COLUMN listings.location_details IS 'Optional descriptive text for in-person/hybrid location details';
