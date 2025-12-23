-- ===================================================================
-- Migration: 061_add_profile_graph_v4_6.sql
-- Purpose: Unified Profile Graph Architecture (v4.6)
-- Created: 2025-11-12
-- Author: Senior Architect
-- ===================================================================
-- This migration implements the Unified Relationship Model that consolidates
-- all user-to-user links (Social, Guardian, Booking, Agent) into a single
-- profile_graph table using relationship_type enums.
--
-- This replaces the isolated 'connections' table and prepares the foundation
-- for student-onboarding-solution-design-v5.0
-- ===================================================================

-- ===================================================================
-- SECTION 1: CREATE ENUM TYPES
-- ===================================================================

-- Creates the 'relationship_type' enum
-- Defines the types of relationships between profiles
CREATE TYPE relationship_type AS ENUM (
  'GUARDIAN',         -- A Client (Parent) has authority over a Student
  'SOCIAL',          -- A mutual "Social Link" (replaces 'connections')
  'BOOKING',         -- A Client (Payer) has a completed booking with a Tutor
  'AGENT_DELEGATION', -- A Tutor delegates commission to an Agent
  'AGENT_REFERRAL'   -- An Agent referred a Client
);

COMMENT ON TYPE relationship_type IS 'v4.6: Defines the type of relationship between two profiles';

-- Creates the 'relationship_status' enum
-- Defines the lifecycle state of a relationship
CREATE TYPE relationship_status AS ENUM (
  'PENDING',   -- Awaiting acceptance (e.g., for a 'SOCIAL' link request)
  'ACTIVE',    -- The link is current and valid
  'BLOCKED',   -- One user has blocked the other
  'COMPLETED'  -- The link represents a past event (e.g., 'BOOKING')
);

COMMENT ON TYPE relationship_status IS 'v4.6: Defines the lifecycle state of a relationship';

-- ===================================================================
-- SECTION 2: CREATE PROFILE_GRAPH TABLE
-- ===================================================================

-- This table consolidates all user-to-user links
-- Replaces: connections, client_student_links (planned), and implicit booking links
CREATE TABLE IF NOT EXISTS public.profile_graph (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The 'from' side of the relationship (the initiator/source)
  source_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- The 'to' side of the relationship (the recipient/target)
  target_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- The type of relationship (the "what")
  relationship_type relationship_type NOT NULL,

  -- The state of the relationship (the "when" or "if")
  status relationship_status NOT NULL DEFAULT 'ACTIVE',

  -- Contextual data about the link (JSON for flexibility)
  -- Examples:
  --   BOOKING: {"booking_id": "...", "student_id": "...", "review_session_id": "..."}
  --   GUARDIAN: {"student_email": "...", "invitation_sent_at": "..."}
  --   SOCIAL: {"mutual": true, "connected_at": "..."}
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Business Logic Constraints
  -- Prevent users from linking to themselves
  CONSTRAINT "no_self_links" CHECK (source_profile_id <> target_profile_id),

  -- Ensure a unique relationship path
  -- A Client can only have one 'GUARDIAN' link to a specific Student
  -- A User can only have one 'SOCIAL' link to another specific User
  CONSTRAINT "unique_relationship_path" UNIQUE (source_profile_id, target_profile_id, relationship_type)
);

-- Add table comment
COMMENT ON TABLE public.profile_graph IS 'v4.6: Unified relationship table. Consolidates Social, Guardian, and Booking links.';

-- Add column comments
COMMENT ON COLUMN public.profile_graph.source_profile_id IS 'The profile ID of the relationship initiator/source';
COMMENT ON COLUMN public.profile_graph.target_profile_id IS 'The profile ID of the relationship recipient/target';
COMMENT ON COLUMN public.profile_graph.relationship_type IS 'The type of relationship (GUARDIAN, SOCIAL, BOOKING, AGENT_DELEGATION, AGENT_REFERRAL)';
COMMENT ON COLUMN public.profile_graph.status IS 'The lifecycle state of the relationship (PENDING, ACTIVE, BLOCKED, COMPLETED)';
COMMENT ON COLUMN public.profile_graph.metadata IS 'Flexible JSON storage for relationship-specific context data';

-- ===================================================================
-- SECTION 3: CREATE PERFORMANCE INDEXES
-- ===================================================================

-- Index for queries filtering by source profile
-- Use case: "Show me all my social links" or "Show me my students"
CREATE INDEX "idx_profile_graph_source_id" ON public.profile_graph(source_profile_id);

-- Index for queries filtering by target profile
-- Use case: "Who are my guardians?" or "Who has booked me?"
CREATE INDEX "idx_profile_graph_target_id" ON public.profile_graph(target_profile_id);

-- Index for queries filtering by relationship type
-- Use case: "Show me all GUARDIAN relationships" or "Show me all BOOKING links"
CREATE INDEX "idx_profile_graph_type" ON public.profile_graph(relationship_type);

-- Index for queries filtering by status
-- Use case: "Show me all PENDING connection requests"
CREATE INDEX "idx_profile_graph_status" ON public.profile_graph(status);

-- Composite index for the most common query pattern
-- Use case: "Show me all my ACTIVE SOCIAL links"
CREATE INDEX "idx_profile_graph_composite" ON public.profile_graph(source_profile_id, relationship_type, status);

-- Index for bidirectional lookups
-- Use case: "Show me all my connections (regardless of who initiated)"
CREATE INDEX "idx_profile_graph_bidirectional" ON public.profile_graph(source_profile_id, target_profile_id);

-- ===================================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on the profile_graph table
ALTER TABLE public.profile_graph ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view relationships they're part of
CREATE POLICY "Users can view their relationships"
  ON public.profile_graph FOR SELECT
  USING (
    auth.uid() = source_profile_id
    OR
    auth.uid() = target_profile_id
  );

-- Policy: Users can create relationships where they are the source
CREATE POLICY "Users can create relationships"
  ON public.profile_graph FOR INSERT
  WITH CHECK (auth.uid() = source_profile_id);

-- Policy: Users can update relationships they're part of
-- Note: Allows both source and target to update (e.g., target can accept/reject)
CREATE POLICY "Users can update their relationships"
  ON public.profile_graph FOR UPDATE
  USING (
    auth.uid() = source_profile_id
    OR
    auth.uid() = target_profile_id
  );

-- Policy: Only the source can delete relationships
CREATE POLICY "Users can delete relationships they created"
  ON public.profile_graph FOR DELETE
  USING (auth.uid() = source_profile_id);

-- ===================================================================
-- SECTION 5: HELPER FUNCTION FOR UPDATED_AT TRIGGER
-- ===================================================================

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_profile_graph_updated_at
  BEFORE UPDATE ON public.profile_graph
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================================
-- SECTION 6: VALIDATION & VERIFICATION
-- ===================================================================

-- Verify table structure
DO $$
BEGIN
  -- Check that the table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'profile_graph'
  ) THEN
    RAISE EXCEPTION 'Table profile_graph was not created successfully';
  END IF;

  -- Check that enums exist
  IF NOT EXISTS (
    SELECT FROM pg_type
    WHERE typname = 'relationship_type'
  ) THEN
    RAISE EXCEPTION 'Enum relationship_type was not created successfully';
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_type
    WHERE typname = 'relationship_status'
  ) THEN
    RAISE EXCEPTION 'Enum relationship_status was not created successfully';
  END IF;

  RAISE NOTICE 'Migration 061_add_profile_graph_v4_6 completed successfully';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
