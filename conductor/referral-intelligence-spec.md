# Referral Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-08
**Status**: Draft — for review
**Author**: Architecture

---

## 1. Purpose

Referral is a flagship growth mechanism on Tutorwise. Every user role (tutor, client, agent, organisation) can refer new users; successful referrals generate a lifetime 10% commission split on all subsequent bookings. This document specifies how the platform measures, monitors, and acts on referral system performance.

**Three outputs from this spec:**

| Output | Phase | Home |
|--------|-------|------|
| Viral Coefficient (K) + funnel metrics computed daily | Phase 3 | Retention Monitor Agent (Conductor) |
| Referral Intelligence tab in Admin Signal | Phase 3 | `/admin/signal` — new tab |
| Full Network Intelligence page | Phase 4 | `/admin/network/` (extends §4C-ii) |

---

## 2. Referral System Recap — Data Model

### 2A. Core Tables

```
profiles
  id                     uuid PRIMARY KEY
  referral_code          text UNIQUE          -- user's shareable code
  referred_by_profile_id uuid → profiles(id)  -- who referred this user (set at signup, never changes)

referrals
  id                     uuid PRIMARY KEY
  agent_id               uuid → profiles(id)  -- the referrer (renamed from referrer_profile_id)
  referred_profile_id    uuid → profiles(id)  -- the referred user (NULL until signup)
  referred_email         text                 -- email sent to lead before signup
  referral_target_type   text                 -- 'tutor' (supply) | 'client' (demand)
  status                 referral_status_enum -- 'Referred' | 'Signed Up' | 'Converted' | 'Expired'
  conversion_stage       text                 -- finer-grained: 'referred' | 'signed_up' | 'converted' | 'expired'
  booking_id             uuid → bookings(id)  -- first booking that triggered conversion
  signed_up_at           timestamptz
  converted_at           timestamptz
  created_at             timestamptz
  organisation_id        uuid → connection_groups(id)  -- set for org-delegated referrals
  referrer_member_id     uuid → profiles(id)            -- org team member who referred
  commission_amount      numeric(10,2)
  organisation_commission numeric(10,2)
  member_commission      numeric(10,2)

bookings
  agent_id               uuid → profiles(id)  -- LIFETIME REFERRER — used for 10% commission split
  booking_referrer_id    uuid                 -- Wiselist analytics ONLY (not commission)
```

### 2B. Referral Types

All referrals earn **10% lifetime commission** on every booking attributed to the referred user, regardless of referrer role or referred user type.

| Type | Who refers | Who is referred | Commission | `referral_target_type` |
|------|-----------|----------------|------------|------------------------|
| **Supply-side** | Any user | New tutor/agent | 10% lifetime on referred user's bookings | `'tutor'` |
| **Demand-side** | Any user | New client | 10% lifetime on referred user's bookings | `'client'` |
| **Agent model** | Human "agent" (role_type = 'agent') | New tutors or clients | 10% lifetime | either |

> **Note on organisations**: Organisations do not have a separate referral commission type. An organisation member who refers a user does so as an individual — the 10% commission accrues to the referring member's profile (`bookings.agent_id`). Organisation referral analytics (`organisation_referral_stats`, `member_referral_stats`) track aggregate performance but do not alter commission mechanics.

### 2C. Existing Analytics Assets

| Asset | Type | Refresh |
|-------|------|---------|
| `organisation_referral_stats` | Materialized view | Hourly :15 |
| `member_referral_stats` | Materialized view | Hourly :20 |
| `referral_funnel_analytics` | Materialized view | Hourly |
| `get_referral_stats(p_agent_id)` | RPC | On-demand |
| `expire_stale_referrals()` | pg_cron | Daily 03:00 UTC |
| `GET /api/v1/referrals/stats` | API | On-demand |

---

## 3. The Viral Coefficient (K)

### 3A. Definition

The viral coefficient **K** measures how many new users each existing user generates through referrals:

```
K = I × C₁ × C₂

Where:
  I  = avg referral invitations sent per active user (fan-out)
  C₁ = share-to-signup conversion rate (% of referred leads who create an account)
  C₂ = signup-to-booking conversion rate (% of new signups who make a first booking)

Interpretation:
  K > 1.0 → exponential (viral) growth — each user generates more than one new active user
  K = 0.5–1.0 → linear / subsidised growth — significant but not self-sustaining
  K < 0.5 → referral is supplementary — other acquisition channels dominate
```

