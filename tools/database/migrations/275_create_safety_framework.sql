-- Safety & Ethics Framework
-- Migration: 275_create_safety_framework.sql
--
-- Creates comprehensive safety infrastructure:
-- 1. Age verification and parental consent
-- 2. Content monitoring and bias detection
-- 3. Usage limits and safety alerts
-- 4. Audit trails for compliance

-- ============================================
-- USER AGE VERIFICATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_age_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

    -- Age information
    date_of_birth DATE,
    age_verified BOOLEAN DEFAULT FALSE,
    verification_method TEXT CHECK (verification_method IN (
        'self_reported',
        'id_document',
        'parent_confirmed',
        'school_verified'
    )),
    verified_at TIMESTAMPTZ,

    -- Minor protection (under 18)
    is_minor BOOLEAN GENERATED ALWAYS AS (
        CASE
            WHEN date_of_birth IS NULL THEN FALSE
            WHEN date_of_birth > (CURRENT_DATE - INTERVAL '18 years') THEN TRUE
            ELSE FALSE
        END
    ) STORED,

    -- Parental consent (if minor)
    requires_parental_consent BOOLEAN DEFAULT FALSE,
    parental_consent_given BOOLEAN DEFAULT FALSE,
    parent_email TEXT,
    parent_id UUID REFERENCES auth.users(id),
    consent_given_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PARENTAL CONTROLS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS parental_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Control settings
    sage_enabled BOOLEAN DEFAULT TRUE,
    lexi_enabled BOOLEAN DEFAULT TRUE,
    marketplace_enabled BOOLEAN DEFAULT FALSE,  -- Restrict marketplace access
    messaging_enabled BOOLEAN DEFAULT FALSE,    -- Restrict direct messaging

    -- Usage limits
    daily_time_limit_minutes INTEGER,  -- Max daily usage
    session_time_limit_minutes INTEGER, -- Max per session
    allowed_subjects TEXT[] DEFAULT ARRAY['maths', 'english', 'science'], -- Restrict subjects

    -- Content filtering
    content_filter_level TEXT DEFAULT 'strict' CHECK (content_filter_level IN ('strict', 'moderate', 'off')),
    block_sensitive_topics BOOLEAN DEFAULT TRUE,

    -- Monitoring
    enable_activity_reports BOOLEAN DEFAULT TRUE,
    report_frequency TEXT DEFAULT 'weekly' CHECK (report_frequency IN ('daily', 'weekly', 'monthly')),

    -- Status
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(child_user_id, parent_user_id)
);

-- ============================================
-- CONTENT MONITORING & BIAS DETECTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS content_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source
    agent_type TEXT NOT NULL CHECK (agent_type IN ('sage', 'lexi')),
    session_id TEXT NOT NULL,
    message_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Content
    content_type TEXT NOT NULL CHECK (content_type IN (
        'user_message',
        'ai_response',
        'system_message'
    )),
    content_text TEXT NOT NULL,
    content_summary TEXT,

    -- Safety analysis
    flagged BOOLEAN DEFAULT FALSE,
    flag_reasons TEXT[] DEFAULT '{}',
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    -- Bias detection
    bias_detected BOOLEAN DEFAULT FALSE,
    bias_types TEXT[] DEFAULT '{}', -- e.g., 'gender', 'racial', 'age', 'cultural'
    bias_confidence DECIMAL(3,2), -- 0.00 to 1.00

    -- Sensitive content detection
    sensitive_topics TEXT[] DEFAULT '{}', -- e.g., 'violence', 'self-harm', 'drugs'
    age_inappropriate BOOLEAN DEFAULT FALSE,

    -- Action taken
    action_taken TEXT CHECK (action_taken IN (
        'none',
        'content_filtered',
        'session_terminated',
        'parent_notified',
        'admin_review_required'
    )),
    reviewed_by_admin BOOLEAN DEFAULT FALSE,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- USAGE MONITORING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_usage_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Daily usage stats
    sage_sessions_count INTEGER DEFAULT 0,
    sage_total_minutes INTEGER DEFAULT 0,
    lexi_conversations_count INTEGER DEFAULT 0,
    lexi_total_minutes INTEGER DEFAULT 0,

    -- Safety metrics
    content_flags_count INTEGER DEFAULT 0,
    bias_detections_count INTEGER DEFAULT 0,
    parent_notifications_sent INTEGER DEFAULT 0,

    -- Limits exceeded
    time_limit_exceeded BOOLEAN DEFAULT FALSE,
    session_limit_exceeded BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, date)
);

