-- Migration: 053_add_profile_slugs.sql
-- Purpose: Add slug column to profiles table for SEO-friendly URLs (v4.8)
-- Date: 2025-11-10
-- Prerequisites: None
--
-- This migration adds slug support for public profile URLs:
-- - URL format: /public-profile/[id]/[slug]
-- - Slugs are unique, SEO-friendly versions of full_name
-- - IDs remain permanent (301 redirects if slug changes)

BEGIN;

-- Add slug column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create function to generate slug from full_name
CREATE OR REPLACE FUNCTION public.generate_slug(full_name TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Convert to lowercase and replace non-alphanumeric with hyphens
  -- Example: "John Smith" -> "john-smith"
  RETURN lower(regexp_replace(full_name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add unique index to enforce one-slug-per-user
-- This prevents duplicate slugs across all profiles
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_slug
ON public.profiles(slug)
WHERE slug IS NOT NULL;

-- Add constraint to prevent empty slugs
ALTER TABLE public.profiles
ADD CONSTRAINT check_slug_not_empty
CHECK (slug IS NULL OR slug <> '');

-- Backfill slugs for existing users
-- Generate slugs from full_name, handle collisions with numeric suffix
DO $$
DECLARE
  v_profile RECORD;
  v_slug_base TEXT;
  v_slug TEXT;
  v_slug_count INT;
BEGIN
  -- Loop through all profiles without slugs
  FOR v_profile IN
    SELECT id, full_name
    FROM public.profiles
    WHERE slug IS NULL AND full_name IS NOT NULL
  LOOP
    -- Generate base slug
    v_slug_base := generate_slug(v_profile.full_name);
    v_slug := v_slug_base;
    v_slug_count := 1;

    -- Handle collisions by appending numbers (e.g., "john-smith-2")
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE slug = v_slug) LOOP
      v_slug_count := v_slug_count + 1;
      v_slug := v_slug_base || '-' || v_slug_count::TEXT;
    END LOOP;

    -- Update profile with unique slug
    UPDATE public.profiles
    SET slug = v_slug
    WHERE id = v_profile.id;
  END LOOP;
END $$;

COMMIT;

-- Add comments
COMMENT ON COLUMN public.profiles.slug IS
'[v4.8] SEO-friendly URL slug generated from full_name. Used in /public-profile/[id]/[slug] URLs. Must be unique across all profiles.';

COMMENT ON FUNCTION public.generate_slug(TEXT) IS
'[v4.8] Converts a full name to a URL-safe slug (lowercase, hyphens). Example: "John Smith" -> "john-smith"';
