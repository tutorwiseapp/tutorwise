# User Onboarding Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-12
**Status**: Draft — for review
**Author**: Architecture

Related: [`retention-intelligence-spec.md`](./retention-intelligence-spec.md) · [`gtm-intelligence-spec.md`](./gtm-intelligence-spec.md) · [`caas-intelligence-spec.md`](./caas-intelligence-spec.md) · [`org-conversion-intelligence-spec.md`](./org-conversion-intelligence-spec.md) · [`conductor-solution-design.md`](./conductor-solution-design.md)

> **Role in the platform**: GTM acquires users. Retention keeps them. Onboarding is the bridge between the two — and it's where the highest-leverage drop-off happens. Every user who completes signup but never reaches their first booking is acquisition spend wasted. This spec defines how Conductor monitors the signup → activation funnel for all four user roles, detects friction points before they become churn, and triggers the right intervention at the right stage.

---

## 1. Purpose

The platform has 14 intelligence specs covering every stage from content creation to financial reconciliation. None of them systematically tracks what happens between signup and first value delivery. The Retention spec picks up users at the "Onboarding" cohort level (0 completed bookings), but treats it as a single state — it doesn't decompose the onboarding funnel into its constituent stages or measure where users drop off.

Without Onboarding Intelligence:
- A tutor who completes signup but never creates a listing is invisible until they enter the Retention "stuck_tutors_14d" bucket — 14 days too late
- A client who verifies their email but abandons role selection has no nudge path
- An agent who signs up but never connects a tutor falls through every existing metric
- The Tutor Approval workflow (pending → under_review → active) has no aggregate funnel visibility — individual approvals are tracked, but conversion rates across the pipeline are not

**Three outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| Onboarding funnel monitoring by role (signup → activation) | Phase 3 | Operations Monitor Agent (Conductor) |
| Admin Onboarding Intelligence panel | Phase 3 | Conductor Intelligence tab |
| Onboarding health daily metrics (pg_cron) | Phase 3 | `onboarding_platform_metrics_daily` |

---

## 2. The Onboarding Funnel — Six Stages

Every user passes through six stages from signup to activation. Each role has role-specific criteria at stages 3–5.

```
ONBOARDING FUNNEL (all roles)

  Signup ──► Verified ──► Role Selected ──► Profile Complete ──► Value Setup ──► Activated
    │           │              │                  │                   │              │
  auth.users  email_verified  primary_role      onboarding_        Role-specific  1st booking
  created     = true          IS NOT NULL        sessions.          action         completed
                                                 completed_at       completed      (tutor:
                                                 IS NOT NULL                        session
                                                                                    delivered)
```

### Stage Definitions by Role

| Stage | Tutor | Client | Agent | Organisation |
|-------|-------|--------|-------|-------------|
| **1. Signup** | `profiles.created_at` exists | Same | Same | Same |
| **2. Verified** | `email_verified = true` | Same | Same | Same |
| **3. Role Selected** | `primary_role = 'tutor'` | `primary_role = 'student'` | `primary_role = 'agent'` | `primary_role = 'organisation'` |
| **4. Profile Complete** | `onboarding_sessions.completed_at IS NOT NULL` for role | Same | Same | Same |
| **5. Value Setup** | ≥1 active listing with completeness ≥ 60% | ≥1 subject preference saved | ≥1 tutor connected (manages) | ≥1 member added to org |
| **6. Activated** | 1st completed booking (as tutor) | 1st completed booking (as client) | 1st referred signup made a booking | ≥1 member with completed booking |

### Tutor Approval Sub-Funnel (Stage 4→5)

Tutors have an additional approval gate between profile completion and value setup:

```
Profile Complete ──► Pending ──► Under Review ──► Approved ──► First Listing
                      │              │                │
                    status=         CaaS scoring      status=        listing
                    'pending'       + admin review    'active'       created
                                    (HITL gate)
                         │
                         └──► Rejected (status='rejected')
```

This sub-funnel is tracked by the existing Tutor Approval workflow (`workflow_executions` with `target_entity_type = 'profile'`), but aggregate conversion rates and median approval times are not currently surfaced.

---

## 3. Data Sources (All Existing)

No new tables are required for stage detection. All stages are derivable from existing data:

| Stage | Data Source | Table | Key Column(s) |
|-------|-----------|-------|---------------|
| Signup | Profile creation trigger | `profiles` | `created_at` |
| Verified | Auth verification | `profiles` | `email_verified`, `phone_verified` |
| Role Selected | Onboarding flow | `profiles` | `primary_role` |
| Profile Complete | Onboarding session | `onboarding_sessions` | `completed_at`, `current_step` |
| Value Setup (tutor) | Listing creation | `listings` | `status = 'active'`, `compute_listing_completeness_score()` |
| Value Setup (client) | Subject preferences | `role_details` | `subjects IS NOT NULL` |
| Value Setup (agent) | Tutor management | `listings` | `agent_id = profile.id` |
| Value Setup (org) | Org membership | `profiles` | `organisation_id IS NOT NULL` (count members) |
| Activated | First booking | `bookings` | `status = 'Completed'`, `completed_at` |
| Approval pipeline | Tutor Approval | `profiles` | `status` ('pending'/'under_review'/'active'/'rejected') |
| Approval timing | Workflow execution | `workflow_executions` | `target_entity_id`, `started_at`, `completed_at` |

### Additional Signal Sources

| Signal | Source | Purpose |
|--------|--------|---------|
| Onboarding session abandonment | `onboarding_sessions.last_active` vs `now()` | Detect users who started but stalled mid-flow |
| Growth Score at signup | `growth_scores` | Baseline quality signal; low initial scores predict drop-off |
| First Login Modal engagement | `FirstLoginModal.tsx` GA event | "Start Setup" vs "Skip" predicts activation |
| Nudge response | `platform_notifications.read_at` | Whether nudges drive completion |
| Listing completeness | `compute_listing_completeness_score()` | Tutors with low-completeness listings rarely get bookings |

---

## 4. Operations Monitor Agent — Onboarding Tool

### Tool: `query_onboarding_health`

```typescript
{
  "name": "query_onboarding_health",
  "description": "Returns onboarding funnel conversion rates by role, stage drop-off points, approval pipeline metrics, and time-to-activation distributions",
  "parameters": {
    "days": { "type": "integer", "default": 30 },
    "role": { "type": "string", "enum": ["tutor", "client", "agent", "organisation", "all"], "default": "all" }
  }
}
```

**Returns:**

```typescript
interface OnboardingHealthResponse {
  period_days: number;

  funnel: {
    tutor: FunnelBreakdown;
    client: FunnelBreakdown;
    agent: FunnelBreakdown;
    organisation: FunnelBreakdown;
  };

  approval_pipeline: {
    pending_count: number;
    under_review_count: number;
    approved_count_period: number;
    rejected_count_period: number;
    median_approval_hours: number;
    p95_approval_hours: number;
    oldest_pending_hours: number;
  };

  time_to_activate: {
    tutor_median_days: number;
    client_median_days: number;
    agent_median_days: number;
    org_median_days: number;
  };

  abandonment: {
    mid_onboarding_count: number;      // started session but inactive > 3d
    post_onboarding_no_setup: number;  // completed onboarding but no Value Setup action in 7d
    verified_no_role: number;          // verified email but never selected role
  };

  stalls: StallBreakdown[];

  alerts: OnboardingAlert[];
}

interface FunnelBreakdown {
  signups: number;
  verified: number;
  verified_pct: number;              // verified / signups
  role_selected: number;
  role_selected_pct: number;         // role_selected / verified
  profile_complete: number;
  profile_complete_pct: number;      // profile_complete / role_selected
  value_setup: number;
  value_setup_pct: number;           // value_setup / profile_complete
  activated: number;
  activated_pct: number;             // activated / value_setup
  overall_conversion_pct: number;    // activated / signups
}

interface StallBreakdown {
  stage: 'verified' | 'role_selected' | 'profile_complete' | 'value_setup';
  role: 'tutor' | 'client' | 'agent' | 'organisation';
  count: number;
  median_days_stuck: number;
}

interface OnboardingAlert {
  type: 'funnel_drop' | 'approval_bottleneck' | 'activation_low'
      | 'abandonment_spike' | 'stall_threshold' | 'approval_slow';
  severity: 'info' | 'warning' | 'critical';
  role?: 'tutor' | 'client' | 'agent' | 'organisation';
  message: string;
  action: string;
}
```

---

## 5. Key SQL

### 5A. Funnel Breakdown — Tutors (Last N Days)