-- ============================================
-- SAFETY ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS safety_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target user
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'time_limit_warning',
        'time_limit_exceeded',
        'inappropriate_content',
        'bias_detected',
        'parental_review_needed',
        'suspicious_activity'
    )),

    -- Alert details
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',

    -- Related content
    related_session_id TEXT,
    related_message_id TEXT,
    content_audit_id UUID REFERENCES content_audit_log(id),

    -- Notification
    parent_notified BOOLEAN DEFAULT FALSE,
    parent_notified_at TIMESTAMPTZ,
    admin_notified BOOLEAN DEFAULT FALSE,
    admin_notified_at TIMESTAMPTZ,

    -- Resolution
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
-- Age verification
CREATE INDEX IF NOT EXISTS idx_age_verification_user_id ON user_age_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_age_verification_is_minor ON user_age_verification(is_minor) WHERE is_minor = TRUE;
CREATE INDEX IF NOT EXISTS idx_age_verification_consent_pending ON user_age_verification(user_id)
    WHERE requires_parental_consent = TRUE AND parental_consent_given = FALSE;

-- Parental controls
CREATE INDEX IF NOT EXISTS idx_parental_controls_child ON parental_controls(child_user_id);
CREATE INDEX IF NOT EXISTS idx_parental_controls_parent ON parental_controls(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parental_controls_active ON parental_controls(active) WHERE active = TRUE;

-- Content audit
CREATE INDEX IF NOT EXISTS idx_content_audit_user ON content_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_content_audit_session ON content_audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_content_audit_flagged ON content_audit_log(flagged) WHERE flagged = TRUE;
CREATE INDEX IF NOT EXISTS idx_content_audit_bias ON content_audit_log(bias_detected) WHERE bias_detected = TRUE;
CREATE INDEX IF NOT EXISTS idx_content_audit_created ON content_audit_log(created_at DESC);

-- Usage monitoring
CREATE INDEX IF NOT EXISTS idx_usage_monitoring_user_date ON user_usage_monitoring(user_id, date);
CREATE INDEX IF NOT EXISTS idx_usage_monitoring_flags ON user_usage_monitoring(content_flags_count) WHERE content_flags_count > 0;

-- Safety alerts
CREATE INDEX IF NOT EXISTS idx_safety_alerts_user ON safety_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_unresolved ON safety_alerts(resolved) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_safety_alerts_severity ON safety_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_safety_alerts_created ON safety_alerts(created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_age_verification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_age_verification_updated_at ON user_age_verification;
CREATE TRIGGER trigger_update_age_verification_updated_at
    BEFORE UPDATE ON user_age_verification
    FOR EACH ROW
    EXECUTE FUNCTION update_age_verification_updated_at();

CREATE OR REPLACE FUNCTION update_parental_controls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_parental_controls_updated_at ON parental_controls;
CREATE TRIGGER trigger_update_parental_controls_updated_at
    BEFORE UPDATE ON parental_controls
    FOR EACH ROW
    EXECUTE FUNCTION update_parental_controls_updated_at();

CREATE OR REPLACE FUNCTION update_usage_monitoring_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_usage_monitoring_updated_at ON user_usage_monitoring;
CREATE TRIGGER trigger_update_usage_monitoring_updated_at
    BEFORE UPDATE ON user_usage_monitoring
    FOR EACH ROW
    EXECUTE FUNCTION update_usage_monitoring_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE user_age_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE parental_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;

-- Age verification: Users can view/update own, parents can view children's
DROP POLICY IF EXISTS "Users can manage own age verification" ON user_age_verification;
CREATE POLICY "Users can manage own age verification" ON user_age_verification
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Parents can view children age verification" ON user_age_verification;
CREATE POLICY "Parents can view children age verification" ON user_age_verification
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM parental_controls
            WHERE parental_controls.parent_user_id = auth.uid()
            AND parental_controls.child_user_id = user_age_verification.user_id
            AND parental_controls.active = TRUE
        )
    );

