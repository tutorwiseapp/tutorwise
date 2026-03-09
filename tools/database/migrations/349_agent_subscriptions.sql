-- Migration 349: agent_subscriptions
-- Phase 2 — Conductor: Agents + Teams
-- Unified subscription table for all agent types (sage, growth, specialist agents).
-- Mirrors sage_pro_subscriptions schema with an extra agent_type column.
-- Does NOT drop sage_pro_subscriptions (retained until Phase 3).

CREATE TABLE IF NOT EXISTS agent_subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_type            TEXT NOT NULL DEFAULT 'sage',

  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id     TEXT,
  stripe_price_id        TEXT,

  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'trialing', 'active', 'past_due', 'canceled',
    'incomplete', 'incomplete_expired', 'unpaid'
  )),

  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 month'),
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at          TIMESTAMPTZ,

  questions_used_this_period INTEGER DEFAULT 0,
  questions_limit            INTEGER DEFAULT 5000,
  price_per_month            NUMERIC(10, 2) DEFAULT 10.00,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, agent_type)
);

ALTER TABLE agent_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_sub_owner_read ON agent_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY agent_sub_admin_all ON agent_subscriptions
  FOR ALL USING (is_admin());

CREATE POLICY agent_sub_service_role ON agent_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX idx_agent_sub_user ON agent_subscriptions(user_id);
CREATE INDEX idx_agent_sub_type ON agent_subscriptions(agent_type);
CREATE INDEX idx_agent_sub_status ON agent_subscriptions(status);

CREATE OR REPLACE FUNCTION update_agent_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_subscriptions_updated_at
  BEFORE UPDATE ON agent_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_agent_subscriptions_updated_at();

-- Backfill: copy existing sage_pro_subscriptions rows as agent_type='sage'
INSERT INTO agent_subscriptions (
  user_id, agent_type, stripe_subscription_id, stripe_customer_id,
  status, current_period_start, current_period_end,
  cancel_at_period_end, canceled_at,
  questions_used_this_period, questions_limit, price_per_month,
  created_at, updated_at
)
SELECT
  user_id, 'sage', stripe_subscription_id, stripe_customer_id,
  CASE status
    WHEN 'trialing' THEN 'trialing'
    WHEN 'active'   THEN 'active'
    WHEN 'past_due' THEN 'past_due'
    WHEN 'canceled' THEN 'canceled'
    ELSE 'active'
  END,
  COALESCE(current_period_start, now()),
  COALESCE(current_period_end, now() + INTERVAL '1 month'),
  COALESCE(cancel_at_period_end, false),
  canceled_at,
  COALESCE(questions_used_this_period, 0),
  COALESCE(questions_limit, 5000),
  COALESCE(price_per_month, 10.00),
  COALESCE(created_at, now()),
  COALESCE(updated_at, now())
FROM sage_pro_subscriptions
ON CONFLICT (user_id, agent_type) DO NOTHING;
