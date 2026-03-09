-- Migration 363: VirtualSpace Platform Metrics Daily
-- Phase: Conductor Phase 3 — VirtualSpace Intelligence
-- Table: virtualspace_platform_metrics_daily + compute_virtualspace_platform_metrics()
-- Spec: conductor/virtualspace-intelligence-spec.md
-- Agent: Market Intelligence (query_virtualspace_health tool)
-- pg_cron: daily 08:00 UTC

CREATE TABLE IF NOT EXISTS virtualspace_platform_metrics_daily (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date                 date NOT NULL UNIQUE,
  -- Adoption
  booking_sessions_30d        integer NOT NULL DEFAULT 0,
  standalone_sessions_30d     integer NOT NULL DEFAULT 0,
  free_help_sessions_30d      integer NOT NULL DEFAULT 0,
  unique_tutors_30d           integer NOT NULL DEFAULT 0,
  adoption_rate_pct           numeric(5,2),
  -- Quality
  completion_rate_pct         numeric(5,2),
  avg_duration_minutes        numeric(6,1),
  whiteboard_adoption_pct     numeric(5,2),
  on_time_rate_pct            numeric(5,2),
  -- Free help funnel
  free_help_completed_30d     integer NOT NULL DEFAULT 0,
  free_help_converted_30d     integer NOT NULL DEFAULT 0,
  free_help_conversion_rate_pct numeric(5,2),
  tutors_online_avg_daily     numeric(4,1),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS virtualspace_platform_metrics_daily_date
  ON virtualspace_platform_metrics_daily (metric_date DESC);

ALTER TABLE virtualspace_platform_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY vspm_admin ON virtualspace_platform_metrics_daily FOR ALL USING (is_admin());

CREATE OR REPLACE FUNCTION compute_virtualspace_platform_metrics()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_active_tutors integer;
  v_unique_tutors integer;
  v_adoption_rate numeric(5,2);
  v_free_help_completed integer;
  v_free_help_converted integer;
BEGIN
  SELECT COUNT(*) INTO v_active_tutors
  FROM profiles WHERE role = 'tutor' AND status = 'active';

  SELECT COUNT(DISTINCT owner_id) INTO v_unique_tutors
  FROM virtualspace_sessions
  WHERE created_at >= now() - interval '30 days';

  v_adoption_rate := ROUND(v_unique_tutors::numeric / NULLIF(v_active_tutors, 0) * 100, 2);

  -- Free help funnel
  SELECT COUNT(*) INTO v_free_help_completed
  FROM virtualspace_sessions
  WHERE session_type = 'free_help' AND status = 'completed'
    AND created_at >= now() - interval '30 days';

  SELECT COUNT(DISTINCT fh.id) INTO v_free_help_converted
  FROM virtualspace_sessions fh
  JOIN virtualspace_participants vp ON vp.session_id = fh.id AND vp.role = 'collaborator'
  JOIN bookings b ON b.client_profile_id = vp.profile_id
    AND b.created_at BETWEEN fh.completed_at AND fh.completed_at + interval '14 days'
    AND b.status IN ('Confirmed', 'Completed')
  WHERE fh.session_type = 'free_help' AND fh.status = 'completed'
    AND fh.created_at >= now() - interval '30 days';

  INSERT INTO virtualspace_platform_metrics_daily (
    metric_date,
    booking_sessions_30d, standalone_sessions_30d, free_help_sessions_30d,
    unique_tutors_30d, adoption_rate_pct,
    completion_rate_pct, avg_duration_minutes, whiteboard_adoption_pct, on_time_rate_pct,
    free_help_completed_30d, free_help_converted_30d, free_help_conversion_rate_pct
  )
  SELECT
    CURRENT_DATE,
    COUNT(*) FILTER (WHERE session_type = 'booking' AND created_at >= now() - interval '30 days'),
    COUNT(*) FILTER (WHERE session_type = 'standalone' AND created_at >= now() - interval '30 days'),
    COUNT(*) FILTER (WHERE session_type = 'free_help' AND created_at >= now() - interval '30 days'),
    v_unique_tutors,
    v_adoption_rate,
    -- Completion rate
    ROUND(
      COUNT(*) FILTER (WHERE status = 'completed')::numeric /
      NULLIF(COUNT(*) FILTER (WHERE status IN ('completed','expired')), 0) * 100, 1
    ),
    -- Avg duration
    ROUND(
      AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60)
      FILTER (WHERE status = 'completed' AND started_at IS NOT NULL)::numeric, 1
    ),
    -- Whiteboard adoption
    ROUND(
      COUNT(*) FILTER (
        WHERE status = 'completed'
          AND (artifacts->>'whiteboard_snapshot_url') IS NOT NULL
      )::numeric /
      NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0) * 100, 1
    ),
    -- On-time rate (sessions that started within 30min of booking's session_start_time)
    (SELECT ROUND(
       COUNT(*) FILTER (
         WHERE ABS(EXTRACT(EPOCH FROM (vs.started_at - b.session_start_time))) <= 1800
       )::numeric / NULLIF(COUNT(*), 0) * 100, 1
     )
     FROM virtualspace_sessions vs
     JOIN bookings b ON vs.booking_id = b.id
     WHERE vs.session_type = 'booking' AND vs.status = 'completed'
       AND vs.started_at IS NOT NULL AND b.session_start_time IS NOT NULL
       AND vs.created_at >= now() - interval '30 days'),
    v_free_help_completed,
    v_free_help_converted,
    ROUND(v_free_help_converted::numeric / NULLIF(v_free_help_completed, 0) * 100, 2)
  FROM virtualspace_sessions
  WHERE created_at >= now() - interval '30 days'
  ON CONFLICT (metric_date) DO UPDATE SET
    booking_sessions_30d        = EXCLUDED.booking_sessions_30d,
    standalone_sessions_30d     = EXCLUDED.standalone_sessions_30d,
    free_help_sessions_30d      = EXCLUDED.free_help_sessions_30d,
    unique_tutors_30d           = EXCLUDED.unique_tutors_30d,
    adoption_rate_pct           = EXCLUDED.adoption_rate_pct,
    completion_rate_pct         = EXCLUDED.completion_rate_pct,
    avg_duration_minutes        = EXCLUDED.avg_duration_minutes,
    whiteboard_adoption_pct     = EXCLUDED.whiteboard_adoption_pct,
    on_time_rate_pct            = EXCLUDED.on_time_rate_pct,
    free_help_completed_30d     = EXCLUDED.free_help_completed_30d,
    free_help_converted_30d     = EXCLUDED.free_help_converted_30d,
    free_help_conversion_rate_pct = EXCLUDED.free_help_conversion_rate_pct,
    created_at                  = now();
END;
$$;

-- pg_cron: daily 08:00 UTC
SELECT cron.schedule(
  'compute-virtualspace-platform-metrics',
  '0 8 * * *',
  'SELECT compute_virtualspace_platform_metrics()'
);
