# SEO Intelligence — Design Spec

**Version**: 1.0
**Date**: 2026-03-08
**Status**: Draft — for review
**Author**: Architecture

Related: [`signal-intelligence-spec.md`](./signal-intelligence-spec.md) · [`conductor-solution-design.md`](./conductor-solution-design.md)

---

## 1. Purpose

SEO is the primary organic acquisition channel for Tutorwise — the hub/spoke content model is built to achieve top-5 rankings for high-intent tutoring keywords. Without monitoring, keyword ranks drift silently, backlinks break, content goes stale, and GSC impressions decline with no alert. This spec defines the intelligence layer for SEO health monitoring, rank velocity tracking, and the intervention workflows that respond to degradation.

**Three outputs:**

| Output | Phase | Owner |
|--------|-------|-------|
| SEO health monitoring (rank drops, backlink loss, content decay) | Phase 3 | Market Intelligence Agent (Conductor) |
| Admin Signal — SEO tab | Phase 3 | `/admin/signal` |
| Content Decay Recovery workflow | Phase 3 | Conductor Workflow |

---

## 2. SEO Model Recap

### 2A. Content Architecture

```
Hub (pillar page, 1,500+ words, broad topic)
  └── Spoke 1 (deep-dive, 800+ words, specific subtopic)
  └── Spoke 2
  └── Spoke N

Cross-linking:
  Spoke → Hub (all spokes link back to parent)
  Hub → Spoke (hub links out to all spokes)
  Spoke → Spoke (related spokes cross-link)
```

**Goal**: Topical authority. Google ranks the hub for head terms, spokes for long-tail.

### 2B. What's Tracked

| Table | Contains |
|-------|---------|
| `seo_keywords` | Target keywords, positions (current/best/target), GSC impressions/clicks/CTR, priority, position history JSONB |
| `seo_backlinks` | Source domain, DA/DR, link type (dofollow/nofollow), status (active/lost/broken) |
| `seo_hubs` + `seo_spokes` | Content records with SEO score, readability, word count, freshness score |
| `seo_gsc_performance` | Daily query-level GSC sync (impressions, clicks, position, device, country) |
| `seo_competitors` + `seo_competitor_rankings` | Competitor DA, organic traffic, keyword overlap |

### 2C. Priority Tiers

```
Critical keywords → tracked daily, alert on any position change ≥ 3
High keywords     → tracked daily, alert on position drop ≥ 5
Medium keywords   → tracked weekly
Low keywords      → tracked monthly
```

---

## 3. Market Intelligence Agent — SEO Tools

SEO health belongs to the **Market Intelligence** specialist agent (weekly Monday 09:00). SEO is a demand signal — organic search drives user acquisition, which determines marketplace supply/demand balance. Adding two SEO tools to Market Intelligence rather than creating a separate specialist keeps the domain coherent.

### Tool: `query_seo_health`

```typescript
{
  "name": "query_seo_health",
  "description": "Returns keyword ranking health, backlink loss, content freshness, and GSC impression trends",
  "parameters": {
    "period_days": { "type": "integer", "default": 7 },
    "priority_filter": { "type": "string", "enum": ["critical", "high", "all"], "default": "critical" }
  }
}
```

**Returns:**

```json
{
  "ranking_health": {
    "critical_keywords_tracked": 14,
    "top5_count": 4,
    "top10_count": 7,
    "page2_count": 3,
    "avg_position": 8.4,
    "avg_position_delta_7d": -1.2,
    "positions_gained": 3,
    "positions_lost": 5,
    "biggest_drop": { "keyword": "online maths tutor london", "from": 4, "to": 9, "delta": -5 },
    "biggest_gain": { "keyword": "gcse biology tutor", "from": 12, "to": 7, "delta": +5 }
  },
  "backlink_health": {
    "active_count": 142,
    "lost_7d": 4,
    "lost_30d": 11,
    "avg_dr": 38,
    "high_dr_lost": 1
  },
  "content_freshness": {
    "hubs_stale_90d": 3,
    "spokes_stale_90d": 12,
    "avg_seo_score": 71,
    "below_threshold_count": 6
  },
  "gsc_impressions_trend": {
    "last_7d": 12400,
    "prior_7d": 14200,
    "delta_pct": -12.7,
    "clicks_7d": 380,
    "avg_ctr": 3.1
  },
  "alert_flags": ["rank_drop_critical", "impressions_declining", "stale_content_elevated"]
}
```

### Alert Triggers

