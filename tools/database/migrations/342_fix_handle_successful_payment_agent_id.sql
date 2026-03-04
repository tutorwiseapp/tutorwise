-- ============================================================================
-- Migration 342: Fix handle_successful_payment — restore correct agent_id column
-- ============================================================================
-- File: tools/database/migrations/342_fix_handle_successful_payment_agent_id.sql
-- Purpose: Restore correct commission logic after agent rename regression
-- Created: 2026-03-04
--
-- ROOT CAUSE:
--   The live DB RPC references v_booking.agent_profile_id — a column that has
--   never existed on the bookings table. bookings.referrer_profile_id was renamed
--   to bookings.agent_id in migration 051. A later migration (introduced during
--   AI agent rename work) regressed the RPC to use agent_profile_id, causing
--   the IF condition to always evaluate to NULL/false — meaning no referral
--   commission has ever been paid.
--
-- WHAT THIS MIGRATION DOES:
--   Restores handle_successful_payment based on migration 111 (last known-good
--   version), with the following corrections:
--     1. agent_profile_id → agent_id  (the actual column on bookings)
--     2. location_type    → delivery_mode  (renamed in migration 245)
--     3. Commission rate  → 10% (matches solution design + organisation_referral_config default)
--     4. Removes the redundant profiles.referred_by_profile_id lookup (Step 7
--        in migrations 060/111) — bookings.agent_id is already set from
--        referred_by_profile_id at booking creation time; the guard prevented
--        it from ever firing anyway
--     5. referrals UPDATE uses agent_id (post-052 column) and status != 'Converted'
--
-- COMMISSION STRUCTURE (restored):
--   Direct booking  (agent_id IS NULL): 90% tutor / 10% platform
--   Referred booking (agent_id IS NOT NULL): 80% tutor / 10% platform / 10% agent
--
-- SAFE TO RUN:
--   All 9 existing bookings have agent_id = NULL and payment_status = 'Paid'.
--   The idempotency check (payment_status != 'Pending') means no existing booking
--   will be reprocessed. This only affects future bookings.
-- ============================================================================

BEGIN;

-- ============================================================================
-- Drop and recreate handle_successful_payment
-- ============================================================================

