-- ===================================================================
-- Migration: 265_create_virtualspace_sessions.sql
-- Purpose: Create VirtualSpace sessions table for standalone + booking modes
-- Created: 2026-02-14
-- Author: Senior Architect
-- Prerequisites: bookings table exists, auth.users exists
-- ===================================================================
-- This migration creates tables to support VirtualSpace dual-mode operation:
-- 1. Standalone mode: Users create ad-hoc whiteboard rooms with invite links
-- 2. Booking mode: Sessions linked to bookings with CaaS integration
-- ===================================================================

-- Create session type enum
DO $$ BEGIN
  CREATE TYPE virtualspace_session_type AS ENUM ('standalone', 'booking', 'free_help');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create session status enum
DO $$ BEGIN
  CREATE TYPE virtualspace_session_status AS ENUM ('active', 'completed', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create participant role enum
DO $$ BEGIN
  CREATE TYPE virtualspace_participant_role AS ENUM ('owner', 'collaborator', 'viewer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ===================================================================
-- Table: virtualspace_sessions
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.virtualspace_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Session type: determines behavior and capabilities
    session_type virtualspace_session_type NOT NULL DEFAULT 'standalone',

    -- Optional booking link (required for booking mode, NULL for standalone)
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,

    -- Session metadata
    title TEXT NOT NULL DEFAULT 'Untitled Session',
    description TEXT,

    -- Owner (creator) of the session
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Session state
    status virtualspace_session_status NOT NULL DEFAULT 'active',

    -- Invite system (standalone mode only, authenticated users only)
    invite_token TEXT UNIQUE,
    invite_expires_at TIMESTAMPTZ,
    max_participants INTEGER DEFAULT 10,

    -- Session artifacts (whiteboard snapshots, etc.)
    artifacts JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,

    -- Activity tracking for 24-hour expiration (standalone only)
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT vs_booking_required_for_booking_type
        CHECK (session_type = 'standalone' OR booking_id IS NOT NULL),
    CONSTRAINT vs_invite_only_for_standalone
        CHECK (session_type = 'standalone' OR invite_token IS NULL)
);

-- Add comments
COMMENT ON TABLE public.virtualspace_sessions IS
'v5.9: VirtualSpace sessions supporting both standalone and booking-linked modes.
Standalone sessions auto-expire after 24 hours of inactivity.';

COMMENT ON COLUMN public.virtualspace_sessions.session_type IS
'standalone: Ad-hoc room with invite link. booking: Linked to a booking with CaaS integration.';

COMMENT ON COLUMN public.virtualspace_sessions.invite_token IS
'Unique token for shareable invite links (standalone mode only).';

COMMENT ON COLUMN public.virtualspace_sessions.last_activity_at IS
'Updated on participant activity. Standalone sessions expire 24h after last activity.';

-- ===================================================================
-- Table: virtualspace_participants
-- ===================================================================
CREATE TABLE IF NOT EXISTS public.virtualspace_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.virtualspace_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Participant info
    display_name TEXT,
    role virtualspace_participant_role NOT NULL DEFAULT 'collaborator',

    -- Timestamps
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,

    -- Unique constraint: one entry per user per session
    CONSTRAINT vs_unique_user_session UNIQUE (session_id, user_id)
);

COMMENT ON TABLE public.virtualspace_participants IS
'v5.9: Tracks participants in VirtualSpace sessions. All participants must be authenticated.';

-- ===================================================================
-- Indexes
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_virtualspace_sessions_owner
ON public.virtualspace_sessions(owner_id);

CREATE INDEX IF NOT EXISTS idx_virtualspace_sessions_booking
ON public.virtualspace_sessions(booking_id) WHERE booking_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_virtualspace_sessions_invite
ON public.virtualspace_sessions(invite_token) WHERE invite_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_virtualspace_sessions_status
ON public.virtualspace_sessions(status);

CREATE INDEX IF NOT EXISTS idx_virtualspace_sessions_expiry
ON public.virtualspace_sessions(last_activity_at, session_type)
WHERE session_type = 'standalone' AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_virtualspace_participants_session
ON public.virtualspace_participants(session_id);

