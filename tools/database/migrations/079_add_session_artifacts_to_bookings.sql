-- ===================================================================
-- Migration: 079_add_session_artifacts_to_bookings.sql
-- Purpose: Add session_artifacts column for WiseSpace (v5.8)
-- Created: 2025-11-15
-- Author: Senior Architect
-- Prerequisites: bookings table exists
-- ===================================================================
-- This migration adds a JSONB column to store session artifacts like
-- whiteboard snapshots, session recordings, and other proof-of-work data.
-- This supports the WiseSpace virtual classroom feature (v5.8).
-- ===================================================================

-- Add session_artifacts column (JSONB for flexible artifact storage)
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS session_artifacts JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.bookings.session_artifacts IS
'v5.8: Stores session artifacts from WiseSpace (whiteboard snapshots, recordings).
Example: { "whiteboard_snapshot_url": "https://...", "session_notes": "..." }';

-- Create GIN index for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_bookings_session_artifacts
ON public.bookings USING GIN (session_artifacts);

-- Validation
DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_index_exists BOOLEAN;
BEGIN
  -- Check if column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bookings'
    AND column_name = 'session_artifacts'
  ) INTO v_column_exists;

  -- Check if index exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'bookings'
    AND indexname = 'idx_bookings_session_artifacts'
  ) INTO v_index_exists;

  -- Report status
  RAISE NOTICE 'Migration 079 completed successfully';
  RAISE NOTICE 'session_artifacts column added: %', v_column_exists;
  RAISE NOTICE 'GIN index created: %', v_index_exists;
  RAISE NOTICE 'Ready for WiseSpace (v5.8) - Virtual Classroom';
END $$;
