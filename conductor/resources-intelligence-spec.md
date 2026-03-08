# Resources Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-08
**Status**: Draft — for review
**Author**: Architecture

Related: [`seo-intelligence-spec.md`](./seo-intelligence-spec.md) · [`signal-intelligence-spec.md`](./signal-intelligence-spec.md) · [`conductor-solution-design-v3.md`](./conductor-solution-design-v3.md)

> **Go-to-market pipeline**: Resources is Stage 1 of the Content Intelligence Loop — create → SEO optimise → Signal measure → Marketplace land → Booking convert. Everything starts here.

---

## 1. Purpose

Resources (formerly blog) is the top of the content marketing funnel. It is the **only organic acquisition channel Tutorwise fully controls** — SEO rankings are earned through quality content, Signal attribution traces bookings back to articles, and the hub/spoke SEO model is built on Resources content. Without Conductor intelligence on top of Resources, the editorial pipeline operates blind: articles are published without SEO readiness checks, high-performing articles decay unnoticed, and the content-to-booking flywheel cannot be optimised.

**Three outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| Content creation health monitoring | Phase 3 | Market Intelligence Agent (Conductor) |
| Admin Resources — enhanced editorial intelligence | Phase 3 | `/admin/resources` (existing page extended) |
| Content Lifecycle workflow (SEO gate + Article Boost) | Phase 3 | Conductor Workflow |

---

## 2. Resources System Recap

### 2A. What Resources Manages

```
Table: resources_articles
  id, slug, title, category, subcategory
  status: 'draft' | 'published' | 'archived'
  published_at, updated_at
  seo_title, meta_description, canonical_url
  hub_id (FK to seo_hubs — hub/spoke link)
  content (markdown/HTML body)
  author_id (FK to profiles)
  featured_image_url
  estimated_read_time
```

### 2B. Existing Admin UI (`/admin/resources`)

- Article list with status/category filters
- Article create/edit at `/admin/resources/create`
- SEO tab at `/admin/resources/seo` (hub/spoke linking)
- Categories management at `/admin/resources/categories`
- Settings at `/admin/resources/settings`

### 2C. Existing API Routes

- `GET/POST /api/admin/resources/articles` — list + create
- `GET/PATCH/DELETE /api/admin/resources/articles/[id]` — manage article
- `GET /api/resources/articles` — public list (published only)
- `GET /api/resources/articles/[slug]` — public article view
- `POST /api/resources/analytics/track` — client-side view tracking
- `POST /api/resources/attribution/events` — Signal attribution events

### 2D. Content Categories

Articles are categorised by `category` (top-level, e.g. "tutoring-advice", "subject-guides", "industry-news") and `subcategory`. Hub/spoke SEO structure overlays this — each hub targets a high-volume keyword; spoke articles target long-tail variants within that hub.

---

## 3. Market Intelligence Agent — Resources Tools

Content creation velocity and editorial health are market intelligence signals — they determine how quickly the platform can build organic authority and respond to search demand. These tools sit in the **Market Intelligence** specialist agent alongside SEO and Signal tools.

### Tool: `query_resources_health`

```typescript
{
  "name": "query_resources_health",
  "description": "Returns content creation velocity, publishing pipeline health, SEO readiness scores, and editorial coverage gaps",
  "parameters": {
    "days": { "type": "integer", "default": 30 },
    "include_drafts": { "type": "boolean", "default": true }
  }
}
```

**Returns:**

```typescript
interface ResourcesHealthResponse {
  pipeline: {
    drafts_count: number;              // articles in draft
    published_last_30d: number;        // publishing velocity
    avg_days_draft_to_publish: number; // time-to-publish
    stale_drafts: number;              // drafts >30 days unedited
    publishing_cadence_target: number; // configured target (e.g. 4/month)
    cadence_met: boolean;
  };
  seo_readiness: {
    missing_meta_description: number;  // published articles without meta
    missing_hub_link: number;          // published articles not linked to any hub
    missing_seo_title: number;         // published articles with no SEO title
    avg_readiness_score: number;       // composite 0-100 (§4)
    below_threshold: number;           // articles with score < 70
  };
  coverage: {
    hubs_with_zero_spokes: number;     // SEO hubs with no supporting articles
    categories_with_zero_published: number; // content gaps by category
    last_published_days_ago: number;   // staleness signal
    oldest_published_article_days: number; // content age
  };
  decay: {
    articles_not_updated_90d: number;  // factual decay risk
    articles_with_falling_views: number; // Signal-driven decay signal (from article_intelligence_scores)
  };
  alerts: ResourcesAlert[];
}

interface ResourcesAlert {
  type: 'cadence_missed' | 'seo_readiness_low' | 'hub_coverage_gap'
      | 'stale_drafts_high' | 'content_decay_risk' | 'no_recent_publish';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  affected_count?: number;
  action: string; // suggested action for admin
}
```

