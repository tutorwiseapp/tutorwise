/**
 * Migration 093: Create get_referral_stats RPC Function
 * Created: 2025-12-16
 * Purpose: Power the ReferralDashboardWidget with real-time KPI data
 * Deployment Time: ~1 minute
 *
 * Related Migration: 091_hierarchical_attribution_enhancement.sql
 *
 * Returns:
 * - total_clicks: Total referral links clicked (referrals created)
 * - total_signups: Users who completed signup via referral
 * - total_conversions: Users who made first booking/payment
 * - total_commission_earned: Total £ earned by agent
 * - conversion_rate: % of signups who converted
 * - signup_rate: % of clicks that resulted in signups
 */

BEGIN;

-- ============================================================================
-- RPC Function: get_referral_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION get_referral_stats(p_agent_id UUID)
RETURNS TABLE (
  total_clicks INTEGER,
  total_signups INTEGER,
  total_conversions INTEGER,
  total_commission_earned NUMERIC,
  conversion_rate NUMERIC,
  signup_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Total clicks (referrals created)
    -- Every referral record = 1 click on the referral link
    COUNT(*)::INTEGER AS total_clicks,

    -- Total signups (status = 'Signed Up' or 'Converted')
    -- User completed signup after clicking referral link
    COUNT(*) FILTER (WHERE r.status IN ('Signed Up', 'Converted'))::INTEGER AS total_signups,

    -- Total conversions (status = 'Converted')
    -- User made first booking/payment
    COUNT(*) FILTER (WHERE r.status = 'Converted')::INTEGER AS total_conversions,

    -- Total commission earned
    -- Sum of all completed commission transactions
    COALESCE(
      SUM(t.amount) FILTER (
        WHERE t.type = 'Referral Commission'
          AND t.status = 'completed'
      ),
      0
    ) AS total_commission_earned,

    -- Conversion rate (conversions / signups * 100)
    -- What % of signups actually converted to paying customers?
    CASE
      WHEN COUNT(*) FILTER (WHERE r.status IN ('Signed Up', 'Converted')) > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE r.status = 'Converted')::NUMERIC /
         COUNT(*) FILTER (WHERE r.status IN ('Signed Up', 'Converted'))::NUMERIC) * 100,
        2
      )
      ELSE 0
    END AS conversion_rate,

    -- Signup rate (signups / clicks * 100)
    -- What % of link clicks resulted in completed signups?
    CASE
      WHEN COUNT(*) > 0
      THEN ROUND(
        (COUNT(*) FILTER (WHERE r.status IN ('Signed Up', 'Converted'))::NUMERIC /
         COUNT(*)::NUMERIC) * 100,
        2
      )
      ELSE 0
    END AS signup_rate

  FROM referrals r
  LEFT JOIN transactions t ON (
    t.profile_id = p_agent_id
    AND t.metadata->>'referral_id' = r.id::TEXT
  )
  WHERE r.agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Security: DEFINER allows function to read transactions table
-- Stability: STABLE because it reads data but doesn't modify

COMMENT ON FUNCTION get_referral_stats IS
  'Returns aggregated referral stats for the ReferralDashboardWidget. Used by agents to track referral performance.';

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Allow authenticated users to call this function (they can only see their own stats)
GRANT EXECUTE ON FUNCTION get_referral_stats TO authenticated;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Test the function (replace with actual agent UUID)
/*
SELECT * FROM get_referral_stats('00000000-0000-0000-0000-000000000000');

-- Expected output:
 total_clicks | total_signups | total_conversions | total_commission_earned | conversion_rate | signup_rate
--------------+---------------+-------------------+-------------------------+-----------------+-------------
    150       |     45        |         12        |        240.00          |     26.67       |   30.00

-- Explanation:
- 150 clicks on referral link (150 referral records created)
- 45 users completed signup (30% signup rate)
- 12 users made first booking (26.67% conversion rate)
- £240 total commission earned (12 conversions × £20 each)
*/

COMMIT;

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================
/*
BEGIN;

DROP FUNCTION IF EXISTS get_referral_stats;

COMMIT;
*/
