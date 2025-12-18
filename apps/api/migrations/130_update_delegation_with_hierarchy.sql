-- Migration: 130_update_delegation_with_hierarchy.sql
-- Purpose: Update handle_successful_payment RPC with hierarchical delegation resolution
-- Date: 2025-12-18
-- Prerequisites: Migration 129 (default_commission_delegate_id column) completed
--
-- Patent Reference: do-not-push-to-github-uk-provisional-patent-application-referral-system-v2.md
-- - Section 7.3: Hierarchical Delegation Resolution Algorithm
-- - Dependent Claim 9(b): Delegation resolution module with deterministic precedence
--
-- This migration updates the commission delegation logic to support three-level hierarchy:
--   Level 1: Listing-specific delegation (highest precedence)
--   Level 2: Profile-level default delegation (fallback)
--   Level 3: Original referral attribution (base case)
--
-- IMPORTANT: Third-party agent protection is evaluated FIRST, before any delegation logic

BEGIN;

-- Drop existing function
DROP FUNCTION IF EXISTS public.handle_successful_payment(UUID);

-- Re-create with hierarchical delegation logic
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

  -- Variables for hierarchical delegation resolution
  v_listing_owner_id UUID;
  v_listing_delegation_id UUID;
  v_profile_delegation_id UUID;
  v_tutor_referrer_id UUID;
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

  -- IDEMPOTENCY CHECK:
  -- If not found or already paid, exit successfully without error
  IF NOT FOUND OR v_booking.payment_status != 'Pending' THEN
    RETURN;
  END IF;

  -- ================================================================
  -- STEP 2: Create the client's 'Booking Payment' transaction (T-TYPE-1)
  -- ================================================================
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (v_booking.student_id, p_booking_id, 'Booking Payment', 'Payment for ' || v_booking.service_name, 'Paid', -v_booking.amount);

  -- ============================================
  -- STEP 3: Calculate commission splits with HIERARCHICAL DELEGATION LOGIC
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

    -- HIERARCHICAL DELEGATION RESOLUTION (Patent Section 7.3)

    -- Fetch tutor's profile data (original referrer + profile-level delegation)
    SELECT referred_by_profile_id, default_commission_delegate_id
    INTO v_tutor_referrer_id, v_profile_delegation_id
    FROM public.profiles
    WHERE id = v_booking.tutor_id;

    -- Fetch listing owner and listing-level delegation
    SELECT profile_id, delegate_commission_to_profile_id
    INTO v_listing_owner_id, v_listing_delegation_id
    FROM public.listings
    WHERE id = v_booking.listing_id;

    -- LEVEL 0: THIRD-PARTY AGENT PROTECTION (Patent Section 7.4)
    -- This check happens FIRST, before any delegation evaluation
    -- If the listing owner is NOT the direct referrer, pay the direct referrer
    -- This protects third-party agents' lifetime attribution rights
    IF v_direct_referrer_id != v_listing_owner_id THEN
      -- Third-party agent brought the client
      -- Pay the original agent regardless of delegation configuration
      v_final_commission_recipient_id := v_direct_referrer_id;

      RAISE NOTICE 'Third-party agent protection: Client referred by % (not listing owner %), paying original referrer',
        v_direct_referrer_id, v_listing_owner_id;

    -- HIERARCHICAL DELEGATION (only applies when listing owner IS the direct referrer)
    ELSIF v_listing_delegation_id IS NOT NULL THEN
      -- LEVEL 1: Listing-Specific Delegation (Highest Precedence)
      v_final_commission_recipient_id := v_listing_delegation_id;

      RAISE NOTICE 'Listing-level delegation: Listing owner % delegated commission to % (listing-specific)',
        v_listing_owner_id, v_listing_delegation_id;

    ELSIF v_profile_delegation_id IS NOT NULL THEN
      -- LEVEL 2: Profile-Level Default Delegation (Fallback)
      v_final_commission_recipient_id := v_profile_delegation_id;

      RAISE NOTICE 'Profile-level delegation: Profile % delegated commission to % (profile default)',
        v_listing_owner_id, v_profile_delegation_id;

    ELSE
      -- LEVEL 3: Original Referral Attribution (Base Case)
      v_final_commission_recipient_id := v_tutor_referrer_id;

      RAISE NOTICE 'Original attribution: No delegation configured, paying tutor''s original referrer %',
        v_tutor_referrer_id;
    END IF;

    -- STEP 3a: Create Referrer's 'Referral Commission' transaction (T-TYPE-3)
    -- Pays the FINAL recipient (direct referrer, delegated partner, or original agent)
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
'[Patent Section 7.3, 7.4] Processes payment for a booking with hierarchical commission delegation logic.
Supports three-level delegation hierarchy with third-party agent protection:
  0. Third-party protection (evaluated first)
  1. Listing-specific delegation (highest precedence)
  2. Profile-level default delegation (fallback)
  3. Original referral attribution (base case)
Delegation only applies when listing owner is the direct referrer. If a third-party agent
brought the client, original agent receives commission regardless of delegation configuration.';
