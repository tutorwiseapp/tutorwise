-- =====================================================
-- Migration 156: Referral Conversion Flow & Client Portal
-- Created: 2025-12-31
-- Purpose: Referral conversion tracking and branded client portal for org referrals
-- =====================================================

-- =====================================================
-- PART 1: Referral Conversion Tracking
-- =====================================================

-- Extend referrals table with conversion stages
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS conversion_stage TEXT DEFAULT 'referred',
ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS first_meeting_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS proposal_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS proposal_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS conversion_notes TEXT,
ADD COLUMN IF NOT EXISTS estimated_value NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS actual_value NUMERIC(10,2);

-- Add check constraint for conversion stages
ALTER TABLE public.referrals
DROP CONSTRAINT IF EXISTS check_conversion_stage;

ALTER TABLE public.referrals
ADD CONSTRAINT check_conversion_stage CHECK (
  conversion_stage IN (
    'referred',      -- Initial referral created
    'contacted',     -- Organisation contacted the referral
    'meeting',       -- Meeting scheduled/completed
    'proposal',      -- Proposal sent
    'negotiating',   -- In negotiation
    'converted',     -- Deal closed (booking created)
    'lost'           -- Opportunity lost
  )
);

-- Indexes for conversion tracking
CREATE INDEX IF NOT EXISTS idx_referrals_conversion_stage ON public.referrals(conversion_stage);
CREATE INDEX IF NOT EXISTS idx_referrals_org_stage ON public.referrals(organisation_id, conversion_stage)
  WHERE organisation_id IS NOT NULL;

COMMENT ON COLUMN public.referrals.conversion_stage IS 'Current stage in the conversion funnel';
COMMENT ON COLUMN public.referrals.estimated_value IS 'Estimated booking value for pipeline forecasting';
COMMENT ON COLUMN public.referrals.actual_value IS 'Actual booking value after conversion';

-- =====================================================
-- PART 2: Referral Conversion Activities Log
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referral_conversion_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_date TIMESTAMPTZ DEFAULT NOW(),
    performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity types: 'contacted', 'meeting_scheduled', 'meeting_completed', 'proposal_sent',
-- 'follow_up', 'negotiation', 'converted', 'lost', 'note'

CREATE INDEX idx_referral_activities_referral ON public.referral_conversion_activities(referral_id);
CREATE INDEX idx_referral_activities_type ON public.referral_conversion_activities(activity_type);
CREATE INDEX idx_referral_activities_date ON public.referral_conversion_activities(activity_date DESC);

COMMENT ON TABLE public.referral_conversion_activities IS 'Timeline of activities for converting referrals';
COMMENT ON COLUMN public.referral_conversion_activities.activity_type IS 'Type of conversion activity performed';
COMMENT ON COLUMN public.referral_conversion_activities.metadata IS 'Additional structured data (e.g., meeting details, proposal link)';

-- =====================================================
-- PART 3: Branded Client Portal Configuration
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organisation_portal_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,

    -- Portal Branding
    portal_enabled BOOLEAN DEFAULT false,
    portal_subdomain TEXT, -- For future subdomain support
    custom_domain TEXT,    -- For future custom domain support

    -- Visual Branding
    primary_color TEXT DEFAULT '#667eea',
    secondary_color TEXT DEFAULT '#764ba2',
    logo_url TEXT,
    cover_image_url TEXT,

    -- Portal Content
    welcome_message TEXT,
    about_text TEXT,
    terms_url TEXT,
    privacy_url TEXT,

    -- Features Enabled
    show_team_members BOOLEAN DEFAULT true,
    show_reviews BOOLEAN DEFAULT true,
    show_pricing BOOLEAN DEFAULT false,
    allow_direct_booking BOOLEAN DEFAULT true,
    require_approval BOOLEAN DEFAULT false,

    -- Integration Settings
    stripe_connect_account_id TEXT,
    calendar_integration_enabled BOOLEAN DEFAULT false,

    -- Tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_org_portal UNIQUE(organisation_id)
);

CREATE INDEX idx_org_portal_enabled ON public.organisation_portal_config(portal_enabled) WHERE portal_enabled = true;
CREATE INDEX idx_org_portal_subdomain ON public.organisation_portal_config(portal_subdomain) WHERE portal_subdomain IS NOT NULL;

