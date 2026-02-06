-- =====================================================
-- Migration 231: Simplify Referral Conversion Stages
-- Created: 2025-02-05
-- Purpose: Align conversion stages with marketplace model (auto-tracked)
-- =====================================================
--
-- Context: The existing conversion_stage constraint has 7 values designed
-- for a CRM-style sales pipeline. Tutorwise is a marketplace where:
-- - Referrals are automatic (button press = contacted)
-- - Commission is fixed at 10% (no negotiation phase)
-- - Conversions are booking-triggered (automatic)
-- - Expiry is time-based (automatic)
--
-- This migration simplifies to 4 stages:
-- - 'referred' (initial state, auto-synced with status='Referred')
-- - 'signed_up' (auto-synced with status='Signed Up')
-- - 'converted' (auto-synced with status='Converted')
-- - 'expired' (auto-synced with status='Expired')
-- =====================================================

BEGIN;

-- =====================================================
-- PART 1: Migrate Existing Data
-- =====================================================

-- Map existing CRM-style stages to simplified stages
UPDATE public.referrals
SET conversion_stage = CASE
    WHEN status = 'Referred' THEN 'referred'
    WHEN status = 'Signed Up' THEN 'signed_up'
    WHEN status = 'Converted' THEN 'converted'
    WHEN status = 'Expired' THEN 'expired'
    ELSE 'referred'  -- Fallback
END
WHERE conversion_stage IS NOT NULL;

-- Also update any NULL conversion_stage to match status
UPDATE public.referrals
SET conversion_stage = CASE
    WHEN status = 'Referred' THEN 'referred'
    WHEN status = 'Signed Up' THEN 'signed_up'
    WHEN status = 'Converted' THEN 'converted'
    WHEN status = 'Expired' THEN 'expired'
    ELSE 'referred'
END
WHERE conversion_stage IS NULL;

-- =====================================================
-- PART 2: Drop Unused CRM Columns
-- =====================================================

-- These columns were for manual CRM-style tracking, not needed in marketplace model
ALTER TABLE public.referrals
DROP COLUMN IF EXISTS contacted_at,
DROP COLUMN IF EXISTS first_meeting_at,
DROP COLUMN IF EXISTS proposal_sent_at,
DROP COLUMN IF EXISTS proposal_accepted_at;

-- =====================================================
-- PART 3: Update Conversion Stage Constraint
-- =====================================================

-- Drop the old constraint (7 values)
ALTER TABLE public.referrals
DROP CONSTRAINT IF EXISTS check_conversion_stage;

-- Add new simplified constraint (4 values, matching status enum)
ALTER TABLE public.referrals
ADD CONSTRAINT check_conversion_stage CHECK (
  conversion_stage IN (
    'referred',    -- Initial state (matches status='Referred')
    'signed_up',   -- User created account (matches status='Signed Up')
    'converted',   -- First booking completed (matches status='Converted')
    'expired'      -- 90 days passed without conversion (matches status='Expired')
  )
);

COMMENT ON COLUMN public.referrals.conversion_stage IS
'Auto-synced conversion stage that mirrors status enum. Used for analytics and funnel tracking.';

-- =====================================================
-- PART 4: Auto-Sync Trigger Function
-- =====================================================

-- This function keeps conversion_stage in sync with status
CREATE OR REPLACE FUNCTION public.sync_referral_conversion_stage()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-sync conversion_stage when status changes
    NEW.conversion_stage := CASE
        WHEN NEW.status = 'Referred' THEN 'referred'
        WHEN NEW.status = 'Signed Up' THEN 'signed_up'
        WHEN NEW.status = 'Converted' THEN 'converted'
        WHEN NEW.status = 'Expired' THEN 'expired'
        ELSE 'referred'
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.sync_referral_conversion_stage IS
'Automatically syncs conversion_stage with status on INSERT/UPDATE';

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS trg_sync_referral_conversion_stage ON public.referrals;

-- Create trigger for auto-sync
CREATE TRIGGER trg_sync_referral_conversion_stage
    BEFORE INSERT OR UPDATE OF status ON public.referrals
    FOR EACH ROW
    EXECUTE FUNCTION sync_referral_conversion_stage();

-- =====================================================
-- PART 5: Expire Stale Referrals Function
-- =====================================================

-- Function to expire referrals older than 90 days without conversion
CREATE OR REPLACE FUNCTION public.expire_stale_referrals()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE public.referrals
    SET
        status = 'Expired',
        updated_at = NOW()
    WHERE status IN ('Referred', 'Signed Up')
      AND created_at < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS expired_count = ROW_COUNT;

    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.expire_stale_referrals IS
'Called by cron job to expire referrals older than 90 days without conversion';

GRANT EXECUTE ON FUNCTION public.expire_stale_referrals TO authenticated;

-- =====================================================
-- PART 6: Add Cron Job for Expiry (if pg_cron available)
-- =====================================================

-- Schedule daily expiry check at 3:00 AM UTC
DO $$
BEGIN
    -- Check if pg_cron extension is available
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if any
        PERFORM cron.unschedule('expire_stale_referrals');

        -- Schedule new job
        PERFORM cron.schedule(
            'expire_stale_referrals',
            '0 3 * * *',  -- Daily at 3:00 AM UTC
            'SELECT expire_stale_referrals();'
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- pg_cron not available, skip silently
    NULL;
END $$;

-- =====================================================
-- PART 7: Clean Up Old Functions
-- =====================================================

-- Drop the old CRM-style update function (replaced by auto-sync trigger)
DROP FUNCTION IF EXISTS public.update_referral_conversion_stage(UUID, TEXT, UUID, TEXT, JSONB);

-- Note: Keeping get_organisation_conversion_pipeline for now as it may be useful
-- for analytics, even with simplified stages

COMMIT;

-- =====================================================
-- Verification Queries (run manually)
-- =====================================================
/*
-- Check conversion stages are aligned with status
SELECT
    status,
    conversion_stage,
    COUNT(*)
FROM referrals
GROUP BY status, conversion_stage;

-- Verify constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'check_conversion_stage';

-- Test auto-sync trigger
INSERT INTO referrals (agent_id, referred_email, status)
VALUES ('test-uuid', 'test@example.com', 'Referred');
-- Should have conversion_stage = 'referred'

UPDATE referrals SET status = 'Signed Up' WHERE referred_email = 'test@example.com';
-- Should have conversion_stage = 'signed_up'
*/
