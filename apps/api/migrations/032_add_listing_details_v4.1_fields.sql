-- Migration 032: Add Listing Details v4.1 Fields
-- Purpose: Add fields for dynamic listing details page redesign
-- Author: Senior Architect + Claude AI
-- Date: 2025-11-05
-- Related: dynamic-listing-details-v4.1.md

-- ============================================================
-- 1. LISTING IMAGE FIELDS
-- ============================================================

-- Add hero image URL (main listing image)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

-- Add gallery images array (additional photos)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS gallery_image_urls TEXT[] DEFAULT '{}';

COMMENT ON COLUMN listings.hero_image_url IS 'Main hero image URL from Supabase Storage for listing details page';
COMMENT ON COLUMN listings.gallery_image_urls IS 'Array of additional image URLs for gallery grid';

-- ============================================================
-- 2. AVAILABILITY FIELDS (from v4.0 CreateListings form)
-- ============================================================

-- Add availability periods (from AvailabilityFormSection.tsx)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '[]';

-- Add unavailability periods (from UnavailabilityFormSection.tsx)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS unavailability JSONB DEFAULT '[]';

COMMENT ON COLUMN listings.availability IS 'Availability periods from CreateListings v4.0 - format: [{"id":"period-123","type":"recurring","days":["Monday","Wednesday"],"fromDate":"2025-01-01","toDate":"2025-12-31","startTime":"09:00","endTime":"17:00"}]';
COMMENT ON COLUMN listings.unavailability IS 'Unavailability periods (vacations, holidays) - format: [{"id":"unavail-123","fromDate":"2025-12-20","toDate":"2025-12-31"}]';

-- ============================================================
-- 3. SERVICE TYPE FIELD (normalized from listing_type)
-- ============================================================

-- Add service_type enum for cleaner querying
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS service_type VARCHAR(50);

-- Migrate existing listing_type to service_type
UPDATE listings
SET service_type = CASE
  WHEN listing_type ILIKE '%one-to-one%' OR listing_type ILIKE '%one on one%' THEN 'one-to-one'
  WHEN listing_type ILIKE '%group%' THEN 'group-session'
  WHEN listing_type ILIKE '%workshop%' OR listing_type ILIKE '%webinar%' THEN 'workshop'
  WHEN listing_type ILIKE '%package%' THEN 'study-package'
  ELSE 'one-to-one' -- default fallback
END
WHERE service_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_service_type ON listings(service_type);

COMMENT ON COLUMN listings.service_type IS 'Normalized service type: one-to-one, group-session, workshop, study-package';

-- ============================================================
-- 4. SERVICE-SPECIFIC FIELDS (for ActionCard variants)
-- ============================================================

-- Add max_attendees (for group-session and workshop)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS max_attendees INTEGER;

-- Add session_duration (for one-to-one and group-session)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS session_duration INTEGER;

-- Add group pricing (price per person for group sessions)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS group_price_per_person DECIMAL(10,2);

-- Add package pricing (for study packages)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS package_price DECIMAL(10,2);

-- Add package_type (for study packages: pdf, video, bundle)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS package_type VARCHAR(50);

COMMENT ON COLUMN listings.max_attendees IS 'Maximum attendees for group sessions (2-10) or workshops (10-500)';
COMMENT ON COLUMN listings.session_duration IS 'Session duration in minutes (e.g., 30, 60, 90)';
COMMENT ON COLUMN listings.group_price_per_person IS 'Price per person for group sessions';
COMMENT ON COLUMN listings.package_price IS 'Fixed price for study packages';
COMMENT ON COLUMN listings.package_type IS 'Type of study package: pdf, video, bundle';

