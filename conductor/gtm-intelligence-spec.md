# GTM Lifecycle — Intelligence Meta-Spec

**Version**: 1.0
**Date**: 2026-03-09
**Status**: Draft — for review
**Author**: Architecture

Related: [`conductor-solution-design-v3.md`](./conductor-solution-design-v3.md) · [`referral-intelligence-spec.md`](./referral-intelligence-spec.md)

> **This document is the capstone spec.** It does not replace the individual intelligence specs — it defines how they connect into two coherent Conductor use cases: the **GTM Lifecycle** and the **Referral Lifecycle**.

---

## 1. Purpose

Conductor operates on two parallel use cases:

| Use Case | Nature | Spec |
|----------|--------|------|
| **GTM Lifecycle** | Sequential 6-stage funnel — content to revenue | This document |
| **Referral Lifecycle** | Parallel acquisition track — inject at any stage | [`referral-intelligence-spec.md`](./referral-intelligence-spec.md) |

The GTM Lifecycle is not a single workflow. It is a **coordinated set of agent subscriptions, intelligence loops, intervention workflows, and feedback signals** spanning six stages. Conductor makes the platform self-correcting: when any stage degrades, the right Specialist Agent detects it, the right workflow fires, and the right admin action is surfaced.

**CaaS** is the trust quality foundation underpinning both use cases. **Signal** is the attribution layer that threads attribution evidence through all six stages simultaneously. Neither is a sequential stage — both run continuously.

---

## 2. The Two Lifecycle Architectures

### GTM Lifecycle — Standard Path

```
┌─────────────────────── SIGNAL (cross-cutting attribution) ────────────────────────┐
│  Article → search click → marketplace → listing → booking → payment              │
│  Segments by booking_type ('human' | 'ai_agent') to prevent metric contamination  │
│  Feeds Article Intelligence Score (Conv 40% + Revenue 30% + Traffic 20% + Fresh 10%)│
└───────────────────────────────────────────────────────────────────────────────────┘
                    ↑ reads attribution data from all 6 stages
                    ↓ writes intelligence back to all 6 stages

Resources ──► SEO ──► Marketplace ──► Listings ──► Bookings ──► Financials
  [1]          [2]        [3]            [4]           [5]           [6]

                         ↑
              CaaS (trust quality foundation — precondition for Marketplace, Listings,
                    Bookings eligibility AND Referral propensity)
```

### GTM Lifecycle — VirtualSpace Shortcut Path

VirtualSpace Free Help creates an **alternative conversion path** that bypasses Listings entirely:

```
Resources ──► SEO ──► Marketplace ──► [Free Help] ──────────────► Bookings ──► Financials
                           │              (instant                    ↑
                           │             booking,                     │
                           │             session_type='free_help')    │
                           └──► Listings ──────────────────────────►─┘
                                (standard path)

VirtualSpace also provides the execution layer within Bookings:
  Booking Confirmed → virtualspace_sessions (session_type='booking') → session delivered
```

Free Help is the lowest-friction acquisition event on the platform: a client gets immediate help, the tutor demonstrates value, and the 14-day conversion window captures the paid booking that follows.

### Referral Lifecycle — Parallel Track

Referral is not a GTM stage. It injects new users at any point in the GTM funnel:

```
GTM:    Resources → SEO → Marketplace → Listings → Bookings → Financials
                    ↑         ↑              ↑          ↑
Referral:      (article    (direct       (tutor      (agent
               share)       link)       share URL)   model)

All paths converge at Bookings (bookings.agent_id = referring profile)
All commissions = 10% lifetime, regardless of referrer role or referred user type
K-coefficient computed in Financials; trust amplified by CaaS score
```

---

## 3. Stage Gate Map

Each stage has a clear gate in and gate out — the condition that must be true for a user or piece of content to progress to the next stage.