```sql
WITH tutor_signups AS (
  SELECT
    p.id,
    p.created_at,
    p.email_verified,
    p.primary_role,
    p.status,
    os.completed_at AS onboarding_completed_at,
    os.last_active AS onboarding_last_active,
    os.current_step
  FROM profiles p
  LEFT JOIN onboarding_sessions os ON os.profile_id = p.id AND os.role_type = 'tutor'
  WHERE p.created_at >= now() - interval '30 days'
    AND (p.primary_role = 'tutor' OR p.primary_role IS NULL)
),
tutor_listings AS (
  SELECT
    l.user_id,
    COUNT(*) FILTER (WHERE l.status = 'active') AS active_listings,
    MAX(compute_listing_completeness_score(l.id)) AS max_completeness
  FROM listings l
  WHERE l.user_id IN (SELECT id FROM tutor_signups)
  GROUP BY l.user_id
),
tutor_bookings AS (
  SELECT
    b.tutor_id,
    MIN(b.completed_at) AS first_booking_at
  FROM bookings b
  WHERE b.tutor_id IN (SELECT id FROM tutor_signups)
    AND b.status = 'Completed'
  GROUP BY b.tutor_id
)
SELECT
  COUNT(*) AS signups,
  COUNT(*) FILTER (WHERE ts.email_verified = true) AS verified,
  COUNT(*) FILTER (WHERE ts.primary_role = 'tutor') AS role_selected,
  COUNT(*) FILTER (WHERE ts.onboarding_completed_at IS NOT NULL) AS profile_complete,
  COUNT(*) FILTER (
    WHERE tl.active_listings >= 1 AND tl.max_completeness >= 60
  ) AS value_setup,
  COUNT(*) FILTER (WHERE tb.first_booking_at IS NOT NULL) AS activated
FROM tutor_signups ts
LEFT JOIN tutor_listings tl ON tl.user_id = ts.id
LEFT JOIN tutor_bookings tb ON tb.tutor_id = ts.id;
```

### 5B. Funnel Breakdown — Clients (Last N Days)

```sql
WITH client_signups AS (
  SELECT
    p.id,
    p.created_at,
    p.email_verified,
    p.primary_role,
    os.completed_at AS onboarding_completed_at
  FROM profiles p
  LEFT JOIN onboarding_sessions os ON os.profile_id = p.id AND os.role_type = 'student'
  WHERE p.created_at >= now() - interval '30 days'
    AND (p.primary_role = 'student' OR p.primary_role IS NULL)
),
client_prefs AS (
  SELECT rd.profile_id
  FROM role_details rd
  WHERE rd.role_type = 'student'
    AND rd.subjects IS NOT NULL
    AND rd.profile_id IN (SELECT id FROM client_signups)
),
client_bookings AS (
  SELECT
    b.client_id,
    MIN(b.completed_at) AS first_booking_at
  FROM bookings b
  WHERE b.client_id IN (SELECT id FROM client_signups)
    AND b.status = 'Completed'
  GROUP BY b.client_id
)
SELECT
  COUNT(*) AS signups,
  COUNT(*) FILTER (WHERE cs.email_verified = true) AS verified,
  COUNT(*) FILTER (WHERE cs.primary_role = 'student') AS role_selected,
  COUNT(*) FILTER (WHERE cs.onboarding_completed_at IS NOT NULL) AS profile_complete,
  COUNT(*) FILTER (WHERE cp.profile_id IS NOT NULL) AS value_setup,
  COUNT(*) FILTER (WHERE cb.first_booking_at IS NOT NULL) AS activated
FROM client_signups cs
LEFT JOIN client_prefs cp ON cp.profile_id = cs.id
LEFT JOIN client_bookings cb ON cb.client_id = cs.id;
```

### 5C. Tutor Approval Pipeline Metrics

```sql
-- Current pipeline state
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
  COUNT(*) FILTER (WHERE status = 'under_review') AS under_review_count,
  COUNT(*) FILTER (
    WHERE status = 'active'
      AND updated_at >= now() - interval '30 days'
  ) AS approved_30d,
  COUNT(*) FILTER (
    WHERE status = 'rejected'
      AND updated_at >= now() - interval '30 days'
  ) AS rejected_30d
FROM profiles
WHERE primary_role = 'tutor';

-- Approval timing from workflow executions
SELECT
  PERCENTILE_CONT(0.5) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (we.completed_at - we.started_at)) / 3600
  ) AS median_hours,
  PERCENTILE_CONT(0.95) WITHIN GROUP (
    ORDER BY EXTRACT(EPOCH FROM (we.completed_at - we.started_at)) / 3600
  ) AS p95_hours,
  MAX(EXTRACT(EPOCH FROM (now() - we.started_at)) / 3600)
    FILTER (WHERE we.status = 'running' OR we.status = 'paused') AS oldest_pending_hours
FROM workflow_executions we
JOIN workflow_processes wp ON wp.id = we.process_id
WHERE wp.name ILIKE '%tutor%approval%'
  AND we.started_at >= now() - interval '30 days';
```