-- ============================================================
-- 5. REVIEWS TABLE (placeholder for future feature)
-- ============================================================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  comment TEXT,
  helpful_count INTEGER DEFAULT 0,
  verified_booking BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT reviews_unique_listing_reviewer UNIQUE (listing_id, reviewer_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_listing_id ON reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews for their bookings"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their own reviews"
  ON reviews FOR DELETE
  USING (auth.uid() = reviewer_id);

COMMENT ON TABLE reviews IS 'User reviews for listings - placeholder table for future Reviews v4.2 feature';

-- ============================================================
-- 5. TUTOR STATS FIELDS (calculated/cached metrics)
-- ============================================================

-- Add tutor stats to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS sessions_taught INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS response_time_hours INTEGER,
ADD COLUMN IF NOT EXISTS response_rate_percentage INTEGER;

-- Indexes for tutor stats
CREATE INDEX IF NOT EXISTS idx_profiles_sessions_taught ON profiles(sessions_taught);
CREATE INDEX IF NOT EXISTS idx_profiles_average_rating ON profiles(average_rating);

COMMENT ON COLUMN profiles.sessions_taught IS 'Total sessions completed (cached, updated via bookings trigger)';
COMMENT ON COLUMN profiles.total_reviews IS 'Total reviews received (cached, updated via reviews trigger)';
COMMENT ON COLUMN profiles.average_rating IS 'Average rating from reviews (1.00 to 5.00)';
COMMENT ON COLUMN profiles.response_time_hours IS 'Average response time in hours (cached from messages)';
COMMENT ON COLUMN profiles.response_rate_percentage IS 'Percentage of messages responded to (0-100)';

-- ============================================================
-- 6. LISTING ANALYTICS FIELDS (for Related Listings algorithm)
-- ============================================================

ALTER TABLE listings
ADD COLUMN IF NOT EXISTS total_bookings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS last_booked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_listings_total_bookings ON listings(total_bookings DESC);
CREATE INDEX IF NOT EXISTS idx_listings_average_rating ON listings(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_listings_last_booked_at ON listings(last_booked_at DESC);

COMMENT ON COLUMN listings.total_bookings IS 'Total bookings for this listing (cached for Related Listings algorithm)';
COMMENT ON COLUMN listings.average_rating IS 'Average rating from reviews (1.00 to 5.00)';
COMMENT ON COLUMN listings.last_booked_at IS 'Timestamp of most recent booking (for popularity sorting)';

-- ============================================================
-- 7. SLUG GENERATION FUNCTION (for SEO-friendly URLs)
-- ============================================================

-- Function to generate SEO-friendly slug
CREATE OR REPLACE FUNCTION generate_listing_slug(
  listing_title TEXT,
  tutor_name TEXT,
  location_city TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  slug TEXT;
BEGIN
  -- Concatenate title + tutor name + city
  slug := LOWER(TRIM(listing_title || ' ' || tutor_name || ' ' || COALESCE(location_city, '')));

  -- Replace spaces with hyphens
  slug := REGEXP_REPLACE(slug, '\s+', '-', 'g');

  -- Remove special characters (keep only alphanumeric and hyphens)
  slug := REGEXP_REPLACE(slug, '[^a-z0-9-]', '', 'g');

  -- Remove consecutive hyphens
  slug := REGEXP_REPLACE(slug, '-+', '-', 'g');

  -- Remove leading/trailing hyphens
  slug := TRIM(BOTH '-' FROM slug);

  -- Limit to 100 characters
  slug := SUBSTRING(slug FROM 1 FOR 100);

  RETURN slug;
END;
$$;

-- Add slug column to listings
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS slug VARCHAR(200);

-- Populate slugs for existing listings
UPDATE listings l
SET slug = generate_listing_slug(
  l.title,
  COALESCE(p.first_name, ''),
  l.location_city
)
FROM profiles p
WHERE l.tutor_id = p.id
AND l.slug IS NULL;

-- Create unique index (allowing multiple listings to have same slug - we'll use id for uniqueness)
CREATE INDEX IF NOT EXISTS idx_listings_slug ON listings(slug);

COMMENT ON COLUMN listings.slug IS 'SEO-friendly URL slug generated from title + tutor name + city';
COMMENT ON FUNCTION generate_listing_slug IS 'Generates SEO-friendly slug for listing URLs';

-- ============================================================
-- 8. SEED PLACEHOLDER REVIEWS (for testing)
-- ============================================================

-- Only insert if reviews table is empty
DO $$
DECLARE
  sample_listing_id UUID;
  sample_reviewer_id UUID;
BEGIN
  -- Check if reviews table is empty
  IF NOT EXISTS (SELECT 1 FROM reviews LIMIT 1) THEN
    -- Get a sample listing
    SELECT id INTO sample_listing_id FROM listings WHERE status = 'published' LIMIT 1;

    -- Get a sample user (not the tutor)
    SELECT id INTO sample_reviewer_id
    FROM profiles
    WHERE id != (SELECT tutor_id FROM listings WHERE id = sample_listing_id)
    LIMIT 1;

    -- Insert 3 placeholder reviews if we found valid IDs
    IF sample_listing_id IS NOT NULL AND sample_reviewer_id IS NOT NULL THEN
      INSERT INTO reviews (listing_id, reviewer_id, rating, title, comment, verified_booking)
      VALUES
        (sample_listing_id, sample_reviewer_id, 5, 'Excellent tutor!', 'Really helped me understand complex topics. Highly recommended.', true),
        (sample_listing_id, sample_reviewer_id, 4, 'Great experience', 'Very knowledgeable and patient. Would book again.', true),
        (sample_listing_id, sample_reviewer_id, 5, 'Best tutor ever', 'Improved my grades significantly. Thank you!', true);
    END IF;
  END IF;
END $$;

-- ============================================================
-- 9. UPDATE TRIGGERS (for cached stats)
-- ============================================================

-- Trigger to update listing.average_rating when review is added/updated/deleted
CREATE OR REPLACE FUNCTION update_listing_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE listings
  SET average_rating = (
    SELECT AVG(rating)::DECIMAL(3,2)
    FROM reviews
    WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id)
  )
  WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_listing_rating ON reviews;
CREATE TRIGGER trigger_update_listing_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_listing_rating();

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Summary comment
COMMENT ON TABLE listings IS 'Listings table - Updated for v4.1 dynamic listing details page with images, availability, and analytics';
