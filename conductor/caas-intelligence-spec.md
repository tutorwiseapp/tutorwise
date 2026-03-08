# CaaS Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-08
**Status**: Draft — for review
**Author**: Architecture

Related: [`referral-intelligence-spec.md`](./referral-intelligence-spec.md) · [`conductor-solution-design-v3.md`](./conductor-solution-design-v3.md)

---

## 1. Purpose

CaaS (Credibility as a Service) is Tutorwise's trust infrastructure — a 0–100 score computed for every user across six dimensions. It directly determines marketplace ranking, trust badge display, and Growth Score contribution. Without platform-level monitoring, CaaS scores can go stale, drift, or be gamed, silently degrading marketplace quality.

This spec defines:
- Platform-level CaaS health monitoring (Operations Monitor Agent)
- Score distribution analytics (Admin Signal — CaaS tab)
- CaaS-revenue correlation validation (proves the score is predictive)
- Intervention triggers for stale, declining, and fraudulent scores
- Growth Advisor CaaS coaching layer (user-facing)

---

## 2. CaaS Model Recap

### 2A. Score Architecture (Universal v6.0)

```
Final Score = (Σ Bucket × Weight) × Verification Multiplier

Buckets:
  Delivery     (40%)  — sessions completed, avg rating
  Credentials  (20%)  — qualifications, experience, certifications
  Network      (15%)  — connections, referrals made/received
  Trust        (10%)  — identity verified, phone, background check
  Digital      (10%)  — calendar sync, recording tools, integrations
  Impact        (5%)  — free help sessions delivered

Verification Multipliers:
  Provisional (onboarding done, not verified): × 0.70
  Identity verified:                           × 0.85
  Fully verified (all checks):                 × 1.00

Safety gate: Score = 0 if onboarding incomplete AND identity not verified.
```

### 2B. Score Bands

| Band | Range | Label | Badge colour |
|------|-------|-------|-------------|
| Outstanding | 90–100 | Top 5% | Gold |
| Excellent | 80–89 | Top 10% | Green |
| Very Good | 70–79 | — | Blue |
| Good | 60–69 | Verified | Purple |
| Average | 50–59 | — | Grey |
| Below Average | 40–49 | — | Orange |
| Poor | 0–39 | — | Red |

### 2C. Database

```
caas_scores           — primary score table (profile_id PK, total_score, score_breakdown jsonb, calculated_at)
profiles.caas_score   — denormalized integer, synced by trigger (used for marketplace sort)
caas_calculation_events — event queue for async recalculation
```

### 2D. Calculation Triggers

Score recalculates on: booking completed · review created · referral made/received · identity verified · listing published · student integration linked · profile graph edge created.

---

## 3. What Operations Monitor Watches

CaaS health belongs to the **Operations Monitor** specialist agent (daily 07:00) — it monitors platform health and anomalies, which includes supply quality measured by CaaS.

### New Tool: `query_caas_health`

```typescript
// Tool registration in Operations Monitor specialist_agents config
{
  "name": "query_caas_health",
  "description": "Returns platform-wide CaaS score distribution, stale score count, score velocity, and fraud signals",
  "parameters": {
    "role_type": { "type": "string", "enum": ["TUTOR", "CLIENT", "AGENT", "all"], "default": "all" },
    "period_days": { "type": "integer", "default": 30 }
  }
}
```

**Returns:**

```json
{
  "distribution": {
    "outstanding": { "count": 42, "pct": 4.8 },
    "excellent":   { "count": 87, "pct": 9.9 },
    "very_good":   { "count": 156, "pct": 17.8 },
    "good":        { "count": 203, "pct": 23.1 },
    "average":     { "count": 178, "pct": 20.3 },
    "below_avg":   { "count": 134, "pct": 15.3 },
    "poor":        { "count": 77, "pct": 8.8 }
  },
  "median_score": 61,
  "p25_score": 44,
  "p75_score": 74,
  "platform_avg": 58.4,
  "avg_delta_30d": +2.1,
  "stale_count": 48,         // scores not recalculated in >30 days for active users
  "zero_score_count": 31,    // active users with score = 0 (safety gate triggered)
  "provisional_pct": 22.4,   // % using 0.70 multiplier (identity not verified)
  "alert_flags": ["stale_scores_elevated", "below_avg_rising"]
}
```

