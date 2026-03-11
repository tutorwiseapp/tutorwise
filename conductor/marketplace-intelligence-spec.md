# Marketplace & Home Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-08
**Status**: Draft — for review
**Author**: Architecture

Related: [`signal-intelligence-spec.md`](./signal-intelligence-spec.md) · [`seo-intelligence-spec.md`](./seo-intelligence-spec.md) · [`referral-intelligence-spec.md`](./referral-intelligence-spec.md) · [`conductor-solution-design.md`](./conductor-solution-design.md)

> **Go-to-market pipeline**: Marketplace is Stage 4 — organic traffic from Resources/SEO lands here, Signal attributes it, and this is where search intent converts to a booking enquiry. The Home page is the entry point for direct traffic and referral links.

---

## 1. Purpose

The marketplace is where supply (tutors, AI agents, organisations) meets demand (clients searching for help). It is the primary conversion surface: a user who lands from a Resources article, a referral link, or a direct search must find a relevant result and initiate a booking. Without Conductor intelligence, the marketplace operates blind to supply/demand imbalances, quality degradation, and search funnel drop-offs.

The Home page (`/`) is the first impression for direct visitors and referral traffic. Its conversion (Home → Search → Listing → Booking) is the core user journey.

**Three outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| Marketplace health monitoring (supply/demand, search funnel) | Phase 3 | Market Intelligence Agent + Retention Monitor |
| Admin Signal Marketplace tab | Phase 3 | `/admin/signal` (new tab) |
| Listing Quality Nudge workflow (existing) + intelligence layer | Phase 3 | Conductor Workflow |

---

## 2. Marketplace System Recap

### 2A. Search Architecture

```
GET /api/marketplace/search
  ↓ with ?query=        → Hybrid path: generateEmbedding() + search_listings_hybrid RPC
  ↓ without ?query=     → Structured-only: SQL filters on listings + profiles

Results:
  listings[]            — individual lesson/service listings
  profiles[]            — tutor profiles
  organisations[]       — org profiles
  aiAgents[]            — AI agent profiles
```

### 2B. Key Tables

```
listings:
  id, profile_id, listing_type, subject, level, price_per_hour
  delivery_mode (array), work_location, status
  caas_score (denormalized from profiles)
  created_at, updated_at

profiles:
  id, full_name, role, caas_score, status
  avg_rating, total_reviews, subjects, levels
  referred_by_profile_id, agent_id

ai_agents:
  id, name, display_name, subject, skills
  price_per_hour, status, avg_rating, total_sessions

seo_profiles / seo_listings (SEO-eligible, generated pages)
```

### 2C. Hybrid Search RPCs

```sql
search_listings_hybrid(query_embedding, filters, limit, offset)
  → hybrid score = (0.7 × vector_similarity) + (0.3 × text_rank)

search_profiles_hybrid(query_embedding, filters, limit, offset)
search_organisations_hybrid(query_embedding, filters, limit, offset)
```

### 2D. Marketplace Insights

```typescript
GET /api/marketplace/insights
  → total_tutors, total_listings, avg_rating, avg_price_per_hour
  → top_subjects, top_locations, top_delivery_modes

GET /api/marketplace/recommendations
  → personalised results (collaborative filtering, not yet ML)

GET /api/marketplace/match-score
  → listing–client compatibility score
```

### 2E. Home Page (`/`)

The home page serves:
- Hero with search bar → `/marketplace`
- Featured tutors / featured AI agents
- Subject category quick-links
- Trust signals (review count, tutor count)
- Referral entry point (referral codes in URL `/ref/[code]`)

---

## 3. Market Intelligence Agent — Marketplace Tools

### Tool: `query_marketplace_health`

```typescript
{
  "name": "query_marketplace_health",
  "description": "Returns marketplace supply/demand balance, listing quality distribution, search conversion funnel, and AI agent adoption metrics",
  "parameters": {
    "days": { "type": "integer", "default": 30 }
  }
}
```

**Returns:**

