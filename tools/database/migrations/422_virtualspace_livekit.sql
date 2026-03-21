-- Migration 422: Add LiveKit room name to virtualspace_sessions
-- Enables in-app video via LiveKit (replaces Jitsi external link)

ALTER TABLE virtualspace_sessions
  ADD COLUMN IF NOT EXISTS livekit_room_name TEXT GENERATED ALWAYS AS (
    'tutorwise-' || id
  ) STORED;