### Alert Triggers

| Condition | Alert flag | Recommended action |
|-----------|------------|-------------------|
| Median score drops >3 pts MoM | `median_declining` | Investigate which bucket is dragging — may indicate booking completion rate falling |
| Stale scores > 5% of active users | `stale_scores_elevated` | Trigger batch recalculation via `caas_calculation_events` |
| Zero-score active users > 2% | `zero_score_spike` | Check if onboarding flow is broken for a cohort |
| Provisional % rising MoM | `verification_adoption_low` | Surface identity verification prompt more aggressively |
| Score band "Poor" rising week-over-week | `below_avg_rising` | Flag for tutor support intervention |
| Single bucket dropping platform-wide | `bucket_degrading` | Specific bucket anomaly — e.g. Delivery dropping = session completion rate falling |

---

## 4. Score Distribution Analytics

### 4A. New Table: `caas_platform_metrics_daily`

Stores a daily snapshot of the score distribution so we can trend over time:

```sql
CREATE TABLE caas_platform_metrics_daily (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date  date NOT NULL,
  role_type      text NOT NULL,          -- 'TUTOR' | 'CLIENT' | 'AGENT' | 'all'
  user_count     integer,
  median_score   numeric(5,1),
  avg_score      numeric(5,1),
  p25_score      numeric(5,1),
  p75_score      numeric(5,1),
  p90_score      numeric(5,1),
  outstanding_count integer,             -- 90+
  excellent_count   integer,             -- 80-89
  very_good_count   integer,             -- 70-79
  good_count        integer,             -- 60-69
  average_count     integer,             -- 50-59
  below_avg_count   integer,             -- 40-49
  poor_count        integer,             -- 0-39
  zero_score_count  integer,             -- = 0 (safety gate)
  stale_count       integer,             -- not recalculated in 30d for active users
  provisional_count integer,             -- using 0.70 multiplier
  avg_delivery_bucket   numeric(5,1),    -- per-bucket platform averages
  avg_credentials_bucket numeric(5,1),
  avg_network_bucket    numeric(5,1),
  avg_trust_bucket      numeric(5,1),
  avg_digital_bucket    numeric(5,1),
  avg_impact_bucket     numeric(5,1),
  created_at     timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX ON caas_platform_metrics_daily (snapshot_date, role_type);
CREATE INDEX ON caas_platform_metrics_daily (snapshot_date DESC);
```

Populated by pg_cron daily at 05:30 UTC (before Operations Monitor runs at 07:00):

