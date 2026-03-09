# VirtualSpace Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-08
**Status**: Draft — for review
**Author**: Architecture

Related: [`bookings-intelligence-spec.md`](./bookings-intelligence-spec.md) · [`conductor-solution-design-v3.md`](./conductor-solution-design-v3.md)

> **Role in the platform**: VirtualSpace is the session delivery layer — where the booked tuition actually happens. It is the direct quality-of-experience surface. Conductor intelligence here detects session failure patterns, adoption gaps, and free help engagement.

---

## 1. Purpose

VirtualSpace is the real-time collaborative workspace (whiteboard + video) where tutoring sessions are delivered. It operates in three modes: booking sessions (revenue-generating), standalone sessions (ad-hoc collaboration), and free help sessions (lead generation). Without Conductor intelligence, session drop-offs go undetected, the free-help-to-booking conversion funnel isn't measured, and whiteboard usage patterns that correlate with positive reviews aren't identified.

**Two outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| VirtualSpace session quality and adoption monitoring | Phase 3 | Market Intelligence Agent (Conductor) |
| Admin VirtualSpace intelligence panel | Phase 3 | `/admin/settings` or new `/admin/virtualspace` tab |

> Note: VirtualSpace has fewer critical business risks than Bookings or Financials. It is important for experience quality but does not have Conductor workflows of its own — it feeds intelligence to the Booking Lifecycle workflow (session delivery node) and the free help funnel.

---

## 2. VirtualSpace System Recap

### 2A. Session Types

```
virtualspace_sessions.session_type:
  'standalone'   — ad-hoc whiteboard room (invite link, no booking)
  'booking'      — tied to a confirmed booking (booking_id FK)
  'free_help'    — instant free session (lead generation)

virtualspace_sessions.status:
  'active'       — session in progress
  'completed'    — session ended normally
  'expired'      — timed out without participants

virtualspace_participants.role:
  'owner'        — session creator
  'collaborator' — joined participant
  'viewer'       — read-only
```

### 2B. Key Schema

```
virtualspace_sessions:
  id, session_type, booking_id (FK, nullable)
  owner_id, status
  title, description
  invite_token (for join URL)
  artifacts: { whiteboard_snapshot_url?, recording_url? }
  started_at, completed_at, expires_at
  participant_count
  created_at

virtualspace_participants:
  session_id, profile_id, role, joined_at, left_at
```

### 2C. Session Modes

- **Booking session**: created automatically when booking Confirmed and session_start_time approaches; linked via `booking_id`
- **Standalone**: created by any authenticated user via `/virtualspace` → invite link generated
- **Free Help**: created via presence system (`/api/presence/free-help/*`); tutor goes online, client requests help — instant session

### 2D. Key API Routes

- `POST /api/virtualspace/session` — create standalone
- `GET /api/virtualspace/sessions` — list sessions for user
- `GET/DELETE /api/virtualspace/[sessionId]` — manage session
- `POST /api/virtualspace/[sessionId]/complete` — end session
- `POST /api/virtualspace/[sessionId]/snapshot` — save whiteboard snapshot
- `POST /api/presence/free-help/online` — tutor goes available for free help
- `POST /api/sessions/create-free-help-session` — client requests free help

---

## 3. Market Intelligence Agent — VirtualSpace Tools

### Tool: `query_virtualspace_health`

```typescript
{
  "name": "query_virtualspace_health",
  "description": "Returns VirtualSpace session adoption, completion rates, free-help conversion funnel, and session quality signals",
  "parameters": {
    "days": { "type": "integer", "default": 30 }
  }
}
```

**Returns:**

```typescript
interface VirtualSpaceHealthResponse {
  adoption: {
    booking_sessions_30d: number;          // sessions tied to bookings
    standalone_sessions_30d: number;       // ad-hoc sessions
    free_help_sessions_30d: number;        // free help sessions
    unique_tutors_30d: number;             // tutors who used VirtualSpace
    adoption_rate: number;                 // tutors who used VS / total active tutors
  };
  session_quality: {
    completion_rate: number;               // completed / (completed + expired)
    avg_duration_minutes: number;          // avg completed session length
    avg_participants: number;
    with_whiteboard_snapshot: number;      // sessions that saved whiteboard
    whiteboard_adoption_rate: number;      // sessions with snapshot / total completed
    booking_vs_actual_match_rate: number;  // sessions that started near scheduled time
  };
  free_help: {
    free_help_sessions_30d: number;
    tutors_online_avg_daily: number;       // avg tutors available per day
    avg_wait_time_seconds: number;         // client wait for tutor
    conversion_to_booking_30d: number;    // free help sessions → booking within 14d
    conversion_rate: number;              // conversion_to_booking / free_help_sessions
    top_subjects: string[];
  };
  alerts: VirtualSpaceAlert[];
}

interface VirtualSpaceAlert {
  type: 'adoption_low' | 'completion_rate_low' | 'free_help_supply_thin'
      | 'conversion_rate_low' | 'booking_session_mismatch';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  action: string;
}
```

---

## 4. Key SQL

### 4A. Session Adoption and Completion

