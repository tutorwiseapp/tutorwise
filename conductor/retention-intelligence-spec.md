# Retention & LTV Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-09
**Status**: Draft — for review
**Author**: Architecture

Related: [`gtm-intelligence-spec.md`](./gtm-intelligence-spec.md) · [`bookings-intelligence-spec.md`](./bookings-intelligence-spec.md) · [`referral-intelligence-spec.md`](./referral-intelligence-spec.md) · [`conductor-solution-design.md`](./conductor-solution-design.md)

> **Role in the platform**: The GTM Lifecycle ends at the first payout. Retention is everything that happens after. This spec defines how Conductor monitors the post-acquisition lifecycle for all four user roles (tutor, client, agent, organisation), detects churn signals before they become churn events, and triggers the right intervention at the right time.

---

## 1. Purpose

Every user acquired through the GTM or Referral Lifecycle enters a five-stage retention journey. Without Conductor intelligence, churn is invisible until it has already happened: a client who stopped rebooking, a tutor whose bookings plateaued, an agent whose referral network went dormant. The Growth Score (all 4 roles, migration 345) provides the per-user signal — this spec wraps it in a lifecycle structure, a monitoring agent, and a set of intervention workflows.

**Three outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| Retention cohort health monitoring (all roles) | Phase 3 | Retention Monitor Agent (Conductor) |
| Admin Retention Intelligence panel | Phase 3 | `/admin/retention` or `/admin/analytics` |
| LTV tracking by acquisition source (organic vs referral) | Phase 3 | Retention Monitor Agent |

---

## 2. Retention Lifecycle — The Five Cohorts

Every user belongs to exactly one cohort at any point in time. Cohorts are role-specific where noted.

```
RETENTION LIFECYCLE (all roles)

  Onboarding ──► Activated ──► Retained ──► Re-engagement ──► Win-back
      │              │              │               │                │
  Profile set    1st booking    2+ bookings    Last event       Last event
  no booking     completed      /interaction   31–90d ago       > 90d ago
  yet            (tutors:       in 60d         (churn risk)     (churned)
                  first         (stable)
                  session
                  delivered)
```

### Cohort Definitions by Role

| Cohort | Tutor | Client | Agent | Organisation |
|--------|-------|--------|-------|-------------|
| **Onboarding** | Profile active, 0 completed bookings | Profile active, 0 completed bookings | Profile active, 0 referred signups | Org created, 0 active members |
| **Activated** | 1+ completed booking in first 30d | 1+ completed booking ever | 1+ referred signup made a booking | 1+ member with completed booking |
| **Retained** | 3+ bookings in last 30d OR Growth Score ≥ 70 | Rebooked same tutor in last 60d | Commission earned in last 30d | ≥50% members had booking in 30d |
| **Re-engagement** | No booking in 31–60d + Growth Score dropped >5pts in 14d | No booking in 31–90d | No commission in 31–60d | Team avg Growth Score dropped >5pts |
| **Win-back** | No booking in 61d+ | No booking in 90d+ | No commission in 61d+ | No member bookings in 60d+ |

---

## 3. Retention Monitor Agent — Retention Tools

### Tool: `query_retention_health`

```typescript
{
  "name": "query_retention_health",
  "description": "Returns user lifecycle cohort distribution, Growth Score trajectories, churn signals, and LTV breakdown by acquisition source for all four user roles",
  "parameters": {
    "days": { "type": "integer", "default": 30 }
  }
}
```

**Returns:**

