-- ============================================================================
-- Migration 109: Update Payment RPC to Snapshot Transaction Context
-- ============================================================================
-- Purpose: Update handle_successful_payment RPC to snapshot booking context
-- Author: AI Architect
-- Date: 2025-12-10
-- Related: Migration 107 (Transaction Context Fields)
--
-- Problem:
-- - Migration 107 added 6 context fields to transactions table
-- - The handle_successful_payment RPC creates transactions but doesn't populate context
-- - Need to snapshot booking data at transaction creation time
--
-- Solution:
-- Update handle_successful_payment RPC to:
-- 1. Fetch additional booking context (subjects, levels, location_type)
-- 2. Fetch tutor and client names for display
-- 3. Pass context fields when creating transactions
--
-- Benefits:
-- 1. Transactions preserve service context even if booking deleted
-- 2. Better UX in transaction history (shows service details)
-- 3. Analytics: Revenue by subject without joins
-- 4. Consistent with snapshot pattern across platform
-- ============================================================================

BEGIN;

-- =====================================================================
-- Drop existing function
-- =====================================================================
DROP FUNCTION IF EXISTS public.handle_successful_payment(UUID, TEXT);

-- =====================================================================
-- Create updated handle_successful_payment function with context
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_successful_payment(
    p_booking_id UUID,
    p_stripe_checkout_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_new_commission_tx_id UUID;
  v_platform_fee_percent DECIMAL := 0.10; -- 10%
  v_referral_commission_percent DECIMAL := 0.10; -- 10% lifetime commission
  v_agent_commission_percent DECIMAL := 0.20; -- 20% for agent-led bookings
  v_tutor_payout_amount DECIMAL;
  v_referral_commission_amount DECIMAL;
  v_agent_commission_amount DECIMAL;
  v_platform_fee_amount DECIMAL;
  v_remaining_amount DECIMAL;
  v_referring_agent_id UUID;
  v_available_timestamp TIMESTAMPTZ;
  v_clearing_days INT := 7; -- Default: 7 days for new sellers

  -- Migration 109: Context fields for transactions
  v_tutor_name TEXT;
  v_client_name TEXT;
BEGIN
  -- ======================================
  -- STEP 1: Idempotency Check
  -- ======================================
  IF p_stripe_checkout_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.bookings
      WHERE stripe_checkout_id = p_stripe_checkout_id
        AND payment_status = 'Paid'
    ) THEN
      RETURN;
    END IF;
  END IF;

  -- ======================================
  -- STEP 2: Fetch and lock the booking with context (Migration 109)
  -- ======================================
  SELECT
    b.*,
    t.full_name as tutor_full_name,
    c.full_name as client_full_name
  INTO v_booking
  FROM public.bookings b
  LEFT JOIN public.profiles t ON b.tutor_id = t.id
  LEFT JOIN public.profiles c ON b.client_id = c.id
  WHERE b.id = p_booking_id
  FOR UPDATE; -- Lock the row to prevent race conditions

  -- Safety check: If not found or already paid, exit
  IF NOT FOUND OR v_booking.payment_status != 'Pending' THEN
    RETURN;
  END IF;

  -- Migration 109: Store names for transaction context
  v_tutor_name := v_booking.tutor_full_name;
  v_client_name := v_booking.client_full_name;

  -- ======================================
  -- STEP 3: Update booking with checkout ID (if provided)
  -- ======================================
  IF p_stripe_checkout_id IS NOT NULL THEN
    UPDATE public.bookings
    SET stripe_checkout_id = p_stripe_checkout_id
    WHERE id = p_booking_id;
  END IF;

  -- ======================================
  -- STEP 4: Calculate clearing period
  -- ======================================
  v_available_timestamp := (v_booking.session_start_time + (v_booking.session_duration || ' minutes')::INTERVAL) + (v_clearing_days || ' days')::INTERVAL;

  -- ================================================================
  -- STEP 5: Create the client's 'Booking Payment' transaction (T-TYPE-1)
  -- Migration 109: Now includes context fields
  -- ================================================================
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount, available_at,
     service_name, subjects, session_date, location_type, tutor_name, client_name)
  VALUES
    (v_booking.client_id, p_booking_id, 'Booking Payment',
     'Payment for ' || v_booking.service_name,
     'paid_out', -v_booking.amount, NOW(),
     -- Context fields (Migration 109)
     v_booking.service_name,
     v_booking.subjects,
     v_booking.session_start_time,
     v_booking.location_type,
     v_tutor_name,
     v_client_name);

  -- ============================================
  -- STEP 6: Calculate commission splits
  -- ============================================
  v_remaining_amount := v_booking.amount;
  v_platform_fee_amount := v_booking.amount * v_platform_fee_percent;
  v_remaining_amount := v_remaining_amount - v_platform_fee_amount;

  -- Get client's referring agent (lifetime attribution)
  SELECT referred_by_agent_id INTO v_referring_agent_id
  FROM public.profiles
  WHERE id = v_booking.client_id;

  -- ==========================================
  -- STEP 7: Check for Referring Agent Commission (10%)
  -- Migration 109: Now includes context fields
  -- ==========================================
  IF v_referring_agent_id IS NOT NULL
     AND v_referring_agent_id NOT IN (v_booking.agent_profile_id, v_booking.tutor_id) THEN

    v_referral_commission_amount := v_booking.amount * v_referral_commission_percent;
    v_remaining_amount := v_remaining_amount - v_referral_commission_amount;

    INSERT INTO public.transactions
      (profile_id, booking_id, type, description, status, amount, available_at,
       service_name, subjects, session_date, location_type, tutor_name, client_name)
    VALUES
      (v_referring_agent_id, p_booking_id, 'Referral Commission',
       'Referral commission from ' || v_booking.service_name,
       'clearing', v_referral_commission_amount, v_available_timestamp,
       -- Context fields (Migration 109)
       v_booking.service_name,
       v_booking.subjects,
       v_booking.session_start_time,
       v_booking.location_type,
       v_tutor_name,
       v_client_name)
    RETURNING id INTO v_new_commission_tx_id;

  END IF;

  -- ==========================================
  -- STEP 8: Check for Agent-Led Booking (20%)
  -- Migration 109: Now includes context fields
  -- ==========================================
  IF v_booking.agent_profile_id IS NOT NULL THEN

    v_agent_commission_amount := v_booking.amount * v_agent_commission_percent;
    v_remaining_amount := v_remaining_amount - v_agent_commission_amount;

    INSERT INTO public.transactions
      (profile_id, booking_id, type, description, status, amount, available_at,
       service_name, subjects, session_date, location_type, tutor_name, client_name)
    VALUES
      (v_booking.agent_profile_id, p_booking_id, 'Agent Commission',
       'Agent commission from ' || v_booking.service_name,
       'clearing', v_agent_commission_amount, v_available_timestamp,
       -- Context fields (Migration 109)
       v_booking.service_name,
       v_booking.subjects,
       v_booking.session_start_time,
       v_booking.location_type,
       v_tutor_name,
       v_client_name);

  END IF;

  -- ========================================================
  -- STEP 9: Create the tutor's 'Tutoring Payout' transaction
  -- Migration 109: Now includes context fields
  -- ========================================================
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount, available_at,
     service_name, subjects, session_date, location_type, tutor_name, client_name)
  VALUES
    (v_booking.tutor_id, p_booking_id, 'Tutoring Payout',
     'Payout for ' || v_booking.service_name,
     'clearing', v_remaining_amount, v_available_timestamp,
     -- Context fields (Migration 109)
     v_booking.service_name,
     v_booking.subjects,
     v_booking.session_start_time,
     v_booking.location_type,
     v_tutor_name,
     v_client_name);

  -- ============================================================
  -- STEP 10: Create the 'Platform Fee' transaction
  -- Migration 109: Now includes context fields
  -- ============================================================
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount, available_at,
     service_name, subjects, session_date, location_type, tutor_name, client_name)
  VALUES
    (NULL, p_booking_id, 'Platform Fee',
     'Platform fee for ' || v_booking.service_name,
     'paid_out', v_platform_fee_amount, NOW(),
     -- Context fields (Migration 109)
     v_booking.service_name,
     v_booking.subjects,
     v_booking.session_start_time,
     v_booking.location_type,
     v_tutor_name,
     v_client_name);

  -- ==============================
  -- STEP 11: Update the booking status
  -- ==============================
  UPDATE public.bookings
  SET payment_status = 'Paid'
  WHERE id = p_booking_id;

  -- =================================================================
  -- STEP 12: Update the lead-gen 'referrals' table (first conversion only)
  -- =================================================================
  IF v_new_commission_tx_id IS NOT NULL THEN
    UPDATE public.referrals
    SET
      status = 'Converted',
      booking_id = p_booking_id,
      transaction_id = v_new_commission_tx_id,
      converted_at = NOW()
    WHERE referred_profile_id = v_booking.client_id
      AND status != 'Converted';
  END IF;

END;
$$;

-- =====================================================================
-- Add comments
-- =====================================================================

COMMENT ON FUNCTION public.handle_successful_payment(UUID, TEXT) IS
'v4.9 + Migration 109: Atomically processes payment splits with idempotency, clearing periods, 3-way/4-way splits, and transaction context snapshotting';

-- =====================================================================
-- Show migration results
-- =====================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 109 Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Updated handle_successful_payment RPC';
  RAISE NOTICE 'Now snapshots 6 context fields:';
  RAISE NOTICE '  - service_name';
  RAISE NOTICE '  - subjects';
  RAISE NOTICE '  - session_date';
  RAISE NOTICE '  - location_type';
  RAISE NOTICE '  - tutor_name';
  RAISE NOTICE '  - client_name';
  RAISE NOTICE '========================================';
END $$;

COMMIT;
