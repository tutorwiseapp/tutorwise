-- Migration: Add SEO Eligibility Tracking
-- Created: 2025-12-31
-- Purpose: Track SEO eligibility based on trust signals (CaaS, referrals, network)
-- Phase: Trust-First SEO - Phase 1

-- ============================================================================
-- 1. Add eligibility columns to existing tables
-- ============================================================================

-- Profiles: Add SEO eligibility tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seo_eligibility_score integer DEFAULT 0 CHECK (seo_eligibility_score >= 0 AND seo_eligibility_score <= 100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seo_eligible boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seo_eligibility_updated_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS seo_eligibility_reasons text[];

COMMENT ON COLUMN profiles.seo_eligibility_score IS 'Composite trust score (0-100) determining SEO visibility';
COMMENT ON COLUMN profiles.seo_eligible IS 'Whether profile meets threshold for search indexing';
COMMENT ON COLUMN profiles.seo_eligibility_updated_at IS 'Last eligibility calculation timestamp';
COMMENT ON COLUMN profiles.seo_eligibility_reasons IS 'Human-readable reasons for eligibility decision';

-- Listings: Add SEO eligibility tracking
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seo_eligibility_score integer DEFAULT 0 CHECK (seo_eligibility_score >= 0 AND seo_eligibility_score <= 100);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seo_eligible boolean DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seo_eligibility_updated_at timestamptz;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS seo_eligibility_reasons text[];

COMMENT ON COLUMN listings.seo_eligibility_score IS 'Composite trust score (0-100) determining SEO visibility';
COMMENT ON COLUMN listings.seo_eligible IS 'Whether listing meets threshold for search indexing';
COMMENT ON COLUMN listings.seo_eligibility_updated_at IS 'Last eligibility calculation timestamp';
COMMENT ON COLUMN listings.seo_eligibility_reasons IS 'Human-readable reasons for eligibility decision';

-- SEO Hubs: Add eligibility score (already have status, just add score)
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS eligibility_score integer DEFAULT 100 CHECK (eligibility_score >= 0 AND eligibility_score <= 100);
ALTER TABLE seo_hubs ADD COLUMN IF NOT EXISTS eligibility_reasons text[];

COMMENT ON COLUMN seo_hubs.eligibility_score IS 'Composite content quality score for SEO visibility';
COMMENT ON COLUMN seo_hubs.eligibility_reasons IS 'Reasons for eligibility (content quality, backlinks, etc.)';

-- SEO Spokes: Add eligibility score
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS eligibility_score integer DEFAULT 100 CHECK (eligibility_score >= 0 AND eligibility_score <= 100);
ALTER TABLE seo_spokes ADD COLUMN IF NOT EXISTS eligibility_reasons text[];

COMMENT ON COLUMN seo_spokes.eligibility_score IS 'Composite content quality score for SEO visibility';
COMMENT ON COLUMN seo_spokes.eligibility_reasons IS 'Reasons for eligibility (content quality, parent hub authority, etc.)';

-- ============================================================================
-- 2. Add configuration to seo_settings
-- ============================================================================

-- Eligibility thresholds
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS eligibility_thresholds jsonb DEFAULT jsonb_build_object(
  'caas_min_score', 60,
  'referral_min_count', 1,
  'network_min_density', 0.3,
  'content_min_score', 60,
  'composite_min_score', 75
);

COMMENT ON COLUMN seo_settings.eligibility_thresholds IS 'Minimum scores required for SEO eligibility across all signals';

-- Eligibility weights by entity type
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS eligibility_weights jsonb DEFAULT jsonb_build_object(
  'tutor', jsonb_build_object('caas', 0.4, 'referral', 0.3, 'network', 0.2, 'content', 0.1),
  'profile', jsonb_build_object('caas', 0.4, 'referral', 0.3, 'network', 0.2, 'content', 0.1),
  'listing', jsonb_build_object('caas', 0.3, 'referral', 0.3, 'network', 0.2, 'content', 0.2),
  'hub', jsonb_build_object('caas', 0.1, 'referral', 0.2, 'network', 0.1, 'content', 0.6),
  'spoke', jsonb_build_object('caas', 0.1, 'referral', 0.2, 'network', 0.1, 'content', 0.6)
);

COMMENT ON COLUMN seo_settings.eligibility_weights IS 'Weighted importance of each trust signal by entity type';

-- ============================================================================
-- 3. Create eligibility history table
-- ============================================================================

CREATE TABLE IF NOT EXISTS seo_eligibility_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('tutor', 'listing', 'hub', 'spoke', 'profile')),
  entity_id uuid NOT NULL,

  -- Eligibility result
  eligibility_score integer NOT NULL CHECK (eligibility_score >= 0 AND eligibility_score <= 100),
  is_eligible boolean NOT NULL,
  index_directive text NOT NULL CHECK (index_directive IN ('index', 'noindex')),
  reasons text[],

  -- Breakdown of contributing scores
  breakdown jsonb, -- {caasWeight, referralWeight, networkWeight, contentWeight}
  raw_scores jsonb, -- {caasScore, referralScore, networkScore, contentScore}

  -- Metadata
  created_at timestamptz DEFAULT now(),
  calculated_by text DEFAULT 'system'
);

