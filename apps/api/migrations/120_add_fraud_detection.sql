/**
 * Migration 120: Attribution Fraud Detection System
 * Created: 2025-12-16
 * Purpose: ML-based anomaly detection for referral fraud
 * Deployment Time: ~3 minutes
 */

BEGIN;

-- ============================================================================
-- Table: referral_fraud_signals
-- ============================================================================
-- Tracks suspicious patterns for ML analysis

CREATE TABLE IF NOT EXISTS referral_fraud_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referral context
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  -- Signal type
  signal_type TEXT NOT NULL,
  -- Types: 'velocity_spike', 'same_ip', 'bot_pattern', 'timing_anomaly', 'conversion_too_fast'

  -- Signal strength
  severity TEXT NOT NULL DEFAULT 'medium',
  -- Values: 'low', 'medium', 'high', 'critical'

  -- Details
  signal_data JSONB NOT NULL DEFAULT '{}',
  -- Example: {"signups_last_hour": 50, "expected": 5, "ip_address": "1.2.3.4"}

  -- Investigation
  status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'investigating', 'confirmed_fraud', 'false_positive', 'resolved'

  investigated_by UUID REFERENCES profiles(id),
  investigated_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_signals_referral ON referral_fraud_signals(referral_id);
CREATE INDEX idx_fraud_signals_agent ON referral_fraud_signals(agent_id);
CREATE INDEX idx_fraud_signals_status ON referral_fraud_signals(status) WHERE status = 'pending';
CREATE INDEX idx_fraud_signals_severity ON referral_fraud_signals(severity) WHERE severity IN ('high', 'critical');

-- ============================================================================
-- Function: detect_velocity_spike
-- ============================================================================
-- Detect unusually high signup rates (>10 signups/hour)

CREATE OR REPLACE FUNCTION detect_velocity_spike()
RETURNS TRIGGER AS $$
DECLARE
  v_recent_signups INTEGER;
  v_agent_avg NUMERIC;
BEGIN
  -- Count signups in last hour for this agent
  SELECT COUNT(*) INTO v_recent_signups
  FROM referrals
  WHERE agent_id = NEW.agent_id
    AND status = 'Signed Up'
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Calculate agent's historical average
  SELECT AVG(hourly_count) INTO v_agent_avg
  FROM (
    SELECT COUNT(*) AS hourly_count
    FROM referrals
    WHERE agent_id = NEW.agent_id
      AND status = 'Signed Up'
      AND created_at > NOW() - INTERVAL '7 days'
      AND created_at < NOW() - INTERVAL '1 hour'
    GROUP BY DATE_TRUNC('hour', created_at)
  ) hourly_stats;

  -- Flag if current rate is 5x normal or >10 absolute
  IF v_recent_signups >= 10 OR (v_agent_avg > 0 AND v_recent_signups > v_agent_avg * 5) THEN
    INSERT INTO referral_fraud_signals (
      referral_id, agent_id, signal_type, severity, signal_data
    )
    VALUES (
      NEW.id,
      NEW.agent_id,
      'velocity_spike',
      CASE WHEN v_recent_signups >= 20 THEN 'critical' ELSE 'high' END,
      jsonb_build_object(
        'signups_last_hour', v_recent_signups,
        'agent_avg', COALESCE(v_agent_avg, 0),
        'threshold_exceeded', v_recent_signups::NUMERIC / NULLIF(v_agent_avg, 0)
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detect_velocity_spike
AFTER UPDATE OF status ON referrals
FOR EACH ROW
WHEN (NEW.status = 'Signed Up' AND OLD.status != 'Signed Up')
EXECUTE FUNCTION detect_velocity_spike();

-- ============================================================================
-- Function: detect_same_ip_cluster
-- ============================================================================
-- Detect multiple signups from same IP (bot farms)

CREATE OR REPLACE FUNCTION detect_same_ip_cluster()
RETURNS TRIGGER AS $$
DECLARE
  v_ip_count INTEGER;
BEGIN
  IF NEW.ip_address IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count signups from this IP in last 24 hours
  SELECT COUNT(*) INTO v_ip_count
  FROM referrals
  WHERE agent_id = NEW.agent_id
    AND ip_address = NEW.ip_address
    AND created_at > NOW() - INTERVAL '24 hours';

  -- Flag if >5 signups from same IP
  IF v_ip_count > 5 THEN
    INSERT INTO referral_fraud_signals (
      referral_id, agent_id, signal_type, severity, signal_data
    )
    VALUES (
      NEW.id,
      NEW.agent_id,
      'same_ip',
      CASE WHEN v_ip_count >= 10 THEN 'critical' ELSE 'high' END,
      jsonb_build_object(
        'ip_address', HOST(NEW.ip_address),
        'signup_count', v_ip_count,
        'timeframe_hours', 24
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detect_same_ip
AFTER INSERT ON referrals
FOR EACH ROW
EXECUTE FUNCTION detect_same_ip_cluster();

-- ============================================================================
-- Function: detect_conversion_too_fast
-- ============================================================================
-- Detect suspicious instant conversions (<5 minutes from signup to booking)

CREATE OR REPLACE FUNCTION detect_conversion_too_fast()
RETURNS TRIGGER AS $$
DECLARE
  v_signup_time TIMESTAMPTZ;
  v_time_diff INTERVAL;
BEGIN
  -- Get signup time
  SELECT created_at INTO v_signup_time
  FROM referrals
  WHERE id = NEW.id;

  -- Calculate time difference
  v_time_diff := NEW.converted_at - v_signup_time;

  -- Flag if converted in <5 minutes (suspicious)
  IF v_time_diff < INTERVAL '5 minutes' THEN
    INSERT INTO referral_fraud_signals (
      referral_id, agent_id, signal_type, severity, signal_data
    )
    VALUES (
      NEW.id,
      NEW.agent_id,
      'conversion_too_fast',
      'medium',
      jsonb_build_object(
        'time_to_conversion_seconds', EXTRACT(EPOCH FROM v_time_diff),
        'signup_at', v_signup_time,
        'converted_at', NEW.converted_at
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_detect_conversion_fast
AFTER UPDATE OF converted_at ON referrals
FOR EACH ROW
WHEN (NEW.converted_at IS NOT NULL AND OLD.converted_at IS NULL)
EXECUTE FUNCTION detect_conversion_too_fast();

-- ============================================================================
-- RPC: get_fraud_dashboard_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_fraud_dashboard_stats()
RETURNS TABLE (
  pending_investigations INTEGER,
  confirmed_frauds INTEGER,
  false_positives INTEGER,
  high_severity_pending INTEGER,
  total_blocked_commission NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER,
    COUNT(*) FILTER (WHERE status = 'confirmed_fraud')::INTEGER,
    COUNT(*) FILTER (WHERE status = 'false_positive')::INTEGER,
    COUNT(*) FILTER (WHERE status = 'pending' AND severity IN ('high', 'critical'))::INTEGER,
    COALESCE(
      SUM(t.amount) FILTER (
        WHERE fs.status = 'confirmed_fraud'
          AND t.type = 'Referral Commission'
          AND t.status IN ('pending', 'available')
      ),
      0
    )
  FROM referral_fraud_signals fs
  LEFT JOIN referrals r ON r.id = fs.referral_id
  LEFT JOIN transactions t ON t.profile_id = r.agent_id;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_fraud_dashboard_stats TO authenticated;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
/*
SELECT * FROM referral_fraud_signals ORDER BY created_at DESC LIMIT 10;
SELECT * FROM get_fraud_dashboard_stats();
*/
