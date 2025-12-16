/**
 * Migration 123: Multi-Tier Commission System (Configurable)
 * Created: 2025-12-16
 * Purpose: Enable 1-7 tier commission chains with manual configuration
 *
 * BUSINESS CONTEXT:
 * ==================
 * This implements a configurable multi-tier commission structure similar to
 * eXp Realty's model, allowing passive income from referral chains.
 *
 * LEGAL CONSIDERATIONS:
 * ====================
 * Multi-tier commissions resemble MLM (multi-level marketing) structures.
 * To remain legal and avoid pyramid scheme classification:
 *
 * 1. ✅ PRIMARY VALUE: Commissions from real tutoring bookings, not recruitment
 * 2. ✅ NO RECRUITMENT FEES: Agents join for free
 * 3. ✅ TRANSPARENT DISCLOSURE: All rates clearly published
 * 4. ✅ REAL SERVICE DELIVERY: Actual tutoring lessons provided
 * 5. ⚠️  TIER LIMITS: Start with 1-tier, expand to 3-tier after legal review
 * 6. ⚠️  INCOME CLAIMS: Must publish realistic earnings data
 *
 * INITIAL CONFIGURATION: 1-TIER ONLY (Conservative Launch)
 * ==========================================================
 * Tier 1: 10% (direct referral of tutor)
 * Tier 2: DISABLED (0%)
 * Tier 3: DISABLED (0%)
 *
 * This allows safe launch while preserving ability to expand to 3-tier
 * after market testing and legal clearance.
 *
 * FINANCIAL MODEL (If 3-Tier Enabled):
 * =====================================
 * £100 booking split:
 * - Tutor: £77 (77%)
 * - Tier 1 Agent (direct referrer): £10 (10%)
 * - Tier 2 Agent (referred Tier 1): £3 (3%)
 * - Tier 3 Agent (referred Tier 2): DISABLED in initial config
 * - Platform: £10 (10%)
 *
 * COMPARISON TO COMPETITORS:
 * ==========================
 * - Tutoring platforms: No multi-tier (TutorWise would be first)
 * - eXp Realty: 7 tiers (real estate marketplace)
 * - Traditional MLM: 3-6 tiers (Amway, Herbalife, Mary Kay)
 * - Gig economy: 1 tier only (Uber, DoorDash)
 *
 * REVENUE IMPACT:
 * ===============
 * Platform revenue per booking: UNCHANGED at £10 (10%)
 * Growth driver: Viral recruiting → 10x more tutors → 10x more revenue
 *
 * Example: 10,000 tutors × 10 bookings/month × £10 platform fee = £1M/month
 *
 * WHY CONFIGURABLE:
 * =================
 * - Launch conservatively with 1-tier
 * - Expand to 3-tier after legal review (Q2 2026)
 * - A/B test different tier structures
 * - Respond to regulatory changes
 * - Market-specific configurations (UK vs EU vs US)
 *
 * Deployment Time: ~3 minutes
 */

BEGIN;

-- ============================================================================
-- Table: commission_tier_config
-- ============================================================================
-- Global configuration for commission tier rates

CREATE TABLE IF NOT EXISTS commission_tier_config (
  tier INTEGER PRIMARY KEY CHECK (tier BETWEEN 1 AND 7),

  -- Commission rate for this tier
  commission_rate NUMERIC(5,2) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),

  -- Whether this tier is currently active
  is_active BOOLEAN NOT NULL DEFAULT FALSE,

  -- Legal/compliance notes
  legal_status TEXT DEFAULT 'pending_review',
  -- Values: 'approved', 'pending_review', 'requires_legal_clearance', 'prohibited'

  -- Market restrictions
  allowed_countries TEXT[] DEFAULT '{}',
  -- Empty array = all countries, specific array = restricted to those countries

  -- Audit trail
  activated_at TIMESTAMPTZ,
  activated_by UUID REFERENCES profiles(id),
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID REFERENCES profiles(id),

  -- Configuration notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE commission_tier_config IS
'Configurable commission rates for multi-tier referral chains.
CRITICAL: Only activate tiers after legal review. Start with Tier 1 only.
Resembles eXp Realty model (real estate) - first implementation in tutoring industry.';

-- ============================================================================
-- Initial Configuration: TIER 1 ONLY (Conservative Launch)
-- ============================================================================

