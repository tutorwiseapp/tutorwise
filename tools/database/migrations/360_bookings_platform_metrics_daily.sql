-- Migration 360: Bookings Platform Metrics Daily
-- Phase: Conductor Phase 3 — Bookings Intelligence (Stage 5)
-- Table: bookings_platform_metrics_daily + compute_bookings_platform_metrics()
-- Spec: conductor/bookings-intelligence-spec.md
-- Agent: Retention Monitor (query_booking_health tool)
-- pg_cron: daily 06:30 UTC

CREATE TABLE IF NOT EXISTS bookings_platform_metrics_daily (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date                 date NOT NULL UNIQUE,
  -- Volume
  total_bookings_30d          integer NOT NULL DEFAULT 0,
  confirmed_30d               integer NOT NULL DEFAULT 0,
  completed_30d               integer NOT NULL DEFAULT 0,
  cancelled_30d               integer NOT NULL DEFAULT 0,
  no_show_30d                 integer NOT NULL DEFAULT 0,
  pending_unscheduled         integer NOT NULL DEFAULT 0,
  -- Rates
  cancellation_rate_pct       numeric(5,2),
  no_show_rate_pct            numeric(5,2),
  scheduling_completion_rate  numeric(5,2),
  payment_capture_rate        numeric(5,2),
  repeat_booking_rate_pct     numeric(5,2),
  -- Revenue (stored in pence)
  gmv_30d_pence               bigint NOT NULL DEFAULT 0,
  platform_revenue_30d_pence  bigint NOT NULL DEFAULT 0,
  refunds_30d_pence           bigint NOT NULL DEFAULT 0,
  avg_booking_value_pence     integer,
  referral_gmv_pence          bigint NOT NULL DEFAULT 0,
  referral_gmv_pct            numeric(5,2),
  -- Scheduling
  avg_hours_to_schedule       numeric(6,1),
  stalled_over_48h            integer NOT NULL DEFAULT 0,
  stalled_over_7d             integer NOT NULL DEFAULT 0,
  -- Risk
  disputed_count              integer NOT NULL DEFAULT 0,
  high_cancel_tutors          integer NOT NULL DEFAULT 0,
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_platform_metrics_daily_date
  ON bookings_platform_metrics_daily (metric_date DESC);

ALTER TABLE bookings_platform_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY bpm_admin ON bookings_platform_metrics_daily FOR ALL USING (is_admin());

CREATE OR REPLACE FUNCTION compute_bookings_platform_metrics()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO bookings_platform_metrics_daily (
    metric_date, total_bookings_30d, confirmed_30d, completed_30d, cancelled_30d,
    no_show_30d, pending_unscheduled, cancellation_rate_pct, no_show_rate_pct,
    gmv_30d_pence, platform_revenue_30d_pence, refunds_30d_pence,
    avg_booking_value_pence, referral_gmv_pence, referral_gmv_pct,
    stalled_over_48h, stalled_over_7d, disputed_count, high_cancel_tutors
  )
  SELECT
    CURRENT_DATE,
    COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days'),
    COUNT(*) FILTER (WHERE status = 'Confirmed' AND created_at >= now() - interval '30 days'),
    COUNT(*) FILTER (WHERE status = 'Completed' AND created_at >= now() - interval '30 days'),
    COUNT(*) FILTER (WHERE status = 'Cancelled' AND created_at >= now() - interval '30 days'),
    COUNT(*) FILTER (WHERE status = 'No-Show' AND created_at >= now() - interval '30 days'),
    COUNT(*) FILTER (WHERE status = 'Confirmed' AND scheduling_status != 'scheduled'),
    -- Rates
    ROUND(
      COUNT(*) FILTER (WHERE status = 'Cancelled' AND created_at >= now() - interval '30 days')::numeric /
      NULLIF(COUNT(*) FILTER (WHERE status IN ('Confirmed','Cancelled','Completed')
        AND created_at >= now() - interval '30 days'), 0) * 100, 2
    ),
    ROUND(
      COUNT(*) FILTER (WHERE status = 'No-Show' AND created_at >= now() - interval '30 days')::numeric /
      NULLIF(COUNT(*) FILTER (WHERE status IN ('Completed','No-Show')
        AND created_at >= now() - interval '30 days'), 0) * 100, 2
    ),
    -- Revenue (pence)
    COALESCE(SUM(amount_total) FILTER (WHERE payment_status = 'Paid'
      AND created_at >= now() - interval '30 days'), 0),
    COALESCE(SUM(amount_platform) FILTER (WHERE payment_status = 'Paid'
      AND created_at >= now() - interval '30 days'), 0),
    COALESCE(ABS(SUM(amount_total)) FILTER (WHERE payment_status = 'Refunded'
      AND created_at >= now() - interval '30 days'), 0),
    ROUND(AVG(amount_total) FILTER (WHERE payment_status = 'Paid'
      AND created_at >= now() - interval '30 days'))::integer,
    -- Referral GMV (bookings with agent_id set — referred bookings)
    COALESCE(SUM(amount_total) FILTER (WHERE payment_status = 'Paid'
      AND agent_id IS NOT NULL
      AND created_at >= now() - interval '30 days'), 0),
    ROUND(
      COALESCE(SUM(amount_total) FILTER (WHERE payment_status = 'Paid'
        AND agent_id IS NOT NULL
        AND created_at >= now() - interval '30 days'), 0)::numeric /
      NULLIF(SUM(amount_total) FILTER (WHERE payment_status = 'Paid'
        AND created_at >= now() - interval '30 days'), 0) * 100, 2
    ),
    -- Scheduling stalls
    COUNT(*) FILTER (WHERE status = 'Confirmed'
      AND scheduling_status != 'scheduled'
      AND created_at < now() - interval '48 hours'),
    COUNT(*) FILTER (WHERE status = 'Confirmed'
      AND scheduling_status != 'scheduled'
      AND created_at < now() - interval '7 days'),
    -- Disputes
    COUNT(*) FILTER (WHERE payment_status = 'Disputed'),
    -- High-cancel tutors (tutor cancel rate > 30% with ≥3 cancellations in 30d)
    (SELECT COUNT(DISTINCT tutor_profile_id) FROM (
      SELECT
        tutor_profile_id,
        COUNT(*) FILTER (WHERE status = 'Cancelled') AS cancel_count,
        ROUND(COUNT(*) FILTER (WHERE status = 'Cancelled')::numeric /
          NULLIF(COUNT(*) FILTER (WHERE status IN ('Confirmed','Completed','Cancelled')), 0) * 100, 1) AS cancel_rate
      FROM bookings
      WHERE created_at >= now() - interval '30 days'
      GROUP BY tutor_profile_id
      HAVING COUNT(*) FILTER (WHERE status = 'Cancelled') >= 3
    ) hct WHERE cancel_rate >= 30)
  FROM bookings
  ON CONFLICT (metric_date) DO UPDATE SET
    total_bookings_30d         = EXCLUDED.total_bookings_30d,
    confirmed_30d              = EXCLUDED.confirmed_30d,
    completed_30d              = EXCLUDED.completed_30d,
    cancelled_30d              = EXCLUDED.cancelled_30d,
    no_show_30d                = EXCLUDED.no_show_30d,
    pending_unscheduled        = EXCLUDED.pending_unscheduled,
    cancellation_rate_pct      = EXCLUDED.cancellation_rate_pct,
    no_show_rate_pct           = EXCLUDED.no_show_rate_pct,
    gmv_30d_pence              = EXCLUDED.gmv_30d_pence,
    platform_revenue_30d_pence = EXCLUDED.platform_revenue_30d_pence,
    refunds_30d_pence          = EXCLUDED.refunds_30d_pence,
    avg_booking_value_pence    = EXCLUDED.avg_booking_value_pence,
    referral_gmv_pence         = EXCLUDED.referral_gmv_pence,
    referral_gmv_pct           = EXCLUDED.referral_gmv_pct,
    stalled_over_48h           = EXCLUDED.stalled_over_48h,
    stalled_over_7d            = EXCLUDED.stalled_over_7d,
    disputed_count             = EXCLUDED.disputed_count,
    high_cancel_tutors         = EXCLUDED.high_cancel_tutors,
    created_at                 = now();
END;
$$;

-- pg_cron: daily 06:30 UTC
SELECT cron.schedule(
  'compute-bookings-platform-metrics',
  '30 6 * * *',
  'SELECT compute_bookings_platform_metrics()'
);