```sql
SELECT
  COUNT(*) FILTER (WHERE session_type = 'booking'
    AND created_at >= now() - interval '30 days')     AS booking_sessions_30d,
  COUNT(*) FILTER (WHERE session_type = 'standalone'
    AND created_at >= now() - interval '30 days')     AS standalone_sessions_30d,
  COUNT(*) FILTER (WHERE session_type = 'free_help'
    AND created_at >= now() - interval '30 days')     AS free_help_sessions_30d,
  COUNT(DISTINCT owner_id) FILTER (
    WHERE created_at >= now() - interval '30 days')   AS unique_tutors_30d,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'completed')::numeric /
    NULLIF(COUNT(*) FILTER (WHERE status IN ('completed', 'expired')), 0) * 100
  , 1) AS completion_rate_pct,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60)
    FILTER (WHERE status = 'completed' AND started_at IS NOT NULL)
  , 1) AS avg_duration_minutes,
  ROUND(
    COUNT(*) FILTER (
      WHERE status = 'completed'
      AND (artifacts->>'whiteboard_snapshot_url') IS NOT NULL
    )::numeric /
    NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0) * 100
  , 1) AS whiteboard_adoption_pct
FROM virtualspace_sessions
WHERE created_at >= now() - interval '30 days';
```

### 4B. Free Help Conversion Funnel

```sql
-- Free help sessions that led to a booking within 14 days
WITH free_help AS (
  SELECT
    vs.id AS session_id,
    vp.profile_id AS client_id,
    vs.completed_at
  FROM virtualspace_sessions vs
  JOIN virtualspace_participants vp ON vp.session_id = vs.id
  WHERE vs.session_type = 'free_help'
    AND vs.status = 'completed'
    AND vp.role = 'collaborator'    -- the client (not the owner/tutor)
    AND vs.created_at >= now() - interval '30 days'
)
SELECT
  COUNT(*) AS free_help_sessions,
  COUNT(b.id) AS converted_to_booking,
  ROUND(COUNT(b.id)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS conversion_rate_pct
FROM free_help fh
LEFT JOIN bookings b
  ON b.client_id = fh.client_id
  AND b.created_at BETWEEN fh.completed_at AND fh.completed_at + interval '14 days'
  AND b.status IN ('Confirmed', 'Completed');
```

### 4C. Booking Session — Schedule Match Rate

```sql
-- Sessions that started within 30 minutes of their booking's session_start_time
SELECT
  COUNT(*) AS booking_sessions,
  COUNT(*) FILTER (
    WHERE ABS(EXTRACT(EPOCH FROM
      (vs.started_at - b.session_start_time))) <= 1800  -- 30 min tolerance
  ) AS on_time_sessions,
  ROUND(
    COUNT(*) FILTER (
      WHERE ABS(EXTRACT(EPOCH FROM
        (vs.started_at - b.session_start_time))) <= 1800
    )::numeric / NULLIF(COUNT(*), 0) * 100
  , 1) AS on_time_rate_pct
FROM virtualspace_sessions vs
JOIN bookings b ON vs.booking_id = b.id
WHERE vs.session_type = 'booking'
  AND vs.status = 'completed'
  AND vs.started_at IS NOT NULL
  AND b.session_start_time IS NOT NULL
  AND vs.created_at >= now() - interval '30 days';
```

---

## 5. Alert Triggers

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| `adoption_low` | `adoption_rate` < 50% (fewer than half of active tutors use VirtualSpace for bookings) | warning | Review booking-to-VirtualSpace linking; prompt tutors to use VirtualSpace |
| `completion_rate_low` | `completion_rate` < 80% | warning | Investigate session dropout — connection issues or UX problems |
| `free_help_supply_thin` | `tutors_online_avg_daily` < 3 for 7+ days | info | Encourage tutors to activate free help availability |
| `conversion_rate_low` | `conversion_rate` < 10% on free help sessions | info | Review free help matching quality — wrong subject pairing? |
| `booking_session_mismatch` | `booking_vs_actual_match_rate` < 70% | warning | Sessions not starting on time — scheduling issue or notification gap |

---

## 6. Database Table: `virtualspace_platform_metrics_daily`

**Migration: 363**

```sql
CREATE TABLE virtualspace_platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,

  -- Adoption
  booking_sessions_30d integer NOT NULL DEFAULT 0,
  standalone_sessions_30d integer NOT NULL DEFAULT 0,
  free_help_sessions_30d integer NOT NULL DEFAULT 0,
  unique_tutors_30d integer NOT NULL DEFAULT 0,
  adoption_rate_pct numeric(5,2),

  -- Quality
  completion_rate_pct numeric(5,2),
  avg_duration_minutes numeric(6,1),
  whiteboard_adoption_pct numeric(5,2),
  on_time_rate_pct numeric(5,2),

  -- Free help funnel
  free_help_completed_30d integer NOT NULL DEFAULT 0,
  free_help_converted_30d integer NOT NULL DEFAULT 0,
  free_help_conversion_rate_pct numeric(5,2),
  tutors_online_avg_daily numeric(4,1),

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON virtualspace_platform_metrics_daily (metric_date DESC);

-- pg_cron: daily at 08:00 UTC
SELECT cron.schedule(
  'compute-virtualspace-platform-metrics',
  '0 8 * * *',
  $$SELECT compute_virtualspace_platform_metrics();$$
);
```

