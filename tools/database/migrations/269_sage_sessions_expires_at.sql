-- Migration 269: Add expires_at column to sage_sessions
-- Fixes: "Could not find the 'expires_at' column of 'sage_sessions' in the schema cache"

ALTER TABLE sage_sessions ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '24 hours');