```sql
CREATE OR REPLACE FUNCTION compute_caas_platform_metrics()
RETURNS void AS $$
DECLARE
  role text;
BEGIN
  FOREACH role IN ARRAY ARRAY['TUTOR', 'CLIENT', 'AGENT', 'all'] LOOP
    INSERT INTO caas_platform_metrics_daily (
      snapshot_date, role_type, user_count, median_score, avg_score,
      p25_score, p75_score, p90_score,
      outstanding_count, excellent_count, very_good_count, good_count,
      average_count, below_avg_count, poor_count, zero_score_count,
      stale_count, provisional_count
    )
    SELECT
      CURRENT_DATE,
      role,
      COUNT(*),
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cs.total_score),
      ROUND(AVG(cs.total_score)::numeric, 1),
      PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY cs.total_score),
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cs.total_score),
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY cs.total_score),
      COUNT(CASE WHEN cs.total_score >= 90 THEN 1 END),
      COUNT(CASE WHEN cs.total_score BETWEEN 80 AND 89 THEN 1 END),
      COUNT(CASE WHEN cs.total_score BETWEEN 70 AND 79 THEN 1 END),
      COUNT(CASE WHEN cs.total_score BETWEEN 60 AND 69 THEN 1 END),
      COUNT(CASE WHEN cs.total_score BETWEEN 50 AND 59 THEN 1 END),
      COUNT(CASE WHEN cs.total_score BETWEEN 40 AND 49 THEN 1 END),
      COUNT(CASE WHEN cs.total_score < 40 THEN 1 END),
      COUNT(CASE WHEN cs.total_score = 0 THEN 1 END),
      -- Stale: active user (has booking in 60d) but score not refreshed in 30d
      COUNT(CASE
        WHEN cs.calculated_at < now() - interval '30 days'
         AND EXISTS (
           SELECT 1 FROM bookings b
           WHERE (b.tutor_profile_id = cs.profile_id OR b.client_profile_id = cs.profile_id)
             AND b.created_at > now() - interval '60 days'
         ) THEN 1
      END),
      COUNT(CASE
        WHEN (cs.score_breakdown->>'verification_status') = 'provisional' THEN 1
      END)
    FROM caas_scores cs
    JOIN profiles p ON p.id = cs.profile_id
    WHERE (role = 'all' OR cs.role_type = role)
    ON CONFLICT (snapshot_date, role_type) DO UPDATE
      SET user_count = EXCLUDED.user_count,
          median_score = EXCLUDED.median_score,
          -- ... all other fields
          created_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule('compute-caas-platform-metrics', '30 5 * * *',
  'SELECT compute_caas_platform_metrics()'
);
```

---

## 5. CaaS–Revenue Correlation

The most important validation question: **does a higher CaaS score predict more bookings and revenue?**

This validates that CaaS is measuring the right things. If high-CaaS tutors don't earn more, the metric needs recalibration.

### 5A. Correlation Query

```sql
-- CaaS score band vs booking volume and revenue (last 90 days)
WITH score_bands AS (
  SELECT
    cs.profile_id,
    cs.total_score,
    CASE
      WHEN cs.total_score >= 90 THEN 'Outstanding'
      WHEN cs.total_score >= 80 THEN 'Excellent'
      WHEN cs.total_score >= 70 THEN 'Very Good'
      WHEN cs.total_score >= 60 THEN 'Good'
      WHEN cs.total_score >= 50 THEN 'Average'
      WHEN cs.total_score >= 40 THEN 'Below Average'
      ELSE 'Poor'
    END AS band,
    CASE
      WHEN cs.total_score >= 90 THEN 1
      WHEN cs.total_score >= 80 THEN 2
      WHEN cs.total_score >= 70 THEN 3
      WHEN cs.total_score >= 60 THEN 4
      WHEN cs.total_score >= 50 THEN 5
      WHEN cs.total_score >= 40 THEN 6
      ELSE 7
    END AS band_rank
  FROM caas_scores cs
  WHERE cs.role_type = 'TUTOR'
),
booking_stats AS (
  SELECT
    b.tutor_profile_id AS profile_id,
    COUNT(b.id)                                AS bookings_90d,
    SUM(b.amount)                              AS revenue_90d,
    AVG(r.rating)                              AS avg_rating_90d,
    COUNT(DISTINCT b.client_profile_id)        AS unique_clients_90d
  FROM bookings b
  LEFT JOIN reviews r ON r.booking_id = b.id
  WHERE b.created_at > now() - interval '90 days'
    AND b.status = 'Completed'
  GROUP BY b.tutor_profile_id
)
SELECT
  sb.band,
  sb.band_rank,
  COUNT(sb.profile_id)                              AS tutor_count,
  ROUND(AVG(bs.bookings_90d), 1)                    AS avg_bookings_per_tutor,
  ROUND(AVG(bs.revenue_90d), 2)                     AS avg_revenue_per_tutor,
  ROUND(AVG(bs.unique_clients_90d), 1)              AS avg_unique_clients,
  ROUND(AVG(bs.avg_rating_90d), 2)                  AS avg_rating,
  -- conversion: tutors with at least 1 booking / all tutors in band
  ROUND(
    COUNT(CASE WHEN bs.bookings_90d > 0 THEN 1 END)::float
    / NULLIF(COUNT(sb.profile_id), 0) * 100, 1
  )                                                  AS active_pct
FROM score_bands sb
LEFT JOIN booking_stats bs ON bs.profile_id = sb.profile_id
GROUP BY sb.band, sb.band_rank
ORDER BY sb.band_rank;
```