### Tool: `query_editorial_opportunities`

```typescript
{
  "name": "query_editorial_opportunities",
  "description": "Identifies high-priority content gaps: uncovered hub keywords, competitor-ranking topics, high-intent queries with no article",
  "parameters": {
    "limit": { "type": "integer", "default": 10 }
  }
}
```

**Returns:**

```typescript
interface EditorialOpportunitiesResponse {
  hub_gaps: Array<{
    hub_id: string;
    hub_name: string;
    target_keyword: string;
    spoke_count: number;       // how many spokes already exist
    recommended_spokes: string[]; // suggested spoke topics
    priority: 'high' | 'medium' | 'low';
  }>;
  keyword_opportunities: Array<{
    keyword: string;
    estimated_monthly_searches: number;
    difficulty: number;
    has_article: boolean;
    has_hub: boolean;
    suggested_article_title: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  category_gaps: Array<{
    category: string;
    published_count: number;
    recommended_topics: string[];
  }>;
}
```

---

## 4. Article SEO Readiness Score

Each article receives a readiness score (0–100) before and after publishing. This is the **SEO gate** in the Content Lifecycle workflow.

```
Readiness Score =
  has_seo_title          × 15 pts
  has_meta_description   × 20 pts
  meta_description_len   × 10 pts  (120–160 chars = full score)
  has_hub_link           × 20 pts
  has_canonical_url      × 10 pts
  word_count_adequate    × 15 pts  (≥800 words = full score)
  has_featured_image     × 10 pts

Gate threshold: ≥ 70 to proceed to publish
```

**SQL implementation:**

```sql
CREATE OR REPLACE FUNCTION compute_article_readiness_score(article_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  a resources_articles%ROWTYPE;
  score integer := 0;
  meta_len integer;
  word_count_est integer;
BEGIN
  SELECT * INTO a FROM resources_articles WHERE id = article_id;

  IF a.seo_title IS NOT NULL AND length(a.seo_title) > 0 THEN score := score + 15; END IF;
  IF a.meta_description IS NOT NULL AND length(a.meta_description) > 0 THEN
    score := score + 20;
    meta_len := length(a.meta_description);
    IF meta_len >= 120 AND meta_len <= 160 THEN score := score + 10;
    ELSIF meta_len >= 100 AND meta_len < 120 THEN score := score + 5; END IF;
  END IF;
  IF a.hub_id IS NOT NULL THEN score := score + 20; END IF;
  IF a.canonical_url IS NOT NULL AND length(a.canonical_url) > 0 THEN score := score + 10; END IF;
  -- Estimate word count from content length
  word_count_est := length(regexp_replace(a.content, '<[^>]+>', '', 'g')) / 6;
  IF word_count_est >= 800 THEN score := score + 15;
  ELSIF word_count_est >= 400 THEN score := score + 7; END IF;
  IF a.featured_image_url IS NOT NULL THEN score := score + 10; END IF;

  RETURN LEAST(score, 100);
END;
$$;
```

---

## 5. Alert Triggers

The Market Intelligence agent evaluates these conditions in `query_resources_health` and surfaces them as alerts:

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| `cadence_missed` | `published_last_30d < cadence_target` for 2+ consecutive months | warning | Prompt editorial prioritisation |
| `seo_readiness_low` | >30% of published articles have readiness < 70 | warning | Trigger SEO audit task |
| `hub_coverage_gap` | Any SEO hub has 0 published spokes | critical | Recommend spoke topics |
| `stale_drafts_high` | >5 drafts unedited for >30 days | info | Prompt draft review |
| `content_decay_risk` | ≥3 published articles show falling views for 14+ days AND not updated in 90d | warning | Trigger Article Boost or content refresh |
| `no_recent_publish` | Zero articles published in 21+ days | critical | Alert — content pipeline stalled |

---

## 6. Database Table: `resources_platform_metrics_daily`

Stores daily snapshots to power trend charts and alert history in Admin Signal Resources tab.

**Migration: 356**

