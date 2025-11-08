-- Migration 050: Update all triggers and functions for client_id rename
-- Purpose: Update review session trigger and payment webhook for new naming
-- Author: Senior Architect + Claude AI
-- Date: 2025-11-08
-- Related: migration 049, migration 045, migration 048

BEGIN;

-- ============================================================
-- 1. UPDATE REVIEW SESSION CREATION TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_review_session_on_booking_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_participant_ids UUID[];
    v_client_id UUID;
    v_tutor_id UUID;
    v_referrer_id UUID;
    v_booking_type booking_type_enum;
BEGIN
    -- 1. Extract booking details
    v_client_id := NEW.client_id;
    v_tutor_id := NEW.tutor_id;
    v_referrer_id := NEW.referrer_profile_id;
    v_booking_type := NEW.booking_type;

    -- 2. Build participant array based on booking type
    IF v_booking_type = 'direct' OR v_booking_type = 'agent_job' THEN
        -- Direct booking (Client ↔ Tutor) or Agent job (Agent ↔ Tutor)
        -- Both are 2-way reviews
        v_participant_ids := ARRAY[v_client_id, v_tutor_id];
    ELSIF v_booking_type = 'referred' THEN
        -- Referral job: Client, Tutor, and Agent (6-way reviews)
        v_participant_ids := ARRAY[v_client_id, v_tutor_id, v_referrer_id];
    ELSE
        -- Fallback: just client and tutor
        v_participant_ids := ARRAY[v_client_id, v_tutor_id];
    END IF;

    -- 3. Create the review session in escrow (7-day deadline)
    INSERT INTO public.booking_review_sessions (
        booking_id,
        publish_at,
        participant_ids
    )
    VALUES (
        NEW.id,
        (NOW() + '7 days'::interval),
        v_participant_ids
    )
    ON CONFLICT (booking_id) DO NOTHING;

    -- 4. Log to audit trail
    INSERT INTO public.audit_log (profile_id, action_type, module, details)
    VALUES (
        v_client_id,
        'review_session.created',
        'Reviews',
        jsonb_build_object(
            'booking_id', NEW.id,
            'booking_type', v_booking_type,
            'participants', v_participant_ids,
            'deadline', (NOW() + '7 days'::interval)
        )
    );

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_review_session_on_booking_complete IS
  'Updated for client_id and booking_type (v4.5). Creates review sessions with appropriate participants based on booking type.';

-- ============================================================
-- 2. UPDATE PAYMENT WEBHOOK FUNCTION
-- ============================================================

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
  v_platform_fee_percent DECIMAL := 0.10;
  v_referrer_commission_percent DECIMAL := 0.10;
  v_tutor_payout_amount DECIMAL;
  v_referrer_commission_amount DECIMAL;
  v_platform_fee_amount DECIMAL;
BEGIN
  -- Fetch the booking to be processed
  SELECT *
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  -- IDEMPOTENCY CHECK
  IF NOT FOUND OR v_booking.payment_status != 'Pending' THEN
    RETURN;
  END IF;

  -- Create the client's 'Booking Payment' transaction (T-TYPE-1)
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (v_booking.client_id, p_booking_id, 'Booking Payment', 'Payment for ' || v_booking.service_name, 'Paid', -v_booking.amount);

  -- Calculate commission splits based on Lifetime Attribution
  v_platform_fee_amount := v_booking.amount * v_platform_fee_percent;

  IF v_booking.referrer_profile_id IS NOT NULL THEN
    -- REFERRED BOOKING (80/10/10 SPLIT)
    v_referrer_commission_amount := v_booking.amount * v_referrer_commission_percent;
    v_tutor_payout_amount := v_booking.amount - v_platform_fee_amount - v_referrer_commission_amount;

    -- Create Referrer's 'Referral Commission' transaction (T-TYPE-3)
    INSERT INTO public.transactions
      (profile_id, booking_id, type, description, status, amount)
    VALUES
      (v_booking.referrer_profile_id, p_booking_id, 'Referral Commission', 'Commission from ' || v_booking.service_name, 'Pending', v_referrer_commission_amount)
    RETURNING id INTO v_new_commission_tx_id;

  ELSE
    -- DIRECT BOOKING or AGENT JOB (90/10 SPLIT)
    v_tutor_payout_amount := v_booking.amount - v_platform_fee_amount;
    v_new_commission_tx_id := NULL;
  END IF;

  -- Create the tutor's 'Tutoring Payout' transaction (T-TYPE-2)
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (v_booking.tutor_id, p_booking_id, 'Tutoring Payout', 'Payout for ' || v_booking.service_name, 'Pending', v_tutor_payout_amount);

  -- Create the 'Platform Fee' transaction (T-TYPE-5)
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount)
  VALUES
    (NULL, p_booking_id, 'Platform Fee', 'Platform fee for ' || v_booking.service_name, 'Paid', v_platform_fee_amount);

  -- Update the booking table (triggers review session creation)
  UPDATE public.bookings
  SET payment_status = 'Confirmed',
      status = 'Completed'
  WHERE id = p_booking_id;

  -- Update the lead-gen 'referrals' table (first conversion only)
  IF v_new_commission_tx_id IS NOT NULL THEN
    UPDATE public.referrals
    SET
      status = 'Converted',
      booking_id = p_booking_id,
      transaction_id = v_new_commission_tx_id,
      converted_at = now()
    WHERE referred_profile_id = v_booking.client_id
      AND status != 'Converted';
  END IF;

END;
$$;

COMMENT ON FUNCTION public.handle_successful_payment IS
  'Updated for client_id rename (v4.5). Handles payment processing and triggers review sessions.';

-- ============================================================
-- 3. AUDIT LOG
-- ============================================================

INSERT INTO public.audit_log (action_type, module, details)
VALUES (
  'schema.triggers_updated_for_client_id',
  'Reviews',
  jsonb_build_object(
    'migration', '050',
    'functions_updated', ARRAY[
      'create_review_session_on_booking_complete',
      'handle_successful_payment'
    ],
    'timestamp', NOW()
  )
);

COMMIT;
