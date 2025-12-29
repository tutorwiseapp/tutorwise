-- Migration: Create security_settings table
-- Purpose: Store security configuration settings
-- Date: 2025-12-29

-- Create the security_settings table
-- This uses a singleton pattern - only one row should exist
CREATE TABLE IF NOT EXISTS security_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensure only one row

    -- Admin Access
    require_2fa BOOLEAN NOT NULL DEFAULT true,
    session_timeout_minutes INTEGER NOT NULL DEFAULT 60,
    max_login_attempts INTEGER NOT NULL DEFAULT 5,
    ip_whitelist TEXT NOT NULL DEFAULT '',

    -- Rate Limiting
    api_rate_limit_per_minute INTEGER NOT NULL DEFAULT 60,
    login_rate_limit_per_hour INTEGER NOT NULL DEFAULT 10,
    search_rate_limit_per_minute INTEGER NOT NULL DEFAULT 30,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE security_settings IS 'Security configuration settings (singleton table)';
COMMENT ON COLUMN security_settings.id IS 'Always 1 - ensures singleton pattern';
COMMENT ON COLUMN security_settings.require_2fa IS 'Require two-factor authentication for admins';
COMMENT ON COLUMN security_settings.session_timeout_minutes IS 'Admin session timeout in minutes';
COMMENT ON COLUMN security_settings.max_login_attempts IS 'Maximum login attempts before lockout';
COMMENT ON COLUMN security_settings.ip_whitelist IS 'Comma-separated list of whitelisted IP addresses';
COMMENT ON COLUMN security_settings.api_rate_limit_per_minute IS 'API requests allowed per minute';
COMMENT ON COLUMN security_settings.login_rate_limit_per_hour IS 'Login attempts allowed per hour';
COMMENT ON COLUMN security_settings.search_rate_limit_per_minute IS 'Search requests allowed per minute';

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_security_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER trigger_update_security_settings_updated_at
    BEFORE UPDATE ON security_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_security_settings_updated_at();

-- Insert default settings (singleton row)
INSERT INTO security_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