CREATE INDEX IF NOT EXISTS idx_virtualspace_participants_user
ON public.virtualspace_participants(user_id);

-- GIN index for artifacts JSONB queries
CREATE INDEX IF NOT EXISTS idx_virtualspace_sessions_artifacts
ON public.virtualspace_sessions USING GIN (artifacts);

-- ===================================================================
-- Row Level Security
-- ===================================================================
ALTER TABLE public.virtualspace_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtualspace_participants ENABLE ROW LEVEL SECURITY;

-- Sessions: Users can view sessions they own or participate in
CREATE POLICY "Users can view their virtualspace sessions"
ON public.virtualspace_sessions FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.virtualspace_participants
        WHERE session_id = virtualspace_sessions.id
        AND user_id = auth.uid()
    ) OR
    -- Booking mode: booking participants can view
    (session_type = 'booking' AND EXISTS (
        SELECT 1 FROM public.bookings
        WHERE id = virtualspace_sessions.booking_id
        AND (tutor_id = auth.uid() OR student_id = auth.uid())
    ))
);

-- Sessions: Users can create sessions
CREATE POLICY "Users can create virtualspace sessions"
ON public.virtualspace_sessions FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Sessions: Owners can update their sessions
CREATE POLICY "Owners can update virtualspace sessions"
ON public.virtualspace_sessions FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

-- Sessions: Owners can delete their sessions
CREATE POLICY "Owners can delete virtualspace sessions"
ON public.virtualspace_sessions FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Participants: Users can view participants of sessions they're in
CREATE POLICY "Users can view virtualspace participants"
ON public.virtualspace_participants FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.virtualspace_sessions
        WHERE id = virtualspace_participants.session_id
        AND (
            owner_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.virtualspace_participants vp
                WHERE vp.session_id = virtualspace_participants.session_id
                AND vp.user_id = auth.uid()
            )
        )
    )
);

-- Participants: Users can join sessions (insert themselves)
CREATE POLICY "Users can join virtualspace sessions"
ON public.virtualspace_participants FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Participants: Session owners can manage participants
CREATE POLICY "Owners can manage virtualspace participants"
ON public.virtualspace_participants FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.virtualspace_sessions
        WHERE id = virtualspace_participants.session_id
        AND owner_id = auth.uid()
    )
);

-- ===================================================================
-- Trigger: Update updated_at timestamp
-- ===================================================================
CREATE OR REPLACE FUNCTION update_virtualspace_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_virtualspace_sessions_updated_at ON public.virtualspace_sessions;
CREATE TRIGGER trigger_virtualspace_sessions_updated_at
    BEFORE UPDATE ON public.virtualspace_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_virtualspace_session_updated_at();

-- ===================================================================
-- Function: Expire standalone sessions after 24 hours
-- ===================================================================
CREATE OR REPLACE FUNCTION expire_virtualspace_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    UPDATE public.virtualspace_sessions
    SET status = 'expired',
        ended_at = NOW()
    WHERE session_type = 'standalone'
      AND status = 'active'
      AND last_activity_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_virtualspace_sessions() IS
'Marks standalone VirtualSpace sessions as expired after 24 hours of inactivity.
Call via pg_cron hourly: SELECT expire_virtualspace_sessions();';

-- ===================================================================
-- Validation
-- ===================================================================
DO $$
DECLARE
    v_sessions_exists BOOLEAN;
    v_participants_exists BOOLEAN;
    v_policy_count INTEGER;
BEGIN
    -- Check tables exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'virtualspace_sessions'
    ) INTO v_sessions_exists;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'virtualspace_participants'
    ) INTO v_participants_exists;

    -- Count RLS policies
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('virtualspace_sessions', 'virtualspace_participants')
    INTO v_policy_count;

    -- Report status
    RAISE NOTICE 'Migration 265 completed successfully';
    RAISE NOTICE 'virtualspace_sessions table created: %', v_sessions_exists;
    RAISE NOTICE 'virtualspace_participants table created: %', v_participants_exists;
    RAISE NOTICE 'RLS policies created: %', v_policy_count;
    RAISE NOTICE 'Ready for VirtualSpace Dual-Mode (v5.9)';
END $$;