**Expected result** (healthy CaaS model):

| Band | Avg bookings/tutor | Avg revenue/tutor | Active % |
|------|--------------------|-------------------|----------|
| Outstanding | 12.4 | £892 | 91% |
| Excellent | 9.1 | £654 | 84% |
| Very Good | 6.8 | £489 | 76% |
| Good | 4.2 | £302 | 68% |
| Average | 2.1 | £151 | 55% |
| Below Average | 0.8 | £57 | 38% |
| Poor | 0.2 | £14 | 18% |

If this monotonicity breaks (e.g. "Good" earns more than "Excellent"), it signals a bucket weight calibration problem. The Operations Monitor should alert when correlation degrades.

### 5B. Correlation Alert

```
If corr_coefficient(caas_score, revenue_90d) < 0.5:
  alert_flag = "caas_revenue_correlation_weak"
  recommended_action = "CaaS model may need recalibration — bucket weights review required"
```

Computed monthly by pg_cron, stored in `caas_platform_metrics_daily` as `revenue_correlation_coeff`.

---

## 6. Stale Score Detection & Recovery

Active users whose scores haven't been recalculated in 30+ days may have incorrect scores — their bookings, verifications, or reviews happened but the event queue was missed.

### 6A. Stale Score Recovery Query

```sql
-- Find active users with stale CaaS scores
SELECT
  cs.profile_id,
  cs.total_score                              AS stale_score,
  cs.calculated_at,
  EXTRACT(DAYS FROM now() - cs.calculated_at) AS days_stale,
  COUNT(b.id)                                 AS bookings_since_recalc,
  COUNT(r.id)                                 AS reviews_since_recalc
FROM caas_scores cs
JOIN profiles p ON p.id = cs.profile_id
LEFT JOIN bookings b ON (b.tutor_profile_id = cs.profile_id OR b.client_profile_id = cs.profile_id)
  AND b.created_at > cs.calculated_at
LEFT JOIN reviews r ON r.reviewee_profile_id = cs.profile_id
  AND r.created_at > cs.calculated_at
WHERE cs.calculated_at < now() - interval '30 days'
  AND EXISTS (
    SELECT 1 FROM bookings b2
    WHERE (b2.tutor_profile_id = cs.profile_id OR b2.client_profile_id = cs.profile_id)
      AND b2.created_at > now() - interval '60 days'
  )
GROUP BY cs.profile_id, cs.total_score, cs.calculated_at
ORDER BY days_stale DESC, bookings_since_recalc DESC;
```

### 6B. Batch Recalculation

When Operations Monitor flags `stale_scores_elevated`, the Conductor workflow triggers:

```sql
-- Insert stale profiles into the event queue for recalculation
INSERT INTO caas_calculation_events (profile_id, created_at)
SELECT cs.profile_id, now()
FROM caas_scores cs
WHERE cs.calculated_at < now() - interval '30 days'
  AND EXISTS (
    SELECT 1 FROM bookings b
    WHERE (b.tutor_profile_id = cs.profile_id OR b.client_profile_id = cs.profile_id)
      AND b.created_at > now() - interval '60 days'
  )
ON CONFLICT (profile_id) DO NOTHING;
```

This feeds the existing event-driven recalculation pipeline (`POST /api/caas/calculate`).

---

## 7. Easy Win Detection at Scale (Platform-Wide)

The dashboard widget shows per-user "Easy Wins". At the platform level, we can identify which buckets offer the most uplift across all users — informing what improvements to prioritise in UX and product.

### 7A. Easy Win Opportunity Query

