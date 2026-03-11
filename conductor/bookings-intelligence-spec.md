# Bookings Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-08
**Status**: Draft — for review
**Author**: Architecture

Related: [`marketplace-intelligence-spec.md`](./marketplace-intelligence-spec.md) · [`referral-intelligence-spec.md`](./referral-intelligence-spec.md) · [`caas-intelligence-spec.md`](./caas-intelligence-spec.md) · [`conductor-solution-design.md`](./conductor-solution-design.md)

> **Go-to-market pipeline**: Bookings is Stage 5 — the revenue event. Everything upstream (Resources → SEO → Signal → Marketplace) exists to drive a booking. Conductor intelligence here closes the loop: detecting failure patterns, protecting revenue, and optimising the session lifecycle.

---

## 1. Purpose

A booking is the core transaction unit of Tutorwise. Every booking has a lifecycle — created → payment confirmed → scheduled → session delivered → reviewed — and each transition is a point of potential failure. Without Conductor intelligence, no-shows go undetected in patterns, cancellation spikes hide tutor churn signals, the scheduling pipeline stalls silently, and revenue leakage from refund abuse isn't caught early.

**Three outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| Booking lifecycle health monitoring | Phase 3 | Retention Monitor Agent (Conductor) |
| Admin Bookings intelligence dashboard (new) | Phase 3 | `/admin/bookings` (existing page extended) |
| Booking Lifecycle workflows (existing, shadow mode) | Phase 2 → 3 → Live | Conductor Workflow |

---

## 2. Bookings System Recap

### 2A. Booking Schema (key fields)

```
bookings:
  id, client_id, tutor_id, listing_id
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled' | 'No-Show'
  payment_status: 'Pending' | 'Paid' | 'Refunded' | 'Disputed'
  scheduling_status: 'unscheduled' | 'pending_tutor_proposal'
                   | 'pending_client_confirm' | 'scheduled'
  session_start_time, session_end_time
  amount_total, amount_tutor, amount_platform, amount_referrer
  agent_id (lifetime referrer — FK to profiles, from referred_by_profile_id at creation)
  booking_referrer_id (Wiselist analytics only — NOT for commission)
  cancellation_reason, no_show_reported_by, no_show_reported_party
  created_at, updated_at
```

### 2B. Booking Lifecycle (existing Conductor workflows)

```
Booking Created (payment_status='Pending')
    ↓ Stripe payment webhook → execution_id in session metadata
Booking Lifecycle — Human Tutor workflow
    ↓ Node: scheduling_unscheduled → HITL if >48h unscheduled
    ↓ Node: payment_confirmed
    ↓ Node: session_delivered (complete-sessions cron)
    ↓ Node: review_requested

Booking Lifecycle — AI Tutor workflow (shadow)
    ↓ Node: session_created → session_started → session_completed → review_requested
```

### 2C. Key Cron Jobs

- `complete-sessions` — marks Confirmed bookings as Completed when `session_end_time` passes
- `no-show-detection` — flags unconfirmed sessions past start time
- `session-reminders` — sends reminder N hours before session
- `process-pending-commissions` — skips if any Booking Lifecycle process is 'live'

### 2D. Commission Model (migration 342)

```
Direct booking:   90% tutor / 10% platform
Referred booking: 80% tutor / 10% platform / 10% referrer
  where referrer = bookings.agent_id (from client's profiles.referred_by_profile_id)
  ALL referral commissions = 10% regardless of referrer role
```

### 2E. Cancellation Policy

```
>48h before session: full refund to client
24–48h:              50% refund to client
<24h:                no refund (tutor paid as normal)
No-show (tutor):     full refund to client
No-show (client):    tutor paid as normal
Disputed:            held pending admin review
```

---

## 3. Retention Monitor Agent — Booking Tools

Bookings directly drive revenue and retention — they belong in the **Retention Monitor** specialist agent alongside referral funnel and supply/demand tools.

### Tool: `query_booking_health`

```typescript
{
  "name": "query_booking_health",
  "description": "Returns booking pipeline health, cancellation/no-show rates, scheduling stall patterns, and revenue protection signals",
  "parameters": {
    "days": { "type": "integer", "default": 30 }
  }
}
```

**Returns:**