| Stage | Gate In | Gate Out | Failure = |
|-------|---------|----------|-----------|
| **1. Resources** | Admin creates article | Article published + readiness score ≥ 70 | Article stays in draft; SEO loop never starts |
| **2. SEO** | Article published and indexed | Organic traffic landing on platform | Article ranks below page 3; no organic sessions |
| **3. Marketplace** | User lands on platform (organic, referral, direct) | User views a specific listing or initiates Free Help | User bounces; supply/demand gap; zero-result search |
| **4. Listings** | User views a listing page | Booking form initiated | Listing quality too low; price mismatch; no availability |
| **5. Bookings** | Booking form submitted + payment confirmed | Session marked Completed | Scheduling stall; cancellation; no-show |
| **6. Financials** | Session Completed → payment cleared | Payout disbursed + reconciled | Clearing stall; unreversed commission; payout failure |

**VirtualSpace shortcut gate:** Marketplace → [Free Help session completed] → Bookings (bypasses Listings gate).

---

## 4. Signal Intelligence Layer

Signal is not stage 3.5. It is a continuous attribution plane running in parallel to all stages.

### What Signal Reads

```
attribution chain:
  resources_articles (article_id)
    → signal attribution events (session_id)
    → marketplace listing views
    → bookings (booking_id, booking_type)
    → transactions (amount_total)
```

### What Signal Computes

| Computation | Formula | Written to |
|-------------|---------|-----------|
| Article Intelligence Score | Conv(40%) + Revenue(30%) + Traffic(20%) + Freshness(10%) | `article_intelligence_scores` |
| Score band | Star / Performer / Opportunity / Underperformer / Dead Weight | Same table |
| Opportunity detection | conv_rate > avg × 1.5 AND traffic < max × 0.3 | Feeds Article Boost workflow |

### booking_type Segmentation

Signal must segment every attributed booking by `booking_type`:
- `'human'` — human tutor booking (scheduling takes days, lower instant conversion)
- `'ai_agent'` — AI agent session (near-instant conversion, high volume)

Blending them makes Article Intelligence Score meaningless. A spike in AI session conversions would falsely inflate an article's Conversion component. Signal computes scores **per booking_type** and surfaces them separately.

### Signal Feedback to Each Stage

| Stage | Signal writes back |
|-------|-------------------|
| Resources | Star/Dead Weight classification → refresh, boost, or archive |
| SEO | Opportunity-band articles → Article Boost candidates (keyword gap + high conversion) |
| Marketplace | Subjects/locations with article-driven demand but no supply → recruitment alert |
| Listings | Listing attributes (delivery mode, price band, description length) correlated with conversion |
| Bookings | Subject/source combos with highest repeat booking rate (retention signal) |
| Financials | Revenue attribution per article → completes Revenue component (30%) of Intelligence Score |

---

## 5. CaaS Trust Foundation

CaaS (Credibility as a Service, 0–100) is the precondition for every stage past Marketplace.

```
CaaS score → Marketplace ranking (higher score = higher in search results)
           → Listing quality gate (listings with CaaS < 40 trigger Listing Quality Nudge)
           → Bookings eligibility (tutors with status != 'active' cannot receive bookings)
           → Referral trust amplifier (high CaaS → more referral propensity)

CaaS buckets:
  Delivery (40%) — completed sessions, ratings
  Credentials (20%) — qualifications, experience
  Network (15%) — connections, referrals made/received  ← referral loop feeds this
  Trust (10%) — identity verified, background check
  Digital (10%) — calendar sync, integrations
  Impact (5%) — free help sessions delivered            ← VirtualSpace Free Help feeds this
```

**CaaS ↔ Referral loop:** Higher CaaS → higher trust signal → higher referral propensity (K-coefficient). The Network bucket (15%) is directly fed by referrals made and received — so active referrers improve their CaaS score, which improves their marketplace ranking, which drives more bookings, which further improves their CaaS. This is the platform's core compounding flywheel.

**CaaS ↔ VirtualSpace loop:** Free Help sessions completed feed the Impact bucket (5%). Tutors who do more Free Help have higher CaaS scores. Higher CaaS = better marketplace ranking = more organic bookings.

Operations Monitor watches CaaS health daily (05:30 UTC) and surfaces alerts when median scores decline, stale scores accumulate, or the CaaS–revenue correlation weakens.

---

## 6. VirtualSpace — Dual Role in GTM

VirtualSpace has two distinct roles in the GTM lifecycle:

### Role 1: Free Help → Conversion Shortcut (Marketplace stage)