```sql
CREATE TABLE resources_platform_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL UNIQUE,

  -- Publishing pipeline
  total_published integer NOT NULL DEFAULT 0,
  total_drafts integer NOT NULL DEFAULT 0,
  published_last_30d integer NOT NULL DEFAULT 0,
  avg_days_draft_to_publish numeric(5,1),
  stale_drafts_count integer NOT NULL DEFAULT 0,

  -- SEO readiness
  avg_readiness_score numeric(5,2),
  below_threshold_count integer NOT NULL DEFAULT 0, -- score < 70
  missing_hub_link_count integer NOT NULL DEFAULT 0,
  missing_meta_count integer NOT NULL DEFAULT 0,

  -- Coverage
  hubs_with_zero_spokes integer NOT NULL DEFAULT 0,
  categories_with_zero_published integer NOT NULL DEFAULT 0,

  -- Decay
  articles_not_updated_90d integer NOT NULL DEFAULT 0,
  articles_falling_views integer NOT NULL DEFAULT 0,

  -- Attribution (from article_intelligence_scores)
  avg_intelligence_score numeric(5,2),
  star_articles_count integer NOT NULL DEFAULT 0,    -- score 80-100
  dead_weight_count integer NOT NULL DEFAULT 0,      -- score 0-19

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON resources_platform_metrics_daily (metric_date DESC);

-- pg_cron: daily at 04:30 UTC (before SEO at 05:00, before CaaS at 05:30)
SELECT cron.schedule(
  'compute-resources-platform-metrics',
  '30 4 * * *',
  $$SELECT compute_resources_platform_metrics();$$
);
```

**Compute function:**

```sql
CREATE OR REPLACE FUNCTION compute_resources_platform_metrics()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO resources_platform_metrics_daily (
    metric_date, total_published, total_drafts, published_last_30d,
    avg_days_draft_to_publish, stale_drafts_count, avg_readiness_score,
    below_threshold_count, missing_hub_link_count, missing_meta_count,
    hubs_with_zero_spokes, categories_with_zero_published,
    articles_not_updated_90d, articles_falling_views,
    avg_intelligence_score, star_articles_count, dead_weight_count
  )
  SELECT
    CURRENT_DATE,
    COUNT(*) FILTER (WHERE status = 'published'),
    COUNT(*) FILTER (WHERE status = 'draft'),
    COUNT(*) FILTER (WHERE status = 'published' AND published_at >= now() - interval '30 days'),
    AVG(EXTRACT(EPOCH FROM (published_at - created_at)) / 86400)
      FILTER (WHERE status = 'published' AND published_at IS NOT NULL),
    COUNT(*) FILTER (WHERE status = 'draft' AND updated_at < now() - interval '30 days'),
    -- Readiness scores computed inline
    AVG(compute_article_readiness_score(id)) FILTER (WHERE status = 'published'),
    COUNT(*) FILTER (WHERE status = 'published'
      AND compute_article_readiness_score(id) < 70),
    COUNT(*) FILTER (WHERE status = 'published' AND hub_id IS NULL),
    COUNT(*) FILTER (WHERE status = 'published'
      AND (meta_description IS NULL OR length(meta_description) = 0)),
    -- Hub coverage
    (SELECT COUNT(*) FROM seo_hubs h
     WHERE NOT EXISTS (
       SELECT 1 FROM resources_articles ra
       WHERE ra.hub_id = h.id AND ra.status = 'published'
     )),
    -- Category coverage (categories with published articles vs all distinct categories)
    (SELECT COUNT(DISTINCT category) FROM resources_articles
     WHERE status = 'draft' OR status = 'published') -
    (SELECT COUNT(DISTINCT category) FROM resources_articles WHERE status = 'published'),
    COUNT(*) FILTER (WHERE status = 'published' AND updated_at < now() - interval '90 days'),
    -- From article_intelligence_scores (written by signal spec)
    (SELECT COUNT(*) FROM article_intelligence_scores
     WHERE traffic_trend = 'declining' AND measured_at >= CURRENT_DATE - 14),
    -- Intelligence scores (from article_intelligence_scores)
    (SELECT AVG(score) FROM article_intelligence_scores
     WHERE measured_at = (SELECT MAX(measured_at) FROM article_intelligence_scores)),
    (SELECT COUNT(*) FROM article_intelligence_scores
     WHERE band = 'Star' AND measured_at = (SELECT MAX(measured_at) FROM article_intelligence_scores)),
    (SELECT COUNT(*) FROM article_intelligence_scores
     WHERE band = 'Dead Weight' AND measured_at = (SELECT MAX(measured_at) FROM article_intelligence_scores))
  FROM resources_articles;

  ON CONFLICT (metric_date) DO UPDATE SET
    total_published = EXCLUDED.total_published,
    total_drafts = EXCLUDED.total_drafts,
    published_last_30d = EXCLUDED.published_last_30d,
    updated_at = now();
END;
$$;
```

---

## 7. Admin Resources Intelligence — UI Enhancements

The existing `/admin/resources` page gains an **Intelligence** panel. This is read-only — editorial actions (create/edit/publish) stay in the existing UI.

### 7A. Intelligence Panel (new section above article list)

