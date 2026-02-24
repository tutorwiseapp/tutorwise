-- Migration: Add Subscription Tutoring Listings
-- Created: 2026-02-24
-- Purpose: Phase 3A - Enable subscription-based tutoring for both tutors and agents
-- Version: v1.0

-- Add 'subscription' to existing listing_type enum
-- Note: This migration assumes listing_type uses a CHECK constraint, not an enum type
-- Include existing values found in database to avoid constraint violations
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE listings ADD CONSTRAINT listings_listing_type_check
  CHECK (listing_type IN (
    'one-to-one',
    'group-session',
    'workshop',
    'study-package',
    'job-listing',
    'job',  -- Legacy value
    'request',
    'subscription',  -- NEW
    'Tutor: One-on-One Session',  -- Legacy value
    'service'  -- Generic service type
  ));

-- Add subscription configuration column
ALTER TABLE listings ADD COLUMN IF NOT EXISTS subscription_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN listings.subscription_config IS 'Subscription-specific configuration: frequency, term_time_only, session_duration, price_per_month, etc.';

-- Subscription bookings/purchases table
CREATE TABLE IF NOT EXISTS listing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'expired'
  sessions_booked_this_period INTEGER DEFAULT 0,
  sessions_remaining_this_period INTEGER,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ,
  pause_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, client_id, status) -- One active subscription per client per listing
);

CREATE INDEX idx_listing_subscriptions_listing ON listing_subscriptions(listing_id, status);
CREATE INDEX idx_listing_subscriptions_client ON listing_subscriptions(client_id, status);
CREATE INDEX idx_listing_subscriptions_period ON listing_subscriptions(current_period_end) WHERE status = 'active';
CREATE INDEX idx_listing_subscriptions_stripe ON listing_subscriptions(stripe_subscription_id);

COMMENT ON TABLE listing_subscriptions IS 'Client subscriptions to tutoring/agent subscription listings';
COMMENT ON COLUMN listing_subscriptions.sessions_remaining_this_period IS 'Sessions left in current billing period (null = unlimited)';

-- Link bookings to subscriptions
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS listing_subscription_id UUID REFERENCES listing_subscriptions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_subscription ON bookings(listing_subscription_id);

-- Trigger to update listing_subscriptions.updated_at
CREATE OR REPLACE FUNCTION update_listing_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_listing_subscription_updated_at
  BEFORE UPDATE ON listing_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_subscription_updated_at();

-- Function: Reset monthly subscription usage
CREATE OR REPLACE FUNCTION reset_subscription_usage()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Reset sessions for subscriptions that have reached their period end
  UPDATE listing_subscriptions ls
  SET
    sessions_booked_this_period = 0,
    sessions_remaining_this_period = (
      SELECT
        CASE
          WHEN (l.subscription_config->>'session_limit_per_period')::INTEGER IS NULL
          THEN NULL  -- Unlimited
          ELSE (l.subscription_config->>'session_limit_per_period')::INTEGER
        END
      FROM listings l
      WHERE l.id = ls.listing_id
    ),
    current_period_start = current_period_end,
    current_period_end = current_period_end + INTERVAL '1 month'
  FROM listings l
  WHERE ls.listing_id = l.id
    AND ls.status = 'active'
    AND ls.current_period_end <= NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_subscription_usage() IS 'Reset monthly session usage counters for active subscriptions';

-- Function: Get subscription details with listing info
CREATE OR REPLACE FUNCTION get_subscription_details(p_subscription_id UUID)
RETURNS TABLE (
  subscription_id UUID,
  listing_id UUID,
  listing_title TEXT,
  tutor_name TEXT,
  tutor_id UUID,
  client_id UUID,
  status VARCHAR(20),
  sessions_booked INTEGER,
  sessions_remaining INTEGER,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  price_per_month_pence INTEGER,
  frequency TEXT,
  session_duration_minutes INTEGER,
  term_time_only BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ls.id as subscription_id,
    ls.listing_id,
    l.title as listing_title,
    p.full_name as tutor_name,
    l.profile_id as tutor_id,
    ls.client_id,
    ls.status,
    ls.sessions_booked_this_period as sessions_booked,
    ls.sessions_remaining_this_period as sessions_remaining,
    ls.current_period_start,
    ls.current_period_end,
    (l.subscription_config->>'price_per_month_pence')::INTEGER as price_per_month_pence,
    (l.subscription_config->>'frequency')::TEXT as frequency,
    (l.subscription_config->>'session_duration_minutes')::INTEGER as session_duration_minutes,
    (l.subscription_config->>'term_time_only')::BOOLEAN as term_time_only
  FROM listing_subscriptions ls
  JOIN listings l ON l.id = ls.listing_id
  JOIN profiles p ON p.id = l.profile_id
  WHERE ls.id = p_subscription_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_subscription_details(UUID) IS 'Get complete subscription details with listing and tutor information';

-- Example subscription_config structure:
-- {
--   "frequency": "daily" | "weekly" | "fortnightly",
--   "term_time_only": true | false,
--   "session_duration_minutes": 60,
--   "sessions_per_week": 5,
--   "session_limit_per_period": 20,  -- null for unlimited
--   "price_per_month_pence": 10000,
--   "auto_renew": true
-- }