Free Help (`session_type='free_help'`) is an instant booking triggered from the Marketplace. It:
- Bypasses Listings stage entirely
- Delivers immediate value to the client
- Creates a 14-day conversion window for the paid booking
- Feeds tutor CaaS Impact bucket (free sessions delivered)
- Feeds Supply/demand intelligence (which subjects are tutors volunteering free help for)

Market Intelligence agent monitors the Free Help funnel via `query_virtualspace_health`:
- `free_help_conversion_rate` < 10% → alert: wrong subject pairing or tutor quality issue
- `tutors_online_avg_daily` < 3 → alert: supply thin for instant help

### Role 2: Session Execution Layer (Bookings stage)

Booking sessions (`session_type='booking'`) are the delivery vehicle for confirmed bookings. They:
- Are created automatically when a booking is Confirmed and session start approaches
- Link to `bookings.booking_id`
- Feed session quality signals: duration, whiteboard adoption, on-time start rate
- Short sessions (< 10 min) trigger a HITL advisory in the Booking Lifecycle workflow

The Booking Lifecycle workflow (shadow mode) enhances session delivery monitoring:
- Session delivered without VirtualSpace → logged for pattern analysis
- Session < 10 min → HITL: "Short session — possible technical issue"

---

## 7. Specialist Agent Coverage

Three Specialist Agents cover all six GTM stages. Their assignment follows the nature of the intelligence: demand signals → Market Intelligence, retention/revenue signals → Retention Monitor, platform operations/trust → Operations Monitor.

| Stage | Primary Agent | Secondary Agent | Tools |
|-------|--------------|-----------------|-------|
| Resources | Market Intelligence (weekly Mon 09:00) | — | `query_resources_health`, `query_editorial_opportunities` |
| SEO | Market Intelligence | — | `query_seo_health`, `query_keyword_opportunities` |
| Signal | Market Intelligence | — | `query_content_attribution` |
| Marketplace | Market Intelligence | Retention Monitor | `query_marketplace_health`, `query_supply_demand_gap` |
| VirtualSpace | Market Intelligence | — | `query_virtualspace_health` |
| Listings | Market Intelligence | — | `query_listing_health`, `query_pricing_intelligence` |
| Bookings | Retention Monitor (daily 08:00) | — | `query_booking_health` |
| Financials | Retention Monitor | Operations Monitor | `query_financial_health` |
| CaaS | Operations Monitor (daily 07:00) | — | `query_caas_health` |
| Referral | Retention Monitor | — | `query_referral_funnel`, `query_supply_demand_gap` |

**Why Market Intelligence owns Resources through Listings:** Content performance, SEO ranking, search attribution, and listing quality are all demand-side signals — they determine how many users discover the platform and how efficiently they convert. One agent, one coherent view of demand.

**Why Retention Monitor owns Bookings through Financials:** Session completion, revenue flow, payout health, and referral K-coefficient are all signals of sustainable revenue. One agent, one coherent view of retention and monetisation.

---

## 8. Intervention Workflow Map

All Conductor intervention workflows, mapped to the GTM stage that triggers them:

| Stage | Workflow | Trigger | Autonomy |
|-------|----------|---------|----------|
| Resources | Content Lifecycle | Article → pending_review | Supervised |
| Resources/SEO | Content Decay Recovery | rank_drop_critical OR hub_content_stale | Supervised |
| Signal | Article Boost | high_value_article_traffic_drop OR opportunity_score > 70 | Supervised |
| Marketplace | Supply Gap → Recruitment | supply_demand_gap (subject with 0 supply) | Supervised |
| Listings | Listing Quality Nudge | completeness_score < 70 | Autonomous (nudge) |
| Listings | Pricing Intelligence Alert | pricing_outliers_high > 15 | Supervised |
| Bookings | Scheduling Stall Intervention | Confirmed + unscheduled > 48h | Autonomous (flag) |
| Bookings | High Cancelling Tutor | cancel_rate > 30% AND count ≥ 3 | Supervised |
| Bookings | GMV Decline → Revenue Recovery | GMV < 80% of 4-week avg | Supervised |
| Bookings | Recurring Booking Loyalty Unlock | 3+ completed sessions, same pair | Autonomous |
| Financials | Pre-Payout Health Check | Thursday 09:00 UTC (before Friday payout) | Autonomous |
| Financials | Unreversed Commission Auto-Fix | unreversed_commissions > 0 | Supervised |
| Financials | Dispute Escalation | open_disputes +3 in 7 days | Supervised |
| CaaS | CaaS Stale Score Recovery | stale_count > 5% of active users | Supervised |
| Referral | Stuck Referral Recovery | status='Referred' AND created_at < 7 days ago | Supervised |
| Referral | Dormant Referrer Re-engagement | hub referrer 0 sends in 30d | Supervised |