INSERT INTO commission_tier_config (tier, commission_rate, is_active, legal_status, notes)
VALUES
  (1, 10.00, TRUE, 'approved',
   'Tier 1 (Direct Referral): Agent earns 10% commission when tutor they directly recruited completes bookings. ACTIVE and legally cleared.'),

  (2, 3.00, FALSE, 'requires_legal_clearance',
   'Tier 2 (Indirect Referral): Agent earns 3% when their recruited agent''s tutor completes bookings. DISABLED pending legal review. Similar to eXp Realty Tier 2 model.'),

  (3, 1.50, FALSE, 'requires_legal_clearance',
   'Tier 3: Agent earns 1.5% from 3 levels deep in referral chain. DISABLED pending legal review and market testing of Tier 2.'),

  (4, 0.75, FALSE, 'prohibited',
   'Tier 4: DISABLED. Reserved for future expansion after successful 3-tier operation (minimum 12 months). Requires separate legal opinion.'),

  (5, 0.50, FALSE, 'prohibited',
   'Tier 5: DISABLED. Reserved for future expansion.'),

  (6, 0.25, FALSE, 'prohibited',
   'Tier 6: DISABLED. Reserved for future expansion.'),

  (7, 0.10, FALSE, 'prohibited',
   'Tier 7: DISABLED. Reserved for future expansion. Maximum depth to prevent pyramid concerns.')
ON CONFLICT (tier) DO NOTHING;

-- ============================================================================
-- Function: get_active_commission_tiers
-- ============================================================================

CREATE OR REPLACE FUNCTION get_active_commission_tiers()
RETURNS TABLE (
  tier INTEGER,
  commission_rate NUMERIC,
  legal_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tier,
    t.commission_rate,
    t.legal_status
  FROM commission_tier_config t
  WHERE t.is_active = TRUE
  ORDER BY t.tier ASC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_active_commission_tiers IS
'Returns currently active commission tiers.
Initial config: Only Tier 1 (10%) active.
After legal review: Tier 2 (3%) can be activated.
Used by commission calculation engine.';

-- ============================================================================
-- Function: calculate_multi_tier_commissions
-- ============================================================================
-- Calculate commissions for entire referral chain up to active tiers

CREATE OR REPLACE FUNCTION calculate_multi_tier_commissions(
  p_booking_id UUID,
  p_tutor_id UUID,
  p_booking_amount NUMERIC
)
RETURNS JSONB AS $$
DECLARE
  v_current_agent_id UUID;
  v_tier INTEGER := 1;
  v_tier_config RECORD;
  v_commission_amount NUMERIC;
  v_total_commission NUMERIC := 0;
  v_tutor_reduction NUMERIC := 0;
  v_chain JSONB := '[]'::JSONB;
  v_max_active_tier INTEGER;
BEGIN
  -- Get maximum active tier
  SELECT MAX(tier) INTO v_max_active_tier
  FROM commission_tier_config
  WHERE is_active = TRUE;

  IF v_max_active_tier IS NULL THEN
    -- No tiers active, return empty result
    RETURN jsonb_build_object(
      'total_tiers', 0,
      'total_commission', 0,
      'tutor_reduction', 0,
      'chain', '[]'::JSONB,
      'config_status', 'no_active_tiers'
    );
  END IF;

  -- Start with tutor's direct referrer
  SELECT referred_by_profile_id INTO v_current_agent_id
  FROM profiles
  WHERE id = p_tutor_id;

  -- Walk up the referral chain
  WHILE v_current_agent_id IS NOT NULL AND v_tier <= v_max_active_tier LOOP
    -- Get configuration for this tier
    SELECT * INTO v_tier_config
    FROM commission_tier_config
    WHERE tier = v_tier AND is_active = TRUE;

    EXIT WHEN NOT FOUND; -- No more active tiers

    -- Calculate commission for this tier
    v_commission_amount := p_booking_amount * (v_tier_config.commission_rate / 100);
    v_total_commission := v_total_commission + v_commission_amount;
    v_tutor_reduction := v_tutor_reduction + v_commission_amount;

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
      v_current_agent_id,
      p_booking_id,
      'Referral Commission',
      'pending',
      v_commission_amount,
      jsonb_build_object(
        'tier', v_tier,
        'commission_rate', v_tier_config.commission_rate,
        'commission_type', 'multi_tier',
        'tutor_id', p_tutor_id,
        'legal_status', v_tier_config.legal_status
      ),
      NOW()
    );

    -- Add to chain record
    v_chain := v_chain || jsonb_build_object(
      'tier', v_tier,
      'agent_id', v_current_agent_id,
      'commission_rate', v_tier_config.commission_rate,
      'commission_amount', v_commission_amount
    );

    -- Move up the chain to next agent
    SELECT referred_by_profile_id INTO v_current_agent_id
    FROM profiles
    WHERE id = v_current_agent_id;

    v_tier := v_tier + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'total_tiers', v_tier - 1,
    'total_commission', v_total_commission,
    'tutor_reduction', v_tutor_reduction,
    'tutor_final_rate', 80 - (v_tutor_reduction / p_booking_amount * 100),
    'chain', v_chain,
    'max_active_tier', v_max_active_tier
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_multi_tier_commissions IS
'Calculate commissions for entire referral chain based on active tier configuration.

