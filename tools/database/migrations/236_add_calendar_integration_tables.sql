-- ============================================================================
-- Migration 236: Add Calendar Integration Tables (Phase 1 & 2)
-- ============================================================================
-- Purpose: Enable OAuth-based calendar sync with Google Calendar and Outlook
-- Author: AI Architect
-- Date: 2026-02-06
-- Phase: 1 (OAuth & One-Way Sync) + 2 (Reminders)
--
-- Features:
-- 1. Store OAuth connections to Google/Outlook calendars
-- 2. Track synced events with external calendar IDs
-- 3. Enable one-way sync (TutorWise → External Calendar)
-- 4. Support automatic reminders via external calendar
--
-- Tables Created:
-- - calendar_connections: OAuth connections per user
-- - calendar_events: Mapping between bookings and external events
-- ============================================================================

BEGIN;

-- =====================================================================
-- Table: calendar_connections
-- Purpose: Store user's OAuth connections to external calendars
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.calendar_connections (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- User who owns this connection
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Calendar provider
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),

  -- OAuth tokens (encrypted in application layer)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ,

  -- Provider-specific metadata
  calendar_id TEXT, -- External calendar ID (e.g., "primary" for Google)
  email TEXT, -- Email associated with the calendar

  -- Sync preferences
  sync_enabled BOOLEAN DEFAULT true,
  sync_mode TEXT DEFAULT 'one_way' CHECK (sync_mode IN ('one_way', 'two_way')),

  -- Status tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,

  -- Timestamps
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(profile_id, provider) -- One connection per provider per user
);

-- Indexes for calendar_connections
CREATE INDEX idx_calendar_connections_profile_id ON public.calendar_connections(profile_id);
CREATE INDEX idx_calendar_connections_provider ON public.calendar_connections(provider);
CREATE INDEX idx_calendar_connections_status ON public.calendar_connections(status);

-- RLS policies for calendar_connections
ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

-- Users can view their own connections
CREATE POLICY calendar_connections_select_own
  ON public.calendar_connections
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can insert their own connections
CREATE POLICY calendar_connections_insert_own
  ON public.calendar_connections
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Users can update their own connections
CREATE POLICY calendar_connections_update_own
  ON public.calendar_connections
  FOR UPDATE
  USING (auth.uid() = profile_id);

-- Users can delete their own connections
CREATE POLICY calendar_connections_delete_own
  ON public.calendar_connections
  FOR DELETE
  USING (auth.uid() = profile_id);

-- =====================================================================
-- Table: calendar_events
-- Purpose: Track synced events between bookings and external calendars
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.calendar_events (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Foreign keys
  calendar_connection_id UUID NOT NULL REFERENCES public.calendar_connections(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,

  -- External calendar event details
  external_event_id TEXT NOT NULL, -- Event ID from Google/Outlook
  external_calendar_id TEXT, -- Which calendar the event is in

  -- Event snapshot (for reference even if booking changes)
  event_title TEXT,
  event_start TIMESTAMPTZ,
  event_end TIMESTAMPTZ,
  event_description TEXT,

  -- Sync status
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error', 'deleted')),
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(calendar_connection_id, booking_id) -- One event per booking per connection
);

-- Indexes for calendar_events
CREATE INDEX idx_calendar_events_connection_id ON public.calendar_events(calendar_connection_id);
CREATE INDEX idx_calendar_events_booking_id ON public.calendar_events(booking_id);
CREATE INDEX idx_calendar_events_external_event_id ON public.calendar_events(external_event_id);
CREATE INDEX idx_calendar_events_sync_status ON public.calendar_events(sync_status);

-- RLS policies for calendar_events
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Users can view events from their own connections
CREATE POLICY calendar_events_select_own
  ON public.calendar_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.calendar_connections
      WHERE calendar_connections.id = calendar_events.calendar_connection_id
        AND calendar_connections.profile_id = auth.uid()
    )
  );

-- Service role can manage all events (for background sync jobs)
CREATE POLICY calendar_events_service_role_all
  ON public.calendar_events
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================================
-- Updated_at triggers
-- =====================================================================

CREATE TRIGGER update_calendar_connections_updated_at
  BEFORE UPDATE ON public.calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- Comments
-- =====================================================================

COMMENT ON TABLE public.calendar_connections IS
'Phase 1 & 2: Stores OAuth connections to external calendars (Google, Outlook) with encrypted tokens';

COMMENT ON TABLE public.calendar_events IS
'Phase 1 & 2: Maps TutorWise bookings to external calendar events for sync tracking';

COMMENT ON COLUMN public.calendar_connections.access_token IS
'OAuth access token (encrypted at application layer before storage)';

COMMENT ON COLUMN public.calendar_connections.refresh_token IS
'OAuth refresh token (encrypted at application layer before storage)';

COMMENT ON COLUMN public.calendar_connections.sync_mode IS
'Phase 1: one_way (push only), Phase 3: two_way (push + pull availability)';

-- =====================================================================
-- Migration complete
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 236 Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - calendar_connections (OAuth tokens)';
  RAISE NOTICE '  - calendar_events (sync tracking)';
  RAISE NOTICE '';
  RAISE NOTICE 'Phase 1 & 2 Ready:';
  RAISE NOTICE '  ✓ OAuth authentication';
  RAISE NOTICE '  ✓ One-way sync (push bookings)';
  RAISE NOTICE '  ✓ Automatic reminders';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