```typescript
interface BookingHealthResponse {
  volume: {
    total_bookings_30d: number;
    confirmed_30d: number;
    completed_30d: number;
    cancelled_30d: number;
    no_show_30d: number;
    pending_unscheduled: number;   // Confirmed but scheduling_status != 'scheduled'
    avg_sessions_per_active_tutor: number;
  };
  rates: {
    cancellation_rate: number;        // cancelled / (confirmed + cancelled + completed)
    no_show_rate: number;             // no_show / completed+no_show
    scheduling_completion_rate: number; // scheduled / confirmed
    payment_capture_rate: number;     // Paid / (Pending + Paid + Refunded)
    repeat_booking_rate: number;      // clients with ≥2 bookings (30d) / unique clients (30d)
  };
  revenue: {
    gmv_30d: number;                  // gross merchandise value (sum amount_total)
    platform_revenue_30d: number;     // sum amount_platform
    refunds_30d: number;              // sum amount_total WHERE payment_status='Refunded'
    refund_rate: number;              // refunds / gmv
    avg_booking_value: number;
    referral_gmv_30d: number;         // GMV on referred bookings (agent_id NOT NULL)
    referral_pct: number;             // referral GMV / total GMV
  };
  scheduling: {
    avg_hours_to_schedule: number;    // time from Confirmed to scheduling_status='scheduled'
    stalled_over_48h: number;         // Confirmed + unscheduled for >48h
    stalled_over_7d: number;          // Confirmed + unscheduled for >7d
  };
  patterns: {
    cancellation_by_reason: Record<string, number>;
    no_show_by_party: { tutor: number; client: number };
    top_cancelling_tutors: Array<{ tutor_id: string; name: string; cancel_count: number }>;
    disputed_count: number;
  };
  alerts: BookingAlert[];
}

interface BookingAlert {
  type: 'cancellation_spike' | 'no_show_spike' | 'scheduling_stall_high'
      | 'refund_rate_high' | 'payment_failure_elevated' | 'repeat_rate_low'
      | 'high_cancelling_tutor' | 'dispute_escalation' | 'gmv_declining';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  affected_entity?: { type: 'tutor' | 'client'; id: string; name: string };
  action: string;
}
```

---

## 4. Key SQL

### 4A. Booking Health Snapshot

```sql
-- 30-day booking health
SELECT
  COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days')
    AS total_bookings_30d,
  COUNT(*) FILTER (WHERE status = 'Confirmed'
    AND created_at >= now() - interval '30 days')                     AS confirmed_30d,
  COUNT(*) FILTER (WHERE status = 'Completed'
    AND created_at >= now() - interval '30 days')                     AS completed_30d,
  COUNT(*) FILTER (WHERE status = 'Cancelled'
    AND created_at >= now() - interval '30 days')                     AS cancelled_30d,
  COUNT(*) FILTER (WHERE status = 'No-Show'
    AND created_at >= now() - interval '30 days')                     AS no_show_30d,
  COUNT(*) FILTER (WHERE status = 'Confirmed'
    AND scheduling_status != 'scheduled')                             AS pending_unscheduled,
  -- Rates
  ROUND(
    COUNT(*) FILTER (WHERE status = 'Cancelled')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('Confirmed','Cancelled','Completed')), 0) * 100, 2
  ) AS cancellation_rate_pct,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'No-Show')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('Completed','No-Show')), 0) * 100, 2
  ) AS no_show_rate_pct,
  -- Revenue
  COALESCE(SUM(amount_total) FILTER (
    WHERE payment_status = 'Paid'
    AND created_at >= now() - interval '30 days'
  ), 0)::numeric / 100                                                AS gmv_30d_pounds,
  COALESCE(SUM(amount_platform) FILTER (
    WHERE payment_status = 'Paid'
    AND created_at >= now() - interval '30 days'
  ), 0)::numeric / 100                                                AS platform_revenue_30d,
  COALESCE(SUM(amount_total) FILTER (
    WHERE payment_status = 'Refunded'
    AND created_at >= now() - interval '30 days'
  ), 0)::numeric / 100                                                AS refunds_30d
FROM bookings;
```

### 4B. Scheduling Stall Detection

```sql
-- Bookings stalled at scheduling step
SELECT
  b.id,
  b.created_at,
  b.scheduling_status,
  EXTRACT(EPOCH FROM (now() - b.created_at)) / 3600 AS hours_since_created,
  p_tutor.full_name AS tutor_name,
  p_client.full_name AS client_name
FROM bookings b
JOIN profiles p_tutor ON b.tutor_id = p_tutor.id
JOIN profiles p_client ON b.client_id = p_client.id
WHERE b.status = 'Confirmed'
  AND b.scheduling_status NOT IN ('scheduled')
  AND b.created_at < now() - interval '48 hours'
ORDER BY b.created_at ASC;
```

### 4C. Cancellation Pattern — By Reason

