# AI Product Adoption Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-09
**Status**: Draft — for review
**Author**: Architecture

Related: [`ai-studio-intelligence-spec.md`](./ai-studio-intelligence-spec.md) · [`marketplace-intelligence-spec.md`](./marketplace-intelligence-spec.md) · [`gtm-intelligence-spec.md`](./gtm-intelligence-spec.md) · [`conductor-solution-design.md`](./conductor-solution-design.md)

> **Role in the platform**: Tutorwise has two AI subscription products — Sage Pro (client-facing AI tutoring) and Growth Agent (advisor for all roles). It also has an AI marketplace layer where AI tutors take bookings (`booking_type = 'ai_agent'`). Without Conductor intelligence, AI subscription churn goes undetected, the free-to-paid conversion funnel has no monitoring, and AI marketplace performance is invisible until it's reflected in GMV.

---

## 1. Purpose

The AI product layer is the highest-margin revenue line on the platform. Sage Pro and Growth Agent each command £10/month subscriptions. The AI marketplace lets tutors deploy AI agents that take bookings autonomously. These three surfaces share a common problem: they are invisible to platform operations unless something breaks badly enough to show in financials.

**Two outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| AI product adoption and subscription health monitoring | Phase 3 | Market Intelligence Agent (Conductor) |
| Admin AI Adoption intelligence panel | Phase 3 | `/admin/ai` (new tab alongside Sage, Lexi, Growth) |

> **Relationship to AI Studio spec**: This spec covers *demand-side* AI product adoption — who is subscribing to Sage Pro and Growth Agent, and how the AI marketplace is converting. [`ai-studio-intelligence-spec.md`](./ai-studio-intelligence-spec.md) covers the *supply-side* creator lifecycle — tutors building and deploying AI agents.

---

## 2. AI Product System Recap

### 2A. The Three AI Products

```
SAGE PRO — Client-facing AI tutoring
  Target:     Clients (and their students)
  Value:      AI tutoring sessions between human tutor sessions
  Pricing:    £10/month subscription
  Access:     Sage AI sessions, personalised learning paths

GROWTH AGENT — AI coaching for all roles
  Target:     Tutors, clients, agents, organisations
  Value:      Revenue growth coaching, profile optimisation, referral strategy
  Pricing:    £10/month subscription (free audit always available)
  Access:     Unlimited coaching sessions, deep metrics access

AI MARKETPLACE — AI tutors taking live bookings
  Target:     Clients searching for tutoring (demand side)
  Created by: Tutors building AI agents in AI Studio (supply side)
  booking_type: 'ai_agent' (vs 'human' for human tutors)
  Pricing:    Same booking flow as human tutors
```

### 2B. Key Schema (Assumed)

```
subscriptions:
  id, profile_id, product_type ('sage_pro' | 'growth_agent')
  status ('trialing' | 'active' | 'cancelled' | 'past_due')
  period_start, period_end, cancelled_at
  stripe_subscription_id
  created_at

ai_agents:
  id, tutor_id (profile_id FK), name, status ('draft' | 'active' | 'suspended')
  subject, description, hourly_rate
  published_at, created_at

bookings:
  booking_type: 'human' | 'ai_agent'
  ai_agent_id (FK → ai_agents, nullable)
```

### 2C. Existing Intelligence

The Signal spec (`signal-intelligence-spec.md`, migration 358) already segments attribution by `booking_type`. The CaaS spec (`caas-intelligence-spec.md`, migration 355) tracks `ai_agent_bookings_30d` per tutor. This spec builds the platform-level funnel on top of those signals.

---

## 3. Market Intelligence Agent — AI Adoption Tools

### Tool: `query_ai_adoption_health`

```typescript
{
  "name": "query_ai_adoption_health",
  "description": "Returns AI product adoption metrics: Sage Pro and Growth Agent subscription health, AI marketplace booking performance, and free-to-paid conversion funnels",
  "parameters": {
    "days": { "type": "integer", "default": 30 }
  }
}
```

**Returns:**

