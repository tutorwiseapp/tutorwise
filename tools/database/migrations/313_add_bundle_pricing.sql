-- Migration: AI Tutor Bundle Pricing
-- Created: 2026-02-24
-- Purpose: Phase 3C - Package deals combining AI and human sessions
-- Version: v1.0

-- Bundle pricing configurations
CREATE TABLE IF NOT EXISTS ai_tutor_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  bundle_name VARCHAR(100) NOT NULL,
  ai_sessions_count INTEGER NOT NULL CHECK (ai_sessions_count >= 0),
  human_sessions_count INTEGER NOT NULL CHECK (human_sessions_count >= 0),
  total_price_pence INTEGER NOT NULL CHECK (total_price_pence > 0),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0, -- For sorting bundles (0 = first)
  badge_text VARCHAR(50), -- e.g., 'Best Value', 'Popular', 'Starter'
  valid_days INTEGER DEFAULT 90, -- Bundle validity period (null = no expiration)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT at_least_one_session CHECK (ai_sessions_count > 0 OR human_sessions_count > 0)
);

CREATE INDEX IF NOT EXISTS idx_ai_tutor_bundles_tutor ON ai_tutor_bundles(ai_tutor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_tutor_bundles_display ON ai_tutor_bundles(display_order, is_active);

COMMENT ON TABLE ai_tutor_bundles IS 'Pricing bundles combining AI and human sessions (e.g., 5 AI + 1 human = £50)';
COMMENT ON COLUMN ai_tutor_bundles.badge_text IS 'Display badge on bundle card (e.g., "Best Value", "Most Popular")';
COMMENT ON COLUMN ai_tutor_bundles.valid_days IS 'Number of days bundle is valid after purchase (null = no expiration)';
COMMENT ON COLUMN ai_tutor_bundles.display_order IS 'Sort order for displaying bundles (lower = displayed first)';

-- Trigger to update bundle updated_at
CREATE OR REPLACE FUNCTION update_ai_tutor_bundle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ai_tutor_bundle_updated_at
  BEFORE UPDATE ON ai_tutor_bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_tutor_bundle_updated_at();

-- Bundle purchases
CREATE TABLE IF NOT EXISTS ai_tutor_bundle_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES ai_tutor_bundles(id) ON DELETE CASCADE,
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ai_sessions_remaining INTEGER NOT NULL CHECK (ai_sessions_remaining >= 0),
  human_sessions_remaining INTEGER NOT NULL CHECK (human_sessions_remaining >= 0),
  total_paid_pence INTEGER NOT NULL,
  stripe_payment_intent_id VARCHAR(255),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ, -- When bundle sessions expire
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'consumed', 'refunded'))
);

