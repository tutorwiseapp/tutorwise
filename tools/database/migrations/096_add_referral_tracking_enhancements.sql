/**
 * Migration: 096_add_referral_tracking_enhancements.sql
 * Purpose: Add referral source tracking and geographic data for Performance dashboard
 * Created: 2025-12-07
 *
 * Changes:
 * 1. Add referral_source enum type (Direct Link, QR Code, Embed Code)
 * 2. Add referral_source column to referrals table
 * 3. Add geographic_data jsonb column for IP-based geolocation
 * 4. Add reminder tracking columns (last_reminder_sent_at, reminder_count)
 *
 * Phase 3: Performance Dashboard & Gamification
 */

BEGIN;

-- ==================================
-- STEP 1: Create referral_source enum
-- ==================================
CREATE TYPE referral_source_enum AS ENUM (
    'Direct Link',
    'QR Code',
    'Embed Code',
    'Social Share'
);

COMMENT ON TYPE referral_source_enum IS
'Phase 3: Tracks how the referral link was shared for Performance analytics';

-- ==================================
-- STEP 2: Add columns to referrals table
-- ==================================

-- Add referral_source column (defaults to 'Direct Link' for existing records)
ALTER TABLE public.referrals
ADD COLUMN referral_source referral_source_enum DEFAULT 'Direct Link';

COMMENT ON COLUMN public.referrals.referral_source IS
'Phase 3: Source of the referral (Direct Link, QR Code, Embed Code, Social Share).
Used in Performance dashboard pie chart.';

-- Add geographic_data column for IP-based geolocation
ALTER TABLE public.referrals
ADD COLUMN geographic_data jsonb;

COMMENT ON COLUMN public.referrals.geographic_data IS
'Phase 3: IP-based geolocation data captured at referral creation time.
Structure: {
  "ip": "192.168.1.1",
  "country": "United Kingdom",
  "region": "England",
  "city": "London",
  "latitude": 51.5074,
  "longitude": -0.1278,
  "postal_code": "SW1A",
  "timezone": "Europe/London"
}
Used in Performance dashboard UK map visualization.';

-- Add reminder tracking columns (already added in previous work, but including for completeness)
-- Note: These may already exist from Phase 2 implementation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'referrals'
        AND column_name = 'last_reminder_sent_at'
    ) THEN
        ALTER TABLE public.referrals
        ADD COLUMN last_reminder_sent_at timestamptz;

        COMMENT ON COLUMN public.referrals.last_reminder_sent_at IS
        'Phase 2: Timestamp of last reminder email sent. Used for 24-hour rate limiting.';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'referrals'
        AND column_name = 'reminder_count'
    ) THEN
        ALTER TABLE public.referrals
        ADD COLUMN reminder_count integer DEFAULT 0;

        COMMENT ON COLUMN public.referrals.reminder_count IS
        'Phase 2: Number of reminder emails sent for this referral.';
    END IF;
END $$;

-- ==================================
-- STEP 3: Create indexes for performance
-- ==================================

CREATE INDEX IF NOT EXISTS idx_referrals_source
ON public.referrals(referral_source);

CREATE INDEX IF NOT EXISTS idx_referrals_geographic_city
ON public.referrals((geographic_data->>'city'));

CREATE INDEX IF NOT EXISTS idx_referrals_created_at_desc
ON public.referrals(created_at DESC);

COMMENT ON INDEX idx_referrals_source IS
'Phase 3: Fast lookups for Performance dashboard source breakdown chart';

COMMENT ON INDEX idx_referrals_geographic_city IS
'Phase 3: Fast lookups for Performance dashboard UK map visualization';

-- ==================================
-- STEP 4: Update existing records
-- ==================================

-- Set default source for existing referrals without source
UPDATE public.referrals
SET referral_source = 'Direct Link'
WHERE referral_source IS NULL;

-- ==================================
-- STEP 5: Add helper function for geographic data
-- ==================================

CREATE OR REPLACE FUNCTION public.get_referral_geographic_summary(
    p_referrer_user_id uuid,
    p_days_back integer DEFAULT 90
)
RETURNS TABLE (
    city text,
    region text,
    referral_count bigint,
    converted_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        geographic_data->>'city' as city,
        geographic_data->>'region' as region,
        COUNT(*) as referral_count,
        COUNT(*) FILTER (WHERE status = 'Converted') as converted_count
    FROM public.referrals
    WHERE referrer_user_id = p_referrer_user_id
        AND geographic_data IS NOT NULL
        AND created_at >= NOW() - (p_days_back || ' days')::interval
    GROUP BY geographic_data->>'city', geographic_data->>'region'
    ORDER BY referral_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_referral_geographic_summary IS
'Phase 3: Helper function to aggregate referral data by city/region for UK map visualization.
Returns geographic breakdown with conversion rates.';

COMMIT;