COMMENT ON TABLE public.organisation_portal_config IS 'White-labeled client portal configuration for organisations';
COMMENT ON COLUMN public.organisation_portal_config.portal_subdomain IS 'Custom subdomain for organisation portal (e.g., acme.tutorwise.com)';
COMMENT ON COLUMN public.organisation_portal_config.require_approval IS 'Require organisation approval before booking is confirmed';

-- =====================================================
-- PART 4: Client Portal Booking Requests
-- =====================================================

CREATE TABLE IF NOT EXISTS public.portal_booking_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    referral_id UUID REFERENCES public.referrals(id) ON DELETE SET NULL,

    -- Client Information
    client_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    client_phone TEXT,

    -- Booking Request Details
    service_type TEXT,
    subject_area TEXT,
    preferred_tutor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_count INTEGER DEFAULT 1,
    session_duration INTEGER DEFAULT 60, -- minutes
    preferred_schedule TEXT, -- JSON or text describing availability
    budget_range TEXT,
    additional_notes TEXT,

    -- Status Tracking
    status TEXT DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    response_notes TEXT,

    -- Payment Intent (if Stripe integration enabled)
    payment_intent_id TEXT,
    payment_status TEXT DEFAULT 'pending',
    amount_paid NUMERIC(10,2) DEFAULT 0.00,

    -- Conversion
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    converted_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status values: 'pending', 'reviewing', 'approved', 'rejected', 'converted'

CREATE INDEX idx_portal_requests_org ON public.portal_booking_requests(organisation_id);
CREATE INDEX idx_portal_requests_status ON public.portal_booking_requests(status);
CREATE INDEX idx_portal_requests_referral ON public.portal_booking_requests(referral_id);
CREATE INDEX idx_portal_requests_client ON public.portal_booking_requests(client_profile_id);

COMMENT ON TABLE public.portal_booking_requests IS 'Booking requests submitted through organisation portals';
COMMENT ON COLUMN public.portal_booking_requests.status IS 'Request status: pending, reviewing, approved, rejected, converted';

-- =====================================================
-- PART 5: RPC Functions
-- =====================================================