CREATE INDEX IF NOT EXISTS idx_bundle_purchases_client ON ai_tutor_bundle_purchases(client_id, status);
CREATE INDEX IF NOT EXISTS idx_bundle_purchases_bundle ON ai_tutor_bundle_purchases(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_purchases_ai_tutor ON ai_tutor_bundle_purchases(ai_tutor_id);
CREATE INDEX IF NOT EXISTS idx_bundle_purchases_expires ON ai_tutor_bundle_purchases(expires_at) WHERE status = 'active';

COMMENT ON TABLE ai_tutor_bundle_purchases IS 'Client purchases of session bundles with remaining session balance';
COMMENT ON COLUMN ai_tutor_bundle_purchases.status IS 'active: in use, expired: past expiration date, consumed: all sessions used, refunded: refunded';

-- Trigger to update bundle purchase status when sessions exhausted
CREATE OR REPLACE FUNCTION check_bundle_purchase_consumed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ai_sessions_remaining = 0 AND NEW.human_sessions_remaining = 0 AND NEW.status = 'active' THEN
    NEW.status = 'consumed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_bundle_consumed
  BEFORE UPDATE ON ai_tutor_bundle_purchases
  FOR EACH ROW
  WHEN (NEW.ai_sessions_remaining = 0 AND NEW.human_sessions_remaining = 0)
  EXECUTE FUNCTION check_bundle_purchase_consumed();

-- Link AI tutor sessions to bundle purchases
ALTER TABLE ai_tutor_sessions ADD COLUMN IF NOT EXISTS bundle_purchase_id UUID REFERENCES ai_tutor_bundle_purchases(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_ai_tutor_sessions_bundle ON ai_tutor_sessions(bundle_purchase_id);

COMMENT ON COLUMN ai_tutor_sessions.bundle_purchase_id IS 'Link to bundle purchase if session was redeemed from bundle';

-- Function: Get client's active bundles for specific AI tutor
CREATE OR REPLACE FUNCTION get_client_active_bundles(p_client_id UUID, p_ai_tutor_id UUID)
RETURNS TABLE (
  purchase_id UUID,
  bundle_id UUID,
  bundle_name VARCHAR(100),
  ai_sessions_remaining INTEGER,
  human_sessions_remaining INTEGER,
  expires_at TIMESTAMPTZ,
  total_paid_pence INTEGER,
  purchased_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bp.id as purchase_id,
    bp.bundle_id,
    b.bundle_name,
    bp.ai_sessions_remaining,
    bp.human_sessions_remaining,
    bp.expires_at,
    bp.total_paid_pence,
    bp.purchased_at
  FROM ai_tutor_bundle_purchases bp
  JOIN ai_tutor_bundles b ON b.id = bp.bundle_id
  WHERE bp.client_id = p_client_id
    AND bp.ai_tutor_id = p_ai_tutor_id
    AND bp.status = 'active'
    AND (bp.expires_at IS NULL OR bp.expires_at > NOW())
    AND (bp.ai_sessions_remaining > 0 OR bp.human_sessions_remaining > 0)
  ORDER BY bp.purchased_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_client_active_bundles(UUID, UUID) IS 'Get client active bundles with remaining sessions for an AI tutor';

-- Function: Redeem bundle session
CREATE OR REPLACE FUNCTION redeem_bundle_session(
  p_purchase_id UUID,
  p_session_type VARCHAR(10) -- 'ai' or 'human'
)
RETURNS JSONB AS $$
DECLARE
  v_purchase ai_tutor_bundle_purchases%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Get bundle purchase with FOR UPDATE to prevent race conditions
  SELECT * INTO v_purchase
  FROM ai_tutor_bundle_purchases
  WHERE id = p_purchase_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bundle purchase not found or not active'
    );
  END IF;

  -- Check if expired
  IF v_purchase.expires_at IS NOT NULL AND v_purchase.expires_at < NOW() THEN
    -- Update status to expired
    UPDATE ai_tutor_bundle_purchases
    SET status = 'expired'
    WHERE id = p_purchase_id;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'Bundle has expired'
    );
  END IF;

  -- Check session availability and decrement
  IF p_session_type = 'ai' THEN
    IF v_purchase.ai_sessions_remaining <= 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No AI sessions remaining in bundle'
      );
    END IF;

    UPDATE ai_tutor_bundle_purchases
    SET ai_sessions_remaining = ai_sessions_remaining - 1
    WHERE id = p_purchase_id;

    SELECT jsonb_build_object(
      'success', true,
      'session_type', 'ai',
      'sessions_remaining', ai_sessions_remaining - 1
    ) INTO v_result;

  ELSIF p_session_type = 'human' THEN
    IF v_purchase.human_sessions_remaining <= 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'No human sessions remaining in bundle'
      );
    END IF;

    UPDATE ai_tutor_bundle_purchases
    SET human_sessions_remaining = human_sessions_remaining - 1
    WHERE id = p_purchase_id;

    SELECT jsonb_build_object(
      'success', true,
      'session_type', 'human',
      'sessions_remaining', human_sessions_remaining - 1
    ) INTO v_result;

  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid session type. Must be "ai" or "human"'
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION redeem_bundle_session(UUID, VARCHAR) IS 'Atomically redeem a session from a bundle purchase';

-- Function: Get bundle statistics for AI tutor owner
CREATE OR REPLACE FUNCTION get_bundle_stats(p_ai_tutor_id UUID)
RETURNS TABLE (
  total_bundles_sold INTEGER,
  total_revenue_pence INTEGER,
  ai_sessions_redeemed INTEGER,
  human_sessions_redeemed INTEGER,
  active_bundle_holders INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_bundles_sold,
    COALESCE(SUM(total_paid_pence), 0)::INTEGER as total_revenue_pence,
    COALESCE(SUM(
      (SELECT ai_sessions_count FROM ai_tutor_bundles WHERE id = bp.bundle_id) - bp.ai_sessions_remaining
    ), 0)::INTEGER as ai_sessions_redeemed,
    COALESCE(SUM(
      (SELECT human_sessions_count FROM ai_tutor_bundles WHERE id = bp.bundle_id) - bp.human_sessions_remaining
    ), 0)::INTEGER as human_sessions_redeemed,
    COUNT(DISTINCT CASE WHEN bp.status = 'active' THEN bp.client_id END)::INTEGER as active_bundle_holders
  FROM ai_tutor_bundle_purchases bp
  WHERE bp.ai_tutor_id = p_ai_tutor_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_bundle_stats(UUID) IS 'Get bundle sales and redemption statistics for AI tutor';

-- Cron job function: Expire old bundles
CREATE OR REPLACE FUNCTION expire_old_bundles()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE ai_tutor_bundle_purchases
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION expire_old_bundles() IS 'Expire bundles that have passed their expiration date (run daily)';
