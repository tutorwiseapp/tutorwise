# LinkedIn Go-to-Market Playbook — Thought Leadership + Resources

**Owner:** Michael Quan
**Created:** 2026-03-12
**Status:** Ready to execute

---

## Overview

This playbook covers the end-to-end publishing strategy for Tutorwise's thought-leadership content across LinkedIn and owned channels. It combines:

1. **3 thought-leadership articles** (already written, in `conductor/publish/`)
2. **Resources blog** (live at tutorwise.com/resources — 3 articles published)
3. **2 enterprise papers** (white paper + investor thesis — pre-publish)
4. **LinkedIn distribution** — posting cadence, visual style, repurpose cycle

The goal is **enterprise credibility + investor narrative**, not developer mindshare.

---

## Content Inventory

### Thought-Leadership Articles (LinkedIn + Resources Blog)

| # | File | Title | Core Thesis |
|---|---|---|---|
| 1 | `03-agent-marketplace-docker-hub-moment.md` | Agent Marketplace is the Docker Hub Moment | Discovery is the missing layer — agents need a registry like containers needed Docker Hub |
| 2 | `04-registry-not-framework.md` | Why Your AI Agent Framework Needs a Registry | Frameworks solve build-time; registries solve run-time — enterprises need the latter |
| 3 | `05-hitl-is-architecture.md` | HITL is Not a Feature. It's an Architecture | Human-in-the-loop must be designed into the architecture, not bolted on as a checkbox |

### Enterprise Papers (PDF / Direct Distribution)

| # | File | Title | Audience |
|---|---|---|---|
| 1 | `01-technical-white-paper.md` | AI Digital Workforce Architecture | CTOs, Platform Architects |
| 2 | `02-investor-thesis.md` | The Missing Infrastructure Layer for Enterprise AI | VCs, Angels, Board |

See `00-publishing-plan.md` for remaining work on papers before publication.

---

## LinkedIn Posting Strategy

### Format: Text-First Posts

LinkedIn's algorithm favours **native text posts** over link posts. For each article:

- Post as a **text post** (not a LinkedIn Article) — 1,300 characters max for above-fold visibility
- Structure: Hook (1 line) → Story/Insight (3-4 short paragraphs) → CTA
- **Link goes in the first comment**, not in the post body (avoids algorithm suppression)
- Tag 2-3 relevant people or companies (only if genuine connection)
- No hashtag spam — max 3 targeted hashtags: `#AIAgents`, `#DevOps`, `#PlatformEngineering`

### Posting Cadence: 2-Day Cycle

| Day | Action | Article |
|---|---|---|
| Day 1 (Mon) | Full LinkedIn post | Article 1 — Docker Hub Moment |
| Day 3 (Wed) | Full LinkedIn post | Article 2 — Registry Not Framework |
| Day 5 (Fri) | Full LinkedIn post | Article 3 — HITL is Architecture |
| Day 7 (Sun) | Carousel repurpose | Article 1 |
| Day 9 (Tue) | Carousel repurpose | Article 2 |
| Day 11 (Thu) | Carousel repurpose | Article 3 |
| Day 13 (Sat) | Short-form repost (different hook) | Article 1 |
| Day 15 (Mon) | Short-form repost (different hook) | Article 2 |
| Day 17 (Wed) | Short-form repost (different hook) | Article 3 |

**Total: 9 posts across 17 days from 3 articles.**

After the cycle completes, evaluate engagement metrics before planning the next content batch.

### Repurpose Format Details

| Format | Spec | Notes |
|---|---|---|
| **Full post** | 1,000-1,300 chars, text-only, link in comment | Hook → insight → CTA |
| **Carousel** | 8-10 slides, 1200x1200px, PDF upload | One idea per slide, large text, slide 1 = hook, last slide = CTA |
| **Short repost** | 500-800 chars, different opening hook | New angle on same thesis, references original post |

---

## Visual Style Guide — Minimalist Solid Colour

### Why Minimalism

- Dramatic stock images (handshakes, cityscapes, abstract tech swirls) signal "generic content" — people scroll past
- Solid colour + clean typography signals confidence and authority — stands out in a feed full of visual noise
- LinkedIn's algorithm does not penalise text-on-colour images vs photos — engagement is not affected
- Consistent visual brand across all posts builds recognition

