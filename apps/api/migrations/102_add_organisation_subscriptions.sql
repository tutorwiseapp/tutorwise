-- ===================================================================
-- Migration: 102_add_organisation_subscriptions.sql
-- Purpose: Add Stripe subscription tracking for Organisation Premium tier
-- Version: v7.0
-- Date: 2025-12-13
-- ===================================================================
-- This migration adds the organisation_subscriptions table to track
-- Stripe subscription status for the Organisation Premium feature (£50/month).
--
-- Features:
-- - 14-day free trial (no credit card required)
-- - Single Premium tier (no free tier)
-- - Subscription states: trialing, active, past_due, canceled
-- ===================================================================

-- ===================================================================
-- SECTION 1: CREATE SUBSCRIPTION TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.organisation_subscriptions (
  -- Primary key is organisation_id (one subscription per organisation)
  organisation_id UUID PRIMARY KEY REFERENCES public.connection_groups(id) ON DELETE CASCADE,

  -- Stripe integration fields
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,

  -- Subscription status
  -- trialing: In 14-day free trial (no payment required yet)
  -- active: Paying customer with valid payment method
  -- past_due: Payment failed, grace period (3 days)
  -- canceled: User canceled subscription (access until period end)
  -- incomplete: Subscription created but payment incomplete
  -- incomplete_expired: Payment incomplete and trial expired
  -- unpaid: Payment failed after grace period (no access)
  status TEXT NOT NULL CHECK (status IN (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'unpaid'
  )) DEFAULT 'trialing',

  -- Trial tracking
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Billing cycle
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,

  -- Cancellation tracking
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add table comment
COMMENT ON TABLE public.organisation_subscriptions IS 'v7.0: Stripe subscriptions for Organisation Premium tier (£50/month with 14-day trial)';

-- Add column comments
COMMENT ON COLUMN public.organisation_subscriptions.organisation_id IS 'FK to connection_groups (type=organisation)';
COMMENT ON COLUMN public.organisation_subscriptions.stripe_subscription_id IS 'Stripe subscription ID (sub_xxxxx)';
COMMENT ON COLUMN public.organisation_subscriptions.stripe_customer_id IS 'Stripe customer ID (cus_xxxxx)';
COMMENT ON COLUMN public.organisation_subscriptions.status IS 'Subscription status synced from Stripe';
COMMENT ON COLUMN public.organisation_subscriptions.trial_start IS 'When 14-day trial started';
COMMENT ON COLUMN public.organisation_subscriptions.trial_end IS 'When 14-day trial ends (user must add payment)';
COMMENT ON COLUMN public.organisation_subscriptions.cancel_at_period_end IS 'True if user canceled (access until period_end)';

-- ===================================================================
-- SECTION 2: CREATE INDEXES
-- ===================================================================

-- Index for Stripe subscription ID lookups (webhook processing)
CREATE INDEX idx_organisation_subscriptions_stripe_id
  ON public.organisation_subscriptions(stripe_subscription_id);

-- Index for status filtering (find all active/trialing/past_due subscriptions)
CREATE INDEX idx_organisation_subscriptions_status
  ON public.organisation_subscriptions(status);

-- Index for trial expiration queries (find trials ending soon)
CREATE INDEX idx_organisation_subscriptions_trial_end
  ON public.organisation_subscriptions(trial_end)
  WHERE trial_end IS NOT NULL;

-- Index for period end queries (billing cycle processing)
CREATE INDEX idx_organisation_subscriptions_period_end
  ON public.organisation_subscriptions(current_period_end);

-- ===================================================================
-- SECTION 3: ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS
ALTER TABLE public.organisation_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Only organisation owner can view their subscription
CREATE POLICY "Owner can view organisation subscription"
  ON public.organisation_subscriptions FOR SELECT
  USING (
    organisation_id IN (
      SELECT id FROM public.connection_groups
      WHERE profile_id = auth.uid() AND type = 'organisation'
    )
  );

-- Policy: System can insert subscriptions (via webhook)
-- Note: Webhooks run as service role, not as authenticated user
-- This policy allows service role to insert, but not regular users
CREATE POLICY "Service role can insert subscriptions"
  ON public.organisation_subscriptions FOR INSERT
  WITH CHECK (
    -- Allow if using service role key (webhook context)
    auth.jwt() ->> 'role' = 'service_role'
    OR
    -- Allow if inserting for own organisation (trial signup)
    organisation_id IN (
      SELECT id FROM public.connection_groups
      WHERE profile_id = auth.uid() AND type = 'organisation'
    )
  );

-- Policy: System can update subscriptions (via webhook)
CREATE POLICY "Service role can update subscriptions"
  ON public.organisation_subscriptions FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
    OR
    organisation_id IN (
      SELECT id FROM public.connection_groups
      WHERE profile_id = auth.uid() AND type = 'organisation'
    )
  );

-- Policy: Owner can delete their subscription (cancel)
CREATE POLICY "Owner can delete organisation subscription"
  ON public.organisation_subscriptions FOR DELETE
  USING (
    organisation_id IN (
      SELECT id FROM public.connection_groups
      WHERE profile_id = auth.uid() AND type = 'organisation'
    )
  );

-- ===================================================================
-- SECTION 4: TRIGGERS
-- ===================================================================

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER update_organisation_subscriptions_updated_at
  BEFORE UPDATE ON public.organisation_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================================================
-- SECTION 5: HELPER FUNCTIONS
-- ===================================================================

-- Function to check if organisation has active subscription
CREATE OR REPLACE FUNCTION public.organisation_has_active_subscription(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organisation_subscriptions
    WHERE organisation_id = org_id
      AND status IN ('trialing', 'active')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.organisation_has_active_subscription IS 'v7.0: Check if organisation has active or trialing subscription (Premium access)';

-- Function to get subscription status for organisation
CREATE OR REPLACE FUNCTION public.get_organisation_subscription_status(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  sub_status TEXT;
BEGIN
  SELECT status INTO sub_status
  FROM public.organisation_subscriptions
  WHERE organisation_id = org_id;

  RETURN COALESCE(sub_status, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_organisation_subscription_status IS 'v7.0: Get subscription status (trialing, active, past_due, canceled, none)';

-- ===================================================================
-- SECTION 6: VALIDATION
-- ===================================================================

-- Verify table was created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'organisation_subscriptions'
  ) THEN
    RAISE EXCEPTION 'Table organisation_subscriptions was not created successfully';
  END IF;

  RAISE NOTICE 'Migration 102_add_organisation_subscriptions completed successfully';
END $$;

-- ===================================================================
-- END OF MIGRATION
-- ===================================================================
