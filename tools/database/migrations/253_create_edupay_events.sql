-- Migration: 253_create_edupay_events.sql
-- Purpose: Create edupay_events table for EP-earning event log with idempotency
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS edupay_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type       TEXT NOT NULL,
  source_system    TEXT NOT NULL,  -- 'tutorwise' | 'awin' | 'tillo' | 'caas'
  value_gbp        DECIMAL(10,2),
  ep_earned        INTEGER,
  idempotency_key  TEXT UNIQUE,    -- Reuses stripe_checkout_id for booking events
  metadata         JSONB,
  processed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edupay_events_user
  ON edupay_events(user_id, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_edupay_events_type
  ON edupay_events(event_type, processed_at DESC);

ALTER TABLE edupay_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own EP events"
  ON edupay_events FOR SELECT
  USING (auth.uid() = user_id);