### 5D. Time-to-Activation Distribution

```sql
-- Median days from signup to first completed booking
WITH activation_times AS (
  SELECT
    p.primary_role,
    EXTRACT(EPOCH FROM (MIN(b.completed_at) - p.created_at)) / 86400 AS days_to_activate
  FROM profiles p
  JOIN bookings b
    ON (b.tutor_id = p.id OR b.client_id = p.id)
    AND b.status = 'Completed'
  WHERE p.created_at >= now() - interval '90 days'
    AND p.primary_role IN ('tutor', 'student', 'agent')
  GROUP BY p.id, p.primary_role, p.created_at
)
SELECT
  primary_role,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_activate) AS median_days,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY days_to_activate) AS p90_days,
  COUNT(*) AS activated_count
FROM activation_times
GROUP BY primary_role;
```

### 5E. Abandonment Detection

```sql
-- Users who started onboarding but went inactive > 3 days (mid-flow)
SELECT
  os.role_type,
  COUNT(*) AS mid_onboarding_abandoned,
  AVG(EXTRACT(EPOCH FROM (now() - os.last_active)) / 86400) AS avg_days_inactive
FROM onboarding_sessions os
WHERE os.completed_at IS NULL
  AND os.current_step > 0
  AND os.last_active < now() - interval '3 days'
GROUP BY os.role_type;

-- Verified but never selected a role (> 7 days)
SELECT COUNT(*) AS verified_no_role
FROM profiles
WHERE email_verified = true
  AND primary_role IS NULL
  AND created_at < now() - interval '7 days';

-- Completed onboarding but no Value Setup action in 7 days
WITH completed_no_setup AS (
  SELECT p.id, p.primary_role
  FROM profiles p
  JOIN onboarding_sessions os ON os.profile_id = p.id
  WHERE os.completed_at IS NOT NULL
    AND os.completed_at < now() - interval '7 days'
    AND p.primary_role = 'tutor'
  EXCEPT
  SELECT l.user_id, 'tutor'
  FROM listings l
  WHERE l.status = 'active'
)
SELECT COUNT(*) AS post_onboarding_no_setup
FROM completed_no_setup;
```

### 5F. Stage-Specific Stall Detection

```sql
-- Users stuck at each stage beyond expected thresholds
-- Verified but no role (> 2 days)
SELECT 'verified' AS stage, COUNT(*) AS count,
  AVG(EXTRACT(EPOCH FROM (now() - created_at)) / 86400) AS avg_days
FROM profiles
WHERE email_verified = true AND primary_role IS NULL
  AND created_at < now() - interval '2 days';

-- Role selected but onboarding not complete (> 5 days)
-- (UNION ALL with similar queries for each stage/role)
```

---

## 6. Alert Triggers

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| `funnel_drop` | Any stage-to-stage conversion drops > 15% week-over-week | warning | Investigate UX at drop-off stage; check for broken forms or confusing copy |
| `approval_bottleneck` | `pending_count + under_review_count` > 20 | warning | Review Tutor Approval queue; consider temporary auto-approve for high CaaS scores |
| `approval_slow` | `median_approval_hours` > 48 OR `oldest_pending_hours` > 72 | critical | Immediate admin queue review; SLA breach |
| `activation_low` | `overall_conversion_pct` < 25% for any role in 30d | warning | Review full funnel; identify biggest drop-off stage |
| `abandonment_spike` | `mid_onboarding_count` increases > 30% week-over-week | warning | Check for UX regressions; review onboarding session step where abandonment concentrates |
| `stall_threshold` | > 50 users stuck at any single stage for > 7 days | critical | Stage-specific intervention: nudge sequence, UX review, or admin outreach |

---

## 7. Database Table: `onboarding_platform_metrics_daily`

**Migration: 387**

