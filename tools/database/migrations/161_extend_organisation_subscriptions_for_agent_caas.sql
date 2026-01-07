-- Migration 161: Extend organisation_subscriptions for Agent CaaS
-- Purpose: Add fields needed for Agent CaaS subscription gating
-- Date: 2026-01-07
-- Reference: Agent CaaS Implementation - Extend existing migration 102 table

-- ============================================================================
-- PART 1: Add missing fields to existing table for Agent CaaS
-- ============================================================================

-- Add owner_id for easier lookups
ALTER TABLE public.organisation_subscriptions
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add tier field (for multi-tier support: premium/starter/pro)
ALTER TABLE public.organisation_subscriptions
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'premium' CHECK (tier IN ('premium', 'starter', 'pro'));

-- Add stripe_price_id for tracking which price the customer is on
ALTER TABLE public.organisation_subscriptions
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

COMMENT ON COLUMN public.organisation_subscriptions.owner_id IS 'Agent CaaS: Profile ID of organisation owner (for quick lookups)';
COMMENT ON COLUMN public.organisation_subscriptions.tier IS 'Agent CaaS: Subscription tier (premium=£50/mo, starter=£49/mo, pro=£99/mo)';
COMMENT ON COLUMN public.organisation_subscriptions.stripe_price_id IS 'Stripe price ID (price_xxxxx)';

-- ============================================================================
-- PART 2: Create indexes for new columns
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_organisation_subscriptions_owner_id
  ON public.organisation_subscriptions(owner_id);

-- ============================================================================
-- PART 3: Backfill owner_id from connection_groups
-- ============================================================================

UPDATE public.organisation_subscriptions os
SET owner_id = cg.profile_id
FROM public.connection_groups cg
WHERE os.organisation_id = cg.id
  AND cg.type = 'organisation'
  AND os.owner_id IS NULL;

-- ============================================================================
-- PART 4: Update check_org_subscription_active to work with existing schema
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_org_subscription_active(agent_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  has_active_sub BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.connection_groups cg
    INNER JOIN public.organisation_subscriptions os ON cg.id = os.organisation_id
    WHERE cg.profile_id = agent_id
      AND cg.type = 'organisation'
      AND os.status IN ('trialing', 'active')  -- Match existing schema statuses
      AND os.current_period_end > NOW()
  ) INTO has_active_sub;

  RETURN COALESCE(has_active_sub, false);
END;
$$;

COMMENT ON FUNCTION public.check_org_subscription_active(UUID) IS
  'Agent CaaS: Checks if agent has an active organisation subscription.
   Returns true if agent owns an organisation with active or trialing subscription (status = trialing/active, not expired).
   Used to gate Agent CaaS organisation bonuses (+30 points potential).';

-- ============================================================================
-- PART 5: Validation
-- ============================================================================

DO $$
BEGIN
  -- Verify owner_id column exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organisation_subscriptions'
    AND column_name = 'owner_id'
  ) THEN
    RAISE EXCEPTION 'owner_id column was not added successfully';
  END IF;

  -- Verify tier column exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organisation_subscriptions'
    AND column_name = 'tier'
  ) THEN
    RAISE EXCEPTION 'tier column was not added successfully';
  END IF;

  RAISE NOTICE 'Migration 161: Successfully extended organisation_subscriptions for Agent CaaS';
END $$;