```sql
-- For each bucket, sum the max additional points available across all TUTOR profiles
-- A bucket is an "Easy Win" if the gap (100 - bucket_raw_score) is large for many users

SELECT
  bucket_name,
  COUNT(*) AS users_with_gap,
  ROUND(AVG(gap), 1) AS avg_gap,
  ROUND(AVG(gap) * COUNT(*) / 100.0, 0) AS total_points_unlockable
FROM (
  SELECT
    cs.profile_id,
    'trust'    AS bucket_name,
    100 - COALESCE((cs.score_breakdown->'raw_buckets'->>'trust')::int, 0) AS gap
  FROM caas_scores cs WHERE cs.role_type = 'TUTOR'
  UNION ALL
  SELECT cs.profile_id, 'digital',
    100 - COALESCE((cs.score_breakdown->'raw_buckets'->>'digital')::int, 0)
  FROM caas_scores cs WHERE cs.role_type = 'TUTOR'
  UNION ALL
  SELECT cs.profile_id, 'network',
    100 - COALESCE((cs.score_breakdown->'raw_buckets'->>'network')::int, 0)
  FROM caas_scores cs WHERE cs.role_type = 'TUTOR'
  -- ... credentials, impact
) gaps
WHERE gap > 20  -- only meaningful gaps
GROUP BY bucket_name
ORDER BY total_points_unlockable DESC;
```

This answers: "If we make it easier for tutors to verify identity, how many total score points unlock across the platform?" → prioritises product improvements.

---

## 8. Admin Signal — CaaS Tab (Phase 3)

Extend `/admin/signal` with a **CaaS** tab. Read-only analytics — no agent action.

### Tab Layout

```
/admin/signal  [Articles] [Funnel] [Attribution] [Listings] [Referral] [CaaS ← NEW]

CaaS TAB
┌──────────────────────────────────────────────────────────────────────────────┐
│  PLATFORM SCORE HEALTH              [All roles ▾]  [Last 30 days ▾]         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Median: 61   P25: 44   P75: 74   Platform avg: 58.4   ▲ +2.1 pts this month│
│  Stale scores: 48 active users (5.5%)  ⚠ above 5% threshold               │
│  Not verified (0.70×): 22%   Zero-score: 31 users                           │
└──────────────────────────────────────────────────────────────────────────────┘

SCORE DISTRIBUTION (bar chart)
  Poor      ████░░░░░░░░░░░░░░░░  9%   (77)
  Below Avg ████████░░░░░░░░░░░░ 15%  (134)
  Average   ████████████░░░░░░░░ 20%  (178)
  Good      ███████████████░░░░░ 23%  (203)
  Very Good ████████████░░░░░░░░ 18%  (156)
  Excellent ███████░░░░░░░░░░░░░ 10%   (87)
  Outstanding ███░░░░░░░░░░░░░░░  5%   (42)

SCORE DISTRIBUTION TREND (sparkline — median, 6 months)
  Oct 55 | Nov 57 | Dec 58 | Jan 59 | Feb 60 | Mar 61 ▲

CaaS–REVENUE CORRELATION
  Correlation coefficient (score vs 90d revenue): r = 0.71  ✅ Strong
  [View by Band] → table matching §5A above

BUCKET HEALTH (platform avg per bucket — tutors)
┌─────────────────┬─────────────┬────────────────────────────────────┐
│ Bucket          │ Platform avg│ Trend                              │
├─────────────────┼─────────────┼────────────────────────────────────┤
│ Delivery (40%)  │ 64          │ ▲ +1.2 pts (bookings up)           │
│ Credentials (20%)│ 72         │ → stable                           │
│ Network (15%)   │ 48          │ ▼ -2.1 pts (referral velocity drop) │
│ Trust (10%)     │ 51          │ ▲ +3.4 pts (ID verify push worked) │
│ Digital (10%)   │ 38          │ ▼ -1.0 pts (calendar sync usage down)│
│ Impact (5%)     │ 29          │ → stable                           │
└─────────────────┴─────────────┴────────────────────────────────────┘

EASY WIN OPPORTUNITIES (platform-wide)
  1. Trust bucket: 412 tutors could gain avg 22 pts → verify identity
  2. Digital bucket: 318 tutors could gain avg 31 pts → sync calendar
  3. Network bucket: 267 tutors could gain avg 18 pts → send referral

STALE SCORES
  48 active tutors haven't had scores recalculated in 30+ days
  [Trigger Batch Recalculation] → inserts into caas_calculation_events
```