```typescript
interface MarketplaceHealthResponse {
  supply: {
    active_tutors: number;
    active_listings: number;
    active_ai_agents: number;
    active_organisations: number;
    new_tutors_last_30d: number;
    new_listings_last_30d: number;
    tutors_with_zero_bookings_90d: number; // idle supply
    listings_with_zero_views_30d: number;  // dead listings
  };
  demand: {
    marketplace_searches_30d: number;
    search_with_results_pct: number;  // % of searches returning ≥1 result
    zero_result_queries: number;      // demand signals with no supply match
    profile_views_30d: number;
    listing_views_30d: number;
    saved_searches_count: number;     // intent signals
  };
  conversion: {
    search_to_listing_view_rate: number;  // % searches → listing view
    listing_view_to_enquiry_rate: number; // % listing views → booking initiated
    home_to_search_rate: number;          // % home visits → search
    avg_sessions_to_first_booking: number;
  };
  quality: {
    avg_listing_caas_score: number;
    pct_listings_above_70_caas: number;
    avg_tutor_rating: number;
    pct_tutors_with_zero_reviews: number; // new tutor trust gap
    incomplete_profiles_pct: number;       // profiles missing key fields
  };
  ai_adoption: {
    ai_agent_views_30d: number;
    ai_agent_sessions_30d: number;
    ai_to_human_ratio: number;    // AI sessions / human bookings
    top_ai_subjects: string[];
  };
  alerts: MarketplaceAlert[];
}

interface MarketplaceAlert {
  type: 'supply_demand_gap' | 'zero_result_queries_high' | 'listing_quality_low'
      | 'idle_supply_high' | 'conversion_rate_low' | 'ai_adoption_stalled'
      | 'trust_gap' | 'home_bounce_high';
  severity: 'info' | 'warning' | 'critical';
  subject?: string;
  message: string;
  action: string;
}
```

### Tool: `query_supply_demand_gap` (also used by Retention Monitor)

```typescript
{
  "name": "query_supply_demand_gap",
  "description": "Identifies subjects/levels where search demand exceeds available supply, and vice versa",
  "parameters": {
    "days": { "type": "integer", "default": 30 },
    "min_search_volume": { "type": "integer", "default": 5 }
  }
}
```

**SQL:**

```sql
-- Demand: search queries (approximated from marketplace search logs or listing views by subject)
-- Supply: active listings by subject+level

WITH demand AS (
  SELECT
    subject,
    level,
    COUNT(*) AS search_count
  FROM marketplace_search_events     -- table to be created (migration 359)
  WHERE created_at >= now() - ($1 || ' days')::interval
  GROUP BY subject, level
),
supply AS (
  SELECT
    subject,
    level,
    COUNT(*) AS listing_count,
    AVG(price_per_hour) AS avg_price,
    AVG(COALESCE(p.avg_rating, 0)) AS avg_rating
  FROM listings l
  JOIN profiles p ON l.profile_id = p.id
  WHERE l.status = 'active'
  GROUP BY subject, level
)
SELECT
  COALESCE(d.subject, s.subject) AS subject,
  COALESCE(d.level, s.level) AS level,
  COALESCE(d.search_count, 0) AS demand_count,
  COALESCE(s.listing_count, 0) AS supply_count,
  CASE
    WHEN COALESCE(s.listing_count, 0) = 0 AND COALESCE(d.search_count, 0) > $2
      THEN 'supply_gap'     -- high demand, no supply
    WHEN COALESCE(d.search_count, 0) < 3 AND COALESCE(s.listing_count, 0) > 10
      THEN 'oversupplied'   -- high supply, low demand
    ELSE 'balanced'
  END AS gap_type,
  s.avg_price,
  s.avg_rating
FROM demand d
FULL OUTER JOIN supply s USING (subject, level)
WHERE COALESCE(d.search_count, 0) > $2 OR COALESCE(s.listing_count, 0) > 0
ORDER BY demand_count DESC;
```

---

## 4. Alert Triggers

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| `supply_demand_gap` | Any subject has search_count > 20 AND listing_count = 0 | critical | Trigger tutor recruitment campaign for that subject |
| `zero_result_queries_high` | >10% of searches return 0 results | warning | Review search filters + add suggested alternatives |
| `listing_quality_low` | avg_listing_caas_score drops below 60 | warning | Trigger Listing Quality Nudge workflow batch |
| `idle_supply_high` | >25% of active tutors have 0 bookings in 90d | warning | Flag to Retention Monitor for outreach |
| `conversion_rate_low` | `listing_view_to_enquiry_rate` < 5% for 7+ days | warning | Investigate listing quality + pricing |
| `ai_adoption_stalled` | `ai_to_human_ratio` < 0.05 (1 AI session per 20 bookings) for 14d | info | Review AI agent visibility in search results |
| `trust_gap` | `pct_tutors_with_zero_reviews` > 40% | warning | Trigger review collection prompts for new tutors |
| `home_bounce_high` | `home_to_search_rate` < 30% | warning | Review home page hero + subject quick-links |

