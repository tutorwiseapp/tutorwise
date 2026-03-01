-- ============================================================================
-- Migration: 329 - CAS Workflow Checkpoint Tables (LangGraph Native)
-- ============================================================================
-- Purpose: Document the checkpoint tables created by
--          @langchain/langgraph-checkpoint-postgres.
-- Created: 2026-03-01
--
-- NOTE: The PostgresSaver.setup() method auto-creates and manages these tables:
--   - checkpoints
--   - checkpoint_blobs
--   - checkpoint_writes
--   - checkpoint_migrations
--
-- This migration is documentation-only. The tables are managed by the package.
-- We add RLS policies for security.
-- ============================================================================

-- The PostgresSaver creates tables in the public schema by default.
-- After .setup() runs, we apply RLS to prevent unauthorized access.
-- These policies use DO blocks to handle the case where tables don't exist yet
-- (they'll be created by .setup() at runtime).

DO $$
BEGIN
  -- Only apply RLS if tables exist (created by PostgresSaver.setup())
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkpoints' AND table_schema = 'public') THEN
    ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;

    -- Allow service_role full access (used by the CAS workflow engine)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkpoints' AND policyname = 'Service role access to checkpoints') THEN
      CREATE POLICY "Service role access to checkpoints" ON checkpoints
        FOR ALL USING (auth.role() = 'service_role');
    END IF;

    -- Allow admins to view checkpoints (for debugging)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkpoints' AND policyname = 'Admins can view checkpoints') THEN
      CREATE POLICY "Admins can view checkpoints" ON checkpoints
        FOR SELECT USING (public.is_admin());
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkpoint_blobs' AND table_schema = 'public') THEN
    ALTER TABLE checkpoint_blobs ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkpoint_blobs' AND policyname = 'Service role access to checkpoint_blobs') THEN
      CREATE POLICY "Service role access to checkpoint_blobs" ON checkpoint_blobs
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'checkpoint_writes' AND table_schema = 'public') THEN
    ALTER TABLE checkpoint_writes ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'checkpoint_writes' AND policyname = 'Service role access to checkpoint_writes') THEN
      CREATE POLICY "Service role access to checkpoint_writes" ON checkpoint_writes
        FOR ALL USING (auth.role() = 'service_role');
    END IF;
  END IF;
END $$;

-- ============================================================================
-- Verification
-- ============================================================================
-- After PostgresSaver.setup() runs, verify tables exist:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name LIKE 'checkpoint%' AND table_schema = 'public';
--
-- Check RLS policies:
--   SELECT tablename, policyname FROM pg_policies
--   WHERE tablename LIKE 'checkpoint%';
-- ============================================================================
