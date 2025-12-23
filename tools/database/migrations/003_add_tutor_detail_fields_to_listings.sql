-- Migration: Add tutor detail fields to listings table
-- Version: 003
-- Date: 2025-10-09
-- Purpose: Add specializations, teaching methods, qualifications, experience, and response time

-- Add new columns to listings table
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS teaching_methods TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS qualifications TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS teaching_experience TEXT,
ADD COLUMN IF NOT EXISTS response_time VARCHAR(50);

-- Create indexes for the array columns to improve search performance
CREATE INDEX IF NOT EXISTS idx_listings_specializations ON listings USING GIN(specializations);
CREATE INDEX IF NOT EXISTS idx_listings_teaching_methods ON listings USING GIN(teaching_methods);
CREATE INDEX IF NOT EXISTS idx_listings_qualifications ON listings USING GIN(qualifications);

-- Add comments to document the new fields
COMMENT ON COLUMN listings.specializations IS 'Specific areas of expertise (e.g., "Exam Preparation", "Special Needs")';
COMMENT ON COLUMN listings.teaching_methods IS 'Teaching approaches used (e.g., "Visual Learning", "Hands-on Practice")';
COMMENT ON COLUMN listings.qualifications IS 'Educational qualifications and certifications';
COMMENT ON COLUMN listings.teaching_experience IS 'Description of teaching background and experience';
COMMENT ON COLUMN listings.response_time IS 'Average response time to inquiries (e.g., "Within 1 hour", "Same day")';