**Target**: K ≥ 0.6 platform-wide within 12 months of launch.

### 3B. SQL Implementation

```sql
-- Platform-level viral coefficient
-- Run daily, store result in referral_metrics_daily table
WITH active_users AS (
  -- Users active in last 30 days (at least 1 booking or referral sent)
  SELECT DISTINCT p.id
  FROM profiles p
  WHERE EXISTS (
    SELECT 1 FROM bookings b WHERE b.tutor_profile_id = p.id OR b.client_profile_id = p.id
    AND b.created_at > now() - interval '30 days'
  ) OR EXISTS (
    SELECT 1 FROM referrals r WHERE r.agent_id = p.id
    AND r.created_at > now() - interval '30 days'
  )
),
fan_out AS (
  -- Average referrals sent per active user in last 30 days
  SELECT
    COUNT(r.id)::float / NULLIF(COUNT(DISTINCT au.id), 0) AS invitations_per_user
  FROM active_users au
  LEFT JOIN referrals r ON r.agent_id = au.id
    AND r.created_at > now() - interval '30 days'
),
c1 AS (
  -- Share-to-signup conversion rate (30-day cohort)
  SELECT
    COUNT(CASE WHEN status IN ('Signed Up', 'Converted') THEN 1 END)::float
    / NULLIF(COUNT(*), 0) AS signup_rate
  FROM referrals
  WHERE created_at > now() - interval '30 days'
    AND status != 'Expired'
),
c2 AS (
  -- Signup-to-booking conversion rate
  SELECT
    COUNT(CASE WHEN status = 'Converted' THEN 1 END)::float
    / NULLIF(COUNT(CASE WHEN status IN ('Signed Up', 'Converted') THEN 1 END), 0) AS booking_rate
  FROM referrals
  WHERE created_at > now() - interval '30 days'
)
SELECT
  fan_out.invitations_per_user AS I,
  c1.signup_rate               AS C1,
  c2.booking_rate              AS C2,
  fan_out.invitations_per_user * c1.signup_rate * c2.booking_rate AS K,
  now()                        AS computed_at
FROM fan_out, c1, c2;
```

### 3C. K Segmentation

K is computed at four levels to identify where the referral engine is strong or weak:

| Segment | Computed by | Why |
|---------|------------|-----|
| `K_platform` | All active users | Overall health signal |
| `K_by_role` | `profiles.role_type` grouping | Which role drives the most viral growth |
| `K_by_type` | `referral_target_type` grouping | Supply vs demand referrals |
| `K_cohort_monthly` | Monthly signup cohort | Trend — is K improving over time? |

### 3D. New Table: `referral_metrics_daily`

```sql
CREATE TABLE referral_metrics_daily (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  computed_date   date NOT NULL,
  segment         text NOT NULL,          -- 'platform' | 'role:tutor' | 'role:agent' | 'type:supply' | 'cohort:2026-03'
  invitations_per_user numeric(8,4),      -- I
  signup_rate     numeric(8,4),           -- C1
  booking_rate    numeric(8,4),           -- C2
  k_coefficient   numeric(8,4),           -- K = I × C1 × C2
  active_users    integer,
  referrals_sent  integer,
  signups         integer,
  conversions     integer,
  created_at      timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX ON referral_metrics_daily (computed_date, segment);
CREATE INDEX ON referral_metrics_daily (computed_date DESC);
```

Populated by `compute_referral_metrics()` pg_cron job, daily at 06:00 UTC.

---

## 4. Network Graph Model

The referral network is a directed graph:

```
Node:  profiles.id
Edge:  referrals (agent_id → referred_profile_id)
       bookings  (agent_id → client_profile_id, if referral-attributed)

Edge weight:
  - bookings_generated: count of bookings where bookings.agent_id = this_referrer
  - ltv_attributed:     sum of booking amounts where bookings.agent_id = this_referrer
  - commission_earned:  10% of ltv_attributed
```

### 4A. Graph Metrics

