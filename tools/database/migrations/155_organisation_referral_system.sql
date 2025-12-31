-- =====================================================
-- Migration 155: Organisation Referral System
-- Created: 2025-12-31
-- Purpose: Enable organisation-level referral tracking with commission sharing
-- =====================================================

-- =====================================================
-- PART 1: Organisation Referral Configuration
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organisation_referral_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,

    -- Referral Settings
    enabled BOOLEAN DEFAULT false,
    referral_commission_percentage NUMERIC(5,2) DEFAULT 10.00 CHECK (referral_commission_percentage >= 0 AND referral_commission_percentage <= 100),

    -- Commission Split (org vs member)
    organisation_split_percentage NUMERIC(5,2) DEFAULT 50.00 CHECK (organisation_split_percentage >= 0 AND organisation_split_percentage <= 100),
    member_split_percentage NUMERIC(5,2) DEFAULT 50.00 CHECK (member_split_percentage >= 0 AND member_split_percentage <= 100),

    -- Activation Rules
    minimum_booking_value NUMERIC(10,2) DEFAULT 0.00,
    require_payment_completion BOOLEAN DEFAULT true,
    payout_threshold NUMERIC(10,2) DEFAULT 50.00, -- Minimum amount before payout

    -- Tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT check_split_totals CHECK (organisation_split_percentage + member_split_percentage = 100)
);

-- Unique constraint: One config per organisation
CREATE UNIQUE INDEX idx_org_referral_config_org_id ON public.organisation_referral_config(organisation_id);

-- Index for active organisations
CREATE INDEX idx_org_referral_config_enabled ON public.organisation_referral_config(enabled) WHERE enabled = true;

COMMENT ON TABLE public.organisation_referral_config IS 'Configuration for organisation-level referral programs with commission sharing';
COMMENT ON COLUMN public.organisation_referral_config.referral_commission_percentage IS 'Percentage of booking value paid as referral commission';
COMMENT ON COLUMN public.organisation_referral_config.organisation_split_percentage IS 'Percentage of commission going to organisation';
COMMENT ON COLUMN public.organisation_referral_config.member_split_percentage IS 'Percentage of commission going to referring team member';

-- =====================================================
-- PART 2: Extend Referrals Table for Organisation Tracking
-- =====================================================

