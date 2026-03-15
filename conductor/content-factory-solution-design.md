# Content Factory Solution Design

**Version:** 1.0
**Date:** 2026-03-13
**Status:** Draft — Design Review

---

## 1. Overview

The Content Factory wires three existing systems — **Conductor**, **Scheduler**, and **Resources** — into an automated content pipeline. A Content Team creates articles, a human reviews and manages publication schedules, and the intelligence pipeline measures performance to close the feedback loop.

### Design Principle

No new UIs. No new tables (except one bridge column). The three systems already exist — this design connects them.

---

## 2. Systems Inventory

| System | What it does | Key tables | Admin UI |
|--------|-------------|------------|----------|
| **Conductor** | Agent/Team management, execution, monitoring | `specialist_agents`, `agent_teams`, `agent_run_outputs`, `agent_team_run_outputs` | `/admin/conductor` |
| **Scheduler** | Task scheduling, recurrence, execution tracking | `scheduled_items`, `scheduler_runs` | `/admin/scheduler` |
| **Resources** | Article CRUD, publishing, SEO, intelligence scoring | `resource_articles`, `article_intelligence_scores`, `resources_platform_metrics_daily` | `/admin/resources` |

---

## 3. End-to-End Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CONTENT FACTORY                              │
│                                                                     │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐                │
│  │ CONDUCTOR │────▶│ RESOURCES │────▶│ SCHEDULER │                │
│  │           │     │           │     │           │                │
│  │ Content   │     │ Articles  │     │ Publish   │                │
│  │ creates   │     │ stored &  │     │ schedule  │                │
│  │ content   │     │ reviewed  │     │ managed   │                │
│  └───────────┘     └─────┬─────┘     └─────┬─────┘                │
│                          │                  │                      │
│                          ▼                  ▼                      │
│                    Human reviews      Auto-publish at              │
│                    in Resources UI    scheduled_at time            │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                    FEEDBACK LOOP                               │ │
│  │  article_intelligence_scores (daily 04:45 UTC)                │ │
│  │  ──▶ Content Team reads scores ──▶ adjusts next article       │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### Step-by-step

| Step | Actor | Action | System |
|------|-------|--------|--------|
| 1 | **Content Team** (scheduled or manual trigger) | Generates article draft based on series brief + intelligence signals | Conductor |
| 2 | **Content Writer agent** | Writes article (title, slug, content, category, tags, meta) | Conductor → Resources |
| 3 | **SEO Reviewer agent** | Checks readiness score, suggests meta improvements | Conductor |
| 4 | **Content Team** | Inserts article into `resource_articles` with `status='draft'` | Resources |
| 5 | **Human** | Reviews draft in Resources admin UI (`/admin/resources`) | Resources |
| 6 | **Human** | Approves → sets `status='scheduled'`, picks `scheduled_for` date | Resources |
| 7 | **Human** | Views/manages schedule in Scheduler UI (`/admin/scheduler`) | Scheduler |
| 8 | **Scheduler executor** (cron) | At `scheduled_for` time: flips `status='published'`, sets `published_at` | Scheduler → Resources |
| 9 | **Intelligence pipeline** | Scores article daily (views, conversions, revenue attribution) | Resources |
| 10 | **Content Team** (next run) | Reads intelligence scores → informs next article topic/angle | Conductor |

---

## 4. Content Team Design

### 4.1 Team Definition

| Field | Value |
|-------|-------|
| **Slug** | `content-team` |
| **Name** | Content Team |
| **Pattern** | `pipeline` |
| **Space** | `marketing` |
| **Trigger** | Scheduled (weekly) or manual from Conductor UI |

**Why pipeline?** Content creation is sequential — research → write → review → publish. Each step depends on the previous output. Not suitable for supervisor (parallel) or swarm (dynamic routing).

### 4.2 Agents

| Order | Agent Slug | Role | Responsibility |
|-------|-----------|------|----------------|
| 1 | `content-strategist` | Strategist | Reads series brief + intelligence scores. Picks next topic. Writes article brief (title, angle, target audience, keywords, category). |
| 2 | `content-writer` | Writer | Takes brief → produces full article (MDX content, meta_title, meta_description, tags, read_time estimate). |
| 3 | `content-reviewer` | Reviewer | Checks SEO readiness score (≥70 threshold). Validates tone, accuracy, keyword density. Returns approved/revision-needed with feedback. |

### 4.3 Pipeline Flow

```
content-strategist ──▶ content-writer ──▶ content-reviewer
     │                      │                    │
     │ Reads:               │ Reads:             │ Reads:
     │ - Series brief       │ - Article brief    │ - Full article
     │ - Intelligence scores│ - Platform context │ - SEO readiness
     │ - Published articles │                    │ - Style guide
     │                      │                    │
     │ Outputs:             │ Outputs:           │ Outputs:
     │ - Article brief      │ - Full article     │ - Approved article
     │   (topic, angle,     │   (MDX, meta,      │   OR revision notes
     │    keywords, cat)    │    tags)           │
```