---

## 5. Database Table: `marketplace_platform_metrics_daily`

**Migration: 359**

```sql
CREATE TABLE marketplace_platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,

  -- Supply
  active_tutors integer NOT NULL DEFAULT 0,
  active_listings integer NOT NULL DEFAULT 0,
  active_ai_agents integer NOT NULL DEFAULT 0,
  new_tutors_30d integer NOT NULL DEFAULT 0,
  idle_supply_count integer NOT NULL DEFAULT 0,       -- tutors with 0 bookings 90d
  dead_listings_count integer NOT NULL DEFAULT 0,     -- listings with 0 views 30d

  -- Demand
  profile_views_30d integer NOT NULL DEFAULT 0,
  listing_views_30d integer NOT NULL DEFAULT 0,
  saved_searches_count integer NOT NULL DEFAULT 0,

  -- Conversion (populated from analytics events if tracked)
  search_to_listing_rate numeric(5,4),
  listing_to_enquiry_rate numeric(5,4),

  -- Quality
  avg_listing_caas_score numeric(5,2),
  pct_listings_above_70 numeric(5,2),
  avg_tutor_rating numeric(4,2),
  pct_tutors_zero_reviews numeric(5,2),

  -- AI adoption
  ai_agent_sessions_30d integer NOT NULL DEFAULT 0,
  ai_to_human_ratio numeric(6,4),

  -- Supply/demand gap count
  subject_gaps_count integer NOT NULL DEFAULT 0,      -- subjects with supply_gap

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON marketplace_platform_metrics_daily (metric_date DESC);

-- pg_cron: daily at 06:00 UTC
SELECT cron.schedule(
  'compute-marketplace-platform-metrics',
  '0 6 * * *',
  $$SELECT compute_marketplace_platform_metrics();$$
);
```

---

## 6. Search Event Logging

To power supply/demand gap analysis and search funnel analytics, marketplace search queries should be logged.

**Append to migration 359:**

```sql
CREATE TABLE marketplace_search_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  query text,
  subject text,
  level text,
  delivery_mode text[],
  results_count integer,
  is_zero_result boolean GENERATED ALWAYS AS (results_count = 0) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON marketplace_search_events (created_at DESC);
CREATE INDEX ON marketplace_search_events (subject, level);
CREATE INDEX ON marketplace_search_events (is_zero_result) WHERE is_zero_result = true;

-- RLS: admins only (no user-level access)
ALTER TABLE marketplace_search_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only" ON marketplace_search_events
  USING (is_admin());
```

**Log call** — add to `GET /api/marketplace/search`:

```typescript
// Non-blocking fire-and-forget after results returned
supabase.from('marketplace_search_events').insert({
  user_id: session?.user?.id ?? null,
  session_id: request.cookies.get('session_id')?.value,
  query: query || null,
  subject: filters.subject ?? null,
  level: filters.level ?? null,
  delivery_mode: filters.delivery_mode ?? null,
  results_count: result.total,
}).then(() => {}); // intentionally fire-and-forget
```

---

## 7. Admin Signal — Marketplace Tab