```sql
SELECT
  cancellation_reason,
  COUNT(*) AS count,
  ROUND(COUNT(*)::numeric /
    NULLIF(SUM(COUNT(*)) OVER (), 0) * 100, 1) AS pct
FROM bookings
WHERE status = 'Cancelled'
  AND created_at >= now() - interval '30 days'
GROUP BY cancellation_reason
ORDER BY count DESC;
```

### 4D. High Cancellation Rate Tutors

```sql
-- Tutors with >3 cancellations in 30d OR cancellation rate >30%
WITH tutor_stats AS (
  SELECT
    tutor_id,
    p.full_name,
    COUNT(*) FILTER (WHERE status = 'Cancelled') AS cancel_count,
    COUNT(*) FILTER (WHERE status IN ('Confirmed','Completed','Cancelled')) AS total_bookings,
    ROUND(
      COUNT(*) FILTER (WHERE status = 'Cancelled')::numeric /
      NULLIF(COUNT(*) FILTER (WHERE status IN ('Confirmed','Completed','Cancelled')), 0) * 100
    , 1) AS cancel_rate
  FROM bookings b
  JOIN profiles p ON b.tutor_id = p.id
  WHERE b.created_at >= now() - interval '30 days'
  GROUP BY tutor_id, p.full_name
)
SELECT *
FROM tutor_stats
WHERE cancel_count >= 3 OR cancel_rate >= 30
ORDER BY cancel_count DESC;
```

### 4E. Repeat Booking Rate

```sql
-- % of clients with ≥2 bookings in last 30 days
WITH client_bookings AS (
  SELECT client_id, COUNT(*) AS booking_count
  FROM bookings
  WHERE status IN ('Confirmed','Completed')
    AND created_at >= now() - interval '30 days'
  GROUP BY client_id
)
SELECT
  COUNT(*) AS total_clients,
  COUNT(*) FILTER (WHERE booking_count >= 2) AS repeat_clients,
  ROUND(
    COUNT(*) FILTER (WHERE booking_count >= 2)::numeric / NULLIF(COUNT(*), 0) * 100
  , 1) AS repeat_rate_pct
FROM client_bookings;
```

### 4F. GMV Trend (90 days, weekly)

```sql
SELECT
  date_trunc('week', created_at)::date AS week,
  COUNT(*) AS bookings,
  COALESCE(SUM(amount_total) FILTER (WHERE payment_status = 'Paid'), 0)::numeric / 100
    AS gmv_pounds,
  COALESCE(SUM(amount_platform) FILTER (WHERE payment_status = 'Paid'), 0)::numeric / 100
    AS platform_revenue
FROM bookings
WHERE created_at >= now() - interval '90 days'
GROUP BY date_trunc('week', created_at)
ORDER BY week ASC;
```

---

## 5. Alert Triggers

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| `cancellation_spike` | `cancellation_rate_pct` > 15% for 7+ consecutive days | critical | Investigate top cancelling tutors + review reasons |
| `no_show_spike` | `no_show_rate_pct` > 8% in last 14 days | warning | Review no-show detection + consider automatic penalty |
| `scheduling_stall_high` | `stalled_over_48h` > 10 | warning | Trigger HITL task for each stalled booking |
| `refund_rate_high` | `refund_rate` > 12% of GMV | warning | Investigate cancellation reasons + refund abuse patterns |
| `payment_failure_elevated` | `payment_capture_rate` < 85% | warning | Check Stripe webhook health + pending payment resolution |
| `repeat_rate_low` | `repeat_booking_rate` < 20% in 30d | info | Signal to Retention Monitor — retention coaching opportunity |
| `high_cancelling_tutor` | Any tutor with cancel_rate > 30% AND count ≥ 3 | warning | Flag tutor for admin review — possible quality intervention |
| `dispute_escalation` | `disputed_count` > 3 in 7 days | critical | Admin review required — patterns may indicate policy issue |
| `gmv_declining` | GMV this week < 80% of 4-week average | critical | Cross-reference with supply/demand + referral funnel |

---

## 6. Database Table: `bookings_platform_metrics_daily`

**Migration: 360**