-- Add organisation-specific fields to existing referrals table
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.connection_groups(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS referrer_member_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS organisation_commission NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS member_commission NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS commission_paid_at TIMESTAMPTZ;

-- Indexes for organisation referral queries
CREATE INDEX IF NOT EXISTS idx_referrals_organisation_id ON public.referrals(organisation_id) WHERE organisation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_member_id ON public.referrals(referrer_member_id) WHERE referrer_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_referrals_commission_status ON public.referrals(organisation_id, commission_paid, converted_at)
    WHERE organisation_id IS NOT NULL AND converted_at IS NOT NULL;

COMMENT ON COLUMN public.referrals.organisation_id IS 'Organisation this referral belongs to (if from org team member)';
COMMENT ON COLUMN public.referrals.referrer_member_id IS 'Team member who made the referral';
COMMENT ON COLUMN public.referrals.commission_amount IS 'Total commission amount for this referral';
COMMENT ON COLUMN public.referrals.organisation_commission IS 'Commission amount going to organisation';
COMMENT ON COLUMN public.referrals.member_commission IS 'Commission amount going to referring member';

-- =====================================================
-- PART 3: Organisation Referral Stats (Materialized View)
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS public.organisation_referral_stats CASCADE;

CREATE MATERIALIZED VIEW public.organisation_referral_stats AS
SELECT
    r.organisation_id,

    -- Overall Stats
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE r.status = 'Signed Up') as signed_up_count,
    COUNT(*) FILTER (WHERE r.status = 'Converted') as converted_count,
    ROUND((COUNT(*) FILTER (WHERE r.status = 'Converted')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) as conversion_rate,

    -- Commission Stats
    COALESCE(SUM(r.commission_amount), 0) as total_commission_generated,
    COALESCE(SUM(r.organisation_commission), 0) as total_organisation_commission,
    COALESCE(SUM(r.member_commission), 0) as total_member_commission,
    COALESCE(SUM(r.commission_amount) FILTER (WHERE r.commission_paid = false), 0) as pending_commission,
    COALESCE(SUM(r.commission_amount) FILTER (WHERE r.commission_paid = true), 0) as paid_commission,

    -- Top Referrers (array of top 10)
    ARRAY(
        SELECT jsonb_build_object(
            'member_id', rm.referrer_member_id,
            'referral_count', COUNT(*),
            'converted_count', COUNT(*) FILTER (WHERE rm.status = 'Converted'),
            'total_commission', COALESCE(SUM(rm.member_commission), 0)
        )
        FROM referrals rm
        WHERE rm.organisation_id = r.organisation_id
          AND rm.referrer_member_id IS NOT NULL
        GROUP BY rm.referrer_member_id
        ORDER BY COUNT(*) FILTER (WHERE rm.status = 'Converted') DESC
        LIMIT 10
    ) as top_referrers,

    -- Time Stats
    MIN(r.created_at) as first_referral_date,
    MAX(r.created_at) as last_referral_date,
    MAX(r.converted_at) as last_conversion_date

FROM public.referrals r
WHERE r.organisation_id IS NOT NULL
GROUP BY r.organisation_id;

-- Index on materialized view
CREATE UNIQUE INDEX idx_org_referral_stats_org_id ON public.organisation_referral_stats(organisation_id);

COMMENT ON MATERIALIZED VIEW public.organisation_referral_stats IS 'Aggregated referral statistics per organisation with commission tracking';

-- =====================================================
-- PART 4: Member Referral Stats (Per Team Member)
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS public.member_referral_stats CASCADE;

CREATE MATERIALIZED VIEW public.member_referral_stats AS
SELECT
    r.organisation_id,
    r.referrer_member_id as member_id,

    -- Referral Counts
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE r.status = 'Signed Up') as signed_up_count,
    COUNT(*) FILTER (WHERE r.status = 'Converted') as converted_count,
    ROUND((COUNT(*) FILTER (WHERE r.status = 'Converted')::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) as conversion_rate,

    -- Commission Earnings
    COALESCE(SUM(r.member_commission), 0) as total_earnings,
    COALESCE(SUM(r.member_commission) FILTER (WHERE r.commission_paid = false), 0) as pending_earnings,
    COALESCE(SUM(r.member_commission) FILTER (WHERE r.commission_paid = true), 0) as paid_earnings,

    -- Rank within organisation (calculated later via window function)
    RANK() OVER (PARTITION BY r.organisation_id ORDER BY COUNT(*) FILTER (WHERE r.status = 'Converted') DESC) as rank_by_conversions,
    RANK() OVER (PARTITION BY r.organisation_id ORDER BY COALESCE(SUM(r.member_commission), 0) DESC) as rank_by_earnings,

    -- Recent Activity
    MAX(r.created_at) as last_referral_date,
    MAX(r.converted_at) as last_conversion_date,

    -- This Month Stats
    COUNT(*) FILTER (WHERE r.created_at >= date_trunc('month', NOW())) as referrals_this_month,
    COUNT(*) FILTER (WHERE r.converted_at >= date_trunc('month', NOW())) as conversions_this_month,
    COALESCE(SUM(r.member_commission) FILTER (WHERE r.converted_at >= date_trunc('month', NOW())), 0) as earnings_this_month

FROM public.referrals r
WHERE r.organisation_id IS NOT NULL
  AND r.referrer_member_id IS NOT NULL
GROUP BY r.organisation_id, r.referrer_member_id;

-- Indexes on member stats
CREATE UNIQUE INDEX idx_member_referral_stats_org_member ON public.member_referral_stats(organisation_id, member_id);
CREATE INDEX idx_member_referral_stats_member ON public.member_referral_stats(member_id);
CREATE INDEX idx_member_referral_stats_rank ON public.member_referral_stats(organisation_id, rank_by_conversions);

COMMENT ON MATERIALIZED VIEW public.member_referral_stats IS 'Individual team member referral performance and earnings';

-- =====================================================
-- PART 5: RPC Functions
-- =====================================================

-- Function: Calculate commission for a referral
CREATE OR REPLACE FUNCTION public.calculate_referral_commission(
    p_referral_id UUID,
    p_booking_value NUMERIC
)
RETURNS TABLE (
    total_commission NUMERIC,
    org_commission NUMERIC,
    member_commission NUMERIC
) AS $$
DECLARE
    v_org_id UUID;
    v_config RECORD;
    v_commission_pct NUMERIC;
    v_org_split_pct NUMERIC;
    v_member_split_pct NUMERIC;
    v_total NUMERIC;
    v_org_amt NUMERIC;
    v_member_amt NUMERIC;
BEGIN
    -- Get organisation and config
    SELECT r.organisation_id INTO v_org_id
    FROM referrals r
    WHERE r.id = p_referral_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Referral not associated with an organisation';
    END IF;

    -- Get commission config
    SELECT * INTO v_config
    FROM organisation_referral_config
    WHERE organisation_id = v_org_id
      AND enabled = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organisation referral program not enabled';
    END IF;

    -- Check minimum booking value
    IF p_booking_value < v_config.minimum_booking_value THEN
        RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;

    -- Calculate commissions
    v_commission_pct := v_config.referral_commission_percentage;
    v_org_split_pct := v_config.organisation_split_percentage;
    v_member_split_pct := v_config.member_split_percentage;

    v_total := ROUND((p_booking_value * v_commission_pct / 100), 2);
    v_org_amt := ROUND((v_total * v_org_split_pct / 100), 2);
    v_member_amt := ROUND((v_total * v_member_split_pct / 100), 2);

    -- Return results
    RETURN QUERY SELECT v_total, v_org_amt, v_member_amt;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_referral_commission IS 'Calculate commission split for a referral based on organisation config';

-- Function: Get member referral dashboard data
CREATE OR REPLACE FUNCTION public.get_member_referral_dashboard(
    p_member_id UUID,
    p_organisation_id UUID
)
RETURNS TABLE (
    total_referrals BIGINT,
    converted_referrals BIGINT,
    conversion_rate NUMERIC,
    total_earnings NUMERIC,
    pending_earnings NUMERIC,
    paid_earnings NUMERIC,
    rank_in_org INTEGER,
    referrals_this_month BIGINT,
    earnings_this_month NUMERIC,
    recent_referrals JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mrs.total_referrals,
        mrs.converted_count as converted_referrals,
        mrs.conversion_rate,
        mrs.total_earnings,
        mrs.pending_earnings,
        mrs.paid_earnings,
        mrs.rank_by_conversions::INTEGER as rank_in_org,
        mrs.referrals_this_month,
        mrs.earnings_this_month,

        -- Recent referrals (last 10)
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'status', r.status,
                    'created_at', r.created_at,
                    'converted_at', r.converted_at,
                    'commission', r.member_commission,
                    'referred_name', p.full_name
                )
                ORDER BY r.created_at DESC
            )
            FROM referrals r
            LEFT JOIN profiles p ON p.id = r.referred_profile_id
            WHERE r.organisation_id = p_organisation_id
              AND r.referrer_member_id = p_member_id
            LIMIT 10
        ) as recent_referrals

    FROM member_referral_stats mrs
    WHERE mrs.organisation_id = p_organisation_id
      AND mrs.member_id = p_member_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_member_referral_dashboard IS 'Get comprehensive referral dashboard data for a team member';