| Metric | Definition | SQL approach |
|--------|-----------|-------------|
| **Graph depth** | Longest referral chain (A refers B, B refers C = depth 2) | Recursive CTE on `profiles.referred_by_profile_id` |
| **Avg depth** | Mean depth across all referred users | Same recursive CTE, AVG |
| **Fan-out (degree)** | Avg referrals sent per referrer node | `COUNT(referrals) / COUNT(DISTINCT agent_id)` |
| **Hub nodes** | Users with >10 referrals sent | `referrals GROUP BY agent_id HAVING COUNT(*) > 10` |
| **Ghost rate** | % referrals where status = 'Referred' after 7d | `status = 'Referred' AND created_at < now() - 7d` |
| **Cycle detection** | A refers B, B refers A (impossible by design — signup must precede referral) | N/A — DAG by construction |

### 4B. Network Depth Query

```sql
-- Referral chain depth for each user
WITH RECURSIVE referral_chain AS (
  -- Anchor: root users (not referred by anyone)
  SELECT
    id AS user_id,
    id AS root_id,
    0  AS depth
  FROM profiles
  WHERE referred_by_profile_id IS NULL

  UNION ALL

  -- Recursive: users who were referred
  SELECT
    p.id   AS user_id,
    rc.root_id,
    rc.depth + 1 AS depth
  FROM profiles p
  JOIN referral_chain rc ON rc.user_id = p.referred_by_profile_id
  WHERE rc.depth < 10  -- guard against runaway recursion
)
SELECT
  AVG(depth)::numeric(4,2)  AS avg_depth,
  MAX(depth)                AS max_depth,
  COUNT(CASE WHEN depth >= 2 THEN 1 END) AS multi_hop_users,
  COUNT(*)                  AS total_nodes
FROM referral_chain
WHERE depth > 0;  -- exclude root (non-referred) users
```

### 4C. Hub Node Identification

Hub nodes are power referrers — users generating disproportionate growth. They are ranked by **attributed LTV** (not referral count) to surface quality, not just volume.

```sql
SELECT
  p.id,
  p.full_name,
  p.role_type,
  COUNT(r.id)                         AS referrals_sent,
  COUNT(CASE WHEN r.status = 'Converted' THEN 1 END) AS conversions,
  SUM(b.amount)                       AS attributed_ltv,
  SUM(b.amount) * 0.1                 AS commission_earned,
  ROUND(
    COUNT(CASE WHEN r.status = 'Converted' THEN 1 END)::float
    / NULLIF(COUNT(r.id), 0) * 100, 1
  )                                   AS personal_conversion_rate
FROM profiles p
JOIN referrals r ON r.agent_id = p.id
LEFT JOIN bookings b ON b.agent_id = p.id
GROUP BY p.id, p.full_name, p.role_type
HAVING COUNT(r.id) > 0
ORDER BY attributed_ltv DESC NULLS LAST
LIMIT 50;
```

---

## 5. Referral Funnel — Four Stages

```
[Share]──────────────────────────────────────────────────────────────────────►
  │         [Signup]──────────────────────────────────────────────────────────►
  │           │         [First Booking]──────────────────────────────────────►
  │           │               │         [Repeat Booking]──────────────────────►
  │           │               │                │
referral    signed_up_at   converted_at    2nd booking confirmed

Leakage taxonomy:
  Ghost     = Referred, no signup after 7d       → re-engagement email sequence (Resend)
  Orphan    = Signed up, no booking after 14d    → Growth Advisor nudge
  Cold      = First booking, no rebooking 30d   → re-booking prompt in session end flow
  Dormant   = Converted, no session in 60d       → churn prevention workflow
```

### 5A. Funnel Rate Query

