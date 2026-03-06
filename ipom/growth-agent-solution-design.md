# Growth Agent — Solution Design v2.0

**Status**: Approved Architecture — Ready for Implementation
**Date**: 2026-03-04 (updated 2026-03-05)
**Owner**: Product Team
**Series**: AI Studio Agents
**Version**: 2.1 — Subscription infrastructure updated to unified agent_subscriptions table (iPOM D3)

---

## 1. Product Vision

### 1.1 What Is the Growth Agent?

The Growth Agent is a personalised AI business advisor for tutors on Tutorwise. It continuously analyses the tutor's position on the platform — their profile, listings, bookings, referrals, connections, and earnings — and gives them specific, actionable advice on how to grow their tutoring business.

Unlike passive dashboards that show data, the Growth Agent actively interprets that data, recommends actions, and can execute some of those actions directly (with the tutor's approval). It is the tutor's personal growth consultant available 24/7.

### 1.2 One-Line Pitch

> "The Growth Agent turns your Tutorwise data into a personalised growth plan and helps you execute it."

### 1.3 Who Is It For?

**Primary**: Tutors who want to grow their client base, revenue, and reputation on Tutorwise. Solo agents / clients as casual referrers who want to build a referral network and generate passive income.

**Secondary**: Organisations and agencies who want to grow their tutoring business network and maximise revenue.

### 1.4 Positioning — The Three Platform AI Agents

| Agent | Module | Who It Serves | Core Job |
|-------|--------|--------------|---------|
| Sage | `sage/` | Clients / Students | Delivers AI tutoring sessions |
| Growth | `growth/` | Tutors / Agents / Clients / Organisations | Grows their business |
| Lexi | `lexi/` | All users | Answers platform questions |

---

## 2. Core Purpose & Goals

### 2.1 Purpose Statement

Help users on Tutorwise grow their network, revenue, and reputation by providing personalised, data-driven advice and executing targeted growth actions.

### 2.2 The Three Pillars

```
┌──────────────────────────────────────────────────────────────┐
│                      GROWTH AGENT                            │
├──────────────────┬───────────────────┬───────────────────────┤
│   KNOW           │   ADVISE          │   ACT                 │
│                  │                   │                       │
│ Read user's     │ Generate growth   │ Execute actions       │
│ full platform    │ plans, insights,  │ with user approval   │
│ data in real-    │ and prioritised   │ (messages, tasks,     │
│ time             │ recommendations   │ profile updates)      │
└──────────────────┴───────────────────┴───────────────────────┘
```

### 2.3 Success Outcomes

**For the Tutor:**
- More bookings (new clients, repeat clients)
- Higher revenue per hour (pricing optimisation)
- Stronger referral network (passive income stream)
- Better profile visibility in marketplace search
- Improved reviews and CaaS score

**For the Agent:**
- Optimised referral pipeline and conversion rate
- Multi-stream income (referral + AI Tutor ownership)
- Network growth and delegation setup

**For the Client:**
- Passive income via referral commission
- Path to AI Tutor ownership
- Lifelong learning investment advice

**For the Organisation:**
- Margin optimisation across member tutors
- Member acquisition strategy
- Portfolio income (org margin + AI agent portfolio)

**Platform:**
- Increased GMV through user growth
- Higher user retention (users who grow, stay)
- Stronger network effects from referral activity
- Data moat: growth patterns → product intelligence

---

## 3. Skills, Capabilities & Tools

### 3.1 Skill Map

```
Growth Agent Skills
├── Profile & Visibility
│   ├── Profile audit & optimisation
│   ├── Listing SEO and positioning
│   └── Subject mix analysis
│
├── Networking & Connections
│   ├── Identify referral partners
│   ├── Find complementary tutors
│   ├── Analyse network quality
│   └── Outreach planning
│
├── Referral Strategy
│   ├── Referral code & link optimisation
│   ├── QR code deployment (offline/online)
│   ├── Referral pipeline coaching
│   └── Delegation setup advice
│
├── Content & Communication
│   ├── Bio and listing copy writing
│   ├── Outreach message drafting
│   ├── Social post generation
│   └── Review request messaging
│
├── Revenue Optimisation
│   ├── Pricing benchmarking
│   ├── Session format advice (1:1, group)
│   ├── Subject demand analysis
│   └── Upsell opportunity detection
│
└── Performance Intelligence
    ├── Booking trend analysis
    ├── Revenue attribution
    ├── Conversion funnel diagnosis
    └── Growth forecasting
```

### 3.2 Tools (What the AI Agent Can Read or Execute)

#### Read-Only Tools — Phase 1 (always available)

| Tool | Description | Data Source |
|------|-------------|------------|
| `read_my_profile` | Full profile, listings, CaaS score, verification status | `profiles`, `listings` |
| `read_my_bookings` | Booking history, completion rate, cancellation rate | `bookings` |
| `read_my_revenue` | Earnings, payouts, commission income, trends | `transactions` |
| `read_my_referrals` | Referral pipeline: referred → converted, agent_id | `referrals` |
| `read_my_network` | Connections, wiselist follows, message threads | `connections`, `messages` |
| `read_my_reviews` | Reviews received, rating trends, review gaps | `reviews` |
| `read_marketplace_benchmarks` | Anonymous aggregated data — avg price, demand by subject | `listings` (aggregate) |
| `read_search_ranking` | Where tutor appears in marketplace search results | Search RPCs |

#### Action Tools — Phase 2 (require user approval before execution)

| Tool | Description | Approval Level |
|------|-------------|---------------|
| `send_connection_request` | Send a connection/networking request to another user | Per-send confirm |
| `send_message` | Draft and send a message (e.g. review request, referral outreach) | Per-send confirm |
| `create_task` | Create a follow-up task in Organisation task board | Auto (low-risk) |
| `update_listing` | Suggest and apply listing copy improvements | Per-change confirm |
| `update_profile_bio` | Suggest and apply bio improvements | Per-change confirm |
| `schedule_referral_push` | Plan a targeted referral campaign with timeline | Per-campaign confirm |

#### Future Tools — Roadmap

| Tool | Description |
|------|-------------|
| `post_to_social` | Post content to LinkedIn/Instagram via OAuth |
| `book_intro_call` | Schedule introductory calls/messages with potential partners |
| `run_ab_test` | A/B test listing titles for conversion |
| `send_bulk_outreach` | Send referral outreach to a list (with rate limits) |

---

## 4. User Journey

### 4.1 Access Path (Sidebar → Chat)

```
App sidebar → "Growth" link
        ↓
Growth chat UI  (same pattern as Sage chat)
        ↓
Agent greets user, runs initial audit on first visit
        ↓
User asks up to 10 questions/day (free tier)
        ↓
On question 11 → rate limit hit → inline upgrade prompt
        ↓
"Upgrade to Growth Pro — £10/month" → Stripe checkout
        ↓
Subscribed → unlimited questions + full features
```

### 4.2 First Activation (Initial Audit)

```
User opens Growth for first time
        │
        ▼
Agent intro: "Hi, I'm your Growth Agent. Let me analyse
your Tutorwise profile to get started."
        │
        ▼
Runs initial audit (5 areas):
  1. Profile completeness & quality     [score]
  2. Listings — SEO, pricing, gaps      [score]
  3. Referral pipeline health           [score]
  4. Network & connections quality      [score]
  5. Revenue trends & opportunities     [score]
        │
        ▼
Presents "Growth Score" (0-100) with
top 3 priority actions
        │
        ▼
User picks an action → Growth Agent helps execute it
```

### 4.3 Ongoing Chat

Users can ask anything:

- "Why have my bookings dropped this month?"
- "How do I get more referrals?"
- "Is my pricing competitive for GCSE Maths in London?"
- "Write me a message asking my best students for a review"
- "Which of my listings is underperforming and why?"
- "Who should I connect with to grow my network?"
- "Create a 30-day referral push plan for me"

### 4.4 Proactive Nudges — Phase 2

- "Your CaaS score dropped 3 points — here's why and how to recover"
- "You have 3 students who haven't rebooked in 60 days — want me to draft a win-back message?"
- "A new tutor in your subject area just joined — might be worth connecting"
- "Your referral link hasn't been shared in 14 days — here's a ready-to-share post"
- "Earnings are trending down 18% vs last month — I found 2 root causes"

### 4.5 Growth Score Dashboard Widget

Persistent score visible on tutor dashboard:

```
┌────────────────────────────────────────────────────┐
│  Growth Score                              72 / 100 │
│  ──────────────────────────────────────────────── │
│  Profile & Listings          ████████░░  82        │
│  Referral Network            ██████░░░░  61        │
│  Client Retention            ████████░░  79        │
│  Revenue Trajectory          ██████░░░░  63        │
│  Marketplace Visibility      ███████░░░  71        │
│                                                     │
│  [Chat with Growth Agent]  [View Action Plan]      │
└────────────────────────────────────────────────────┘
```

---

## 5. Networking & Connections Module

### 5.1 Who the Agent Can Find

| Target | Why | How Agent Identifies |
|--------|-----|---------------------|
| Complementary tutors | Cross-referral partnerships | Different subjects, overlapping student age range |
| High-referrer profiles | People with large networks | Agents with high referral_count, active referrers |
| Former students | Win-back / review requests | Clients with completed bookings, no repeat |
| Potential delegation partners | Offline referral networks | Organisations, coffee shops, schools (future) |
| New tutors | Mentorship & referral | Recently joined, same subject |

### 5.2 Network Quality Metrics

```
Network Health Report:
  Total connections:       47
  Active referrers:         3  (made ≥1 referral in 90 days)
  Conversion rate:         12%  (referrals → converted)
  Network reach score:     340  (connections of connections)
  Top referrer:            Sarah M. — 4 conversions, £180 commission paid
  Weakest link:            23 connections with 0 activity in 180 days
```

### 5.3 Outreach Templates

Growth Agent generates personalised outreach — not generic spam:

```
To: James Patel (Maths Tutor, London)
Context: Both teach GCSE, no overlap in booking clients

"Hi James — I noticed we both teach GCSE Maths in South London.
I often get enquiries for Further Maths that I can't take on —
would you be open to a mutual referral arrangement?
My referral link is [link]. Happy to chat if useful."
```

---

## 6. Content & Profile Optimisation

### 6.1 Listing Audit

```
Listing: "GCSE Maths Tuition"
Issues found:
  ✗ Title is generic — 847 tutors use similar titles
  ✗ Description is 94 words — avg high-booking tutors: 180+
  ✗ No mention of exam board (AQA, Edexcel) — loses search ranking
  ✗ Price: £35/hr — 15% below comparable tutors (CaaS 80+)
  ✗ No first lesson offer to reduce booking friction

Suggestions:
  ✓ Title: "GCSE Maths (AQA/Edexcel) — Results-Focused Tuition"
  ✓ Add exam board keywords: AQA, Edexcel, GCSE, grade 9 target
  ✓ Add first lesson discount to convert hesitant clients
  ✓ Price: £40/hr (benchmark for your CaaS score + location)
```

### 6.2 SEO & Visibility

```
Search Ranking Analysis:
  "GCSE Maths London"        → Position 47 of 230
  "Maths tutor year 10"      → Position 12 of 89
  "A-Level Maths online"     → Not appearing (no listing)

Opportunity: Create an A-Level listing — 34 weekly searches,
only 12 tutors with your CaaS score compete.
```

---

## 7. Revenue Intelligence

### 7.1 Revenue Attribution

```
Revenue This Month: £1,240
  Direct bookings:           £820   (66%)  — 5 clients
  Referred bookings:         £240   (19%)  — via Sarah M.
  Referral commission:       £180   (15%)  — 3 converted referrals

Growth vs last month:       +12%
Agent-driven revenue:        £420   (34%) ← Growth Agent attribution
```

### 7.2 Forecasting

```
Current trajectory:          £1,240/month
If pricing raised to £40/hr: £1,380/month (+11%)
If 2 new referral partners:  £1,550/month (+25%) (est.)
If A-Level listing added:    £1,720/month (+39%) (est.)

Combined 90-day potential:   £1,700-1,900/month
```

### 7.3 Pricing Strategy

```
Subject: GCSE Maths
Your rate: £35/hr

Benchmark (tutors with CaaS 70-80 in London):
  10th percentile:  £28/hr
  50th percentile:  £38/hr   ← you are below median
  90th percentile:  £55/hr

Recommendation: Raise to £40/hr for new bookings.
Existing clients: grandfathered at £35 for 90 days.
Estimated revenue impact: +£120/month.
```

---

## 8. Referral Strategy Module

### 8.1 Personalised Referral Plan

```
Your Referral Situation:
  Active referral code:  kRz7Bq2
  Times shared (30d):    3
  Referrals in pipeline: 2 (both stuck at 'Signed Up')
  Commissions earned:    £180 lifetime

30-Day Referral Sprint:
  Week 1: Send personalised outreach to 5 potential referral partners
  Week 2: Follow up on 2 stuck 'Signed Up' referrals with welcome message
  Week 3: Share referral QR code in 3 target communities (WhatsApp, etc.)
  Week 4: Review pipeline, reward top referrers
```

### 8.2 Delegation Optimisation

```
Opportunity: You teach at Oakwood Library's study room.
If library uses your QR code → you delegate 50% → library earns £90
per converted student → strong incentive to promote you.

Action: Set up listing-level delegation for "Library GCSE Sessions"?
[Set up delegation →]
```

---

## 9. Technical Architecture — CONFIRMED

### 9.1 Module Location

Growth is a **top-level module** in the monorepo, alongside `sage/` and `lexi/`:

```
tutorwise/
  sage/          ← AI tutor agent
  lexi/          ← help bot agent
  growth/        ← growth advisor agent  ← NEW
  cas/           ← agent SDK / process studio
  apps/web/      ← Next.js app
  fuchsia/       ← design docs
```

### 9.2 Module Structure — Copied from Sage, Customised

```
growth/
  agents/
    base/
      BaseAgent.ts              ← shared (not duplicated — imported from @sage/agents/base)
      types.ts                  ← shared (not duplicated)
    GrowthPlatformAgent.ts      ← extends PlatformAIAgent (platform-owned, has DB access)
    GrowthMarketplaceAgent.ts   ← extends MarketplaceAIAgent (user-created, strategy only)
    index.ts
  core/
    orchestrator.ts             ← Growth orchestrator (role-adaptive: tutor/client/agent/org)
  personas/
    tutor.ts                    ← Tutor persona system prompt
    client.ts                   ← Client persona system prompt
    agent.ts                    ← Agent persona system prompt
    organisation.ts             ← Organisation persona system prompt
    index.ts
  knowledge/
    profile-listing-audit.ts    ← UK pricing benchmarks, listing quality criteria
    referral-strategy.ts        ← Referral channels, outreach templates, pipeline benchmarks
    revenue-intelligence.ts     ← Income patterns, seasonal trends, full-time jump criteria
    income-stream-discovery.ts  ← Income streams, unlock sequencing, stream combinations
    business-setup-compliance.ts ← Sole trader vs Ltd, HMRC, T&Cs, insurance, DBS
    index.ts
  tools/
    definitions.ts              ← 8 DB read tool schemas + action tool schemas
    executor.ts                 ← Supabase-backed tool executor
    types.ts                    ← GrowthTool, GrowthUserMetrics, GrowthUserRole
    index.ts
  providers/                    ← Reuses @sage/providers (same 6-tier fallback chain)
  math/                         ← Kept: tutors' subject knowledge matters for growth advice
  curriculum/                   ← Kept: curriculum context for pricing/demand analysis
  teaching/                     ← Kept: teaching level benchmarks
  subjects/                     ← Kept: subject-specific demand and pricing data
  upload/                       ← Copy from sage/upload — tutors upload business docs
  links/                        ← Copy from sage/links — tutors add profile/competitor URLs
  types/
    index.ts
  index.ts
  README.md
```

**Edtech Foundation Modules** — `math/`, `curriculum/`, `teaching/`, `subjects/` are the shared knowledge base that underpins ALL edtech agents on the platform (Sage, Growth, and future agents). They are never removed from any agent module. These modules provide:
- Subject demand signals (which subjects are growing, underserved, seasonal)
- Curriculum-level pricing context (GCSE vs A-Level vs University premium)
- Teaching market benchmarks (what qualified tutors charge at each level)
- Subject-specific SEO and listing optimisation data

Any future edtech agent built on this platform should include or reference these modules.

### 9.3 Class Hierarchy

```
BaseAgent (abstract) — sage/agents/base/BaseAgent.ts
├── PlatformAIAgent — sage/agents/PlatformAIAgent.ts
│   └── GrowthPlatformAgent — growth/agents/GrowthPlatformAgent.ts
│       ├── Platform-owned (admin creates in admin dashboard)
│       ├── Has access to user's live Tutorwise data via DB tools
│       ├── requiresSubscription() → true (£10/month via rate-limit gate)
│       └── Role-adaptive: tutor / client / agent / organisation
│
└── MarketplaceAIAgent — sage/agents/MarketplaceAIAgent.ts
    └── GrowthMarketplaceAgent — growth/agents/GrowthMarketplaceAgent.ts
        ├── User-created in AI Studio (same flow as AI Tutors)
        ├── Strategy/advice only — NO access to buyer's private data
        ├── Knowledge: user's uploaded playbooks, templates, strategies
        └── Sold in marketplace (£ set by creator)
```

### 9.4 Path Alias

```json
// apps/web/tsconfig.json — add:
"@growth/*": ["../../growth/*"]
```

### 9.5 Data Access Pattern

```
Growth Agent Runtime
        │
        ├── read_my_* tools → Supabase (scoped to authenticated user's profile_id)
        │
        ├── Marketplace benchmarks → Aggregate queries only (no individual data)
        │
        └── Action tools → Supabase mutations (gated by user confirmation)
```

All data access is **scoped to the authenticated user's profile_id**. The agent cannot read other users' private data. Marketplace benchmarks are aggregated/anonymised.

### 9.6 Apps/Web Layer

```
apps/web/
  src/
    app/
      (authenticated)/
        growth/                 ← Growth chat UI (copy sage UI, customise)
          page.tsx              ← Main chat interface + Growth Score widget
          session/
            [sessionId]/
              page.tsx          ← Active session view
      api/
        growth/
          stream/route.ts       ← SSE streaming (copy sage stream route)
          session/route.ts      ← Session management
          audit/route.ts        ← Free Revenue Audit (no subscription required)
      (admin)/
        admin/
          growth/               ← Admin Growth page (copy sage admin page, customise)
            page.tsx
    lib/
      growth/                   ← Adapter layer (copy apps/web/src/lib/ai-agents/)
        adapter.ts
        subscription-manager.ts
        rate-limiter.ts         ← Add growth rate limiting to existing rate-limiter
        manager.ts
        index.ts
    components/
      feature/
        growth/                 ← Growth UI components (copy sage components, customise)
          GrowthScoreWidget.tsx
          GrowthChatUI.tsx
          GrowthSubscriptionWidget.tsx
```

### 9.7 Growth Score Calculation

```sql
-- Computed server-side, cached hourly
growth_score = weighted_average(
  profile_score     × 0.20,   -- completeness, verification, avatar
  listing_score     × 0.25,   -- quality, pricing, SEO
  referral_score    × 0.20,   -- pipeline health, conversions
  retention_score   × 0.20,   -- repeat bookings, churn rate
  visibility_score  × 0.15    -- search ranking, wiselist follows
)
```

### 9.8 Agent Personality & Tone

- Concise and direct (no waffle)
- Data-led ("Your bookings dropped 18% because...")
- Action-oriented (every insight ends with an action)
- Tutor-side advocate (always advising what's best for the tutor)
- Not a cheerleader — honest about problems

### 9.9 Integration with Process Studio

| Growth Agent Action | Process Studio Integration |
|--------------------|--------------------------|
| Detect tutor approved → trigger commission | Tutor Approval workflow |
| Monitor commission payout status | Commission Payout workflow |
| Track referral conversions | Referral Attribution subprocess |
| Booking lifecycle events | Booking Lifecycle workflow (shadow) |

---

## 10. Subscription & Monetisation — CONFIRMED

### 10.1 Paywall Model — Soft Rate-Limit Gate (same as Sage)

| Tier | Access | Daily Limit | Monthly Cap | Cost |
|------|--------|-------------|-------------|------|
| Free | ✅ Always | 10 questions/day | — | £0 |
| Growth Pro | ✅ Always | Unlimited | 5,000/month | £10/month |

**Important**: There is NO hard paywall — all authenticated users can access Growth.
Free users hit the rate limit and see an inline "Upgrade to Growth Pro" prompt.
**No 14-day trial** — users experience the value first (10 free questions/day), subscribe when ready.

### 10.2 Enforcement Chain

```
POST /api/growth/stream
        ↓
getGrowthSubscription(userId)   ← checks agent_subscriptions WHERE agent_type='growth'
        ↓
checkGrowthRateLimit()          ← Redis rolling 24hr window
        ↓
HTTP 429 + upsell payload       ← if free limit exceeded
{
  error: 'RATE_LIMIT_EXCEEDED',
  message: 'You've used your 10 free questions today',
  upsell: {
    product: 'Growth Pro',
    price: '£10/month',
    checkoutUrl: '/api/growth/subscription'
  }
}
```

### 10.3 Subscription Infrastructure

**Shared DB table**: `agent_subscriptions` — unified across all agent types (iPOM Design Decision D3).
Growth Pro records use `agent_type = 'growth'`. No separate `growth_pro_subscriptions` table.

```sql
-- agent_subscriptions (shared with Sage, future agents)
agent_subscriptions (
  id, user_id, agent_type,              -- 'growth' | 'sage' | ...
  stripe_subscription_id, stripe_customer_id,
  stripe_price_id, status, price_per_month,
  current_period_start, current_period_end,
  created_at, updated_at
)

-- Query pattern
SELECT * FROM agent_subscriptions
WHERE user_id = $1 AND agent_type = 'growth' AND status = 'active';
```

**Stripe**: New price ID for Growth Pro (£10/month recurring) — `STRIPE_GROWTH_PRO_PRICE_ID`
**Feature flag**: `NEXT_PUBLIC_ENABLE_GROWTH_PAYWALL` (default: true)

> **Note**: If `agent_subscriptions` table does not yet exist (Sage still uses `sage_pro_subscriptions`),
> the unified table is created as part of iPOM Phase 0 platform extraction. Until then, Growth
> can bootstrap with its own `agent_subscriptions` migration that Sage migrates into later.

### 10.4 ROI Framing

```
Growth Pro cost:     £10/month
Average uplift:      +£200-400/month (estimated)
ROI:                 20-40x
Break-even:          1 extra booking per month
```

### 10.5 Sage 14-Day Trial Code — Remove

The Sage codebase contains a `createTrialCheckoutSession()` function that is not used (Sage uses 10 free questions/day instead). This dead code will be **removed from Sage** before Growth is built to prevent confusion and avoid it being accidentally copied into Growth.

---

## 11. Admin & Platform Management

### 11.1 Admin Growth Page

Copy the admin Sage page and customise for Growth:

```
/admin/growth/
  page.tsx                  ← Growth admin dashboard
    ├── Active subscribers count + MRR
    ├── Total Growth Agents created
    ├── Daily active users
    ├── Rate limit hit rate (free → paid conversion signal)
    ├── Platform Growth Agent management (enable/disable/configure)
    └── User-created Growth Agents (review, moderate, feature)
```

### 11.2 Platform Growth Agent (Admin Creates)

The platform-owned Growth Agent is created/managed by admin (same as Sage):
- `is_platform_owned: true`, `agent_context: 'platform'`
- Admin can update persona, knowledge, tools configuration
- Always published, appears in AI Studio for all users

### 11.3 Marketplace Growth Agents (User Creates)

Users can create their own Growth Agents in AI Studio:
- `agent_context: 'marketplace'`
- Strategy/advice only — no access to buyer's Tutorwise data
- Users upload their own playbooks, frameworks, templates
- Published to marketplace after £10/month subscription + admin review
- Buyer subscribes separately (£ set by creator)

---

## 12. Build Sequence — CONFIRMED

### Phase 0: Cleanup (Before Build)
- Remove Sage `createTrialCheckoutSession()` dead code
- Clean up `apps/web/src/lib/growth-agent/` (replace with new architecture)
- Delete `apps/web/src/lib/growth-agent/GrowthAgent.ts` (wrong location, created in error)

### Phase 1: Foundation
```
1. Create growth/ top-level module (copy sage/, strip unused, customise)
2. Add @growth/* path alias to apps/web/tsconfig.json
3. DB migration: agent_subscriptions table (unified, agent_type column — replaces sage_pro_subscriptions + growth_pro_subscriptions)
4. DB migration: add growth_advisor to ai_agents.agent_type enum (if DB enum)
5. apps/web/src/lib/growth/ adapter layer
6. Rate limiter: add Growth tier to existing rate-limiter.ts
7. API routes: /api/growth/stream, /api/growth/session, /api/growth/audit
8. Move skill files: apps/web/src/lib/growth-agent/skills/ → growth/knowledge/
9. Growth chat UI: apps/web/src/app/(authenticated)/growth/
10. Sidebar link added to app navigation
11. Admin page: /admin/growth/ (copy sage admin page, customise)
```

### Phase 2: Actions
```
→ Confirmation modal for action tools
→ send_message, create_task tools live
→ Listing update suggestions (apply with 1-click)
→ Proactive nudges (in-app + weekly email)
```

### Phase 3: Campaigns
```
→ 30-day referral sprint planner
→ Delegation setup wizard
→ Network outreach templates
→ Revenue forecasting model
```

### Phase 4: Automation
```
→ Social media posting (LinkedIn OAuth)
→ Scheduled campaigns
→ A/B listing tests
→ Process Studio: Growth Process (scheduled campaign workflows)
```

---

## 13. Design Decisions — RESOLVED

### D1: One agent per user or shared?
**Resolved**: Platform Growth Agent is shared (platform-owned, like Sage). Users get a personalised experience because the agent reads their live data — but there is one platform agent, not one per user. Marketplace Growth Agents are user-created and can be sold.

### D2: Growth Agent public profile page?
**Resolved**: Yes — shareable profile page (`/growth/[agent-name]`) serves as a high-conversion referral landing page. Replaces raw `?ref=CODE` links for high-value outreach.

### D3: What data can the agent see?
**Resolved**: Only the authenticated user's own data (scoped by profile_id) + anonymised marketplace benchmarks. Cannot read other users' private data.

### D4: Autonomous actions?
**Resolved**: No autonomous actions in MVP. Every action requires user confirmation (same pattern as Process Studio HITL approvals).

### D5: Metrics attribution?
**Resolved**: Tag all agent-initiated actions with `growth_agent_session_id`. Track downstream bookings/conversions from those actions. Show ROI in Growth Score dashboard.

### D6: Relationship to Process Studio?
**Resolved**: Growth Agent is NOT a Process Studio process — it is a reactive chat agent. Process Studio handles automated workflows. They share data but are separate runtimes. Phase 4 introduces a "Growth Process" in Process Studio for scheduled campaigns.

### D7: Module name?
**Resolved**: `growth/` (top-level, alongside `sage/`, `lexi/`). Referred to as "Growth Agent" in product copy.

### D8: Subscription model?
**Resolved**: Soft rate-limit gate — 10 free questions/day for all users, £10/month Growth Pro for unlimited access. No 14-day trial. No hard paywall.

### D9: Sage 14-day trial code?
**Resolved**: Remove from Sage before building Growth, to avoid confusion and accidental copying.

### D10: Keep math/curriculum/teaching/subjects?
**Resolved**: Yes — these are the **shared edtech foundation modules** for all platform agents (Sage, Growth, and any future agents). They are never removed. Tutor growth advice is inseparable from subject demand, curriculum-level pricing, and teaching market context. Every edtech agent built on this platform must include or reference them.

---

## 14. Open Questions

1. **Growth Score visibility**: Should it be public (visible on tutor profile to clients) or private (tutor only)?
2. **Proactive nudges**: In-app notification, email, or both? What frequency cap?
3. **Network scope**: Should the agent search ALL marketplace tutors, or only the user's connections?
4. **Content disclosure**: Should AI-generated bios/messages include "AI-written" disclosure?
5. **Marketplace Growth Agent**: Should user-created Growth Agents have a different category in the marketplace (e.g. "Business Coaches") to distinguish from AI Tutors?

---

*Version 2.0 — Architecture confirmed. Ready for Phase 0 cleanup and Phase 1 build.*