CREATE INDEX idx_eligibility_history_entity ON seo_eligibility_history(entity_type, entity_id);
CREATE INDEX idx_eligibility_history_created ON seo_eligibility_history(created_at DESC);
CREATE INDEX idx_eligibility_history_eligible ON seo_eligibility_history(is_eligible);

COMMENT ON TABLE seo_eligibility_history IS 'Audit trail of SEO eligibility changes for analytics and debugging';
COMMENT ON COLUMN seo_eligibility_history.breakdown IS 'Weighted contribution of each trust signal to final score';
COMMENT ON COLUMN seo_eligibility_history.raw_scores IS 'Unweighted scores for each trust signal (0-100)';

-- ============================================================================
-- 4. Create function to calculate and update eligibility
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_seo_eligibility(
  p_entity_type text,
  p_entity_id uuid
) RETURNS TABLE (
  eligibility_score integer,
  is_eligible boolean,
  reasons text[]
) AS $$
DECLARE
  v_caas_score integer;
  v_referral_count integer;
  v_network_connections integer;
  v_content_score integer;
  v_thresholds jsonb;
  v_weights jsonb;
  v_composite_score numeric;
  v_is_eligible boolean;
  v_reasons text[];
BEGIN
  -- Get thresholds from settings
  SELECT eligibility_thresholds INTO v_thresholds
  FROM seo_settings
  LIMIT 1;

  -- Get weights from settings
  SELECT eligibility_weights->p_entity_type INTO v_weights
  FROM seo_settings
  LIMIT 1;

  -- Fetch CaaS score
  SELECT COALESCE(total_score, 0) INTO v_caas_score
  FROM caas_scores
  WHERE user_id = p_entity_id;

  -- Fetch referral count
  SELECT COUNT(*) INTO v_referral_count
  FROM referral_links
  WHERE referrer_id = p_entity_id;

  -- Fetch network connections
  SELECT COUNT(*) INTO v_network_connections
  FROM connections
  WHERE (from_user_id = p_entity_id OR to_user_id = p_entity_id)
    AND status = 'accepted';

  -- Fetch content score (for hubs/spokes)
  IF p_entity_type IN ('hub', 'spoke') THEN
    IF p_entity_type = 'hub' THEN
      SELECT COALESCE(seo_score, 0) INTO v_content_score
      FROM seo_hubs
      WHERE id = p_entity_id;
    ELSE
      SELECT COALESCE(seo_score, 0) INTO v_content_score
      FROM seo_spokes
      WHERE id = p_entity_id;
    END IF;
  ELSE
    v_content_score := 100; -- N/A for profiles/listings
  END IF;

  -- Calculate composite score
  v_composite_score :=
    (v_caas_score * (v_weights->>'caas')::numeric) +
    (LEAST(v_referral_count * 10, 100) * (v_weights->>'referral')::numeric) +
    (LEAST(v_network_connections * 5, 100) * (v_weights->>'network')::numeric) +
    (v_content_score * (v_weights->>'content')::numeric);

  -- Check eligibility
  v_is_eligible := (
    v_caas_score >= (v_thresholds->>'caas_min_score')::integer AND
    v_referral_count >= (v_thresholds->>'referral_min_count')::integer AND
    (v_network_connections::numeric / 20) >= (v_thresholds->>'network_min_density')::numeric AND
    v_content_score >= (v_thresholds->>'content_min_score')::integer AND
    v_composite_score >= (v_thresholds->>'composite_min_score')::integer
  );

  -- Build reasons
  v_reasons := ARRAY[]::text[];
  IF v_is_eligible THEN
    v_reasons := array_append(v_reasons, format('Composite score %s/100 meets threshold', ROUND(v_composite_score)));
  ELSE
    v_reasons := array_append(v_reasons, format('Composite score %s/100 below threshold', ROUND(v_composite_score)));
    IF v_caas_score < (v_thresholds->>'caas_min_score')::integer THEN
      v_reasons := array_append(v_reasons, format('Low CaaS score (%s/100)', v_caas_score));
    END IF;
    IF v_referral_count < (v_thresholds->>'referral_min_count')::integer THEN
      v_reasons := array_append(v_reasons, format('Insufficient referrals (%s)', v_referral_count));
    END IF;
  END IF;

  RETURN QUERY SELECT
    ROUND(v_composite_score)::integer,
    v_is_eligible,
    v_reasons;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_seo_eligibility IS 'Calculates SEO eligibility score and status for an entity based on trust signals';

-- ============================================================================
-- 5. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_seo_eligible ON profiles(seo_eligible) WHERE seo_eligible = true;
CREATE INDEX IF NOT EXISTS idx_profiles_seo_score ON profiles(seo_eligibility_score DESC);

CREATE INDEX IF NOT EXISTS idx_listings_seo_eligible ON listings(seo_eligible) WHERE seo_eligible = true;
CREATE INDEX IF NOT EXISTS idx_listings_seo_score ON listings(seo_eligibility_score DESC);

-- ============================================================================
-- 6. Grant permissions (if using RLS)
-- ============================================================================

-- History table: admins can read, system can write
ALTER TABLE seo_eligibility_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view eligibility history"
  ON seo_eligibility_history
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
-- 7. Sample data for testing (optional, remove in production)
-- ============================================================================

-- Example: Set default eligibility for existing profiles
-- UPDATE profiles
-- SET seo_eligibility_score = 0,
--     seo_eligible = false,
--     seo_eligibility_updated_at = now()
-- WHERE seo_eligibility_score IS NULL;