```sql
CREATE TABLE onboarding_platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,

  -- Tutor funnel (cumulative counts for the period ending on metric_date)
  tutor_signups_30d integer NOT NULL DEFAULT 0,
  tutor_verified_30d integer NOT NULL DEFAULT 0,
  tutor_role_selected_30d integer NOT NULL DEFAULT 0,
  tutor_profile_complete_30d integer NOT NULL DEFAULT 0,
  tutor_value_setup_30d integer NOT NULL DEFAULT 0,
  tutor_activated_30d integer NOT NULL DEFAULT 0,
  tutor_conversion_pct numeric(5,2),           -- activated / signups

  -- Client funnel
  client_signups_30d integer NOT NULL DEFAULT 0,
  client_verified_30d integer NOT NULL DEFAULT 0,
  client_role_selected_30d integer NOT NULL DEFAULT 0,
  client_profile_complete_30d integer NOT NULL DEFAULT 0,
  client_value_setup_30d integer NOT NULL DEFAULT 0,
  client_activated_30d integer NOT NULL DEFAULT 0,
  client_conversion_pct numeric(5,2),

  -- Agent funnel
  agent_signups_30d integer NOT NULL DEFAULT 0,
  agent_verified_30d integer NOT NULL DEFAULT 0,
  agent_role_selected_30d integer NOT NULL DEFAULT 0,
  agent_profile_complete_30d integer NOT NULL DEFAULT 0,
  agent_value_setup_30d integer NOT NULL DEFAULT 0,
  agent_activated_30d integer NOT NULL DEFAULT 0,
  agent_conversion_pct numeric(5,2),

  -- Organisation funnel
  org_signups_30d integer NOT NULL DEFAULT 0,
  org_verified_30d integer NOT NULL DEFAULT 0,
  org_role_selected_30d integer NOT NULL DEFAULT 0,
  org_profile_complete_30d integer NOT NULL DEFAULT 0,
  org_value_setup_30d integer NOT NULL DEFAULT 0,
  org_activated_30d integer NOT NULL DEFAULT 0,
  org_conversion_pct numeric(5,2),

  -- Tutor approval pipeline (point-in-time snapshot)
  approval_pending integer NOT NULL DEFAULT 0,
  approval_under_review integer NOT NULL DEFAULT 0,
  approval_approved_30d integer NOT NULL DEFAULT 0,
  approval_rejected_30d integer NOT NULL DEFAULT 0,
  approval_median_hours numeric(8,2),
  approval_p95_hours numeric(8,2),

  -- Time-to-activation (medians in days, 90-day lookback)
  tutor_time_to_activate_median_days numeric(6,2),
  client_time_to_activate_median_days numeric(6,2),
  agent_time_to_activate_median_days numeric(6,2),

  -- Abandonment (point-in-time)
  mid_onboarding_abandoned integer NOT NULL DEFAULT 0,
  post_onboarding_no_setup integer NOT NULL DEFAULT 0,
  verified_no_role integer NOT NULL DEFAULT 0,

  -- Biggest drop-off (computed: stage with largest absolute drop per role)
  tutor_biggest_dropoff_stage text,   -- e.g. 'value_setup'
  client_biggest_dropoff_stage text,
  agent_biggest_dropoff_stage text,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON onboarding_platform_metrics_daily (metric_date DESC);

-- pg_cron: daily at 04:00 UTC (before other intelligence crons)
SELECT cron.schedule(
  'compute-onboarding-platform-metrics',
  '0 4 * * *',
  $$SELECT compute_onboarding_platform_metrics();$$
);
```

> **Scheduling note**: 04:00 UTC runs before the earliest existing intelligence cron (resources at 04:30). Onboarding metrics feed into the Operations AI brief context, so they should be ready before the brief is generated.

---

## 8. Admin Onboarding Intelligence Panel