### 4.4 Team Output → Resources

On pipeline completion (status='completed'):

1. Parse team result for article fields (title, slug, content, category, tags, meta_title, meta_description, read_time)
2. Insert into `resource_articles` with `status='draft'`, `author_name='Content Team'`
3. Store `article_id` in `agent_team_run_outputs.team_result` for traceability

This is a **new tool**: `publish_article_draft` — registered in `analyst_tools`, executed in `tools/executor.ts`.

### 4.5 Agent Tools

> **Note:** The `marketing` space must be created (or `go-to-market` renamed) before the team can be assigned.

| Agent | Tools needed |
|-------|-------------|
| content-strategist | `query_resources_health`, `query_editorial_opportunities`, `query_seo_health`, `query_keyword_opportunities`, `query_content_attribution` |
| content-writer | `publish_article_draft` (new) |
| content-reviewer | `query_seo_health`, `query_keyword_opportunities` |

### 4.6 Series Brief Input

The Content Team receives a series brief as its task input. Briefs live in git at `publications/strategy/s1-devops-to-agents.md` and `publications/strategy/s2-agents-to-education.md`.

The brief contains:
- Series narrative and positioning
- Article titles and angles (ordered)
- Target audience per article
- Cross-references to existing published articles

The human triggers the team with a task like: *"Write the next article in Series 1: Supervisor, Pipeline, or Swarm"* — or the scheduler triggers it on a weekly cadence with the series brief as input.

---

## 5. Scheduler Integration

### 5.1 Content Type Scheduling

The Scheduler already supports `type='content'` items. The bridge:

| `scheduled_items` field | Usage |
|------------------------|-------|
| `type` | `'content'` |
| `title` | Article title (display in calendar) |
| `metadata` | `{ article_id: UUID, article_slug: string }` |
| `scheduled_at` | Publication date/time |
| `status` | `'scheduled'` → `'completed'` on publish |

### 5.2 Auto-Publish Executor

A new cron route: `POST /api/cron/publish-scheduled-articles`

Runs every 15 minutes. Logic:

```
1. Query scheduled_items WHERE type='content' AND status='scheduled' AND scheduled_at <= now()
2. For each item:
   a. Read article_id from metadata
   b. Update resource_articles SET status='published', published_at=now() WHERE id=article_id AND status='scheduled'
   c. Update scheduled_items SET status='completed', completed_at=now()
   d. Insert scheduler_runs record (success/failure)
3. Respect lock_version for idempotency
```

### 5.3 Human Workflow in Scheduler UI

The Scheduler already has:
- Calendar view (see articles on their publish date)
- List view with type filters (filter to `type='content'`)
- Click item → view details → **"View Article"** link in metadata opens `/admin/resources/create?slug={article_slug}`

No new UI components needed. The "View Article" link is rendered from `metadata.article_slug` — this is a small enhancement to `SchedulerModal` or `SchedulerList` to detect `type='content'` and render the link.

### 5.4 Scheduling Flow

Two paths to schedule:

**Path A — From Resources UI:**
Human reviews draft → sets `status='scheduled'`, `scheduled_for` date → a trigger (DB or API) creates a matching `scheduled_items` row with `type='content'` and `metadata.article_id`.

**Path B — From Scheduler UI:**
Human creates `type='content'` scheduled item → selects article from dropdown → links `metadata.article_id`. Article status updated to `'scheduled'`.

**Recommended: Path A** — human works in Resources (where the article lives), scheduling automatically syncs to Scheduler for calendar visibility.

---

## 6. Resources Integration

### 6.1 Article Lifecycle

```
draft ──▶ scheduled ──▶ published
  │           │
  │           └── scheduled_for date set
  │               scheduled_items row created
  │
  └── Content Team writes here
      Human reviews here
```

### 6.2 Existing Fields (No Schema Changes)

| Field | Usage in content factory |
|-------|------------------------|
| `status` | `'draft'` → `'scheduled'` → `'published'` (already supported) |
| `scheduled_for` | Publication date (already exists, currently unused) |
| `published_at` | Set by auto-publish executor |
| `author_name` | `'Content Team'` for AI-generated, human name for manual |
| `category` | Set by content-strategist agent |
| `tags` | Set by content-writer agent |

### 6.3 New Column (Optional)

| Column | Type | Purpose |
|--------|------|---------|
| `team_run_id` | UUID, nullable | Links article back to the Content Team run that created it. Enables traceability from article → team run → agent outputs. |

### 6.4 Scheduler Sync Trigger