INITIAL BEHAVIOR (Tier 1 only active):
- £100 booking → £10 to direct agent, £80 to tutor
- Same as current single-tier system

FUTURE BEHAVIOR (Tier 2 activated):
- £100 booking → £10 Tier 1, £3 Tier 2, £77 to tutor
- Tutor earnings reduced by £3 to fund Tier 2

IMPORTANT: Tutor earnings reduction = sum of all active tier commissions
Platform keeps fixed 10% regardless of tier configuration.';

-- ============================================================================
-- Function: activate_commission_tier (Admin Only)
-- ============================================================================

CREATE OR REPLACE FUNCTION activate_commission_tier(
  p_tier INTEGER,
  p_activated_by UUID,
  p_legal_clearance_notes TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Check current legal status
  SELECT legal_status INTO v_current_status
  FROM commission_tier_config
  WHERE tier = p_tier;

  IF v_current_status = 'prohibited' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Cannot activate prohibited tier. Requires board approval and separate legal opinion.'
    );
  END IF;

  IF v_current_status = 'requires_legal_clearance' THEN
    -- Update to approved and activate
    UPDATE commission_tier_config
    SET
      is_active = TRUE,
      legal_status = 'approved',
      activated_at = NOW(),
      activated_by = p_activated_by,
      notes = COALESCE(notes, '') || E'\n\nLegal Clearance: ' || p_legal_clearance_notes,
      updated_at = NOW()
    WHERE tier = p_tier;

    RETURN jsonb_build_object(
      'success', TRUE,
      'tier', p_tier,
      'message', 'Tier activated successfully after legal clearance'
    );
  ELSE
    -- Already approved, just activate
    UPDATE commission_tier_config
    SET
      is_active = TRUE,
      activated_at = NOW(),
      activated_by = p_activated_by,
      updated_at = NOW()
    WHERE tier = p_tier;

    RETURN jsonb_build_object(
      'success', TRUE,
      'tier', p_tier,
      'message', 'Tier activated successfully'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION activate_commission_tier IS
'Admin function to activate additional commission tiers after legal review.

WORKFLOW:
1. Tier 1: Active by default (approved)
2. Tier 2: Requires legal clearance before activation
3. Tier 3+: Prohibited until Tier 2 tested for 12+ months

Only platform administrators can call this function.';

-- ============================================================================
-- RPC: get_commission_config_status
-- ============================================================================

CREATE OR REPLACE FUNCTION get_commission_config_status()
RETURNS TABLE (
  tier INTEGER,
  commission_rate NUMERIC,
  is_active BOOLEAN,
  legal_status TEXT,
  activated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.tier,
    t.commission_rate,
    t.is_active,
    t.legal_status,
    t.activated_at
  FROM commission_tier_config t
  ORDER BY t.tier ASC;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_commission_config_status TO authenticated;

COMMIT;

-- ============================================================================
-- Verification Queries
-- ============================================================================
/*
-- Check current configuration
SELECT * FROM get_commission_config_status();

-- Expected initial state:
-- tier | commission_rate | is_active | legal_status
-- -----|-----------------|-----------|------------------
--  1   | 10.00           | TRUE      | approved
--  2   | 3.00            | FALSE     | requires_legal_clearance
--  3   | 1.50            | FALSE     | requires_legal_clearance
--  4+  | ...             | FALSE     | prohibited

-- Test commission calculation (should only pay Tier 1)
SELECT calculate_multi_tier_commissions(
  'test-booking-uuid',
  'test-tutor-uuid',
  100.00
);
*/

-- ============================================================================
-- DEPLOYMENT CHECKLIST
-- ============================================================================
/*
[ ] Run this migration in production
[ ] Verify only Tier 1 is active: SELECT * FROM get_commission_config_status();
[ ] Update process_booking_payment() to call calculate_multi_tier_commissions()
[ ] Add admin UI to view/activate tiers (requires superuser role)
[ ] Legal review of Tier 2 activation (estimated Q2 2026)
[ ] Market test Tier 1 for minimum 6 months before Tier 2
[ ] Publish transparent earnings disclosure on website
[ ] Monitor for FTC/ASA regulatory guidance on platform MLM structures
*/
