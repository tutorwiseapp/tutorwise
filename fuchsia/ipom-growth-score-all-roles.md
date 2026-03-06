# iPOM — Growth Score: All Roles

**Status**: Approved — Resolves Q4 from ipom-solution-design-v2.md
**Date**: 2026-03-05
**Owner**: Product Team
**Applies to**: Phase 1 — `compute-growth-scores` pg_cron job

---

## 1. Overview

The Growth Score (0–100) is a composite signal that tells the platform and the Growth Agent how actively each user is growing their presence and value on Tutorwise. It is role-specific — what "growth" means differs for tutors, clients, agents, and organisations.

All roles share:
- **Same 0–100 range** with 4 components of 0–25 each
- **Same hourly pg_cron job** with role-specific SQL branching
- **Same `growth_scores` table** with a `role_type` column
- **Same thresholds** adjusted per role (see §6)
- **Same Growth Agent integration** — the agent reads the score and its components

### Design principles applied

1. **RFM weighting** — Recency, Frequency, Monetary are the three most predictive engagement signals across marketplace research. Each role's formula encodes RFM appropriate to that role.
2. **Time decay** — Recent activity scores higher (last 14/30 days). Stale activity still counts but at lower weight.
3. **Stack bonus** — Meeting higher thresholds stacks on top of lower ones (not replacing), so the score rises continuously rather than jumping.
4. **Actionable components** — Every component has a corresponding Growth Agent recommendation if the score on that component is low.
5. **Equal weighting (0–25 each)** — Avoids the need to set arbitrary weights between components upfront; recalibrate after 90 days of live data.

---

## 2. Tutor Growth Score (0–100) — Existing, Confirmed

As defined in ipom-solution-design-v2.md §10:

```
profile_completeness (0–25):
  profile_photo:          0 or 6
  bio_length >= 200:      0 or 5
  subjects_count >= 2:    0 or 5
  qualifications:         0 or 5
  response_time_set:      0 or 4

listing_performance (0–25):
  views_last_14d >= 10:        0 or 8
  views_last_14d >= 50:        +4 (stacked)
  booking_conversion > 5%:     0 or 8
  booking_conversion > 15%:    +5 (stacked)

earnings_trajectory (0–25):
  bookings_last_30d > 0:                   0 or 5
  bookings_30d >= bookings_prev_30d:       0 or 10
  bookings_30d > bookings_prev_30d * 1.1: +5 (stacked)
  active_stripe:                           0 or 5

platform_engagement (0–25):
  response_rate >= 80%:       0 or 8
  review_rate >= 60%:         0 or 7
  referral_sent_14d:          0 or 5
  lesson_rebooked_rate > 50%: 0 or 5

Thresholds:
  < 40: Growth Agent flags for intervention
  < 70: Below CaaS featured threshold
  Drop > 5pts in 7d: proactive nudge triggered
  Org avg < 50: org health concern
```

---

## 3. Client Growth Score (0–100) — New

**"Growth" for clients** = becoming a more active, loyal, and referral-generating user of the platform. A high-scoring client books regularly, retains their tutors, refers others, and keeps their profile complete so tutors can serve them well.

### 3.1 Formula

```
learning_activity (0–25):
  Booked at least 1 session in last 30d:         0 or 8
  Booked 3+ sessions in last 30d:                +5 (stacked, RFM frequency)
  Rebooked same tutor in last 60d:               0 or 7    (retention signal)
  Reviewed a session in last 60d:                0 or 5

referral_network (0–25):
  Referral link clicked by others in last 30d:   0 or 5
  At least 1 referral signup in last 60d:        0 or 10
  2+ referral signups in last 60d:               +5 (stacked)
  Referred signup made a booking:                +5 (stacked, quality referral)

profile_completeness (0–25):
  Full name + location set:                      0 or 5
  At least 1 student profile added:             0 or 5
  Subjects / learning goals set:                 0 or 5
  Availability preferences set:                  0 or 5
  Profile photo uploaded:                        0 or 5

platform_engagement (0–25):
  Response rate to tutor messages >= 80%:        0 or 8    (RFM recency proxy)
  Saved at least 1 listing (wiselist):           0 or 5
  Active Sage Pro subscriber:                    0 or 5    (AI engagement)
  No unresolved payment disputes:                0 or 4    (reliability)
  Last login within 14 days:                     0 or 3
```