```typescript
interface AIAdoptionHealthResponse {
  sage_pro: {
    active_subscribers: number;
    new_subscriptions_30d: number;
    cancellations_30d: number;
    churn_rate: number;            // cancellations / start_of_period active
    mrr_pence: bigint;             // active_subscribers * 1000 (£10)
    trial_to_paid_rate: number;    // trialing → active conversions in 30d
    avg_sessions_per_subscriber: number;  // Sage sessions / active subscribers
  };
  growth_agent: {
    active_subscribers: number;
    new_subscriptions_30d: number;
    cancellations_30d: number;
    churn_rate: number;
    mrr_pence: bigint;
    sessions_30d: number;          // total Growth Agent sessions
    power_users_30d: number;       // users with > 5 sessions in 30d
    free_audit_to_paid_rate: number; // free audit users → paid conversion
  };
  ai_marketplace: {
    active_ai_agents: number;       // ai_agents with status='active'
    ai_bookings_30d: number;        // bookings WHERE booking_type='ai_agent'
    ai_gmv_30d_pence: bigint;
    ai_booking_share: number;       // ai_bookings / total_bookings
    avg_rating_ai_agents: number;   // review avg for AI agent bookings
    ai_agents_with_0_bookings_30d: number; // active agents not converting
  };
  combined: {
    total_ai_mrr_pence: bigint;     // sage_pro + growth_agent MRR
    ai_revenue_share: number;       // AI MRR as % of total platform revenue
    multi_product_users: number;    // users subscribed to both products
  };
  alerts: AIAdoptionAlert[];
}

interface AIAdoptionAlert {
  type: 'sage_churn_elevated' | 'growth_agent_low_adoption'
      | 'ai_marketplace_cold' | 'ai_booking_quality_drop'
      | 'mrr_declining' | 'zero_booking_agents_elevated';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  action: string;
}
```

---

## 4. Key SQL

### 4A. Sage Pro Subscription Health

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'active') AS active_subscribers,
  COUNT(*) FILTER (
    WHERE status = 'active'
      AND created_at >= now() - interval '30 days'
  ) AS new_subscriptions_30d,
  COUNT(*) FILTER (
    WHERE status = 'cancelled'
      AND cancelled_at >= now() - interval '30 days'
  ) AS cancellations_30d,
  ROUND(
    COUNT(*) FILTER (
      WHERE status = 'cancelled'
        AND cancelled_at >= now() - interval '30 days'
    )::numeric /
    NULLIF(COUNT(*) FILTER (WHERE status = 'active'), 0) * 100
  , 2) AS churn_rate_pct,
  COUNT(*) FILTER (WHERE status = 'active') * 1000 AS mrr_pence  -- £10 = 1000p
FROM subscriptions
WHERE product_type = 'sage_pro';
```

### 4B. Growth Agent Power Users

```sql
-- Growth Agent sessions in last 30d, identify power users (>5 sessions)
SELECT
  COUNT(DISTINCT profile_id) AS unique_users_30d,
  COUNT(*) AS total_sessions_30d,
  COUNT(DISTINCT profile_id) FILTER (
    WHERE session_count > 5
  ) AS power_users
FROM (
  SELECT
    profile_id,
    COUNT(*) AS session_count
  FROM growth_agent_sessions  -- or growth_agent_messages grouped by session
  WHERE created_at >= now() - interval '30 days'
  GROUP BY profile_id
) sub;
```

### 4C. AI Marketplace Performance

```sql
SELECT
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'active') AS active_ai_agents,
  COUNT(b.id) FILTER (
    WHERE b.booking_type = 'ai_agent'
      AND b.created_at >= now() - interval '30 days'
  ) AS ai_bookings_30d,
  COALESCE(SUM(t.amount) FILTER (
    WHERE b.booking_type = 'ai_agent'
      AND t.type = 'Booking Payment'
      AND t.created_at >= now() - interval '30 days'
  ), 0) AS ai_gmv_30d_pence,
  ROUND(
    COUNT(b.id) FILTER (WHERE b.booking_type = 'ai_agent')::numeric /
    NULLIF(COUNT(b.id), 0) * 100
  , 1) AS ai_booking_share_pct,
  -- AI agents with zero bookings in last 30d (cold start)
  COUNT(DISTINCT a.id) FILTER (
    WHERE a.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM bookings b2
        WHERE b2.ai_agent_id = a.id
          AND b2.booking_type = 'ai_agent'
          AND b2.created_at >= now() - interval '30 days'
      )
  ) AS ai_agents_with_0_bookings_30d
