# Signal Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-08
**Status**: Draft — for review
**Author**: Architecture

Related: [`seo-intelligence-spec.md`](./seo-intelligence-spec.md) · [`referral-intelligence-spec.md`](./referral-intelligence-spec.md) · [`conductor-solution-design-v3.md`](./conductor-solution-design-v3.md)

> **See also**: The Content Intelligence Loop (§9) describes how Resources, SEO, and Signal form a single unified pipeline in Conductor — the most powerful way to deploy all three features.

---

## 1. Purpose

Signal is the attribution layer that answers: **"Which content drives bookings?"** It tracks user journeys from blog/article → listing view → booking, attributes revenue across multiple touchpoints, and measures content ROI. Without intelligence on top of Signal, high-converting articles decay unnoticed, underperforming articles consume editorial effort, and the content→booking flywheel isn't optimised.

**Three outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| Content attribution health monitoring | Phase 3 | Market Intelligence Agent (Conductor) |
| Admin Signal — enhanced analytics | Phase 3 | `/admin/signal` (existing page extended) |
| Article Boost workflow | Phase 3 | Conductor Workflow |

---

## 2. Signal Model Recap

### 2A. What Signal Tracks

```
User journey:
  Article view (signal_id created)
      ↓
  Listing view (article-assisted)
      ↓
  Booking (attributed to article if within attribution window: 7/14/30 days)
      ↓
  Revenue (attributed to article via booking amount)

signal_id prefixes:
  dist_*    = distribution channel (LinkedIn, newsletter, social)
  session_* = organic session (search, direct)
```

### 2B. Attribution Models

| Model | Logic | Use case |
|-------|-------|---------|
| First-Touch | 100% credit to first article in journey | Acquisition focus — what content brings new users in |
| Last-Touch | 100% credit to last article before booking | Conversion focus — what content closes the deal |
| Linear | Equal credit split across all articles in journey | Balanced — all touchpoints valued |

### 2C. Existing Admin Tabs (6)

Overview · Top Articles · Conversion Funnel · Listing Visibility · Signal Journeys · Attribution Models

### 2D. Key RPCs

- `get_resource_article_performance_summary(days, attribution_window)`
- `get_resource_conversion_funnel(days, attribution_window)`
- `get_blog_assisted_listings(days, attribution_window)`
- `get_signal_journey(signal_id)`
- `get_attribution_comparison(days)`

---

## 3. Market Intelligence Agent — Signal Tools

Content attribution is a market signal — it shows which content generates demand and drives bookings. This belongs in the **Market Intelligence** specialist agent alongside SEO tools.

### Tool: `query_content_attribution`

```typescript
{
  "name": "query_content_attribution",
  "description": "Returns content attribution efficiency, article conversion rates, and content-to-booking flywheel health",
  "parameters": {
    "days": { "type": "integer", "default": 30 },
    "attribution_window": { "type": "integer", "default": 14 }
  }
}
```

**Returns:**

```json
{
  "flywheel_health": {
    "blog_assisted_bookings_pct": 23.4,
    "blog_assisted_revenue": 4280.00,
    "blog_assisted_revenue_delta_mom": +8.2,
    "total_attributed_articles": 18,
    "articles_with_zero_conversion": 6
  },
  "funnel": {
    "views": 8400,
    "interactions": 2100,
    "saves": 340,
    "bookings": 169,
    "view_to_booking_rate": 2.01,
    "view_to_booking_delta": -0.3
  },
  "top_articles": [
    { "title": "How to Find a Maths Tutor", "bookings": 42, "revenue": 1820, "conv_rate": 3.8 }
  ],
  "underperforming": [
    { "title": "GCSE Revision Tips", "views": 1200, "bookings": 1, "conv_rate": 0.08 }
  ],
  "high_converting_low_traffic": [
    { "title": "A-Level Chemistry Tutor Guide", "views": 180, "conv_rate": 4.2, "opportunity_score": 82 }
  ],
  "alert_flags": ["conversion_rate_declining", "high_value_article_traffic_drop"]
}
```

### Alert Triggers

| Condition | Alert flag | Action |
|-----------|------------|--------|
| Blog-assisted booking % drops > 20% MoM | `flywheel_weakening` | Investigate content distribution and article freshness |
| Top-3 article conversion rate drops > 30% | `conversion_rate_declining` | Check if article content or linked listings changed |
| High-converting article traffic drops > 40% | `high_value_article_traffic_drop` | Trigger Article Boost workflow (distribution) |
| >30% of articles have zero conversions in 30d | `content_dead_weight` | Content audit — identify which articles to update or remove |
| Single article drives > 60% of attributed revenue | `revenue_concentration_risk` | Flag dependency — diversify or protect this article |

---

