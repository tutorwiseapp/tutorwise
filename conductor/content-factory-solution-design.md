# Content Factory Solution Design

**Version:** 2.0
**Date:** 2026-03-15
**Status:** Draft — Design Review
**Depends on:** [conductor-solution-design.md](conductor-solution-design.md) (platform architecture)

---

## 1. Overview

The Content Factory wires **Conductor**, **Resources**, and **Scheduler** into an automated content pipeline. A Content Team creates articles, a human reviews and either approves or requests revisions with specific feedback, the Scheduler manages publication timing, and the intelligence pipeline measures performance to close the feedback loop.

### Design Principles

1. **Wire existing systems** — Conductor, Resources, and Scheduler already exist. Connect them.
2. **Human-in-the-loop** — AI drafts, human decides. Approve, edit, or revise with feedback.
3. **Smart revision, not rejection** — When content isn't right, tell the AI *why* and let it fix it.
4. **Max 3 revision rounds** — After 3 rounds, human edits directly. No infinite loops.

---

## 2. Systems Inventory

| System | What it does | Key tables | Admin UI |
|--------|-------------|------------|----------|
| **Conductor** | Agent/Team management, execution, monitoring | `specialist_agents`, `agent_teams`, `agent_run_outputs`, `agent_team_run_outputs` | `/admin/conductor` |
| **Resources** | Article CRUD, publishing, SEO, intelligence scoring | `resource_articles`, `article_intelligence_scores`, `resources_platform_metrics_daily` | `/admin/resources` |
| **Scheduler** | Task scheduling, calendar view, execution tracking | `scheduled_items`, `scheduler_runs` | `/admin/scheduler` |

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
│  │ Team      │◀──  │ stored &  │     │ calendar  │                │
│  │ creates   │ rev │ reviewed  │     │ + auto-   │                │
│  │ content   │     │           │     │ publish   │                │
│  └───────────┘     └─────┬─────┘     └─────┬─────┘                │
│                          │                  │                      │
│                          ▼                  ▼                      │
│               Human reads draft       Auto-publish at              │
│               ├─ Approve (pick date)  scheduled_at time            │
│               ├─ Edit → then Approve  → Human posts to LinkedIn   │
│               └─ Revise → AI reruns                                │
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
| 2 | **Content Writer agent** | Writes article (title, slug, content, category, tags, meta) | Conductor |
| 3 | **Content Reviewer agent** | Checks SEO readiness score, suggests meta improvements | Conductor |
| 4 | **Content Team** | Inserts article into `resource_articles` with `status='draft'` | Resources |
| 5 | **Human** | Reviews draft in Resources admin UI (`/admin/resources`) | Resources |
| 6a | **Human** | **Approve** → picks publish date → `status='scheduled'`, creates `scheduled_items` row | Resources → Scheduler |
| 6b | **Human** | **Edit** → modify content directly, then Approve (pick date) | Resources |
| 6c | **Human** | **Revise** → pick revision type + optional notes → triggers Content Team rerun | Conductor |
| 7 | **Content Team** (revision run) | Rewrites article using revision feedback. Updates same `resource_articles` row | Conductor → Resources |
| 8 | **Human** | Reviews revised draft → Approve, Edit, or Revise again (max 3 rounds) | Resources |
| 9 | **Scheduler cron** | At `scheduled_at` time: `status='published'`, `published_at=now()` | Scheduler → Resources |
| 10 | **Human** | Manually posts article to LinkedIn (until LinkedIn integration in v2) | Manual |
| 11 | **Intelligence pipeline** | Scores published article daily (views, conversions, revenue attribution) | Resources |
| 12 | **Content Team** (next new article run) | Reads intelligence scores → informs next article topic/angle | Conductor |

---

## 4. Content Team Design

### 4.1 Team Definition

| Field | Value |
|-------|-------|
| **Slug** | `content-team` |
| **Name** | Content Team |
| **Pattern** | `pipeline` |
| **Space** | `marketing` |
| **Trigger** | Scheduled (weekly), manual from Conductor UI, or revision request from Resources UI |

**Why pipeline?** Content creation is sequential — research → write → review. Each step depends on the previous output. Not suitable for supervisor (parallel) or swarm (dynamic routing).

### 4.2 Agents

