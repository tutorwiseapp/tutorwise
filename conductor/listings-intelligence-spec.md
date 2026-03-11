# Listings Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-08
**Status**: Draft — for review
**Author**: Architecture

Related: [`marketplace-intelligence-spec.md`](./marketplace-intelligence-spec.md) · [`caas-intelligence-spec.md`](./caas-intelligence-spec.md) · [`conductor-solution-design.md`](./conductor-solution-design.md)

> **Role in the platform**: Listings are the supply-side product. A tutor's listing is what appears in search results and what a client books. Listing quality (CaaS score, completeness, pricing) directly determines marketplace conversion and GMV.

---

## 1. Purpose

Listings are the unit of supply on the marketplace. Every booking traces back to a listing. Without Conductor intelligence on listings, quality degradation happens silently — listings go stale, pricing drifts out of market, active tutors leave listings incomplete, and high-converting listing types are underused. The Listing Quality Nudge workflow (already planned in conductor-solution-design.md) needs intelligence data to target the right listings at the right time.

**Three outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| Listing quality and supply-side health monitoring | Phase 3 | Market Intelligence Agent (Conductor) |
| Admin Listings intelligence panel | Phase 3 | `/admin/listings` (existing page extended) |
| Listing Quality Nudge workflow (enhancement) + Pricing Intelligence | Phase 3 | Conductor Workflow |

---

## 2. Listings System Recap

### 2A. Listing Types

```
listing_type values:
  'one-to-one'       — individual lesson
  'group-session'    — group class
  'workshop'         — one-off or series workshop
  'study-package'    — bundle of sessions (fixed)
  'subscription'     — recurring subscription
  'job-listing'      — tutor job post (not bookable)
  'request'          — client request (reverse marketplace)
```

### 2B. Key Schema Fields

```
listings:
  id, profile_id, listing_type, title, description
  subject, level (array), delivery_mode (array), work_location
  price_per_hour, status: 'active' | 'inactive' | 'archived' | 'draft'
  caas_score (denormalized — from profiles.caas_score)
  total_bookings, total_views (counters)
  featured, featured_order
  seo_eligible (boolean — controls SEO page generation)
  created_at, updated_at
```

### 2C. Key API Routes

- `GET /api/marketplace/search` — hybrid search across listings
- `GET /api/listings/[id]` — individual listing
- `GET /api/seo/eligible-listings` — SEO page eligible listings
- `POST /api/listings` — create listing (via form flows)

---

## 3. Market Intelligence Agent — Listings Tools

### Tool: `query_listing_health`

```typescript
{
  "name": "query_listing_health",
  "description": "Returns listing quality distribution, pricing benchmarks, stale listing detection, and supply-side completeness gaps",
  "parameters": {
    "days": { "type": "integer", "default": 30 }
  }
}
```

**Returns:**

```typescript
interface ListingHealthResponse {
  supply: {
    total_active: number;
    by_type: Record<string, number>;         // count per listing_type
    new_last_30d: number;
    archived_last_30d: number;
    draft_count: number;                      // unpublished drafts
    inactive_count: number;                   // deactivated but not archived
  };
  quality: {
    avg_caas_score: number;
    pct_above_70: number;
    pct_below_40: number;                     // poor quality
    missing_description: number;              // < 100 chars
    missing_delivery_mode: number;
    missing_level: number;
    zero_view_30d: number;                    // no traffic
    zero_booking_all_time: number;            // never booked
  };
  pricing: {
    avg_price_per_hour: number;               // platform-wide
    by_subject: Array<{
      subject: string;
      avg_price: number;
      min_price: number;
      max_price: number;
      listing_count: number;
    }>;
    pricing_outliers_high: number;            // >2SD above subject avg
    pricing_outliers_low: number;             // >2SD below subject avg
  };
  seo: {
    seo_eligible_count: number;
    seo_ineligible_active: number;            // active but not SEO-eligible
    avg_title_length: number;
  };
  alerts: ListingAlert[];
}

interface ListingAlert {
  type: 'quality_low' | 'stale_listings_high' | 'pricing_outliers_high'
      | 'zero_view_listings' | 'draft_backlog' | 'seo_eligibility_gap';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  affected_count?: number;
  action: string;
}
```