```sql
-- Referral funnel conversion rates (30-day rolling)
SELECT
  COUNT(*)                                                       AS total_referred,

  -- Stage 1: Share → Signup
  COUNT(CASE WHEN status IN ('Signed Up', 'Converted') THEN 1 END) AS signed_up,
  ROUND(
    COUNT(CASE WHEN status IN ('Signed Up', 'Converted') THEN 1 END)::float
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                                              AS signup_rate_pct,

  -- Stage 2: Signup → First Booking
  COUNT(CASE WHEN status = 'Converted' THEN 1 END)               AS converted,
  ROUND(
    COUNT(CASE WHEN status = 'Converted' THEN 1 END)::float
    / NULLIF(COUNT(CASE WHEN status IN ('Signed Up', 'Converted') THEN 1 END), 0) * 100, 1
  )                                                              AS booking_rate_pct,

  -- Time-to-convert metrics
  ROUND(AVG(EXTRACT(EPOCH FROM (signed_up_at - created_at)) / 3600), 1)     AS avg_hours_to_signup,
  ROUND(AVG(EXTRACT(EPOCH FROM (converted_at - signed_up_at)) / 86400), 1)  AS avg_days_signup_to_book,

  -- Ghost rate (no signup after 7 days)
  ROUND(
    COUNT(CASE WHEN status = 'Referred' AND created_at < now() - interval '7 days' THEN 1 END)::float
    / NULLIF(COUNT(*), 0) * 100, 1
  )                                                              AS ghost_rate_pct

FROM referrals
WHERE created_at > now() - interval '30 days'
  AND status != 'Expired';
```

### 5B. Channel Attribution

Which acquisition channels produce the highest-quality referrals?

```sql
-- Referral performance by source / channel
SELECT
  COALESCE(r.referral_source, 'direct_link')          AS channel,
  COUNT(r.id)                                          AS referrals,
  COUNT(CASE WHEN r.status IN ('Signed Up', 'Converted') THEN 1 END) AS signups,
  COUNT(CASE WHEN r.status = 'Converted' THEN 1 END)  AS conversions,
  ROUND(
    COUNT(CASE WHEN r.status = 'Converted' THEN 1 END)::float
    / NULLIF(COUNT(r.id), 0) * 100, 1
  )                                                    AS end_to_end_conversion_pct,
  ROUND(AVG(b.amount), 2)                              AS avg_booking_value
FROM referrals r
LEFT JOIN bookings b ON b.id = r.booking_id
WHERE r.created_at > now() - interval '30 days'
GROUP BY channel
ORDER BY conversions DESC;
```

---

## 6. Retention Monitor Integration

The **Retention Monitor** (Conductor Specialist, slug: `retention-monitor`, daily 08:00) includes these referral-specific queries:

### Tool: `query_referral_funnel`

```typescript
// Tool registration in specialist_agents config
{
  "name": "query_referral_funnel",
  "description": "Returns referral funnel rates, ghost rate, K coefficient and velocity vs prior period",
  "parameters": {
    "period_days": { "type": "integer", "default": 30 },
    "compare": { "type": "boolean", "default": true }  // include prior period for delta
  }
}
```

**Returns:**

```json
{
  "k_coefficient": 0.42,
  "k_delta_mom": -0.08,
  "referrals_sent_30d": 312,
  "signup_rate": 0.31,
  "booking_rate": 0.44,
  "ghost_rate": 0.69,
  "ghost_rate_delta": +0.04,
  "avg_hours_to_signup": 18.3,
  "avg_days_signup_to_book": 4.1,
  "velocity_mom": -0.12,
  "top_channel": "direct_link",
  "alert_flags": ["ghost_rate_elevated", "k_declining"]
}
```

### Alert Triggers (system_prompt_template rules)

| Condition | Alert flag | Recommended action |
|-----------|------------|-------------------|
| K < 0.3 | `k_critical` | Flag for admin review — referral programme may be broken |
| K MoM drop > 15% | `k_declining` | Surface to admin — investigate acquisition channels |
| Ghost rate > 75% | `ghost_rate_elevated` | Trigger re-engagement email sequence review |
| Ghost rate MoM increase > 5pp | `ghost_rate_rising` | Check email deliverability and referral landing page |
| Velocity MoM drop > 20% | `velocity_declining` | Check whether referral share UX is frictionless |
| Hub referrer inactive 30d | `hub_referrer_dormant` | Growth Advisor nudge for the referrer |
| Conversion time P90 > 21 days | `slow_funnel` | Investigate signup flow and onboarding for referred users |

### Tool: `query_supply_demand_gap`

Already specified in Retention Monitor config — referral data informs supply gaps:

```sql
-- Where referral activity is high but tutor supply is low
SELECT
  l.subject,
  COUNT(DISTINCT b.client_profile_id) AS active_clients,
  COUNT(DISTINCT l.profile_id)        AS active_tutors,
  ROUND(COUNT(DISTINCT b.client_profile_id)::float / NULLIF(COUNT(DISTINCT l.profile_id), 0), 1) AS demand_supply_ratio
FROM listings l
JOIN bookings b ON b.listing_id = l.id
  AND b.created_at > now() - interval '30 days'
GROUP BY l.subject
HAVING COUNT(DISTINCT b.client_profile_id)::float / NULLIF(COUNT(DISTINCT l.profile_id), 0) > 2
ORDER BY demand_supply_ratio DESC;
```

---

## 7. Admin Signal — Referral Tab (Phase 3)

Extend `/admin/signal` with a **Referral** tab. This is read-only analytics — no agent action, just visibility.

### Tab Layout

```
/admin/signal  [Articles] [Funnel] [Attribution] [Listings] [Journeys] [Referral ← NEW]

REFERRAL TAB
┌──────────────────────────────────────────────────────────────────────────────┐
│  PLATFORM VIRAL COEFFICIENT                              [Last 30 days ▾]    │
│  ─────────────────────────────────────────────────────────────────────────   │
│  K = 0.42  ▼ -0.08 vs last month                                            │
│                                                                              │
│  I (invitations/user): 1.4     C1 (share→signup): 0.31   C2 (signup→book): 0.44 │
│  Target K ≥ 0.6                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│  FUNNEL                                                                      │
│  1,240 referred ──31%──► 384 signed up ──44%──► 169 converted               │
│  Ghost rate: 69% (referred, no signup after 7d)   ⚠ above 65% benchmark    │
│  Avg time to signup: 18.3h   Avg signup to book: 4.1 days                   │
└──────────────────────────────────────────────────────────────────────────────┘

REFERRALS BY ROLE
┌─────────────────┬──────────┬─────────┬──────────┬─────────────────┐
│ Role            │ Referred │ Signed  │ Converted│ Conversion rate  │
├─────────────────┼──────────┼─────────┼──────────┼─────────────────┤
│ Agent           │   420    │   158   │    82    │     19.5%        │
│ Tutor           │   560    │   173   │    68    │     12.1%        │
│ Client          │   210    │    42   │    15    │      7.1%        │
│ Organisation    │    50    │    11   │     4    │      8.0%        │
└─────────────────┴──────────┴─────────┴──────────┴─────────────────┘

REFERRALS BY CHANNEL
┌─────────────────────────────────┬──────────┬──────────┬──────────┐
│ Channel                         │ Referred │ Converted│ Rate     │
├─────────────────────────────────┼──────────┼──────────┼──────────┤
│ Direct link (copy/paste)        │   520    │    84    │  16.2%   │
│ Tutorwise Referral Programme    │   380    │    57    │  15.0%   │
│ WhatsApp share                  │   210    │    20    │   9.5%   │
│ Nextdoor Local                  │    80    │     6    │   7.5%   │
│ Email invite                    │    50    │     2    │   4.0%   │
└─────────────────────────────────┴──────────┴──────────┴──────────┘

SUPPLY VS DEMAND SIDE
  Supply referrals (new tutors): 840    Avg booking value: £45.20
  Demand referrals (new clients): 400   Avg booking value: £38.60
```

### API Route

```typescript
// GET /api/admin/referrals/analytics
// Returns all data needed for the Referral tab

interface ReferralAnalyticsResponse {
  period: { start: string; end: string };
  coefficient: {
    k: number;
    k_delta_mom: number;
    invitations_per_user: number;   // I
    signup_rate: number;            // C1
    booking_rate: number;           // C2
    k_trend: Array<{ month: string; k: number }>;  // 6-month sparkline
  };
  funnel: {
    referred: number;
    signed_up: number;
    converted: number;
    signup_rate_pct: number;
    booking_rate_pct: number;
    ghost_rate_pct: number;
    avg_hours_to_signup: number;
    avg_days_signup_to_book: number;
  };
  by_role: Array<{
    role: string;
    referred: number;
    signed_up: number;
    converted: number;
    conversion_rate: number;
  }>;
  by_channel: Array<{
    channel: string;
    referred: number;
    converted: number;
    rate: number;
  }>;
  supply_vs_demand: {
    supply: { count: number; avg_booking_value: number };
    demand: { count: number; avg_booking_value: number };
  };
}
```

