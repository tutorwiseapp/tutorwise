/**
 * Migration 208: Create Organisation Statistics Daily Table
 *
 * Purpose:
 * - Create organisation_statistics_daily table for per-organisation metric snapshots
 * - Enable efficient querying for organisation browse pages (fixes N+1 problem)
 * - Align with dashboard pattern (user_statistics_daily, platform_statistics_daily)
 *
 * Phase: Public Pages Alignment - Phase 1
 * Created: 2026-01-22
 * Pattern: Follows migration 206 (user_statistics_daily) for consistency
 *
 * Related Files:
 * - Migration 154: get_organisation_public_stats() RPC (to be replaced)
 * - Migration 206: user_statistics_daily (similar pattern)
 * - Migration 207: User statistics aggregation function (similar logic)
 */

-- ================================================================
-- ORGANISATION STATISTICS DAILY TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS organisation_statistics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES connection_groups(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Team metrics (aggregate from members)
  total_tutors INTEGER DEFAULT 0,
  active_tutors INTEGER DEFAULT 0,
  dbs_verified_tutors INTEGER DEFAULT 0,
  identity_verified_tutors INTEGER DEFAULT 0,

  -- Session metrics (aggregate from all team bookings)
  total_sessions INTEGER DEFAULT 0,
  monthly_sessions INTEGER DEFAULT 0,
  completed_sessions INTEGER DEFAULT 0,
  cancelled_sessions INTEGER DEFAULT 0,
  hours_taught NUMERIC(10,2) DEFAULT 0,

  -- Client metrics (aggregate from team)
  total_clients INTEGER DEFAULT 0,
  active_clients INTEGER DEFAULT 0,
  new_clients INTEGER DEFAULT 0,
  returning_clients INTEGER DEFAULT 0,

  -- Rating metrics (aggregate from team)
  average_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  five_star_reviews INTEGER DEFAULT 0,
  four_star_reviews INTEGER DEFAULT 0,
  three_star_reviews INTEGER DEFAULT 0,

  -- Visibility metrics
  profile_views INTEGER DEFAULT 0,
  daily_profile_views INTEGER DEFAULT 0,

  -- Service offering metrics
  unique_subjects TEXT[] DEFAULT '{}',
  unique_levels TEXT[] DEFAULT '{}',
  active_listings INTEGER DEFAULT 0,

  -- Financial metrics (aggregate)
  total_earnings NUMERIC(10,2) DEFAULT 0,
  monthly_earnings NUMERIC(10,2) DEFAULT 0,

  -- Trust metrics
  caas_score NUMERIC(5,2) DEFAULT 0,
  business_verified BOOLEAN DEFAULT false,
  safeguarding_certified BOOLEAN DEFAULT false,
  professional_insurance BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one row per organisation per date
  CONSTRAINT unique_organisation_date UNIQUE (organisation_id, date)
);

-- ================================================================
-- INDEXES
-- ================================================================

-- Primary lookup: get today's stats for one organisation
CREATE INDEX IF NOT EXISTS idx_organisation_statistics_org_date
  ON organisation_statistics_daily(organisation_id, date DESC);

-- Browse pages: get today's stats for all organisations (sorted by rating)
CREATE INDEX IF NOT EXISTS idx_organisation_statistics_date_rating
  ON organisation_statistics_daily(date DESC, average_rating DESC)
  WHERE average_rating > 0;

-- Browse pages: get today's stats for all organisations (sorted by sessions)
CREATE INDEX IF NOT EXISTS idx_organisation_statistics_date_sessions
  ON organisation_statistics_daily(date DESC, total_sessions DESC)
  WHERE total_sessions > 0;

-- Historical queries: date range for one organisation
CREATE INDEX IF NOT EXISTS idx_organisation_statistics_date_range
  ON organisation_statistics_daily(date DESC, organisation_id);

-- ================================================================
-- RLS POLICIES
-- ================================================================

-- Enable RLS
ALTER TABLE organisation_statistics_daily ENABLE ROW LEVEL SECURITY;

-- Public can view stats for public organisations
CREATE POLICY "Public can view public organisation statistics"
  ON organisation_statistics_daily FOR SELECT
  USING (
    organisation_id IN (
      SELECT id FROM connection_groups
      WHERE type = 'organisation'
        AND public_visible = true
    )
  );

-- Organisation owners can view their own statistics
CREATE POLICY "Organisation owners can view their statistics"
  ON organisation_statistics_daily FOR SELECT
  USING (
    organisation_id IN (
      SELECT id FROM connection_groups
      WHERE profile_id = auth.uid()
    )
  );

-- Only system can insert/update (via aggregation function)
CREATE POLICY "Only service role can modify organisation statistics"
  ON organisation_statistics_daily FOR ALL
  USING (auth.uid() IS NULL); -- Service role only

-- ================================================================
-- UPDATED_AT TRIGGER
-- ================================================================

CREATE OR REPLACE FUNCTION update_organisation_statistics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_organisation_statistics_updated_at
  BEFORE UPDATE ON organisation_statistics_daily
  FOR EACH ROW
  EXECUTE FUNCTION update_organisation_statistics_updated_at();

-- ================================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================================

COMMENT ON TABLE organisation_statistics_daily IS
  'Pre-aggregated daily statistics snapshots for organisations. Enables efficient querying for browse pages and organisation profiles.';

COMMENT ON COLUMN organisation_statistics_daily.organisation_id IS
  'Foreign key to connection_groups table (type=organisation)';

COMMENT ON COLUMN organisation_statistics_daily.date IS
  'Date of the snapshot (UTC midnight). Used for historical comparison and trends.';

COMMENT ON COLUMN organisation_statistics_daily.total_tutors IS
  'COUNT of all active team members (from network_group_members)';

COMMENT ON COLUMN organisation_statistics_daily.total_sessions IS
  'COUNT of all completed sessions by team members (lifetime)';

COMMENT ON COLUMN organisation_statistics_daily.average_rating IS
  'AVERAGE rating across all team members reviews (rounded to 1 decimal)';

COMMENT ON COLUMN organisation_statistics_daily.unique_subjects IS
  'ARRAY of all unique subjects offered by team (aggregated from professional_details)';

COMMENT ON COLUMN organisation_statistics_daily.caas_score IS
  'CaaS (Credibility as a Service) trust score for the organisation';
