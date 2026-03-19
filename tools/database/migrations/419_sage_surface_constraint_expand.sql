-- Migration 419: Expand sage_sessions.surface CHECK constraint
-- Design §15 specifies ('chat', 'virtualspace', 'growth', 'ai_agent') to avoid a future
-- ALTER TABLE when Growth Agent and AI Agent Studio surfaces are logged.
-- The 'chat' default is preserved.
-- Created: 2026-03-19

ALTER TABLE sage_sessions
  DROP CONSTRAINT IF EXISTS sage_sessions_surface_check;

ALTER TABLE sage_sessions
  ADD CONSTRAINT sage_sessions_surface_check
    CHECK (surface IN ('chat', 'virtualspace', 'growth', 'ai_agent'));
