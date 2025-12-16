/**
 * Migration 122: Client Referral Monetization (Demand-Side)
 * Created: 2025-12-16
 * Purpose: Enable commission on client referrals (two-sided marketplace)
 * Deployment Time: ~2 minutes
 */

BEGIN;

-- ============================================================================
-- Add referral_target_type to referrals table
-- ============================================================================

ALTER TABLE referrals
ADD COLUMN IF NOT EXISTS referral_target_type TEXT DEFAULT 'tutor';
-- Values: 'tutor' (supply-side), 'client' (demand-side)

COMMENT ON COLUMN referrals.referral_target_type IS
'Type of user being referred: tutor (supply-side) or client (demand-side)';

CREATE INDEX idx_referrals_target_type ON referrals(referral_target_type);

-- ============================================================================
-- Add client_referral_commission configuration
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS client_referral_rate NUMERIC(5,2) DEFAULT 5.00;
-- Default 5% commission on client bookings (lower than tutor 10%)

COMMENT ON COLUMN profiles.client_referral_rate IS
'Commission rate for referring clients (demand-side). Default 5%.';

-- ============================================================================
-- Function: calculate_client_referral_commission
-- ============================================================================
-- Called during booking payment processing

CREATE OR REPLACE FUNCTION calculate_client_referral_commission(
  p_booking_id UUID,
  p_client_id UUID,
  p_booking_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_client_agent_id UUID;
  v_commission_rate NUMERIC;
  v_commission_amount NUMERIC;
  v_result JSONB;
BEGIN
  -- Check if client was referred
  SELECT referred_by_profile_id INTO v_client_agent_id
  FROM profiles
  WHERE id = p_client_id;

  IF v_client_agent_id IS NULL THEN
    -- Client not referred, no commission
    RETURN jsonb_build_object(
      'has_commission', false,
      'reason', 'client_not_referred'
    );
  END IF;

  -- Get agent's commission rate
  SELECT client_referral_rate INTO v_commission_rate
  FROM profiles
  WHERE id = v_client_agent_id;

  -- Calculate commission (5% of booking amount)
  v_commission_amount := p_booking_amount * (v_commission_rate / 100);

  -- Create transaction record
  INSERT INTO transactions (
    profile_id,
    booking_id,
    type,
    status,
    amount,
    metadata,
    created_at
  )
  VALUES (
    v_client_agent_id,
    p_booking_id,
    'Referral Commission',
    'pending',
    v_commission_amount,
    jsonb_build_object(
      'commission_type', 'client_referral',
      'commission_rate', v_commission_rate,
      'referred_client_id', p_client_id
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'has_commission', true,
    'agent_id', v_client_agent_id,
    'commission_amount', v_commission_amount,
    'commission_rate', v_commission_rate
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Update referral target type on signup
-- ============================================================================

CREATE OR REPLACE FUNCTION set_referral_target_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Determine target type based on user's first role
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.referred_profile_id
      AND 'tutor' = ANY(roles)
  ) THEN
    NEW.referral_target_type := 'tutor';
  ELSIF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = NEW.referred_profile_id
      AND 'client' = ANY(roles)
  ) THEN
    NEW.referral_target_type := 'client';
  ELSE
    NEW.referral_target_type := 'tutor'; -- Default
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_referral_target_type
BEFORE UPDATE OF referred_profile_id ON referrals
FOR EACH ROW
WHEN (NEW.referred_profile_id IS NOT NULL AND OLD.referred_profile_id IS NULL)
EXECUTE FUNCTION set_referral_target_type();

-- ============================================================================
-- RPC: get_two_sided_referral_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_two_sided_referral_stats(p_agent_id UUID)
RETURNS TABLE (
  tutor_referrals INTEGER,
  tutor_conversions INTEGER,
  tutor_commission NUMERIC,
  client_referrals INTEGER,
  client_bookings INTEGER,
  client_commission NUMERIC,
  total_commission NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (
      WHERE r.referral_target_type = 'tutor'
        AND r.status IN ('Signed Up', 'Converted')
    )::INTEGER AS tutor_referrals,
    COUNT(*) FILTER (
      WHERE r.referral_target_type = 'tutor'
        AND r.status = 'Converted'
    )::INTEGER AS tutor_conversions,
    COALESCE(
      SUM(t.amount) FILTER (
        WHERE t.metadata->>'commission_type' = 'tutor_referral'
          AND t.status = 'completed'
      ),
      0
    ) AS tutor_commission,
    COUNT(*) FILTER (
      WHERE r.referral_target_type = 'client'
        AND r.status IN ('Signed Up', 'Converted')
    )::INTEGER AS client_referrals,
    COUNT(*) FILTER (
      WHERE r.referral_target_type = 'client'
        AND r.status = 'Converted'
    )::INTEGER AS client_bookings,
    COALESCE(
      SUM(t.amount) FILTER (
        WHERE t.metadata->>'commission_type' = 'client_referral'
          AND t.status = 'completed'
      ),
      0
    ) AS client_commission,
    COALESCE(
      SUM(t.amount) FILTER (WHERE t.status = 'completed'),
      0
    ) AS total_commission
  FROM referrals r
  LEFT JOIN transactions t ON (
    t.profile_id = p_agent_id
    AND t.type = 'Referral Commission'
  )
  WHERE r.agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_two_sided_referral_stats TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_client_referral_commission TO authenticated;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
/*
SELECT * FROM get_two_sided_referral_stats('your-agent-uuid');
SELECT referral_target_type, COUNT(*) FROM referrals GROUP BY referral_target_type;
*/
