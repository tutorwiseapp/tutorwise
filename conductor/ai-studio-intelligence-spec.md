# AI Studio Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-09
**Status**: Draft — for review
**Author**: Architecture

Related: [`ai-adoption-intelligence-spec.md`](./ai-adoption-intelligence-spec.md) · [`marketplace-intelligence-spec.md`](./marketplace-intelligence-spec.md) · [`caas-intelligence-spec.md`](./caas-intelligence-spec.md) · [`conductor-solution-design.md`](./conductor-solution-design.md)

> **Role in the platform**: AI Studio is the creator lifecycle for tutors who build AI versions of themselves. Where the GTM Lifecycle covers a human tutor's journey to their first booking, the AI Studio Lifecycle covers an AI agent's journey from creation to active income generation. It is the supply-side counterpart to the AI Marketplace (demand-side) and the AI Adoption spec (subscription demand-side).

---

## 1. Purpose

A tutor with a live, high-performing AI agent on Tutorwise earns passive income while sleeping. This is the platform's most compelling long-term value proposition for supply-side retention. Without Conductor intelligence, AI agents get created and abandoned: configuration is never completed, listings never go live, or agents sit on the marketplace with zero bookings for months while the tutor receives no coaching.

**Two outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| AI agent creator lifecycle monitoring and quality coaching | Phase 3 | Market Intelligence Agent (Conductor) |
| Admin AI Studio intelligence panel | Phase 3 | `/admin/ai` (alongside AI Adoption panel) |

> **Relationship to AI Adoption spec**: [`ai-adoption-intelligence-spec.md`](./ai-adoption-intelligence-spec.md) covers platform-level AI subscription and marketplace metrics (demand + aggregate supply). This spec covers the *individual creator journey* — the tutor-level lifecycle from AI agent creation to active revenue.

---

## 2. AI Studio System Recap

### 2A. AI Agent Creator Lifecycle

```
AI STUDIO CREATOR LIFECYCLE

  Create ──► Configure ──► Publish ──► First Booking ──► Quality Review ──► Scale
     │            │             │             │                  │              │
  ai_agents    knowledge      status       booking_type=    CaaS score      concurrent
  INSERT       base + persona  'active'    'ai_agent'       assessed        subjects +
               + subjects                  first booking    (review avg,    time slots
               + pricing                   within 14d       session rating)
```

### 2B. Key Schema

```
ai_agents:
  id, tutor_id (profile_id FK)
  name, description, subject
  status: 'draft' | 'active' | 'suspended' | 'archived'
  hourly_rate_pence
  knowledge_base_url? (configured knowledge)
  published_at, created_at

bookings:
  booking_type: 'human' | 'ai_agent'
  ai_agent_id (FK → ai_agents, nullable)
  client_id, tutor_id, status
  completed_at

caas_scores (existing):
  profile_id, caas_score
  -- AI agents scored via their owning tutor's CaaS
  -- ai_agent_bookings_30d is a CaaS sub-metric

reviews:
  booking_id, rating, content, created_at
  -- AI agent bookings reviewed same as human bookings
```

### 2C. Creator Lifecycle Stages

| Stage | Definition | Target KPI |
|-------|-----------|------------|
| **Created** | `ai_agents` row inserted, `status = 'draft'` | — |
| **Configured** | Knowledge base set + subjects + pricing complete | < 3 days from creation |
| **Published** | `status = 'active'`, appears on marketplace | < 7 days from creation |
| **Active** | First `booking_type = 'ai_agent'` booking completed | Within 14 days of publish |
| **Quality** | Avg review rating ≥ 4.0 across ≥ 3 AI bookings | Within 60 days of first booking |
| **Scaling** | 3+ AI bookings/month OR multiple subjects listed | 90 days |

---

## 3. Market Intelligence Agent — AI Studio Tools

### Tool: `query_ai_studio_health`

```typescript
{
  "name": "query_ai_studio_health",
  "description": "Returns the AI agent creator lifecycle funnel: creation to publish conversion, cold-start rates, quality distribution, and top-performing AI agents",
  "parameters": {
    "days": { "type": "integer", "default": 30 }
  }
}
```

**Returns:**

