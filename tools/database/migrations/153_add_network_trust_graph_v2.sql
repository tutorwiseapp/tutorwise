-- Migration: Add Network Trust Graph (v2 - Schema Corrected)
-- Created: 2025-12-31
-- Purpose: Track network connections and trust propagation for SEO eligibility
-- Phase: Trust-First SEO - Phase 3.1

-- ============================================================================
-- 1. Drop previous version if exists (safe cleanup)
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_referral_network_edge ON referrals;
DROP TRIGGER IF EXISTS trigger_review_network_edge ON profile_reviews;
DROP TRIGGER IF EXISTS trigger_booking_network_edge ON bookings;
DROP TRIGGER IF EXISTS trigger_connection_network_edge ON group_members;
DROP FUNCTION IF EXISTS auto_create_network_edge();
DROP FUNCTION IF EXISTS sync_network_trust_edges();
DROP FUNCTION IF EXISTS refresh_network_trust_metrics();
DROP MATERIALIZED VIEW IF EXISTS network_trust_metrics;
DROP TABLE IF EXISTS network_trust_edges;

-- ============================================================================
-- 2. Create network_trust_edges table
-- ============================================================================

-- Track network connections between users with weighted trust scores
CREATE TABLE network_trust_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trust_weight real NOT NULL DEFAULT 1.0 CHECK (trust_weight >= 0.0 AND trust_weight <= 1.0),
  connection_type text NOT NULL CHECK (connection_type IN ('referral', 'review', 'booking', 'connection')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Prevent duplicate edges
  UNIQUE(from_user_id, to_user_id, connection_type)
);

CREATE INDEX idx_network_trust_from ON network_trust_edges(from_user_id);
CREATE INDEX idx_network_trust_to ON network_trust_edges(to_user_id);
CREATE INDEX idx_network_trust_type ON network_trust_edges(connection_type);
CREATE INDEX idx_network_trust_weight ON network_trust_edges(trust_weight DESC);

COMMENT ON TABLE network_trust_edges IS 'Network graph tracking trust relationships between users for SEO eligibility';
COMMENT ON COLUMN network_trust_edges.trust_weight IS 'Trust weight from 0.0 to 1.0 (higher = more trusted connection)';
COMMENT ON COLUMN network_trust_edges.connection_type IS 'Type of connection: referral (sent/received), review (given/received), booking (completed), connection (group member)';

-- ============================================================================
-- 3. Create materialized view for network trust metrics
-- ============================================================================

-- Materialized view for fast lookup of network trust density
-- Updated daily via manual refresh or pg_cron
CREATE MATERIALIZED VIEW network_trust_metrics AS
SELECT
  user_id,
  connection_count,
  avg_trust_weight,
  weighted_trust_score,
  trust_density,
  high_trust_connection_count,
  now() as updated_at