```
┌─────────────────────────────────────────────────────────────────┐
│  Content Intelligence                          [Refresh] [→ SEO] │
├─────────────────────────────────────────────────────────────────┤
│  Publishing Velocity    SEO Readiness    Content Coverage         │
│  ● 3 / 4 this month    ● 78/100 avg     ● 2 hub gaps             │
│    ↓ below target        ↑ improving      3 categories thin       │
│                                                                   │
│  ⚠ 2 stale drafts (>30 days) — review recommended               │
│  ⚠ Hub "A-Level Chemistry" has 0 published spokes                │
│  ✓ Content decay: 1 article falling — see Signal intelligence    │
└─────────────────────────────────────────────────────────────────┘
```

### 7B. Article List — SEO Readiness Column

The article list table gains a **Readiness** column showing score badge:

| Score | Badge | Colour |
|-------|-------|--------|
| 90–100 | Excellent | Green |
| 70–89 | Ready | Teal |
| 50–69 | Needs Work | Amber |
| <50 | Not Ready | Red |

Clicking the badge opens the article editor with the SEO checklist panel pre-open.

### 7C. API Endpoint

```typescript
GET /api/admin/resources/intelligence

Response: {
  pipeline: PipelineMetrics;
  seo_readiness: SeoReadinessMetrics;
  coverage: CoverageMetrics;
  decay: DecayMetrics;
  alerts: ResourcesAlert[];
  trend: {
    published_last_90d: Array<{ date: string; count: number }>;
    avg_readiness_last_90d: Array<{ date: string; score: number }>;
  };
}
```

---

## 8. Growth Advisor — Resources Coaching

The user-facing Growth Advisor uses resources data when advising agents and tutors who want to build content authority:

```typescript
// In GrowthAgentOrchestrator system prompt context
// For tutor/agent roles with content publishing permissions:

"Content Impact" section:
  - Articles published by this user (if any)
  - Avg readiness score of their articles
  - Which articles attributed to bookings (from Signal)
  - Recommended: "Write a spoke article for hub X to grow organic traffic"
```

This is distinct from the admin-level Market Intelligence tools — it's personalised guidance, not platform-wide analytics.

---

## 9. Content Lifecycle Conductor Workflow (Stage 1)

This is Stage 1 of the unified Content Intelligence workflow defined in `signal-intelligence-spec.md §9`. The full workflow spans Resources → SEO → Signal → Intervention.

**Stage 1: Article Creation Gate**

```
Trigger: resources_articles status changes to 'pending_review'

Step 1: Compute SEO Readiness Score
  ↓
Step 2: Check score
  ↓ < 70 → HITL Task: "Article needs SEO work before publishing"
  |          Admin sees: article title, readiness score, checklist of missing fields
  |          Admin action: Edit article | Override and publish
  ↓ ≥ 70
Step 3: Auto-approve for SEO scheduling
  ↓
Step 4: Notify Market Intelligence agent (trigger SEO keyword check)
  ↓
Step 5: Mark article ready for publish
```

**Trigger mechanism:** Supabase DB webhook on `resources_articles` UPDATE where `new.status = 'pending_review'`

**HITL task payload:**

```json
{
  "task_type": "article_seo_review",
  "article_id": "<uuid>",
  "article_title": "<title>",
  "readiness_score": 58,
  "missing_items": [
    "meta_description too short (82 chars — needs 120+)",
    "no hub link assigned",
    "estimated word count: 340 (needs 800+)"
  ],
  "actions": ["edit_article", "override_publish"],
  "timeout_hours": 48
}
```

---

## 10. Phase Plan

### Phase 3 — Conductor Integration (est. 18h)

| Task | Effort |
|------|--------|
| `compute_article_readiness_score()` SQL function | 2h |
| `resources_platform_metrics_daily` table + migration 356 | 1h |
| `compute_resources_platform_metrics()` pg_cron | 2h |
| `query_resources_health` tool in Market Intelligence agent | 3h |
| `query_editorial_opportunities` tool | 2h |
| Admin Resources Intelligence panel UI | 3h |
| Article list Readiness column + badge | 2h |
| `/api/admin/resources/intelligence` API route | 2h |
| DB webhook + Content Lifecycle Stage 1 workflow | 1h |

### Phase 4 — Growth Advisor Integration (est. 6h)

| Task | Effort |
|------|--------|
| Resources metrics in Growth Advisor user context | 2h |
| Content coaching guidance in Growth Advisor skills | 2h |
| `query_editorial_opportunities` surfaced to agents with publish permissions | 2h |

**Total: 24h**

---

## 11. Migration Summary

| Migration | Description |
|-----------|-------------|
| 356 | `resources_platform_metrics_daily` table + `compute_resources_platform_metrics()` function + pg_cron |

> Note: `article_intelligence_scores` (migration 358) is owned by the Signal spec but referenced here. Resources metrics daily compute depends on that table for decay signals — ensure migration 358 runs before enabling pg_cron for migration 356.