---

## 8. Network Intelligence Page — Full Spec (Phase 4)

Extends `§4C-ii` from `conductor-solution-design-v3.md`. Route: `/admin/network/`.

### 8A. Page Layout

```
/admin/network/  — Network Intelligence

  [Network Health] [Referrers] [Organisations] [Chains]

  ─── NETWORK HEALTH TAB ─────────────────────────────────────────────────────

  ┌──────────────────────────────────────────────────────────────────────────┐
  │  KEY METRICS                               [Last 30 days ▾]  [Export]   │
  │  ─────────────────────────────────────────────────────────────────────  │
  │  K Coefficient: 0.42   Avg graph depth: 1.8 hops                        │
  │  Hub nodes (>10 referrals): 23            Max chain depth: 4 hops       │
  │  Referral velocity MoM: -12%              Ghost rate: 69%               │
  │  Delegation adoption: 23% of orgs                                       │
  └──────────────────────────────────────────────────────────────────────────┘

  K Coefficient — 6-Month Trend
  [sparkline chart: Oct 0.31 | Nov 0.37 | Dec 0.44 | Jan 0.48 | Feb 0.50 | Mar 0.42]
  ⚠ March dip: K -0.08 vs February — ghost rate elevated

  ─── REFERRERS TAB ──────────────────────────────────────────────────────────

  Top 50 Referrers by Attributed LTV  [Filter: all roles ▾]  [Export CSV]

  ┌────┬──────────────────┬────────────┬──────────┬────────────┬───────────┐
  │ #  │ Referrer         │ Role       │ Ref'd    │ Conv rate  │ Attr. LTV │
  ├────┼──────────────────┼────────────┼──────────┼────────────┼───────────┤
  │ 1  │ Jessica M.       │ agent      │ 52       │ 42%        │ £14,200   │
  │ 2  │ David K.         │ tutor      │ 31       │ 35%        │  £8,400   │
  │ 3  │ Oakwood Learning │ org        │ 18 mbrs  │ 28%        │  £6,100   │
  │ 4  │ Ahmed S.         │ tutor      │ 28       │ 21%        │  £4,800   │
  └────┴──────────────────┴────────────┴──────────┴────────────┴───────────┘

  Dormant Hub Alert: 3 hub referrers (>10 referrals) inactive in last 30d
  [View Dormant Referrers] → Growth Advisor can nudge if user subscribes

  ─── ORGANISATIONS TAB ──────────────────────────────────────────────────────

  (Same as existing §4C-ii Organisation Tab — org health ranking, dormancy pipeline)

  ─── CHAINS TAB ─────────────────────────────────────────────────────────────

  Referral Chain Explorer (tree view)
  Search by user name or referral code → shows their referral tree
  Depth, fan-out, LTV at each node

  Example:
    ● Jessica M. (agent) ──► 52 users
        ├─ Sarah T. (tutor) ──► 8 users (depth 2)
        │     └─ Mark P. (client) ──► 0 (depth 3, leaf)
        ├─ Oakwood Learning (org) ──► 12 users (depth 2)
        └─ ...
```

### 8B. Chain Explorer — API

```typescript
// GET /api/admin/network/chain?user_id=<uuid>&max_depth=3
// Returns referral tree for a given user

interface ReferralChainNode {
  user_id: string;
  full_name: string;
  role_type: string;
  depth: number;
  direct_referrals: number;
  attributed_ltv: number;
  commission_earned: number;
  children: ReferralChainNode[];  // recursive
}

// GET /api/admin/network/stats
// Returns all Network Health tab metrics

interface NetworkStatsResponse {
  k_coefficient: number;
  avg_graph_depth: number;
  max_graph_depth: number;
  hub_node_count: number;
  ghost_rate: number;
  velocity_mom: number;
  delegation_adoption_pct: number;
  k_trend: Array<{ month: string; k: number }>;
  top_referrers: ReferrerSummary[];
  dormant_hubs: ReferrerSummary[];
}
```