### Image Specs

| Element | Spec |
|---|---|
| **Dimensions** | 1200 x 627px (single image) / 1200 x 1200px (carousel slides) |
| **Background** | Single solid colour — one colour per article (see rotation below) |
| **Text** | 1 punchy line (the article's core thesis), white, bold sans-serif |
| **Font** | Inter or Plus Jakarta Sans, 48-60px (readable in mobile thumbnail) |
| **Logo** | Small Tutorwise wordmark, bottom-right corner, white or 60% opacity |
| **Layout** | Centred text, generous whitespace, no decorative elements |

### Colour Rotation

| Article | Colour | Hex | Headline on Image |
|---|---|---|---|
| Docker Hub Moment | Teal | `#0d9488` | "Your AI agents have a discovery problem." |
| Registry Not Framework | Navy | `#1e293b` | "You don't need another framework. You need a registry." |
| HITL is Architecture | Slate | `#475569` | "HITL is not a feature. It's an architecture." |

### Carousel Slides

- Same solid-colour background throughout the carousel (visual consistency)
- Slide 1: Hook question (large text, centred)
- Slides 2-8: One key point per slide, large text
- Slide 9: CTA — "Full article: link in comments"
- Last slide: Tutorwise logo + Michael Quan byline

### Tools

- **Canva** — create a 1200x627 template with solid fill + text, duplicate for each article (<5 min per image)
- **Figma** — if pixel-level control is needed, single frame with colour/text swap

---

## Resources Blog Integration

### Current State

The Tutorwise Resources blog (`/resources`) is live with 3 published articles, all in the `thought-leadership` category. The admin dashboard has been upgraded with KPI metrics from `resources_platform_metrics_daily`.

### Cross-Posting Flow

```
Article written (conductor/publish/)
      |
      v
Published to Resources blog (tutorwise.com/resources)
      |
      v
LinkedIn post goes live (text post, link in first comment to /resources/[slug])
      |
      v
Repurpose cycle: carousel (day +6) → repost (day +12)
```

### SEO Benefit

Each LinkedIn post drives traffic to the canonical URL on tutorwise.com/resources. This:
- Builds domain authority on the `/resources` path
- Generates view_count data visible in the admin Resources dashboard
- Feeds the `resources_platform_metrics_daily` pipeline for tracking article performance

---

## Enterprise Papers — Distribution Strategy

The white paper and investor thesis follow a different distribution path (see `00-publishing-plan.md` for full detail). Summary:

### Phase 1 — Warm Network (before LinkedIn articles)
1. Share investor thesis with warm VC contacts (pre-pitch conversation starter)
2. Share white paper with potential enterprise design partners
3. Collect feedback on framing

### Phase 2 — LinkedIn Articles (after thought-leadership posts)
4. Publish white paper as a **LinkedIn Article** (long-form, founder byline)
   - Headline: *"I built one of the UK's first container-as-a-service platforms. Here's what I learned about orchestrating AI agents at scale."*
   - This publishes AFTER the 3 thought-leadership posts have established the narrative

### Phase 3 — External Publication
5. Submit white paper to The New Stack or InfoQ
6. Consider PlatformCon / KubeCon submission

### Sequencing

```
Week 1-3:  Thought-leadership posts (3 articles x 3 formats = 9 posts)
Week 4:    LinkedIn Article — full white paper (founder byline)
Week 5+:   External publication submissions
Ongoing:   Investor thesis shared 1:1 alongside pitch deck
```

The thought-leadership posts warm the audience before the longer white paper drops. By Week 4, Michael's LinkedIn profile has 9 recent posts establishing the container-to-agent narrative — the white paper then feels like a natural deep-dive, not a cold drop.

---

## Post Templates

### Template: Full LinkedIn Post

```
[One-line hook — provocative claim or question]

[2-3 short paragraphs — the core insight, told as a story or observation]

[Brief reference to Tutorwise — "We built this." / "This is live in production."]

[CTA — "Full article in the comments." or "What's your take?"]

#AIAgents #PlatformEngineering #DevOps
```

### Template: Carousel (10 slides)

```
Slide 1:  Hook question (large text, coloured background)
Slide 2:  "Here's the problem..." (set up the pain)
Slide 3:  The current state (what most people do)
Slide 4:  Why it fails (the gap)
Slide 5:  The insight (the core thesis)
Slide 6:  How it works (1 key mechanism)
Slide 7:  The parallel (container/DevOps analogy)
Slide 8:  What changes (the "so what")
Slide 9:  "This is live in production." (proof point)
Slide 10: CTA + byline + logo
```

### Template: Short-Form Repost

```
[Different hook angle — reframe the same thesis from a new perspective]

[1-2 paragraphs — tighter, more opinionated version]

I wrote about this last week: [reference to original post]

#AIAgents #DevOps
```

---

## Conductor Intelligence — GTM Tracking Infrastructure

### What's Already Built

The Conductor has a full intelligence layer tracking every stage of the GTM funnel. These run automatically — no manual setup needed.

#### Daily Metrics Pipeline (pg_cron)

| Time (UTC) | Table | What It Computes |
|---|---|---|
| 04:30 | `resources_platform_metrics_daily` | Total published, drafts, readiness scores, stale content |
| 04:45 | `article_intelligence_scores` | Per-article: views, bookings, revenue, conversion rate, band (Star/Dead Weight) |
| 05:00 | `seo_platform_metrics_daily` | Keywords ranking, organic traffic, coverage gaps |
| 06:00 | `marketplace_platform_metrics_daily` | Supply/demand, search events, listing views |
| 06:30 | `bookings_platform_metrics_daily` | Conversion rates, completion, payment confirmation |
| 07:00 | `listings_platform_metrics_daily` | Listing quality, completeness scores |
| 07:30 | `financials_platform_metrics_daily` | Revenue, payouts, reconciliation |

#### 3 Specialist Agents (running independently)

| Agent | Schedule | Covers |
|---|---|---|
| `operations-monitor` | Daily 07:00 UTC | CaaS trust foundation |
| `retention-monitor` | Daily 08:00 UTC | Bookings → Financials → Referral |
| `market-intelligence` | Weekly Mon 09:00 UTC | Resources → SEO → Signal → Marketplace → Listings |

#### 14 Analyst Tools (all live in `executor.ts`)

```
query_resources_health          query_editorial_opportunities
query_seo_health                query_keyword_opportunities
query_content_attribution       query_marketplace_health
query_supply_demand_gap         query_listing_health
query_pricing_intelligence      query_booking_health
query_financial_health          query_virtualspace_health
query_caas_health               query_referral_funnel
```

#### Article Intelligence Scoring

Each published article is scored daily (04:45 UTC) on a 0-100 composite:

| Weight | Factor | Source |
|---|---|---|
| 40% | Conversion (bookings / views) | 14-day attribution window |
| 30% | Revenue attributed | Signal events → bookings → payments |
| 20% | Traffic volume | view_count from `/resources/[slug]` |
| 10% | Freshness | Days since last update |

**Bands:** Star (80+) · Performer (60+) · Opportunity (40+) · Underperformer (20+) · Dead Weight (<20)

#### Admin Intelligence Surfaces

| What | Where in Admin |
|---|---|
| Resources KPI dashboard | `/admin/resources` → Overview tab |
| Article performance bands | `/admin/signal` → Articles tab (Signal Intelligence) |
| SEO keyword gaps | `/admin/signal` → SEO tab |
| Content attribution | `/admin/signal` → Content Attribution |
| Full-funnel intelligence | `/admin/conductor` → Intelligence tab (10 sub-tabs) |

### GTM Agent Team (to be created)

The missing piece: a **GTM Strategy Team** that coordinates the 3 solo agents into a unified weekly brief.

| Field | Value |
|---|---|
| **Slug** | `gtm-team` |
| **Name** | GTM Strategy Team |
| **Pattern** | Supervisor |
| **Space** | go-to-market |
| **Coordinator** | `market-intelligence` |
| **Members** | `market-intelligence`, `retention-monitor`, `operations-monitor` |
| **Schedule** | Weekly Mon 10:00 UTC (after all 3 agents complete solo runs) |

#### How to Create

1. Go to `/admin/conductor` → **Build** tab
2. Click the **Go to Market** space
3. Add a new team (drag from palette or click +)
4. Set properties in the right drawer:
   - Name: `GTM Strategy Team`
   - Slug: `gtm-team`
   - Pattern: `Supervisor`
   - Coordinator: `market-intelligence`
5. Drill into the team → drag `market-intelligence`, `retention-monitor`, `operations-monitor` onto the canvas
6. Save

The weekly cron trigger (Mon 10:00 UTC) requires a migration — this automates the team run after all 3 solo agents complete.

#### Node Topology

```
  retention-monitor ──→ market-intelligence (coordinator)
                              ↑
  operations-monitor ─────────┘
```

#### Weekly Brief Output

The coordinator synthesises all 3 agent outputs into a single GTM brief:

```
## GTM Weekly Brief — Week of [date]

### Content Performance (Resources + SEO)
- Articles published, avg readiness score
- Top performer: [article] — views, conversion rate
- SEO gap: [keyword] has traffic but no content

### Attribution (Signal)
- Star articles: [list with revenue attribution]
- Dead weight: [list — recommend refresh or retire]
- Total content-attributed revenue: £X

### Funnel Health (Marketplace → Bookings → Financials)
- Marketplace conversion rate
- Booking completion rate
- Revenue this week vs last week

### Operational Readiness (CaaS)
- Trust score, agent uptime

### Recommendations
1. [Cross-signal action item]
2. [Cross-signal action item]
3. [Cross-signal action item]
```

### LinkedIn → Conductor Feedback Loop

```
LinkedIn post (Day 1)
  │
  ├─→ Click-through to tutorwise.com/resources/[slug]
  │     └─→ view_count incremented
  │           └─→ article_intelligence_scores updated (04:45 UTC)
  │
  ├─→ Carousel (Day 7) → second traffic spike
  │
  └─→ Repost (Day 13) → long-tail traffic
        │
        └─→ Market Intelligence agent detects:
              "Article X views +340% week-over-week"
              "Article X attribution: 2 bookings, £180 revenue"
              │
              └─→ GTM Team weekly brief:
                    "Double down on HITL topic — highest
                     content-to-revenue conversion this quarter"
```

This closes the loop: content published → distributed on LinkedIn → traffic tracked → attribution scored → intelligence surfaced → next content decision informed.

---

## Metrics to Track

| Metric | Where | Target |
|---|---|---|
| LinkedIn impressions per post | LinkedIn Analytics | >2,000 by post 5 |
| LinkedIn engagement rate | LinkedIn Analytics | >3% (likes + comments / impressions) |
| Click-throughs to /resources | Tutorwise admin Resources dashboard (view_count) | >50 per article per week |
| New LinkedIn connections (CTO/VP Eng) | LinkedIn network | 10+ enterprise-level per month |
| Inbound DMs referencing content | LinkedIn inbox | Any = signal working |
| Investor thesis forwards | Email/LinkedIn tracking | Track manually |

---

## Checklist Before First Post

- [ ] All 3 articles published on tutorwise.com/resources (confirmed: 3 live)
- [ ] Admin Resources dashboard showing real metrics (confirmed: upgraded 2026-03-12)
- [ ] Phantom articles removed from public sidebar (confirmed: fixed 2026-03-12)
- [ ] MDX rendering working on article pages (confirmed: fixed 2026-03-12)
- [ ] Canva/Figma templates created (3 colours x 2 formats = 6 images)
- [ ] LinkedIn profile headline updated to reflect AI orchestration positioning
- [ ] First post drafted and reviewed
- [ ] Link to article ready for first comment

---

## Key Rules

1. **Never post the link in the post body** — always in the first comment
2. **Never use stock photos** — solid colour + typography only
3. **Never dilute the three messaging anchors** (see `00-publishing-plan.md`):
   - "The orchestration gap, not the model gap"
   - "Container engineering patterns applied to AI agents"
   - "The Digital Workforce is not a future concept. It is in production."
4. **Post consistently** — the 2-day cadence matters more than any single post being perfect
5. **Engage in comments** — reply to every comment within 4 hours (LinkedIn rewards this)