FROM ai_agents a
LEFT JOIN bookings b ON b.ai_agent_id = a.id
LEFT JOIN transactions t ON t.booking_id = b.id;
```

### 4D. Free Audit → Paid Conversion (Growth Agent)

```sql
-- Clients who used the free revenue audit and then subscribed within 14 days
WITH free_audits AS (
  SELECT
    profile_id,
    MIN(created_at) AS first_audit_at
  FROM platform_events
  WHERE event_type = 'growth.audit_completed'
    AND created_at >= now() - interval '60 days'
  GROUP BY profile_id
)
SELECT
  COUNT(*) AS free_audit_users,
  COUNT(s.id) AS converted_to_paid,
  ROUND(COUNT(s.id)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS conversion_rate_pct
FROM free_audits fa
LEFT JOIN subscriptions s
  ON s.profile_id = fa.profile_id
  AND s.product_type = 'growth_agent'
  AND s.status IN ('active', 'trialing')
  AND s.created_at BETWEEN fa.first_audit_at AND fa.first_audit_at + interval '14 days';
```

---

## 5. Alert Triggers

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| `sage_churn_elevated` | Sage Pro `churn_rate` > 15% in 30d | critical | Review cancellation reasons; trigger win-back for churned subscribers |
| `growth_agent_low_adoption` | Growth Agent active users < 20% of eligible (subscribed) users with 0 sessions in 30d | warning | Trigger re-engagement notification sequence |
| `ai_marketplace_cold` | `ai_agents_with_0_bookings_30d` > 50% of active agents | warning | Investigate AI agent listing quality; trigger AI Studio coaching |
| `ai_booking_quality_drop` | Avg review rating for `booking_type='ai_agent'` drops below 3.8 | critical | Review top-flagged AI agents; consider suspension flow |
| `mrr_declining` | Combined AI MRR this month < 85% of prior month | critical | Cross-reference with churn rate + new subscription rate |
| `zero_booking_agents_elevated` | `ai_agents_with_0_bookings_30d` increases by >10 week-over-week | warning | Trigger AI Studio coaching sequence for inactive agent owners |

---

## 6. Database Table: `ai_adoption_platform_metrics_daily`

**Migration: 367**

```sql
CREATE TABLE ai_adoption_platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,

  -- Sage Pro
  sage_active_subscribers integer NOT NULL DEFAULT 0,
  sage_new_30d integer NOT NULL DEFAULT 0,
  sage_cancellations_30d integer NOT NULL DEFAULT 0,
  sage_churn_rate_pct numeric(5,2),
  sage_mrr_pence bigint NOT NULL DEFAULT 0,
  sage_trial_to_paid_rate_pct numeric(5,2),

  -- Growth Agent
  growth_active_subscribers integer NOT NULL DEFAULT 0,
  growth_new_30d integer NOT NULL DEFAULT 0,
  growth_cancellations_30d integer NOT NULL DEFAULT 0,
  growth_churn_rate_pct numeric(5,2),
  growth_mrr_pence bigint NOT NULL DEFAULT 0,
  growth_sessions_30d integer NOT NULL DEFAULT 0,
  growth_power_users_30d integer NOT NULL DEFAULT 0,
  growth_free_to_paid_rate_pct numeric(5,2),

  -- AI Marketplace
  active_ai_agents integer NOT NULL DEFAULT 0,
  ai_bookings_30d integer NOT NULL DEFAULT 0,
  ai_gmv_30d_pence bigint NOT NULL DEFAULT 0,
  ai_booking_share_pct numeric(5,2),
  ai_agents_zero_bookings integer NOT NULL DEFAULT 0,

  -- Combined
  total_ai_mrr_pence bigint NOT NULL DEFAULT 0,
  ai_revenue_share_pct numeric(5,2),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON ai_adoption_platform_metrics_daily (metric_date DESC);

-- pg_cron: daily at 10:00 UTC
SELECT cron.schedule(
  'compute-ai-adoption-platform-metrics',
  '0 10 * * *',
  $$SELECT compute_ai_adoption_platform_metrics();$$
);
```

---

## 7. Admin AI Intelligence Panel

New panel at `/admin/ai` (or within the existing AI Systems admin page).

```
┌──────────────────────────────────────────────────────────────────────┐
│  AI Product Intelligence                         Last 30 days ▾      │
├──────────────────────────────────────────────────────────────────────┤
│  Sage Pro                    Growth Agent                            │
│  Active subs:   312 ✓        Active subs:    187 ✓                 │
│  New (30d):      34          New (30d):       21                    │
│  Churned (30d):  12          Churned (30d):    8                    │
│  Churn rate:    3.8% ✓       Churn rate:      4.3% ✓               │
│  MRR:         £3,120         MRR:           £1,870                  │
│  Trial→paid:   41.2% ✓       Free audit→paid: 18.3% ✓              │
├──────────────────────────────────────────────────────────────────────┤
│  AI Marketplace                                                      │
│  Active AI agents:  89       AI bookings (30d):  312                │
│  AI GMV (30d):  £4,120       AI booking share:   8.4%               │
│  Avg rating:    4.2 ✓        Agents with 0 bookings: 31  ⚠         │
├──────────────────────────────────────────────────────────────────────┤
│  Combined AI MRR: £4,990     AI revenue share: 12.3%               │
├──────────────────────────────────────────────────────────────────────┤
│  ⚠ 31 active AI agents had 0 bookings in last 30d                  │
│  ✓ No subscription churn alerts                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. Conductor Workflow Integration

### AI Subscription Churn Recovery

```
Trigger: subscription.status → 'cancelled' event (Stripe webhook → platform_events)
Step 1: Retrieve cancellation reason (if Stripe provides it)
Step 2: Classify: price sensitivity / low usage / product-market fit
  ↓ Low usage (< 2 sessions in last 30d before cancel):
    → Trigger win-back: "You had [X] sessions — here's what you missed..."
  ↓ Price sensitivity signal:
    → HITL advisory: "High-value subscriber cancelled — [name], [tenure], [total paid]"
      Admin actions: [Offer discount] [Send personal outreach] [Archive]
Step 3: Log to platform_events (ai.subscription_churned + reason_type)
```

### Zero-Booking AI Agent Coaching

```
Trigger: ai_agents_zero_bookings_30d > 0 (detected by compute_ai_adoption_platform_metrics)
Step 1: Query: SELECT * FROM ai_agents WHERE status='active' AND last_booking_at < now() - interval '30 days'
Step 2: For each affected tutor → send Growth Agent coaching session trigger:
  "Your AI agent [name] hasn't had a booking in 30 days. Here are 3 changes
   that could improve its conversion rate..."
Step 3: If 30 days later still 0 bookings → HITL: "AI agent inactive — consider
  suspension or quality review"
```

---

## 9. Growth Advisor Integration

```
"AI Products" section in Growth Advisor context (all roles):

Tutor:
  - AI agent status (if created): bookings, revenue, CaaS score
  - Growth Agent subscription status + sessions used this month
  - Coaching: "Your AI agent earned £X last month with zero additional effort..."

Client:
  - Sage Pro subscription status + sessions used
  - Coaching: "You've used [N] AI sessions — clients who use Sage Pro between
    human sessions improve [X]% faster..."

Agent:
  - Growth Agent usage across managed tutors
  - Coaching: "3 of your tutors haven't activated Growth Agent yet — here's how
    it can increase their conversion rate..."
```

---

## 10. Phase Plan

### Phase 3 — Conductor Integration (est. 18h)

| Task | Effort |
|------|--------|
| `ai_adoption_platform_metrics_daily` + migration 367 | 2h |
| `compute_ai_adoption_platform_metrics()` pg_cron | 3h |
| `query_ai_adoption_health` tool in Market Intelligence | 4h |
| AI Subscription Churn Recovery workflow | 3h |
| Zero-Booking AI Agent Coaching workflow | 2h |
| Admin AI Intelligence panel UI | 3h |
| `/api/admin/ai/intelligence` API route | 1h |

### Phase 4 — Growth Advisor (est. 3h)

| Task | Effort |
|------|--------|
| AI product context in Growth Advisor system prompt | 1h |
| AI subscription coaching in Growth Advisor skills | 2h |

**Total: 21h**

---

## 11. Migration Summary

| Migration | Description |
|-----------|-------------|
| 367 | `ai_adoption_platform_metrics_daily` table + `compute_ai_adoption_platform_metrics()` function + pg_cron |