### Tool: `query_pricing_intelligence`

```typescript
{
  "name": "query_pricing_intelligence",
  "description": "Returns pricing distribution by subject/level/delivery mode, benchmark comparisons, and pricing opportunity signals",
  "parameters": {
    "subject": { "type": "string", "optional": true },
    "level": { "type": "string", "optional": true }
  }
}
```

**SQL:**

```sql
-- Pricing distribution with percentiles by subject + level
SELECT
  subject,
  level,
  COUNT(*) AS listing_count,
  ROUND(AVG(price_per_hour), 2) AS avg_price,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price_per_hour) AS p25,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY price_per_hour) AS median_price,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price_per_hour) AS p75,
  MIN(price_per_hour) AS min_price,
  MAX(price_per_hour) AS max_price,
  ROUND(STDDEV(price_per_hour), 2) AS price_stddev
FROM listings l
CROSS JOIN UNNEST(l.level) AS level
WHERE l.status = 'active'
  AND ($1::text IS NULL OR l.subject = $1)
  AND ($2::text IS NULL OR level = $2)
GROUP BY subject, level
HAVING COUNT(*) >= 3
ORDER BY listing_count DESC;
```

---

## 4. Alert Triggers

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| `quality_low` | avg_caas_score < 60 OR pct_below_40 > 20% | warning | Trigger Listing Quality Nudge workflow batch |
| `stale_listings_high` | >15% of active listings have 0 views in 30d | warning | Flag for review — may be stale or poorly priced |
| `pricing_outliers_high` | >10 listings priced >2SD above subject average | info | Surface pricing guidance to those tutors via Growth Advisor |
| `zero_view_listings` | >20 active listings with 0 views AND 0 bookings all time | warning | Suggest tutor deactivate or improve listing |
| `draft_backlog` | >30 listings in draft status for >14 days | info | Prompt tutors to complete and publish |
| `seo_eligibility_gap` | active listings with seo_eligible=false > 40% of total | info | Review eligibility criteria — organic opportunity being missed |

---

## 5. Listing Completeness Score

A lightweight completeness check distinct from CaaS — focused purely on listing-level fields that affect search visibility and conversion.

```
Listing Completeness (0–100):
  has_description (≥200 chars)  25 pts
  has_delivery_mode set         20 pts
  has_level set                 20 pts
  has_price_per_hour > 0        20 pts
  title_length ≥ 30 chars       10 pts
  seo_eligible = true            5 pts

Gate for Listing Quality Nudge: < 70 = nudge eligible
```

---

## 6. Database Table: `listings_platform_metrics_daily`

**Migration: 361**

```sql
CREATE TABLE listings_platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,

  -- Supply
  total_active integer NOT NULL DEFAULT 0,
  total_draft integer NOT NULL DEFAULT 0,
  total_inactive integer NOT NULL DEFAULT 0,
  new_last_30d integer NOT NULL DEFAULT 0,
  archived_last_30d integer NOT NULL DEFAULT 0,

  -- Quality
  avg_caas_score numeric(5,2),
  pct_above_70_caas numeric(5,2),
  pct_below_40_caas numeric(5,2),
  missing_description_count integer NOT NULL DEFAULT 0,
  zero_view_30d_count integer NOT NULL DEFAULT 0,
  zero_booking_alltime_count integer NOT NULL DEFAULT 0,
  avg_completeness_score numeric(5,2),

  -- Pricing
  avg_price_per_hour_pence integer,              -- stored in pence
  pricing_outliers_high integer NOT NULL DEFAULT 0,
  pricing_outliers_low integer NOT NULL DEFAULT 0,

  -- SEO
  seo_eligible_count integer NOT NULL DEFAULT 0,
  seo_ineligible_active_count integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON listings_platform_metrics_daily (metric_date DESC);

-- pg_cron: daily at 07:00 UTC
SELECT cron.schedule(
  'compute-listings-platform-metrics',
  '0 7 * * *',
  $$SELECT compute_listings_platform_metrics();$$
);
```

---

## 7. Admin Listings Intelligence Panel

New panel added to `/admin/listings`.

