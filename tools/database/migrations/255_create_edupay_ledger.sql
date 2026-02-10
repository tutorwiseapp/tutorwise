-- Migration: 255_create_edupay_ledger.sql
-- Purpose: Create edupay_ledger table — immutable EP transaction history
-- Mirrors the transactions table pattern: no deletes, reversals via offsetting entries only
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS edupay_ledger (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_id     UUID REFERENCES edupay_events(id),
  ep_amount    INTEGER NOT NULL,
  event_type   TEXT,
  type         TEXT CHECK (type IN ('earn', 'convert', 'expire', 'bonus')),
  status       TEXT CHECK (status IN ('pending', 'available', 'processed')),
  available_at TIMESTAMPTZ,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
  -- Immutable — no deletes, reversals via offsetting entries only
);

CREATE INDEX IF NOT EXISTS idx_edupay_ledger_user
  ON edupay_ledger(user_id, created_at DESC);

-- Partial index for efficient cron clearing query
CREATE INDEX IF NOT EXISTS idx_edupay_ledger_pending
  ON edupay_ledger(available_at)
  WHERE status = 'pending';

ALTER TABLE edupay_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own EP ledger"
  ON edupay_ledger FOR SELECT
  USING (auth.uid() = user_id);
