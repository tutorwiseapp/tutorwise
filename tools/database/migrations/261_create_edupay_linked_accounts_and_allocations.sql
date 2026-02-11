-- Migration: 261_create_edupay_linked_accounts_and_allocations.sql
-- Purpose: Create tables for ISA/Savings provider linking and EP allocations
-- Created: 2026-02-11

-- ============================================================================
-- Table: edupay_linked_accounts
-- Stores user's linked external ISA/Savings accounts (mock or real via Open Banking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edupay_linked_accounts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Provider info
  provider_id          TEXT NOT NULL,              -- 'moneybox_isa', 'chip_savings', etc.
  provider_name        TEXT NOT NULL,              -- 'Moneybox ISA'
  provider_type        TEXT NOT NULL CHECK (provider_type IN ('isa', 'savings')),
  provider_logo_url    TEXT,

  -- Account details (masked for display)
  account_name         TEXT,                       -- User's account nickname
  account_last4        TEXT,                       -- Last 4 digits of account number
  interest_rate        DECIMAL(5,2) NOT NULL,      -- Annual interest rate at time of linking

  -- Open Banking integration (for real transfers - future)
  truelayer_account_id TEXT,                       -- TrueLayer account ID when real

  -- Status
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disconnected')),
  is_mock              BOOLEAN DEFAULT TRUE,       -- True for simulated providers

  -- Timestamps
  connected_at         TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at      TIMESTAMPTZ,

  -- Ensure one active account per provider per user
  UNIQUE(user_id, provider_id, status)
);

CREATE INDEX IF NOT EXISTS idx_edupay_linked_accounts_user
  ON edupay_linked_accounts(user_id, status);

ALTER TABLE edupay_linked_accounts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own linked accounts
CREATE POLICY "Users manage own linked accounts"
  ON edupay_linked_accounts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Table: edupay_savings_allocations
-- Tracks EP allocated to ISA/Savings (virtual balance with interest projection)
-- ============================================================================
CREATE TABLE IF NOT EXISTS edupay_savings_allocations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  linked_account_id       UUID NOT NULL REFERENCES edupay_linked_accounts(id) ON DELETE CASCADE,
  conversion_id           UUID REFERENCES edupay_conversions(id),

  -- Amounts
  ep_amount               INTEGER NOT NULL,
  gbp_amount              DECIMAL(10,2) NOT NULL,

  -- Interest tracking
  interest_rate_at_creation DECIMAL(5,2) NOT NULL,   -- Rate locked at allocation time
  projected_interest_12mo   DECIMAL(10,2),           -- Projected interest after 12 months

  -- Status lifecycle: allocated → transferred → withdrawn (to loan) or cancelled
  status                  TEXT NOT NULL DEFAULT 'allocated' CHECK (status IN (
    'allocated',      -- EP converted, tracked in EduPay
    'transferred',    -- Actually moved to external account (future)
    'withdrawn',      -- Withdrawn from savings to pay loan
    'cancelled'       -- Allocation cancelled/reversed
  )),

  -- Timestamps
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  transferred_at          TIMESTAMPTZ,
  withdrawn_at            TIMESTAMPTZ,

  -- Withdrawal tracking (when user pays loan from savings)
  withdrawal_conversion_id UUID REFERENCES edupay_conversions(id)
);

CREATE INDEX IF NOT EXISTS idx_edupay_allocations_user
  ON edupay_savings_allocations(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_edupay_allocations_account
  ON edupay_savings_allocations(linked_account_id, status);

ALTER TABLE edupay_savings_allocations ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own allocations
CREATE POLICY "Users manage own allocations"
  ON edupay_savings_allocations
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Function: Calculate projected interest
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_projected_interest(
  p_principal DECIMAL,
  p_annual_rate DECIMAL,
  p_months INTEGER DEFAULT 12
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Compound monthly: P * (1 + r/12)^n - P
  RETURN ROUND(
    p_principal * POWER(1 + (p_annual_rate / 100) / 12, p_months) - p_principal,
    2
  );
END;
$$;

-- ============================================================================
-- Function: Get user's total savings balance with projected interest
-- ============================================================================
CREATE OR REPLACE FUNCTION get_edupay_savings_summary(p_user_id UUID)
RETURNS TABLE(
  total_gbp_allocated DECIMAL,
  total_projected_interest DECIMAL,
  total_with_interest DECIMAL,
  allocation_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(a.gbp_amount), 0)::DECIMAL AS total_gbp_allocated,
    COALESCE(SUM(
      calculate_projected_interest(
        a.gbp_amount,
        a.interest_rate_at_creation,
        EXTRACT(MONTH FROM AGE(NOW(), a.created_at))::INTEGER + 12
      )
    ), 0)::DECIMAL AS total_projected_interest,
    COALESCE(SUM(a.gbp_amount), 0)::DECIMAL + COALESCE(SUM(
      calculate_projected_interest(
        a.gbp_amount,
        a.interest_rate_at_creation,
        EXTRACT(MONTH FROM AGE(NOW(), a.created_at))::INTEGER + 12
      )
    ), 0)::DECIMAL AS total_with_interest,
    COUNT(*)::INTEGER AS allocation_count
  FROM edupay_savings_allocations a
  WHERE a.user_id = p_user_id
    AND a.status = 'allocated';
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION calculate_projected_interest TO authenticated;
GRANT EXECUTE ON FUNCTION get_edupay_savings_summary TO authenticated;