FROM (
  SELECT
    user_id,
    COUNT(DISTINCT connected_user_id) as connection_count,
    AVG(trust_weight) as avg_trust_weight,
    -- PageRank-style calculation: sum of (edge weight * connected user's CaaS score)
    SUM(trust_weight * COALESCE(connected_user_caas, 0) / 100.0) as weighted_trust_score,
    -- Trust density: ratio of actual connections to potential connections (capped at 1.0)
    LEAST(COUNT(DISTINCT connected_user_id)::real / 20.0, 1.0) as trust_density,
    -- Count of high-trust connections (connected user has CaaS >= 60)
    COUNT(DISTINCT CASE WHEN connected_user_caas >= 60 THEN connected_user_id END) as high_trust_connection_count
  FROM (
    -- Outgoing connections (from_user_id)
    SELECT
      nte.from_user_id as user_id,
      nte.to_user_id as connected_user_id,
      nte.trust_weight,
      cs.total_score as connected_user_caas
    FROM network_trust_edges nte
    LEFT JOIN caas_scores cs ON cs.profile_id = nte.to_user_id

    UNION ALL

    -- Incoming connections (to_user_id)
    SELECT
      nte.to_user_id as user_id,
      nte.from_user_id as connected_user_id,
      nte.trust_weight,
      cs.total_score as connected_user_caas
    FROM network_trust_edges nte
    LEFT JOIN caas_scores cs ON cs.profile_id = nte.from_user_id
  ) network_connections
  GROUP BY user_id
) metrics;

CREATE UNIQUE INDEX idx_network_trust_metrics_user ON network_trust_metrics(user_id);
CREATE INDEX idx_network_trust_metrics_density ON network_trust_metrics(trust_density DESC);
CREATE INDEX idx_network_trust_metrics_weighted ON network_trust_metrics(weighted_trust_score DESC);

COMMENT ON MATERIALIZED VIEW network_trust_metrics IS 'Aggregated network trust metrics for fast SEO eligibility lookups (refreshed daily)';
COMMENT ON COLUMN network_trust_metrics.connection_count IS 'Total number of unique connections (bidirectional)';
COMMENT ON COLUMN network_trust_metrics.avg_trust_weight IS 'Average trust weight across all connections';
COMMENT ON COLUMN network_trust_metrics.weighted_trust_score IS 'PageRank-style score: sum of (edge weight * connected user CaaS)';
COMMENT ON COLUMN network_trust_metrics.trust_density IS 'Connection density ratio (connections / 20), capped at 1.0';
COMMENT ON COLUMN network_trust_metrics.high_trust_connection_count IS 'Count of connections to users with CaaS >= 60';

-- ============================================================================
-- 4. Create refresh function for materialized view
-- ============================================================================

-- Function to refresh network trust metrics (call manually or via pg_cron)
CREATE OR REPLACE FUNCTION refresh_network_trust_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY network_trust_metrics;
  RAISE NOTICE 'Network trust metrics refreshed successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_network_trust_metrics IS 'Refreshes network_trust_metrics materialized view (call manually or via pg_cron daily)';

-- ============================================================================
-- 5. Create function to sync network edges from existing data
-- ============================================================================

-- Function to populate network_trust_edges from existing relationships
CREATE OR REPLACE FUNCTION sync_network_trust_edges()
RETURNS void AS $$
DECLARE
  v_referral_count integer;
  v_review_count integer;
  v_booking_count integer;
  v_connection_count integer;
BEGIN
  RAISE NOTICE 'Starting network trust edges sync...';

  -- Sync referral edges (agent_id -> referred_profile_id)
  INSERT INTO network_trust_edges (from_user_id, to_user_id, trust_weight, connection_type)
  SELECT
    agent_id as from_user_id,
    referred_profile_id as to_user_id,
    0.8 as trust_weight, -- Referrals have high trust weight
    'referral' as connection_type
  FROM referrals
  WHERE referred_profile_id IS NOT NULL
  ON CONFLICT (from_user_id, to_user_id, connection_type) DO NOTHING;

  GET DIAGNOSTICS v_referral_count = ROW_COUNT;
  RAISE NOTICE 'Synced % referral edges', v_referral_count;

  -- Sync review edges (reviewer_id -> reviewee_id)
  INSERT INTO network_trust_edges (from_user_id, to_user_id, trust_weight, connection_type)
  SELECT
    reviewer_id as from_user_id,
    reviewee_id as to_user_id,
    CASE
      WHEN rating >= 4 THEN 0.9 -- 4-5 star reviews = high trust
      WHEN rating >= 3 THEN 0.6 -- 3 star reviews = moderate trust
      ELSE 0.3                  -- 1-2 star reviews = low trust
    END as trust_weight,
    'review' as connection_type
  FROM profile_reviews
  ON CONFLICT (from_user_id, to_user_id, connection_type) DO UPDATE
    SET trust_weight = EXCLUDED.trust_weight,
        updated_at = now();

  GET DIAGNOSTICS v_review_count = ROW_COUNT;
  RAISE NOTICE 'Synced % review edges', v_review_count;

  -- Sync booking edges (student_id <-> tutor_id)
  INSERT INTO network_trust_edges (from_user_id, to_user_id, trust_weight, connection_type)
  SELECT
    student_id as from_user_id,
    tutor_id as to_user_id,
    0.7 as trust_weight, -- Completed bookings = moderate-high trust
    'booking' as connection_type
  FROM bookings
  WHERE status = 'Completed'
    AND student_id IS NOT NULL
    AND tutor_id IS NOT NULL
  ON CONFLICT (from_user_id, to_user_id, connection_type) DO NOTHING;

  GET DIAGNOSTICS v_booking_count = ROW_COUNT;
  RAISE NOTICE 'Synced % booking edges', v_booking_count;

  -- Sync group member connections (members of same group)
  -- This creates bidirectional edges between all members of the same group
  INSERT INTO network_trust_edges (from_user_id, to_user_id, trust_weight, connection_type)
  SELECT DISTINCT
    gm1.profile_id as from_user_id,
    gm2.profile_id as to_user_id,
    0.5 as trust_weight, -- Group connections = moderate trust
    'connection' as connection_type
  FROM group_members gm1
  JOIN group_members gm2 ON gm1.group_id = gm2.group_id
  WHERE gm1.profile_id < gm2.profile_id -- Prevent duplicates and self-loops
  ON CONFLICT (from_user_id, to_user_id, connection_type) DO NOTHING;

  GET DIAGNOSTICS v_connection_count = ROW_COUNT;
  RAISE NOTICE 'Synced % connection edges', v_connection_count;

  -- Refresh materialized view after sync
  PERFORM refresh_network_trust_metrics();

  RAISE NOTICE 'Network trust edges sync completed: % referrals, % reviews, % bookings, % connections',
    v_referral_count, v_review_count, v_booking_count, v_connection_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_network_trust_edges IS 'Populates network_trust_edges from existing referrals, reviews, bookings, and group memberships';

-- ============================================================================
-- 6. Grant permissions (if using RLS)
-- ============================================================================

-- Network trust edges: read-only for authenticated users, write for system
ALTER TABLE network_trust_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own network edges"
  ON network_trust_edges
  FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Admins can view all network edges"
  ON network_trust_edges
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- 7. Initial data sync
-- ============================================================================

-- Run initial sync to populate edges from existing data
SELECT sync_network_trust_edges();

-- ============================================================================
-- 8. Future: Setup pg_cron job (optional - requires pg_cron extension)
-- ============================================================================

-- To enable automatic daily refresh, run this separately after ensuring pg_cron is enabled:
--
-- SELECT cron.schedule(
--   'refresh-network-trust-metrics',
--   '0 2 * * *', -- Daily at 2 AM
--   'SELECT refresh_network_trust_metrics();'
-- );

RAISE NOTICE 'Network trust graph migration completed successfully';