```sql
CREATE TABLE bookings_platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,

  -- Volume
  total_bookings_30d integer NOT NULL DEFAULT 0,
  confirmed_30d integer NOT NULL DEFAULT 0,
  completed_30d integer NOT NULL DEFAULT 0,
  cancelled_30d integer NOT NULL DEFAULT 0,
  no_show_30d integer NOT NULL DEFAULT 0,
  pending_unscheduled integer NOT NULL DEFAULT 0,

  -- Rates
  cancellation_rate_pct numeric(5,2),
  no_show_rate_pct numeric(5,2),
  scheduling_completion_rate numeric(5,2),
  payment_capture_rate numeric(5,2),
  repeat_booking_rate_pct numeric(5,2),

  -- Revenue
  gmv_30d_pence bigint NOT NULL DEFAULT 0,       -- stored in pence (×100)
  platform_revenue_30d_pence bigint NOT NULL DEFAULT 0,
  refunds_30d_pence bigint NOT NULL DEFAULT 0,
  avg_booking_value_pence integer,
  referral_gmv_pence bigint NOT NULL DEFAULT 0,
  referral_gmv_pct numeric(5,2),

  -- Scheduling
  avg_hours_to_schedule numeric(6,1),
  stalled_over_48h integer NOT NULL DEFAULT 0,
  stalled_over_7d integer NOT NULL DEFAULT 0,

  -- Risk
  disputed_count integer NOT NULL DEFAULT 0,
  high_cancel_tutors integer NOT NULL DEFAULT 0,  -- tutors flagged this day

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON bookings_platform_metrics_daily (metric_date DESC);

-- pg_cron: daily at 06:30 UTC (after marketplace at 06:00)
SELECT cron.schedule(
  'compute-bookings-platform-metrics',
  '30 6 * * *',
  $$SELECT compute_bookings_platform_metrics();$$
);
```

---

## 7. Admin Bookings Intelligence Panel

The existing `/admin/bookings` page gains an **Intelligence** panel at the top.

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  Bookings Intelligence                         Last 30 days ▾  [Export] │
├────────────────────────────────────────────────────────────────────────┤
│  Volume                   Rates                   Revenue               │
│  Confirmed:   234         Cancel:  9.2% ✓         GMV:       £47,820   │
│  Completed:   198         No-show: 3.1% ✓         Platform:  £4,782    │
│  Cancelled:   24          Repeat:  28%  ✓         Refunds:   £1,240    │
│  No-show:     7                                    Refund %:  2.6% ✓   │
├────────────────────────────────────────────────────────────────────────┤
│  Scheduling Pipeline                                                    │
│  Avg time to schedule: 5.2h   Stalled >48h: 3   Stalled >7d: 0       │
├────────────────────────────────────────────────────────────────────────┤
│  Risk Signals                                                           │
│  ⚠ 2 tutors with cancel rate >30% — view →                            │
│  ✓ No dispute escalations this week                                     │
│  ✓ GMV trend: +12% vs 4-week average                                   │
├────────────────────────────────────────────────────────────────────────┤
│  GMV Trend (90 days)                                                    │
│  [sparkline chart — weekly GMV + platform revenue]                      │
└────────────────────────────────────────────────────────────────────────┘
```

### TypeScript Interface

```typescript
interface BookingsIntelligenceResponse {
  volume: {
    confirmed_30d: number;
    completed_30d: number;
    cancelled_30d: number;
    no_show_30d: number;
    pending_unscheduled: number;
  };
  rates: {
    cancellation_rate_pct: number;
    no_show_rate_pct: number;
    repeat_booking_rate_pct: number;
    scheduling_completion_rate: number;
    payment_capture_rate: number;
  };
  revenue: {
    gmv_30d: number;               // £ (converted from pence)
    platform_revenue_30d: number;
    refunds_30d: number;
    refund_rate_pct: number;
    referral_gmv_pct: number;
    avg_booking_value: number;
  };
  scheduling: {
    avg_hours_to_schedule: number;
    stalled_over_48h: number;
    stalled_over_7d: number;
  };
  risk: {
    high_cancel_tutors: Array<{
      tutor_id: string;
      name: string;
      cancel_count: number;
      cancel_rate: number;
    }>;
    disputed_count: number;
  };
  alerts: BookingAlert[];
  trend: {
    gmv_weekly_90d: Array<{ week: string; gmv: number; platform_revenue: number }>;
    cancellation_rate_daily_30d: Array<{ date: string; rate: number }>;
  };
}
```

### API Endpoint

```typescript
GET /api/admin/bookings/intelligence

// Auth: admin only
// Reads from bookings_platform_metrics_daily (trend) + live queries (current snapshot)
```

---

## 8. Conductor Workflow Integration

### Existing: Booking Lifecycle Workflows (Human Tutor + AI Tutor)

Both workflows already exist in shadow mode (migrations 338+339). Phase 3 adds intelligence-driven trigger conditions on top of the existing lifecycle.

**Enhancement — Scheduling Stall Intervention:**

```
Existing Booking Lifecycle node: scheduling_unscheduled
  + NEW: if stalled >48h → Retention Monitor auto-raises HITL task
    "Booking [ID] unscheduled for >48h — client [name] waiting"
    Admin actions: [Message tutor] [Reassign] [Refund & cancel]
