-- Migration 418: Sage × VirtualSpace Foundation
-- Phase 1 schema changes: surface tracking and virtualspace link on sage_sessions,
-- sage_config JSONB on virtualspace_sessions.
-- Created: 2026-03-19

-- Add surface column to sage_sessions
ALTER TABLE sage_sessions
  ADD COLUMN IF NOT EXISTS surface TEXT DEFAULT 'chat'
    CHECK (surface IN ('chat', 'virtualspace'));

ALTER TABLE sage_sessions
  ADD COLUMN IF NOT EXISTS virtualspace_session_id UUID
    REFERENCES virtualspace_sessions(id);

-- Add sage_config to virtualspace_sessions
ALTER TABLE virtualspace_sessions
  ADD COLUMN IF NOT EXISTS sage_config JSONB DEFAULT NULL;

-- sage_config shape (for reference):
-- {
--   "enabled": true,
--   "activatedAt": "2026-03-19T10:00:00Z",
--   "activatedBy": "uuid",
--   "profile": "tutor",
--   "subject": "maths",
--   "level": "GCSE",
--   "chargedTo": "student",
--   "quotaOwnerId": "uuid"
-- }