```typescript
interface AIStudioHealthResponse {
  funnel: {
    created_30d: number;
    published_30d: number;              // reached 'active' status in 30d
    publish_rate: number;               // published / created
    first_booking_14d: number;          // got first booking within 14d of publish
    first_booking_rate: number;         // first_booking / published
    avg_days_create_to_publish: number;
    avg_days_publish_to_first_booking: number;
  };
  creator_cohorts: {
    stuck_in_draft: number;             // draft > 7 days, no progress
    published_zero_bookings_14d: number; // active > 14d, 0 bookings
    active_earning: number;             // ≥1 booking in last 30d
    scaling: number;                    // 3+ bookings/month or multi-subject
  };
  quality: {
    avg_rating_all_ai_agents: number;
    agents_below_threshold: number;     // avg rating < 4.0 with ≥ 3 reviews
    agents_with_no_reviews: number;     // active with 0 reviews
    top_agents_by_bookings: AIAgentSummary[];
  };
  revenue: {
    total_ai_gmv_30d_pence: bigint;
    avg_revenue_per_active_agent_pence: bigint;
    top_10_pct_revenue_share: number;   // % of AI GMV from top 10% of agents
  };
  alerts: AIStudioAlert[];
}

interface AIAgentSummary {
  agent_id: string;
  agent_name: string;
  tutor_name: string;
  bookings_30d: number;
  avg_rating: number;
  revenue_30d_pence: bigint;
}

interface AIStudioAlert {
  type: 'draft_stall' | 'cold_start_elevated' | 'quality_concern'
      | 'publish_rate_low' | 'revenue_concentrated';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  agent_ids?: string[];
  action: string;
}
```

---

## 4. Key SQL

### 4A. Creator Funnel

```sql
SELECT
  COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days') AS created_30d,
  COUNT(*) FILTER (
    WHERE status = 'active'
      AND published_at >= now() - interval '30 days'
  ) AS published_30d,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'active' AND published_at >= now() - interval '30 days')
    ::numeric /
    NULLIF(COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days'), 0) * 100
  , 1) AS publish_rate_pct,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (published_at - created_at)) / 86400)
    FILTER (WHERE status = 'active' AND published_at IS NOT NULL)
  , 1) AS avg_days_create_to_publish
FROM ai_agents;
```

### 4B. Cold-Start Detection

```sql
-- AI agents that are published but haven't received a booking in 14+ days
SELECT
  a.id AS agent_id,
  a.name AS agent_name,
  p.full_name AS tutor_name,
  p.id AS tutor_id,
  a.published_at,
  EXTRACT(EPOCH FROM (now() - a.published_at)) / 86400 AS days_since_publish,
  COUNT(b.id) AS total_bookings_ever
FROM ai_agents a
JOIN profiles p ON p.id = a.tutor_id
LEFT JOIN bookings b ON b.ai_agent_id = a.id AND b.booking_type = 'ai_agent'
WHERE a.status = 'active'
  AND a.published_at < now() - interval '14 days'
GROUP BY a.id, a.name, p.full_name, p.id, a.published_at
HAVING COUNT(b.id) = 0
ORDER BY days_since_publish DESC;
```

### 4C. Quality Distribution

```sql
SELECT
  a.id AS agent_id,
  a.name AS agent_name,
  p.full_name AS tutor_name,
  COUNT(r.id) AS review_count,
  ROUND(AVG(r.rating), 2) AS avg_rating,
  COUNT(b.id) FILTER (
    WHERE b.created_at >= now() - interval '30 days'
  ) AS bookings_30d
FROM ai_agents a
JOIN profiles p ON p.id = a.tutor_id
LEFT JOIN bookings b ON b.ai_agent_id = a.id AND b.booking_type = 'ai_agent'
LEFT JOIN reviews r ON r.booking_id = b.id
WHERE a.status = 'active'
GROUP BY a.id, a.name, p.full_name
ORDER BY avg_rating ASC NULLS LAST;
```

### 4D. Draft Stall Detection

```sql
-- AI agents stuck in draft for more than 7 days
SELECT
  a.id AS agent_id,
  a.name AS agent_name,
  p.full_name AS tutor_name,
  p.id AS tutor_id,
  a.created_at,
  EXTRACT(EPOCH FROM (now() - a.created_at)) / 86400 AS days_in_draft
FROM ai_agents a
JOIN profiles p ON p.id = a.tutor_id
WHERE a.status = 'draft'
  AND a.created_at < now() - interval '7 days'
ORDER BY days_in_draft DESC;
```

### 4E. Top Performing AI Agents

```sql
SELECT
  a.id,
  a.name,
  p.full_name AS tutor_name,
  COUNT(b.id) AS bookings_30d,
  ROUND(AVG(r.rating), 2) AS avg_rating,
  COALESCE(SUM(t.amount) FILTER (
    WHERE t.type = 'Booking Payment' AND t.status != 'refunded'
  ), 0) AS revenue_30d_pence
FROM ai_agents a
JOIN profiles p ON p.id = a.tutor_id
JOIN bookings b ON b.ai_agent_id = a.id
  AND b.booking_type = 'ai_agent'
  AND b.created_at >= now() - interval '30 days'
LEFT JOIN reviews r ON r.booking_id = b.id
LEFT JOIN transactions t ON t.booking_id = b.id
WHERE a.status = 'active'
GROUP BY a.id, a.name, p.full_name
ORDER BY bookings_30d DESC
LIMIT 10;
```

