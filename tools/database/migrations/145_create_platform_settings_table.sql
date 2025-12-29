-- Migration: Create platform_settings table
-- Purpose: Store platform configuration settings
-- Date: 2025-12-29

-- Create the platform_settings table
-- This uses a singleton pattern - only one row should exist
CREATE TABLE IF NOT EXISTS platform_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Ensure only one row

    -- General Settings
    platform_name VARCHAR(255) NOT NULL DEFAULT 'Tutorwise',
    platform_url VARCHAR(255) NOT NULL DEFAULT 'tutorwise.io',
    timezone VARCHAR(100) NOT NULL DEFAULT 'Europe/London',
    default_currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
    date_format VARCHAR(50) NOT NULL DEFAULT 'DD/MM/YYYY',

    -- Feature Flags
    enable_bookings BOOLEAN NOT NULL DEFAULT true,
    enable_referrals BOOLEAN NOT NULL DEFAULT true,
    enable_organisations BOOLEAN NOT NULL DEFAULT true,
    enable_network BOOLEAN NOT NULL DEFAULT true,
    enable_reviews BOOLEAN NOT NULL DEFAULT true,
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,

    -- Limits
    max_listings_per_user INTEGER NOT NULL DEFAULT 10,
    max_bookings_per_day INTEGER NOT NULL DEFAULT 50,
    max_file_upload_size_mb INTEGER NOT NULL DEFAULT 10,
    session_timeout_minutes INTEGER NOT NULL DEFAULT 60,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE platform_settings IS 'Platform-wide configuration settings (singleton table)';
COMMENT ON COLUMN platform_settings.id IS 'Always 1 - ensures singleton pattern';
COMMENT ON COLUMN platform_settings.platform_name IS 'Display name of the platform';
COMMENT ON COLUMN platform_settings.platform_url IS 'Platform domain (without protocol)';
COMMENT ON COLUMN platform_settings.timezone IS 'Default timezone (IANA format)';
COMMENT ON COLUMN platform_settings.default_currency IS 'Default currency code (ISO 4217)';
COMMENT ON COLUMN platform_settings.date_format IS 'Default date format pattern';

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_platform_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER trigger_update_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_settings_updated_at();

-- Insert default settings (singleton row)
INSERT INTO platform_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
