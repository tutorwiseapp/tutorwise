-- =====================================================
-- Migration 158: Auto-create Organisation Referral Cards
-- Created: 2026-01-06
-- Purpose: Automatically create referral pipeline cards when organisation members refer someone
-- =====================================================

-- =====================================================
-- PART 1: Add fields for tracking referral source
-- =====================================================

-- Add fields to track if this is a manually created referral (pre-signup tracking)
ALTER TABLE public.referrals
ADD COLUMN IF NOT EXISTS manually_created BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referred_name TEXT,
ADD COLUMN IF NOT EXISTS referred_email TEXT,
ADD COLUMN IF NOT EXISTS referred_phone TEXT;

COMMENT ON COLUMN public.referrals.manually_created IS 'True if referral was manually added via Add Referral button (pre-signup tracking)';
COMMENT ON COLUMN public.referrals.referred_name IS 'Name of referred person (for manually created referrals before signup)';
COMMENT ON COLUMN public.referrals.referred_email IS 'Email of referred person (for manually created referrals before signup)';
COMMENT ON COLUMN public.referrals.referred_phone IS 'Phone of referred person (for manually created referrals before signup)';

-- =====================================================
-- PART 2: RPC Function for Manual Referral Creation
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_manual_referral(
    p_organisation_id UUID,
    p_referrer_member_id UUID,
    p_referred_name TEXT,
    p_referred_email TEXT,
    p_referred_phone TEXT DEFAULT NULL,
    p_estimated_value NUMERIC DEFAULT 0.00,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_referral_id UUID;
    v_is_member BOOLEAN;
BEGIN
    -- Verify requester is a member of the organisation
    SELECT EXISTS(
        SELECT 1 FROM group_members gm
        JOIN profile_graph pg ON pg.id = gm.connection_id
        WHERE gm.group_id = p_organisation_id
        AND pg.profile_id = auth.uid()
    ) INTO v_is_member;

    IF NOT v_is_member THEN
        RAISE EXCEPTION 'User is not a member of this organisation';
    END IF;

    -- Verify referrer is a member
    SELECT EXISTS(
        SELECT 1 FROM group_members gm
        JOIN profile_graph pg ON pg.id = gm.connection_id
        WHERE gm.group_id = p_organisation_id
        AND pg.profile_id = p_referrer_member_id
    ) INTO v_is_member;

    IF NOT v_is_member THEN
        RAISE EXCEPTION 'Referrer is not a member of this organisation';
    END IF;

    -- Create manual referral entry
    INSERT INTO public.referrals (
        referrer_profile_id,
        referred_profile_id,
        organisation_id,
        referrer_member_id,
        manually_created,
        referred_name,
        referred_email,
        referred_phone,
        estimated_value,
        conversion_notes,
        conversion_stage,
        status,
        created_at
    ) VALUES (
        p_referrer_member_id,
        NULL, -- No profile yet since manually created
        p_organisation_id,
        p_referrer_member_id,
        true,
        p_referred_name,
        p_referred_email,
        p_referred_phone,
        p_estimated_value,
        p_notes,
        'referred',
        'Referred',
        NOW()
    )
    RETURNING id INTO v_referral_id;

    -- Log activity
    INSERT INTO public.referral_conversion_activities (
        referral_id,
        activity_type,
        performed_by,
        notes,
        metadata
    ) VALUES (
        v_referral_id,
        'referred',
        auth.uid(),
        p_notes,
        jsonb_build_object(
            'source', 'manual',
            'created_via', 'add_referral_button'
        )
    );

    RETURN v_referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_manual_referral IS 'Manually create a referral card for tracking prospects before they sign up';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_manual_referral TO authenticated;

-- =====================================================
-- PART 3: Auto-create referral card when org member refers via link
-- =====================================================

-- Trigger function: Auto-populate organisation_id when referral is created
CREATE OR REPLACE FUNCTION public.auto_set_org_referral_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_org_id UUID;
    v_referrer_name TEXT;
BEGIN
    -- Only process on INSERT for non-manual referrals
    IF TG_OP = 'INSERT' AND (NEW.manually_created IS NULL OR NEW.manually_created = false) THEN

        -- Check if referrer is a member of any organisation
        SELECT gm.group_id INTO v_org_id
        FROM group_members gm
        JOIN profile_graph pg ON pg.id = gm.connection_id
        WHERE pg.profile_id = NEW.referrer_profile_id
        LIMIT 1;

        -- If referrer is in an organisation, set org fields
        IF v_org_id IS NOT NULL THEN
            NEW.organisation_id := v_org_id;
            NEW.referrer_member_id := NEW.referrer_profile_id;

            -- Get referred profile name/email if profile exists
            IF NEW.referred_profile_id IS NOT NULL THEN
                SELECT
                    p.full_name,
                    p.email
                INTO
                    NEW.referred_name,
                    NEW.referred_email
                FROM profiles p
                WHERE p.id = NEW.referred_profile_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_auto_set_org_referral_fields ON public.referrals;
CREATE TRIGGER trg_auto_set_org_referral_fields
    BEFORE INSERT ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION auto_set_org_referral_fields();

COMMENT ON FUNCTION public.auto_set_org_referral_fields IS 'Automatically set organisation_id and referrer_member_id when organisation member creates a referral via referral link';

-- =====================================================
-- PART 4: Update RPC to return referral display data
-- =====================================================

-- Update get_organisation_conversion_pipeline to include new fields
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
    WITH stage_data AS (
        SELECT
            r.conversion_stage as stage,
            jsonb_agg(
                jsonb_build_object(
                    'id', r.id,
                    'referred_name', COALESCE(r.referred_name, p.full_name, 'Unknown'),
                    'referred_email', COALESCE(r.referred_email, p.email, ''),
                    'referred_phone', COALESCE(r.referred_phone, ''),
                    'created_at', r.created_at,
                    'estimated_value', COALESCE(r.estimated_value, 0),
                    'referrer_member', ref_prof.full_name,
                    'manually_created', COALESCE(r.manually_created, false)
                )
                ORDER BY r.created_at DESC
            ) as referrals,
            COUNT(*)::BIGINT as count,
            COALESCE(SUM(r.estimated_value), 0) as total_estimated_value
        FROM public.referrals r
        LEFT JOIN profiles p ON p.id = r.referred_profile_id
        LEFT JOIN profiles ref_prof ON ref_prof.id = r.referrer_member_id
        WHERE r.organisation_id = p_organisation_id
        GROUP BY r.conversion_stage
    )
    SELECT
        s.stage,
        COALESCE(sd.count, 0) as count,
        COALESCE(sd.total_estimated_value, 0) as total_estimated_value,
        COALESCE(sd.referrals, '[]'::jsonb) as referrals
    FROM (
        VALUES
            ('referred'),
            ('contacted'),
            ('meeting'),
            ('proposal'),
            ('negotiating'),
            ('converted')
    ) AS s(stage)
    LEFT JOIN stage_data sd ON sd.stage = s.stage
    ORDER BY
        CASE s.stage
            WHEN 'referred' THEN 1
            WHEN 'contacted' THEN 2
            WHEN 'meeting' THEN 3
            WHEN 'proposal' THEN 4
            WHEN 'negotiating' THEN 5
            WHEN 'converted' THEN 6
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_organisation_conversion_pipeline IS 'Get referral pipeline data with all stages, including manually created referrals';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_organisation_conversion_pipeline TO authenticated;

-- =====================================================
-- PART 5: Update RLS policies to allow manual referral creation
-- =====================================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Organisation members can create referrals" ON public.referrals;

-- Allow organisation members to create referrals
CREATE POLICY "Organisation members can create referrals" ON public.referrals
    FOR INSERT
    WITH CHECK (
        organisation_id IN (
            SELECT gm.group_id
            FROM group_members gm
            JOIN profile_graph pg_source ON pg_source.id = gm.connection_id
            WHERE pg_source.source_profile_id = auth.uid()
               OR pg_source.target_profile_id = auth.uid()
        )
    );

-- Allow organisation members to update their org referrals
DROP POLICY IF EXISTS "Organisation members can update org referrals" ON public.referrals;
CREATE POLICY "Organisation members can update org referrals" ON public.referrals
    FOR UPDATE
    USING (
        organisation_id IN (
            SELECT gm.group_id
            FROM group_members gm
            JOIN profile_graph pg_source ON pg_source.id = gm.connection_id
            WHERE pg_source.source_profile_id = auth.uid()
               OR pg_source.target_profile_id = auth.uid()
        )
    );

-- =====================================================
-- Migration Complete
-- =====================================================
