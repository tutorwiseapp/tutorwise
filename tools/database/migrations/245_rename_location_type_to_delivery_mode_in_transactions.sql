-- ============================================================================
-- Migration 245: Rename location_type to delivery_mode in transactions table
-- ============================================================================
-- File: tools/database/migrations/245_rename_location_type_to_delivery_mode_in_transactions.sql
-- Purpose: Standardize field naming across all tables
-- Created: 2026-02-07
-- Issue: HIGH #7 - Field name inconsistency (location_type vs delivery_mode)
--
-- Background:
-- - Bookings table: Renamed location_type → delivery_mode in migration 233
-- - Listings table: Already uses delivery_mode (TEXT[]) from migration 195
-- - Transactions table: Still uses location_type (added in migration 107)
--
-- Strategy:
-- 1. Rename transactions.location_type to transactions.delivery_mode
-- 2. Update column comment for clarity
-- 3. Update all RPC functions that reference location_type
--
-- Note: This is purely a naming change - no data transformation needed
-- ============================================================================

BEGIN;

-- Step 1: Rename the column in transactions table
ALTER TABLE transactions
RENAME COLUMN location_type TO delivery_mode;

-- Step 2: Update column comment
COMMENT ON COLUMN transactions.delivery_mode IS 'Delivery mode snapshot: online/in_person/hybrid. Copied from booking at transaction creation time.';