### API Route

```typescript
// GET /api/admin/caas/analytics
// Query params: role_type (default: all), period_days (default: 30)

interface CaaSAnalyticsResponse {
  summary: {
    median: number;
    avg: number;
    p25: number;
    p75: number;
    avg_delta_30d: number;
    stale_count: number;
    stale_pct: number;
    zero_score_count: number;
    provisional_pct: number;
  };
  distribution: Record<ScoreBand, { count: number; pct: number }>;
  trend: Array<{ month: string; median: number; avg: number }>;  // 6-month
  by_role: Array<{
    role_type: string;
    user_count: number;
    median: number;
    avg: number;
  }>;
  bucket_health: Array<{
    bucket: string;
    weight: number;
    platform_avg: number;
    trend_delta: number;
  }>;
  easy_wins: Array<{
    bucket: string;
    users_with_gap: number;
    avg_gap: number;
    total_points_unlockable: number;
  }>;
  correlation: {
    coefficient: number;
    by_band: Array<{
      band: string;
      avg_bookings: number;
      avg_revenue: number;
      active_pct: number;
    }>;
  };
  stale_profiles: Array<{
    profile_id: string;
    full_name: string;
    stale_score: number;
    days_stale: number;
    bookings_since_recalc: number;
  }>;
}
```

---

## 9. Growth Advisor — CaaS Coaching (User-Facing)

The user-facing Growth Advisor (`/growth`) already surfaces CaaS Easy Wins in the dashboard widget. The coaching layer adds:

### 9A. Score Trajectory Narrative

```
Growth Advisor analysis (in-session):

"Your CaaS score is 62 — Good tier, putting you in the top 37% of tutors.
 Your two biggest gaps right now:

 Digital bucket (38/100 — dragging your total score by ~8 pts):
 You haven't synced Google Calendar. Booking clients often check availability
 directly — tutors with calendar synced get 2.3× more spontaneous bookings.
 → [Sync Google Calendar] (2 minutes)

 Trust bucket (51/100 — room for another 5 pts):
 Your background check is pending. Once complete, your score upgrades from
 0.85× to 1.0× multiplier — gaining ~9 pts across all buckets instantly.
 → [Check verification status]"
```

### 9B. Percentile Benchmarking

```typescript
// Injected into Growth Advisor session via PlatformUserContext
const caasContext = {
  score: 62,
  percentile: 63,   // beats 63% of tutors in same role
  band: 'Good',
  platform_median: 61,
  top_bucket: 'credentials',    // highest performing bucket
  weakest_bucket: 'digital',    // lowest — biggest opportunity
  easy_win_pts: 39,             // pts available from top 3 easy wins
  multiplier: 0.85,             // current verification status
  multiplier_upgrade_pts: 9     // pts gained from full verification
}
```

### 9C. Score Impact on Marketplace Visibility

```
"Your CaaS score (62) qualifies you for the 'Verified' trust badge in search results.
 Tutors with scores above 75 (Very Good) display the 'Top 10%' badge and appear
 ~40% higher in marketplace search rankings.

 Current gap to Top 10%: 13 points.
 Your fastest path: sync Google Calendar (+8 pts) + complete background check (+5 pts)."
```

---

## 10. Conductor Workflow: CaaS Stale Score Recovery

New Conductor Workflow Process triggered by the Operations Monitor agent flag:

```
Name: CaaS Stale Score Recovery
Trigger: Operations Monitor flags stale_count > 5% of active users
Autonomy: supervised (admin approves batch size before insert)

Steps:
  1. Query stale profiles (SQL in §6A)
  2. Show admin: "N profiles with stale scores — oldest: X days stale"
  3. Admin approves (or adjusts batch size)
  4. Insert into caas_calculation_events
  5. Monitor: poll event queue until processed_at filled for all inserted
  6. Report: "N scores recalculated. Median before: X → after: Y"
```

---

## 11. Implementation Plan

### Phase 3 (Conductor Agents phase)

| Task | Estimate | Output |
|------|----------|--------|
| `caas_platform_metrics_daily` table (migration 355) | 2h | Schema + pg_cron 05:30 |
| `compute_caas_platform_metrics()` function | 4h | All role types + bucket averages |
| `query_caas_health` tool registration | 2h | Operations Monitor tool |
| CaaS alert rules (6 conditions) | 2h | Operations Monitor system_prompt additions |
| `GET /api/admin/caas/analytics` | 6h | Signal tab data API |
| Admin Signal — CaaS tab UI | 8h | Distribution chart, bucket health, easy wins, stale table |
| Batch recalculation endpoint `POST /api/admin/caas/recalculate-stale` | 2h | Inserts into event queue |
| CaaS Stale Recovery Conductor Workflow | 4h | Workflow definition + handler |
| **Phase 3 total** | **30h** | |

### Phase 4

| Task | Estimate | Output |
|------|----------|--------|
| Growth Advisor CaaS coaching (percentile, multiplier narrative, marketplace impact) | 6h | In-session coaching content |
| CaaS–Revenue correlation monthly pg_cron + coefficient tracking | 3h | Monthly validation |
| Easy Win platform prioritisation report (admin, quarterly) | 4h | Informs product roadmap |
| **Phase 4 total** | **13h** | |

### Migration Numbers

| Migration | Content |
|-----------|---------|
| 355 | `caas_platform_metrics_daily` table + `compute_caas_platform_metrics()` pg_cron |
| 356 | CaaS batch recalculation admin endpoint + Stale Recovery workflow process seed |

---

## 12. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **CaaS health = Operations Monitor** (not Retention Monitor) | CaaS measures supply quality and platform trust health — it's an operations signal, not a retention/funnel signal. Operations Monitor already watches at-risk tutors and platform anomalies. |
| **Daily snapshot table** (`caas_platform_metrics_daily`) rather than real-time view | CaaS scores change slowly; daily snapshots enable 6-month trend analysis without expensive real-time aggregation |
| **Correlation validation monthly** (not daily) | Revenue correlation is a lagging indicator — daily computation is noise; monthly is the right cadence |
| **Stale threshold = 30 days for active users** (not all users) | An inactive user's stale score is harmless; only active users (bookings in 60d) need fresh scores for accurate marketplace ranking |
| **Batch recalculation = supervised** (admin approves batch size) | A large batch could spike server load; admin oversight prevents accidental DoS on the calculation endpoint |
| **Easy Wins at platform level** inform product roadmap | Per-user easy wins already exist (dashboard widget); the platform-level aggregation is what drives decisions about which verification UX to prioritise |

---

## 13. Open Questions

| # | Question | Owner | Target |
|---|----------|-------|--------|
| Q1 | Should CaaS score be visible to clients on tutor profiles (currently hidden for clients)? | Product | Phase 3 |
| Q2 | Should the correlation coefficient be public (transparency / trust signal) or internal only? | Product | Phase 3 |
| Q3 | Gaming prevention: can a user rapidly create and delete connections to inflate the Network bucket? | Engineering | Phase 3 |
| Q4 | Organisation CaaS: should org score affect individual member marketplace ranking? | Product | Phase 4 |
| Q5 | Version migration: when Universal v7.0 is released, how do we handle historical score comparison? | Engineering | Future |

---

*Version 1.0 — CaaS Intelligence spec. Operations Monitor agent (Conductor) holds `query_caas_health`. Admin Signal CaaS tab. Phase 3 migration: 355–356.*
