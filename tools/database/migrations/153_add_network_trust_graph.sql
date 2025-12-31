-- Migration: Add Network Trust Graph
-- Created: 2025-12-31
-- Purpose: Track network connections and trust propagation for SEO eligibility
-- Phase: Trust-First SEO - Phase 3.1

-- ============================================================================
-- 1. Create network_trust_edges table
-- ============================================================================

-- Track network connections between users with weighted trust scores
CREATE TABLE IF NOT EXISTS network_trust_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
COMMENT ON COLUMN network_trust_edges.connection_type IS 'Type of connection: referral (sent/received), review (given/received), booking (completed), connection (mutual)';

-- ============================================================================
-- 2. Create materialized view for network trust metrics
-- ============================================================================

-- Materialized view for fast lookup of network trust density
-- Updated daily via pg_cron
CREATE MATERIALIZED VIEW IF NOT EXISTS network_trust_metrics AS
SELECT
  user_id,
  connection_count,
  avg_trust_weight,
  weighted_trust_score,
  trust_density,
  high_trust_connection_count,
  updated_at
FROM (
  SELECT
    user_id,
    COUNT(DISTINCT connected_user_id) as connection_count,
    AVG(trust_weight) as avg_trust_weight,
    -- PageRank-style calculation: sum of (edge weight * connected user's CaaS score)
    SUM(trust_weight * connected_user_caas / 100.0) as weighted_trust_score,
    -- Trust density: ratio of actual connections to potential connections (capped at 1.0)
    LEAST(COUNT(DISTINCT connected_user_id)::real / 20.0, 1.0) as trust_density,
    -- Count of high-trust connections (connected user has CaaS >= 60)
    COUNT(DISTINCT CASE WHEN connected_user_caas >= 60 THEN connected_user_id END) as high_trust_connection_count,
    now() as updated_at
  FROM (
    -- Outgoing connections (from_user_id)
    SELECT
      nte.from_user_id as user_id,
      nte.to_user_id as connected_user_id,
      nte.trust_weight,
      COALESCE(cs.total_score, 0) as connected_user_caas
    FROM network_trust_edges nte
    LEFT JOIN caas_scores cs ON cs.user_id = nte.to_user_id

    UNION ALL

    -- Incoming connections (to_user_id)
    SELECT
      nte.to_user_id as user_id,
      nte.from_user_id as connected_user_id,
      nte.trust_weight,
      COALESCE(cs.total_score, 0) as connected_user_caas
    FROM network_trust_edges nte
    LEFT JOIN caas_scores cs ON cs.user_id = nte.from_user_id
  ) network_connections
  GROUP BY user_id
) metrics;

CREATE UNIQUE INDEX IF NOT EXISTS idx_network_trust_metrics_user ON network_trust_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_network_trust_metrics_density ON network_trust_metrics(trust_density DESC);
CREATE INDEX IF NOT EXISTS idx_network_trust_metrics_weighted ON network_trust_metrics(weighted_trust_score DESC);

COMMENT ON MATERIALIZED VIEW network_trust_metrics IS 'Aggregated network trust metrics for fast SEO eligibility lookups (refreshed daily)';
COMMENT ON COLUMN network_trust_metrics.connection_count IS 'Total number of unique connections (bidirectional)';
COMMENT ON COLUMN network_trust_metrics.avg_trust_weight IS 'Average trust weight across all connections';
COMMENT ON COLUMN network_trust_metrics.weighted_trust_score IS 'PageRank-style score: sum of (edge weight * connected user CaaS)';
COMMENT ON COLUMN network_trust_metrics.trust_density IS 'Connection density ratio (connections / 20), capped at 1.0';
COMMENT ON COLUMN network_trust_metrics.high_trust_connection_count IS 'Count of connections to users with CaaS >= 60';

-- ============================================================================
-- 3. Create refresh function for materialized view
-- ============================================================================

-- Function to refresh network trust metrics (called by pg_cron daily)
CREATE OR REPLACE FUNCTION refresh_network_trust_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY network_trust_metrics;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_network_trust_metrics IS 'Refreshes network_trust_metrics materialized view (call via pg_cron daily)';

-- ============================================================================
-- 4. Create function to sync network edges from existing data
-- ============================================================================

-- Function to populate network_trust_edges from existing relationships
CREATE OR REPLACE FUNCTION sync_network_trust_edges()
RETURNS void AS $$
BEGIN
  -- Sync referral edges (referrer -> referred)
  INSERT INTO network_trust_edges (from_user_id, to_user_id, trust_weight, connection_type)
  SELECT
    referrer_id as from_user_id,
    referred_user_id as to_user_id,
    0.8 as trust_weight, -- Referrals have high trust weight
    'referral' as connection_type
  FROM referral_links
  WHERE referred_user_id IS NOT NULL
  ON CONFLICT (from_user_id, to_user_id, connection_type) DO NOTHING;

  -- Sync review edges (reviewer -> reviewee)
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

  -- Sync booking edges (student <-> tutor)
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

  -- Sync connection edges (mutual connections)
  INSERT INTO network_trust_edges (from_user_id, to_user_id, trust_weight, connection_type)
  SELECT
    from_user_id,
    to_user_id,
    0.5 as trust_weight, -- Connections = moderate trust
    'connection' as connection_type
  FROM connections
  WHERE status = 'accepted'
  ON CONFLICT (from_user_id, to_user_id, connection_type) DO NOTHING;

  -- Refresh materialized view after sync
  PERFORM refresh_network_trust_metrics();

  RAISE NOTICE 'Network trust edges synced successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_network_trust_edges IS 'Populates network_trust_edges from existing referrals, reviews, bookings, and connections';

-- ============================================================================
-- 5. Create trigger to auto-update network edges
-- ============================================================================

-- Trigger function to auto-create network edges when new relationships form
CREATE OR REPLACE FUNCTION auto_create_network_edge()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle referral_links table
  IF TG_TABLE_NAME = 'referral_links' AND NEW.referred_user_id IS NOT NULL THEN
    INSERT INTO network_trust_edges (from_user_id, to_user_id, trust_weight, connection_type)
    VALUES (NEW.referrer_id, NEW.referred_user_id, 0.8, 'referral')
    ON CONFLICT (from_user_id, to_user_id, connection_type) DO NOTHING;

  -- Handle profile_reviews table
  ELSIF TG_TABLE_NAME = 'profile_reviews' THEN
    INSERT INTO network_trust_edges (from_user_id, to_user_id, trust_weight, connection_type)
    VALUES (
      NEW.reviewer_id,
      NEW.reviewee_id,
      CASE
        WHEN NEW.rating >= 4 THEN 0.9
        WHEN NEW.rating >= 3 THEN 0.6
        ELSE 0.3
      END,
      'review'
    )
    ON CONFLICT (from_user_id, to_user_id, connection_type) DO UPDATE
      SET trust_weight = EXCLUDED.trust_weight,
          updated_at = now();

  -- Handle bookings table
  ELSIF TG_TABLE_NAME = 'bookings' AND NEW.status = 'Completed' AND NEW.student_id IS NOT NULL AND NEW.tutor_id IS NOT NULL THEN
    INSERT INTO network_trust_edges (from_user_id, to_user_id, trust_weight, connection_type)
    VALUES (NEW.student_id, NEW.tutor_id, 0.7, 'booking')
    ON CONFLICT (from_user_id, to_user_id, connection_type) DO NOTHING;

  -- Handle connections table
  ELSIF TG_TABLE_NAME = 'connections' AND NEW.status = 'accepted' THEN
    INSERT INTO network_trust_edges (from_user_id, to_user_id, trust_weight, connection_type)
    VALUES (NEW.from_user_id, NEW.to_user_id, 0.5, 'connection')
    ON CONFLICT (from_user_id, to_user_id, connection_type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on relevant tables
DROP TRIGGER IF EXISTS trigger_referral_network_edge ON referral_links;
CREATE TRIGGER trigger_referral_network_edge
  AFTER INSERT OR UPDATE ON referral_links
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_network_edge();

DROP TRIGGER IF EXISTS trigger_review_network_edge ON profile_reviews;
CREATE TRIGGER trigger_review_network_edge
  AFTER INSERT OR UPDATE ON profile_reviews
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_network_edge();

DROP TRIGGER IF EXISTS trigger_booking_network_edge ON bookings;
CREATE TRIGGER trigger_booking_network_edge
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_network_edge();

DROP TRIGGER IF EXISTS trigger_connection_network_edge ON connections;
CREATE TRIGGER trigger_connection_network_edge
  AFTER INSERT OR UPDATE ON connections
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_network_edge();

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
-- 7. Initial data sync (optional - run manually)
-- ============================================================================

-- Uncomment to run initial sync:
-- SELECT sync_network_trust_edges();

-- ============================================================================
-- 8. Setup pg_cron job (run this separately after migration)
-- ============================================================================

-- Add to pg_cron schedule (requires pg_cron extension):
-- SELECT cron.schedule(
--   'refresh-network-trust-metrics',
--   '0 2 * * *', -- Daily at 2 AM
--   'SELECT refresh_network_trust_metrics();'
-- );