---

## 9. Cross-Stage Feedback Loops

The GTM lifecycle is not a linear funnel — it is a flywheel. Intelligence from downstream stages feeds upstream improvements.

### Loop 1: Content Intelligence Loop (Resources ↔ Signal ↔ SEO)

```
Article published → SEO gate ≥ 70 → ranks → organic traffic → Signal attribution
    ↓                                                              ↓
Article Intelligence Score computed ←──────────────────────────────┘
    ↓
Star: protect + promote (Article Boost)
Opportunity: boost distribution
Underperformer: content audit (Content Decay Recovery)
Dead Weight: archive nudge
    ↓
Refresh/new article → back to Resources
```

### Loop 2: Supply/Demand Loop (Signal → Marketplace → Listings → Recruitment)

```
Signal: article demand rising for subject X
    ↓
Marketplace: search_count > 20, listing_count < 3 → supply_demand_gap alert
    ↓
Supply Gap → Recruitment workflow: [Launch tutor recruitment for subject X]
    ↓
New tutors → new listings for subject X
    ↓
Marketplace: supply/demand balanced → conversion rate recovers
```

### Loop 3: Payout Reliability → Referral Flywheel (Financials → Referral → Bookings)

```
Financials: reliable Friday payouts → tutors trust the platform
    ↓
Referral: tutors actively refer new clients (↑ K-coefficient)
    ↓
Bookings: more referred bookings (bookings.agent_id NOT NULL)
    ↓
Financials: more referral commission transactions → payout growth
    ↓ (back to start)
```

### Loop 4: CaaS Compounding Loop

```
Bookings completed + reviews → CaaS Delivery bucket ↑
    ↓
Referrals made + received → CaaS Network bucket ↑
    ↓
Free Help delivered → CaaS Impact bucket ↑
    ↓
Overall CaaS ↑ → Marketplace ranking ↑
    ↓
More profile/listing views → more bookings (back to start)
```

### Loop 5: Free Help → Paid Conversion Loop

```
Marketplace: user discovers Free Help option
    ↓
VirtualSpace: instant free session (session_type='free_help')
    ↓
14-day window: client books paid session with same tutor
    ↓
Bookings: new booking (Confirmed → Completed)
    ↓
Signal: booking attributed to Free Help entry (not article) — segmented by booking_type
    ↓
CaaS: tutor Impact bucket ↑ (free help delivered)
```

---

## 10. Admin Intelligence Surface Map

Every GTM stage has at least one admin intelligence surface — either an existing page enhanced, a new Signal tab, or a new admin page.

| Stage | Admin Surface | Type | Phase |
|-------|--------------|------|-------|
| Resources | `/admin/resources` — Intelligence panel | Enhanced (new section) | 3 |
| SEO | `/admin/signal` — SEO tab | New tab | 3 |
| Signal | `/admin/signal` — existing tabs enhanced | Enhancement | 3 |
| Marketplace | `/admin/signal` — Marketplace tab | New tab | 3 |
| VirtualSpace | `/admin/virtualspace` (or settings) | New page | 3 |
| Listings | `/admin/listings` — Intelligence panel | Enhanced | 3 |
| Bookings | `/admin/bookings` — Intelligence panel | Enhanced | 3 |
| Financials | `/admin/financials` — Intelligence panel | Enhanced | 3 |
| CaaS | `/admin/signal` — CaaS tab | New tab | 3 |
| Referral | `/admin/signal` — Referral tab | New tab | 3 |
| Referral (network) | `/admin/network/` | New page | 4 |

**Admin Signal tabs (full list after Phase 3):**
Overview · Articles · Funnel · Attribution · Listings · Journeys · Marketplace · CaaS · SEO · Referral