| Order | Agent Slug | Role | Responsibility |
|-------|-----------|------|----------------|
| 1 | `content-strategist` | Strategist | Reads series brief + intelligence scores. Picks next topic. Writes article brief (title, angle, target audience, keywords, category). On **revision runs**: skipped (brief already exists). |
| 2 | `content-writer` | Writer | Takes brief → produces full article (MDX content, meta_title, meta_description, tags, read_time estimate). On **revision runs**: receives original article + revision feedback, rewrites accordingly. |
| 3 | `content-reviewer` | Reviewer | Checks SEO readiness score (≥70 threshold). Validates tone, accuracy, keyword density. Returns approved article or improvement notes. |

### 4.3 Pipeline Flow

**New article:**
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
     │   (topic, angle,     │   (MDX, meta,      │
     │    keywords, cat)    │    tags)           │
```

**Revision run:**
```
content-writer ──▶ content-reviewer
     │                    │
     │ Reads:             │ Reads:
     │ - Original article │ - Revised article
     │ - Revision feedback│ - SEO readiness
     │ - Revision type    │ - Style guide
     │                    │
     │ Outputs:           │ Outputs:
     │ - Revised article  │ - Approved article
```

### 4.4 Team Output → Resources

**New article** — on pipeline completion (status='completed'):

1. Parse team result for article fields (title, slug, content, category, tags, meta_title, meta_description, read_time)
2. Insert into `resource_articles` with `status='draft'`, `author_name='Content Team'`, `revision_count=0`
3. Store `article_id` in `agent_team_run_outputs.team_result` for traceability

**Revision** — on revision pipeline completion:

1. Parse revised article fields from team result
2. Update existing `resource_articles` row (same `id`): overwrite content, meta, tags
3. Increment `revision_count`, clear `revision_feedback`
4. Article stays `status='draft'` for human review

This is a **new tool**: `publish_article_draft` — registered in `analyst_tools`, executed in `tools/executor.ts`. Supports both insert (new) and update (revision) via upsert on slug.

### 4.5 Agent Tools

> **Note:** The `marketing` space must be created before the team can be assigned.

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

## 5. Human Review & Revision

### 5.1 Review Actions

When a human opens a draft article in `/admin/resources`, three actions are available:

| Action | What happens | UI element |
|--------|-------------|------------|
| **Approve** | Opens date picker. Sets `status='scheduled'`, creates `scheduled_items` row. Auto-publishes at chosen date/time. "Publish now" option for immediate publish. | Primary button (green) → date picker modal |
| **Edit** | Human modifies content directly in the editor, then clicks Approve | Existing article editor |
| **Revise** | Opens revision panel with preset options + free text. Triggers Content Team rerun | Secondary button (amber) |

### 5.2 Revision Types

Preset revision options (human picks one or more):

| Revision Type | Slug | Instruction sent to Content Team |
|--------------|------|----------------------------------|
| Friendlier tone | `friendlier_tone` | Rewrite with a warmer, more conversational tone. Use shorter sentences, personal pronouns, and relatable examples. |
| More professional | `more_professional` | Rewrite with a more formal, authoritative tone. Use industry terminology, cite sources, and maintain an expert voice. |
| Shorter | `shorter` | Condense to approximately 60% of current length. Keep the core argument and key points. Remove filler and redundancy. |
| More depth | `more_depth` | Expand with more detail, concrete examples, data points, and supporting evidence. Add subsections where appropriate. |
| Better SEO | `better_seo` | Improve keyword placement in headings, opening paragraph, and meta description. Add internal links. Optimise heading hierarchy. |
| Custom feedback | `custom` | *(Human writes free-text instructions)* |

Multiple types can be combined (e.g., "Friendlier tone" + "Shorter" + custom note).

### 5.3 Revision Flow

```
Human clicks Revise
  → Picks revision type(s) + optional free text
  → API: POST /api/admin/resources/articles/{id}/revise
     1. Validate revision_count < 3 (reject if at limit)
     2. Store revision_feedback on article row (JSONB)
     3. Trigger Content Team run with:
        - task_type: 'revision'
        - article_id: UUID
        - original_content: current article content
        - revision_types: ['friendlier_tone', 'shorter']
        - custom_feedback: "Also mention the UK market specifically"
     4. Content Team pipeline runs (writer → reviewer only, strategist skipped)
     5. Writer rewrites article using revision instructions
     6. publish_article_draft tool updates the same resource_articles row
     7. revision_count incremented
     8. Human reviews again
