/**
 * Migration 113: Add Marketplace Listing Types
 * Created: 2025-12-10
 * Phase: Marketplace Phase 1 - Mixed Listing Types
 *
 * Purpose:
 * - Add proper listing type enum for marketplace
 * - Support sessions, courses, and job postings
 * - Add type-specific fields (duration, start_date, end_date, etc.)
 * - Maintain backward compatibility with existing listings
 *
 * Listing Types:
 * 1. session - Individual tutoring sessions (default, existing)
 * 2. course - Structured learning programs with start/end dates
 * 3. job - Client job postings seeking tutors/agents
 */

-- Create listing type enum
DO $$ BEGIN
  CREATE TYPE listing_category AS ENUM ('session', 'course', 'job');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add listing_category column (new standardized field)
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS listing_category listing_category DEFAULT 'session';

-- Add course-specific fields
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS course_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS course_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS course_duration_weeks INTEGER,
ADD COLUMN IF NOT EXISTS course_max_students INTEGER,
ADD COLUMN IF NOT EXISTS course_curriculum JSONB; -- Structured curriculum with modules/lessons

-- Add job-specific fields
ALTER TABLE listings
ADD COLUMN IF NOT EXISTS job_type VARCHAR(50), -- 'full-time', 'part-time', 'contract', 'one-off'
ADD COLUMN IF NOT EXISTS job_deadline TIMESTAMPTZ, -- Application deadline
ADD COLUMN IF NOT EXISTS job_requirements JSONB, -- Required qualifications, experience, etc.
ADD COLUMN IF NOT EXISTS job_budget_min DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS job_budget_max DECIMAL(10, 2);

-- Migrate existing data (all current listings are sessions)
UPDATE listings
SET listing_category = 'session'
WHERE listing_category IS NULL;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(listing_category);
CREATE INDEX IF NOT EXISTS idx_listings_category_status ON listings(listing_category, status);
CREATE INDEX IF NOT EXISTS idx_listings_course_dates ON listings(course_start_date, course_end_date)
  WHERE listing_category = 'course';
CREATE INDEX IF NOT EXISTS idx_listings_job_deadline ON listings(job_deadline)
  WHERE listing_category = 'job';

-- Add comments
COMMENT ON COLUMN listings.listing_category IS 'Marketplace listing category: session (tutoring), course (program), or job (client seeking tutor)';
COMMENT ON COLUMN listings.course_start_date IS 'Course start date (for listing_category = course)';
COMMENT ON COLUMN listings.course_end_date IS 'Course end date (for listing_category = course)';
COMMENT ON COLUMN listings.course_duration_weeks IS 'Course duration in weeks (for listing_category = course)';
COMMENT ON COLUMN listings.course_max_students IS 'Maximum number of students for course (for listing_category = course)';
COMMENT ON COLUMN listings.course_curriculum IS 'Structured curriculum with modules and lessons (for listing_category = course)';
COMMENT ON COLUMN listings.job_type IS 'Job type: full-time, part-time, contract, one-off (for listing_category = job)';
COMMENT ON COLUMN listings.job_deadline IS 'Application deadline for job posting (for listing_category = job)';
COMMENT ON COLUMN listings.job_requirements IS 'Required qualifications and experience (for listing_category = job)';
COMMENT ON COLUMN listings.job_budget_min IS 'Minimum budget for job (for listing_category = job)';
COMMENT ON COLUMN listings.job_budget_max IS 'Maximum budget for job (for listing_category = job)';

-- Update the search function to support listing categories
CREATE OR REPLACE FUNCTION search_listings_with_category(
  p_category listing_category DEFAULT NULL,
  p_subjects TEXT[] DEFAULT NULL,
  p_levels TEXT[] DEFAULT NULL,
  p_location_type VARCHAR(20) DEFAULT NULL,
  p_location_city VARCHAR(100) DEFAULT NULL,
  p_min_price DECIMAL DEFAULT NULL,
  p_max_price DECIMAL DEFAULT NULL,
  p_free_trial_only BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  title TEXT,
  description TEXT,
  listing_category listing_category,
  subjects TEXT[],
  levels TEXT[],
  hourly_rate DECIMAL,
  location_type VARCHAR,
  location_city VARCHAR,
  free_trial BOOLEAN,
  average_rating DECIMAL,
  review_count INTEGER,
  full_name VARCHAR,
  avatar_url TEXT,
  identity_verified BOOLEAN,
  dbs_verified BOOLEAN,
  available_free_help BOOLEAN,
  embedding JSONB,
  course_start_date TIMESTAMPTZ,
  course_end_date TIMESTAMPTZ,
  job_deadline TIMESTAMPTZ,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_listings AS (
    SELECT
      l.*,
      p.full_name,
      p.avatar_url,
      p.identity_verified,
      p.dbs_verified,
      COUNT(*) OVER() AS total_count
    FROM listings l
    LEFT JOIN profiles p ON l.profile_id = p.id
    WHERE l.status = 'published'
      AND (p_category IS NULL OR l.listing_category = p_category)
      AND (p_subjects IS NULL OR l.subjects && p_subjects)
      AND (p_levels IS NULL OR l.levels && p_levels)
      AND (p_location_type IS NULL OR l.location_type = p_location_type)
      AND (p_location_city IS NULL OR LOWER(l.location_city) = LOWER(p_location_city))
      AND (p_min_price IS NULL OR l.hourly_rate >= p_min_price)
      AND (p_max_price IS NULL OR l.hourly_rate <= p_max_price)
      AND (p_free_trial_only = FALSE OR l.free_trial = TRUE)
    ORDER BY l.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT
    fl.id,
    fl.profile_id,
    fl.title,
    fl.description,
    fl.listing_category,
    fl.subjects,
    fl.levels,
    fl.hourly_rate,
    fl.location_type,
    fl.location_city,
    fl.free_trial,
    fl.average_rating,
    fl.review_count,
    fl.full_name,
    fl.avatar_url,
    fl.identity_verified,
    fl.dbs_verified,
    fl.available_free_help,
    fl.embedding,
    fl.course_start_date,
    fl.course_end_date,
    fl.job_deadline,
    fl.total_count
  FROM filtered_listings fl;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_listings_with_category IS 'Search listings with category filtering support';