---

## 11. Growth Advisor Integration

Each GTM stage has a user-facing coaching layer in the Growth Advisor (`/growth`). The Growth Advisor is the human-readable output of Conductor intelligence — it translates platform signals into personal, actionable guidance.

| Stage | Growth Advisor coaching |
|-------|------------------------|
| Resources | Content impact (articles attributed to bookings); editorial opportunities by subject |
| SEO | Subject search position; quick-win keyword suggestions for tutor subjects |
| Signal | "Which articles sent viewers to your profile"; listing attributes that correlate with conversion |
| Marketplace | Profile visibility rank; incomplete profile fields dragging CaaS |
| VirtualSpace | Free Help → booking conversion; whiteboard adoption coaching |
| Listings | Completeness score; price vs subject benchmark; dead listing alerts |
| Bookings | Cancel rate vs avg; repeat rate vs avg; referral GMV earned |
| Financials | Available balance; payout timing; referral commission growth |
| CaaS | Score percentile; Easy Wins; multiplier upgrade path; marketplace visibility impact |
| Referral | Personal K-coefficient vs platform avg; top referral channel for their role |

---

## 12. Conductor Template Definition

The GTM Lifecycle is realised in Conductor as a collection of **agent subscriptions** and **intervention workflow triggers** — not a single monolithic workflow.

### Market Intelligence Agent Subscriptions

```
Schedule: weekly, Monday 09:00 UTC
Queries run each cycle:
  1. query_resources_health        → Resources stage
  2. query_editorial_opportunities → Resources/SEO gap analysis
  3. query_seo_health              → SEO stage
  4. query_keyword_opportunities   → SEO quick wins
  5. query_content_attribution     → Signal stage (Article Intelligence Scores)
  6. query_marketplace_health      → Marketplace stage
  7. query_supply_demand_gap       → Marketplace/Listings gap
  8. query_listing_health          → Listings stage
  9. query_pricing_intelligence    → Listings pricing
  10. query_virtualspace_health    → VirtualSpace shortcut

Workflow triggers (if alert flags fire):
  → Content Decay Recovery
  → Article Boost
  → Supply Gap → Recruitment
  → Listing Quality Nudge (batch)
  → Pricing Intelligence Alert
```

### Retention Monitor Agent Subscriptions

```
Schedule: daily, 08:00 UTC
Queries run each cycle:
  1. query_booking_health    → Bookings stage
  2. query_financial_health  → Financials stage
  3. query_referral_funnel   → Referral lifecycle
  4. query_supply_demand_gap → cross-reference with Marketplace

Workflow triggers (if alert flags fire):
  → Scheduling Stall Intervention (Bookings)
  → High Cancelling Tutor (Bookings)
  → GMV Decline → Revenue Recovery (Bookings/Financials)
  → Pre-Payout Health Check (Financials, Thu 09:00)
  → Unreversed Commission Auto-Fix (Financials)
  → Dispute Escalation (Financials)
  → Stuck Referral Recovery (Referral)
  → Dormant Referrer Re-engagement (Referral)
```

### Operations Monitor Agent Subscriptions

```
Schedule: daily, 07:00 UTC
Queries run each cycle:
  1. query_caas_health → CaaS foundation

Workflow triggers (if alert flags fire):
  → CaaS Stale Score Recovery
```

### DB Webhook Triggers (event-driven, outside agent schedules)

| Event | Table | Trigger | Workflow |
|-------|-------|---------|----------|
| Article → pending_review | `resources_articles` | UPDATE status | Content Lifecycle Stage 1 |
| Profile status → under_review | `profiles` | UPDATE status | Tutor Approval |
| Booking INSERT | `bookings` | INSERT | Booking Lifecycle (Human/AI) |
| Stripe payment webhook | Stripe → `/api/webhooks/stripe` | Payment confirmed | Booking Lifecycle resume |
| Cron: Fri 10:00 UTC | pg_cron | Weekly | Commission Payout |

---

## 13. Implementation Summary (Phase 3)

### Total Effort Across All GTM Specs