---

## 5. Alert Triggers

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| `draft_stall` | `stuck_in_draft` > 10 agents (> 7 days in draft) | warning | Trigger configuration coaching sequence for affected tutors |
| `cold_start_elevated` | `published_zero_bookings_14d` > 20% of active agents | warning | Trigger Growth Advisor cold-start coaching; review AI marketplace UX |
| `quality_concern` | Any agent with avg_rating < 3.5 AND ≥ 5 reviews | critical | HITL: "AI agent quality alert — [agent name]. Consider suspension." |
| `publish_rate_low` | `publish_rate` < 50% (fewer than half of created agents go live) | warning | Review AI Studio configuration UX; simplify setup flow |
| `revenue_concentrated` | Top 10% of AI agents generate > 80% of AI GMV | info | Diversification opportunity — coaching for middle-tier agents |

---

## 6. Database Table: `ai_studio_platform_metrics_daily`

**Migration: 369**

```sql
CREATE TABLE ai_studio_platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,

  -- Funnel
  agents_created_30d integer NOT NULL DEFAULT 0,
  agents_published_30d integer NOT NULL DEFAULT 0,
  publish_rate_pct numeric(5,2),
  first_booking_rate_pct numeric(5,2),
  avg_days_create_to_publish numeric(5,1),
  avg_days_publish_to_booking numeric(5,1),

  -- Creator cohorts
  stuck_in_draft integer NOT NULL DEFAULT 0,
  published_zero_bookings integer NOT NULL DEFAULT 0,
  active_earning integer NOT NULL DEFAULT 0,
  scaling integer NOT NULL DEFAULT 0,

  -- Quality
  avg_rating_all_agents numeric(3,2),
  agents_below_quality_threshold integer NOT NULL DEFAULT 0,
  agents_with_no_reviews integer NOT NULL DEFAULT 0,

  -- Revenue
  total_ai_gmv_30d_pence bigint NOT NULL DEFAULT 0,
  avg_revenue_per_active_agent_pence bigint NOT NULL DEFAULT 0,
  top_10_pct_revenue_share_pct numeric(5,2),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON ai_studio_platform_metrics_daily (metric_date DESC);

-- pg_cron: daily at 11:00 UTC
SELECT cron.schedule(
  'compute-ai-studio-platform-metrics',
  '0 11 * * *',
  $$SELECT compute_ai_studio_platform_metrics();$$
);
```

---

## 7. Admin AI Studio Intelligence Panel

Panel within `/admin/ai` (alongside AI Adoption panel).

```
┌──────────────────────────────────────────────────────────────────────┐
│  AI Studio Intelligence                            Last 30 days ▾    │
├──────────────────────────────────────────────────────────────────────┤
│  Creator Funnel                                                       │
│  Created: 24 ──► Published: 18 (75% ✓) ──► First booking: 11 (61%)  │
│  Avg days create→publish: 4.2d   Avg days publish→booking: 8.7d     │
├──────────────────────────────────────────────────────────────────────┤
│  Creator Cohorts                                                     │
│  Stuck in draft (>7d):  6  ⚠     Published, 0 bookings (>14d): 7 ⚠ │
│  Active earning:        54        Scaling (3+/mo or multi-subject): 18│
├──────────────────────────────────────────────────────────────────────┤
│  Quality                                                             │
│  Avg rating: 4.3 ✓   Below threshold (<4.0 with ≥3 reviews): 4  ⚠ │
│  No reviews yet: 11                                                  │
├──────────────────────────────────────────────────────────────────────┤
│  Revenue                                                             │
│  AI GMV (30d): £5,840   Avg per active agent: £108/mo              │
│  Top 10% revenue share: 61.2%   ⚠ Concentration risk               │
├──────────────────────────────────────────────────────────────────────┤
│  ⚠ 6 agents stuck in draft > 7d — configuration coaching needed   │
│  ⚠ 7 published agents with 0 bookings > 14d — cold start risk      │
│  ⚠ 4 agents with quality concern (avg rating < 4.0)                │
└──────────────────────────────────────────────────────────────────────┘

  [View draft-stall agents]  [View cold-start agents]  [View quality alerts]
```

---

## 8. Conductor Workflow Integration

### Draft Stall Recovery

