-- Migration 158: Create Agent CaaS RPC Functions
-- Purpose: Create RPC functions for Agent CaaS score calculation
-- Date: 2026-01-07
-- Reference: Agent CaaS Implementation (Data Aggregation for Buckets 1-3)

-- ============================================================================
-- FUNCTION 1: Get Agent Recruitment Stats
-- Returns comprehensive recruitment statistics for Agent CaaS scoring
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_agent_recruitment_stats(agent_id UUID)
RETURNS TABLE (
  total_recruited_tutors INTEGER,
  recruited_tutors_in_org INTEGER,
  recent_recruits_90d INTEGER,
  avg_recruited_tutor_caas NUMERIC,
  total_sessions_by_recruited BIGINT,
  avg_rating_of_recruited NUMERIC,
  active_after_6_months INTEGER,
  unique_subjects INTEGER,
  org_avg_caas NUMERIC,
  avg_member_caas_improvement NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH recruited_tutors AS (
    -- Get all tutors recruited by this agent via AGENT_REFERRAL edges
    SELECT
      pg.target_profile_id as tutor_id,
      pg.created_at as recruited_at,
      p.roles,
      cs.total_score as current_caas
    FROM public.profile_graph pg
    INNER JOIN public.profiles p ON pg.target_profile_id = p.id
    LEFT JOIN public.caas_scores cs ON p.id = cs.profile_id
    WHERE pg.source_profile_id = agent_id
      AND pg.edge_type = 'AGENT_REFERRAL'
      AND 'tutor' = ANY(p.roles)
  ),
  recruited_stats AS (
    SELECT
      COUNT(*)::INTEGER as total_recruited,
      COUNT(*) FILTER (WHERE recruited_at >= NOW() - INTERVAL '90 days')::INTEGER as recent_90d,
      COALESCE(AVG(current_caas), 0) as avg_caas
    FROM recruited_tutors
  ),
  org_membership AS (
    -- Check how many recruited tutors joined agent's organisation
    SELECT COUNT(DISTINCT ngm.profile_id)::INTEGER as in_org_count
    FROM recruited_tutors rt
    INNER JOIN public.group_members ngm ON rt.tutor_id = ngm.profile_id
    INNER JOIN public.connection_groups cg ON ngm.group_id = cg.id
    WHERE cg.profile_id = agent_id
      AND cg.type = 'organisation'
  ),
  performance_stats AS (
    -- Aggregate performance of recruited tutors
    SELECT
      COUNT(DISTINCT b.id) as total_sessions,
      COALESCE(AVG(pr.rating), 0) as avg_rating
    FROM recruited_tutors rt
    INNER JOIN public.listings l ON rt.tutor_id = l.profile_id
    INNER JOIN public.bookings b ON l.id = b.listing_id
    LEFT JOIN public.profile_reviews pr ON b.id = pr.booking_id
    WHERE b.status = 'Completed'
      AND (b.type IS NULL OR b.type != 'free_help') -- Exclude free sessions
  ),
  retention_stats AS (
    -- Check retention (still active after 6 months)
    SELECT COUNT(*)::INTEGER as active_count
    FROM recruited_tutors rt
    INNER JOIN public.profiles p ON rt.tutor_id = p.id
    WHERE rt.recruited_at <= NOW() - INTERVAL '6 months'
      AND p.last_active_at >= NOW() - INTERVAL '30 days'
  ),
  subject_diversity AS (
    -- Count unique subjects across recruited tutors
    SELECT COUNT(DISTINCT subj)::INTEGER as unique_count
    FROM recruited_tutors rt
    INNER JOIN public.profiles p ON rt.tutor_id = p.id
    CROSS JOIN LATERAL unnest(
      COALESCE((p.professional_details->>'subjects')::TEXT[], '{}'::TEXT[])
    ) as subj
    WHERE subj IS NOT NULL AND subj != ''
  ),
  org_quality AS (
    -- Get org team average CaaS if agent has org
    SELECT COALESCE(AVG(cs.total_score), 0) as org_avg
    FROM public.connection_groups cg
    INNER JOIN public.group_members ngm ON cg.id = ngm.group_id
    INNER JOIN public.caas_scores cs ON ngm.profile_id = cs.profile_id
    WHERE cg.profile_id = agent_id
      AND cg.type = 'organisation'
  ),
  member_improvement AS (
    -- Calculate average CaaS improvement of org members over 6 months
    -- Note: This is simplified - in production, would track historical scores via caas_score_history table
    -- For now, we estimate improvement as (current_score - 50) as a proxy
    SELECT COALESCE(AVG(cs.total_score - 50), 0) as avg_improvement
    FROM public.connection_groups cg
    INNER JOIN public.group_members ngm ON cg.id = ngm.group_id
    INNER JOIN public.caas_scores cs ON ngm.profile_id = cs.profile_id
    WHERE cg.profile_id = agent_id
      AND cg.type = 'organisation'
      AND ngm.created_at <= NOW() - INTERVAL '6 months'
  )
  SELECT
    rs.total_recruited,
    COALESCE(om.in_org_count, 0),
    rs.recent_90d,
    rs.avg_caas,
    ps.total_sessions,
    ps.avg_rating,
    COALESCE(ret.active_count, 0),
    COALESCE(sd.unique_count, 0),
    oq.org_avg,
    mi.avg_improvement
  FROM recruited_stats rs
  CROSS JOIN org_membership om
  CROSS JOIN performance_stats ps
  CROSS JOIN retention_stats ret
  CROSS JOIN subject_diversity sd
  CROSS JOIN org_quality oq
  CROSS JOIN member_improvement mi;
END;
$$;

COMMENT ON FUNCTION public.get_agent_recruitment_stats(UUID) IS
  'Returns comprehensive recruitment statistics for Agent CaaS scoring (Buckets 1-3).
   Used by AgentCaaSStrategy.calculate() to aggregate data for score calculation.';

-- ============================================================================
-- FUNCTION 2: Get Organisation Business Stats
-- Returns organisation performance metrics for Agent CaaS scoring
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_organisation_business_stats(org_id UUID)
RETURNS TABLE (
  org_page_bookings BIGINT,
  org_acquired_clients BIGINT,
  internal_referral_bookings BIGINT,
  total_bookings BIGINT,
  current_active_members INTEGER,
  new_members_90d INTEGER,
  service_area_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Bookings via org public page (Brand & Marketing metric)
    COUNT(*) FILTER (WHERE b.source_type = 'org_page') as org_page_bookings,

    -- Unique clients acquired via org channels (Client Acquisition metric)
    COUNT(DISTINCT b.client_id) FILTER (WHERE b.source_type IN ('org_page', 'org_referral')) as org_acquired_clients,

    -- Internal referral bookings (Team Collaboration metric)
    COUNT(*) FILTER (WHERE b.source_type = 'org_referral') as internal_referral_bookings,

    -- Total org bookings (for calculating collaboration rate)
    COUNT(*) as total_bookings,

    -- Current active members (Team Size metric)
    (SELECT COUNT(*)::INTEGER FROM public.group_members ngm
     INNER JOIN public.profiles p ON ngm.profile_id = p.id
     WHERE ngm.group_id = org_id
       AND p.last_active_at >= NOW() - INTERVAL '30 days') as current_active_members,

    -- New members in last 90 days (Growth Momentum metric)
    (SELECT COUNT(*)::INTEGER FROM public.group_members ngm
     WHERE ngm.group_id = org_id
       AND ngm.created_at >= NOW() - INTERVAL '90 days') as new_members_90d,

    -- Service area count (Geographic Expansion metric)
    (SELECT COALESCE(array_length(service_area, 1), 0)::INTEGER
     FROM public.connection_groups
     WHERE id = org_id) as service_area_count

  FROM public.bookings b
  WHERE b.source_organisation_id = org_id
    AND b.status = 'Completed';
END;
$$;

COMMENT ON FUNCTION public.get_organisation_business_stats(UUID) IS
  'Returns organisation business metrics for Agent CaaS scoring (Buckets 2-3).
   Includes brand presence, client acquisition, team collaboration, and growth metrics.';

-- ============================================================================
-- FUNCTION 3: Check Organisation Subscription Status
-- Validates if agent has active organisation subscription (required for bonuses)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_org_subscription_active(agent_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  has_active_sub BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.connection_groups cg
    INNER JOIN public.organisation_subscriptions os ON cg.id = os.organisation_id
    WHERE cg.profile_id = agent_id
      AND cg.type = 'organisation'
      AND os.status = 'active'
      AND os.current_period_end > NOW()
  ) INTO has_active_sub;

  RETURN COALESCE(has_active_sub, false);
END;
$$;

COMMENT ON FUNCTION public.check_org_subscription_active(UUID) IS
  'Checks if agent has an active organisation subscription.
   Returns true if agent owns an organisation with active subscription (status = active, not expired).
   Used to gate Agent CaaS organisation bonuses (+30 points potential).';

-- ============================================================================
-- FUNCTION 4: Calculate Organisation CaaS Score
-- Returns organisation credibility score based on weighted team average
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_organisation_caas(org_id UUID)
RETURNS TABLE (
  total_score NUMERIC,
  base_score NUMERIC,
  verification_bonus NUMERIC,
  active_member_count INTEGER,
  team_avg_caas NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_base_score NUMERIC;
  v_bonus NUMERIC := 0;
  v_active_members INTEGER;
  v_team_avg NUMERIC;
BEGIN
  -- Get org verification details
  SELECT
    COALESCE(business_verified, false)::INT * 2 +
    COALESCE(safeguarding_certified, false)::INT * 2 +
    COALESCE(professional_insurance, false)::INT * 1 +
    CASE WHEN association_member IS NOT NULL AND association_member != '' THEN 1 ELSE 0 END
  INTO v_bonus
  FROM public.connection_groups
  WHERE id = org_id AND type = 'organisation';

  -- Calculate weighted team average CaaS
  WITH team_members AS (
    SELECT
      p.id,
      cs.total_score,
      -- Activity weight: number of completed sessions in last 90 days
      (SELECT COUNT(*)
       FROM public.listings l
       INNER JOIN public.bookings b ON l.id = b.listing_id
       WHERE l.profile_id = p.id
         AND b.status = 'Completed'
         AND b.created_at >= NOW() - INTERVAL '90 days'
      ) as sessions_90d
    FROM public.group_members ngm
    INNER JOIN public.profiles p ON ngm.profile_id = p.id
    LEFT JOIN public.caas_scores cs ON p.id = cs.profile_id
    WHERE ngm.group_id = org_id
      AND p.last_active_at >= NOW() - INTERVAL '30 days' -- Only active members
  ),
  weighted_avg AS (
    SELECT
      COUNT(*) as member_count,
      SUM(total_score * GREATEST(sessions_90d, 1)) / NULLIF(SUM(GREATEST(sessions_90d, 1)), 0) as weighted_avg_score
    FROM team_members
    WHERE total_score IS NOT NULL
  )
  SELECT member_count, weighted_avg_score
  INTO v_active_members, v_team_avg
  FROM weighted_avg;

  -- Set base score (require minimum 3 members)
  IF v_active_members >= 3 THEN
    v_base_score := COALESCE(v_team_avg, 0);
  ELSE
    v_base_score := 0; -- Not enough members for valid score
  END IF;

  -- Return results
  RETURN QUERY SELECT
    ROUND(v_base_score + v_bonus, 1) as total_score,
    ROUND(v_base_score, 1) as base_score,
    v_bonus as verification_bonus,
    COALESCE(v_active_members, 0) as active_member_count,
    ROUND(COALESCE(v_team_avg, 0), 1) as team_avg_caas;
END;
$$;

COMMENT ON FUNCTION public.calculate_organisation_caas(UUID) IS
  'Calculates organisation CaaS score based on weighted team average.
   Activity weighting: Members with more sessions in last 90 days contribute more to average.
   Verification bonuses: business_verified (+2), safeguarding_certified (+2), insurance (+1), association (+1).
   Requires minimum 3 active members for valid score.';

-- ============================================================================
-- Example usage (commented out)
-- ============================================================================

-- Test agent recruitment stats:
-- SELECT * FROM get_agent_recruitment_stats('agent-uuid-here');

-- Test organisation business stats:
-- SELECT * FROM get_organisation_business_stats('org-uuid-here');

-- Check if agent has active subscription:
-- SELECT check_org_subscription_active('agent-uuid-here');

-- Calculate organisation CaaS:
-- SELECT * FROM calculate_organisation_caas('org-uuid-here');