### 8C. New DB View: `referral_network_stats`

```sql
CREATE MATERIALIZED VIEW referral_network_stats AS
WITH chain AS (
  -- Compute depth for every user
  WITH RECURSIVE rc AS (
    SELECT id AS user_id, 0 AS depth
    FROM profiles WHERE referred_by_profile_id IS NULL
    UNION ALL
    SELECT p.id, rc.depth + 1
    FROM profiles p JOIN rc ON rc.user_id = p.referred_by_profile_id
    WHERE rc.depth < 10
  )
  SELECT * FROM rc
),
hub_nodes AS (
  SELECT agent_id, COUNT(*) AS referral_count
  FROM referrals
  GROUP BY agent_id
  HAVING COUNT(*) >= 10
),
metrics AS (
  SELECT
    (SELECT ROUND(AVG(depth), 2) FROM chain WHERE depth > 0)  AS avg_depth,
    (SELECT MAX(depth) FROM chain)                             AS max_depth,
    (SELECT COUNT(*) FROM hub_nodes)                           AS hub_count,

    -- Ghost rate: referred but no signup after 7 days
    (SELECT ROUND(
      COUNT(CASE WHEN status = 'Referred' AND created_at < now() - interval '7 days' THEN 1 END)::numeric
      / NULLIF(COUNT(*), 0) * 100, 1
     ) FROM referrals WHERE created_at > now() - interval '30 days') AS ghost_rate_pct,

    -- Delegation adoption: orgs with at least 1 delegated referral
    (SELECT ROUND(
      COUNT(DISTINCT organisation_id)::numeric
      / NULLIF((SELECT COUNT(*) FROM connection_groups WHERE type = 'organisation'), 0) * 100, 1
     ) FROM referrals WHERE organisation_id IS NOT NULL) AS delegation_adoption_pct
)
SELECT *, now() AS refreshed_at FROM metrics;

CREATE UNIQUE INDEX ON referral_network_stats ((1));  -- single-row view

-- Refresh every hour at :30
SELECT cron.schedule('refresh-referral-network-stats', '30 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY referral_network_stats'
);
```

---

## 9. Growth Advisor Integration (User-Facing)

The user-facing **Growth Advisor** (`/growth`) surfaces referral performance at the individual level using the existing `skills/referral-strategy.ts` skill. Key additions:

### New: Personal Referral Coefficient Display

```typescript
// Within GrowthAgentOrchestrator context
// Injected at session start from PlatformUserContext

const personalK = {
  referralsSent: 8,
  signups: 3,          // C1 = 3/8 = 37.5%
  conversions: 1,      // C2 = 1/3 = 33%
  personalK: 0.125,    // I×C1×C2 = 1×0.375×0.33
  platformAvgK: 0.42,  // fetched from referral_metrics_daily
  message: "Your referral rate is below the platform average.
            Try sharing via WhatsApp — our highest-converting channel."
}
```

**Trigger**: Growth Advisor proactively mentions referral performance when Growth Score drops below 40 (referral component contributes 5 points to Growth Score via `platform_engagement` → `referral_sent_14d` signal).

---

## 10. Referral Re-engagement Workflows (Conductor Processes)

Two new Conductor workflow processes using the referral funnel data:

### Process: Stuck Referral Recovery

Already seeded in Phase 2 (`conductor-solution-design-v3.md §3, line 3123`). This uses:
- **Trigger**: referral `status = 'Referred'` AND `created_at < now() - interval '7 days'`
- **Action**: Resend personalised email via Resend with referrer's name in subject line
- **Rate limit**: max 2 reminders, 7d apart (existing `last_reminder_sent_at` + `reminder_count` on referrals)

### Process: Dormant Referrer Re-engagement

New process for hub referrers going quiet:

```
Trigger:  pg_cron weekly scan — referrers who sent ≥5 referrals in prior 30d
          but 0 in last 30d

Action:   If user has Growth Advisor subscription → Growth Advisor nudge in-app
          If not → Resend email: "Your referral link is still active —
                                  you have [X] people who viewed it recently"

Autonomy: supervised (admin approves before first send)
```

---

## 11. Implementation Plan

### Phase 3 (Conductor Agents phase)

