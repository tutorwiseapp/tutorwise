/**
 * Migration 121: Partnership Onboarding System
 * Created: 2025-12-16
 * Purpose: Simplified onboarding for offline partners (coffee shops, schools)
 * Deployment Time: ~2 minutes
 */

BEGIN;

-- ============================================================================
-- Table: partnerships
-- ============================================================================

CREATE TABLE IF NOT EXISTS partnerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Partner details
  partner_name TEXT NOT NULL,
  partner_type TEXT NOT NULL,
  -- Types: 'coffee_shop', 'school', 'community_center', 'gym', 'library', 'other'

  partner_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  -- Associated TutorWise profile (created during onboarding)

  -- Contact
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,

  -- Location
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'United Kingdom',

  -- Physical marketing
  flyer_quantity INTEGER DEFAULT 0,
  qr_code_url TEXT,
  -- Stored URL to generated QR code image

  -- Commission agreement
  commission_rate NUMERIC(5,2) DEFAULT 10.00,
  -- Default 10%, customizable per partnership

  agreement_signed_at TIMESTAMPTZ,
  agreement_pdf_url TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- Values: 'pending', 'approved', 'active', 'paused', 'terminated'

  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,

  -- Performance tracking
  total_referrals INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_commission_earned NUMERIC(10,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_partnerships_profile ON partnerships(partner_profile_id);
CREATE INDEX idx_partnerships_status ON partnerships(status);
CREATE INDEX idx_partnerships_type ON partnerships(partner_type);
CREATE INDEX idx_partnerships_location ON partnerships(city, postcode);

-- ============================================================================
-- Table: partnership_materials
-- ============================================================================
-- Track physical marketing materials distribution

CREATE TABLE IF NOT EXISTS partnership_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  partnership_id UUID NOT NULL REFERENCES partnerships(id) ON DELETE CASCADE,

  material_type TEXT NOT NULL,
  -- Types: 'qr_flyer', 'poster', 'business_card', 'table_tent', 'sticker'

  quantity INTEGER NOT NULL,

  distributed_at TIMESTAMPTZ DEFAULT NOW(),
  distributed_by UUID REFERENCES profiles(id),

  -- Tracking
  scans_tracked INTEGER DEFAULT 0,
  -- Count from referral_source = 'qr' with this partnership_id

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_materials_partnership ON partnership_materials(partnership_id);

-- ============================================================================
-- Function: update_partnership_stats
-- ============================================================================

CREATE OR REPLACE FUNCTION update_partnership_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_partnership_id UUID;
BEGIN
  -- Find partnership for this referral
  SELECT id INTO v_partnership_id
  FROM partnerships
  WHERE partner_profile_id = NEW.agent_id;

  IF v_partnership_id IS NOT NULL THEN
    IF NEW.status = 'Signed Up' AND OLD.status != 'Signed Up' THEN
      UPDATE partnerships
      SET
        total_referrals = total_referrals + 1,
        updated_at = NOW()
      WHERE id = v_partnership_id;
    END IF;

    IF NEW.status = 'Converted' AND OLD.status != 'Converted' THEN
      UPDATE partnerships
      SET
        total_conversions = total_conversions + 1,
        updated_at = NOW()
      WHERE id = v_partnership_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_partnership_stats
AFTER UPDATE OF status ON referrals
FOR EACH ROW
EXECUTE FUNCTION update_partnership_stats();

-- ============================================================================
-- RPC: get_partnership_dashboard
-- ============================================================================

CREATE OR REPLACE FUNCTION get_partnership_dashboard(p_partnership_id UUID)
RETURNS TABLE (
  partner_name TEXT,
  partner_type TEXT,
  status TEXT,
  total_referrals INTEGER,
  total_conversions INTEGER,
  conversion_rate NUMERIC,
  total_commission_earned NUMERIC,
  pending_commission NUMERIC,
  materials_distributed INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.partner_name,
    p.partner_type,
    p.status,
    p.total_referrals,
    p.total_conversions,
    CASE
      WHEN p.total_referrals > 0
      THEN ROUND((p.total_conversions::NUMERIC / p.total_referrals) * 100, 2)
      ELSE 0
    END AS conversion_rate,
    p.total_commission_earned,
    COALESCE(
      SUM(t.amount) FILTER (
        WHERE t.type = 'Referral Commission'
          AND t.status IN ('pending', 'available')
      ),
      0
    ) AS pending_commission,
    COALESCE(SUM(pm.quantity), 0)::INTEGER AS materials_distributed
  FROM partnerships p
  LEFT JOIN transactions t ON t.profile_id = p.partner_profile_id
  LEFT JOIN partnership_materials pm ON pm.partnership_id = p.id
  WHERE p.id = p_partnership_id
  GROUP BY p.id, p.partner_name, p.partner_type, p.status,
           p.total_referrals, p.total_conversions, p.total_commission_earned;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_partnership_dashboard TO authenticated;

COMMIT;

-- ============================================================================
-- Verification
-- ============================================================================
/*
SELECT * FROM partnerships ORDER BY created_at DESC;
SELECT * FROM partnership_materials ORDER BY distributed_at DESC;
*/