```typescript
interface RetentionHealthResponse {
  cohorts: {
    tutor: CohortBreakdown;
    client: CohortBreakdown;
    agent: CohortBreakdown;
    organisation: CohortBreakdown;
  };
  churn_signals: {
    score_drop_alerts_7d: number;         // users with Growth Score drop > 5pts in 7d
    re_engagement_cohort_growth_7d: number; // net change in re-engagement cohort size
    win_back_cohort_size: number;         // total win-back candidates
    high_value_at_risk: number;           // retained users with score drop signal
  };
  ltv: {
    avg_bookings_per_client_lifetime: number;
    avg_revenue_per_tutor_30d_pence: bigint;
    organic_vs_referral_ltv_ratio: number;  // referral-acquired users vs organic LTV
    top_10_pct_client_booking_share: number; // % of bookings from top 10% of clients
  };
  onboarding: {
    stuck_tutors_14d: number;   // tutors in Onboarding > 14d with no booking
    stuck_clients_14d: number;  // clients in Onboarding > 14d with no booking
    activation_rate_30d: number; // Onboarding → Activated conversion in 30d
  };
  alerts: RetentionAlert[];
}

interface CohortBreakdown {
  onboarding: number;
  activated: number;
  retained: number;
  re_engagement: number;
  win_back: number;
  total_active: number;
}

interface RetentionAlert {
  type: 'churn_spike' | 'onboarding_stall' | 'activation_low'
      | 'high_value_churn_risk' | 'win_back_cohort_large' | 'ltv_declining';
  severity: 'info' | 'warning' | 'critical';
  role?: 'tutor' | 'client' | 'agent' | 'organisation';
  message: string;
  action: string;
}
```

---

## 4. Key SQL

### 4A. Tutor Cohort Classification

```sql
WITH tutor_bookings AS (
  SELECT
    p.id AS profile_id,
    p.created_at AS profile_created,
    COUNT(b.id) FILTER (WHERE b.status = 'Completed') AS total_completed,
    MAX(b.completed_at) AS last_booking,
    COUNT(b.id) FILTER (
      WHERE b.status = 'Completed'
        AND b.completed_at >= now() - interval '30 days'
    ) AS bookings_30d
  FROM profiles p
  LEFT JOIN bookings b ON b.tutor_id = p.id
  WHERE p.role_type = 'tutor' AND p.status = 'active'
  GROUP BY p.id, p.created_at
),
tutor_scores AS (
  SELECT user_id, score FROM growth_scores WHERE role_type = 'tutor'
)
SELECT
  COUNT(*) FILTER (WHERE tb.total_completed = 0) AS onboarding,
  COUNT(*) FILTER (
    WHERE tb.total_completed >= 1
      AND (tb.last_booking >= now() - interval '30 days')
      AND tb.bookings_30d < 3
      AND COALESCE(gs.score, 0) < 70
  ) AS activated,
  COUNT(*) FILTER (
    WHERE tb.bookings_30d >= 3 OR COALESCE(gs.score, 0) >= 70
  ) AS retained,
  COUNT(*) FILTER (
    WHERE tb.total_completed >= 1
      AND tb.last_booking BETWEEN now() - interval '60 days' AND now() - interval '31 days'
  ) AS re_engagement,
  COUNT(*) FILTER (
    WHERE tb.total_completed >= 1
      AND tb.last_booking < now() - interval '61 days'
  ) AS win_back
FROM tutor_bookings tb
LEFT JOIN tutor_scores gs ON gs.user_id = tb.profile_id;
```

### 4B. Client Cohort Classification

```sql
WITH client_bookings AS (
  SELECT
    p.id AS profile_id,
    COUNT(b.id) FILTER (WHERE b.status = 'Completed') AS total_completed,
    MAX(b.completed_at) AS last_booking,
    -- rebooked same tutor signal
    COUNT(DISTINCT b.tutor_id) FILTER (
      WHERE b.status = 'Completed'
        AND b.completed_at >= now() - interval '60 days'
    ) AS distinct_tutors_60d,
    COUNT(b.id) FILTER (
      WHERE b.status = 'Completed'
        AND b.completed_at >= now() - interval '60 days'
    ) AS bookings_60d
  FROM profiles p
  LEFT JOIN bookings b ON b.client_id = p.id
  WHERE p.role_type = 'client' AND p.status = 'active'
  GROUP BY p.id
)
SELECT
  COUNT(*) FILTER (WHERE total_completed = 0) AS onboarding,
  COUNT(*) FILTER (
    WHERE total_completed >= 1
      AND last_booking >= now() - interval '30 days'
      AND NOT (bookings_60d >= 2 AND distinct_tutors_60d < bookings_60d)
  ) AS activated,
  COUNT(*) FILTER (
    WHERE bookings_60d >= 2 AND distinct_tutors_60d < bookings_60d  -- rebooked same tutor
  ) AS retained,
  COUNT(*) FILTER (
    WHERE total_completed >= 1
      AND last_booking BETWEEN now() - interval '90 days' AND now() - interval '31 days'
  ) AS re_engagement,
  COUNT(*) FILTER (
    WHERE total_completed >= 1
      AND last_booking < now() - interval '91 days'
  ) AS win_back
FROM client_bookings;
```