```
Trigger: compute_ai_studio_platform_metrics() identifies agent in 'draft' > 7d
Step 1: Check tutor profile + growth_scores.component_scores
Step 2: Send targeted Growth Agent coaching session:
  "Your AI agent '[name]' is 80% configured — here are the 2 missing steps
   before it can appear on the marketplace: [knowledge base missing | pricing
   not set | subject not selected]"
Step 3 (Day 14): If still in draft → HITL advisory:
  "AI agent configuration stall — [tutor name], [N] days in draft"
  Admin actions: [Send personal setup guide] [Offer 1:1 setup support] [Archive agent]
```

### Cold-Start Coaching

```
Trigger: ai_agent published > 14d with 0 bookings
Step 1: Retrieve agent profile + marketplace position (search rank)
Step 2: Compare to top-performing agents in same subject: identify gap
Step 3: Send Growth Agent coaching:
  "Your AI agent has been live for 14 days with no bookings yet. Here's what
   top-performing AI agents in [subject] do differently: [hourly rate comparison
   | knowledge base depth | description quality]"
Step 4 (Day 30): If still 0 bookings → HITL: "AI agent cold start — 30d"
  Admin actions: [Review agent quality] [Boost visibility] [Recommend suspension]
```

### Quality Alert — AI Agent

```
Trigger: avg_rating < 3.5 with ≥ 5 reviews (evaluated daily)
Step 1: Retrieve all reviews for the agent — identify common themes
Step 2: HITL: "AI agent quality alert — [agent name], avg rating [X], [N] reviews"
  Admin actions: [Suspend agent] [Send tutor improvement coaching] [Review manually]
Step 3 (if suspended): Send tutor notification + Growth Agent coaching on improvement
Step 4 (reactivation): 7-day observation period after reactivation before alert cleared
```

---

## 9. Growth Advisor Integration

```
"AI Studio" section in Growth Advisor context (tutor role):

Tutor WITHOUT an AI agent:
  Growth Advisor coaching (if tutor has ≥10 completed bookings):
    "You've delivered [N] sessions — you could now create an AI version of
     yourself that takes bookings while you sleep. Tutors with AI agents earn
     an average of £108/month in additional passive income. [Create your AI agent →]"

Tutor WITH a draft/published AI agent:
  Stage-specific coaching:
    Draft:     "Your AI agent needs [X] to go live. It takes 10 minutes."
    Published: "Your AI agent has been live for [N] days. Here's how to get
               your first booking..."
    Active:    "Your AI agent earned £X this month. Here's how to scale it
               to multiple subjects..."
    Quality:   "Your AI agent's rating dropped to [X]. Here's what clients
               are saying and how to improve it..."

Tutor WITH a scaling AI agent:
  Proactive:  "Your AI agent is performing in the top 20% — here's how to
              launch a second subject agent..."
```

---

## 10. Phase Plan

### Phase 3 — Conductor Integration (est. 20h)

| Task | Effort |
|------|--------|
| `ai_studio_platform_metrics_daily` + migration 369 | 2h |
| `compute_ai_studio_platform_metrics()` pg_cron + funnel SQL | 3h |
| `query_ai_studio_health` tool in Market Intelligence | 4h |
| Draft Stall Recovery workflow | 2h |
| Cold-Start Coaching workflow | 3h |
| Quality Alert workflow | 2h |
| Admin AI Studio intelligence panel UI | 3h |
| `/api/admin/ai/studio-intelligence` API route | 1h |

### Phase 4 — Growth Advisor (est. 5h)

| Task | Effort |
|------|--------|
| AI Studio coaching in Growth Advisor skills (all lifecycle stages) | 3h |
| AI Studio context in Growth Advisor system prompt hydration | 2h |

**Total: 25h**

---

## 11. Migration Summary

| Migration | Description |
|-----------|-------------|
| 369 | `ai_studio_platform_metrics_daily` table + `compute_ai_studio_platform_metrics()` function + pg_cron |

---

## 12. Relationship to Other Specs

```
GTM Lifecycle (human tutor):
  Tutor → Marketplace listing → Bookings → Financials

AI Studio Lifecycle (AI agent):
  Tutor → creates AI agent → AI Marketplace listing → AI Bookings → AI revenue
                                        ↓
                              Signal segments booking_type='ai_agent'
                              CaaS tracks ai_agent_bookings_30d
                              AI Adoption monitors marketplace-level metrics
                              AI Studio monitors creator-level lifecycle
```

The GTM Lifecycle and AI Studio Lifecycle run in parallel for tutors who create AI agents. A tutor's Growth Score captures both their human tutoring trajectory (`earnings_trajectory`) and their AI agent performance (via `listing_performance` and CaaS). Conductor monitors both pathways independently and surfaces the right coaching at the right stage.