New sub-tab `'onboarding'` in the Conductor Intelligence tab (`IntelligencePanel.tsx`).

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Onboarding Intelligence                              Last 30 days ▾    │
├──────────────────────────────────────────────────────────────────────────┤
│  Conversion Funnel                                                       │
│                Signup → Verified → Role → Profile → Setup → Activated   │
│  Tutors          142      138       131      98       72       41       │
│                        97.2%     94.9%    74.8%    73.5%    56.9%      │
│  Clients          89       87        85      79       68       52       │
│                        97.8%     97.7%    92.9%    86.1%    76.5%      │
│  Agents           23       22        20      17       11        5       │
│                        95.7%     90.9%    85.0%    64.7%    45.5%      │
│  Orgs              4        4         4       3        2        1       │
│                       100.0%    100.0%   75.0%    66.7%    50.0%      │
│                                                                          │
│  ⚠ Tutor biggest drop-off: Profile → Value Setup (25.2% drop)          │
│  ⚠ Agent biggest drop-off: Value Setup → Activated (35.3% drop)        │
├──────────────────────────────────────────────────────────────────────────┤
│  Tutor Approval Pipeline                                                 │
│  Pending: 8    Under Review: 3    Approved (30d): 41    Rejected: 7    │
│  Median approval: 18.4h    P95: 52.1h    Oldest pending: 36h          │
│                                                                          │
│  ✓ Approval SLA on target (< 48h median)                                │
├──────────────────────────────────────────────────────────────────────────┤
│  Time to Activation (median)                                             │
│  Tutors: 12.3 days    Clients: 4.1 days    Agents: 21.7 days          │
├──────────────────────────────────────────────────────────────────────────┤
│  Abandonment Signals                                                     │
│  Mid-onboarding stalled (>3d): 14                                       │
│  Completed but no setup (>7d): 9                                        │
│  Verified but no role (>7d): 6                                          │
│                                                                          │
│  Total at-risk: 29 users — [View list] [Trigger nudge batch]           │
├──────────────────────────────────────────────────────────────────────────┤
│  ⚠ 14 users stalled mid-onboarding (up 22% from last week)             │
│  ⚠ Agent activation rate below 50% threshold                            │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Conductor Workflow Integration

### 9A. Onboarding Stall Nudge Sequence

```
Trigger: onboarding_sessions.last_active < now() - 3 days AND completed_at IS NULL
Cooldown: 7 days via workflow_entity_cooldowns (type: 'onboarding_stall_nudge')

Step 1: Classify stall stage (which step did user stop at?)
Step 2: Send stage-specific notification:
  Step 1 (verification): "Verify your email to continue — check your inbox"
  Step 2 (role selection): "Choose your role to unlock your dashboard"
  Step 3-4 (profile details): "You're almost there — 2 more steps to complete your profile"
  Step 5 (availability/preferences): "Last step — set your [availability/preferences]"
Step 3: If no action after 7 more days → mark session for cleanup
Step 4: Log to platform_events (onboarding.stall_nudge)
```

### 9B. Post-Onboarding Activation Nudge

```
Trigger: onboarding_sessions.completed_at < now() - 7 days AND no Value Setup action
Cooldown: 14 days via workflow_entity_cooldowns

Tutor path:
  Step 1: "Create your first listing — tutors with listings get bookings 5x faster"
  Step 2 (Day 14): If still no listing → Growth Agent proactive session offered
  Step 3 (Day 21): HITL advisory: "Onboarding complete but inactive — [N] tutors"
    Admin actions: [Send personal outreach] [Offer listing boost] [Review UX]

Client path:
  Step 1: "Find your perfect tutor — browse [N] tutors matching your subjects"
  Step 2 (Day 10): "Still looking? Try our AI tutor for instant help — free trial"

Agent path:
  Step 1: "Connect your first tutor to start earning referral commissions"
  Step 2 (Day 14): HITL advisory — admin outreach
```

### 9C. Approval SLA Breach Escalation

```
Trigger: workflow_executions with Tutor Approval process, status IN ('running', 'paused'),
         started_at < now() - interval '48 hours'

Step 1: Write exception (source: 'hitl_timeout', severity: 'high',
        title: 'Tutor Approval SLA breach — [name] pending [N]h')
Step 2: Send admin notification with direct link to approval queue
Step 3: If > 72h → escalate to critical severity
```

### 9D. Funnel Drop Alert Workflow

```
Trigger: daily cron detects any stage conversion dropped > 15% vs 7-day rolling avg

Step 1: Identify which role + stage has the drop
Step 2: Classify likely cause:
  - Verification drop → check email provider deliverability
  - Role selection drop → check for UX regression (deploy correlation)
  - Profile complete drop → check for form validation errors
  - Value setup drop → check listing creation flow
  - Activation drop → check booking availability / marketplace health
Step 3: Write exception (source: 'workflow_failure', severity: 'warning',
        title: 'Onboarding funnel drop: [role] [stage] down [X]%')
Step 4: Surface in Operations exceptions queue
```