| Condition | Alert flag | Severity | Action |
|-----------|------------|----------|--------|
| Critical keyword drops ≥ 3 positions | `rank_drop_critical` | High | Trigger Content Decay Recovery workflow |
| High keyword drops ≥ 5 positions | `rank_drop_high` | Medium | Flag for content audit |
| GSC impressions MoM drop > 15% | `impressions_declining` | High | Investigate indexing, check Google Search Console errors |
| Backlink loss rate > 3/week | `backlink_loss_elevated` | Medium | Outreach to recover lost links |
| High-DR backlink lost (DR > 50) | `high_dr_backlink_lost` | High | Priority outreach — significant authority loss |
| Hub content stale > 90 days + position < target | `hub_content_stale` | Medium | Content refresh task |
| Hub SEO score drops below 60 | `hub_seo_score_low` | Medium | Quality audit trigger |
| Competitor gains position on shared keyword | `competitor_ranking_gain` | Low | Monitor and assess response strategy |

### Tool: `query_keyword_opportunities`

```typescript
{
  "name": "query_keyword_opportunities",
  "description": "Returns keywords in positions 6-20 where small content improvements could reach top 5",
  "parameters": {
    "volume_min": { "type": "integer", "default": 100 },
    "difficulty_max": { "type": "integer", "default": 60 }
  }
}
```

Surfaces "quick win" keywords — already ranking, not yet top 5 — that are worth targeting with content updates. Feeds the Growth plan for organic acquisition.

---

## 4. New Table: `seo_platform_metrics_daily`

Daily snapshot of SEO health — enables trend analysis without querying large GSC tables each time.

```sql
CREATE TABLE seo_platform_metrics_daily (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date         date NOT NULL UNIQUE,

  -- Keyword position distribution
  critical_keywords     integer,
  high_keywords         integer,
  keywords_top5         integer,
  keywords_top10        integer,
  keywords_page2        integer,    -- positions 11-20
  keywords_page3plus    integer,    -- positions 21+
  not_ranked            integer,    -- no data / not in top 100
  avg_position          numeric(5,1),
  avg_position_delta    numeric(5,1),  -- vs prior day

  -- Backlinks
  active_backlinks      integer,
  lost_7d               integer,
  avg_dr                numeric(5,1),

  -- Content health
  hubs_published        integer,
  spokes_published      integer,
  hubs_stale_90d        integer,
  spokes_stale_90d      integer,
  avg_hub_seo_score     numeric(5,1),
  avg_spoke_seo_score   numeric(5,1),

  -- GSC (pulled from seo_gsc_performance)
  impressions_7d        integer,
  clicks_7d             integer,
  avg_ctr               numeric(5,2),

  created_at            timestamptz DEFAULT now()
);

CREATE INDEX ON seo_platform_metrics_daily (snapshot_date DESC);
```

Populated by pg_cron daily at 08:00 UTC (after GSC sync at 06:00, before Market Intelligence at 09:00):

```sql
SELECT cron.schedule('compute-seo-platform-metrics', '0 8 * * *',
  'SELECT compute_seo_platform_metrics()'
);
```

---

## 5. Keyword Rank Velocity

Rank velocity measures how quickly positions are changing — more useful than a single snapshot.

```sql
-- Keyword rank velocity: positions gained/lost over period
SELECT
  k.keyword,
  k.priority,
  k.current_position,
  k.current_position - LAG(k.current_position, 7) OVER (
    PARTITION BY k.id ORDER BY g.date
  )                                          AS delta_7d,
  k.current_position - k.target_position    AS gap_to_target,
  k.impressions,
  k.clicks,
  ROUND(k.clicks::float / NULLIF(k.impressions, 0) * 100, 2) AS ctr_pct,
  k.last_checked
FROM seo_keywords k
LEFT JOIN seo_gsc_performance g ON g.query = k.keyword
WHERE k.priority IN ('critical', 'high')
ORDER BY ABS(k.current_position - LAG(k.current_position, 7) OVER (
  PARTITION BY k.id ORDER BY g.date
)) DESC NULLS LAST
LIMIT 20;
```

### Position History Tracking

Each keyword row has `position_history jsonb`:

```json
[
  { "date": "2026-03-01", "position": 7 },
  { "date": "2026-03-04", "position": 6 },
  { "date": "2026-03-08", "position": 9 }
]
```

The admin keywords page already renders this — the intelligence layer surfaces anomalies programmatically rather than requiring manual review.

---

## 6. Content Decay Detection

Content decays when: (a) page views drop, (b) position drops, (c) freshness score falls, or (d) SEO score drops. These can happen independently or together.

