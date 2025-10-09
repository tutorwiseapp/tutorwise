-- Migration: Create listings table for tutor service listings
-- Version: 002
-- Date: 2025-10-09
-- Purpose: Enable tutors to create and manage service listings

-- Create listings table
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic Info
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'archived')),

  -- Teaching Details
  subjects TEXT[] NOT NULL DEFAULT '{}', -- e.g., ['Mathematics', 'Physics']
  levels TEXT[] NOT NULL DEFAULT '{}',  -- e.g., ['GCSE', 'A-Level', 'University']
  languages TEXT[] NOT NULL DEFAULT '{}', -- e.g., ['English', 'Spanish']

  -- Pricing
  hourly_rate NUMERIC(10, 2), -- Hourly rate in GBP
  currency VARCHAR(3) DEFAULT 'GBP',
  pricing_packages JSONB, -- Optional: e.g., [{ sessions: 5, price: 100, discount: 10 }]
  free_trial BOOLEAN DEFAULT false,
  trial_duration_minutes INTEGER, -- e.g., 30 for 30-minute trial

  -- Availability & Location
  location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('online', 'in_person', 'hybrid')),
  location_address TEXT, -- For in-person/hybrid
  location_city VARCHAR(100),
  location_postcode VARCHAR(20),
  location_country VARCHAR(100) DEFAULT 'United Kingdom',
  timezone VARCHAR(50) DEFAULT 'Europe/London',
  availability JSONB, -- Schedule: { monday: [{start: '09:00', end: '17:00'}], ... }

  -- Media
  images TEXT[] DEFAULT '{}', -- Array of image URLs
  video_url TEXT, -- Introduction video URL

  -- SEO & Discovery
  slug VARCHAR(255) UNIQUE, -- URL-friendly version of title
  tags TEXT[] DEFAULT '{}', -- Additional searchable tags

  -- Metrics
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Indexes for search performance
  CONSTRAINT valid_hourly_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
  CONSTRAINT valid_trial_duration CHECK (trial_duration_minutes IS NULL OR trial_duration_minutes > 0)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_listings_profile_id ON listings(profile_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_subjects ON listings USING GIN(subjects);
CREATE INDEX IF NOT EXISTS idx_listings_levels ON listings USING GIN(levels);
CREATE INDEX IF NOT EXISTS idx_listings_location_type ON listings(location_type);
CREATE INDEX IF NOT EXISTS idx_listings_location_city ON listings(location_city);
CREATE INDEX IF NOT EXISTS idx_listings_published_at ON listings(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_listings_slug ON listings(slug);

-- Full-text search index for title and description
CREATE INDEX IF NOT EXISTS idx_listings_search ON listings USING GIN(
  to_tsvector('english', title || ' ' || description)
);

-- Function to automatically generate slug from title
CREATE OR REPLACE FUNCTION generate_listing_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(
      regexp_replace(
        regexp_replace(NEW.title, '[^\w\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    ) || '-' || substring(NEW.id::text from 1 for 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate slug before insert
CREATE TRIGGER listings_generate_slug
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION generate_listing_slug();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on every update
CREATE TRIGGER listings_update_timestamp
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listings_updated_at();

-- Row Level Security (RLS) Policies
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view published listings
CREATE POLICY listings_select_published ON listings
  FOR SELECT
  USING (status = 'published');

-- Policy: Users can view their own listings (any status)
CREATE POLICY listings_select_own ON listings
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Policy: Users can insert their own listings
CREATE POLICY listings_insert_own ON listings
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can update their own listings
CREATE POLICY listings_update_own ON listings
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Policy: Users can delete their own listings
CREATE POLICY listings_delete_own ON listings
  FOR DELETE
  USING (auth.uid() = profile_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON listings TO authenticated;
GRANT SELECT ON listings TO anon; -- Allow anonymous users to browse published listings

-- Add comment
COMMENT ON TABLE listings IS 'Tutor service listings for marketplace discovery';