When `resource_articles.status` changes to `'scheduled'`:

- **Option A (DB trigger):** PostgreSQL trigger on UPDATE creates `scheduled_items` row automatically.
- **Option B (API-level):** The Resources PUT endpoint creates the `scheduled_items` row when it detects `status='scheduled'` + `scheduled_for IS NOT NULL`.

**Recommended: Option B** — keeps logic in the API layer where it's visible and testable, avoids hidden DB triggers.

---

## 7. Feedback Loop

### 7.1 Intelligence → Content Team

The `content-strategist` agent uses existing tools to read performance data:

| Tool | What it provides |
|------|-----------------|
| `query_resources_health` | Publishing pipeline health, stale drafts, SEO readiness |
| `query_editorial_opportunities` | Content gaps, category coverage, underperforming articles |
| `query_content_attribution` | Which articles drive bookings, revenue attribution |
| `query_seo_health` | Keyword rankings, missing meta, organic traffic trends |

These tools already exist and query `resources_platform_metrics_daily` and `article_intelligence_scores`.

### 7.2 Closed Loop

```
Content Team writes article
    ↓
Published on tutorwise.com/resources
    ↓
Daily intelligence pipeline scores it (04:45 UTC)
    ↓
Next Content Team run reads scores
    ↓
content-strategist adjusts: topic selection, keyword focus, category balance
    ↓
Content Team writes next article (informed by data)
```

---

## 8. Implementation Plan

### Phase 1 — Content Team (Conductor)

| Task | Detail |
|------|--------|
| Create `marketing` space | New space in `agent_spaces` (or rename `go-to-market`) |
| Create 3 specialist agents | `content-strategist`, `content-writer`, `content-reviewer` |
| Register `publish_article_draft` tool | In `analyst_tools` table + `executor.ts` |
| Create `content-team` | Pipeline pattern, 3 nodes, assigned to `marketing` space |
| Migration | Agent seeds + tool registration |

### Phase 2 — Scheduler Bridge

| Task | Detail |
|------|--------|
| Auto-publish cron | `POST /api/cron/publish-scheduled-articles` (every 15 min) |
| Resources API sync | PUT `/api/admin/resources/articles/[id]` creates `scheduled_items` row on `status='scheduled'` |
| "View Article" link | `SchedulerList`/`SchedulerModal` renders link for `type='content'` items |
| Migration | pg_cron entry for auto-publish |

### Phase 3 — Feedback Loop

| Task | Detail |
|------|--------|
| content-strategist tool access | Ensure agent config includes intelligence tools |
| Series brief loader | Tool or prompt injection that reads series plan from git or DB |
| Scheduled Content Team run | Weekly `scheduled_items` with `type='team_run'` targeting `content-team` |

---

## 9. What We're NOT Building

- **No new admin UI** — Conductor, Scheduler, and Resources UIs already exist
- **No new tables** — `scheduled_items`, `scheduler_runs`, `resource_articles`, `agent_teams` all exist
- **No social media posting** — LinkedIn/social is out of scope for v1 (manual via GTM playbook)
- **No auto-trigger from intelligence** — v1 is scheduled/manual; v2 could add event-driven triggers (e.g., "dead weight article detected → regenerate")
- **No multi-series parallel execution** — one team, one article at a time

---

## 10. Migration Estimate

| Migration | Contents |
|-----------|----------|
| 387 | 3 specialist agent seeds (content-strategist, content-writer, content-reviewer) |
| 387 | `publish_article_draft` tool in `analyst_tools` |
| 387 | `marketing` space in `agent_spaces` |
| 387 | `content-team` team definition (pipeline, 3 nodes, marketing space) |
| 387 | `team_run_id` column on `resource_articles` (nullable UUID) |
| 388 | pg_cron: `publish-scheduled-articles` every 15 min |
| 388 | pg_cron: `content-team` weekly run (day/time TBD) |

---

## 11. Open Questions

1. **Weekly cadence** — What day/time should the Content Team run? (e.g., Monday 06:00 UTC to have drafts ready for human review Monday morning?)
2. **Series priority** — Should the team alternate between Series 1 and Series 2, or complete one series first?
3. **Article categories** — The 5 existing categories (`for-clients`, `for-tutors`, `for-agents`, `education-insights`, `company-news`) may need expansion for thought-leadership content. Add `'thought-leadership'`?
4. **Author attribution** — Should AI-authored articles show `'Content Team'` or the founder's name?
5. **Approval gate** — Should the content-reviewer agent's "approved" status auto-insert to Resources, or should there always be a human step between team completion and draft insertion?
6. **Social cycle** — The LinkedIn GTM Playbook defines a 3-format repurpose cycle (full → carousel → repost). Should this be v1 or v2?