### 3.2 Thresholds

| Score | Status | Action |
|-------|--------|--------|
| < 30 | At-risk of churn | Growth Agent proactive re-engagement nudge |
| 30–55 | Casual | Growth Agent booking frequency nudge |
| 55–80 | Active | No intervention |
| > 80 | Champion | Growth Agent referral campaign prompt |
| Drop > 5pts in 14d | Churn signal | Immediate proactive nudge |

### 3.3 Growth Agent recommendations by component

| Low component | Growth Agent recommendation |
|---|---|
| `learning_activity` | "You haven't booked a session in a while. Your tutor [name] has availability this week." |
| `referral_network` | "Share your referral link — you could earn up to £X for every tutor you refer." |
| `profile_completeness` | "Add your child's learning goals so tutors know how to help." |
| `platform_engagement` | "You have 3 unread messages from tutors." |

---

## 4. Agent Growth Score (0–100) — New

**"Growth" for agents** = expanding their managed tutor network, improving commission earnings, and growing their referral pipeline. Agents act as intermediaries — they recruit tutors, manage their listings, and earn commissions on bookings.

### 4.1 Formula

```
network_size (0–25):
  1+ active tutors managed (booking in last 30d):   0 or 8
  3+ active tutors managed:                         +8 (stacked)
  5+ active tutors managed:                         +9 (stacked)
  NOTE: "managed" = tutors linked via network/delegation

referral_performance (0–25):
  Referral link sent in last 30d:                    0 or 7
  At least 1 tutor referral signup in last 60d:      0 or 8
  Referral conversion rate >= 20%:                   0 or 5   (quality signal)
  Referral conversion rate >= 40%:                   +5 (stacked)

commission_trajectory (0–25):
  Commission earned in last 30d > 0:                 0 or 5
  Commission this month >= last month:               0 or 10  (stable)
  Commission this month > last month * 1.10:         +5 (stacked, growing)
  Stripe account active:                             0 or 5

platform_adoption (0–25):
  Agent profile complete (bio + headshot):            0 or 8
  Uses Growth Agent (session in last 30d):            0 or 8
  Avg review rating of managed tutors >= 4.3:        0 or 9   (quality proxy)
```

### 4.2 Thresholds

| Score | Status | Action |
|-------|--------|--------|
| < 35 | Inactive agent | Growth Agent re-engagement |
| 35–55 | Small network | Growth Agent tutor recruitment nudge |
| 55–75 | Growing | Growth Agent referral campaign prompt |
| > 75 | High-performing | Growth Agent commission optimisation tips |
| No managed tutors with bookings in 60d | Dormant agent | Admin exception flag |

### 4.3 Growth Agent recommendations by component

| Low component | Growth Agent recommendation |
|---|---|
| `network_size` | "You're currently managing 1 active tutor. Recruiting 2 more could triple your commission potential." |
| `referral_performance` | "Your referral link hasn't been clicked this month. Here's a personalised outreach template." |
| `commission_trajectory` | "Your earnings dipped this month. Your tutors [A, B] have no upcoming bookings." |
| `platform_adoption` | "Your profile is incomplete — tutors you recruit won't be able to see your agency details." |

---

## 5. Organisation Growth Score (0–100) — New

**"Growth" for organisations** = growing the organisation's collective business, team health, and platform adoption. Organisation scores are a hybrid: part aggregate of member tutor scores, part org-level signals.

### 5.1 Formula

