-- ===================================================================
-- Migration: 086_add_free_help_columns.sql
-- Purpose: Add available_free_help columns for Free Help Now (v5.9)
-- Created: 2025-11-16
-- Author: Senior Architect
-- Prerequisites: profiles, caas_scores tables exist
-- ===================================================================
-- This migration adds the availability flag for the "Free Help Now" feature,
-- allowing tutors to offer free 30-minute sessions in exchange for CaaS reputation.
-- ===================================================================

-- Add available_free_help to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS available_free_help BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.available_free_help IS
'v5.9: Indicates if tutor is currently offering free help sessions.
Managed by real-time presence system with Redis heartbeat.
When true, tutor appears at top of marketplace with "Free Help Now" badge.';

-- Create index for fast marketplace queries
CREATE INDEX IF NOT EXISTS idx_profiles_available_free_help
ON public.profiles(available_free_help)
WHERE available_free_help = true;

-- Add available_free_help to caas_scores table for fast marketplace sorting
ALTER TABLE public.caas_scores
ADD COLUMN IF NOT EXISTS available_free_help BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.caas_scores.available_free_help IS
'v5.9: Denormalized flag from profiles for high-performance marketplace queries.
Updated by presence API when tutor toggles free help availability.';

-- Create index for marketplace search performance
CREATE INDEX IF NOT EXISTS idx_caas_scores_available_free_help
ON public.caas_scores(available_free_help, total_score DESC)
WHERE available_free_help = true;

-- Validation
DO $$
DECLARE
  v_profiles_column_exists BOOLEAN;
  v_caas_column_exists BOOLEAN;
  v_profiles_index_exists BOOLEAN;
  v_caas_index_exists BOOLEAN;
BEGIN
  -- Check if profiles column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'available_free_help'
  ) INTO v_profiles_column_exists;

  -- Check if caas_scores column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'caas_scores'
    AND column_name = 'available_free_help'
  ) INTO v_caas_column_exists;

  -- Check if profiles index exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND indexname = 'idx_profiles_available_free_help'
  ) INTO v_profiles_index_exists;

  -- Check if caas_scores index exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'caas_scores'
    AND indexname = 'idx_caas_scores_available_free_help'
  ) INTO v_caas_index_exists;

  -- Report status
  RAISE NOTICE 'Migration 086 completed successfully';
  RAISE NOTICE 'profiles.available_free_help column added: %', v_profiles_column_exists;
  RAISE NOTICE 'caas_scores.available_free_help column added: %', v_caas_column_exists;
  RAISE NOTICE 'Profiles index created: %', v_profiles_index_exists;
  RAISE NOTICE 'CaaS index created: %', v_caas_index_exists;
  RAISE NOTICE 'Ready for Free Help Now presence system (v5.9)';
  RAISE NOTICE 'Integration points: /api/presence/free-help/* endpoints';
END $$;
