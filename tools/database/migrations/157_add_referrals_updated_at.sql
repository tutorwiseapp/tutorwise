-- =====================================================
-- Migration 157: Add updated_at to referrals table
-- Created: 2026-01-02
-- Purpose: Add updated_at column for tracking referral modifications
-- =====================================================

-- Add updated_at column to referrals table
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_referrals_updated_at ON public.referrals(updated_at DESC);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_referrals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_referrals_updated_at ON public.referrals;
CREATE TRIGGER trg_update_referrals_updated_at
    BEFORE UPDATE ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION update_referrals_updated_at();

COMMENT ON COLUMN public.referrals.updated_at IS 'Timestamp of last modification';

-- =====================================================
-- Migration Complete
-- =====================================================
