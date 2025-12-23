-- ===================================================================
-- Migration: 101_drop_old_saved_tables.sql
-- Purpose: Drop deprecated saved_listings and saved_profiles tables
-- Created: 2025-12-09
-- Author: Claude Code
-- ===================================================================
-- This migration drops the old saved_* tables that have been replaced
-- by the wiselists system (migration 100)
-- ===================================================================

-- Drop saved_listings table (CASCADE removes dependent objects)
DROP TABLE IF EXISTS public.saved_listings CASCADE;

-- Drop saved_profiles table (CASCADE removes dependent objects)
DROP TABLE IF EXISTS public.saved_profiles CASCADE;

-- Validation
DO $$
BEGIN
  RAISE NOTICE 'Migration 101 completed successfully';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'Dropped tables:';
  RAISE NOTICE '  - saved_listings';
  RAISE NOTICE '  - saved_profiles';
  RAISE NOTICE '===============================================';
  RAISE NOTICE 'All save functionality now uses wiselists system';
END $$;