```
┌────────────────────────────────────────────────────────────────────┐
│  Listings Intelligence                        Last 30 days ▾       │
├────────────────────────────────────────────────────────────────────┤
│  Supply                  Quality                 Pricing            │
│  Active:    2,341        Avg CaaS:  71.4         Avg/hr:  £45.20   │
│  Drafts:    89           Below 40:  8.3%  ⚠     Outliers high: 14  │
│  Inactive:  234          No views:  127   ⚠     Outliers low: 7   │
├────────────────────────────────────────────────────────────────────┤
│  ⚠ 127 active listings with 0 views in 30 days — nudge review     │
│  ⚠ 8.3% of listings score below 40 CaaS — quality intervention    │
│  ✓ SEO eligibility: 87% of active listings are SEO-eligible        │
├────────────────────────────────────────────────────────────────────┤
│  Pricing by Subject (top 10)                                        │
│  Subject          Listings  Avg/hr   Median  P25    P75             │
│  GCSE Maths         234     £42.10   £40.00  £30    £55            │
│  A-Level Physics     89     £58.40   £55.00  £45    £75            │
│  ...                                                                │
└────────────────────────────────────────────────────────────────────┘
```

---

## 8. Conductor Workflow: Listing Quality Nudge (Enhancement)

The planned **Listing Quality Nudge** workflow (conductor-solution-design.md) is enhanced with the completeness score.

**Enhanced trigger logic:**

```
Trigger: Market Intelligence agent → quality_low alert
  OR: daily cron targeting listings with completeness < 70

Step 1: Query listings where completeness_score < 70 AND last_nudge_sent > 14 days ago
Step 2: For each listing:
  - Compute missing items (description too short, no delivery mode, etc.)
  - Generate personalised message: "Your listing 'GCSE Maths' is missing X and Y..."
Step 3: Send in-app notification to tutor
  - Include: "Improve your listing to increase your visibility in search"
  - Deep-link to: /listings/[id] (edit mode)
Step 4: Log nudge_sent_at to prevent re-nudge within 14 days
Step 5: After 7 days — check if listing improved → send follow-up if not
```

### Conductor Workflow: Pricing Intelligence Alert

```
Trigger: query_pricing_intelligence → pricing_outliers_high > 15
Step 1: Identify tutors with prices >2SD above subject median
Step 2: HITL Task: "14 tutors priced significantly above market for their subject"
  Admin actions: [Send pricing guide to flagged tutors] [Review individually] [Dismiss]
Step 3 (if approved): Growth Advisor sends personalised pricing comparison to each tutor
```

---

## 9. Growth Advisor — Listing Coaching

```
"Listing Performance" section (tutor context):
  - Active listings count + avg completeness score
  - Which listings have 0 views in 30d (dead weight alert)
  - Price vs subject median (over/under-priced signal)
  - Most-booked listing (success pattern)

Growth Advisor coaching:
  - If completeness < 70: "Your listing needs [X] to appear higher in search..."
  - If price > P75 for subject: "Your price is above the top 25% for [subject] — consider..."
  - If zero_view listing exists: "This listing hasn't been viewed — here's why..."
```

---

## 10. Phase Plan

### Phase 3 — Conductor Integration (est. 20h)

| Task | Effort |
|------|--------|
| Listing Completeness Score SQL function | 2h |
| `listings_platform_metrics_daily` + migration 361 | 2h |
| `compute_listings_platform_metrics()` pg_cron | 2h |
| `query_listing_health` tool in Market Intelligence | 3h |
| `query_pricing_intelligence` tool | 2h |
| Admin Listings Intelligence panel UI | 4h |
| `/api/admin/listings/intelligence` API route | 2h |
| Listing Quality Nudge enhancement + log | 2h |
| Pricing Intelligence Alert workflow | 1h |

### Phase 4 — Growth Advisor (est. 6h)

| Task | Effort |
|------|--------|
| Listing coaching in Growth Advisor skills | 3h |
| Pricing benchmark API for Growth Advisor tool | 3h |

**Total: 26h**

---

## 11. Migration Summary

| Migration | Description |
|-----------|-------------|
| 361 | `listings_platform_metrics_daily` table + `compute_listings_platform_metrics()` function + pg_cron |