---

## 7. Admin VirtualSpace Intelligence

A lightweight intelligence summary integrated into `/admin/settings` (or a new `/admin/virtualspace` admin page if warranted in Phase 3).

```
┌────────────────────────────────────────────────────────────────────┐
│  VirtualSpace Intelligence                    Last 30 days ▾       │
├────────────────────────────────────────────────────────────────────┤
│  Session Adoption              Session Quality                      │
│  Booking sessions:  423        Completion:    94.2% ✓              │
│  Standalone:         89        Avg duration:  47 min               │
│  Free help:          34        Whiteboard:    61.3% ✓              │
│  Tutor adoption:    74% ✓      On-time start: 82.1% ✓             │
├────────────────────────────────────────────────────────────────────┤
│  Free Help Funnel                                                   │
│  Sessions: 34   Converted to booking: 6   Rate: 17.6%  ✓          │
│  Avg tutors online/day: 4.2 ✓                                      │
├────────────────────────────────────────────────────────────────────┤
│  ✓ All signals healthy — no active alerts                          │
└────────────────────────────────────────────────────────────────────┘
```

---

## 8. Conductor Workflow Integration

VirtualSpace does not have its own dedicated Conductor workflows but integrates with two existing ones:

### Booking Lifecycle — Session Delivery Node

The existing Booking Lifecycle workflow (shadow mode) has a `session_delivered` node triggered by the `complete-sessions` cron. Enhancement:

```
On session_delivered:
  Step 1: Check if booking had a virtualspace_session (booking_id FK)
    ↓ No session → flag as "session delivered without VirtualSpace"
       Log to booking_lifecycle_execution context for pattern analysis
    ↓ Yes session → check completion_rate, duration, whiteboard_snapshot
  Step 2: If duration < 10 minutes (likely drop-off):
    HITL advisory: "Short session detected — may indicate technical issue"
    Admin action: [Mark as normal] [Flag for tutor contact] [Issue partial refund]
  Step 3: Trigger review request notification (existing behaviour)
```

### Free Help Conversion Tracking

When a free help session completes (`POST /api/virtualspace/[sessionId]/complete` with `session_type='free_help'`), store the `(tutor_id, client_id, completed_at)` tuple in a lightweight conversion tracking log. The Market Intelligence agent's `query_virtualspace_health` uses this to compute the 14-day booking conversion rate.

---

## 9. Growth Advisor — VirtualSpace Coaching

```
"Session Delivery" section (tutor context):
  - VirtualSpace sessions this month (adoption signal)
  - Avg session duration vs platform avg (47 min)
  - Whiteboard usage rate (vs platform avg 61%)
  - Free help sessions offered (lead generation)
  - Free help → booking conversion (if applicable)

Growth Advisor coaching:
  - If adoption_rate = 0: "You haven't used VirtualSpace yet — clients who see
    whiteboard snapshots re-book 2x more often..."
  - If whiteboard_adoption < 30%: "Try saving a whiteboard snapshot at end of session —
    clients receive it as a learning artefact..."
  - If no free_help sessions: "Offering free help builds trust and converts new clients —
    [Activate free help availability]"
```

---

## 10. Phase Plan

### Phase 3 — Conductor Integration (est. 14h)

| Task | Effort |
|------|--------|
| `virtualspace_platform_metrics_daily` + migration 363 | 2h |
| `compute_virtualspace_platform_metrics()` pg_cron | 2h |
| `query_virtualspace_health` tool in Market Intelligence | 3h |
| Free help conversion tracking log (append to session complete) | 1h |
| Admin VirtualSpace Intelligence panel UI | 3h |
| `/api/admin/virtualspace/intelligence` API route | 1h |
| Booking Lifecycle session delivery enhancement (short session flag) | 2h |

### Phase 4 — Growth Advisor (est. 4h)

| Task | Effort |
|------|--------|
| VirtualSpace coaching in Growth Advisor skills | 2h |
| VirtualSpace metrics in Growth Advisor context hydration | 2h |

**Total: 18h**

---

## 11. Migration Summary

| Migration | Description |
|-----------|-------------|
| 363 | `virtualspace_platform_metrics_daily` table + `compute_virtualspace_platform_metrics()` function + pg_cron |

---

## 12. Full Platform Migration Sequence (all 11 intelligence specs)

| Migration | Spec | Table Created |
|-----------|------|---------------|
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
| 365 | Referral | `referral_network_stats` (materialized view) |

**pg_cron schedule (all metrics, UTC):**

| Time | Job |
|------|-----|
| 04:30 | Resources platform metrics |
| 05:00 | SEO platform metrics |
| 05:30 | CaaS platform metrics |
| 06:00 | Marketplace platform metrics |
| 06:30 | Bookings platform metrics |
| 07:00 | Listings platform metrics |
| 07:30 | Financials platform metrics |
| 08:00 | VirtualSpace platform metrics |
| 09:00 | Referral metrics daily (migration 364 — from referral spec) |