```sql
-- Hub pages with signs of content decay
SELECT
  h.id,
  h.title,
  h.slug,
  h.updated_at,
  EXTRACT(DAYS FROM now() - h.updated_at) AS days_since_update,
  h.seo_score,
  h.freshness_score,
  h.view_count,
  -- GSC performance for this URL
  g.impressions,
  g.clicks,
  g.position,
  -- Decay signal: position dropped AND content is stale
  CASE
    WHEN EXTRACT(DAYS FROM now() - h.updated_at) > 90
     AND h.seo_score < 65                    THEN 'content_stale'
    WHEN g.impressions < g.impressions * 0.7  THEN 'impressions_declining'  -- needs GSC history join
    WHEN g.position > 10
     AND EXTRACT(DAYS FROM now() - h.updated_at) > 60 THEN 'position_and_stale'
    ELSE 'healthy'
  END                                        AS decay_signal
FROM seo_hubs h
LEFT JOIN seo_gsc_performance g ON g.query ILIKE '%' || h.title || '%'
  AND g.date = CURRENT_DATE - 1
WHERE h.status = 'published'
ORDER BY h.seo_score ASC, days_since_update DESC;
```

---

## 7. Admin Signal — SEO Tab (Phase 3)

Extend `/admin/signal` with an **SEO** tab. Complements the existing SEO admin pages (`/admin/seo/`) which manage content — the Signal SEO tab surfaces health metrics in the same observation layer as other platform signals.

### Tab Layout

```
/admin/signal  [Overview] [Articles] [Funnel] [Attribution] [Listings] [Referral] [CaaS] [SEO ← NEW]

SEO TAB
┌──────────────────────────────────────────────────────────────────────────────┐
│  RANKING HEALTH                               [Last 7 days ▾]  [Export]     │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Avg position: 8.4  ▼ -1.2 vs last week       GSC Impressions: 12,400  ▼   │
│  Keywords Top 5: 4/14 critical  Top 10: 7/14   CTR: 3.1%  Clicks: 380      │
│                                                                              │
│  Biggest drop:  "online maths tutor london"  pos 4 → 9  ⚠ -5 (critical)   │
│  Biggest gain:  "gcse biology tutor"          pos 12 → 7  ▲ +5 (high)      │
└──────────────────────────────────────────────────────────────────────────────┘

POSITION DISTRIBUTION
  Top 5    ████░░░░░░░░░░░░░░░░ 4 keywords
  Top 10   ████████████░░░░░░░░ 7 keywords
  Page 2   ██████░░░░░░░░░░░░░░ 3 keywords (11-20) ← opportunity zone
  Page 3+  ████░░░░░░░░░░░░░░░░ 2 keywords

RANK VELOCITY (7-day sparkline per critical keyword)
  "online maths tutor london"   ▼▼▼▼▼  pos 4→9  (content stale 78 days)
  "a-level chemistry tutor"     ────── pos 6→6   stable
  "ib maths tutor"              ▲▲───  pos 11→8  improving
  ...

BACKLINK HEALTH
  Active: 142   Lost (7d): 4   Lost (30d): 11   Avg DR: 38
  ⚠ 1 high-DR backlink lost (DR 64 — Tech Education Blog)

CONTENT FRESHNESS
  Hubs updated <90d: 4/7   Spokes updated <90d: 18/30
  3 hubs flagged: stale content + position below target
  [View Stale Content] → links to /admin/seo/hubs filtered by freshness

QUICK WINS (keywords pos 6-20, difficulty < 60, volume > 100)
  "online maths tutoring"    pos 8   vol: 1,200   difficulty: 38
  "maths tutor near me"      pos 14  vol: 880     difficulty: 42
  [Start Content Update] → triggers Content Decay Recovery workflow
```

### API Route

```typescript
// GET /api/admin/seo/intelligence
// Returns all data needed for SEO tab in Signal

interface SEOIntelligenceResponse {
  period: { start: string; end: string };
  ranking: {
    avg_position: number;
    avg_position_delta: number;
    top5: number;
    top10: number;
    page2: number;
    biggest_drop: KeywordMovement;
    biggest_gain: KeywordMovement;
    velocity: Array<{ keyword: string; sparkline: number[]; current: number; delta: number }>;
  };
  gsc: {
    impressions_7d: number;
    impressions_delta_pct: number;
    clicks_7d: number;
    avg_ctr: number;
  };
  backlinks: {
    active: number;
    lost_7d: number;
    lost_30d: number;
    avg_dr: number;
    high_dr_lost: BacklinkRecord[];
  };
  content: {
    hubs_stale: number;
    spokes_stale: number;
    avg_hub_seo_score: number;
    stale_hubs: HubRecord[];
  };
  quick_wins: KeywordRecord[];
}
```

