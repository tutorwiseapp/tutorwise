-- Migration: Update payment webhook RPC for v4.9 features
-- Version: 060
-- Created: 2025-11-11
-- Description: Implements SDD v4.9, Section 4.0 - 3-Way & 4-Way Payment Splits
-- Refactors handle_successful_payment to support:
-- 1. Idempotency check using stripe_checkout_id
-- 2. Dynamic clearing periods based on service completion
-- 3. Agent-led bookings (3-way split: Platform/Agent/Tutor)
-- 4. Referred + Agent-led bookings (4-way split: Platform/Agent/Referring Agent/Tutor)

BEGIN;

-- =====================================================================
-- Drop existing function
-- =====================================================================
DROP FUNCTION IF EXISTS public.handle_successful_payment(UUID);

-- =====================================================================
-- Create updated handle_successful_payment function
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
BEGIN
  -- ======================================
  -- STEP 1: Idempotency Check
  -- ======================================
  -- If stripe_checkout_id is provided, check if we've already processed this
  IF p_stripe_checkout_id IS NOT NULL THEN
    -- Check if a booking with this checkout ID already exists
    IF EXISTS (
      SELECT 1 FROM public.bookings
      WHERE stripe_checkout_id = p_stripe_checkout_id
        AND payment_status = 'Paid'
    ) THEN
      -- Already processed, exit silently
      RETURN;
    END IF;
  END IF;

  -- ======================================
  -- STEP 2: Fetch and lock the booking
  -- ======================================
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE; -- Lock the row to prevent race conditions

  -- Safety check: If not found or already paid, exit
  IF NOT FOUND OR v_booking.payment_status != 'Pending' THEN
    RETURN;
  END IF;

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
  -- TODO: In future, adjust clearing days based on seller trust level
  -- For now: Use service_end_time + 7 days for all sellers
  v_available_timestamp := (v_booking.session_start_time + (v_booking.session_duration || ' minutes')::INTERVAL) + (v_clearing_days || ' days')::INTERVAL;

  -- ================================================================
  -- STEP 5: Create the client's 'Booking Payment' transaction (T-TYPE-1)
  -- ================================================================
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount, available_at)
  VALUES
    (v_booking.client_id, p_booking_id, 'Booking Payment', 'Payment for ' || v_booking.service_name, 'paid_out', -v_booking.amount, NOW());

  -- ============================================
  -- STEP 6: Calculate commission splits
  -- ============================================
  v_remaining_amount := v_booking.amount;

  -- Calculate platform fee (always 10%)
  v_platform_fee_amount := v_booking.amount * v_platform_fee_percent;
  v_remaining_amount := v_remaining_amount - v_platform_fee_amount;

  -- Get client's referring agent (lifetime attribution)
  SELECT referred_by_profile_id INTO v_referring_agent_id
  FROM public.profiles
  WHERE id = v_booking.client_id;

  -- ==========================================
  -- STEP 7: Check for Referring Agent Commission (10%)
  -- ==========================================
  -- Only pay referral commission if:
  -- 1. Client was referred by someone
  -- 2. The referring agent is NOT the booking agent or tutor (prevent double-dipping)
  IF v_referring_agent_id IS NOT NULL
     AND v_referring_agent_id NOT IN (v_booking.agent_id, v_booking.tutor_id) THEN

    v_referral_commission_amount := v_booking.amount * v_referral_commission_percent;
    v_remaining_amount := v_remaining_amount - v_referral_commission_amount;

    -- Create Referring Agent's commission transaction
    INSERT INTO public.transactions
      (profile_id, booking_id, type, description, status, amount, available_at)
    VALUES
      (v_referring_agent_id, p_booking_id, 'Referral Commission',
       'Referral commission from ' || v_booking.service_name,
       'clearing', v_referral_commission_amount, v_available_timestamp)
    RETURNING id INTO v_new_commission_tx_id;

  END IF;

  -- ==========================================
  -- STEP 8: Check for Agent-Led Booking (20%)
  -- ==========================================
  -- If this is an agent-led booking (agent_id is set)
  IF v_booking.agent_id IS NOT NULL THEN

    v_agent_commission_amount := v_booking.amount * v_agent_commission_percent;
    v_remaining_amount := v_remaining_amount - v_agent_commission_amount;

    -- Create Agent's commission transaction
    INSERT INTO public.transactions
      (profile_id, booking_id, type, description, status, amount, available_at)
    VALUES
      (v_booking.agent_id, p_booking_id, 'Agent Commission',
       'Agent commission from ' || v_booking.service_name,
       'clearing', v_agent_commission_amount, v_available_timestamp);

  END IF;

  -- ========================================================
  -- STEP 9: Create the tutor's 'Tutoring Payout' transaction
  -- ========================================================
  -- Tutor gets whatever remains after all other splits
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount, available_at)
  VALUES
    (v_booking.tutor_id, p_booking_id, 'Tutoring Payout',
     'Payout for ' || v_booking.service_name,
     'clearing', v_remaining_amount, v_available_timestamp);

  -- ============================================================
  -- STEP 10: Create the 'Platform Fee' transaction
  -- ============================================================
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount, available_at)
  VALUES
    (NULL, p_booking_id, 'Platform Fee',
     'Platform fee for ' || v_booking.service_name,
     'paid_out', v_platform_fee_amount, NOW());

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
      AND status != 'Converted'; -- Only update if not already converted
  END IF;

END;
$$;

-- =====================================================================
-- Add comments
-- =====================================================================

COMMENT ON FUNCTION public.handle_successful_payment(UUID, TEXT) IS
'v4.9: Atomically processes payment splits with idempotency, clearing periods, and 3-way/4-way splits for agent-led bookings';

COMMIT;