```
team_health (0–25):
  Computed as: AVG(tutor Growth Score across active org members) × (25 / 100)
  Examples:
    All tutors avg score 80 → 80 × 0.25 = 20
    All tutors avg score 40 → 40 × 0.25 = 10
  Floor: if 0 active members → 0
  NOTE: Uses tutor Growth Score from growth_scores table, not recomputed.

revenue_trajectory (0–25):
  Org total bookings in last 30d > 0:                  0 or 5
  Org bookings this month >= last month:               0 or 10
  Org bookings this month > last month * 1.10:         +5 (stacked)
  At least 1 org-level Stripe payout this month:       0 or 5

referral_network (0–25):
  Org referral link sent in last 30d:                  0 or 8
  Org referral → signup in last 60d:                   0 or 10
  Referred signup made a booking:                      +7 (stacked)

platform_adoption (0–25):
  Org profile complete (name + bio + logo):            0 or 5
  Delegation structure set up (agents assigned):       0 or 8
  >= 50% of members had booking in last 30d:           0 or 7
  Org page has been saved/followed by >= 1 client:     0 or 5
```

### 5.2 Thresholds

| Score | Status | Action |
|-------|--------|--------|
| < 40 | Struggling org | Admin Intelligence flags; Growth Agent org-level intervention |
| 40–60 | Developing | Growth Agent team health nudges |
| 60–80 | Active | Standard monitoring |
| > 80 | High-performing | Growth Agent expansion campaign prompts |
| Team avg tutor score < 50 | Health concern | Admin Intelligence alert: "Org [X] team health declining" |
| 0 active members in 30d | Dormant org | Process Studio: Org Dormancy Re-engagement workflow triggers |

### 5.3 Growth Agent recommendations by component

| Low component | Growth Agent recommendation |
|---|---|
| `team_health` | "3 of your tutors have Growth Scores below 40. Here's what's holding them back." |
| `revenue_trajectory` | "Your org's bookings dropped 15% this month. Your most active tutor [name] has open slots." |
| `referral_network` | "Your organisation hasn't sent a referral this month. Refer a tutor and earn £X commission." |
| `platform_adoption` | "Set up delegation in your org — it lets your agents manage tutor listings directly." |

---

## 6. Shared Implementation

### 6.1 `growth_scores` Table Schema Update

The existing `growth_scores` table needs a `role_type` column:

```sql
-- Migration 341: Add role_type to growth_scores
ALTER TABLE growth_scores ADD COLUMN role_type text NOT NULL DEFAULT 'tutor'
  CHECK (role_type IN ('tutor', 'client', 'agent', 'organisation'));

ALTER TABLE growth_scores ADD COLUMN component_scores jsonb;
-- Stores: { "component_1": 18, "component_2": 12, "component_3": 20, "component_4": 15 }
-- Enables Growth Agent to explain which component is lowest

CREATE UNIQUE INDEX growth_scores_user_role_idx
  ON growth_scores (user_id, role_type);
```

### 6.2 pg_cron Job — `compute-growth-scores`

```sql
-- Runs hourly (or every 30 minutes during business hours)
-- pg_cron schedule: '*/30 * * * *'

-- Routes to role-specific CTE based on profiles.role_type
-- Each role CTE writes to growth_scores with appropriate role_type

-- Pseudocode:
WITH tutor_scores AS (
  SELECT user_id, 'tutor' AS role_type, [...tutor formula...] AS score,
    jsonb_build_object(
      'profile_completeness', profile_score,
      'listing_performance', listing_score,
      'earnings_trajectory', earnings_score,
      'platform_engagement', engagement_score
    ) AS component_scores
  FROM profiles WHERE role_type = 'tutor'
),
client_scores AS (
  SELECT user_id, 'client' AS role_type, [...client formula...] AS score,
    jsonb_build_object(
      'learning_activity', la_score,
      'referral_network', rn_score,
      'profile_completeness', pc_score,
      'platform_engagement', pe_score
    ) AS component_scores
  FROM profiles WHERE role_type = 'client'
),
agent_scores AS (
  SELECT user_id, 'agent' AS role_type, [...agent formula...] AS score, ...
  FROM profiles WHERE role_type = 'agent'
),
org_scores AS (
  SELECT cg.owner_id AS user_id, 'organisation' AS role_type, [...org formula...] AS score, ...
  FROM connection_groups cg WHERE cg.type = 'organisation'
),
all_scores AS (
  SELECT * FROM tutor_scores
  UNION ALL SELECT * FROM client_scores
  UNION ALL SELECT * FROM agent_scores
  UNION ALL SELECT * FROM org_scores
)
INSERT INTO growth_scores (user_id, role_type, score, component_scores, computed_at)
SELECT user_id, role_type, score, component_scores, NOW()
FROM all_scores
ON CONFLICT (user_id, role_type) DO UPDATE
  SET score = EXCLUDED.score,
      component_scores = EXCLUDED.component_scores,
      computed_at = EXCLUDED.computed_at;
```

