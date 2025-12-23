-- Migration: Create wallet balance helper functions
-- Version: 059
-- Created: 2025-11-11
-- Description: Implements SDD v4.9, Section 3.2 - Helper functions for wallet balance calculations
-- Creates get_available_balance and get_pending_balance functions

BEGIN;

-- =====================================================================
-- Function: get_available_balance
-- =====================================================================
-- Returns the total available balance for a profile
-- Only counts transactions that are 'available' AND past their available_at timestamp

CREATE OR REPLACE FUNCTION public.get_available_balance(
    p_profile_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance NUMERIC := 0;
BEGIN
    -- Sum all available transactions that have passed their clearing period
    SELECT COALESCE(SUM(amount), 0)
    INTO v_balance
    FROM public.transactions
    WHERE profile_id = p_profile_id
      AND status = 'available'
      AND available_at <= NOW();

    RETURN v_balance;
END;
$$;

-- =====================================================================
-- Function: get_pending_balance
-- =====================================================================
-- Returns the total pending balance (in clearing) for a profile

CREATE OR REPLACE FUNCTION public.get_pending_balance(
    p_profile_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance NUMERIC := 0;
BEGIN
    -- Sum all transactions in clearing status
    SELECT COALESCE(SUM(amount), 0)
    INTO v_balance
    FROM public.transactions
    WHERE profile_id = p_profile_id
      AND status = 'clearing';

    RETURN v_balance;
END;
$$;

-- =====================================================================
-- Function: get_total_earnings
-- =====================================================================
-- Returns lifetime earnings (available + pending + paid_out)

CREATE OR REPLACE FUNCTION public.get_total_earnings(
    p_profile_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total NUMERIC := 0;
BEGIN
    -- Sum all positive transactions (earnings only, not debits)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total
    FROM public.transactions
    WHERE profile_id = p_profile_id
      AND amount > 0
      AND status IN ('clearing', 'available', 'paid_out');

    RETURN v_total;
END;
$$;

-- =====================================================================
-- Add comments
-- =====================================================================

COMMENT ON FUNCTION public.get_available_balance(UUID) IS
'Returns the available balance for a profile (funds ready for payout)';

COMMENT ON FUNCTION public.get_pending_balance(UUID) IS
'Returns the pending balance for a profile (funds in clearing period)';

COMMENT ON FUNCTION public.get_total_earnings(UUID) IS
'Returns lifetime earnings for a profile (all positive transactions)';

COMMIT;