| Spec | Phase 3 effort |
|------|---------------|
| Resources | 18h |
| SEO | 20h |
| Signal | 27h |
| Marketplace | 24h |
| VirtualSpace | 14h |
| Listings | 20h |
| Bookings | 22h |
| Financials | 20h |
| CaaS | 30h |
| **GTM subtotal** | **~195h** |
| Referral (Phase 3) | 24h |
| Referral (Phase 4) | 34h |
| **Grand total (Phase 3+4)** | **~253h** |

---

## 14. Authoritative Migration Sequence

This is the single source of truth for all intelligence spec migrations. Migrations 353–363 are reserved for Conductor Feature Intelligence Specs (per `conductor-solution-design-v3.md` v3.7). Referral migrations follow at 364–365.

| Migration | Spec | Table / Object Created | pg_cron UTC |
|-----------|------|----------------------|-------------|
| 353–363 | Feature Intelligence Specs | (reserved — per conductor-solution-design-v3.md) | — |
| 355 | CaaS | `caas_platform_metrics_daily` | 05:30 |
| 356 | Resources | `resources_platform_metrics_daily` | 04:30 |
| 357 | SEO | `seo_platform_metrics_daily` | 05:00 |
| 358 | Signal | `article_intelligence_scores` | (on-demand compute) |
| 359 | Marketplace | `marketplace_platform_metrics_daily` + `marketplace_search_events` | 06:00 |
| 360 | Bookings | `bookings_platform_metrics_daily` | 06:30 |
| 361 | Listings | `listings_platform_metrics_daily` | 07:00 |
| 362 | Financials | `financials_platform_metrics_daily` | 07:30 |
| 363 | VirtualSpace | `virtualspace_platform_metrics_daily` | 08:00 |
| 364 | Referral | `referral_metrics_daily` + `compute_referral_metrics()` | 09:00 |
| 365 | Referral | `referral_network_stats` materialized view | hourly :30 |

> **Note on 353–363**: Several of these are allocated to specific intelligence tables above (355–363). Migrations 353 and 354 are not assigned to any intelligence table — they belong to the wider Conductor Feature Intelligence block reserved in v3.7. Confirm with the full Feature Intelligence Specs Index before assigning.

---

## 15. Spec Index

All intelligence specs in the GTM + Referral system:

| Spec | File | Stage/Role | Specialist Agent | Phase |
|------|------|-----------|-----------------|-------|
| Resources | [`resources-intelligence-spec.md`](./resources-intelligence-spec.md) | GTM Stage 1 | Market Intelligence | 3 |
| SEO | [`seo-intelligence-spec.md`](./seo-intelligence-spec.md) | GTM Stage 2 | Market Intelligence | 3 |
| Signal | [`signal-intelligence-spec.md`](./signal-intelligence-spec.md) | Cross-cutting attribution | Market Intelligence | 3 |
| Marketplace | [`marketplace-intelligence-spec.md`](./marketplace-intelligence-spec.md) | GTM Stage 3 | Market Intelligence + Retention | 3 |
| VirtualSpace | [`virtualspace-intelligence-spec.md`](./virtualspace-intelligence-spec.md) | Shortcut (Marketplace→Bookings) + Bookings execution | Market Intelligence | 3 |
| Listings | [`listings-intelligence-spec.md`](./listings-intelligence-spec.md) | GTM Stage 4 | Market Intelligence | 3 |
| Bookings | [`bookings-intelligence-spec.md`](./bookings-intelligence-spec.md) | GTM Stage 5 | Retention Monitor | 3 |
| Financials | [`financials-intelligence-spec.md`](./financials-intelligence-spec.md) | GTM Stage 6 | Retention Monitor + Operations | 3 |
| CaaS | [`caas-intelligence-spec.md`](./caas-intelligence-spec.md) | Trust foundation (all stages) | Operations Monitor | 3 |
| Referral | [`referral-intelligence-spec.md`](./referral-intelligence-spec.md) | Parallel acquisition track | Retention Monitor | 3–4 |

---

*Version 1.0 — GTM Lifecycle meta-spec. Two Conductor use cases: GTM Lifecycle (6 stages + Signal + CaaS + VirtualSpace) and Referral Lifecycle (parallel track). Feeds into `conductor-solution-design-v3.md` Phase 3 implementation.*