DROP FUNCTION IF EXISTS public.handle_successful_payment(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.handle_successful_payment(
  p_booking_id         UUID,
  p_stripe_checkout_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking                   RECORD;
  v_new_commission_tx_id      UUID;
  v_platform_fee_percent      DECIMAL := 0.10;  -- 10% platform fee (always)
  v_referral_commission_pct   DECIMAL := 0.10;  -- 10% referral commission (all referrals)
  v_tutor_payout_amount       DECIMAL;
  v_referral_commission_amount DECIMAL;
  v_platform_fee_amount       DECIMAL;
  v_remaining_amount          DECIMAL;
  v_tutor_name                TEXT;
  v_client_name               TEXT;
  v_agent_name                TEXT;
  v_available_timestamp       TIMESTAMPTZ;
  v_clearing_days             INT := 7;
BEGIN

  -- ======================================
  -- STEP 1: Idempotency check via stripe_checkout_id
  -- ======================================
  IF p_stripe_checkout_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.bookings
      WHERE stripe_checkout_id = p_stripe_checkout_id
        AND payment_status = 'Paid'
    ) THEN
      RAISE NOTICE '[PAYMENT] Already processed: checkout_id=%', p_stripe_checkout_id;
      RETURN;
    END IF;
  END IF;

  -- ======================================
  -- STEP 2: Fetch and lock the booking
  -- ======================================
  SELECT
    b.*,
    t.full_name  AS tutor_full_name,
    c.full_name  AS client_full_name,
    a.full_name  AS agent_full_name
  INTO v_booking
  FROM public.bookings b
  LEFT JOIN public.profiles t ON b.tutor_id  = t.id
  LEFT JOIN public.profiles c ON b.client_id = c.id
  LEFT JOIN public.profiles a ON b.agent_id  = a.id  -- agent_id (renamed from referrer_profile_id, migration 051)
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND OR v_booking.payment_status != 'Pending' THEN
    RAISE NOTICE '[PAYMENT] Skipping booking % — not found or already processed', p_booking_id;
    RETURN;
  END IF;

  v_tutor_name  := v_booking.tutor_full_name;
  v_client_name := v_booking.client_full_name;
  v_agent_name  := v_booking.agent_full_name;

  -- ======================================
  -- STEP 3: Stamp checkout ID if provided
  -- ======================================
  IF p_stripe_checkout_id IS NOT NULL THEN
    UPDATE public.bookings
    SET stripe_checkout_id = p_stripe_checkout_id
    WHERE id = p_booking_id;
  END IF;

  -- ======================================
  -- STEP 4: Calculate clearing timestamp
  -- 7-day hold after session ends
  -- ======================================
  v_available_timestamp :=
    (v_booking.session_start_time + (v_booking.session_duration || ' minutes')::INTERVAL)
    + (v_clearing_days || ' days')::INTERVAL;

  -- ======================================
  -- STEP 5: Client payment transaction (T-TYPE-1)
  -- ======================================
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount, available_at,
     service_name, subjects, session_date, delivery_mode, tutor_name, client_name, agent_name)
  VALUES
    (v_booking.client_id, p_booking_id, 'Booking Payment',
     'Payment for ' || v_booking.service_name,
     'paid_out', -v_booking.amount, NOW(),
     v_booking.service_name, v_booking.subjects, v_booking.session_start_time,
     v_booking.delivery_mode, v_tutor_name, v_client_name, v_agent_name);

  -- ======================================
  -- STEP 6: Commission splits
  -- ======================================
  v_remaining_amount    := v_booking.amount;
  v_platform_fee_amount := v_booking.amount * v_platform_fee_percent;
  v_remaining_amount    := v_remaining_amount - v_platform_fee_amount;

  -- ======================================
  -- STEP 7: Referral commission (10%) — if booking was referred
  -- bookings.agent_id is set from profiles.referred_by_profile_id at booking creation.
  -- Any user role (client, tutor, agent) can be the referrer.
  -- ======================================
  IF v_booking.agent_id IS NOT NULL THEN

    v_referral_commission_amount := v_booking.amount * v_referral_commission_pct;
    v_remaining_amount           := v_remaining_amount - v_referral_commission_amount;

    INSERT INTO public.transactions
      (profile_id, booking_id, type, description, status, amount, available_at,
       service_name, subjects, session_date, delivery_mode, tutor_name, client_name, agent_name)
    VALUES
      (v_booking.agent_id, p_booking_id, 'Referral Commission',
       'Referral commission from ' || v_booking.service_name,
       'clearing', v_referral_commission_amount, v_available_timestamp,
       v_booking.service_name, v_booking.subjects, v_booking.session_start_time,
       v_booking.delivery_mode, v_tutor_name, v_client_name, v_agent_name)
    RETURNING id INTO v_new_commission_tx_id;

  END IF;

  -- ======================================
  -- STEP 8: Tutor payout (remainder after platform + referral)
  -- ======================================
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount, available_at,
     service_name, subjects, session_date, delivery_mode, tutor_name, client_name, agent_name)
  VALUES
    (v_booking.tutor_id, p_booking_id, 'Tutoring Payout',
     'Payout for ' || v_booking.service_name,
     'clearing', v_remaining_amount, v_available_timestamp,
     v_booking.service_name, v_booking.subjects, v_booking.session_start_time,
     v_booking.delivery_mode, v_tutor_name, v_client_name, v_agent_name);

  -- ======================================
  -- STEP 9: Platform fee transaction
  -- ======================================
  INSERT INTO public.transactions
    (profile_id, booking_id, type, description, status, amount, available_at,
     service_name, subjects, session_date, delivery_mode, tutor_name, client_name, agent_name)
  VALUES
    (NULL, p_booking_id, 'Platform Fee',
     'Platform fee for ' || v_booking.service_name,
     'paid_out', v_platform_fee_amount, NOW(),
     v_booking.service_name, v_booking.subjects, v_booking.session_start_time,
     v_booking.delivery_mode, v_tutor_name, v_client_name, v_agent_name);

  -- ======================================
  -- STEP 10: Mark booking as Paid
  -- ======================================
  UPDATE public.bookings
  SET
    payment_status = 'Paid',
    stripe_checkout_id = COALESCE(p_stripe_checkout_id, stripe_checkout_id),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- ======================================
  -- STEP 11: Mark referral as Converted (first conversion only)
  -- Uses referred_profile_id (correct post-052 column name on referrals table)
  -- ======================================
  IF v_new_commission_tx_id IS NOT NULL THEN
    UPDATE public.referrals
    SET
      status         = 'Converted',
      booking_id     = p_booking_id,
      transaction_id = v_new_commission_tx_id,
      converted_at   = NOW()
    WHERE referred_profile_id = v_booking.client_id
      AND status != 'Converted';
  END IF;

  RAISE NOTICE '[PAYMENT] Success: booking_id=%, agent_id=%, commission=%',
    p_booking_id, v_booking.agent_id, v_referral_commission_amount;

EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO payment_processing_errors
      (booking_id, stripe_checkout_id, error_message, error_context)
    VALUES
      (p_booking_id, p_stripe_checkout_id, SQLERRM, jsonb_build_object(
        'sql_state', SQLSTATE,
        'migration', '342'
      ));
    RAISE EXCEPTION '[PAYMENT] Failed for booking %: %', p_booking_id, SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.handle_successful_payment(UUID, TEXT) IS
'Migration 342: Fixed agent_profile_id → agent_id regression. 90/10 direct, 80/10/10 referred. 10% referral commission to bookings.agent_id.';

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT proname, LEFT(prosrc, 120) AS first_120_chars
FROM pg_proc
WHERE proname = 'handle_successful_payment';
