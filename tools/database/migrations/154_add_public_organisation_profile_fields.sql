-- File: tools/database/migrations/154_add_public_organisation_profile_fields.sql
-- Purpose: Add public profile fields to connection_groups for organisation public pages
-- Date: 2025-12-31
-- Reference: Public Organisation Profile Feature (LinkedIn/Facebook-style business pages)

-- ============================================================================
-- PART 1: Extend connection_groups with public profile fields
-- ============================================================================

ALTER TABLE public.connection_groups
-- Identity & Branding (similar to profiles)
ADD COLUMN IF NOT EXISTS tagline TEXT,                    -- Short mission statement
ADD COLUMN IF NOT EXISTS bio TEXT,                         -- Full organisation description
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,             -- Hero banner image
ADD COLUMN IF NOT EXISTS video_intro_url TEXT,             -- Video introduction

-- Location (similar to profiles)
ADD COLUMN IF NOT EXISTS location_city TEXT,               -- Primary city
ADD COLUMN IF NOT EXISTS location_country TEXT,            -- Country
ADD COLUMN IF NOT EXISTS service_area TEXT[],              -- Multiple cities/regions served

-- Professional Information
ADD COLUMN IF NOT EXISTS subjects_offered TEXT[],          -- Aggregate subjects from team
ADD COLUMN IF NOT EXISTS levels_offered TEXT[],            -- Aggregate levels from team
ADD COLUMN IF NOT EXISTS established_date DATE,            -- When organisation was founded

-- Verification & Credentials (similar to profiles)
ADD COLUMN IF NOT EXISTS business_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS safeguarding_certified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS professional_insurance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS association_member TEXT,          -- e.g., "Tutors' Association UK"

-- Social Links (similar to profiles)
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}',  -- Twitter, LinkedIn, Facebook, etc.

-- Privacy & SEO (similar to profiles)
ADD COLUMN IF NOT EXISTS public_visible BOOLEAN DEFAULT true,      -- Show on public pages
ADD COLUMN IF NOT EXISTS allow_indexing BOOLEAN DEFAULT true,      -- Allow search engine indexing

-- Trust Score (similar to profiles.caas_score)
ADD COLUMN IF NOT EXISTS caas_score INTEGER;               -- Aggregate CaaS score of team

-- ============================================================================
-- PART 2: Create organisation_views table (copy pattern from profile_views)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organisation_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,  -- NULL for anonymous
    session_id TEXT NOT NULL,                               -- For deduplication
    referrer_source TEXT,                                   -- 'search', 'referral', 'direct', 'social'
    user_agent TEXT,
    ip_address INET,
    viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organisation_views_org_id
    ON public.organisation_views(organisation_id);

CREATE INDEX IF NOT EXISTS idx_organisation_views_session
    ON public.organisation_views(session_id);

CREATE INDEX IF NOT EXISTS idx_organisation_views_viewer
    ON public.organisation_views(viewer_id)
    WHERE viewer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_organisation_views_viewed_at
    ON public.organisation_views(viewed_at DESC);

-- ============================================================================
-- PART 3: Create materialized view for fast aggregation (copy pattern from profile_view_counts)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.organisation_view_counts AS
SELECT
    organisation_id,
    COUNT(*) as total_views,
    COUNT(DISTINCT viewer_id) FILTER (WHERE viewer_id IS NOT NULL) as unique_viewers,
    COUNT(DISTINCT session_id) as unique_sessions,
    MAX(viewed_at) as last_viewed_at
FROM public.organisation_views
GROUP BY organisation_id;

-- Create unique index on materialized view for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_organisation_view_counts_org_id
    ON public.organisation_view_counts(organisation_id);