---

## 10. Relationship to Existing Specs

### What Changes in Retention Spec

The Retention spec currently defines "Onboarding" as a single cohort (0 completed bookings). With this spec:
- Retention's "Onboarding" cohort is equivalent to stages 1–5 combined (pre-activation)
- `stuck_tutors_14d` and `stuck_clients_14d` in `retention_platform_metrics_daily` remain — they measure a specific stall signal
- This spec provides the **decomposition** of that cohort into actionable stages
- No changes required to Retention spec SQL or metrics table — they're complementary

### What Changes in GTM Spec

The GTM Lifecycle ends at first payout. This spec covers the gap between GTM acquisition (user lands on platform) and GTM conversion (first booking). The handoff:
- GTM tracks: content → SEO → marketplace → listing discovery
- **Onboarding tracks**: signup → verified → profile → setup → activated
- Retention tracks: activated → retained → re-engagement → win-back

### CaaS Integration

CaaS score is computed during Tutor Approval (under_review stage). This spec tracks:
- How many tutors are waiting for CaaS scoring
- How long CaaS scoring takes (part of `approval_median_hours`)
- Whether high CaaS scores correlate with faster activation

---

## 11. API Route

### `GET /api/admin/onboarding/intelligence`

Returns the full `OnboardingHealthResponse` (Section 4) computed from live DB queries + cached daily metrics.

```typescript
// Auth: is_admin required
// Cache: staleTime 5min, revalidate on focus
// Data: real-time funnel counts + daily metrics for trends
```

### `GET /api/admin/onboarding/stalled`

Returns list of users stalled at each stage, for the "View list" action in the panel.

```typescript
interface StalledUsersResponse {
  users: {
    profile_id: string;
    full_name: string;
    email: string;
    role: string;
    stalled_stage: string;
    days_stalled: number;
    last_active: string;
    onboarding_step: number;
    total_steps: number;
  }[];
  total: number;
}
```

---

## 12. Operations Brief Integration

The Operations AI brief (`GET /api/admin/workflow/briefing`) should include onboarding metrics in its context:

```typescript
// Add to metrics context in briefing route
onboarding: onboardingMetrics.data ? {
  tutor_conversion_pct: onboardingMetrics.data.tutor_conversion_pct,
  client_conversion_pct: onboardingMetrics.data.client_conversion_pct,
  approval_pending: onboardingMetrics.data.approval_pending,
  approval_median_hours: onboardingMetrics.data.approval_median_hours,
  mid_onboarding_abandoned: onboardingMetrics.data.mid_onboarding_abandoned,
  tutor_biggest_dropoff_stage: onboardingMetrics.data.tutor_biggest_dropoff_stage,
} : null,
```

This gives the AI brief writer context to say things like: "Tutor onboarding conversion dropped to 28.9% — biggest drop-off at Profile → Value Setup stage. 14 users stalled mid-onboarding."

---

## 13. Quick Action Integration

Add to Operations `QUICK_ACTIONS`:

```typescript
{ label: 'Onboarding funnel', command: 'Show onboarding funnel health' },
```

---

## 14. Phase Plan

### Phase 3 — Conductor Integration (est. 20h)

| Task | Effort |
|------|--------|
| `onboarding_platform_metrics_daily` table + migration 387 | 2h |
| `compute_onboarding_platform_metrics()` function + pg_cron | 4h |
| `query_onboarding_health` tool in Operations Monitor | 3h |
| `/api/admin/onboarding/intelligence` API route | 2h |
| `/api/admin/onboarding/stalled` API route | 1h |
| IntelligencePanel 'onboarding' sub-tab UI | 3h |
| Onboarding Stall Nudge + Post-Onboarding Activation nudge | 2h |
| Approval SLA Breach escalation workflow | 1h |
| Operations brief context integration | 1h |
| Quick action pill | 0.5h |
| Testing + verification | 0.5h |

**Total: 20h**

---

## 15. Migration Summary

| Migration | Description |
|-----------|-------------|
| 387 | `onboarding_platform_metrics_daily` table + `compute_onboarding_platform_metrics()` function + pg_cron (04:00 UTC daily) |

> **Note**: No schema changes to existing tables. All funnel stages are derived from existing columns in `profiles`, `onboarding_sessions`, `role_details`, `listings`, `bookings`, and `workflow_executions`.