### 4C. Growth Score Drop Alerts (Churn Signal)

```sql
-- Users whose Growth Score dropped > 5 points in the last 7 days
-- Requires growth_scores_history or comparing current to cached snapshot
-- NOTE: Implement by adding a previous_score column to growth_scores (updated by pg_cron)
SELECT
  gs.user_id,
  gs.role_type,
  gs.score AS current_score,
  gs.previous_score,
  gs.score - gs.previous_score AS score_delta,
  p.full_name
FROM growth_scores gs
JOIN profiles p ON p.id = gs.user_id
WHERE (gs.score - COALESCE(gs.previous_score, gs.score)) <= -5
  AND gs.computed_at >= now() - interval '7 days'
ORDER BY (gs.score - gs.previous_score) ASC;
```

### 4D. LTV by Acquisition Source

```sql
-- Compare lifetime booking value: referral-acquired vs organic clients
SELECT
  CASE WHEN p.referred_by_profile_id IS NOT NULL THEN 'referral' ELSE 'organic' END AS source,
  COUNT(DISTINCT p.id) AS client_count,
  COUNT(b.id) FILTER (WHERE b.status = 'Completed') AS total_bookings,
  ROUND(COUNT(b.id) FILTER (WHERE b.status = 'Completed')::numeric /
    NULLIF(COUNT(DISTINCT p.id), 0), 2) AS avg_bookings_per_client,
  COALESCE(SUM(t.amount) FILTER (
    WHERE t.type = 'Booking Payment' AND t.status != 'refunded'
  ), 0) AS total_gmv_pence
FROM profiles p
LEFT JOIN bookings b ON b.client_id = p.id
LEFT JOIN transactions t ON t.booking_id = b.id
WHERE p.role_type = 'client'
GROUP BY source;
```

### 4E. Onboarding Stall Detection

```sql
-- Users stuck in Onboarding > 14 days (no completed booking)
SELECT
  p.role_type,
  COUNT(*) AS stuck_count,
  AVG(EXTRACT(EPOCH FROM (now() - p.created_at)) / 86400) AS avg_days_stuck
FROM profiles p
LEFT JOIN bookings b
  ON (b.tutor_id = p.id OR b.client_id = p.id)
  AND b.status = 'Completed'
WHERE p.status = 'active'
  AND p.created_at < now() - interval '14 days'
  AND b.id IS NULL
GROUP BY p.role_type;
```

---

## 5. Alert Triggers

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| `churn_spike` | Re-engagement cohort grows by >10% in 7d for any role | warning | Trigger cohort re-engagement workflow |
| `onboarding_stall` | `stuck_tutors_14d` > 20 OR `stuck_clients_14d` > 30 | warning | Review onboarding UX; trigger nudge sequence |
| `activation_low` | `activation_rate_30d` < 40% (fewer than 40% of new users reach first booking) | warning | Review signup → first booking funnel |
| `high_value_churn_risk` | Any user in Retained cohort with score drop > 10pts in 7d | critical | Immediate Growth Advisor proactive outreach |
| `win_back_cohort_large` | Win-back cohort > 15% of total active users for any role | warning | Admin review; run win-back campaign |
| `ltv_declining` | `avg_bookings_per_client_lifetime` drops > 10% month-over-month | warning | Cross-reference with cancellation rates and pricing changes |

---

## 6. Database Table: `retention_platform_metrics_daily`

**Migration: 366**

