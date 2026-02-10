-- Migration: 257_create_edupay_loan_profiles_and_conversions.sql
-- Purpose: Create edupay_loan_profiles (user's loan plan) and edupay_conversions (EP → loan payment records)
-- Created: 2026-02-10

-- User's student loan profile for projection calculations
CREATE TABLE IF NOT EXISTS edupay_loan_profiles (
  user_id            UUID PRIMARY KEY REFERENCES profiles(id),
  loan_plan          TEXT CHECK (loan_plan IN ('plan1', 'plan2', 'plan5', 'postgrad')),
  estimated_balance  DECIMAL(10,2),
  annual_salary      DECIMAL(10,2),
  graduation_year    INTEGER,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE edupay_loan_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and write their own loan profile
CREATE POLICY "Users manage own loan profile"
  ON edupay_loan_profiles
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- EP → loan payment conversion records (Phase 3 TrueLayer PISP)
CREATE TABLE IF NOT EXISTS edupay_conversions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES profiles(id),
  ep_amount      INTEGER NOT NULL,
  gbp_amount     DECIMAL(10,2) NOT NULL,
  destination    TEXT CHECK (destination IN ('student_loan', 'isa', 'savings')),
  status         TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  partner        TEXT,        -- 'truelayer' | 'awin' | 'tillo'
  partner_ref    TEXT,        -- partner transaction reference
  requested_at   TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_edupay_conversions_user
  ON edupay_conversions(user_id, requested_at DESC);

ALTER TABLE edupay_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own conversions"
  ON edupay_conversions FOR SELECT
  USING (auth.uid() = user_id);