-- Step 3: Update handle_successful_payment RPC function
-- This function creates transactions and needs to use delivery_mode instead of location_type
CREATE OR REPLACE FUNCTION handle_successful_payment(
  p_booking_id UUID,
  p_stripe_checkout_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_booking RECORD;
  v_platform_fee_percent NUMERIC := 0.10;
  v_referral_commission_percent NUMERIC := 0.10;
  v_agent_commission_percent NUMERIC := 0.20;
  v_clearing_days INTEGER := 7;
  v_available_timestamp TIMESTAMPTZ;
  v_referring_agent_id UUID;
  v_agent_name TEXT := NULL;
  v_referral_commission_amount NUMERIC;
  v_agent_commission_amount NUMERIC;
  v_platform_fee_amount NUMERIC;
  v_remaining_amount NUMERIC;
  v_tutor_name TEXT;
  v_client_name TEXT;
BEGIN
  -- Idempotency Check
  IF p_stripe_checkout_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.bookings
      WHERE stripe_checkout_id = p_stripe_checkout_id
        AND payment_status = 'Paid'
    ) THEN
      RETURN;
    END IF;
  END IF;

  -- Fetch and lock the booking with context
  SELECT
    b.*,
    t.full_name as tutor_full_name,
    c.full_name as client_full_name
  INTO v_booking
  FROM public.bookings b
  LEFT JOIN public.profiles t ON b.tutor_id = t.id
  LEFT JOIN public.profiles c ON b.client_id = c.id
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND OR v_booking.payment_status != 'Pending' THEN
    RETURN;
  END IF;

  v_tutor_name := v_booking.tutor_full_name;
  v_client_name := v_booking.client_full_name;

  -- Update booking with checkout ID
  IF p_stripe_checkout_id IS NOT NULL THEN
    UPDATE public.bookings
    SET stripe_checkout_id = p_stripe_checkout_id
    WHERE id = p_booking_id;
  END IF;

  -- Calculate clearing period
  v_available_timestamp := (v_booking.session_start_time + (v_booking.session_duration || ' minutes')::INTERVAL) + (v_clearing_days || ' days')::INTERVAL;

  -- Create client's Booking Payment transaction
  -- FIXED: delivery_mode instead of location_type
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount, available_at,
     service_name, subjects, session_date, delivery_mode, tutor_name, client_name)
  VALUES
    (v_booking.client_id, p_booking_id, 'Booking Payment',
     'Payment for ' || v_booking.service_name,
     'paid_out', -v_booking.amount, NOW(),
     v_booking.service_name,
     v_booking.subjects,
     v_booking.session_start_time,
     v_booking.delivery_mode,  -- FIXED: was location_type
     v_tutor_name,
     v_client_name);

  -- Calculate commission splits
  v_remaining_amount := v_booking.amount;
  v_platform_fee_amount := v_booking.amount * v_platform_fee_percent;
  v_remaining_amount := v_remaining_amount - v_platform_fee_amount;

  -- Get client's referring agent
  SELECT referred_by_profile_id INTO v_referring_agent_id
  FROM public.profiles
  WHERE id = v_booking.client_id;

  -- Referral Commission (10%)
  IF v_referring_agent_id IS NOT NULL
     AND v_referring_agent_id NOT IN (v_booking.agent_id, v_booking.tutor_id) THEN

    v_referral_commission_amount := v_booking.amount * v_referral_commission_percent;
    v_remaining_amount := v_remaining_amount - v_referral_commission_amount;

    -- FIXED: delivery_mode instead of location_type
    INSERT INTO public.transactions
      (profile_id, booking_id, type, description, status, amount, available_at,
       service_name, subjects, session_date, delivery_mode, tutor_name, client_name)
    VALUES
      (v_referring_agent_id, p_booking_id, 'Referral Commission',
       'Referral commission for ' || v_booking.service_name,
       'clearing', v_referral_commission_amount, v_available_timestamp,
       v_booking.service_name,
       v_booking.subjects,
       v_booking.session_start_time,
       v_booking.delivery_mode,  -- FIXED: was location_type
       v_tutor_name,
       v_client_name);

    -- Update referral status
    UPDATE public.referrals
    SET status = 'Converted', converted_at = NOW()
    WHERE referrer_profile_id = v_referring_agent_id
      AND referred_profile_id = v_booking.client_id
      AND status = 'Active';
  END IF;

  -- Agent Commission (20%) if agent_id is set
  IF v_booking.agent_id IS NOT NULL
     AND v_booking.agent_id NOT IN (v_referring_agent_id, v_booking.tutor_id) THEN

    v_agent_commission_amount := v_booking.amount * v_agent_commission_percent;
    v_remaining_amount := v_remaining_amount - v_agent_commission_amount;

    SELECT full_name INTO v_agent_name
    FROM public.profiles
    WHERE id = v_booking.agent_id;

    -- FIXED: delivery_mode instead of location_type
    INSERT INTO public.transactions
      (profile_id, booking_id, type, description, status, amount, available_at,
       service_name, subjects, session_date, delivery_mode, tutor_name, client_name, agent_name)
    VALUES
      (v_booking.agent_id, p_booking_id, 'Agent Commission',
       'Agent commission for ' || v_booking.service_name,
       'clearing', v_agent_commission_amount, v_available_timestamp,
       v_booking.service_name,
       v_booking.subjects,
       v_booking.session_start_time,
       v_booking.delivery_mode,  -- FIXED: was location_type
       v_tutor_name,
       v_client_name,
       v_agent_name);
  END IF;

  -- Tutoring Payout (remaining amount)
  -- FIXED: delivery_mode instead of location_type
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount, available_at,
     service_name, subjects, session_date, delivery_mode, tutor_name, client_name)
  VALUES
    (v_booking.tutor_id, p_booking_id, 'Tutoring Payout',
     'Payout for ' || v_booking.service_name,
     'clearing', v_remaining_amount, v_available_timestamp,
     v_booking.service_name,
     v_booking.subjects,
     v_booking.session_start_time,
     v_booking.delivery_mode,  -- FIXED: was location_type
     v_tutor_name,
     v_client_name);

  -- Platform Fee
  -- FIXED: delivery_mode instead of location_type
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount, available_at,
     service_name, subjects, session_date, delivery_mode, tutor_name, client_name)
  VALUES
    (NULL, p_booking_id, 'Platform Fee',
     'Platform fee for ' || v_booking.service_name,
     'paid_out', v_platform_fee_amount, NOW(),
     v_booking.service_name,
     v_booking.subjects,
     v_booking.session_start_time,
     v_booking.delivery_mode,  -- FIXED: was location_type
     v_tutor_name,
     v_client_name);

  -- Update booking to Paid status
  UPDATE public.bookings
  SET
    payment_status = 'Paid',
    stripe_checkout_id = COALESCE(p_stripe_checkout_id, stripe_checkout_id),
    updated_at = NOW()
  WHERE id = p_booking_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify column was renamed
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transactions'
  AND column_name IN ('location_type', 'delivery_mode');

-- Should show delivery_mode, not location_type

-- ============================================================================
-- Notes
-- ============================================================================
-- 1. This migration standardizes field naming across all tables
-- 2. Bookings.delivery_mode = TEXT (single value)
-- 3. Listings.delivery_mode = TEXT[] (array of values)
-- 4. Transactions.delivery_mode = TEXT (snapshot from booking)
-- 5. All RPC functions updated to use delivery_mode
-- ============================================================================