```sql
CREATE TABLE retention_platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,

  -- Tutor cohorts
  tutor_onboarding integer NOT NULL DEFAULT 0,
  tutor_activated integer NOT NULL DEFAULT 0,
  tutor_retained integer NOT NULL DEFAULT 0,
  tutor_re_engagement integer NOT NULL DEFAULT 0,
  tutor_win_back integer NOT NULL DEFAULT 0,

  -- Client cohorts
  client_onboarding integer NOT NULL DEFAULT 0,
  client_activated integer NOT NULL DEFAULT 0,
  client_retained integer NOT NULL DEFAULT 0,
  client_re_engagement integer NOT NULL DEFAULT 0,
  client_win_back integer NOT NULL DEFAULT 0,

  -- Agent cohorts
  agent_onboarding integer NOT NULL DEFAULT 0,
  agent_activated integer NOT NULL DEFAULT 0,
  agent_retained integer NOT NULL DEFAULT 0,
  agent_re_engagement integer NOT NULL DEFAULT 0,
  agent_win_back integer NOT NULL DEFAULT 0,

  -- Org cohorts
  org_onboarding integer NOT NULL DEFAULT 0,
  org_activated integer NOT NULL DEFAULT 0,
  org_retained integer NOT NULL DEFAULT 0,
  org_re_engagement integer NOT NULL DEFAULT 0,
  org_win_back integer NOT NULL DEFAULT 0,

  -- Churn signals
  score_drop_alerts_7d integer NOT NULL DEFAULT 0,
  high_value_at_risk integer NOT NULL DEFAULT 0,

  -- Onboarding health
  stuck_tutors_14d integer NOT NULL DEFAULT 0,
  stuck_clients_14d integer NOT NULL DEFAULT 0,
  activation_rate_30d_pct numeric(5,2),

  -- LTV
  avg_client_lifetime_bookings numeric(6,2),
  referral_vs_organic_ltv_ratio numeric(5,2),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON retention_platform_metrics_daily (metric_date DESC);

-- pg_cron: daily at 09:30 UTC
SELECT cron.schedule(
  'compute-retention-platform-metrics',
  '30 9 * * *',
  $$SELECT compute_retention_platform_metrics();$$
);
```

> **Schema note**: Migration 366 also adds `previous_score` column to `growth_scores` (updated by the existing `compute-growth-scores` pg_cron) to enable score-drop detection without a separate history table.

```sql
-- Part of migration 366
ALTER TABLE growth_scores ADD COLUMN IF NOT EXISTS previous_score integer;
```

---

## 7. Admin Retention Intelligence Panel

New tab or panel at `/admin/analytics` or `/admin/retention`.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Retention Intelligence                           Last 30 days ▾      │
├──────────────────────────────────────────────────────────────────────┤
│  User Lifecycle Cohorts                                               │
│                  Onboard  Activated  Retained  Re-engage  Win-back   │
│  Tutors            142      287        198        34  ⚠       12     │
│  Clients           89       431        312        51  ⚠       28     │
│  Agents            23        41         29         6           3     │
│  Orgs               4         9          7         1           0     │
├──────────────────────────────────────────────────────────────────────┤
│  Churn Signals (last 7 days)                                         │
│  Score drop alerts: 18  ⚠    High-value at risk: 4  ⚠             │
│  Re-engagement cohort: +6.2% (week-over-week)                       │
├──────────────────────────────────────────────────────────────────────┤
│  Onboarding Health                                                   │
│  Stuck tutors (>14d, no booking): 11     Activation rate: 52.3% ✓  │
│  Stuck clients (>14d, no booking): 14                               │
├──────────────────────────────────────────────────────────────────────┤
│  LTV by Acquisition Source                                           │
│  Referral clients: avg 6.2 bookings/lifetime                        │
│  Organic clients:  avg 3.8 bookings/lifetime   Ratio: 1.63x ✓     │
├──────────────────────────────────────────────────────────────────────┤
│  ⚠ Tutor re-engagement cohort grew 8.1% this week                  │
│  ⚠ 4 high-value tutors with Growth Score drop > 8pts               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 8. Conductor Workflow Integration

### Growth Score Drop Intervention