```

### 5.4 Revision Limits

- **Max 3 revision rounds per article.** After round 3, the Revise button is disabled.
- Human must then either **Edit** the content directly or **Approve** as-is.
- `revision_count` is displayed in the UI so the human knows how many rounds remain.
- No revision history — each revision overwrites the previous content.

### 5.5 Article Lifecycle

```
draft ──────────▶ scheduled ──────────▶ published
  │       ▲           │                     │
  │       │           │ Auto-publish at     │ Human manually
  │       │ Approve   │ scheduled_at time   │ posts to LinkedIn
  │       │ (pick     │                     │
  │       │  date)    │ "Publish now"       │
  │       │           │ = immediate         │
  │       │           │                     │
  └──▶ revising ──▶ draft (updated, revision_count++)
         │
         └── Content Team reruns with feedback
             (max 3 rounds, then Revise disabled)
```

| Status | Meaning |
|--------|---------|
| `draft` | AI-generated or revised. Awaiting human review. |
| `revising` | Revision in progress. Content Team is rewriting. |
| `scheduled` | Human approved. Waiting for scheduled publish date. Visible in Scheduler calendar. |
| `published` | Live on tutorwise.com/resources. Human can now post to LinkedIn manually. |

---

## 6. Resources Integration

### 6.1 Existing Fields (No Schema Changes)

| Field | Usage in content factory |
|-------|------------------------|
| `status` | `'draft'` → `'scheduled'` → `'published'`. `'revising'` added. |
| `scheduled_for` | Publication date (already exists). Set when human approves. |
| `published_at` | Set by auto-publish cron at `scheduled_for` time |
| `author_name` | `'Content Team'` for AI-generated, human name for manual |
| `category` | Set by content-strategist agent |
| `tags` | Set by content-writer agent |

### 6.2 New Columns

| Column | Type | Purpose |
|--------|------|---------|
| `team_run_id` | UUID, nullable | Links article to the Content Team run that created/revised it |
| `revision_count` | INTEGER, default 0 | Tracks revision rounds (max 3) |
| `revision_feedback` | JSONB, nullable | Stores current revision request: `{ types: string[], custom?: string }`. Cleared after revision completes |

### 6.3 New API Routes

**`POST /api/admin/resources/articles/{id}/revise`**

Request body:
```json
{
  "types": ["friendlier_tone", "shorter"],
  "custom": "Also mention the UK market specifically"
}
```

Logic:
1. Load article, check `status='draft'` and `revision_count < 3`
2. Set `status='revising'`, store `revision_feedback`
3. Trigger `content-team` run via TeamRuntime with revision task input
4. Return `{ status: 'revising', revision_count: N }`

**`POST /api/admin/resources/articles/{id}/approve`**

Request body:
```json
{
  "scheduled_for": "2026-03-20T09:00:00Z"
}
```

Logic:
1. Load article, check `status='draft'`
2. Set `status='scheduled'`, `scheduled_for` date
3. Create `scheduled_items` row with `type='content'`, `metadata.article_id`
4. If `scheduled_for` is null or in the past → publish immediately (`status='published'`, `published_at=now()`)
5. Return `{ status: 'scheduled' | 'published' }`

---

## 7. Scheduler Integration

### 7.1 Content Type Scheduling

The Scheduler already supports `type='content'` items. The bridge:

| `scheduled_items` field | Usage |
|------------------------|-------|
| `type` | `'content'` |
| `title` | Article title (display in calendar) |
| `metadata` | `{ article_id: UUID, article_slug: string }` |
| `scheduled_at` | Publication date/time |
| `status` | `'scheduled'` → `'completed'` on publish |

### 7.2 Auto-Publish Cron

Route: `POST /api/cron/publish-scheduled-articles`

Runs every 15 minutes. Logic:

```
1. Query scheduled_items WHERE type='content' AND status='scheduled' AND scheduled_at <= now()
2. For each item:
   a. Read article_id from metadata
   b. Update resource_articles SET status='published', published_at=now()
      WHERE id=article_id AND status='scheduled'
   c. Update scheduled_items SET status='completed', completed_at=now()
   d. Insert scheduler_runs record (success/failure)