-- =====================================================
-- PART 6: Triggers for Commission Calculation
-- =====================================================

-- Trigger function: Auto-calculate commission on conversion
CREATE OR REPLACE FUNCTION public.auto_calculate_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
    v_booking_value NUMERIC;
    v_commissions RECORD;
BEGIN
    -- Only process if referral just converted and belongs to an organisation
    IF NEW.status = 'Converted'
       AND OLD.status <> 'Converted'
       AND NEW.organisation_id IS NOT NULL
       AND NEW.booking_id IS NOT NULL THEN

        -- Get booking value
        SELECT total_amount INTO v_booking_value
        FROM bookings
        WHERE id = NEW.booking_id;

        IF v_booking_value IS NULL THEN
            v_booking_value := 0;
        END IF;

        -- Calculate commissions
        SELECT * INTO v_commissions
        FROM calculate_referral_commission(NEW.id, v_booking_value);

        -- Update referral record
        NEW.commission_amount := v_commissions.total_commission;
        NEW.organisation_commission := v_commissions.org_commission;
        NEW.member_commission := v_commissions.member_commission;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_auto_calculate_commission ON public.referrals;
CREATE TRIGGER trg_auto_calculate_commission
    BEFORE UPDATE OF status ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_referral_commission();

COMMENT ON FUNCTION public.auto_calculate_referral_commission IS 'Automatically calculate and split commission when referral converts';

-- =====================================================
-- PART 7: Row Level Security (RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE public.organisation_referral_config ENABLE ROW LEVEL SECURITY;

-- Organisation owners can manage their config
CREATE POLICY "Organisation owners can manage referral config"
    ON public.organisation_referral_config
    FOR ALL
    USING (
        organisation_id IN (
            SELECT id FROM connection_groups WHERE profile_id = auth.uid()
        )
    );

-- Public can view enabled configs (for displaying on org pages)
CREATE POLICY "Public can view enabled referral configs"
    ON public.organisation_referral_config
    FOR SELECT
    USING (enabled = true);

-- RLS for referrals updates (already has policies, ensure org members can view their org referrals)
CREATE POLICY "Organisation members can view org referrals" ON public.referrals
    FOR SELECT
    USING (
        organisation_id IN (
            SELECT gm.group_id
            FROM group_members gm
            JOIN profile_graph pg ON pg.id = gm.connection_id
            WHERE pg.profile_id = auth.uid()
        )
    );

-- =====================================================
-- PART 8: Refresh Materialized Views (pg_cron job)
-- =====================================================

-- Schedule hourly refresh of organisation referral stats
SELECT cron.schedule(
    'refresh-org-referral-stats',
    '15 * * * *', -- Every hour at :15
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.organisation_referral_stats$$
);

-- Schedule hourly refresh of member referral stats
SELECT cron.schedule(
    'refresh-member-referral-stats',
    '20 * * * *', -- Every hour at :20
    $$REFRESH MATERIALIZED VIEW CONCURRENTLY public.member_referral_stats$$
);

-- =====================================================
-- PART 9: Initial Data & Grants
-- =====================================================

-- Grant permissions
GRANT SELECT ON public.organisation_referral_stats TO authenticated;
GRANT SELECT ON public.member_referral_stats TO authenticated;

-- Refresh views immediately
REFRESH MATERIALIZED VIEW public.organisation_referral_stats;
REFRESH MATERIALIZED VIEW public.member_referral_stats;

-- =====================================================
-- Migration Complete
-- =====================================================