```
Trigger: growth_scores.previous_score - score > 5 (any role) — evaluated daily by pg_cron
Step 1: Classify user cohort + role
Step 2: Identify lowest component (from component_scores JSONB)
Step 3: SELECT matching Growth Advisor recommendation for lowest component
Step 4: Send targeted in-app notification (send_notification handler)
  ↓ If user is in Re-engagement cohort AND score < 40:
    → Escalate to HITL advisory: "High churn risk — [name], [role], score dropped [X]pts"
    Admin actions: [Trigger manual outreach] [Apply discount] [Assign to customer success]
Step 5: Log outcome to platform_events (growth.churn_intervention)
Step 6: Check conversion after 14d (did user move to better cohort?)
```

### Onboarding Nudge Sequence

```
Trigger: profile created > 7d with 0 completed bookings
Step 1: Send Day 7 nudge (personalised to role_type)
  Tutor: "Your first booking is one step away — here's how to improve your listing"
  Client: "Find your perfect tutor — [3 recommended listings based on subjects]"
Step 2 (Day 14): If still stuck → HITL advisory: "Onboarding stall — [N] users"
  Admin actions: [Send personal outreach] [Offer first-session discount] [Review UX]
```

### 30-Day Re-engagement

```
Trigger: last_booking crosses 31-day threshold (evaluated daily by Retention Monitor)
Step 1: Send re-engagement email + notification
  Tutor: "[X] clients searched for your subject this week — your listing is live"
  Client: "Your tutor [name] has availability — book your next session"
  Agent: "2 of your tutors haven't had bookings in 30 days — review their listings"
Step 2 (Day 45): If no booking — Growth Agent proactive session offered
Step 3: Log engagement events to platform_events
```

### 90-Day Win-back

```
Trigger: last_booking crosses 91-day threshold
Step 1: HITL advisory: "Win-back candidates — [N] clients, [M] tutors"
  Admin actions: [Send win-back campaign] [Apply return credit] [Archive profiles]
Step 2 (if approved): Personalised win-back email with return incentive
Step 3: 14-day observation window — log rebooking events
```

---

## 9. Growth Advisor Integration

The Growth Advisor already reads the Growth Score and its components. This spec adds lifecycle cohort context:

```
"Retention Status" section in Growth Advisor context:
  - Current cohort: [Onboarding | Activated | Retained | Re-engagement | Win-back]
  - Growth Score: [score]/100 — lowest component: [component_name]
  - LTV percentile: [X]th percentile vs platform avg
  - Days since last booking/commission (if applicable)

Growth Advisor coaching by cohort:
  Onboarding (tutor):  "You haven't had your first booking yet. Here are the 3 highest-impact
                         changes to your listing right now..."
  Activated (client):  "You've completed 1 session — clients who rebook the same tutor see
                         2x better outcomes. Book your follow-up..."
  Re-engagement:       "You haven't had a booking in [X] days. Your growth score dropped
                         [N] points — here's the one thing to fix this week..."
  Win-back:            "Welcome back. Here's what changed while you were away — [3 new
                         tutors matching your subjects]"
```

---

## 10. Phase Plan

### Phase 3 — Conductor Integration (est. 22h)

| Task | Effort |
|------|--------|
| `retention_platform_metrics_daily` + migration 366 | 2h |
| `compute_retention_platform_metrics()` pg_cron + cohort SQL | 3h |
| `previous_score` column on `growth_scores` (migration 366) | 1h |
| `query_retention_health` tool in Retention Monitor | 4h |
| Growth Score Drop Intervention workflow | 3h |
| Onboarding Nudge Sequence workflow | 2h |
| 30-Day Re-engagement + 90-Day Win-back workflows | 3h |
| Admin Retention Intelligence panel UI | 3h |
| `/api/admin/retention/intelligence` API route | 1h |

### Phase 4 — Growth Advisor (est. 4h)

| Task | Effort |
|------|--------|
| Cohort context in Growth Advisor system prompt | 2h |
| Cohort-specific coaching branches in Growth Advisor skills | 2h |

**Total: 26h**

---

## 11. Migration Summary

| Migration | Description |
|-----------|-------------|
| 366 | `retention_platform_metrics_daily` table + `compute_retention_platform_metrics()` function + pg_cron + `previous_score` column on `growth_scores` |
