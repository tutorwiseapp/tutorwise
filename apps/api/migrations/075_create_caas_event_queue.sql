-- ===================================================================
-- Migration: 075_create_caas_event_queue.sql
-- Purpose: Create caas_recalculation_queue for CaaS Engine v5.5
-- Created: 2025-11-15
-- Author: Senior Architect
-- Prerequisites: profiles table exists, caas_scores table exists (074)
-- ===================================================================
-- This migration creates the event queue table for CaaS score recalculations.
-- The queue decouples user actions from the heavy score calculation process.
-- Processed by POST /api/caas-worker every 10 minutes (Pattern 2 - Internal Worker).
-- ===================================================================

-- ===================================================================
-- SECTION 1: CREATE CAAS_RECALCULATION_QUEUE TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.caas_recalculation_queue (
  -- Auto-incrementing ID for queue ordering
  id BIGSERIAL PRIMARY KEY,

  -- The profile that needs score recalculation
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- When this recalculation was queued
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensures we don't queue the same user multiple times
  -- If a user is already in the queue, subsequent events are ignored
  UNIQUE(profile_id)
);

-- ===================================================================
-- SECTION 2: CREATE INDEXES FOR PERFORMANCE
-- ===================================================================

-- Index for worker to fetch oldest jobs first (FIFO order)
CREATE INDEX IF NOT EXISTS idx_caas_queue_created_at
ON public.caas_recalculation_queue(created_at ASC);

-- Index for checking if profile is already queued
CREATE INDEX IF NOT EXISTS idx_caas_queue_profile_id
ON public.caas_recalculation_queue(profile_id);

-- ===================================================================
-- SECTION 3: ROW LEVEL SECURITY POLICIES
-- ===================================================================

-- Enable RLS on the table
ALTER TABLE public.caas_recalculation_queue ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can queue their own recalculation (for future manual "Refresh Score" button)
CREATE POLICY "Users can queue own recalculation"
ON public.caas_recalculation_queue FOR INSERT
WITH CHECK (profile_id = auth.uid());

-- Policy 2: Users can view if they're in the queue (for UI feedback)
CREATE POLICY "Users can view own queue status"
ON public.caas_recalculation_queue FOR SELECT
USING (profile_id = auth.uid());

-- Policy 3: Only service role can read/delete from queue (for caas-worker)
-- The worker needs to SELECT jobs and DELETE processed jobs
CREATE POLICY "Service role manages queue"
ON public.caas_recalculation_queue FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- ===================================================================
-- SECTION 4: ADD DOCUMENTATION COMMENTS
-- ===================================================================

COMMENT ON TABLE public.caas_recalculation_queue IS
'v5.5: Queue for CaaS score recalculation requests.
Populated automatically by database triggers when relevant data changes (reviews, profile updates, etc).
Processed by POST /api/caas-worker every 10 minutes (batch size: 100).
Uses UNIQUE constraint to prevent duplicate queue entries for the same profile.';

COMMENT ON COLUMN public.caas_recalculation_queue.profile_id IS
'The profile that needs their CaaS score recalculated.
ON DELETE CASCADE ensures queue entries are cleaned up when profiles are deleted.';

COMMENT ON COLUMN public.caas_recalculation_queue.created_at IS
'Timestamp when this recalculation was requested.
Worker processes queue in FIFO order (oldest first).';

-- ===================================================================
-- SECTION 5: VERIFICATION
-- ===================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  index_count INTEGER;
  policy_count INTEGER;
  constraint_exists BOOLEAN;
BEGIN
  -- Verify table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'caas_recalculation_queue'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'caas_recalculation_queue table was not created';
  END IF;

  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'caas_recalculation_queue'
  AND schemaname = 'public';

  -- Count RLS policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'caas_recalculation_queue'
  AND schemaname = 'public';

  -- Verify UNIQUE constraint on profile_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
    AND table_name = 'caas_recalculation_queue'
    AND constraint_type = 'UNIQUE'
  ) INTO constraint_exists;

  RAISE NOTICE 'Migration 075 completed successfully';
  RAISE NOTICE 'caas_recalculation_queue table created: %', table_exists;
  RAISE NOTICE 'Indexes created: %', index_count;
  RAISE NOTICE 'RLS policies created: %', policy_count;
  RAISE NOTICE 'UNIQUE constraint on profile_id: %', constraint_exists;
  RAISE NOTICE 'Ready for event-driven CaaS score updates';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