| Task | Estimate | Output |
|------|----------|--------|
| `referral_metrics_daily` table (migration 364) | 2h | DB schema + pg_cron populate job |
| `compute_referral_metrics()` pg_cron function | 4h | K coefficient at 4 segments, daily 06:00 |
| `query_referral_funnel` tool registration | 2h | Retention Monitor tool |
| Retention Monitor alert rules (referral subset) | 2h | 6 alert conditions + flag taxonomy |
| `GET /api/admin/referrals/analytics` | 6h | Signal tab data API |
| Admin Signal — Referral tab UI | 8h | New tab, 5 panels |
| **Phase 3 total** | **24h** | |

### Phase 4 (Network Intelligence page)

| Task | Estimate | Output |
|------|----------|--------|
| `referral_network_stats` materialized view (migration 365) | 2h | Hourly refresh |
| `GET /api/admin/network/stats` | 4h | Network Health tab data |
| `GET /api/admin/network/chain` | 4h | Recursive tree query |
| Chain Explorer UI (ReactFlow tree or D3) | 10h | Interactive referral tree |
| Network Health tab UI | 6h | K trend chart, hub nodes, depth |
| Referrers tab UI (top 50 table, dormant alert) | 4h | Sortable/filterable table |
| Dormant Referrer workflow process | 4h | Conductor Workflow definition |
| **Phase 4 total** | **34h** | |

### Migration Numbers

Following the established sequence (latest applied: 343, iPOM plan uses 344–352, Conductor Feature Intelligence specs use 353–363):

| Migration | Content |
|-----------|---------|
| 364 | `referral_metrics_daily` table + `compute_referral_metrics()` pg_cron |
| 365 | `referral_network_stats` materialized view + hourly refresh pg_cron |

---

## 12. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **K computed daily, not real-time** | K is a 30-day rolling metric — real-time adds no value; daily pg_cron at 06:00 avoids peak-hour load |
| **Attributed LTV ranks referrers** (not referral count) | Volume without quality inflates low-value referrers; an agent who refers 5 active tutors with 20 bookings each is more valuable than one with 50 ghost signups |
| **Ghost rate = no signup after 7 days** (not 14 or 30) | 80% of eventual signups happen within 48h of receiving the referral link; 7 days is generous and still catches real intent |
| **Network depth via recursive CTE** (not graph DB) | Depth rarely exceeds 4–5 hops in a two-sided marketplace; PostgreSQL recursive CTEs handle this fine without introducing a graph database dependency |
| **Chain Explorer is read-only in Phase 4** | Writing to the referral graph (reassigning attribution) is a legal/financial operation — requires separate GDPR-reviewed process |
| **Retention Monitor holds referral queries** (not a separate agent) | Referral health, cohort retention, and supply/demand are all signals of the same underlying metric: "is the platform growing sustainably?" One agent, one daily scan. |
| **CaaS score amplifies referral propensity** | Higher CaaS score = higher trust signal = tutors and clients more confident recommending the platform. K-coefficient segmentation by CaaS band (top quartile vs bottom quartile referrers) surfaces this effect. Referral Retention Monitor alerts should cross-reference CaaS health — a K decline coinciding with a CaaS score decline points to a trust problem, not a referral UX problem. |

---

## 13. Open Questions

| # | Question | Owner | Target |
|---|----------|-------|--------|
| Q1 | Should referral attribution be transferable? (e.g. if a referrer account is deleted, does their referred user lose attribution?) | Product | Phase 3 |
| Q2 | Do we surface the K coefficient publicly (transparency) or keep it internal? | Product | Phase 3 |
| Q3 | Should ghost-rate emails be auto-sent (supervised workflow) or always require admin approval? | Product | Phase 3 |
| Q4 | Should K be segmented by CaaS score band (top quartile vs bottom) to quantify the trust → referral link? | Analytics | Phase 4 |
| Q5 | Chain Explorer privacy: should admins be able to see full referral trees for any user, or only their own org? | Legal/GDPR | Phase 4 |

---

*Version 1.0 — Referral Intelligence spec. Feeds into `conductor-solution-design-v3.md` §4C-ii (Network Intelligence) and Phase 3 Retention Monitor agent.*
