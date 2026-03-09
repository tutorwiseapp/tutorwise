-- Migration 362: Financials Platform Metrics Daily
-- Phase: Conductor Phase 3 — Financials Intelligence
-- Table: financials_platform_metrics_daily + compute_financials_platform_metrics()
-- Spec: conductor/financials-intelligence-spec.md
-- Agent: Retention Monitor (query_financial_health tool)
-- pg_cron: daily 07:30 UTC

CREATE TABLE IF NOT EXISTS financials_platform_metrics_daily (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date                   date NOT NULL UNIQUE,
  -- Clearing
  total_in_clearing_pence       bigint NOT NULL DEFAULT 0,
  transactions_in_clearing      integer NOT NULL DEFAULT 0,
  stalled_over_14d              integer NOT NULL DEFAULT 0,
  avg_clearing_days             numeric(5,1),
  -- Payouts
  total_paid_out_30d_pence      bigint NOT NULL DEFAULT 0,
  payout_transactions_30d       integer NOT NULL DEFAULT 0,
  payout_success_rate_pct       numeric(5,2),
  tutors_paid_30d               integer NOT NULL DEFAULT 0,
  tutors_with_available_not_paid integer NOT NULL DEFAULT 0,
  -- Revenue
  platform_fee_30d_pence        bigint NOT NULL DEFAULT 0,
  referral_commission_30d_pence bigint NOT NULL DEFAULT 0,
  refunds_30d_pence             bigint NOT NULL DEFAULT 0,
  reversals_30d_pence           bigint NOT NULL DEFAULT 0,
  net_platform_revenue_30d_pence bigint NOT NULL DEFAULT 0,
  refund_rate_pct               numeric(5,2),
  -- Disputes
  open_disputes                 integer NOT NULL DEFAULT 0,
  resolved_disputes_30d         integer NOT NULL DEFAULT 0,
  avg_days_to_resolve           numeric(5,1),
  -- Anomalies
  unreversed_refunds            integer NOT NULL DEFAULT 0,
  duplicate_payout_risk         integer NOT NULL DEFAULT 0,
  created_at                    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS financials_platform_metrics_daily_date
  ON financials_platform_metrics_daily (metric_date DESC);

ALTER TABLE financials_platform_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY fpm_admin ON financials_platform_metrics_daily FOR ALL USING (is_admin());

CREATE OR REPLACE FUNCTION compute_financials_platform_metrics()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_platform_fee      bigint;
  v_referral_comm     bigint;
  v_refunds           bigint;
  v_reversals         bigint;
BEGIN
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE type = 'Platform Fee'
      AND created_at >= now() - interval '30 days'), 0),
    COALESCE(SUM(amount) FILTER (WHERE type IN ('Referral Commission', 'Agent Commission')
      AND created_at >= now() - interval '30 days'), 0),
    COALESCE(ABS(SUM(amount)) FILTER (WHERE type = 'Refund'
      AND created_at >= now() - interval '30 days'), 0),
    COALESCE(ABS(SUM(amount)) FILTER (WHERE status = 'reversed'
      AND created_at >= now() - interval '30 days'), 0)
  INTO v_platform_fee, v_referral_comm, v_refunds, v_reversals
  FROM transactions;

  INSERT INTO financials_platform_metrics_daily (
    metric_date,
    total_in_clearing_pence, transactions_in_clearing, stalled_over_14d, avg_clearing_days,
    total_paid_out_30d_pence, payout_transactions_30d, payout_success_rate_pct,
    tutors_paid_30d, tutors_with_available_not_paid,
    platform_fee_30d_pence, referral_commission_30d_pence,
    refunds_30d_pence, reversals_30d_pence, net_platform_revenue_30d_pence, refund_rate_pct,
    open_disputes, resolved_disputes_30d,
    unreversed_refunds, duplicate_payout_risk
  )
  SELECT
    CURRENT_DATE,
    -- Clearing
    (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE status = 'clearing'),
    (SELECT COUNT(*) FROM transactions WHERE status = 'clearing'),
    (SELECT COUNT(*) FROM transactions WHERE status = 'clearing'
       AND created_at < now() - interval '14 days'),
    (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (now() - created_at)) / 86400)
       FILTER (WHERE status = 'clearing' AND created_at >= now() - interval '30 days')::numeric, 1)
     FROM transactions),
    -- Payouts
    (SELECT COALESCE(SUM(amount), 0) FROM transactions
       WHERE type = 'Tutoring Payout' AND status = 'paid_out'
         AND created_at >= now() - interval '30 days'),
    (SELECT COUNT(*) FROM transactions
       WHERE type = 'Tutoring Payout' AND status = 'paid_out'
         AND created_at >= now() - interval '30 days'),
    (SELECT ROUND(
       COUNT(*) FILTER (WHERE status = 'paid_out')::numeric /
       NULLIF(COUNT(*) FILTER (WHERE status IN ('paid_out','failed','disputed')), 0) * 100, 2
     ) FROM transactions
       WHERE type = 'Tutoring Payout' AND created_at >= now() - interval '30 days'),
    (SELECT COUNT(DISTINCT profile_id) FROM transactions
       WHERE type = 'Tutoring Payout' AND status = 'paid_out'
         AND created_at >= now() - interval '30 days'),
    (SELECT COUNT(DISTINCT profile_id) FROM transactions
       WHERE type IN ('Tutoring Payout','Referral Commission')
         AND status = 'available'
       GROUP BY profile_id
       HAVING SUM(amount) > 0),
    -- Revenue
    v_platform_fee,
    v_referral_comm,
    v_refunds,
    v_reversals,
    v_platform_fee + v_referral_comm - v_refunds - v_reversals,
    -- Refund rate vs GMV
    (SELECT ROUND(
       COALESCE(ABS(SUM(amount)) FILTER (WHERE type = 'Refund'
         AND created_at >= now() - interval '30 days'), 0)::numeric /
       NULLIF(SUM(amount) FILTER (WHERE type = 'Booking Payment'
         AND status = 'paid_out' AND created_at >= now() - interval '30 days'), 0) * 100, 2
     ) FROM transactions),
    -- Disputes
    (SELECT COUNT(*) FROM bookings WHERE payment_status = 'Disputed'),
    (SELECT COUNT(*) FROM bookings WHERE payment_status = 'Disputed'
       AND updated_at >= now() - interval '30 days'
       AND payment_status != 'Disputed'),  -- resolved: moved out of Disputed in 30d
    -- Unreversed refunds
    (SELECT COUNT(DISTINCT b.id)
     FROM bookings b
     WHERE b.payment_status = 'Refunded'
       AND b.updated_at >= now() - interval '30 days'
       AND EXISTS (
         SELECT 1 FROM transactions t
         WHERE t.booking_id = b.id
           AND t.type IN ('Referral Commission', 'Tutoring Payout')
           AND t.status NOT IN ('refunded', 'reversed')
       )),
    -- Duplicate payout risk
    (SELECT COUNT(*) FROM (
       SELECT booking_id, type, COUNT(*) AS cnt
       FROM transactions
       WHERE type = 'Tutoring Payout'
         AND status NOT IN ('reversed', 'refunded')
       GROUP BY booking_id, type
       HAVING COUNT(*) > 1
     ) dups)
  ON CONFLICT (metric_date) DO UPDATE SET
    total_in_clearing_pence        = EXCLUDED.total_in_clearing_pence,
    transactions_in_clearing       = EXCLUDED.transactions_in_clearing,
    stalled_over_14d               = EXCLUDED.stalled_over_14d,
    avg_clearing_days              = EXCLUDED.avg_clearing_days,
    total_paid_out_30d_pence       = EXCLUDED.total_paid_out_30d_pence,
    payout_transactions_30d        = EXCLUDED.payout_transactions_30d,
    payout_success_rate_pct        = EXCLUDED.payout_success_rate_pct,
    tutors_paid_30d                = EXCLUDED.tutors_paid_30d,
    tutors_with_available_not_paid = EXCLUDED.tutors_with_available_not_paid,
    platform_fee_30d_pence         = EXCLUDED.platform_fee_30d_pence,
    referral_commission_30d_pence  = EXCLUDED.referral_commission_30d_pence,
    refunds_30d_pence              = EXCLUDED.refunds_30d_pence,
    reversals_30d_pence            = EXCLUDED.reversals_30d_pence,
    net_platform_revenue_30d_pence = EXCLUDED.net_platform_revenue_30d_pence,
    refund_rate_pct                = EXCLUDED.refund_rate_pct,
    open_disputes                  = EXCLUDED.open_disputes,
    resolved_disputes_30d          = EXCLUDED.resolved_disputes_30d,
    unreversed_refunds             = EXCLUDED.unreversed_refunds,
    duplicate_payout_risk          = EXCLUDED.duplicate_payout_risk,
    created_at                     = now();
END;
$$;

-- pg_cron: daily 07:30 UTC
SELECT cron.schedule(
  'compute-financials-platform-metrics',
  '30 7 * * *',
  'SELECT compute_financials_platform_metrics()'
);