### 6.3 Growth Agent Access

The Growth Agent reads the score + components to inform recommendations:

```typescript
// In Growth Agent tools
async function read_growth_score(userId: string) {
  const { data } = await supabase
    .from('growth_scores')
    .select('score, component_scores, computed_at, role_type')
    .eq('user_id', userId)
    .single();

  return {
    overall: data.score,
    components: data.component_scores,
    // Agent uses lowest component to prioritise recommendation
    lowest_component: Object.entries(data.component_scores)
      .sort(([,a], [,b]) => a - b)[0],
    computed_at: data.computed_at,
  };
}
```

### 6.4 Admin Intelligence Integration

The Admin Intelligence Agent uses org Growth Scores to detect health issues:

```sql
-- Weekly org health check
SELECT
  cg.name AS org_name,
  gs.score AS org_growth_score,
  gs.component_scores->>'team_health' AS team_health_score,
  gs.component_scores->>'revenue_trajectory' AS revenue_score
FROM connection_groups cg
JOIN growth_scores gs ON gs.user_id = cg.owner_id AND gs.role_type = 'organisation'
WHERE gs.score < 40
   OR (gs.component_scores->>'team_health')::int < 10  -- avg member score < 40
ORDER BY gs.score ASC;
```

---

## 7. Calibration Plan

### 7.1 Phase 1 Baseline (Months 1–3)

After the pg_cron job runs for 30 days:
1. Compute distribution of scores across all roles
2. Check: are thresholds hitting the right percentiles?
   - < 40 (intervention) should affect ~15–20% of users
   - < 70 (below featured) should affect ~40% of tutors
3. If distribution is skewed, adjust component weights (not formula structure)

### 7.2 Tutor Score Validation (Before Phase 1 completes)

The tutor formula is already written but not yet run on production data. Before Phase 1 ships:
- Run formula on last 90 days of data
- Validate: do high-scoring tutors have more bookings? (expected: yes, strong correlation)
- Validate: does score correctly identify "stuck" tutors who aren't getting bookings?

### 7.3 Non-Tutor Score Validation (Phase 2)

Client/Agent/Org formulas validated at Phase 2 entry:
- Run on production data for 30 days (shadow mode — compute but don't act on)
- Review top 10 and bottom 10 clients by score — do they match intuition?
- Adjust thresholds if needed before Growth Agent uses scores for recommendations

---

## 8. Open Questions Resolved

This document resolves **Q4** from ipom-solution-design-v2.md:

> "Growth Score for non-tutor roles — The Growth Score formula in §10 is defined for tutors. Client, agent, and organisation variants are sketched but not validated."

**Resolution**: Full formulas defined for all four roles. Validated against Tutorwise data model. Calibration plan in §7 ensures formulas are adjusted against real data before acting on them.

The non-tutor formulas are designed to be **built in Phase 1** (schema + pg_cron), **validated in shadow mode** (compute but don't act), and **activated in Phase 2** (Growth Agent reads scores for non-tutors).
