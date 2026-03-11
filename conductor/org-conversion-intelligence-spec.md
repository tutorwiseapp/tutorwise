# Organisation Conversion Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-09
**Status**: Draft — for review
**Author**: Architecture

Related: [`retention-intelligence-spec.md`](./retention-intelligence-spec.md) · [`referral-intelligence-spec.md`](./referral-intelligence-spec.md) · [`conductor-solution-design.md`](./conductor-solution-design.md)

> **Role in the platform**: An organisation on Tutorwise is worth 5–10x a solo tutor in LTV — it brings an entire tutor network onto the platform, creates compounding referral effects, and generates delegation revenue through agents. Without Conductor intelligence, high-value solo operators who are ready to become org founders are never identified or nudged. This spec defines how Conductor converts the platform's most productive solo tutors and agents into organisation creators.

---

## 1. Purpose

Organisation creation is the platform's highest-leverage growth event. When a high-performing solo tutor or agent creates an organisation, they:
- Import their existing tutor network onto the platform
- Enable delegation (agents managing listings on behalf of tutors)
- Generate compounding referral effects (org referrals attributed to the org's commission structure)
- Create a long-term B2B relationship with the platform

The Growth Score already captures the signals that identify org candidates (`network_size` component for agents, `referral_network` for tutors). No workflow today acts on those signals.

**Two outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| Org candidate pipeline monitoring and conversion funnel | Phase 3 | Operations Monitor Agent (Conductor) |
| Admin Org Conversion intelligence panel | Phase 3 | `/admin/organisations` (extended) |

---

## 2. Organisation System Recap

### 2A. Organisation Structure

```
connection_groups (type = 'organisation'):
  id, owner_id (profile_id FK — the org founder)
  name, description, logo_url
  org_type ('tutoring_company' | 'school' | 'agency' | 'independent')
  created_at

profiles:
  role_type: 'tutor' | 'client' | 'agent' | 'organisation'
  organisation_id (FK → connection_groups, nullable — member of an org)

Delegation:
  Agents are members of an org who manage tutor listings
  Org owner → grants agent role → agent manages tutors within the org
```

### 2B. Org Candidate Signals

A solo tutor or agent is an "org candidate" when they exhibit network-builder behaviour before they have created an org:

```
TIER 1 — Emerging candidate:
  Agent: manages 3+ active tutors (bookings in last 30d)
  Tutor: 5+ clients booked in last 60d AND referral_sent_14d = true
  Both: Growth Score ≥ 60

TIER 2 — Strong candidate:
  Agent: manages 5+ active tutors, commission_trajectory > 0
  Tutor: manages informal tutor referrals (referred_by = their profile for 3+ tutors)
  Both: Growth Score ≥ 75

TIER 3 — Ready to convert:
  Either: Tier 2 criteria MET for > 30 days with no org creation action taken
  Platform nudge: "You're running an agency — formalise it on Tutorwise"
```

### 2C. Existing Workflow Handoff

The existing **Organisation Onboarding** workflow (Phase 2, Conductor design) fires when `connection_groups` INSERT occurs. This spec is the *upstream* funnel — it identifies who should create an org and nudges them to do so. The Onboarding workflow takes over after the org is created.

---

## 3. Operations Monitor Agent — Org Conversion Tools

### Tool: `query_org_conversion_health`

```typescript
{
  "name": "query_org_conversion_health",
  "description": "Returns the organisation conversion funnel: candidate pipeline by tier, conversion rates from solo operator to org founder, and new org onboarding health",
  "parameters": {
    "days": { "type": "integer", "default": 30 }
  }
}
```

**Returns:**

```typescript
interface OrgConversionHealthResponse {
  candidate_pipeline: {
    tier_1_candidates: number;          // emerging — Growth Score ≥ 60, 3+ managed
    tier_2_candidates: number;          // strong — Growth Score ≥ 75, 5+ managed
    tier_3_ready: number;               // ready — Tier 2 criteria > 30d, no action
    total_candidates: number;
    candidates_nudged_30d: number;      // candidates who received Conductor nudge
    conversion_rate_30d: number;        // nudged → org created in 30d window
  };
  new_orgs: {
    orgs_created_30d: number;
    orgs_from_conductor_nudge: number;  // orgs where founder was previously nudged
    organic_org_creation: number;       // orgs created without a prior nudge
    avg_days_nudge_to_creation: number; // latency from first nudge to org creation
  };
  org_health: {
    total_active_orgs: number;          // orgs with at least 1 member booking in 30d
    new_org_onboarding_stall: number;   // orgs created < 30d with 0 delegation setup
    avg_members_per_org: number;
    avg_org_growth_score: number;       // avg org Growth Score (role_type='organisation')
    orgs_below_threshold: number;       // org Growth Score < 40 (struggling)
  };
  alerts: OrgConversionAlert[];
}

interface OrgConversionAlert {
  type: 'tier3_candidate_inactive' | 'new_org_onboarding_stall'
      | 'org_dormancy' | 'conversion_rate_low' | 'pipeline_thin';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  candidates?: string[];  // profile names for HITL review
  action: string;
}
```

---

## 4. Key SQL

### 4A. Candidate Pipeline — Agent Candidates

```sql
-- Agents managing 3+ tutors with bookings in last 30d
WITH agent_networks AS (
  SELECT
    p.id AS agent_id,
    p.full_name,
    p.organisation_id,
    gs.score AS growth_score,
    -- Count tutors this agent has referred (proxied via agent_id on bookings)
    COUNT(DISTINCT b.tutor_id) FILTER (
      WHERE b.agent_id = p.id
        AND b.status IN ('Confirmed', 'Completed')
        AND b.created_at >= now() - interval '30 days'
    ) AS active_tutors_managed
  FROM profiles p
  LEFT JOIN growth_scores gs ON gs.user_id = p.id AND gs.role_type = 'agent'
  LEFT JOIN bookings b ON b.agent_id = p.id
  WHERE p.role_type = 'agent'
    AND p.organisation_id IS NULL  -- not already in an org
    AND p.status = 'active'
  GROUP BY p.id, p.full_name, p.organisation_id, gs.score
)
SELECT
  COUNT(*) FILTER (
    WHERE active_tutors_managed >= 3 AND growth_score >= 60
  ) AS tier_1_candidates,
  COUNT(*) FILTER (
    WHERE active_tutors_managed >= 5 AND growth_score >= 75
  ) AS tier_2_candidates
FROM agent_networks;
```

### 4B. Tier 3 — Ready to Convert (>30d at Tier 2 with no action)

```sql
-- Agents who have been strong candidates for > 30 days
WITH strong_candidates AS (
  SELECT
    p.id AS profile_id,
    p.full_name,
    p.role_type,
    gs.score AS growth_score,
    MIN(pe.created_at) AS first_candidate_signal_at
  FROM profiles p
  JOIN growth_scores gs ON gs.user_id = p.id
  JOIN platform_events pe
    ON pe.actor_id = p.id
    AND pe.event_type = 'conductor.org_candidate_identified'
  WHERE p.organisation_id IS NULL
    AND p.status = 'active'
    AND gs.score >= 75
  GROUP BY p.id, p.full_name, p.role_type, gs.score
  HAVING MIN(pe.created_at) < now() - interval '30 days'
)
SELECT
  COUNT(*) AS tier_3_ready,
  ARRAY_AGG(full_name ORDER BY first_candidate_signal_at ASC) AS ready_candidates
FROM strong_candidates;
```

### 4C. New Org Onboarding Stall

```sql
-- Orgs created in last 30 days with no delegation setup (no agent members)
SELECT
  cg.id AS org_id,
  cg.name AS org_name,
  p.full_name AS founder_name,
  cg.created_at,
  EXTRACT(EPOCH FROM (now() - cg.created_at)) / 86400 AS days_since_creation,
  COUNT(members.id) AS member_count,
  COUNT(members.id) FILTER (WHERE members.role_type = 'agent') AS agent_count
FROM connection_groups cg
JOIN profiles p ON p.id = cg.owner_id
LEFT JOIN profiles members ON members.organisation_id = cg.id
WHERE cg.type = 'organisation'
  AND cg.created_at >= now() - interval '30 days'
GROUP BY cg.id, cg.name, p.full_name, cg.created_at
HAVING COUNT(members.id) FILTER (WHERE members.role_type = 'agent') = 0
   AND EXTRACT(EPOCH FROM (now() - cg.created_at)) / 86400 > 7;
```

### 4D. Conversion Rate — Nudge → Org Creation

```sql
-- Platform events: nudge sent → org created (30-day window)
WITH nudges AS (
  SELECT
    actor_id AS profile_id,
    created_at AS nudged_at
  FROM platform_events
  WHERE event_type = 'conductor.org_candidate_nudge_sent'
    AND created_at >= now() - interval '90 days'  -- wider window for latency
),
conversions AS (
  SELECT
    cg.owner_id AS profile_id,
    cg.created_at AS org_created_at
  FROM connection_groups cg
  WHERE cg.type = 'organisation'
    AND cg.created_at >= now() - interval '90 days'
)
SELECT
  COUNT(DISTINCT n.profile_id) AS nudged_candidates,
  COUNT(DISTINCT c.profile_id) AS converted_to_org,
  ROUND(COUNT(DISTINCT c.profile_id)::numeric /
    NULLIF(COUNT(DISTINCT n.profile_id), 0) * 100, 1) AS conversion_rate_pct,
  ROUND(AVG(EXTRACT(EPOCH FROM (c.org_created_at - n.nudged_at)) / 86400), 1) AS avg_days_to_convert
FROM nudges n
LEFT JOIN conversions c
  ON c.profile_id = n.profile_id
  AND c.org_created_at BETWEEN n.nudged_at AND n.nudged_at + interval '30 days';
```

---

## 5. Alert Triggers

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| `tier3_candidate_inactive` | Any Tier 3 candidate with no Conductor response for > 7 days | warning | HITL: "High-value org candidate — no response to nudge in 7d. Personal outreach?" |
| `new_org_onboarding_stall` | `new_org_onboarding_stall` > 2 orgs in 30d | warning | Trigger Organisation Onboarding workflow + review setup UX |
| `org_dormancy` | Org Growth Score < 40 AND 0 member bookings in 30d | critical | Trigger Org Dormancy Re-engagement workflow (existing Phase 2 workflow) |
| `conversion_rate_low` | `conversion_rate_30d` < 5% (fewer than 1-in-20 nudged candidates convert) | info | Review nudge messaging and org creation UX; adjust Growth Advisor coaching |
| `pipeline_thin` | `total_candidates` < 10 platform-wide | info | Expand candidate criteria or accelerate tutor/agent growth |

---

## 6. Database Table: `org_conversion_platform_metrics_daily`

**Migration: 368**

```sql
CREATE TABLE org_conversion_platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,

  -- Candidate pipeline
  tier_1_candidates integer NOT NULL DEFAULT 0,
  tier_2_candidates integer NOT NULL DEFAULT 0,
  tier_3_ready integer NOT NULL DEFAULT 0,
  candidates_nudged_30d integer NOT NULL DEFAULT 0,
  conversion_rate_pct numeric(5,2),
  avg_days_nudge_to_conversion numeric(5,1),

  -- New org creation
  orgs_created_30d integer NOT NULL DEFAULT 0,
  orgs_from_conductor_nudge integer NOT NULL DEFAULT 0,

  -- Org health
  total_active_orgs integer NOT NULL DEFAULT 0,
  new_org_onboarding_stall integer NOT NULL DEFAULT 0,
  avg_members_per_org numeric(4,1),
  avg_org_growth_score numeric(5,2),
  orgs_below_threshold integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON org_conversion_platform_metrics_daily (metric_date DESC);

-- pg_cron: daily at 10:30 UTC
SELECT cron.schedule(
  'compute-org-conversion-platform-metrics',
  '30 10 * * *',
  $$SELECT compute_org_conversion_platform_metrics();$$
);
```

---

## 7. Admin Org Conversion Intelligence Panel

Extended panel within `/admin/organisations`.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Organisation Conversion Intelligence              Last 30 days ▾    │
├──────────────────────────────────────────────────────────────────────┤
│  Candidate Pipeline                                                  │
│  Tier 1 (emerging):  23     Tier 2 (strong):  8     Tier 3 (ready): 3 ⚠ │
│  Nudged this month:  11     Converted to org: 2    Rate: 18.2% ✓   │
│  Avg days nudge→org: 12.4d                                          │
├──────────────────────────────────────────────────────────────────────┤
│  New Orgs (30d)                                                      │
│  Created: 4   From Conductor nudge: 2   Organic: 2                  │
│  Onboarding stall (no agents in 7d): 1  ⚠                          │
├──────────────────────────────────────────────────────────────────────┤
│  Org Health (all orgs)                                               │
│  Active orgs: 31   Avg members: 4.2   Avg Growth Score: 61.4 ✓    │
│  Struggling (score < 40): 3  ⚠                                     │
├──────────────────────────────────────────────────────────────────────┤
│  ⚠ 3 Tier 3 candidates — ready to convert, no response in 7d      │
│  ⚠ 1 new org with no delegation setup after 9 days                 │
│  ✓ No org dormancy alerts                                           │
└──────────────────────────────────────────────────────────────────────┘

  [View candidate list]  [Send nudge to Tier 3]  [View new orgs]
```

---

## 8. Conductor Workflow Integration

### Org Candidate Detection + Nudge

```
Trigger: compute_org_conversion_platform_metrics() identifies new Tier 2+ candidate
  (logged to platform_events as 'conductor.org_candidate_identified')
Step 1: Check if profile has already been nudged in last 30d → skip if so
Step 2: Trigger Growth Agent coaching session with org creation framing:
  "You're managing [N] active tutors and earning £X/month in commissions —
   that's an agency. Here's how creating an organisation on Tutorwise gives
   you delegation tools, org-level referral tracking, and a professional
   presence for your tutors."
Step 3: Log to platform_events: 'conductor.org_candidate_nudge_sent'
Step 4 (Tier 3 — no response after 7d):
  → HITL: "High-value org candidate [name] — [N] managed tutors, Growth Score [X]"
    Admin actions: [Send personal outreach] [Schedule call] [Offer org setup support]
Step 5: On org creation → hand off to Organisation Onboarding workflow
```

### New Org Onboarding Stall Recovery

```
Trigger: connection_groups INSERT (new org) — check after 7 days for delegation setup
Step 1 (Day 7): If 0 agent members → send Growth Agent coaching:
  "Your organisation is set up — the next step is adding agents who can
   manage listings for your tutors. Here's how delegation works..."
Step 2 (Day 14): If still 0 agents → HITL: "New org [name] — no delegation in 14d"
  Admin actions: [Offer setup call] [Send setup guide] [Review org UX]
```

---

## 9. Growth Advisor Integration

```
"Organisation" section in Growth Advisor context (tutor and agent roles):

Tutor or Agent WITHOUT an org (candidate):
  Growth Advisor reads: active_tutors_managed, Growth Score network_size component
  If Tier 1+:
    "You're managing [N] tutors and generating £X in commissions. Tutorwise
     organisations give you delegation tools and a professional presence. Here's
     what creating an org unlocks..."
  If Tier 2+:
    Proactive: "You've crossed the threshold — your referral network is operating
     at agency scale. Creating an org takes 10 minutes and unlocks [specific feature]."

Org Founder (organisation role_type):
  Growth Advisor reads: org Growth Score, team_health, revenue_trajectory
  Coaching: lowest component recommendation (team_health / revenue / referral / adoption)
  "3 of your tutors have Growth Scores below 40 — here's how to help them..."
```

---

## 10. Phase Plan

### Phase 3 — Conductor Integration (est. 18h)

| Task | Effort |
|------|--------|
| `org_conversion_platform_metrics_daily` + migration 368 | 2h |
| `compute_org_conversion_platform_metrics()` pg_cron + candidate SQL | 3h |
| `query_org_conversion_health` tool in Operations Monitor | 4h |
| Org Candidate Detection + Nudge workflow | 3h |
| New Org Onboarding Stall Recovery workflow | 2h |
| Admin Org Conversion panel UI (extend `/admin/organisations`) | 3h |
| `/api/admin/organisations/intelligence` API route | 1h |

### Phase 4 — Growth Advisor (est. 4h)

| Task | Effort |
|------|--------|
| Org candidate coaching in Growth Advisor skills | 2h |
| Org founder coaching in Growth Advisor skills | 2h |

**Total: 22h**

---

## 11. Migration Summary

| Migration | Description |
|-----------|-------------|
| 368 | `org_conversion_platform_metrics_daily` table + `compute_org_conversion_platform_metrics()` function + pg_cron |