```

**Enhancement — High Cancellation Tutor Flag:**

```
Trigger: query_booking_health alert → high_cancelling_tutor
Step 1: Look up tutor profile + cancellation details
Step 2: HITL Task: "Tutor [name] — 4 cancellations, 41% rate in 30 days"
  Admin actions: [Send warning] [Suspend listings] [Schedule review call] [Dismiss]
Step 3: If admin selects "Suspend listings" → update listings.status = 'inactive'
Step 4: Log action to cas_agent_events
```

### New: GMV Decline Alert → Revenue Recovery

```
Trigger: Retention Monitor → gmv_declining alert (GMV < 80% of 4-week avg)
Step 1: Correlate with referral funnel (K coefficient trend), supply/demand gaps,
        marketplace search volume — identify root cause
Step 2: HITL Task: "GMV decline detected — [week] £X vs avg £Y"
  Include: root cause analysis (supply gap? referral drop? seasonal?)
  Admin actions: [Launch referral campaign] [Tutor recruitment push] [Dismiss]
```

### New: Recurring Booking — Retention Signal

Phase 3 addition — when a tutor/client pair completes 3+ sessions, the Booking Lifecycle workflow automatically:

1. Sends a "loyalty unlock" notification offering a recurring booking subscription
2. Logs the pair to `bookings_platform_metrics_daily.repeat_pairs` (for cohort retention analysis)
3. Notifies the Retention Monitor to include this pair in the repeat booking rate calculation

---

## 9. Growth Advisor — Booking Coaching

The user-facing Growth Advisor uses booking data for tutor/agent role users:

```
"Booking Performance" section (tutor/agent context):
  - Bookings this month vs last month (trend)
  - Cancellation rate (vs platform avg)
  - Avg time between bookings (frequency signal)
  - Repeat client rate (vs platform avg 28%)
  - Referral GMV (from bookings where agent_id = this user)

Growth Advisor coaching triggers:
  - If cancel_rate > platform avg + 10%: "Your cancellation rate is above average —
    here's how to reduce last-minute cancellations..."
  - If repeat_rate < 20%: "Only X% of your clients book again — here's how to
    increase retention..."
  - If referral_gmv > 0: "You've earned £X from referrals — here's how to grow
    your referral income further..."
```

---

## 10. Phase Plan

### Phase 3 — Conductor Integration (est. 22h)

| Task | Effort |
|------|--------|
| `bookings_platform_metrics_daily` table + migration 360 | 2h |
| `compute_bookings_platform_metrics()` pg_cron | 2h |
| `query_booking_health` tool in Retention Monitor agent | 4h |
| High-cancel tutor detection SQL + alert trigger | 2h |
| Admin Bookings Intelligence panel UI | 4h |
| `/api/admin/bookings/intelligence` API route | 2h |
| Scheduling Stall Intervention enhancement (existing workflow) | 2h |
| High Cancellation Tutor workflow | 2h |
| GMV Decline → Revenue Recovery workflow | 2h |

### Phase 4 — Growth Advisor + Advanced (est. 10h)

| Task | Effort |
|------|--------|
| Booking coaching in Growth Advisor skills | 3h |
| Recurring booking retention signal + loyalty unlock | 4h |
| Revenue forecasting (time-series, 4-week rolling) | 3h |

**Total: 32h**

---

## 11. Migration Summary

| Migration | Description |
|-----------|-------------|
| 360 | `bookings_platform_metrics_daily` table + `compute_bookings_platform_metrics()` function + pg_cron |

---

## 12. Full Migration Sequence (all specs)

| Migration | Spec | Description |
|-----------|------|-------------|
| 355 | CaaS | `caas_platform_metrics_daily` |
| 356 | Resources | `resources_platform_metrics_daily` |
| 357 | SEO | `seo_platform_metrics_daily` |
| 358 | Signal | `article_intelligence_scores` |
| 359 | Marketplace | `marketplace_platform_metrics_daily` + `marketplace_search_events` |
| 360 | Bookings | `bookings_platform_metrics_daily` |
| 361 | Listings | `listings_platform_metrics_daily` |
| 362 | Financials | `financials_platform_metrics_daily` |
| 363 | VirtualSpace | `virtualspace_platform_metrics_daily` |
| 364 | Referral | `referral_metrics_daily` |
| 365 | Referral | `referral_network_stats` materialized view |
