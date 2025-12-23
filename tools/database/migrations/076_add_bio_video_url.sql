-- ===================================================================
-- Migration: 076_add_bio_video_url.sql
-- Purpose: Add bio_video_url to profiles for "Credibility Clip" feature (CaaS v5.5)
-- Created: 2025-11-15
-- Author: Senior Architect
-- Prerequisites: profiles table exists
-- ===================================================================
-- This migration adds the bio_video_url column to support the "Digital Professionalism"
-- bucket in the CaaS Tutor scoring model. Tutors can upload a 30-second intro video
-- to YouTube/Loom/Vimeo and paste the URL here for +5 CaaS points.
-- ===================================================================

-- ===================================================================
-- SECTION 1: ADD BIO_VIDEO_URL COLUMN
-- ===================================================================

-- Add the new column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio_video_url TEXT DEFAULT NULL;

-- ===================================================================
-- SECTION 2: ADD VALIDATION CONSTRAINTS (OPTIONAL BUT RECOMMENDED)
-- ===================================================================

-- Add check constraint to ensure URL format (basic validation)
-- This accepts YouTube, Vimeo, Loom, and other common video hosting URLs
ALTER TABLE public.profiles
ADD CONSTRAINT bio_video_url_format CHECK (
  bio_video_url IS NULL OR
  bio_video_url ~ '^https?://.+' -- Must start with http:// or https://
);

-- ===================================================================
-- SECTION 3: ADD DOCUMENTATION COMMENTS
-- ===================================================================

COMMENT ON COLUMN public.profiles.bio_video_url IS
'v5.5: URL to a short (30s recommended) unlisted video introduction.
Supported platforms: YouTube, Loom, Vimeo, or any embeddable video URL.
Used in CaaS scoring: +5 points in "Digital Professionalism" bucket.
Displayed on public profile as "Watch 30s Intro" button with react-player modal.
Example: https://www.youtube.com/watch?v=dQw4w9WgXcQ';

-- ===================================================================
-- SECTION 4: VERIFICATION
-- ===================================================================

DO $$
DECLARE
  column_exists BOOLEAN;
  constraint_exists BOOLEAN;
BEGIN
  -- Verify column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'bio_video_url'
  ) INTO column_exists;

  IF NOT column_exists THEN
    RAISE EXCEPTION 'bio_video_url column was not added to profiles table';
  END IF;

  -- Verify constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'bio_video_url'
    AND constraint_name = 'bio_video_url_format'
  ) INTO constraint_exists;

  RAISE NOTICE 'Migration 076 completed successfully';
  RAISE NOTICE 'bio_video_url column added: %', column_exists;
  RAISE NOTICE 'URL format constraint added: %', constraint_exists;
  RAISE NOTICE 'Ready for Credibility Clip feature (CaaS v5.5)';
  RAISE NOTICE 'Tutors can now add 30s intro videos for +5 CaaS points';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