---

## 8. Conductor Workflow: Content Decay Recovery (Phase 3)

```
Name: Content Decay Recovery
Feature: SEO
Trigger: Market Intelligence flags rank_drop_critical OR hub_content_stale

Steps:
  1. Identify affected hub/spoke (Market Intelligence provides url, keyword, position delta)
  2. Query current content: word count, last updated, SEO score, top 3 competing pages
  3. Generate content brief via getAIService().generateJSON():
     "This hub covers [topic]. It ranked #4, now #9. Competitors at #4-8 have:
      avg 2,200 words (ours: 1,600), 8 internal links (ours: 3), published <30 days ago.
      Recommended actions: [list]"
  4. HITL: Admin sees brief → [Assign to Content Team] / [Schedule Update] / [Dismiss]
  5. If assigned: create task in exception queue with content brief attached
  6. Monitor: check position again in 21 days, write decision_outcome

Autonomy: supervised (always requires admin approval before action)
```

---

## 9. Competitor Intelligence

The Market Intelligence agent already queries booking trends and subject demand. SEO competitor data extends this: which competitors are ranking for our target keywords, and are they gaining ground?

```sql
-- Competitor keyword overlap analysis
SELECT
  c.domain,
  c.domain_authority,
  COUNT(cr.keyword_id)              AS shared_keywords,
  AVG(cr.position)                  AS avg_competitor_position,
  AVG(k.current_position)           AS avg_our_position,
  AVG(k.current_position) - AVG(cr.position) AS position_gap
FROM seo_competitors c
JOIN seo_competitor_rankings cr ON cr.competitor_id = c.id
JOIN seo_keywords k ON k.id = cr.keyword_id
WHERE k.priority IN ('critical', 'high')
GROUP BY c.domain, c.domain_authority
ORDER BY position_gap DESC;  -- positive = they're winning
```

Alert: if a competitor gains ≥ 3 positions on a critical keyword in 7 days → `competitor_ranking_gain` flag.

---

## 10. Implementation Plan

### Phase 3

| Task | Estimate | Output |
|------|----------|--------|
| `seo_platform_metrics_daily` table (migration 357) | 2h | Schema + pg_cron 08:00 |
| `query_seo_health` + `query_keyword_opportunities` tool registration | 2h | Market Intelligence tools |
| SEO alert rules (8 conditions) | 2h | Market Intelligence system_prompt additions |
| `GET /api/admin/seo/intelligence` | 4h | Signal SEO tab data API |
| Admin Signal — SEO tab UI | 6h | Ranking health, velocity, backlinks, freshness, quick wins |
| Content Decay Recovery workflow | 4h | Conductor Workflow definition + AI brief generation |
| **Phase 3 total** | **20h** | |

### Migration Numbers

| Migration | Content |
|-----------|---------|
| 357 | `seo_platform_metrics_daily` + `compute_seo_platform_metrics()` pg_cron |

---

## 11. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **SEO tools in Market Intelligence** (not separate agent) | SEO is an organic acquisition signal — it directly impacts marketplace supply/demand by driving which tutors and subjects are discovered. Market Intelligence already owns these demand signals. |
| **Alert on critical keywords only** by default | 14 critical keywords are worth watching daily. Alerting on all 100+ keywords would produce noise. Admin sets priority when adding keywords. |
| **Content brief generated by AI at workflow time** (not pre-computed) | The brief needs current competitor data, current content state, and position delta — computing this speculatively would waste tokens on hubs that never need intervention. |
| **Quick wins in Signal SEO tab** (not in /admin/seo/) | Quick wins are an intelligence output — they tell you where to act. The management UI (`/admin/seo/keywords`) is where you manage keywords. These are different jobs. |

---

## 12. Open Questions

| # | Question | Target |
|---|----------|--------|
| Q1 | Should the Content Decay Recovery brief be sent as an email to the content team, or only visible in the exception queue? | Phase 3 |
| Q2 | GSC integration: is the `seo_gsc_performance` table populated currently, or is GSC sync still pending credentials? | Phase 3 |
| Q3 | Competitor tracking: are `seo_competitors` rows seeded, or does admin add them manually? | Phase 3 |
| Q4 | Should "quick wins" feed back into the Growth Advisor? (e.g. "search for your subject shows tutors ranking #8 — here's how to appear higher") | Phase 4 |

---

*Version 1.0 — SEO Intelligence spec. Market Intelligence agent (Conductor) holds `query_seo_health`. Admin Signal SEO tab. Migration 357.*