-- Parental controls: Parents can manage, children can view
DROP POLICY IF EXISTS "Parents can manage parental controls" ON parental_controls;
CREATE POLICY "Parents can manage parental controls" ON parental_controls
    FOR ALL USING (auth.uid() = parent_user_id);

DROP POLICY IF EXISTS "Children can view own parental controls" ON parental_controls;
CREATE POLICY "Children can view own parental controls" ON parental_controls
    FOR SELECT USING (auth.uid() = child_user_id);

-- Content audit: Admins only
DROP POLICY IF EXISTS "Admins can read content audits" ON content_audit_log;
CREATE POLICY "Admins can read content audits" ON content_audit_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND 'admin' = ANY(profiles.roles)
        )
    );

-- Usage monitoring: Users and parents can view
DROP POLICY IF EXISTS "Users can view own usage" ON user_usage_monitoring;
CREATE POLICY "Users can view own usage" ON user_usage_monitoring
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Parents can view children usage" ON user_usage_monitoring;
CREATE POLICY "Parents can view children usage" ON user_usage_monitoring
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM parental_controls
            WHERE parental_controls.parent_user_id = auth.uid()
            AND parental_controls.child_user_id = user_usage_monitoring.user_id
            AND parental_controls.active = TRUE
        )
    );

-- Safety alerts: Users and parents can view, admins can manage
DROP POLICY IF EXISTS "Users can view own safety alerts" ON safety_alerts;
CREATE POLICY "Users can view own safety alerts" ON safety_alerts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Parents can view children safety alerts" ON safety_alerts;
CREATE POLICY "Parents can view children safety alerts" ON safety_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM parental_controls
            WHERE parental_controls.parent_user_id = auth.uid()
            AND parental_controls.child_user_id = safety_alerts.user_id
            AND parental_controls.active = TRUE
        )
    );

-- Service role full access to all tables
DROP POLICY IF EXISTS "Service role full access age verification" ON user_age_verification;
CREATE POLICY "Service role full access age verification" ON user_age_verification
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access parental controls" ON parental_controls;
CREATE POLICY "Service role full access parental controls" ON parental_controls
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access content audit" ON content_audit_log;
CREATE POLICY "Service role full access content audit" ON content_audit_log
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access usage monitoring" ON user_usage_monitoring;
CREATE POLICY "Service role full access usage monitoring" ON user_usage_monitoring
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access safety alerts" ON safety_alerts;
CREATE POLICY "Service role full access safety alerts" ON safety_alerts
    FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE user_age_verification IS 'Age verification and parental consent management for COPPA/GDPR compliance';
COMMENT ON TABLE parental_controls IS 'Parental control settings for minor users';
COMMENT ON TABLE content_audit_log IS 'Content monitoring and bias detection audit trail';
COMMENT ON TABLE user_usage_monitoring IS 'Daily usage tracking for safety and limit enforcement';
COMMENT ON TABLE safety_alerts IS 'Safety alerts for users, parents, and administrators';

COMMENT ON COLUMN user_age_verification.is_minor IS 'Computed: TRUE if user is under 18 years old';
COMMENT ON COLUMN parental_controls.content_filter_level IS 'Content filtering strictness: strict (default), moderate, or off';
COMMENT ON COLUMN content_audit_log.bias_types IS 'Array of detected bias types: gender, racial, age, cultural, etc.';
COMMENT ON COLUMN safety_alerts.severity IS 'Alert severity: info (FYI), warning (action recommended), critical (immediate action)';