-- ============================================================================
-- PART 4: Create RPC function to get organisation public stats
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_organisation_public_stats(p_org_id UUID)
RETURNS TABLE (
    total_sessions BIGINT,
    total_reviews BIGINT,
    avg_rating NUMERIC,
    total_tutors BIGINT,
    profile_views BIGINT,
    unique_subjects TEXT[],
    unique_levels TEXT[],
    dbs_verified_tutors BIGINT,
    established_date DATE,
    total_clients BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Total sessions completed by all team members
        COUNT(DISTINCT b.id) as total_sessions,

        -- Total reviews for all team members
        COUNT(DISTINCT pr.id) as total_reviews,

        -- Average rating across all team members
        ROUND(AVG(pr.rating), 1) as avg_rating,

        -- Total active tutors in organisation
        COUNT(DISTINCT ngm.profile_id) as total_tutors,

        -- Profile views from materialized view
        COALESCE(MAX(ovc.total_views), 0) as profile_views,

        -- Aggregate unique subjects offered by team
        ARRAY_AGG(DISTINCT subj) FILTER (WHERE subj IS NOT NULL) as unique_subjects,

        -- Aggregate unique levels offered by team
        ARRAY_AGG(DISTINCT lvl) FILTER (WHERE lvl IS NOT NULL) as unique_levels,

        -- Count of DBS-verified tutors
        COUNT(DISTINCT ngm.profile_id) FILTER (WHERE p.dbs_verified = true) as dbs_verified_tutors,

        -- Organisation established date
        MAX(cg.established_date) as established_date,

        -- Total unique clients served
        COUNT(DISTINCT b.client_id) as total_clients

    FROM public.connection_groups cg
    LEFT JOIN public.network_group_members ngm ON cg.id = ngm.group_id
    LEFT JOIN public.profiles p ON ngm.profile_id = p.id
    LEFT JOIN public.bookings b ON p.id = b.tutor_id AND b.status = 'Completed'
    LEFT JOIN public.profile_reviews pr ON b.id = pr.booking_id
    LEFT JOIN public.organisation_view_counts ovc ON cg.id = ovc.organisation_id
    -- Extract subjects from professional_details JSONB
    LEFT JOIN LATERAL (
        SELECT unnest(
            COALESCE(
                (p.professional_details->>'subjects')::TEXT[],
                '{}'::TEXT[]
            )
        ) as subj
    ) subjects ON true
    -- Extract levels from professional_details JSONB
    LEFT JOIN LATERAL (
        SELECT unnest(
            COALESCE(
                (p.professional_details->>'levels')::TEXT[],
                '{}'::TEXT[]
            )
        ) as lvl
    ) levels ON true

    WHERE cg.id = p_org_id
      AND cg.type = 'organisation'
      AND cg.public_visible = true
    GROUP BY cg.id;
END;
$$;

-- ============================================================================
-- PART 5: Create function to refresh organisation view counts
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_organisation_view_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.organisation_view_counts;
END;
$$;

-- ============================================================================
-- PART 6: RLS Policies for organisation_views
-- ============================================================================

ALTER TABLE public.organisation_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert view records (tracking anonymous + authenticated views)
CREATE POLICY "Anyone can track organisation views"
    ON public.organisation_views FOR INSERT
    WITH CHECK (true);

-- Users can view their own view history
CREATE POLICY "Users can view their own organisation view history"
    ON public.organisation_views FOR SELECT
    USING (viewer_id = auth.uid());

-- Organisation owners can view analytics for their organisations
CREATE POLICY "Organisation owners can view their analytics"
    ON public.organisation_views FOR SELECT
    USING (
        organisation_id IN (
            SELECT id FROM public.connection_groups
            WHERE profile_id = auth.uid()
        )
    );

-- ============================================================================
-- PART 7: Indexes for public organisation queries
-- ============================================================================

-- Index for slug-based lookups (primary route pattern)
CREATE INDEX IF NOT EXISTS idx_connection_groups_slug_public
    ON public.connection_groups(slug)
    WHERE type = 'organisation' AND public_visible = true;

-- Index for city-based filtering
CREATE INDEX IF NOT EXISTS idx_connection_groups_location_city
    ON public.connection_groups(location_city)
    WHERE type = 'organisation' AND public_visible = true;

-- Index for subjects array filtering
CREATE INDEX IF NOT EXISTS idx_connection_groups_subjects
    ON public.connection_groups USING GIN (subjects_offered)
    WHERE type = 'organisation';

-- Index for trust score filtering/sorting
CREATE INDEX IF NOT EXISTS idx_connection_groups_caas_score
    ON public.connection_groups(caas_score DESC)
    WHERE type = 'organisation' AND public_visible = true;

-- ============================================================================
-- PART 8: Comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.connection_groups.tagline IS
    'Short mission statement or slogan for organisation (similar to profile bio)';

COMMENT ON COLUMN public.connection_groups.bio IS
    'Full organisation description/about text (public-facing)';

COMMENT ON COLUMN public.connection_groups.cover_image_url IS
    'Hero banner image URL for organisation public page';

COMMENT ON COLUMN public.connection_groups.video_intro_url IS
    'Organisation introduction video URL (e.g., YouTube, Vimeo)';

COMMENT ON COLUMN public.connection_groups.location_city IS
    'Primary city where organisation operates';

COMMENT ON COLUMN public.connection_groups.location_country IS
    'Country where organisation is based';

COMMENT ON COLUMN public.connection_groups.service_area IS
    'Array of cities/regions where organisation provides services';

COMMENT ON COLUMN public.connection_groups.subjects_offered IS
    'Aggregate array of subjects offered by organisation team';

COMMENT ON COLUMN public.connection_groups.levels_offered IS
    'Aggregate array of education levels supported (GCSE, A-Level, etc.)';

COMMENT ON COLUMN public.connection_groups.established_date IS
    'Date when organisation was founded/established';

COMMENT ON COLUMN public.connection_groups.business_verified IS
    'Whether organisation has verified business credentials';

COMMENT ON COLUMN public.connection_groups.safeguarding_certified IS
    'Whether organisation has safeguarding certification';

COMMENT ON COLUMN public.connection_groups.professional_insurance IS
    'Whether organisation has professional indemnity insurance';

COMMENT ON COLUMN public.connection_groups.association_member IS
    'Professional association membership (e.g., Tutors Association UK)';

COMMENT ON COLUMN public.connection_groups.social_links IS
    'JSONB object containing social media URLs (twitter, linkedin, facebook, etc.)';

COMMENT ON COLUMN public.connection_groups.public_visible IS
    'Whether organisation public page is visible/accessible';

COMMENT ON COLUMN public.connection_groups.allow_indexing IS
    'Whether to allow search engines to index organisation public page';

COMMENT ON COLUMN public.connection_groups.caas_score IS
    'Aggregate CaaS trust score calculated from team members';

COMMENT ON TABLE public.organisation_views IS
    'Tracks views of organisation public pages (similar to profile_views)';

COMMENT ON TABLE public.organisation_view_counts IS
    'Materialized view providing fast aggregated view counts for organisations';

COMMENT ON FUNCTION public.get_organisation_public_stats(UUID) IS
    'Returns public statistics for an organisation (sessions, reviews, tutors, etc.)';
