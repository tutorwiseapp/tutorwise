-- Migration 355: CaaS Platform Metrics Daily
-- Phase: Conductor Phase 3 — CaaS Intelligence
-- Table: caas_platform_metrics_daily
-- Spec: conductor/caas-intelligence-spec.md
-- Agent: Operations Monitor (query_caas_health tool)
-- pg_cron: daily 05:30 UTC

CREATE TABLE IF NOT EXISTS caas_platform_metrics_daily (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date    date NOT NULL,
  role_type        text NOT NULL,    -- 'TUTOR' | 'CLIENT' | 'AGENT' | 'all'
  user_count       integer,
  median_score     numeric(5,1),
  avg_score        numeric(5,1),
  p25_score        numeric(5,1),
  p75_score        numeric(5,1),
  p90_score        numeric(5,1),
  outstanding_count integer,         -- 90+
  excellent_count   integer,         -- 80-89
  very_good_count   integer,         -- 70-79
  good_count        integer,         -- 60-69
  average_count     integer,         -- 50-59
  below_avg_count   integer,         -- 40-49
  poor_count        integer,         -- 0-39
  zero_score_count  integer,         -- = 0 (safety gate)
  stale_count       integer,         -- not recalculated in 30d for active users
  provisional_count integer,         -- using 0.70 multiplier
  avg_delivery_bucket    numeric(5,1),
  avg_credentials_bucket numeric(5,1),
  avg_network_bucket     numeric(5,1),
  avg_trust_bucket       numeric(5,1),
  avg_digital_bucket     numeric(5,1),
  avg_impact_bucket      numeric(5,1),
  created_at       timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS caas_platform_metrics_daily_date_role
  ON caas_platform_metrics_daily (snapshot_date, role_type);
CREATE INDEX IF NOT EXISTS caas_platform_metrics_daily_date
  ON caas_platform_metrics_daily (snapshot_date DESC);

ALTER TABLE caas_platform_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY caas_metrics_admin ON caas_platform_metrics_daily FOR ALL USING (is_admin());

-- Compute function: runs for each role_type in parallel
CREATE OR REPLACE FUNCTION compute_caas_platform_metrics()
RETURNS void AS $$
DECLARE
  role_val text;
BEGIN
  FOREACH role_val IN ARRAY ARRAY['TUTOR', 'CLIENT', 'AGENT', 'all'] LOOP
    INSERT INTO caas_platform_metrics_daily (
      snapshot_date, role_type, user_count, median_score, avg_score,
      p25_score, p75_score, p90_score,
      outstanding_count, excellent_count, very_good_count, good_count,
      average_count, below_avg_count, poor_count, zero_score_count,
      stale_count, provisional_count
    )
    SELECT
      CURRENT_DATE,
      role_val,
      COUNT(*),
      PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY cs.total_score),
      ROUND(AVG(cs.total_score)::numeric, 1),
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY cs.total_score),
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cs.total_score),
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY cs.total_score),
      COUNT(CASE WHEN cs.total_score >= 90                    THEN 1 END),
      COUNT(CASE WHEN cs.total_score BETWEEN 80 AND 89        THEN 1 END),
      COUNT(CASE WHEN cs.total_score BETWEEN 70 AND 79        THEN 1 END),
      COUNT(CASE WHEN cs.total_score BETWEEN 60 AND 69        THEN 1 END),
      COUNT(CASE WHEN cs.total_score BETWEEN 50 AND 59        THEN 1 END),
      COUNT(CASE WHEN cs.total_score BETWEEN 40 AND 49        THEN 1 END),
      COUNT(CASE WHEN cs.total_score < 40                     THEN 1 END),
      COUNT(CASE WHEN cs.total_score = 0                      THEN 1 END),
      COUNT(CASE
        WHEN cs.calculated_at < now() - interval '30 days'
         AND EXISTS (
           SELECT 1 FROM bookings b
           WHERE (b.tutor_profile_id = cs.profile_id OR b.client_profile_id = cs.profile_id)
             AND b.created_at > now() - interval '60 days'
         ) THEN 1
      END),
      COUNT(CASE
        WHEN (cs.score_breakdown->>'verification_status') = 'provisional' THEN 1
      END)
    FROM caas_scores cs
    JOIN profiles p ON p.id = cs.profile_id
    WHERE (role_val = 'all' OR cs.role_type = role_val)
    ON CONFLICT (snapshot_date, role_type) DO UPDATE
      SET user_count        = EXCLUDED.user_count,
          median_score      = EXCLUDED.median_score,
          avg_score         = EXCLUDED.avg_score,
          p25_score         = EXCLUDED.p25_score,
          p75_score         = EXCLUDED.p75_score,
          p90_score         = EXCLUDED.p90_score,
          outstanding_count = EXCLUDED.outstanding_count,
          excellent_count   = EXCLUDED.excellent_count,
          very_good_count   = EXCLUDED.very_good_count,
          good_count        = EXCLUDED.good_count,
          average_count     = EXCLUDED.average_count,
          below_avg_count   = EXCLUDED.below_avg_count,
          poor_count        = EXCLUDED.poor_count,
          zero_score_count  = EXCLUDED.zero_score_count,
          stale_count       = EXCLUDED.stale_count,
          provisional_count = EXCLUDED.provisional_count,
          created_at        = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- pg_cron: daily 05:30 UTC (before Operations Monitor at 07:00)
SELECT cron.schedule(
  'compute-caas-platform-metrics',
  '30 5 * * *',
  'SELECT compute_caas_platform_metrics()'
);
