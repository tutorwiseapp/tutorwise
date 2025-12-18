-- Migration: 129_add_profile_level_delegation.sql
-- Purpose: Add profile-level default delegation column to support hierarchical delegation
-- Date: 2025-12-18
-- Prerequisites: Migration 034 (delegate_commission_to_profile_id on listings) completed
--
-- Patent Reference: do-not-push-to-github-uk-provisional-patent-application-referral-system-v2.md
-- - Section 7.2: Hierarchical Delegation Scopes
-- - Dependent Claim 9: Hierarchical delegation configuration system
--
-- This migration adds the profile-level delegation fallback mechanism, which together with
-- listing-level delegation creates a two-level hierarchical delegation system with
-- deterministic precedence resolution:
--
-- Hierarchy (Patent Section 7.3):
--   Level 1: Listing-specific delegation (highest precedence)
--   Level 2: Profile-level default delegation (fallback) ← THIS MIGRATION
--   Level 3: Original referral attribution (base case)

BEGIN;

-- Add profile-level default delegation column
ALTER TABLE public.profiles
ADD COLUMN default_commission_delegate_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for performance (partial index - only non-NULL values)
CREATE INDEX idx_profiles_default_delegate ON public.profiles(default_commission_delegate_id)
  WHERE default_commission_delegate_id IS NOT NULL;

-- Prevent self-delegation at profile level (fraud prevention)
CREATE OR REPLACE FUNCTION public.prevent_profile_self_delegation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.default_commission_delegate_id IS NOT NULL
     AND NEW.default_commission_delegate_id = NEW.id THEN
    RAISE EXCEPTION 'Cannot delegate commission to self at profile level (fraud prevention)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_profile_self_delegation
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_self_delegation();

-- Add column comment
COMMENT ON COLUMN public.profiles.default_commission_delegate_id IS
'[Patent Section 7.2, Scope 2] Profile-level default delegation target.
Applies to all listings owned by this profile UNLESS overridden by
listing-specific delegation. When set, commissions are redirected to
the specified profile_id IF AND ONLY IF the service provider is the
direct referrer of the client. If a third-party agent referred the
client, the commission goes to that agent instead. This is the fallback
delegation when no listing-specific delegation is configured.

Hierarchical Resolution (Patent Section 7.3):
  1. Check listing.delegate_commission_to_profile_id (highest precedence)
  2. Check profiles.default_commission_delegate_id (this column - fallback)
  3. Use profiles.referred_by_profile_id (base case)';

COMMIT;

-- Verification query to check migration success:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'profiles'
--   AND column_name = 'default_commission_delegate_id';

-- Test self-delegation prevention:
-- UPDATE profiles SET default_commission_delegate_id = id WHERE id = '<some_profile_id>';
-- Expected: ERROR: Cannot delegate commission to self at profile level (fraud prevention)
