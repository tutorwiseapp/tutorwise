-- ============================================================================
-- Migration 246 v2: Add Webhook Rollback Logic for Payment Processing
-- ============================================================================
-- File: tools/database/migrations/246_add_payment_webhook_rollback_logic_v2.sql
-- Purpose: Add transaction rollback and error handling to payment processing
-- Created: 2026-02-07
-- Issue: HIGH #6 - Webhook rollback for partial failures
--
-- Note: PostgreSQL functions are already atomic - if they fail, all changes
-- are automatically rolled back. We enhance this with error logging and
-- transaction completeness verification.
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

CREATE INDEX IF NOT EXISTS idx_payment_errors_booking ON payment_processing_errors(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_errors_occurred ON payment_processing_errors(occurred_at DESC);

COMMENT ON TABLE payment_processing_errors IS 'Logs payment processing errors for debugging and monitoring. Issue #6 - Webhook rollback tracking.';

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
BEGIN
  SELECT COUNT(*) INTO v_actual_count
  FROM transactions
  WHERE booking_id = p_booking_id;

  RETURN v_actual_count >= p_expected_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 3: Enhanced handle_successful_payment with error handling
-- ============================================================================
-- Note: PostgreSQL functions are inherently atomic. If the function raises
-- an exception, all inserts are automatically rolled back. We just need to
-- add proper exception handling and logging.
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
  v_actual_transaction_count INTEGER;
BEGIN
  -- ======================================
  -- ENHANCED IDEMPOTENCY CHECK (Issue #6 Fix)
  -- ======================================
  IF p_stripe_checkout_id IS NOT NULL THEN
    -- Check if already fully processed
    IF EXISTS (
      SELECT 1
      FROM bookings b
      WHERE b.stripe_checkout_id = p_stripe_checkout_id
        AND b.payment_status = 'Paid'
        AND verify_payment_transactions_complete(b.id, 3)
    ) THEN
      RAISE NOTICE '[PAYMENT] Already processed: checkout_id=%', p_stripe_checkout_id;
      RETURN;
    END IF;
  END IF;

  -- ======================================
  -- Fetch and lock the booking
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
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '[PAYMENT] Booking not found: %', p_booking_id;
  END IF;

  IF v_booking.payment_status = 'Paid' THEN
    -- Double-check transaction completeness
    IF verify_payment_transactions_complete(p_booking_id, 3) THEN
      RAISE NOTICE '[PAYMENT] Booking % already paid with complete transactions', p_booking_id;
      RETURN;
    ELSE
      RAISE EXCEPTION '[PAYMENT] Booking % marked Paid but transactions incomplete', p_booking_id;
    END IF;
  END IF;

  IF v_booking.payment_status != 'Pending' THEN
    RAISE EXCEPTION '[PAYMENT] Invalid status: % (expected Pending)', v_booking.payment_status;
  END IF;

  v_tutor_name := v_booking.tutor_full_name;
  v_client_name := v_booking.client_full_name;

  -- ======================================
  -- Update checkout ID
  -- ======================================
  IF p_stripe_checkout_id IS NOT NULL THEN
    UPDATE bookings
    SET stripe_checkout_id = p_stripe_checkout_id
    WHERE id = p_booking_id;
  END IF;

  -- ======================================
  -- Calculate clearing period
  -- ======================================
  v_available_timestamp := (v_booking.session_start_time + (v_booking.session_duration || ' minutes')::INTERVAL) + (v_clearing_days || ' days')::INTERVAL;

  -- ======================================
  -- Create transactions (all-or-nothing)
  -- ======================================

  -- 1. Client Payment
  INSERT INTO transactions
    (profile_id, booking_id, type, description, status, amount, available_at,
     service_name, subjects, session_date, delivery_mode, tutor_name, client_name)
  VALUES
    (v_booking.client_id, p_booking_id, 'Booking Payment',
     'Payment for ' || v_booking.service_name,
     'paid_out', -v_booking.amount, NOW(),
     v_booking.service_name, v_booking.subjects, v_booking.session_start_time,
     v_booking.delivery_mode, v_tutor_name, v_client_name);

  -- 2. Calculate splits
  v_remaining_amount := v_booking.amount;
  v_platform_fee_amount := v_booking.amount * v_platform_fee_percent;
  v_remaining_amount := v_remaining_amount - v_platform_fee_amount;

  -- Get referring agent
  SELECT referred_by_profile_id INTO v_referring_agent_id
  FROM profiles
  WHERE id = v_booking.client_id;

  -- 3. Referral Commission (if applicable)
  IF v_referring_agent_id IS NOT NULL
     AND v_referring_agent_id NOT IN (v_booking.agent_id, v_booking.tutor_id) THEN

    v_referral_commission_amount := v_booking.amount * v_referral_commission_percent;
    v_remaining_amount := v_remaining_amount - v_referral_commission_amount;
    v_expected_transaction_count := v_expected_transaction_count + 1;

    INSERT INTO transactions
      (profile_id, booking_id, type, description, status, amount, available_at,
       service_name, subjects, session_date, delivery_mode, tutor_name, client_name)
    VALUES
      (v_referring_agent_id, p_booking_id, 'Referral Commission',
       'Referral commission for ' || v_booking.service_name,
       'clearing', v_referral_commission_amount, v_available_timestamp,
       v_booking.service_name, v_booking.subjects, v_booking.session_start_time,
       v_booking.delivery_mode, v_tutor_name, v_client_name);

    UPDATE referrals
    SET status = 'Converted', converted_at = NOW()
    WHERE referrer_profile_id = v_referring_agent_id
      AND referred_profile_id = v_booking.client_id
      AND status = 'Active';
  END IF;

  -- 4. Agent Commission (if applicable)
  IF v_booking.agent_id IS NOT NULL
     AND v_booking.agent_id NOT IN (v_referring_agent_id, v_booking.tutor_id) THEN

    v_agent_commission_amount := v_booking.amount * v_agent_commission_percent;
    v_remaining_amount := v_remaining_amount - v_agent_commission_amount;
    v_expected_transaction_count := v_expected_transaction_count + 1;

    SELECT full_name INTO v_agent_name FROM profiles WHERE id = v_booking.agent_id;

    INSERT INTO transactions
      (profile_id, booking_id, type, description, status, amount, available_at,
       service_name, subjects, session_date, delivery_mode, tutor_name, client_name, agent_name)
    VALUES
      (v_booking.agent_id, p_booking_id, 'Agent Commission',
       'Agent commission for ' || v_booking.service_name,
       'clearing', v_agent_commission_amount, v_available_timestamp,
       v_booking.service_name, v_booking.subjects, v_booking.session_start_time,
       v_booking.delivery_mode, v_tutor_name, v_client_name, v_agent_name);
  END IF;

  -- 5. Tutoring Payout
  INSERT INTO transactions
    (profile_id, booking_id, type, description, status, amount, available_at,
     service_name, subjects, session_date, delivery_mode, tutor_name, client_name)
  VALUES
    (v_booking.tutor_id, p_booking_id, 'Tutoring Payout',
     'Payout for ' || v_booking.service_name,
     'clearing', v_remaining_amount, v_available_timestamp,
     v_booking.service_name, v_booking.subjects, v_booking.session_start_time,
     v_booking.delivery_mode, v_tutor_name, v_client_name);

  -- 6. Platform Fee
  INSERT INTO transactions
    (profile_id, booking_id, type, description, status, amount, available_at,
     service_name, subjects, session_date, delivery_mode, tutor_name, client_name)
  VALUES
    (NULL, p_booking_id, 'Platform Fee',
     'Platform fee for ' || v_booking.service_name,
     'paid_out', v_platform_fee_amount, NOW(),
     v_booking.service_name, v_booking.subjects, v_booking.session_start_time,
     v_booking.delivery_mode, v_tutor_name, v_client_name);

  -- ======================================
  -- Verify transaction completeness (Issue #6 Fix)
  -- ======================================
  SELECT COUNT(*) INTO v_actual_transaction_count
  FROM transactions
  WHERE booking_id = p_booking_id;

  IF v_actual_transaction_count < v_expected_transaction_count THEN
    RAISE EXCEPTION '[PAYMENT] Transaction verification failed: Expected %, got %',
      v_expected_transaction_count, v_actual_transaction_count;
  END IF;

  -- ======================================
  -- Mark booking as Paid
  -- ======================================
  UPDATE bookings
  SET
    payment_status = 'Paid',
    stripe_checkout_id = COALESCE(p_stripe_checkout_id, stripe_checkout_id),
    updated_at = NOW()
  WHERE id = p_booking_id;

  RAISE NOTICE '[PAYMENT] Success: booking_id=%, transactions=%', p_booking_id, v_actual_transaction_count;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    INSERT INTO payment_processing_errors
      (booking_id, stripe_checkout_id, error_message, error_context)
    VALUES
      (p_booking_id, p_stripe_checkout_id, SQLERRM, jsonb_build_object(
        'sql_state', SQLSTATE,
        'booking_amount', v_booking.amount,
        'expected_transactions', v_expected_transaction_count
      ));

    -- Re-raise so webhook fails and Stripe retries
    RAISE EXCEPTION '[PAYMENT] Processing failed for booking %: %', p_booking_id, SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Migration 246 v2 completed successfully' AS status;

-- Check error log table
SELECT COUNT(*) as error_log_table_ready
FROM information_schema.tables
WHERE table_name = 'payment_processing_errors';

-- ============================================================================
-- Notes
-- ============================================================================
-- PostgreSQL functions are inherently atomic:
-- - If the function raises an exception, ALL changes are rolled back
-- - No partial success is possible
-- - This migration adds:
--   1. Enhanced idempotency checking
--   2. Transaction completeness verification
--   3. Error logging for debugging
--   4. Better exception messages
-- ============================================================================