## 4. Article Intelligence Score

A composite score per article (0–100) that replaces fragmented metrics with a single signal:

```
Article Intelligence Score =
  (Conversion Rate Component × 40)    -- views → bookings rate vs platform avg
+ (Revenue Component × 30)            -- revenue attributed in 30d
+ (Traffic Component × 20)            -- views trend (MoM)
+ (Freshness Component × 10)          -- days since last update (decay penalty)

All components normalised 0-100 within their category.
```

```sql
-- Compute Article Intelligence Score for all published articles
WITH article_metrics AS (
  SELECT
    a.id,
    a.title,
    a.slug,
    a.updated_at,
    COALESCE(p.total_views, 0)          AS views_30d,
    COALESCE(p.attributed_bookings, 0)  AS bookings_30d,
    COALESCE(p.attributed_revenue, 0)   AS revenue_30d,
    ROUND(
      COALESCE(p.attributed_bookings, 0)::float
      / NULLIF(COALESCE(p.total_views, 0), 0) * 100, 2
    )                                   AS conv_rate,
    EXTRACT(DAYS FROM now() - a.updated_at) AS days_stale
  FROM resources_articles a   -- or blog_articles pre-migration
  LEFT JOIN (
    SELECT * FROM get_resource_article_performance_summary(30, 14)
  ) p ON p.article_id = a.id
  WHERE a.status = 'published'
),
normalised AS (
  SELECT
    id, title, slug, views_30d, bookings_30d, revenue_30d, conv_rate, days_stale,
    -- Normalise each component 0-100
    ROUND(LEAST(conv_rate / NULLIF(MAX(conv_rate) OVER (), 0) * 100, 100), 1) AS conv_score,
    ROUND(LEAST(revenue_30d / NULLIF(MAX(revenue_30d) OVER (), 0) * 100, 100), 1) AS revenue_score,
    ROUND(LEAST(views_30d / NULLIF(MAX(views_30d) OVER (), 0) * 100, 100), 1) AS traffic_score,
    ROUND(GREATEST(100 - (days_stale / 90 * 100), 0), 1) AS freshness_score
  FROM article_metrics
)
SELECT
  id, title, slug,
  ROUND(
    (conv_score * 0.40) + (revenue_score * 0.30) +
    (traffic_score * 0.20) + (freshness_score * 0.10)
  , 1) AS intelligence_score,
  conv_score, revenue_score, traffic_score, freshness_score,
  views_30d, bookings_30d, revenue_30d, conv_rate
FROM normalised
ORDER BY intelligence_score DESC;
```

**Score bands:**

| Band | Range | Meaning |
|------|-------|---------|
| Star | 80–100 | High traffic + high conversion + fresh — protect and promote |
| Performer | 60–79 | Good ROI — stable content, maintain |
| Opportunity | 40–59 | Good conversion, low traffic — boost distribution |
| Underperformer | 20–39 | High traffic, poor conversion — content audit needed |
| Dead Weight | 0–19 | Low traffic + low conversion — update or archive |

---

## 5. Opportunity Detection: High-Converting Low-Traffic

These articles have above-average conversion rates but below-average traffic — the highest-ROI target for distribution investment.

```sql
SELECT
  a.id,
  a.title,
  m.views_30d,
  m.conv_rate,
  m.revenue_30d,
  -- Opportunity score: conversion quality × traffic gap
  ROUND(
    (m.conv_rate / platform_avg.avg_conv * 100) *
    (1 - m.views_30d::float / platform_avg.max_views)
  , 0) AS opportunity_score
FROM article_metrics m
JOIN resources_articles a ON a.id = m.id
CROSS JOIN (
  SELECT AVG(conv_rate) AS avg_conv, MAX(views_30d) AS max_views
  FROM article_metrics
) platform_avg
WHERE m.conv_rate > platform_avg.avg_conv * 1.5  -- 50% above avg conversion
  AND m.views_30d < platform_avg.max_views * 0.3  -- below 30% of peak traffic
ORDER BY opportunity_score DESC
LIMIT 10;
```

These articles feed the **Article Boost workflow**.

---

## 6. Admin Signal — Enhanced Analytics (Phase 3)

The existing Signal page has 6 tabs. Three enhancements:

### 6A. New: Intelligence Score Column (Top Articles Tab)

Add `Intelligence Score` badge to each article row in the existing Top Articles tab:

```
┌────────────────────────────────┬───────┬─────────┬──────────┬─────────┬──────────────┐
│ Article                        │ Views │ Bookings│ Revenue  │ Conv %  │ Intel Score  │
├────────────────────────────────┼───────┼─────────┼──────────┼─────────┼──────────────┤
│ How to Find a Maths Tutor      │ 2,100 │    42   │ £1,820   │  2.0%   │ ⭐ 84         │
│ A-Level Chemistry Tutor Guide  │   180 │    8    │ £348     │  4.2%   │ 🎯 71 OPP    │
│ GCSE Revision Tips             │ 1,200 │    1    │ £43      │  0.08%  │ ⚠ 22         │
└────────────────────────────────┴───────┴─────────┴──────────┴─────────┴──────────────┘
⭐ Star  🎯 Opportunity  ⚠ Underperformer
```

### 6B. New: Opportunities Panel (Overview Tab)

Add below the KPI grid:

```
CONTENT OPPORTUNITIES                                        [View All]
  🎯 3 articles with high conversion but low traffic — boost distribution
     "A-Level Chemistry" (conv 4.2%, traffic 180) · "IB Maths Guide" · ...
  ⚠ 2 top-traffic articles with declining conversion — needs content audit
  ✅ "How to Find a Maths Tutor" drives 28% of all attributed revenue
```

### 6C. New: Attribution Window Sensitivity

Add a sensitivity panel showing how revenue attribution changes across windows:

```
ATTRIBUTION SENSITIVITY
  7-day window:  £2,840  (118 bookings)
  14-day window: £4,280  (169 bookings)  ← current
  30-day window: £5,920  (231 bookings)

Higher window = more credit to content, less to direct search.
Most bookings happen within 7 days of article view.
```

---

## 7. Conductor Workflow: Article Boost (Phase 3)

Triggered when Market Intelligence flags `high_value_article_traffic_drop` or when an article has `opportunity_score > 70`.

```
Name: Article Boost
Feature: Signal / Content
Trigger: Market Intelligence flags high-converting article with traffic drop OR
         opportunity_score > 70 detected by query_content_attribution

Steps:
  1. Identify article (title, slug, conv_rate, views_30d, opportunity_score)
  2. Generate distribution brief via AI:
     "Article 'A-Level Chemistry Tutor Guide' converts at 4.2% (platform avg 2.0%)
      but had only 180 views last month (down from 420 two months ago).
      Recommended distribution: [LinkedIn post angle], [newsletter feature],
      [internal link from top-traffic hub], [partner mention]"
  3. HITL: Admin sees brief → [Schedule LinkedIn Post] / [Add to Newsletter] /
                              [Add Internal Link] / [Dismiss]
  4. If internal link chosen: flag which hub/spoke to link from (via query_keyword_opportunities)
  5. Monitor: check article views again in 14 days, write decision_outcome

Autonomy: supervised
```

---

## 8. Growth Advisor — Content Attribution (User-Facing)

When a tutor or client asks "how are people finding me?" the Growth Advisor can surface Signal data for their specific profile:

```
"Your profile received 24 views in the last 30 days that came from blog content:
 - 'How to Find a Maths Tutor' sent 18 viewers to your profile
 - 3 of those viewers became bookings (12.5% conversion)

 Tutors in the top 10% of blog-assisted bookings have listings with:
 - Response time < 2 hours (yours: 4 hours)
 - 3+ photos (yours: 1)
 - Subject-specific keywords matching the hub article"
```

This closes the loop: the content intelligence layer becomes user-facing coaching, not just admin analytics.

---

## 9. The Content Intelligence Loop — Resources, SEO, Signal in Conductor

> This is the key architectural insight: Resources, SEO, and Signal are not three separate admin tools — they are three phases of the same pipeline. Conductor orchestrates the full loop.

```
CONTENT INTELLIGENCE LOOP (Conductor managed)

  ┌─────────────────────────────────────────────────────────────────────┐
  │                                                                     │
  │  RESOURCES (Create)                                                 │
  │  Admin writes/commissions article in /admin/resources               │
  │  → Article saved as draft                                           │
  │                    │                                                │
  │                    ▼                                                │
  │  SEO (Optimise)                                                     │
  │  Market Intelligence runs query_seo_health:                         │
  │  → Suggests target keyword, internal links from hubs                │
  │  → SEO score must reach 70+ before publish gate opens              │
  │  → Content template validation (word count, structure)             │
  │                    │                                                │
  │                    ▼                                                │
  │  PUBLISH (Conductor workflow gate)                                  │
  │  Admin approves → article goes live                                 │
  │  Sitemap updated, internal links auto-added to parent hub          │
  │                    │                                                │
  │                    ▼                                                │
  │  SEO MONITOR (Rank + Traffic)                                       │
  │  Market Intelligence weekly: query_seo_health                       │
  │  → Track keyword position for this article's target keyword         │
  │  → GSC impressions trend                                            │
  │                    │                                                │
  │                    ▼                                                │
  │  SIGNAL (Measure)                                                   │
  │  Market Intelligence weekly: query_content_attribution              │
  │  → Track article intelligence score                                 │
  │  → Identify: Star / Performer / Opportunity / Underperformer        │
  │                    │                                                │
  │                    ▼                                                │
  │  INTERVENTION (Conductor workflow)                                  │
  │  Content Decay Recovery → if rank drops + content stale            │
  │  Article Boost → if high conversion + low traffic                  │
  │  Archive Nudge → if dead weight for 60d                            │
  │                    │                                                │
  │                    └──────────────────────────────────────────────►│
  │                    (loop back: update article → re-optimise → republish)
  │                                                                     │
  └─────────────────────────────────────────────────────────────────────┘
```

