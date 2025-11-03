-- Migration: Create RPC for atomic payment processing
-- Version: 030
-- Created: 2025-11-02
-- Description: Creates handle_successful_payment function called by Stripe webhook
-- This function executes the 80/10/10 or 90/10 commission split atomically
-- Specification: SDD v3.6, Section 8.6

-- =====================================================================
-- IMPORTANT: This function is IDEMPOTENT - it will only process a booking
-- if its payment_status is 'Pending', preventing duplicate transactions
-- from multiple webhook calls.
-- =====================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_successful_payment(
    p_booking_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_new_commission_tx_id UUID;
  v_platform_fee_percent DECIMAL := 0.10; -- 10%
  v_referrer_commission_percent DECIMAL := 0.10; -- 10%
  v_tutor_payout_amount DECIMAL;
  v_referrer_commission_amount DECIMAL;
  v_platform_fee_amount DECIMAL;
BEGIN
  -- ======================================
  -- STEP 1: Fetch the booking to be processed
  -- ======================================
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE; -- Lock the row to prevent race conditions

  -- IDEMPOTENCY CHECK (SDD v3.6, Q&A #2):
  -- If not found or already paid, exit successfully without error
  IF NOT FOUND OR v_booking.payment_status != 'Pending' THEN
    RETURN;
  END IF;

  -- ================================================================
  -- STEP 2: Create the client's 'Booking Payment' transaction (T-TYPE-1)
  -- ================================================================
  -- This is the full amount the client paid (negative = debit)
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (v_booking.student_id, p_booking_id, 'Booking Payment', 'Payment for ' || v_booking.service_name, 'Paid', -v_booking.amount);

  -- ============================================
  -- STEP 3: Calculate commission splits based on Lifetime Attribution
  -- ============================================
  v_platform_fee_amount := v_booking.amount * v_platform_fee_percent;

  IF v_booking.referrer_profile_id IS NOT NULL THEN
    -- ==========================================
    -- THIS IS A REFERRED BOOKING (80/10/10 SPLIT)
    -- ==========================================
    v_referrer_commission_amount := v_booking.amount * v_referrer_commission_percent;
    v_tutor_payout_amount := v_booking.amount - v_platform_fee_amount - v_referrer_commission_amount; -- 80%

    -- STEP 3a: Create Referrer's 'Referral Commission' transaction (T-TYPE-3)
    INSERT INTO public.transactions
      (profile_id, booking_id, type, description, status, amount)
    VALUES
      (v_booking.referrer_profile_id, p_booking_id, 'Referral Commission', 'Commission from ' || v_booking.service_name, 'Pending', v_referrer_commission_amount)
    RETURNING id INTO v_new_commission_tx_id; -- Get the ID for the lead-gen table

  ELSE
    -- ======================================
    -- THIS IS A DIRECT BOOKING (90/10 SPLIT)
    -- ======================================
    v_tutor_payout_amount := v_booking.amount - v_platform_fee_amount; -- 90%
    v_new_commission_tx_id := NULL; -- No commission
  END IF;

  -- ========================================================
  -- STEP 4: Create the tutor's 'Tutoring Payout' transaction (T-TYPE-2)
  -- ========================================================
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (v_booking.tutor_id, p_booking_id, 'Tutoring Payout', 'Payout for ' || v_booking.service_name, 'Pending', v_tutor_payout_amount);

  -- ============================================================
  -- STEP 5: Create the 'Platform Fee' transaction (T-TYPE-5)
  -- ============================================================
  -- (SDD v3.6, Q&A #7 - Modified)
  -- Assign to NULL profile_id to separate platform revenue from user transactions
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (NULL, p_booking_id, 'Platform Fee', 'Platform fee for ' || v_booking.service_name, 'Paid', v_platform_fee_amount);

  -- ==============================
  -- STEP 6: Update the booking table
  -- ==============================
  UPDATE public.bookings
  SET payment_status = 'Paid'
  WHERE id = p_booking_id;

  -- =================================================================
  -- STEP 7: Update the lead-gen 'referrals' table (first conversion only)
  -- =================================================================
  -- (SDD v3.6, Q&A #5)
  -- This updates the referral pipeline to 'Converted' status for tracking purposes.
  -- Note: This is SEPARATE from the lifetime commission logic.
  -- The commission was already created above based on profile.referred_by_profile_id
  IF v_new_commission_tx_id IS NOT NULL THEN
    UPDATE public.referrals
    SET
      status = 'Converted',
      booking_id = p_booking_id,
      transaction_id = v_new_commission_tx_id,
      converted_at = now()
    WHERE referred_profile_id = v_booking.student_id
      AND status != 'Converted'; -- Only update if not already converted (first booking only)
  END IF;

END;
$$;

COMMIT;
