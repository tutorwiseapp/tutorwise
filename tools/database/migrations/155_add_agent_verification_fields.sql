-- Migration 155: Add Agent Verification Fields
-- Purpose: Add business credentials and verification fields for agents
-- Date: 2026-01-07
-- Reference: Agent CaaS Implementation (Bucket 4: Professional Standards)

-- ============================================================================
-- Add agent-specific verification fields to profiles table
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS business_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS professional_insurance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS association_member TEXT;

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.profiles.business_verified IS
  'Whether agent has verified business credentials (e.g., Companies House registration for UK)';

COMMENT ON COLUMN public.profiles.professional_insurance IS
  'Whether agent has professional indemnity insurance coverage';

COMMENT ON COLUMN public.profiles.association_member IS
  'Professional association membership (e.g., "Tutors Association UK", "National Tutoring Association")';

-- ============================================================================
-- Create index for querying verified agents
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_business_verified
  ON public.profiles(business_verified)
  WHERE business_verified = true AND 'agent' = ANY(roles);

-- ============================================================================
-- Verification query examples (commented out)
-- ============================================================================

-- Get all verified agent businesses:
-- SELECT id, full_name, business_verified, professional_insurance, association_member
-- FROM profiles
-- WHERE 'agent' = ANY(roles) AND business_verified = true;

-- Count verified vs unverified agents:
-- SELECT
--   COUNT(*) FILTER (WHERE business_verified = true) as verified_agents,
--   COUNT(*) FILTER (WHERE business_verified = false) as unverified_agents
-- FROM profiles
-- WHERE 'agent' = ANY(roles);
