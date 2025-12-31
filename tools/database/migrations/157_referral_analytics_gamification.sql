-- =====================================================
-- Migration 157: Referral Analytics & Gamification
-- Purpose: Advanced analytics, gamification, and automation for referral system
-- Created: 2025-12-31
-- =====================================================

-- =====================================================
-- PART 1: Analytics Tables
-- =====================================================

-- Track conversion funnel metrics over time
CREATE TABLE IF NOT EXISTS public.referral_funnel_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    -- Stage counts
    total_referrals INTEGER DEFAULT 0,
    contacted_count INTEGER DEFAULT 0,
    meeting_count INTEGER DEFAULT 0,
    proposal_count INTEGER DEFAULT 0,
    negotiating_count INTEGER DEFAULT 0,
    converted_count INTEGER DEFAULT 0,
    lost_count INTEGER DEFAULT 0,

    -- Conversion rates (%)
    referred_to_contacted_rate DECIMAL(5,2) DEFAULT 0,
    contacted_to_meeting_rate DECIMAL(5,2) DEFAULT 0,
    meeting_to_proposal_rate DECIMAL(5,2) DEFAULT 0,
    proposal_to_negotiating_rate DECIMAL(5,2) DEFAULT 0,
    negotiating_to_converted_rate DECIMAL(5,2) DEFAULT 0,
    overall_conversion_rate DECIMAL(5,2) DEFAULT 0,

    -- Time-to-conversion metrics (in days)
    avg_time_to_contacted DECIMAL(10,2),
    avg_time_to_meeting DECIMAL(10,2),
    avg_time_to_proposal DECIMAL(10,2),
    avg_time_to_converted DECIMAL(10,2),

    -- Value metrics
    total_pipeline_value DECIMAL(12,2) DEFAULT 0,
    total_converted_value DECIMAL(12,2) DEFAULT 0,
    avg_deal_size DECIMAL(12,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_org_period UNIQUE(organisation_id, period_start, period_end)
);

CREATE INDEX idx_funnel_analytics_org ON public.referral_funnel_analytics(organisation_id);
CREATE INDEX idx_funnel_analytics_period ON public.referral_funnel_analytics(period_start, period_end);

-- Track member performance trends over time
CREATE TABLE IF NOT EXISTS public.member_performance_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,

    referral_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    total_commission DECIMAL(12,2) DEFAULT 0,
    avg_time_to_conversion DECIMAL(10,2),
    rank_in_org INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_member_period UNIQUE(member_id, organisation_id, period_start, period_end)
);

CREATE INDEX idx_member_trends_member ON public.member_performance_trends(member_id);
CREATE INDEX idx_member_trends_org ON public.member_performance_trends(organisation_id);
CREATE INDEX idx_member_trends_period ON public.member_performance_trends(period_start, period_end);

-- =====================================================
-- PART 2: Gamification Tables
-- =====================================================

-- Define achievement types
CREATE TABLE IF NOT EXISTS public.referral_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    tier VARCHAR(20) CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    requirement_type VARCHAR(50) CHECK (requirement_type IN ('referral_count', 'conversion_count', 'commission_earned', 'conversion_rate', 'streak_days', 'monthly_leader')),
    requirement_value INTEGER NOT NULL,
    points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track member achievements
CREATE TABLE IF NOT EXISTS public.member_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES public.referral_achievements(id) ON DELETE CASCADE,
    organisation_id UUID REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB,

    CONSTRAINT unique_member_achievement UNIQUE(member_id, achievement_id, organisation_id)
);

CREATE INDEX idx_member_achievements_member ON public.member_achievements(member_id);
CREATE INDEX idx_member_achievements_org ON public.member_achievements(organisation_id);

-- Track referral streaks
CREATE TABLE IF NOT EXISTS public.referral_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_referral_date DATE,
    streak_start_date DATE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_member_streak UNIQUE(member_id, organisation_id)
);

