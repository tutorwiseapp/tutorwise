-- Migration 157: Track Organisation Booking Sources
-- Purpose: Add source tracking to bookings for Agent CaaS Bucket 2 (Business Operations)
-- Date: 2026-01-07
-- Reference: Agent CaaS Implementation (Brand & Marketing, Client Acquisition metrics)

-- ============================================================================
-- Add source tracking columns to bookings table
-- ============================================================================

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS source_type TEXT CHECK (source_type IN ('tutor_profile', 'org_page', 'org_referral', 'direct')),
ADD COLUMN IF NOT EXISTS source_organisation_id UUID REFERENCES public.connection_groups(id) ON DELETE SET NULL;

-- ============================================================================
-- Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bookings_source_org
  ON public.bookings(source_organisation_id)
  WHERE source_organisation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_source_type
  ON public.bookings(source_type)
  WHERE source_type IS NOT NULL;

-- Composite index for org stats queries
CREATE INDEX IF NOT EXISTS idx_bookings_org_source_status
  ON public.bookings(source_organisation_id, source_type, status)
  WHERE source_organisation_id IS NOT NULL AND status = 'Completed';

-- ============================================================================
-- Add comments
-- ============================================================================

COMMENT ON COLUMN public.bookings.source_type IS
  'How the booking was initiated:
   - tutor_profile: Direct booking from individual tutor profile page
   - org_page: Booking initiated from organisation public page
   - org_referral: Internal team referral (team member referred client to another member)
   - direct: Direct contact/repeat booking';

COMMENT ON COLUMN public.bookings.source_organisation_id IS
  'Organisation ID if booking was sourced through organisation channels (org_page or org_referral).
   Used for Agent CaaS scoring (Bucket 2: Brand & Marketing, Team Collaboration)';

-- ============================================================================
-- Example queries for Agent CaaS scoring (commented out)
-- ============================================================================

-- Get organisation-sourced bookings for an org:
-- SELECT
--   source_type,
--   COUNT(*) as total_bookings,
--   COUNT(DISTINCT client_id) as unique_clients
-- FROM bookings
-- WHERE source_organisation_id = '...' AND status = 'Completed'
-- GROUP BY source_type;

-- Calculate team collaboration rate:
-- WITH org_bookings AS (
--   SELECT
--     COUNT(*) as total_bookings,
--     COUNT(*) FILTER (WHERE source_type = 'org_referral') as internal_referrals
--   FROM bookings
--   WHERE source_organisation_id = '...' AND status = 'Completed'
-- )
-- SELECT
--   total_bookings,
--   internal_referrals,
--   ROUND((internal_referrals::NUMERIC / NULLIF(total_bookings, 0)) * 100, 1) as collaboration_rate_pct
-- FROM org_bookings;