-- Function: Update conversion stage and log activity
CREATE OR REPLACE FUNCTION public.update_referral_conversion_stage(
    p_referral_id UUID,
    p_new_stage TEXT,
    p_performed_by UUID,
    p_notes TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update referral stage
    UPDATE referrals
    SET
        conversion_stage = p_new_stage,
        updated_at = NOW(),
        -- Update stage-specific timestamps
        contacted_at = CASE WHEN p_new_stage = 'contacted' AND contacted_at IS NULL THEN NOW() ELSE contacted_at END,
        first_meeting_at = CASE WHEN p_new_stage = 'meeting' AND first_meeting_at IS NULL THEN NOW() ELSE first_meeting_at END,
        proposal_sent_at = CASE WHEN p_new_stage = 'proposal' AND proposal_sent_at IS NULL THEN NOW() ELSE proposal_sent_at END,
        proposal_accepted_at = CASE WHEN p_new_stage = 'converted' AND proposal_accepted_at IS NULL THEN NOW() ELSE proposal_accepted_at END
    WHERE id = p_referral_id;

    -- Log activity
    INSERT INTO referral_conversion_activities (
        referral_id,
        activity_type,
        performed_by,
        notes,
        metadata
    ) VALUES (
        p_referral_id,
        p_new_stage,
        p_performed_by,
        p_notes,
        p_metadata
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_referral_conversion_stage IS 'Update referral conversion stage and log activity';

-- Function: Get organisation conversion pipeline
CREATE OR REPLACE FUNCTION public.get_organisation_conversion_pipeline(
    p_organisation_id UUID
)
RETURNS TABLE (
    stage TEXT,
    count BIGINT,
    total_estimated_value NUMERIC,
    referrals JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.conversion_stage as stage,
        COUNT(*) as count,
        COALESCE(SUM(r.estimated_value), 0) as total_estimated_value,
        jsonb_agg(
            jsonb_build_object(
                'id', r.id,
                'referred_name', p.full_name,
                'referred_email', p.email,
                'created_at', r.created_at,
                'estimated_value', r.estimated_value,
                'referrer_member', rm.full_name
            )
            ORDER BY r.updated_at DESC
        ) as referrals
    FROM referrals r
    LEFT JOIN profiles p ON p.id = r.referred_profile_id
    LEFT JOIN profiles rm ON rm.id = r.referrer_member_id
    WHERE r.organisation_id = p_organisation_id
      AND r.conversion_stage != 'lost'
    GROUP BY r.conversion_stage
    ORDER BY
        CASE r.conversion_stage
            WHEN 'referred' THEN 1
            WHEN 'contacted' THEN 2
            WHEN 'meeting' THEN 3
            WHEN 'proposal' THEN 4
            WHEN 'negotiating' THEN 5
            WHEN 'converted' THEN 6
        END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_organisation_conversion_pipeline IS 'Get conversion pipeline stages with referral details';

-- =====================================================
-- PART 6: Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.referral_conversion_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_portal_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_booking_requests ENABLE ROW LEVEL SECURITY;

-- Conversion Activities: Org members can view their org's activities
CREATE POLICY "Org members view conversion activities"
    ON public.referral_conversion_activities FOR SELECT
    USING (
        referral_id IN (
            SELECT r.id FROM referrals r
            WHERE r.organisation_id IN (
                SELECT gm.group_id FROM group_members gm
                WHERE gm.connection_id = auth.uid()
            )
        )
    );

-- Conversion Activities: Org members can insert activities
CREATE POLICY "Org members create conversion activities"
    ON public.referral_conversion_activities FOR INSERT
    WITH CHECK (
        referral_id IN (
            SELECT r.id FROM referrals r
            WHERE r.organisation_id IN (
                SELECT gm.group_id FROM group_members gm
                WHERE gm.connection_id = auth.uid()
            )
        )
    );

-- Portal Config: Org owners manage config
CREATE POLICY "Org owners manage portal config"
    ON public.organisation_portal_config FOR ALL
    USING (
        organisation_id IN (
            SELECT id FROM connection_groups WHERE profile_id = auth.uid()
        )
    );

-- Portal Config: Public can view enabled portals
CREATE POLICY "Public view enabled portals"
    ON public.organisation_portal_config FOR SELECT
    USING (portal_enabled = true);

-- Booking Requests: Org members view their requests
CREATE POLICY "Org members view booking requests"
    ON public.portal_booking_requests FOR SELECT
    USING (
        organisation_id IN (
            SELECT gm.group_id FROM group_members gm
            WHERE gm.connection_id = auth.uid()
        )
    );

-- Booking Requests: Anyone can create (for public portal)
CREATE POLICY "Public create booking requests"
    ON public.portal_booking_requests FOR INSERT
    WITH CHECK (true);

-- Booking Requests: Org members can update
CREATE POLICY "Org members update booking requests"
    ON public.portal_booking_requests FOR UPDATE
    USING (
        organisation_id IN (
            SELECT gm.group_id FROM group_members gm
            WHERE gm.connection_id = auth.uid()
        )
    );

-- =====================================================
-- PART 7: Triggers
-- =====================================================

-- Auto-update conversion stage when booking is converted
CREATE OR REPLACE FUNCTION auto_update_conversion_stage_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Converted' AND OLD.status != 'Converted' THEN
        UPDATE referrals
        SET
            conversion_stage = 'converted',
            actual_value = (SELECT total_amount FROM bookings WHERE id = NEW.booking_id)
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_update_conversion_stage ON public.referrals;
CREATE TRIGGER trg_auto_update_conversion_stage
    AFTER UPDATE OF status ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_conversion_stage_on_booking();

-- =====================================================
-- PART 8: Grants
-- =====================================================

GRANT SELECT ON public.referral_conversion_activities TO authenticated;
GRANT INSERT ON public.referral_conversion_activities TO authenticated;
GRANT SELECT ON public.organisation_portal_config TO authenticated, anon;
GRANT SELECT ON public.portal_booking_requests TO authenticated;
GRANT INSERT ON public.portal_booking_requests TO authenticated, anon;
GRANT UPDATE ON public.portal_booking_requests TO authenticated;

-- =====================================================
-- Migration Complete
-- =====================================================
