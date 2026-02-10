-- Migration: 258_create_edupay_rpc_functions.sql
-- Purpose: EduPay RPC functions for atomic EP award, clearing, and projection
-- Created: 2026-02-10
--
-- Functions:
--   award_ep_for_payment(p_booking_id, p_stripe_checkout_id)
--     Called from Stripe webhook after handle_successful_payment succeeds.
--     Reads booking for tutor + net amount, awards EP using tutoring_income rule.
--     Idempotent via p_stripe_checkout_id.
--
--   award_ep_for_event(p_user_id, p_event_type, p_value_gbp, p_idempotency_key, p_metadata, p_source_system)
--     Generic EP award for referrals, CaaS thresholds, affiliate, gift rewards.
--     Idempotent via p_idempotency_key.
--
--   clear_pending_ep()
--     Called by daily cron. Transitions pending→available in edupay_ledger
--     where available_at <= NOW(). Updates wallet balances for affected users.
--
--   get_edupay_projection(p_user_id)
--     Pure calculation. Returns loan impact projection from loan profile + EP earning rate.
--     Returns NULL if no loan profile set.

-- ============================================================
-- 1. award_ep_for_payment
-- ============================================================
CREATE OR REPLACE FUNCTION award_ep_for_payment(
  p_booking_id        UUID,
  p_stripe_checkout_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking         RECORD;
  v_rule            RECORD;
  v_ep_earned       INTEGER;
  v_event_id        UUID;
  v_idempotency_key TEXT;
BEGIN
  -- Build idempotency key from stripe checkout id
  v_idempotency_key := 'tutoring_payment:' || p_stripe_checkout_id;

  -- Idempotency check — return early if already processed
  IF EXISTS (SELECT 1 FROM edupay_events WHERE idempotency_key = v_idempotency_key) THEN
    RETURN;
  END IF;

  -- Read booking to get tutor and net amount
  SELECT
    b.tutor_id,
    b.amount,
    b.platform_fee,
    (b.amount - COALESCE(b.platform_fee, b.amount * 0.10)) AS net_amount
  INTO v_booking
  FROM bookings b
  WHERE b.id = p_booking_id;

  IF v_booking IS NULL THEN
    RAISE WARNING '[EduPay] Booking not found: %', p_booking_id;
    RETURN;
  END IF;

  -- Look up active tutoring_income rule
  SELECT multiplier, pass_through
  INTO v_rule
  FROM edupay_rules
  WHERE event_type = 'tutoring_income'
    AND is_active = true
    AND valid_from <= CURRENT_DATE
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  ORDER BY valid_from DESC
  LIMIT 1;

  IF v_rule IS NULL THEN
    RAISE WARNING '[EduPay] No active tutoring_income rule found';
    RETURN;
  END IF;

  -- Calculate EP earned: net_amount (GBP) * multiplier (EP/£1)
  v_ep_earned := FLOOR(v_booking.net_amount * v_rule.multiplier)::INTEGER;

  IF v_ep_earned <= 0 THEN
    RETURN;
  END IF;

  -- Insert event record (idempotency key prevents duplicates)
  INSERT INTO edupay_events (
    user_id,
    event_type,
    source_system,
    value_gbp,
    ep_earned,
    idempotency_key,
    metadata
  ) VALUES (
    v_booking.tutor_id,
    'tutoring_income',
    'tutorwise',
    v_booking.net_amount,
    v_ep_earned,
    v_idempotency_key,
    jsonb_build_object('booking_id', p_booking_id, 'stripe_checkout_id', p_stripe_checkout_id)
  )
  RETURNING id INTO v_event_id;

  -- Insert immutable ledger entry (pending, clears after 7 days)
  INSERT INTO edupay_ledger (
    user_id,
    event_id,
    ep_amount,
    event_type,
    type,
    status,
    available_at,
    note
  ) VALUES (
    v_booking.tutor_id,
    v_event_id,
    v_ep_earned,
    'tutoring_income',
    'earn',
    'pending',
    NOW() + INTERVAL '7 days',
    'Tutoring session completed'
  );

  -- Upsert wallet — increment pending_ep and total_ep
  INSERT INTO edupay_wallets (user_id, total_ep, available_ep, pending_ep, converted_ep, updated_at)
  VALUES (v_booking.tutor_id, v_ep_earned, 0, v_ep_earned, 0, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    total_ep   = edupay_wallets.total_ep + v_ep_earned,
    pending_ep = edupay_wallets.pending_ep + v_ep_earned,
    updated_at = NOW();

END;
$$;

-- ============================================================
-- 2. award_ep_for_event
-- ============================================================
CREATE OR REPLACE FUNCTION award_ep_for_event(
  p_user_id         UUID,
  p_event_type      TEXT,
  p_value_gbp       DECIMAL(10,2),
  p_idempotency_key TEXT,
  p_metadata        JSONB DEFAULT NULL,
  p_source_system   TEXT DEFAULT 'tutorwise'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rule      RECORD;
  v_ep_earned INTEGER;
  v_event_id  UUID;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM edupay_events WHERE idempotency_key = p_idempotency_key) THEN
      RETURN;
    END IF;
  END IF;

  -- Look up active rule for this event type
  SELECT multiplier
  INTO v_rule
  FROM edupay_rules
  WHERE event_type = p_event_type
    AND is_active = true
    AND valid_from <= CURRENT_DATE
    AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
  ORDER BY valid_from DESC
  LIMIT 1;

  IF v_rule IS NULL THEN
    RAISE WARNING '[EduPay] No active rule for event type: %', p_event_type;
    RETURN;
  END IF;

  -- Calculate EP
  v_ep_earned := FLOOR(p_value_gbp * v_rule.multiplier)::INTEGER;

  IF v_ep_earned <= 0 THEN
    RETURN;
  END IF;

  -- Insert event
  INSERT INTO edupay_events (
    user_id,
    event_type,
    source_system,
    value_gbp,
    ep_earned,
    idempotency_key,
    metadata
  ) VALUES (
    p_user_id,
    p_event_type,
    p_source_system,
    p_value_gbp,
    v_ep_earned,
    p_idempotency_key,
    p_metadata
  )
  RETURNING id INTO v_event_id;

  -- caas_threshold events are available immediately (digital perks, no clearing)
  INSERT INTO edupay_ledger (
    user_id,
    event_id,
    ep_amount,
    event_type,
    type,
    status,
    available_at,
    note
  ) VALUES (
    p_user_id,
    v_event_id,
    v_ep_earned,
    p_event_type,
    'earn',
    CASE WHEN p_event_type = 'caas_threshold' THEN 'available' ELSE 'pending' END,
    CASE WHEN p_event_type = 'caas_threshold' THEN NOW() ELSE NOW() + INTERVAL '7 days' END,
    p_event_type || ' reward'
  );

  -- Upsert wallet
  INSERT INTO edupay_wallets (user_id, total_ep, available_ep, pending_ep, converted_ep, updated_at)
  VALUES (
    p_user_id,
    v_ep_earned,
    CASE WHEN p_event_type = 'caas_threshold' THEN v_ep_earned ELSE 0 END,
    CASE WHEN p_event_type = 'caas_threshold' THEN 0 ELSE v_ep_earned END,
    0,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_ep     = edupay_wallets.total_ep + v_ep_earned,
    available_ep = edupay_wallets.available_ep + CASE WHEN p_event_type = 'caas_threshold' THEN v_ep_earned ELSE 0 END,
    pending_ep   = edupay_wallets.pending_ep   + CASE WHEN p_event_type = 'caas_threshold' THEN 0 ELSE v_ep_earned END,
    updated_at   = NOW();

END;
$$;

-- ============================================================
-- 3. clear_pending_ep
-- ============================================================
CREATE OR REPLACE FUNCTION clear_pending_ep()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cleared_count INTEGER;
  v_user_id       UUID;
BEGIN
  v_cleared_count := 0;

  -- Transition pending → available where clearing period has passed
  WITH cleared AS (
    UPDATE edupay_ledger
    SET status = 'available'
    WHERE status = 'pending'
      AND available_at <= NOW()
    RETURNING user_id, ep_amount
  ),
  user_totals AS (
    SELECT user_id, SUM(ep_amount) AS newly_available
    FROM cleared
    GROUP BY user_id
  )
  UPDATE edupay_wallets w
  SET
    available_ep = w.available_ep + ut.newly_available,
    pending_ep   = GREATEST(0, w.pending_ep - ut.newly_available),
    updated_at   = NOW()
  FROM user_totals ut
  WHERE w.user_id = ut.user_id;

  -- Return count of cleared entries
  GET DIAGNOSTICS v_cleared_count = ROW_COUNT;
  RETURN v_cleared_count;
END;
$$;

-- ============================================================
-- 4. get_edupay_projection
-- ============================================================
CREATE OR REPLACE FUNCTION get_edupay_projection(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_loan_profile  RECORD;
  v_wallet        RECORD;
  v_monthly_ep    DECIMAL;
  v_monthly_gbp   DECIMAL;
  v_result        JSONB;

  -- UK student loan plan repayment rates and thresholds (2025)
  v_threshold     DECIMAL;
  v_rate          DECIMAL;
  v_interest_rate DECIMAL;
  v_annual_repayment DECIMAL;
  v_years_to_clear   DECIMAL;
  v_years_with_ep    DECIMAL;
  v_interest_saved   DECIMAL;
BEGIN
  -- Fetch loan profile
  SELECT * INTO v_loan_profile
  FROM edupay_loan_profiles
  WHERE user_id = p_user_id;

  IF v_loan_profile IS NULL THEN
    RETURN NULL;
  END IF;

  -- Fetch wallet
  SELECT * INTO v_wallet
  FROM edupay_wallets
  WHERE user_id = p_user_id;

  -- Calculate average monthly EP rate (last 3 months of available/pending entries)
  SELECT COALESCE(
    SUM(ep_amount) / 3.0, 0
  ) INTO v_monthly_ep
  FROM edupay_ledger
  WHERE user_id = p_user_id
    AND type = 'earn'
    AND created_at >= NOW() - INTERVAL '3 months';

  -- Convert EP to GBP (100 EP = £1)
  v_monthly_gbp := v_monthly_ep / 100.0;

  -- Plan repayment parameters
  CASE v_loan_profile.loan_plan
    WHEN 'plan1' THEN
      v_threshold := 24990; v_rate := 0.09; v_interest_rate := 0.055;
    WHEN 'plan2' THEN
      v_threshold := 27295; v_rate := 0.09; v_interest_rate := 0.073;
    WHEN 'plan5' THEN
      v_threshold := 25000; v_rate := 0.09; v_interest_rate := 0.073;
    WHEN 'postgrad' THEN
      v_threshold := 21000; v_rate := 0.06; v_interest_rate := 0.073;
    ELSE
      v_threshold := 27295; v_rate := 0.09; v_interest_rate := 0.073;
  END CASE;

  -- Annual repayment from salary
  v_annual_repayment := GREATEST(0,
    (COALESCE(v_loan_profile.annual_salary, 30000) - v_threshold) * v_rate
  );

  -- Years to clear without EP (simple approximation)
  IF v_annual_repayment > 0 AND v_loan_profile.estimated_balance > 0 THEN
    v_years_to_clear := v_loan_profile.estimated_balance / v_annual_repayment;
  ELSE
    v_years_to_clear := 30; -- write-off period
  END IF;

  -- Years to clear with EP contributions (annual EP = monthly_gbp * 12)
  IF (v_annual_repayment + v_monthly_gbp * 12) > 0 AND v_loan_profile.estimated_balance > 0 THEN
    v_years_with_ep := v_loan_profile.estimated_balance / (v_annual_repayment + v_monthly_gbp * 12);
  ELSE
    v_years_with_ep := v_years_to_clear;
  END IF;

  -- Interest saved (approximation: years difference * annual interest on remaining balance)
  v_interest_saved := GREATEST(0,
    (v_years_to_clear - v_years_with_ep) * v_loan_profile.estimated_balance * v_interest_rate * 0.5
  );

  v_result := jsonb_build_object(
    'monthly_ep_rate',          ROUND(v_monthly_ep::NUMERIC, 0),
    'monthly_gbp_rate',         ROUND(v_monthly_gbp::NUMERIC, 2),
    'current_ep_balance',       COALESCE(v_wallet.available_ep, 0) + COALESCE(v_wallet.pending_ep, 0),
    'years_to_clear_base',      ROUND(LEAST(v_years_to_clear, 30)::NUMERIC, 1),
    'years_to_clear_with_ep',   ROUND(LEAST(v_years_with_ep, 30)::NUMERIC, 1),
    'years_earlier',            ROUND(GREATEST(0, v_years_to_clear - v_years_with_ep)::NUMERIC, 1),
    'interest_saved',           ROUND(v_interest_saved::NUMERIC, 2),
    'projected_completion_date', (NOW() + (LEAST(v_years_with_ep, 30) * INTERVAL '1 year'))::DATE,
    'loan_plan',                v_loan_profile.loan_plan,
    'estimated_balance',        v_loan_profile.estimated_balance
  );

  RETURN v_result;
END;
$$;
