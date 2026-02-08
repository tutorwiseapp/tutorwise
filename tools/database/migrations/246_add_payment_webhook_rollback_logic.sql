-- ============================================================================
-- Migration 246: Add Webhook Rollback Logic for Payment Processing
-- ============================================================================
-- File: tools/database/migrations/246_add_payment_webhook_rollback_logic.sql
-- Purpose: Add transaction rollback and error handling to payment processing
-- Created: 2026-02-07
-- Issue: HIGH #6 - Webhook rollback for partial failures
--
-- This migration enhances the handle_successful_payment RPC function with:
-- 1. Explicit transaction savepoints and rollback
-- 2. Transaction completeness verification
-- 3. Enhanced idempotency checking
-- 4. Error logging for debugging
-- 5. Retry-safe processing
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Create error_log table for payment processing errors
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_processing_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  stripe_checkout_id TEXT,
  error_message TEXT NOT NULL,
  error_context JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX idx_payment_errors_booking ON payment_processing_errors(booking_id);
CREATE INDEX idx_payment_errors_occurred ON payment_processing_errors(occurred_at DESC);

COMMENT ON TABLE payment_processing_errors IS 'Logs payment processing errors for debugging and monitoring';

-- ============================================================================
-- Step 2: Create helper function to verify transaction completeness
-- ============================================================================
CREATE OR REPLACE FUNCTION verify_payment_transactions_complete(
  p_booking_id UUID,
  p_expected_count INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_actual_count INTEGER;
  v_transaction_types TEXT[];
BEGIN
  -- Count transactions for this booking
  SELECT COUNT(*), ARRAY_AGG(type)
  INTO v_actual_count, v_transaction_types
  FROM transactions
  WHERE booking_id = p_booking_id;

  -- Log the verification
  RAISE NOTICE 'Transaction verification for booking %: Expected %, Got %, Types: %',
    p_booking_id, p_expected_count, v_actual_count, v_transaction_types;

  -- Return true if we have at least the expected number
  RETURN v_actual_count >= p_expected_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 3: Recreate handle_successful_payment with rollback logic
-- ============================================================================
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
  v_expected_transaction_count INTEGER := 3; -- Minimum: Client, Tutor, Platform
  v_error_context JSONB;
BEGIN
  -- ======================================
  -- ENHANCED IDEMPOTENCY CHECK
  -- ======================================
  IF p_stripe_checkout_id IS NOT NULL THEN
    -- Check if booking is marked as Paid AND has complete transactions
    IF EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.stripe_checkout_id = p_stripe_checkout_id
        AND b.payment_status = 'Paid'
        AND verify_payment_transactions_complete(b.id, 3) -- At least 3 transactions
    ) THEN
      RAISE NOTICE 'Payment already fully processed for checkout %', p_stripe_checkout_id;
      RETURN; -- Already fully processed
    END IF;
  END IF;

  -- ======================================
  -- START TRANSACTION SAVEPOINT
  -- ======================================
  -- This allows us to rollback without affecting outer transaction
  SAVEPOINT payment_processing;

  BEGIN
    -- ======================================
    -- STEP 1: Fetch and lock the booking
    -- ======================================
    SELECT
      b.*,
      t.full_name as tutor_full_name,
      c.full_name as client_full_name
    INTO v_booking
    FROM bookings b
    LEFT JOIN profiles t ON b.tutor_id = t.id
    LEFT JOIN profiles c ON b.client_id = c.id
    WHERE b.id = p_booking_id
    FOR UPDATE; -- Lock the row

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;

    IF v_booking.payment_status = 'Paid' THEN
      RAISE NOTICE 'Booking % already marked as Paid, verifying transactions', p_booking_id;

      -- Verify transaction completeness
      IF verify_payment_transactions_complete(p_booking_id, 3) THEN
        RAISE NOTICE 'Transactions already complete for booking %', p_booking_id;
        RETURN; -- Already processed
      ELSE
        RAISE EXCEPTION 'Booking marked as Paid but transactions incomplete';
      END IF;
    END IF;

    IF v_booking.payment_status != 'Pending' THEN
      RAISE EXCEPTION 'Invalid payment status: % (expected Pending)', v_booking.payment_status;
    END IF;

    v_tutor_name := v_booking.tutor_full_name;
    v_client_name := v_booking.client_full_name;

    -- ======================================
    -- STEP 2: Update checkout ID
    -- ======================================
    IF p_stripe_checkout_id IS NOT NULL THEN
      UPDATE bookings
      SET stripe_checkout_id = p_stripe_checkout_id
      WHERE id = p_booking_id;
    END IF;

    -- ======================================
    -- STEP 3: Calculate clearing period
    -- ======================================
    v_available_timestamp := (v_booking.session_start_time + (v_booking.session_duration || ' minutes')::INTERVAL) + (v_clearing_days || ' days')::INTERVAL;

    -- ======================================
    -- STEP 4: Create Client Payment Transaction
    -- ======================================
    INSERT INTO transactions
      (profile_id, booking_id, type, description, status, amount, available_at,
       service_name, subjects, session_date, delivery_mode, tutor_name, client_name)
    VALUES
      (v_booking.client_id, p_booking_id, 'Booking Payment',
       'Payment for ' || v_booking.service_name,
       'paid_out', -v_booking.amount, NOW(),
       v_booking.service_name,
       v_booking.subjects,
       v_booking.session_start_time,
       v_booking.delivery_mode,
       v_tutor_name,
       v_client_name);

    RAISE NOTICE 'Created Client Payment transaction';

    -- ======================================
    -- STEP 5: Calculate commission splits
    -- ======================================
    v_remaining_amount := v_booking.amount;
    v_platform_fee_amount := v_booking.amount * v_platform_fee_percent;
    v_remaining_amount := v_remaining_amount - v_platform_fee_amount;

    -- Get referring agent
    SELECT referred_by_profile_id INTO v_referring_agent_id
    FROM profiles
    WHERE id = v_booking.client_id;

    -- ======================================
    -- STEP 6: Referral Commission (if applicable)
    -- ======================================
    IF v_referring_agent_id IS NOT NULL
       AND v_referring_agent_id NOT IN (v_booking.agent_id, v_booking.tutor_id) THEN

      v_referral_commission_amount := v_booking.amount * v_referral_commission_percent;
      v_remaining_amount := v_remaining_amount - v_referral_commission_amount;
      v_expected_transaction_count := v_expected_transaction_count + 1; -- Add referral transaction

      INSERT INTO transactions
        (profile_id, booking_id, type, description, status, amount, available_at,
         service_name, subjects, session_date, delivery_mode, tutor_name, client_name)
      VALUES
        (v_referring_agent_id, p_booking_id, 'Referral Commission',
         'Referral commission for ' || v_booking.service_name,
         'clearing', v_referral_commission_amount, v_available_timestamp,
         v_booking.service_name,
         v_booking.subjects,
         v_booking.session_start_time,
         v_booking.delivery_mode,
         v_tutor_name,
         v_client_name);

      RAISE NOTICE 'Created Referral Commission transaction';

      -- Update referral status
      UPDATE referrals
      SET status = 'Converted', converted_at = NOW()
      WHERE referrer_profile_id = v_referring_agent_id
        AND referred_profile_id = v_booking.client_id
        AND status = 'Active';
    END IF;

    -- ======================================
    -- STEP 7: Agent Commission (if applicable)
    -- ======================================
    IF v_booking.agent_id IS NOT NULL
       AND v_booking.agent_id NOT IN (v_referring_agent_id, v_booking.tutor_id) THEN

      v_agent_commission_amount := v_booking.amount * v_agent_commission_percent;
      v_remaining_amount := v_remaining_amount - v_agent_commission_amount;
      v_expected_transaction_count := v_expected_transaction_count + 1; -- Add agent transaction

      SELECT full_name INTO v_agent_name
      FROM profiles
      WHERE id = v_booking.agent_id;

      INSERT INTO transactions
        (profile_id, booking_id, type, description, status, amount, available_at,
         service_name, subjects, session_date, delivery_mode, tutor_name, client_name, agent_name)
      VALUES
        (v_booking.agent_id, p_booking_id, 'Agent Commission',
         'Agent commission for ' || v_booking.service_name,
         'clearing', v_agent_commission_amount, v_available_timestamp,
         v_booking.service_name,
         v_booking.subjects,
         v_booking.session_start_time,
         v_booking.delivery_mode,
         v_tutor_name,
         v_client_name,
         v_agent_name);

      RAISE NOTICE 'Created Agent Commission transaction';
    END IF;

    -- ======================================
    -- STEP 8: Tutoring Payout
    -- ======================================
    INSERT INTO transactions
      (profile_id, booking_id, type, description, status, amount, available_at,
       service_name, subjects, session_date, delivery_mode, tutor_name, client_name)
    VALUES
      (v_booking.tutor_id, p_booking_id, 'Tutoring Payout',
       'Payout for ' || v_booking.service_name,
       'clearing', v_remaining_amount, v_available_timestamp,
       v_booking.service_name,
       v_booking.subjects,
       v_booking.session_start_time,
       v_booking.delivery_mode,
       v_tutor_name,
       v_client_name);

    RAISE NOTICE 'Created Tutoring Payout transaction';

    -- ======================================
    -- STEP 9: Platform Fee
    -- ======================================
    INSERT INTO transactions
      (profile_id, booking_id, type, description, status, amount, available_at,
       service_name, subjects, session_date, delivery_mode, tutor_name, client_name)
    VALUES
      (NULL, p_booking_id, 'Platform Fee',
       'Platform fee for ' || v_booking.service_name,
       'paid_out', v_platform_fee_amount, NOW(),
       v_booking.service_name,
       v_booking.subjects,
       v_booking.session_start_time,
       v_booking.delivery_mode,
       v_tutor_name,
       v_client_name);

    RAISE NOTICE 'Created Platform Fee transaction';

    -- ======================================
    -- STEP 10: Verify Transaction Completeness
    -- ======================================
    IF NOT verify_payment_transactions_complete(p_booking_id, v_expected_transaction_count) THEN
      RAISE EXCEPTION 'Transaction verification failed: Expected %, got incomplete set', v_expected_transaction_count;
    END IF;

    RAISE NOTICE 'Transaction completeness verified: % transactions', v_expected_transaction_count;

    -- ======================================
    -- STEP 11: Mark booking as Paid
    -- ======================================
    UPDATE bookings
    SET
      payment_status = 'Paid',
      stripe_checkout_id = COALESCE(p_stripe_checkout_id, stripe_checkout_id),
      updated_at = NOW()
    WHERE id = p_booking_id;

    RAISE NOTICE 'Booking % marked as Paid', p_booking_id;

    -- ======================================
    -- SUCCESS: Release savepoint
    -- ======================================
    RELEASE SAVEPOINT payment_processing;

  EXCEPTION
    WHEN OTHERS THEN
      -- ======================================
      -- ROLLBACK: Undo all transaction inserts
      -- ======================================
      RAISE WARNING 'Payment processing failed, rolling back: %', SQLERRM;

      ROLLBACK TO SAVEPOINT payment_processing;

      -- Build error context
      v_error_context := jsonb_build_object(
        'booking_id', p_booking_id,
        'stripe_checkout_id', p_stripe_checkout_id,
        'payment_status', v_booking.payment_status,
        'booking_amount', v_booking.amount,
        'expected_transactions', v_expected_transaction_count,
        'sql_state', SQLSTATE,
        'error_detail', SQLERRM
      );

      -- Log the error
      INSERT INTO payment_processing_errors
        (booking_id, stripe_checkout_id, error_message, error_context)
      VALUES
        (p_booking_id, p_stripe_checkout_id, SQLERRM, v_error_context);

      -- Re-raise the exception so webhook fails and Stripe retries
      RAISE EXCEPTION 'Payment processing failed for booking %: %', p_booking_id, SQLERRM;
  END;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- View the updated function
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'handle_successful_payment'
  AND routine_schema = 'public';

-- Check if error log table exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'payment_processing_errors';

-- ============================================================================
-- Notes
-- ============================================================================
-- 1. This migration adds comprehensive rollback logic to payment processing
-- 2. If ANY transaction insert fails, ALL are rolled back
-- 3. Stripe webhook will fail and automatically retry
-- 4. Enhanced idempotency ensures retries don't create duplicates
-- 5. Error logging helps debug any payment processing issues
-- 6. Transaction completeness verification prevents partial success
-- ============================================================================
