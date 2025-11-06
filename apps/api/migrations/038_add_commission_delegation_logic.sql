-- Migration: 038_add_commission_delegation_logic.sql
-- Purpose: Add commission delegation logic to handle_successful_payment RPC (SDD v4.3, Section 4.3)
-- Date: 2025-11-06
-- Prerequisites: Migration 034 (delegate_commission_to_profile_id column) completed
--
-- This migration implements the refined v4.2.1 delegation logic that enables the
-- "Tutor-Led" offline referral model. It adds a delegation check to ensure that
-- commission delegation ONLY happens when the listing owner is also the referrer.
--
-- Test Scenarios (from SDD v4.3, Section 5.0):
-- 1. C2C Online: Cathy refers John to Jane's listing (no delegation) → Pay Cathy ✅
-- 2. T2C Online: Jane refers John to Mark's listing (no delegation) → Pay Jane ✅
-- 3. B2B Offline: Jane refers John via her own brochure (delegated to Bob) → Pay Bob ✅
-- 4. Conflict Test: Cathy refers John to Jane's listing (delegated to Bob) → Pay Cathy ✅

BEGIN;

-- Drop existing function
DROP FUNCTION IF EXISTS public.handle_successful_payment(UUID);

-- Re-create with delegation logic
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

  -- New variables for delegation logic (SDD v4.3)
  v_listing_owner_id UUID;
  v_listing_delegation_id UUID;
  v_direct_referrer_id UUID;
  v_final_commission_recipient_id UUID;
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
  -- STEP 3: Calculate commission splits with DELEGATION LOGIC (SDD v4.3)
  -- ============================================
  v_platform_fee_amount := v_booking.amount * v_platform_fee_percent;

  -- Get the direct referrer from the booking
  v_direct_referrer_id := v_booking.referrer_profile_id;

  IF v_direct_referrer_id IS NOT NULL THEN
    -- ==========================================
    -- THIS IS A REFERRED BOOKING (80/10/10 SPLIT)
    -- ==========================================
    v_referrer_commission_amount := v_booking.amount * v_referrer_commission_percent;
    v_tutor_payout_amount := v_booking.amount - v_platform_fee_amount - v_referrer_commission_amount; -- 80%

    -- NEW: Get listing owner and delegation setting (SDD v4.3, Section 4.3)
    SELECT profile_id, delegate_commission_to_profile_id
    INTO v_listing_owner_id, v_listing_delegation_id
    FROM public.listings
    WHERE id = v_booking.listing_id;

    -- Set default recipient to the direct referrer
    v_final_commission_recipient_id := v_direct_referrer_id;

    -- REFINED v4.2.1 DELEGATION CHECK:
    -- Delegation ONLY happens when:
    --   1. The listing HAS a delegation set (v_listing_delegation_id IS NOT NULL)
    --   2. AND the referrer IS the listing owner (v_direct_referrer_id = v_listing_owner_id)
    --
    -- This ensures:
    --   - Scenario 3 (B2B Offline): Jane's brochure + Jane's listing → Pay Bob ✅
    --   - Scenario 4 (Conflict): Cathy's link + Jane's listing (delegated) → Pay Cathy ✅
    IF v_listing_delegation_id IS NOT NULL AND v_direct_referrer_id = v_listing_owner_id THEN
      -- This is the "Brochure" use case
      -- The referrer (Jane) is also the listing owner, AND she delegated this listing
      -- Override the recipient to pay the delegated agent (Bob)
      v_final_commission_recipient_id := v_listing_delegation_id;

      RAISE NOTICE 'Commission delegation triggered: Listing owner % delegated commission to %',
        v_listing_owner_id, v_listing_delegation_id;
    END IF;

    -- STEP 3a: Create Referrer's 'Referral Commission' transaction (T-TYPE-3)
    -- Now pays the FINAL recipient (could be direct referrer OR delegated agent)
    INSERT INTO public.transactions
      (profile_id, booking_id, type, description, status, amount)
    VALUES
      (v_final_commission_recipient_id, p_booking_id, 'Referral Commission', 'Commission from ' || v_booking.service_name, 'Pending', v_referrer_commission_amount)
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

-- Add comment
COMMENT ON FUNCTION public.handle_successful_payment(UUID) IS
'[SDD v4.3] Processes payment for a booking with refined commission delegation logic. Supports both "Agent-Led" (online) and "Tutor-Led" (offline/brochure) referral models. Delegation only occurs when listing owner is also the referrer.';

-- Test scenarios validation query (for manual testing)
-- This query helps verify the delegation logic for the 4 test scenarios:
--
-- SELECT
--   b.id AS booking_id,
--   b.referrer_profile_id AS direct_referrer,
--   l.profile_id AS listing_owner,
--   l.delegate_commission_to_profile_id AS delegation_target,
--   CASE
--     WHEN b.referrer_profile_id IS NULL THEN 'No referrer (Direct booking)'
--     WHEN l.delegate_commission_to_profile_id IS NOT NULL
--       AND b.referrer_profile_id = l.profile_id
--       THEN 'Delegation applies → Pay: ' || l.delegate_commission_to_profile_id::text
--     ELSE 'No delegation → Pay: ' || b.referrer_profile_id::text
--   END AS commission_recipient_logic
-- FROM bookings b
-- JOIN listings l ON b.listing_id = l.id
-- WHERE b.payment_status = 'Pending'
-- LIMIT 10;
