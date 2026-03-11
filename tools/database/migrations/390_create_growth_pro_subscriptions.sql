-- ===================================================================
-- Migration: 390_create_growth_pro_subscriptions.sql (originally 343, renumbered to avoid conflicts)
-- Purpose: Subscription tracking for Growth Agent Pro tier
-- Version: v1.0
-- Date: 2026-03-05
-- ===================================================================
-- Soft rate-limit paywall model (same as Sage Pro):
--   Free tier: 10 questions/day (no subscription required)
--   Growth Pro (£10/month): 5,000 questions/month + full features
--   No free trial — users subscribe when they're ready.
--
-- Tables:
--   growth_pro_subscriptions  — Stripe subscription tracking (one per user)
--   growth_usage_log          — Question usage tracking
-- ===================================================================

-- ===================================================================
-- SECTION 1: GROWTH PRO SUBSCRIPTIONS
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.growth_pro_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_price_id TEXT,

  -- Subscription status
  -- active:              Paying customer with valid payment method
  -- past_due:            Payment failed, grace period (3 days)
  -- canceled:            User canceled (access until period end)
  -- incomplete:          Created but payment incomplete
  -- incomplete_expired:  Payment incomplete and expired
  -- unpaid:              Payment failed after grace period
  status TEXT NOT NULL CHECK (status IN (
    'active',
    'past_due',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'unpaid'
  )) DEFAULT 'active',

  -- Billing cycle
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),

  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  -- Quota (reset monthly)
  questions_used_this_period INTEGER DEFAULT 0,
  questions_limit INTEGER DEFAULT 5000,

  -- Pricing
  price_per_month NUMERIC(10, 2) DEFAULT 10.00,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================================
-- SECTION 2: GROWTH USAGE LOG
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.growth_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  question_count INTEGER DEFAULT 1,
  tokens_used INTEGER,
  model_used TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================================
-- SECTION 3: RLS POLICIES
-- ===================================================================

ALTER TABLE public.growth_pro_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_usage_log ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription
CREATE POLICY "Users can view own growth subscription"
  ON public.growth_pro_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role manages subscriptions (Stripe webhooks)
CREATE POLICY "Service role manages growth subscriptions"
  ON public.growth_pro_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view their own usage
CREATE POLICY "Users can view own growth usage"
  ON public.growth_usage_log FOR SELECT
  USING (auth.uid() = user_id);

-- Service role manages usage logs
CREATE POLICY "Service role manages growth usage"
  ON public.growth_usage_log FOR ALL
  USING (auth.role() = 'service_role');

-- ===================================================================
-- SECTION 4: INDEXES
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_growth_pro_subscriptions_stripe_sub
  ON public.growth_pro_subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_growth_pro_subscriptions_status
  ON public.growth_pro_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_growth_usage_log_user_created
  ON public.growth_usage_log(user_id, created_at DESC);

-- ===================================================================
-- SECTION 5: UPDATED_AT TRIGGER
-- ===================================================================

CREATE OR REPLACE FUNCTION update_growth_pro_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER growth_pro_subscriptions_updated_at
  BEFORE UPDATE ON public.growth_pro_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_growth_pro_subscriptions_updated_at();

-- ===================================================================
-- SECTION 6: DAILY QUESTION LIMIT CHECK (RPC for rate limiter)
-- ===================================================================

CREATE OR REPLACE FUNCTION check_growth_daily_limit(p_user_id UUID)
RETURNS TABLE (
  questions_today INTEGER,
  daily_limit INTEGER,
  is_pro BOOLEAN,
  allowed BOOLEAN
) AS $$
DECLARE
  v_questions_today INTEGER;
  v_is_pro BOOLEAN;
  v_daily_limit INTEGER;
BEGIN
  -- Check if user has active pro subscription
  SELECT EXISTS (
    SELECT 1 FROM public.growth_pro_subscriptions
    WHERE user_id = p_user_id
    AND status IN ('active', 'past_due')
  ) INTO v_is_pro;

  v_daily_limit := CASE WHEN v_is_pro THEN 500 ELSE 10 END;

  -- Count questions asked today (UTC)
  SELECT COALESCE(SUM(question_count), 0)
  INTO v_questions_today
  FROM public.growth_usage_log
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE::TIMESTAMPTZ;

  RETURN QUERY SELECT
    v_questions_today,
    v_daily_limit,
    v_is_pro,
    v_questions_today < v_daily_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.growth_pro_subscriptions IS
  'Stripe subscription tracking for Growth Agent Pro (£10/month). Soft rate-limit model: free=10/day, pro=5000/month.';

COMMENT ON TABLE public.growth_usage_log IS
  'Question usage tracking for Growth Agent rate limiting and billing analytics.';