New tab added to `/admin/signal` (alongside existing Overview, Top Articles, etc.).

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Signal — Marketplace Intelligence          Last 30 days ▾  [Export] │
├─────────────────────────────────────────────────────────────────────┤
│  Supply Overview                                                      │
│  Active Tutors: 847   Active Listings: 2,341   AI Agents: 12         │
│  New Tutors (30d): +43    Idle Tutors (90d no bookings): 127 ⚠       │
├─────────────────────────────────────────────────────────────────────┤
│  Search Funnel                                                        │
│  Searches → Listing View: 34%   Listing → Enquiry: 8.2%             │
│  Zero-result searches: 6.3%  ✓   Saved searches: 89                  │
├─────────────────────────────────────────────────────────────────────┤
│  Supply / Demand Gaps                         [Download CSV]          │
│  Subject            Level       Demand   Supply   Gap                │
│  GCSE Physics       GCSE        47       2        🔴 Supply Gap      │
│  A-Level Maths      A-Level     38       12       ✓ Balanced         │
│  11+ English        Primary     31       0        🔴 Supply Gap      │
│  ...                                                                  │
├─────────────────────────────────────────────────────────────────────┤
│  AI Agent Adoption                                                    │
│  AI sessions (30d): 34    Human bookings: 892    Ratio: 3.8%  ⚠      │
│  Top AI subjects: Maths, English, Science                             │
└─────────────────────────────────────────────────────────────────────┘
```

### TypeScript Interface

```typescript
interface MarketplaceIntelligenceResponse {
  supply: {
    active_tutors: number;
    active_listings: number;
    active_ai_agents: number;
    new_tutors_30d: number;
    idle_tutors_90d: number;
    dead_listings_30d: number;
  };
  funnel: {
    search_to_listing_rate: number | null;
    listing_to_enquiry_rate: number | null;
    zero_result_pct: number;
    saved_searches: number;
  };
  gaps: Array<{
    subject: string;
    level: string;
    demand_count: number;
    supply_count: number;
    gap_type: 'supply_gap' | 'oversupplied' | 'balanced';
    avg_price: number | null;
  }>;
  ai_adoption: {
    ai_sessions_30d: number;
    human_bookings_30d: number;
    ratio: number;
    top_subjects: string[];
  };
  alerts: MarketplaceAlert[];
  trend: {
    active_tutors_90d: Array<{ date: string; count: number }>;
    search_volume_90d: Array<{ date: string; count: number }>;
  };
}
```

---

## 8. Conductor Workflow Integration

### Existing: Listing Quality Nudge (Phase 2)

Already planned in conductor-solution-design.md. This workflow is triggered by the Market Intelligence agent when `listing_quality_low` alert fires:

```
Trigger: Market Intelligence agent → listing_quality_low alert
Step 1: Query listings with CaaS score < 60
Step 2: For each listing: compute which fields are missing (bio, photo, qualifications)
Step 3: Send personalised in-app nudge to tutor ("Your listing is missing X — add it to improve visibility")
Step 4: Log nudge sent, set re-trigger delay (7 days)
```

### New: Supply Gap Alert → Recruitment Campaign

```
Trigger: Market Intelligence agent → supply_demand_gap alert (subject X has 0 supply)
Step 1: HITL Task: "Supply gap detected — [subject] has [N] searches but 0 active tutors"
  Admin actions: [Launch targeted outreach] [Flag for Marketing team] [Dismiss]
Step 2 (if approved): Create admin note + flag subject for Growth Marketing team template
```

---

## 9. Home Page Intelligence

The Home page conversion funnel is monitored via:

1. **Direct traffic landing rate** — from `marketplace_search_events` where query is null (direct browse)
2. **Referral landing rate** — from `referrals` table where `landing_page = '/'`
3. **Home → Search conversion** — proportion of home visits (tracked by `/api/resources/analytics/track` with `page_type = 'home'`) that result in a marketplace search

**Key home page intelligence signal:** If `home_to_search_rate` drops below 30%, the home page hero or subject quick-links are not resonating. The Market Intelligence agent surfaces this as a `home_bounce_high` alert with recommended action: "Review most-searched subjects in last 30d and update homepage quick-links."

### Auto-updating Homepage Subject Grid

Phase 3 enhancement: the Home page subject quick-links (`/`) are populated from `marketplace_platform_metrics_daily.top_searched_subjects` (refreshed daily), ensuring the most-demanded subjects are always surfaced first.

---

## 10. Phase Plan

### Phase 3 — Conductor Integration (est. 24h)

| Task | Effort |
|------|--------|
| `marketplace_search_events` table + logging in search route | 3h |
| `marketplace_platform_metrics_daily` table + migration 359 | 2h |
| `compute_marketplace_platform_metrics()` pg_cron | 2h |
| `query_marketplace_health` tool in Market Intelligence agent | 4h |
| `query_supply_demand_gap` tool (shared with Retention Monitor) | 2h |
| Admin Signal Marketplace tab UI | 4h |
| `/api/admin/signal/marketplace` API route | 2h |
| Supply Gap → Recruitment Campaign workflow | 3h |
| Home page subject grid — auto-update from metrics | 2h |

### Phase 4 — Advanced (est. 12h)

| Task | Effort |
|------|--------|
| Search personalisation (collaborative filtering from search events) | 6h |
| Home page A/B variant tracking via Conductor | 3h |
| Match score improvements using supply/demand data | 3h |

**Total: 36h**

---

## 11. Migration Summary

| Migration | Description |
|-----------|-------------|
| 359 | `marketplace_platform_metrics_daily` table + `marketplace_search_events` table + `compute_marketplace_platform_metrics()` function + pg_cron |