### What This Means in Practice

Currently: admin manages Resources, SEO, and Signal in three separate admin sections with no connection between them.

With Conductor integration:

| Today | With Conductor |
|-------|----------------|
| Admin manually checks `/admin/signal` for underperforming articles | Market Intelligence flags it automatically, daily |
| Admin manually checks `/admin/seo/keywords` for rank drops | Market Intelligence flags it, triggers Content Decay Recovery workflow |
| No connection between an article's SEO score and its conversion rate | Article Intelligence Score combines both — one number per article |
| Article publishing has no SEO gate | Conductor workflow enforces SEO score ≥ 70 before publish |
| Admin discovers "high-converting low-traffic" articles by luck | Market Intelligence proactively surfaces them with distribution brief |

### New Conductor Workflow: Content Lifecycle

```
Name: Content Lifecycle
Feature: Resources / SEO / Signal (unified)
Trigger: Article created in Resources

Nodes:
  1. SEO Optimisation Gate (HITL) — enforce SEO score ≥ 70
  2. Publishing Approval (HITL) — admin approves content
  3. Post-Publish SEO Monitor (automated, weekly via Market Intelligence)
  4. Signal Attribution Monitor (automated, monthly via Market Intelligence)
  5. Branch: Decay? → Content Decay Recovery subprocess
  6. Branch: Opportunity? → Article Boost subprocess
  7. Branch: Dead Weight 60d? → Archive Nudge (HITL)

Autonomy: supervised (publish and archive gates always require approval)
```

This workflow is the single most impactful addition to Conductor for content-driven acquisition — it closes the feedback loop that currently requires three separate manual check-ins per article.

---

## 10. Implementation Plan

### Phase 3

| Task | Estimate | Output |
|------|----------|--------|
| `query_content_attribution` tool registration | 2h | Market Intelligence tool |
| Content attribution alert rules (5 conditions) | 2h | Market Intelligence system_prompt additions |
| Article Intelligence Score SQL function | 3h | `compute_article_intelligence_scores()` |
| Admin Signal enhancements (score column, opportunities panel, sensitivity) | 6h | 3 UI additions to existing page |
| `GET /api/admin/signal/intelligence` | 4h | Opportunities + intelligence scores API |
| Article Boost workflow | 4h | Conductor Workflow definition |
| Content Lifecycle workflow | 6h | Unified workflow across Resources/SEO/Signal |
| **Phase 3 total** | **27h** | |

### Migration Numbers

| Migration | Content |
|-----------|---------|
| 358 | `article_intelligence_scores` table or materialised view |

---

## 11. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Content attribution = Market Intelligence** (not Signal Monitor) | Signal data is a demand signal — it tells Market Intelligence which content is driving bookings, which informs supply/demand analysis (which subjects need more tutors based on article demand) |
| **Article Intelligence Score** (composite) vs raw metrics | Admins currently have 5 numbers per article. One score creates a clear priority list — what to boost, update, or archive |
| **Content Lifecycle workflow** unifies Resources/SEO/Signal | These three are a pipeline. Modelling them as separate tools breaks the feedback loop. A single workflow keeps cause and effect connected. |
| **Archive Nudge requires HITL** | Archiving removes content from sitemaps and can drop organic traffic — this must always be a human decision, even if the signal recommends it |

---

## 12. Open Questions

| # | Question | Target |
|---|----------|--------|
| Q1 | Should the Content Lifecycle workflow apply retroactively to all published articles, or only new ones going forward? | Phase 3 |
| Q2 | SEO gate (score ≥ 70 before publish): should this be a hard block or a soft warning? | Phase 3 |
| Q3 | Article Boost distribution brief: should it generate a draft LinkedIn post via AI, or just the brief? | Phase 4 |
| Q4 | Should Signal data be accessible to tutors (showing them which articles sent them viewers)? | Phase 4 |

---

*Version 1.0 — Signal Intelligence spec. Market Intelligence agent (Conductor) holds `query_content_attribution`. Article Intelligence Score. Content Lifecycle workflow (Resources/SEO/Signal unified). Migration 358.*