CREATE INDEX idx_streaks_member ON public.referral_streaks(member_id);
CREATE INDEX idx_streaks_org ON public.referral_streaks(organisation_id);

-- Monthly challenges
CREATE TABLE IF NOT EXISTS public.referral_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50) CHECK (challenge_type IN ('most_referrals', 'highest_conversion', 'fastest_conversion', 'team_total')),
    target_value INTEGER NOT NULL,
    reward_description TEXT,
    reward_amount DECIMAL(12,2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_challenges_org ON public.referral_challenges(organisation_id);
CREATE INDEX idx_challenges_dates ON public.referral_challenges(start_date, end_date);

-- Track challenge participation
CREATE TABLE IF NOT EXISTS public.challenge_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES public.referral_challenges(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    current_value INTEGER DEFAULT 0,
    is_winner BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,

    CONSTRAINT unique_challenge_participant UNIQUE(challenge_id, member_id)
);

CREATE INDEX idx_challenge_participants_challenge ON public.challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_member ON public.challenge_participants(member_id);

-- =====================================================
-- PART 3: Notification/Automation Tables
-- =====================================================

-- Email automation rules
CREATE TABLE IF NOT EXISTS public.referral_email_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    trigger_event VARCHAR(50) CHECK (trigger_event IN ('stage_change', 'commission_earned', 'achievement_unlocked', 'challenge_started', 'challenge_won')),
    trigger_stage VARCHAR(50),
    email_template_id VARCHAR(100),
    recipient_type VARCHAR(20) CHECK (recipient_type IN ('referrer', 'lead', 'org_owner')),
    subject_template TEXT,
    body_template TEXT,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_automations_org ON public.referral_email_automations(organisation_id);
CREATE INDEX idx_email_automations_event ON public.referral_email_automations(trigger_event);

-- Email queue
CREATE TABLE IF NOT EXISTS public.referral_email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID REFERENCES public.referral_email_automations(id) ON DELETE SET NULL,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_queue_status ON public.referral_email_queue(status);
CREATE INDEX idx_email_queue_created ON public.referral_email_queue(created_at);

-- SMS notifications (integration with Twilio/etc)
CREATE TABLE IF NOT EXISTS public.referral_sms_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    trigger_event VARCHAR(50),
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sms_notifications_org ON public.referral_sms_notifications(organisation_id);
CREATE INDEX idx_sms_notifications_status ON public.referral_sms_notifications(status);

-- Slack/Teams webhook integrations
CREATE TABLE IF NOT EXISTS public.referral_webhook_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.connection_groups(id) ON DELETE CASCADE,
    integration_type VARCHAR(20) CHECK (integration_type IN ('slack', 'teams', 'discord', 'webhook')),
    webhook_url TEXT NOT NULL,
    trigger_events TEXT[], -- Array of events to trigger on
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_integrations_org ON public.referral_webhook_integrations(organisation_id);

-- =====================================================
-- PART 4: Analytics RPC Functions
-- =====================================================

-- Get comprehensive conversion funnel data
CREATE OR REPLACE FUNCTION public.get_conversion_funnel_analytics(
    p_organisation_id UUID,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    stage VARCHAR(50),
    count BIGINT,
    percentage DECIMAL(5,2),
    avg_time_in_stage DECIMAL(10,2),
    drop_off_rate DECIMAL(5,2)
) AS $$
DECLARE
    v_start_date TIMESTAMPTZ;
    v_end_date TIMESTAMPTZ;
    v_total_referrals BIGINT;
BEGIN
    -- Default to last 30 days if not specified
    v_start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
    v_end_date := COALESCE(p_end_date, NOW());

    -- Get total referrals in period
    SELECT COUNT(*) INTO v_total_referrals
    FROM referrals
    WHERE organisation_id = p_organisation_id
        AND created_at BETWEEN v_start_date AND v_end_date;

    -- Return funnel data
    RETURN QUERY
    WITH stage_counts AS (
        SELECT
            conversion_stage,
            COUNT(*) as stage_count,
            AVG(
                CASE conversion_stage
                    WHEN 'contacted' THEN EXTRACT(EPOCH FROM (contacted_at - created_at)) / 86400
                    WHEN 'meeting' THEN EXTRACT(EPOCH FROM (first_meeting_at - contacted_at)) / 86400
                    WHEN 'proposal' THEN EXTRACT(EPOCH FROM (proposal_sent_at - first_meeting_at)) / 86400
                    WHEN 'converted' THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400
                    ELSE NULL
                END
            ) as avg_days
        FROM referrals
        WHERE organisation_id = p_organisation_id
            AND created_at BETWEEN v_start_date AND v_end_date
        GROUP BY conversion_stage
    ),
    stage_order AS (
        SELECT 'referred' as stage, 1 as ord
        UNION ALL SELECT 'contacted', 2
        UNION ALL SELECT 'meeting', 3
        UNION ALL SELECT 'proposal', 4
        UNION ALL SELECT 'negotiating', 5
        UNION ALL SELECT 'converted', 6
    )
    SELECT
        so.stage::VARCHAR(50),
        COALESCE(sc.stage_count, 0)::BIGINT,
        CASE WHEN v_total_referrals > 0
            THEN (COALESCE(sc.stage_count, 0)::DECIMAL / v_total_referrals * 100)::DECIMAL(5,2)
            ELSE 0::DECIMAL(5,2)
        END,
        COALESCE(sc.avg_days, 0)::DECIMAL(10,2),
        CASE WHEN LAG(sc.stage_count) OVER (ORDER BY so.ord) > 0
            THEN ((LAG(sc.stage_count) OVER (ORDER BY so.ord) - COALESCE(sc.stage_count, 0))::DECIMAL
                  / LAG(sc.stage_count) OVER (ORDER BY so.ord) * 100)::DECIMAL(5,2)
            ELSE 0::DECIMAL(5,2)
        END
    FROM stage_order so
    LEFT JOIN stage_counts sc ON sc.conversion_stage = so.stage
    ORDER BY so.ord;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get member performance trends over time
CREATE OR REPLACE FUNCTION public.get_member_performance_trends(
    p_member_id UUID,
    p_organisation_id UUID,
    p_months INTEGER DEFAULT 6
)
RETURNS TABLE (
    month_start TIMESTAMPTZ,
    referral_count BIGINT,
    conversion_count BIGINT,
    conversion_rate DECIMAL(5,2),
    total_commission DECIMAL(12,2),
    rank_in_org INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH monthly_data AS (
        SELECT
            date_trunc('month', r.created_at) as month,
            COUNT(*) as refs,
            COUNT(*) FILTER (WHERE r.conversion_stage = 'converted') as conversions,
            SUM(COALESCE(r.member_commission, 0)) as commission
        FROM referrals r
        WHERE r.referrer_member_id = p_member_id
            AND r.organisation_id = p_organisation_id
            AND r.created_at >= NOW() - (p_months || ' months')::INTERVAL
        GROUP BY date_trunc('month', r.created_at)
    ),
    rankings AS (
        SELECT
            date_trunc('month', r.created_at) as month,
            r.referrer_member_id,
            ROW_NUMBER() OVER (
                PARTITION BY date_trunc('month', r.created_at)
                ORDER BY COUNT(*) FILTER (WHERE r.conversion_stage = 'converted') DESC
            ) as rank
        FROM referrals r
        WHERE r.organisation_id = p_organisation_id
            AND r.created_at >= NOW() - (p_months || ' months')::INTERVAL
        GROUP BY date_trunc('month', r.created_at), r.referrer_member_id
    )
    SELECT
        md.month,
        md.refs,
        md.conversions,
        CASE WHEN md.refs > 0
            THEN (md.conversions::DECIMAL / md.refs * 100)::DECIMAL(5,2)
            ELSE 0::DECIMAL(5,2)
        END,
        md.commission,
        COALESCE(rk.rank::INTEGER, 0)
    FROM monthly_data md
    LEFT JOIN rankings rk ON rk.month = md.month AND rk.referrer_member_id = p_member_id
    ORDER BY md.month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get revenue forecasting based on pipeline
CREATE OR REPLACE FUNCTION public.get_revenue_forecast(
    p_organisation_id UUID,
    p_months_ahead INTEGER DEFAULT 3
)
RETURNS TABLE (
    forecast_month DATE,
    conservative_estimate DECIMAL(12,2),
    realistic_estimate DECIMAL(12,2),
    optimistic_estimate DECIMAL(12,2),
    pipeline_value DECIMAL(12,2)
) AS $$
DECLARE
    v_avg_conversion_rate DECIMAL(5,2);
    v_avg_deal_size DECIMAL(12,2);
    v_avg_time_to_close INTEGER;
BEGIN
    -- Calculate historical averages
    SELECT
        (COUNT(*) FILTER (WHERE conversion_stage = 'converted')::DECIMAL / NULLIF(COUNT(*), 0) * 100)::DECIMAL(5,2),
        AVG(actual_value) FILTER (WHERE actual_value > 0),
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::INTEGER
    INTO v_avg_conversion_rate, v_avg_deal_size, v_avg_time_to_close
    FROM referrals
    WHERE organisation_id = p_organisation_id
        AND created_at >= NOW() - INTERVAL '90 days';

    -- Generate forecast
    RETURN QUERY
    WITH RECURSIVE months AS (
        SELECT
            date_trunc('month', NOW())::DATE as month,
            0 as offset
        UNION ALL
        SELECT
            (month + INTERVAL '1 month')::DATE,
            offset + 1
        FROM months
        WHERE offset < p_months_ahead - 1
    ),
    pipeline_by_month AS (
        SELECT
            m.month,
            SUM(r.estimated_value) FILTER (
                WHERE r.conversion_stage IN ('meeting', 'proposal', 'negotiating')
            ) as pipeline
        FROM months m
        CROSS JOIN referrals r
        WHERE r.organisation_id = p_organisation_id
            AND r.conversion_stage IN ('meeting', 'proposal', 'negotiating')
        GROUP BY m.month
    )
    SELECT
        m.month,
        (COALESCE(pb.pipeline, 0) * (v_avg_conversion_rate * 0.5) / 100)::DECIMAL(12,2), -- Conservative (50% of avg rate)
        (COALESCE(pb.pipeline, 0) * v_avg_conversion_rate / 100)::DECIMAL(12,2),          -- Realistic (avg rate)
        (COALESCE(pb.pipeline, 0) * (v_avg_conversion_rate * 1.5) / 100)::DECIMAL(12,2),  -- Optimistic (150% of avg rate)
        COALESCE(pb.pipeline, 0)::DECIMAL(12,2)
    FROM months m
    LEFT JOIN pipeline_by_month pb ON pb.month = m.month
    ORDER BY m.month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 5: Gamification RPC Functions
-- =====================================================

-- Check and award achievements
CREATE OR REPLACE FUNCTION public.check_member_achievements(
    p_member_id UUID,
    p_organisation_id UUID
)
RETURNS TABLE (
    achievement_id UUID,
    achievement_name VARCHAR(100),
    achievement_tier VARCHAR(20),
    just_earned BOOLEAN
) AS $$
BEGIN
    -- Get member stats
    WITH member_stats AS (
        SELECT
            COUNT(*) as total_referrals,
            COUNT(*) FILTER (WHERE conversion_stage = 'converted') as total_conversions,
            SUM(member_commission) FILTER (WHERE commission_paid = true) as total_commission,
            (COUNT(*) FILTER (WHERE conversion_stage = 'converted')::DECIMAL / NULLIF(COUNT(*), 0) * 100) as conversion_rate
        FROM referrals
        WHERE referrer_member_id = p_member_id
            AND organisation_id = p_organisation_id
    ),
    eligible_achievements AS (
        SELECT
            a.id,
            a.name,
            a.tier,
            CASE a.requirement_type
                WHEN 'referral_count' THEN ms.total_referrals >= a.requirement_value
                WHEN 'conversion_count' THEN ms.total_conversions >= a.requirement_value
                WHEN 'commission_earned' THEN ms.total_commission >= a.requirement_value
                WHEN 'conversion_rate' THEN ms.conversion_rate >= a.requirement_value
                ELSE false
            END as is_eligible
        FROM referral_achievements a
        CROSS JOIN member_stats ms
        WHERE a.is_active = true
    )
    SELECT
        ea.id,
        ea.name,
        ea.tier,
        NOT EXISTS (
            SELECT 1 FROM member_achievements ma
            WHERE ma.member_id = p_member_id
                AND ma.achievement_id = ea.id
                AND ma.organisation_id = p_organisation_id
        ) as just_earned
    FROM eligible_achievements ea
    WHERE ea.is_eligible = true;

    -- Insert new achievements
    INSERT INTO member_achievements (member_id, achievement_id, organisation_id)
    SELECT p_member_id, achievement_id, p_organisation_id
    FROM check_member_achievements(p_member_id, p_organisation_id)
    WHERE just_earned = true
    ON CONFLICT (member_id, achievement_id, organisation_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update referral streak
CREATE OR REPLACE FUNCTION public.update_referral_streak(
    p_member_id UUID,
    p_organisation_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_last_referral_date DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_streak_start DATE;
BEGIN
    -- Get most recent referral date
    SELECT MAX(created_at::DATE) INTO v_last_referral_date
    FROM referrals
    WHERE referrer_member_id = p_member_id
        AND organisation_id = p_organisation_id;

    IF v_last_referral_date IS NULL THEN
        RETURN;
    END IF;

    -- Get or create streak record
    INSERT INTO referral_streaks (member_id, organisation_id, last_referral_date, streak_start_date)
    VALUES (p_member_id, p_organisation_id, v_last_referral_date, v_last_referral_date)
    ON CONFLICT (member_id, organisation_id) DO NOTHING;

    -- Update streak
    WITH streak_calc AS (
        SELECT
            CASE
                WHEN v_last_referral_date = CURRENT_DATE
                    OR v_last_referral_date = CURRENT_DATE - INTERVAL '1 day'
                THEN current_streak + 1
                ELSE 1
            END as new_streak,
            CASE
                WHEN v_last_referral_date = CURRENT_DATE
                    OR v_last_referral_date = CURRENT_DATE - INTERVAL '1 day'
                THEN streak_start_date
                ELSE v_last_referral_date
            END as new_start
        FROM referral_streaks
        WHERE member_id = p_member_id
            AND organisation_id = p_organisation_id
    )
    UPDATE referral_streaks rs
    SET
        current_streak = sc.new_streak,
        longest_streak = GREATEST(rs.longest_streak, sc.new_streak),
        last_referral_date = v_last_referral_date,
        streak_start_date = sc.new_start,
        updated_at = NOW()
    FROM streak_calc sc
    WHERE rs.member_id = p_member_id
        AND rs.organisation_id = p_organisation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 6: Triggers
-- =====================================================

-- Auto-update streak on new referral
CREATE OR REPLACE FUNCTION trigger_update_streak()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referrer_member_id IS NOT NULL AND NEW.organisation_id IS NOT NULL THEN
        PERFORM update_referral_streak(NEW.referrer_member_id, NEW.organisation_id);
        PERFORM check_member_achievements(NEW.referrer_member_id, NEW.organisation_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_update_streak_on_referral
    AFTER INSERT ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_streak();

-- Queue email on new referral
CREATE OR REPLACE FUNCTION trigger_queue_new_referral_email()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_email VARCHAR(255);
    v_referrer_name VARCHAR(255);
    v_org_name VARCHAR(255);
    v_referred_name VARCHAR(255);
    v_referred_email VARCHAR(255);
BEGIN
    -- Get referrer details
    SELECT email, COALESCE(full_name, email) INTO v_referrer_email, v_referrer_name
    FROM profiles
    WHERE id = NEW.referrer_member_id;

    -- Get organisation name
    SELECT name INTO v_org_name
    FROM connection_groups
    WHERE id = NEW.organisation_id;

    -- Get referred person details
    v_referred_name := COALESCE(NEW.referred_name, NEW.referred_email);
    v_referred_email := NEW.referred_email;

    -- Queue email
    INSERT INTO referral_email_queue (
        recipient_email,
        recipient_name,
        subject,
        body,
        metadata,
        status
    ) VALUES (
        v_referrer_email,
        v_referrer_name,
        'new_referral',
        '',
        jsonb_build_object(
            'template', 'new_referral',
            'referrer_name', v_referrer_name,
            'organisation_name', v_org_name,
            'referred_name', v_referred_name,
            'referred_email', v_referred_email,
            'referral_id', NEW.id
        ),
        'pending'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER queue_new_referral_email
    AFTER INSERT ON public.referrals
    FOR EACH ROW
    WHEN (NEW.referrer_member_id IS NOT NULL)
    EXECUTE FUNCTION trigger_queue_new_referral_email();

-- Queue email on stage change
CREATE OR REPLACE FUNCTION trigger_queue_stage_change_email()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_email VARCHAR(255);
    v_referrer_name VARCHAR(255);
    v_org_name VARCHAR(255);
    v_referred_name VARCHAR(255);
BEGIN
    -- Only trigger if stage actually changed
    IF OLD.conversion_stage = NEW.conversion_stage THEN
        RETURN NEW;
    END IF;

    -- Get referrer details
    SELECT email, COALESCE(full_name, email) INTO v_referrer_email, v_referrer_name
    FROM profiles
    WHERE id = NEW.referrer_member_id;

    -- Get organisation name
    SELECT name INTO v_org_name
    FROM connection_groups
    WHERE id = NEW.organisation_id;

    v_referred_name := COALESCE(NEW.referred_name, NEW.referred_email);

    -- Queue email
    INSERT INTO referral_email_queue (
        recipient_email,
        recipient_name,
        subject,
        body,
        metadata,
        status
    ) VALUES (
        v_referrer_email,
        v_referrer_name,
        'stage_change',
        '',
        jsonb_build_object(
            'template', 'stage_change',
            'referrer_name', v_referrer_name,
            'organisation_name', v_org_name,
            'referred_name', v_referred_name,
            'old_stage', OLD.conversion_stage,
            'new_stage', NEW.conversion_stage,
            'estimated_value', NEW.estimated_value,
            'referral_id', NEW.id
        ),
        'pending'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER queue_stage_change_email
    AFTER UPDATE OF conversion_stage ON public.referrals
    FOR EACH ROW
    WHEN (NEW.referrer_member_id IS NOT NULL)
    EXECUTE FUNCTION trigger_queue_stage_change_email();

-- Queue email on commission earned
CREATE OR REPLACE FUNCTION trigger_queue_commission_email()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_email VARCHAR(255);
    v_referrer_name VARCHAR(255);
    v_org_name VARCHAR(255);
    v_referred_name VARCHAR(255);
    v_total_commission DECIMAL(12,2);
BEGIN
    -- Only trigger if commission was just paid
    IF OLD.commission_paid = TRUE OR NEW.commission_paid = FALSE THEN
        RETURN NEW;
    END IF;

    -- Get referrer details
    SELECT email, COALESCE(full_name, email) INTO v_referrer_email, v_referrer_name
    FROM profiles
    WHERE id = NEW.referrer_member_id;

    -- Get organisation name
    SELECT name INTO v_org_name
    FROM connection_groups
    WHERE id = NEW.organisation_id;

    v_referred_name := COALESCE(NEW.referred_name, NEW.referred_email);

    -- Calculate total commission for this member
    SELECT COALESCE(SUM(member_commission), 0) INTO v_total_commission
    FROM referrals
    WHERE referrer_member_id = NEW.referrer_member_id
        AND organisation_id = NEW.organisation_id
        AND commission_paid = TRUE;

    -- Queue email
    INSERT INTO referral_email_queue (
        recipient_email,
        recipient_name,
        subject,
        body,
        metadata,
        status
    ) VALUES (
        v_referrer_email,
        v_referrer_name,
        'commission_earned',
        '',
        jsonb_build_object(
            'template', 'commission_earned',
            'referrer_name', v_referrer_name,
            'organisation_name', v_org_name,
            'referred_name', v_referred_name,
            'commission_amount', NEW.member_commission,
            'total_commission', v_total_commission,
            'referral_id', NEW.id
        ),
        'pending'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER queue_commission_email
    AFTER UPDATE OF commission_paid ON public.referrals
    FOR EACH ROW
    WHEN (NEW.referrer_member_id IS NOT NULL AND NEW.member_commission > 0)
    EXECUTE FUNCTION trigger_queue_commission_email();

-- Queue email on achievement unlocked
CREATE OR REPLACE FUNCTION trigger_queue_achievement_email()
RETURNS TRIGGER AS $$
DECLARE
    v_member_email VARCHAR(255);
    v_member_name VARCHAR(255);
    v_org_name VARCHAR(255);
    v_achievement_name VARCHAR(100);
    v_achievement_description TEXT;
    v_achievement_tier VARCHAR(20);
    v_achievement_points INTEGER;
    v_total_points INTEGER;
BEGIN
    -- Get member details
    SELECT email, COALESCE(full_name, email) INTO v_member_email, v_member_name
    FROM profiles
    WHERE id = NEW.member_id;

    -- Get organisation name
    SELECT name INTO v_org_name
    FROM connection_groups
    WHERE id = NEW.organisation_id;

    -- Get achievement details
    SELECT name, description, tier, points
    INTO v_achievement_name, v_achievement_description, v_achievement_tier, v_achievement_points
    FROM referral_achievements
    WHERE id = NEW.achievement_id;

    -- Calculate total points
    SELECT COALESCE(SUM(ra.points), 0) INTO v_total_points
    FROM member_achievements ma
    JOIN referral_achievements ra ON ra.id = ma.achievement_id
    WHERE ma.member_id = NEW.member_id
        AND ma.organisation_id = NEW.organisation_id;

    -- Queue email
    INSERT INTO referral_email_queue (
        recipient_email,
        recipient_name,
        subject,
        body,
        metadata,
        status
    ) VALUES (
        v_member_email,
        v_member_name,
        'achievement_unlocked',
        '',
        jsonb_build_object(
            'template', 'achievement_unlocked',
            'referrer_name', v_member_name,
            'organisation_name', v_org_name,
            'achievement_name', v_achievement_name,
            'achievement_description', v_achievement_description,
            'achievement_tier', v_achievement_tier,
            'achievement_points', v_achievement_points,
            'total_points', v_total_points
        ),
        'pending'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER queue_achievement_email
    AFTER INSERT ON public.member_achievements
    FOR EACH ROW
    EXECUTE FUNCTION trigger_queue_achievement_email();

-- =====================================================
-- PART 7: RLS Policies
-- =====================================================

-- Analytics tables: Org members can view their org's data
ALTER TABLE public.referral_funnel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_performance_trends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view funnel analytics"
    ON public.referral_funnel_analytics FOR SELECT
    USING (
        organisation_id IN (
            SELECT group_id FROM group_members WHERE connection_id = auth.uid()
        )
    );

CREATE POLICY "Members view their own trends"
    ON public.member_performance_trends FOR SELECT
    USING (
        member_id = auth.uid() OR
        organisation_id IN (
            SELECT group_id FROM group_members WHERE connection_id = auth.uid()
        )
    );

-- Gamification tables: Members can view their achievements
ALTER TABLE public.referral_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements" ON public.referral_achievements FOR SELECT USING (is_active = true);
CREATE POLICY "Members view their achievements" ON public.member_achievements FOR SELECT USING (member_id = auth.uid());
CREATE POLICY "Members view their streaks" ON public.referral_streaks FOR SELECT USING (member_id = auth.uid());

-- Challenges: Org members can view their org's challenges
ALTER TABLE public.referral_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view challenges"
    ON public.referral_challenges FOR SELECT
    USING (
        organisation_id IN (
            SELECT group_id FROM group_members WHERE connection_id = auth.uid()
        )
    );

CREATE POLICY "Members view their participation"
    ON public.challenge_participants FOR SELECT
    USING (member_id = auth.uid());

-- Automation tables: Org owners only
ALTER TABLE public.referral_email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_webhook_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org owners manage email automations"
    ON public.referral_email_automations FOR ALL
    USING (
        organisation_id IN (
            SELECT id FROM connection_groups WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Org owners manage webhooks"
    ON public.referral_webhook_integrations FOR ALL
    USING (
        organisation_id IN (
            SELECT id FROM connection_groups WHERE profile_id = auth.uid()
        )
    );

-- =====================================================
-- PART 8: Seed Default Achievements
-- =====================================================

INSERT INTO public.referral_achievements (code, name, description, icon, tier, requirement_type, requirement_value, points) VALUES
('first_referral', 'First Referral', 'Made your first referral', '🎯', 'bronze', 'referral_count', 1, 10),
('five_referrals', '5 Referrals', 'Made 5 referrals', '⭐', 'bronze', 'referral_count', 5, 25),
('ten_referrals', '10 Referrals', 'Made 10 referrals', '🌟', 'silver', 'referral_count', 10, 50),
('twentyfive_referrals', '25 Referrals', 'Made 25 referrals', '✨', 'gold', 'referral_count', 25, 100),
('fifty_referrals', '50 Referrals', 'Made 50 referrals', '💫', 'platinum', 'referral_count', 50, 250),
('hundred_referrals', '100 Referrals', 'Made 100 referrals', '🏆', 'diamond', 'referral_count', 100, 500),

('first_conversion', 'First Conversion', 'Converted your first referral', '🎊', 'bronze', 'conversion_count', 1, 25),
('five_conversions', '5 Conversions', 'Converted 5 referrals', '🎉', 'silver', 'conversion_count', 5, 75),
('ten_conversions', '10 Conversions', 'Converted 10 referrals', '🚀', 'gold', 'conversion_count', 10, 150),
('twentyfive_conversions', '25 Conversions', 'Converted 25 referrals', '💎', 'platinum', 'conversion_count', 25, 400),

('commission_100', '£100 Earned', 'Earned £100 in commissions', '💷', 'bronze', 'commission_earned', 100, 50),
('commission_500', '£500 Earned', 'Earned £500 in commissions', '💰', 'silver', 'commission_earned', 500, 150),
('commission_1000', '£1000 Earned', 'Earned £1,000 in commissions', '🤑', 'gold', 'commission_earned', 1000, 300),
('commission_5000', '£5000 Earned', 'Earned £5,000 in commissions', '👑', 'platinum', 'commission_earned', 5000, 1000),

('high_converter', 'High Converter', 'Achieved 50%+ conversion rate', '📈', 'gold', 'conversion_rate', 50, 200),
('master_converter', 'Master Converter', 'Achieved 75%+ conversion rate', '🎯', 'platinum', 'conversion_rate', 75, 500)

ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- End of Migration 157
-- =====================================================
