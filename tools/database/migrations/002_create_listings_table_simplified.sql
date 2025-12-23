-- Migration: Create listings table (Simplified)
-- Run this in Supabase SQL Editor

-- Step 1: Create the table WITHOUT foreign key first
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,

  -- Basic Info
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'paused', 'archived')),

  -- Teaching Details
  subjects TEXT[] NOT NULL DEFAULT '{}',
  levels TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  teaching_methods TEXT[] DEFAULT '{}',
  qualifications TEXT[] DEFAULT '{}',
  teaching_experience TEXT,

  -- Pricing
  hourly_rate NUMERIC(10, 2),
  currency VARCHAR(3) DEFAULT 'GBP',
  pricing_packages JSONB,
  free_trial BOOLEAN DEFAULT false,
  trial_duration_minutes INTEGER,

  -- Availability & Location
  location_type VARCHAR(20) NOT NULL CHECK (location_type IN ('online', 'in_person', 'hybrid')),
  location_address TEXT,
  location_city VARCHAR(100),
  location_postcode VARCHAR(20),
  location_country VARCHAR(100) DEFAULT 'United Kingdom',
  timezone VARCHAR(50) DEFAULT 'Europe/London',
  availability JSONB,

  -- Media
  images TEXT[] DEFAULT '{}',
  video_url TEXT,

  -- SEO & Discovery
  slug VARCHAR(255) UNIQUE,
  tags TEXT[] DEFAULT '{}',

  -- Metrics
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  response_time VARCHAR(50),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_hourly_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
  CONSTRAINT valid_trial_duration CHECK (trial_duration_minutes IS NULL OR trial_duration_minutes > 0)
);

-- Step 2: Add foreign key constraint (if profiles table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE listings
    DROP CONSTRAINT IF EXISTS listings_profile_id_fkey;

    ALTER TABLE listings
    ADD CONSTRAINT listings_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_listings_profile_id ON listings(profile_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_subjects ON listings USING GIN(subjects);
CREATE INDEX IF NOT EXISTS idx_listings_levels ON listings USING GIN(levels);
CREATE INDEX IF NOT EXISTS idx_listings_specializations ON listings USING GIN(specializations);
CREATE INDEX IF NOT EXISTS idx_listings_teaching_methods ON listings USING GIN(teaching_methods);
CREATE INDEX IF NOT EXISTS idx_listings_qualifications ON listings USING GIN(qualifications);
CREATE INDEX IF NOT EXISTS idx_listings_location_type ON listings(location_type);
CREATE INDEX IF NOT EXISTS idx_listings_location_city ON listings(location_city);
CREATE INDEX IF NOT EXISTS idx_listings_published_at ON listings(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_listings_slug ON listings(slug);

-- Step 4: Full-text search index
CREATE INDEX IF NOT EXISTS idx_listings_search ON listings USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
);

-- Step 5: Functions and triggers
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

DROP TRIGGER IF EXISTS listings_generate_slug ON listings;
CREATE TRIGGER listings_generate_slug
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION generate_listing_slug();

CREATE OR REPLACE FUNCTION update_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_update_timestamp ON listings;
CREATE TRIGGER listings_update_timestamp
  BEFORE UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listings_updated_at();

-- Step 6: Row Level Security
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS listings_select_published ON listings;
CREATE POLICY listings_select_published ON listings
  FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS listings_select_own ON listings;
CREATE POLICY listings_select_own ON listings
  FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS listings_insert_own ON listings;
CREATE POLICY listings_insert_own ON listings
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS listings_update_own ON listings;
CREATE POLICY listings_update_own ON listings
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS listings_delete_own ON listings;
CREATE POLICY listings_delete_own ON listings
  FOR DELETE
  USING (auth.uid() = profile_id);

-- Step 7: Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON listings TO authenticated;
GRANT SELECT ON listings TO anon;

-- Done
COMMENT ON TABLE listings IS 'Tutor service listings for marketplace (includes all fields from migration 002 and 003)';
