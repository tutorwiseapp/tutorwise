-- Migration: 254_create_edupay_wallets.sql
-- Purpose: Create edupay_wallets table for per-user EP balance tracking
-- Created: 2026-02-10

CREATE TABLE IF NOT EXISTS edupay_wallets (
  user_id       UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_ep      INTEGER DEFAULT 0,
  available_ep  INTEGER DEFAULT 0,
  pending_ep    INTEGER DEFAULT 0,
  converted_ep  INTEGER DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE edupay_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own EP wallet"
  ON edupay_wallets FOR SELECT
  USING (auth.uid() = user_id);