```

### 7.3 Human Workflow

1. **Approve with date** — human approves article in Resources UI, picks a publish date
2. **Calendar view** — article appears in Scheduler calendar on that date (`/admin/scheduler`)
3. **Auto-publish** — cron publishes at the scheduled time
4. **LinkedIn** — human sees the published article, manually posts to LinkedIn (v1). Automated LinkedIn posting in v2.

### 7.4 Scheduler UI Enhancements

The Scheduler already handles `type='content'` items with article dropdown. One small enhancement:

- **"View Article" link** — when viewing a `type='content'` scheduled item, render a link to `/admin/resources/{article_slug}` so the human can quickly navigate to the article

---

## 8. Feedback Loop

### 8.1 Intelligence → Content Team

The `content-strategist` agent uses existing tools to read performance data:

| Tool | What it provides |
|------|-----------------|
| `query_resources_health` | Publishing pipeline health, stale drafts, SEO readiness |
| `query_editorial_opportunities` | Content gaps, category coverage, underperforming articles |
| `query_content_attribution` | Which articles drive bookings, revenue attribution |
| `query_seo_health` | Keyword rankings, missing meta, organic traffic trends |

These tools already exist and query `resources_platform_metrics_daily` and `article_intelligence_scores`.

### 8.2 Closed Loop

```
Content Team writes article
    ↓
Human approves → published on tutorwise.com/resources
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

## 9. Implementation Plan

### Phase 1 — Content Team + Review + Scheduler

| Task | Detail |
|------|--------|
| Create `marketing` space | New space in `agent_spaces` |
| Create 3 specialist agents | `content-strategist`, `content-writer`, `content-reviewer` |
| Register `publish_article_draft` tool | In `analyst_tools` table + `executor.ts` (supports insert + upsert) |
| Create `content-team` | Pipeline pattern, 3 nodes, assigned to `marketing` space |
| Add columns to `resource_articles` | `team_run_id`, `revision_count`, `revision_feedback` |
| Add `revising` status | ALTER CHECK constraint on `resource_articles.status` |
| Revise API route | `POST /api/admin/resources/articles/{id}/revise` |
| Approve API route | `POST /api/admin/resources/articles/{id}/approve` (creates `scheduled_items` row) |
| Auto-publish cron | `POST /api/cron/publish-scheduled-articles` (every 15 min) |
| Approve/Revise UI | Approve button (with date picker) + Revise panel with preset options |
| "View Article" link | Scheduler renders link for `type='content'` items |
| Migration | 406: seeds + schema changes + pg_cron |

### Phase 2 — Feedback Loop

| Task | Detail |
|------|--------|
| content-strategist tool access | Ensure agent config includes intelligence tools |
| Series brief loader | Tool or prompt injection that reads series plan from git or DB |
| Scheduled Content Team run | Weekly `scheduled_items` with `type='team_run'` targeting `content-team` |

### Phase 3 — LinkedIn Automation (v2)

| Task | Detail |
|------|--------|
| LinkedIn API integration | OAuth2 connection, post creation |
| Auto-post on publish | When auto-publish cron fires, also post to LinkedIn |
| Content repurposing | Article → LinkedIn format (long-form → post summary) |

---

## 10. What We're NOT Building (v1)

- **No automated LinkedIn posting** — human manually posts after publish. Automated in v2.
- **No revision history** — each revision overwrites the previous content.
- **No auto-trigger from intelligence** — v1 is scheduled/manual; v2 could add event-driven triggers.
- **No multi-series parallel execution** — one team, one article at a time.

---

## 11. Migration Estimate

| Migration | Contents |
|-----------|----------|
| 406 | `marketing` space in `agent_spaces` |
| 406 | 3 specialist agent seeds (content-strategist, content-writer, content-reviewer) |
| 406 | `publish_article_draft` tool in `analyst_tools` |
| 406 | `content-team` team definition (pipeline, 3 nodes, marketing space) |
| 406 | `team_run_id`, `revision_count`, `revision_feedback` columns on `resource_articles` |
| 406 | `revising` added to `resource_articles.status` CHECK constraint |
| 406 | pg_cron: `publish-scheduled-articles` every 15 min |

---

## 12. Open Questions

1. **Weekly cadence** — What day/time should the Content Team run? (e.g., Monday 06:00 UTC to have drafts ready for human review Monday morning?)
2. **Series priority** — Should the team alternate between Series 1 and Series 2, or complete one series first?
3. **Article categories** — The 5 existing categories (`for-clients`, `for-tutors`, `for-agents`, `education-insights`, `company-news`) may need expansion for thought-leadership content. Add `'thought-leadership'`?
4. **Author attribution** — Should AI-authored articles show `'Content Team'` or the founder's name?
