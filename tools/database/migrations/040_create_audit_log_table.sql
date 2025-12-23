-- File: apps/api/migrations/040_create_audit_log_table.sql
-- Purpose: Generic audit log and network analytics tables (SDD v4.5)
-- Date: 2025-11-07

-- 1. Generic audit log for compliance
CREATE TABLE IF NOT EXISTS public.audit_log (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    module TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,

    CONSTRAINT valid_action_type CHECK (action_type ~ '^[a-z_\.]+$')
);

-- 2. Network analytics table (for viral loop tracking)
CREATE TABLE IF NOT EXISTS public.network_analytics (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'invite_sent', 'connection_accepted', 'referral_clicked', etc.
    event_data JSONB,
    referral_code VARCHAR(20),

    CONSTRAINT valid_event_type CHECK (
        event_type IN (
            'invite_sent',
            'invite_clicked',
            'connection_requested',
            'connection_accepted',
            'connection_rejected',
            'connection_removed',
            'group_created',
            'referral_clicked',
            'referral_converted'
        )
    )
);

-- 3. Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_audit_log_profile_id
    ON public.audit_log(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type
    ON public.audit_log(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_module
    ON public.audit_log(module);
CREATE INDEX IF NOT EXISTS idx_network_analytics_profile
    ON public.network_analytics(profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_analytics_event
    ON public.network_analytics(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_network_analytics_referral
    ON public.network_analytics(referral_code)
    WHERE referral_code IS NOT NULL;

-- 4. RLS Policies (service_role only for security)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.network_analytics ENABLE ROW LEVEL SECURITY;

-- No public policies - only accessible via service_role
-- This prevents users from tampering with analytics or audit logs

COMMENT ON TABLE public.audit_log IS
    'Platform-wide audit log for security and compliance (v4.5)';
COMMENT ON TABLE public.network_analytics IS
    'Network and referral event tracking for viral loop analytics (v4.5)';
