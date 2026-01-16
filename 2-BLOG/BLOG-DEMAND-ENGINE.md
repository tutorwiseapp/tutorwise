# Blog-to-Marketplace Demand Engine

**Purpose**: Transform the blog from static content into an active marketplace demand engine with full attribution tracking
**Status**: Phase 1-3 Complete (Phase 3 Dashboard UI Implemented), Phases 4-7 Planned
**Created**: 2026-01-16
**Last Updated**: 2026-01-16

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Phase 1-2: Foundation (Complete)](#phase-1-2-foundation-complete)
4. [Phase 3: Unified Dashboard (Complete)](#phase-3-unified-dashboard-complete)
5. [Phase 4: Referral Integration](#phase-4-referral-integration)
6. [Phase 5: Cross-Linking & SEO](#phase-5-cross-linking--seo-amplification)
7. [Phase 6: Attribution Model Selection](#phase-6-attribution-model-selection)
8. [Phase 7: A/B Testing & Optimization](#phase-7-ab-testing--optimization)
9. [Decision Framework](#decision-framework-when-to-move-to-next-phase)
10. [Technical Reference](#file-locations)
11. [Anti-Patterns](#anti-patterns-to-avoid)

---

## Overview

The Blog-to-Marketplace Demand Engine connects blog content to marketplace outcomes through comprehensive attribution tracking. The system follows the philosophy: **SEO builds demand → Blog educates → Marketplace converts → Wiselists retain → Referrals multiply**.

### Core Principle

- **Phase 1-2**: Build infrastructure (event-based attribution + dual-write pattern) ✅
- **Phase 3**: Observation layer (visibility into what's happening) ✅ **← CURRENT PHASE COMPLETE**
- **Phase 4-7**: Optimization layer (decisions about what to improve) ⏳ **← Future roadmap**

This intentional boundary prevents premature optimization. Phase 3 gives you **the map**. Only after observing real user patterns should you proceed to Phases 4-7.

### Epistemic Boundary

**Phase 3 = Observation**
**Phase 4+ = Optimization**

This boundary is intentional. Do not blur it.

Phase 3 answers: **"This is what's happening."**
Phases 4-7 answer: **"What do we optimize first, and how?"**

---

## System Architecture

### Event-Based Attribution (Source of Truth)

The system uses an **immutable event stream** as the single source of truth for all blog interactions:

```sql
CREATE TABLE blog_attribution_events (
  id UUID PRIMARY KEY,
  blog_article_id UUID REFERENCES blog_articles(id),
  user_id UUID REFERENCES profiles(id),
  session_id TEXT,              -- 30-day cookie-based session
  event_type TEXT NOT NULL,     -- impression, click, save, refer, convert
  target_type TEXT NOT NULL,    -- article, tutor, listing, booking, referral, wiselist_item
  target_id TEXT NOT NULL,
  source_component TEXT,        -- listing_grid, tutor_embed, tutor_carousel, etc.
  metadata JSONB,               -- embed_instance_id, context, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Event Taxonomy** (Locked Down):
- **event_type**: impression, click, save, refer, convert
- **target_type**: article, tutor, listing, booking, referral, wiselist_item
- **source_component**: listing_grid, tutor_embed, tutor_carousel, cta_button, inline_link, floating_save, article_header

### Dual-Write Pattern

Every significant user action triggers two writes:

1. **Event write** (immutable truth): `INSERT INTO blog_attribution_events`
2. **Cache write** (denormalized performance): Update `source_blog_article_id` column

**Example: Wiselist Save**
```typescript
// 1. Write event (source of truth)
await supabase.from('blog_attribution_events').insert({
  blog_article_id: articleId,
  user_id: userId,
  session_id: sessionId,
  event_type: 'save',
  target_type: 'wiselist_item',
  target_id: wiselistItemId,
  source_component: 'floating_save',
  metadata: { context: 'blog_embed' }
});

// 2. Update cache (last-touch attribution)
await supabase.from('wiselist_items')
  .update({ source_blog_article_id: articleId })
  .eq('id', wiselistItemId);
```

**Why Dual-Write?**
- Events table: Complete interaction history for multi-touch attribution
- Cache columns: Fast queries for simple "last-touch" attribution
- Graceful degradation: System still functions if event write fails

---

## Phase 1-2: Foundation (Complete)

### Database Schema (Migrations 179-181)

**Migration 179**: `blog_attribution_events` table
- Immutable event stream for all blog interactions
- Indexes for article, user, session, target, and type queries
- RLS policies: public insert, own data read, admin read all

**Migration 180**: `blog_listing_links` metadata enhancements
- Added `position_in_article`, `embed_instance_id`, `metadata` columns
- Dual-purpose: Editorial (manual embeds) + Behavioral (click tracking)

**Migration 181**: Privacy controls for article saves
- Added `visibility` column to `blog_article_saves` (default 'private')
- Users must opt-in to share reading history on public wiselists
- RLS policies enforce privacy-first design

### Session Tracking

**30-day cookie-based sessions** with stable IDs:
```typescript
// Client-side (persistent across login/logout)
export function getOrCreateSessionId(): string {
  let sessionId = getCookie('tw_session_id');
  if (!sessionId) {
    sessionId = uuidv4();
    setCookie('tw_session_id', sessionId, 30); // 30-day expiry
  }
  return sessionId;
}
```

**Benefits**:
- Tracks anonymous users without requiring login
- Session persists across authentication events
- Enables attribution for anonymous → logged-in user transitions

### Embed Instance IDs

**Stable, hash-based IDs** for performance comparison:
```typescript
// Same embed across users gets same ID
export function generateEmbedInstanceId(
  articleId: string,
  componentType: string,
  position: number
): string {
  const payload = `${articleId}:${componentType}:${position}`;
  return createHash('sha256').update(payload).digest('hex').substring(0, 16);
}
```

**Enables**: "Position 0 vs Position 1" performance comparisons in Phase 7 A/B testing

### MDX Embed Components

**TutorEmbed.tsx** - Embed tutor profiles in articles
```mdx
<TutorEmbed profileId="uuid" context="recommended" position={0} />
```
- Tracks click events with `useBlogAttribution` hook
- Stores attribution in localStorage (7-day window)
- Creates `blog_listing_links` entry on mount

**ListingGrid.tsx** - Embed marketplace listings
```mdx
<ListingGrid subjects={["Maths"]} levels={["GCSE"]} limit={3} />
```
- Fetches listings from search API
- Tracks each card click separately
- Supports filtering by subject, level, location type, price

**TutorCarousel.tsx** - Swipeable tutor carousel
```mdx
<TutorCarousel profileIds={["uuid1", "uuid2"]} autoplay={true} />
```
- Fetches multiple profiles in parallel
- Tracks carousel interactions (swipe, click)

### Wiselist Integration

**SaveArticleButton.tsx** - Save articles to wiselists
```tsx
<SaveArticleButton article={article} variant="icon" />
```
- One-click save to "My Saves" wiselist
- Toggle save/unsave state
- Anonymous users: localStorage → migrate on login
- Logged-in users: Database with event tracking

**Privacy Controls**:
- Articles saved to wiselists are private by default
- Users must explicitly opt-in to share reading history
- Public wiselist pages filter: `.eq('visibility', 'inherit_wiselist')`

### API Routes

**POST /api/blog/attribution/events** - Event recording
```json
{
  "articleId": "uuid",
  "eventType": "click",
  "targetType": "tutor",
  "targetId": "uuid",
  "sessionId": "client-session-id",
  "sourceComponent": "tutor_embed",
  "metadata": { "context": "recommended", "position": 0 }
}
```

**POST /api/blog/attribution** - Dual-write for conversions
```json
{
  "articleId": "uuid",
  "targetType": "booking",
  "targetId": "booking-uuid",
  "context": "direct_embed",
  "sessionId": "client-session-id",
  "sourceComponent": "listing_grid"
}
```
- Writes event + updates cache field in target table
- Handles bookings, referrals, wiselist saves

---

## Phase 3: Unified Dashboard (Complete)

### Core Purpose

Turn raw attribution data into actionable answers for product, SEO, and content decisions.

**Phase 3 answers**:
- Which articles drive the most bookings?
- What's the conversion funnel (views → clicks → saves → bookings)?
- Which listings benefit from blog traffic? (correlation, not causation)
- How long does attribution typically take?

**Phase 3 does NOT answer**:
- ❌ What to optimize (that's Phase 4+)
- ❌ Which attribution model to use (read-only observation only)
- ❌ How to improve performance (no recommendations)

### Dashboard RPCs (Migration 182)

**Event Semantics** (Documented at top of migration):
```sql
/*
CANONICAL EVENT DEFINITIONS (single source of truth):

1. ARTICLE VIEW
   - Source: blog_article_metrics.views_count

2. MARKETPLACE INTERACTION
   - event_type IN ('click', 'save')
   - target_type IN ('tutor', 'listing')

3. WISELIST SAVE
   - event_type = 'save'
   - target_type IN ('article', 'tutor', 'listing', 'wiselist_item')

4. BOOKING
   - event_type = 'convert'
   - target_type = 'booking'

BLOG-ASSISTED BOOKING:
   - ANY blog event within attribution window before booking
*/
```

**RPC 1: get_article_performance_summary**
```sql
CREATE OR REPLACE FUNCTION get_article_performance_summary(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7  -- Explicit, not hard-coded
)
RETURNS TABLE (
  article_id UUID,
  article_title TEXT,
  article_slug TEXT,
  category TEXT,
  published_at TIMESTAMPTZ,
  views_count BIGINT,
  interaction_count BIGINT,
  wiselist_save_count BIGINT,
  booking_count BIGINT,
  booking_revenue NUMERIC,
  conversion_rate NUMERIC
)
```
- Top-level metrics per article
- Blog-assisted bookings = ANY event within attribution window before booking
- Revenue attribution based on last-touch cache

**RPC 2: get_conversion_funnel**
```sql
CREATE OR REPLACE FUNCTION get_conversion_funnel(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  stage_number INTEGER,
  stage_name TEXT,
  count BIGINT,
  conversion_rate NUMERIC
)
```
- Four-stage linear funnel: View → Interact → Save → Book
- Stage-to-stage conversion rates
- Used to identify drop-off points

**RPC 3: get_blog_assisted_listings**
```sql
CREATE OR REPLACE FUNCTION get_blog_assisted_listings(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  listing_id UUID,
  listing_title TEXT,
  category TEXT,
  articles_linking_count BIGINT,
  blog_assisted_views BIGINT,
  blog_assisted_bookings BIGINT,
  baseline_views NUMERIC,
  baseline_bookings NUMERIC,
  uplift_views_pct NUMERIC,
  uplift_bookings_pct NUMERIC
)
```
- Shows correlation between blog mentions and listing performance
- Baseline = same-category avg (excluding blog-linked, mature listings only)
- Uplift = (actual - baseline) / baseline * 100
- **Important**: Correlation signals, not causation proof

**RPC 4: get_time_to_conversion_distribution**
```sql
CREATE OR REPLACE FUNCTION get_time_to_conversion_distribution(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  day_bucket INTEGER,
  conversion_count BIGINT,
  cumulative_pct NUMERIC
)
```
- Histogram of days between first blog interaction and booking
- Validates 7-day attribution window assumption
- Example output: "80% of conversions happen within 3 days"

### Guardrails

**Guardrail 1: Explicit Attribution Window**
- Every RPC takes `p_attribution_window_days INTEGER` parameter
- Even though Phase 3 always passes 7, parameter prevents hard-coding
- Enables Phase 4+ experimentation without SQL rewrites

**Guardrail 2: Canonical Event Semantics**
- Event definitions documented in migration file
- NOT configurable, just explicit
- Prevents "what counts as a conversion?" ambiguity

### Dashboard UI (Implemented)

**Location**: `/admin/blog/orchestrator`

**Structure**:
- **Overview Tab**: KPI cards (Total Articles, Blog-Assisted Bookings, Revenue, Conversion Rate) + funnel preview
- **Top Articles Tab**: Revenue-sorted table with all metrics per article
- **Conversion Funnel Tab**: Four-stage funnel visualization with conversion rates
- **Listing Visibility Tab**: Blog-assisted listings with baseline comparison and visibility multipliers

**Features**:
- Date range selector (30/60/90 days)
- Attribution window selector (7/14/30 days)
- Loading states and placeholder messages
- Responsive design for mobile
- Admin-only access (auth checks on both page and API routes)

**API Routes** (Implemented):
- `GET /api/admin/blog/orchestrator/stats` - Overview stats (performance + funnel)
- `GET /api/admin/blog/orchestrator/top-articles` - Articles sorted by revenue
- `GET /api/admin/blog/orchestrator/listings` - Blog-assisted listings with correlation signals

### Phase 3 Success Criteria

✅ Dashboard is live at `/admin/blog/orchestrator`
✅ All 4 tabs display correctly with data from RPCs
✅ Can answer: "Which article drove most bookings this quarter?"
✅ Admin-only access enforced
✅ No console errors, responsive design works

**Next Steps**: Wait for 3 months of real usage data before considering Phase 4

---

## Phase 4: Referral Integration

### Core Purpose
Turn blog content into a viral acquisition channel by tracking referral-sourced conversions.

### Scope: Blog → Referral Attribution

#### 1. Social Share with Referral Codes

**Component: ReferralShareButton.tsx**
```typescript
// Usage in blog articles
<ReferralShareButton
  article={article}
  platform="twitter" | "linkedin" | "facebook" | "copy"
/>
```

**Generates URL:** `/blog/[slug]?ref=[user_referral_code]`

**Tracks:**
- Who shared which article
- Which platform (Twitter, LinkedIn, Facebook, copied link)
- When shared (timestamp)

**Database:**
- Increment `blog_article_metrics.social_shares`
- Track referral code in `blog_attribution_events`

#### 2. Middleware Enhancement for Referral Tracking

**Update:** `apps/web/src/middleware.ts`

**Logic:**
```typescript
if (pathname.startsWith('/blog/') && searchParams.get('ref')) {
  const refCode = searchParams.get('ref');
  const articleSlug = pathname.split('/blog/')[1];

  // Fetch article ID by slug
  // Set referral cookie: { type: 'blog', code: refCode, articleId, timestamp }
  // On signup/booking, update referrals.source_blog_article_id
}
```

**Attribution Flow:**
1. User A shares article with ref code
2. User B clicks link → referral cookie set
3. User B signs up → referral created → `source_blog_article_id` populated
4. User B books → dual-write event + referral revenue tracked

#### 3. Referral Dashboard Addition

**Update:** `/app/(authenticated)/referrals/page.tsx`

**New Section:** "Blog Performance"
- Articles shared by user
- Clicks per article
- Conversions per article
- Revenue per article
- Leaderboard: Top shared articles

#### 4. Blog Orchestrator Dashboard Update

**New Tab:** "Referral Impact"
- Articles with most referral shares
- Referral → signup conversion rate
- Referral → booking conversion rate
- Revenue from referred users (by source article)

### Success Criteria

1. ✅ Users can share articles with their referral code
2. ✅ Referral cookie persists across signup/booking
3. ✅ `referrals.source_blog_article_id` populates correctly
4. ✅ Dashboard shows: "Article X drove Y referred signups, Z bookings, £W revenue"

### Dependencies

- Phase 1 & 2 complete (event tracking infrastructure) ✅
- Phase 3 complete (dashboard foundation) ✅
- Existing referral system operational ✅

### Out of Scope (Phase 4)

- ❌ Incentivizing shares (bonuses, contests)
- ❌ A/B testing share copy
- ❌ Multi-level referral attribution (referred user refers another)

### Phase 4 Success Metrics

- **Primary:** Referred signups from blog articles (target: 10/month)
- **Secondary:** Referral → booking conversion rate (target: 5%)
- **Tertiary:** Revenue from referred users (target: £500/month)

---

## Phase 5: Cross-Linking & SEO Amplification

### Core Purpose
Bidirectional linking between blog and marketplace to amplify SEO and surface high-converting articles.

### Scope: Blog ↔ Marketplace Widgets

#### 1. Related Articles Widget on Listing Pages

**Component:** `RelatedArticlesWidget.tsx`

**Logic:**
```typescript
// Find articles that:
// 1. Manually embed this listing (blog_listing_links)
// 2. Match listing category/subjects (tag-based)
// 3. Have high conversion rates (from Phase 3 data)

// Show top 3-5 articles with:
// - Thumbnail
// - Title
// - Excerpt
// - "Learn more" CTA
```

**Placement:** Below tutor bio / listing description

**Tracks:** Clicks (reverse attribution: listing → article)

#### 2. Related Marketplace Widget on Blog Pages

**Component:** `RelatedMarketplaceWidget.tsx`

**Logic:**
```typescript
// Extract subject/level tags from article metadata
// Query /api/marketplace/search with filters
// Show 3 cards (TutorProfileCard or MarketplaceListingCard)
// Track as 'auto_related' in blog_listing_links
```

**Placement:** Sidebar or end of article

**Tracks:** Clicks (forward attribution: article → listing)

#### 3. Cross-Link Admin Tool

**Page:** `/admin/blog/cross-links`

**Features:**
- Table: Article | Suggested Listings | Current Links | Actions
- Auto-suggestions using keyword extraction + tag matching
- Bulk approve/reject suggestions
- Performance metrics (CTR, conversion rate per link)

**Use Case:** Content team curates which listings appear in which articles

#### 4. Blog Orchestrator Dashboard Update

**New Tab:** "Cross-Link Performance"
- Which links drive most clicks
- Which links drive most conversions
- Reverse: Which listings benefit most from article links

### Success Criteria

1. ✅ Listing pages show related articles (if available)
2. ✅ Blog articles show related marketplace cards
3. ✅ Admin can approve/reject cross-link suggestions
4. ✅ Dashboard shows: "Link X → Y clicks → Z bookings"

### Dependencies

- Phase 1 & 2 complete (blog_listing_links table exists) ✅
- Phase 3 complete (performance data available) ✅

### Out of Scope (Phase 5)

- ❌ Automatic link insertion (always manual approval)
- ❌ Dynamic personalization (same links for all users)
- ❌ ML-based link recommendations

### Phase 5 Success Metrics

- **Primary:** Click-through rate on cross-links (target: 2%)
- **Secondary:** Cross-link → booking conversion (target: 1%)
- **Tertiary:** SEO: Internal linking score (target: 80/100)

---

## Phase 6: Attribution Model Selection

### Core Purpose
Allow team to choose attribution model based on observed business patterns from Phase 3.

### Scope: Dashboard Configuration (Read-Only Switching)

#### 1. Attribution Model Toggle

**Dashboard Update:** `/admin/blog/orchestrator`

**New Control:** Model selector dropdown
```
[ ] First-Touch Attribution
[ ] Last-Touch Attribution (default)
[ ] Linear Attribution
[ ] Time-Decay Attribution
```

**Implementation:**
- All models query `blog_attribution_events` (same data)
- Models differ only in SQL weighting logic
- No new data collection needed

**First-Touch:**
```sql
-- Credit = earliest blog event before booking
SELECT blog_article_id
FROM blog_attribution_events
WHERE target_type = 'booking' AND target_id = ?
ORDER BY created_at ASC
LIMIT 1
```

**Last-Touch:**
```sql
-- Credit = most recent blog event before booking
SELECT blog_article_id
FROM blog_attribution_events
WHERE target_type = 'booking' AND target_id = ?
ORDER BY created_at DESC
LIMIT 1
```

**Linear:**
```sql
-- Equal credit to all articles in influence path
SELECT blog_article_id, COUNT(*) / total_events AS weight
FROM blog_attribution_events
WHERE target_type = 'booking' AND target_id = ?
GROUP BY blog_article_id
```

**Time-Decay:**
```sql
-- More recent events get higher weight
SELECT
  blog_article_id,
  EXP(-days_before_conversion / 3.5) AS weight
FROM blog_attribution_events
WHERE target_type = 'booking' AND target_id = ?
```

#### 2. Model Comparison View

**New Tab:** "Attribution Models"
- Side-by-side comparison of 4 models
- Shows: Top 10 articles by each model
- Highlights: Where models agree/disagree
- Recommendation: Which model fits business context

**Use Case:** Decide which model to use as default based on Phase 3 learnings

#### 3. Model Lock-In

Once team selects model:
- Becomes default for all reports
- Can still switch, but triggers re-calculation
- Logged in audit trail (who changed, when, why)

### Success Criteria

1. ✅ Dashboard can switch between 4 attribution models
2. ✅ Model comparison shows differences clearly
3. ✅ Team can articulate why they chose their default model
4. ✅ Reports use consistent model across all views

### Dependencies

- Phase 3 complete (observed enough conversion patterns) ✅
- Events table has sufficient data (3-6 months)

### Out of Scope (Phase 6)

- ❌ Custom model builder (preset models only)
- ❌ Machine learning attribution
- ❌ External factor weighting (SEO rank, paid ads)

### Phase 6 Success Metrics

- **Primary:** Model stability (no changes for 6 months)
- **Secondary:** Team confidence in reports (survey: >80% trust)
- **Tertiary:** Report consistency (same question = same answer)

---

## Phase 7: A/B Testing & Optimization

### Core Purpose
Experiment with content placement, embed types, and CTAs to maximize conversions.

### Scope: Controlled Experimentation Infrastructure

#### 1. A/B Experiment Framework

**Database:** `blog_ab_experiments` table (already migrated in Phase 1)

**Experiment Types:**
- Embed placement (top vs bottom of article)
- Embed type (carousel vs grid vs single card)
- CTA copy variations ("Book Now" vs "Find a Tutor")
- Article length impact on conversions

**Workflow:**
1. Define experiment (name, articles, variants, duration)
2. Randomly assign users to variants
3. Track performance (impressions, clicks, conversions)
4. Declare winner after statistical significance
5. Roll out winning variant

#### 2. Experiment Admin UI

**Page:** `/admin/blog/experiments`

**Features:**
- Create new experiment (wizard)
- Active experiments list (with progress %)
- Completed experiments (with winner declared)
- Experiment history (audit trail)

**Use Case:** Marketing/Content team can run experiments without engineering

#### 3. Variant Assignment Logic

**Hook:** `useExperimentVariant(experimentId, articleId)`

**Logic:**
```typescript
// Check if user is in experiment
// If yes, return assigned variant
// If no, randomly assign and record
// Track impression in blog_ab_results

// Example:
const variant = useExperimentVariant('embed-placement-test', article.id);
if (variant === 'control') {
  // Show embed at top
} else if (variant === 'variant_a') {
  // Show embed at bottom
}
```

#### 4. Statistical Significance Calculator

**Built-in:** Bayesian A/B test calculator

**Shows:**
- Sample size per variant
- Conversion rate per variant
- Confidence interval
- Probability of variant A > variant B
- "Declare winner" button (only enabled at >95% confidence)

#### 5. Blog Orchestrator Dashboard Update

**New Tab:** "Experiments"
- Active experiments (with interim results)
- Recently completed experiments (with winners)
- Insights: "Embeds at position 0 convert 23% better"

### Success Criteria

1. ✅ Team can create A/B experiments via UI
2. ✅ Users randomly assigned to variants
3. ✅ Performance tracked per variant
4. ✅ Statistical significance calculated correctly
5. ✅ Winning variants can be rolled out globally

### Dependencies

- Phase 3 complete (baseline performance known) ✅
- Phase 6 complete (attribution model selected)
- Sufficient traffic (>1000 views/month per article)

### Out of Scope (Phase 7)

- ❌ Multi-variant testing (>2 variants)
- ❌ Personalization (same variant for all users in group)
- ❌ Auto-rollout (always manual approval)

### Phase 7 Success Metrics

- **Primary:** Experiments with declared winners (target: 2/quarter)
- **Secondary:** Conversion rate improvement (target: +15% vs baseline)
- **Tertiary:** Experimentation velocity (target: 1 new test/month)

---

## Decision Framework: When to Move to Next Phase

### Phase 3 → Phase 4 Trigger

**Move when:**
- ✅ Dashboard is live and being used weekly
- ✅ Team has identified 3-5 "high-signal" articles
- ✅ You can confidently answer: "Which article drove most bookings this quarter?"
- ✅ You want to amplify top articles via referral sharing

**Do NOT move if:**
- ❌ Dashboard data is inconsistent or confusing
- ❌ Event tracking has gaps (missing events)
- ❌ Team hasn't internalized Phase 3 learnings

### Phase 4 → Phase 5 Trigger

**Move when:**
- ✅ Referral sharing is working (>10 shares/week)
- ✅ You see referred users converting to bookings
- ✅ You want bidirectional traffic between blog and marketplace
- ✅ SEO team wants internal linking strategy

**Do NOT move if:**
- ❌ Referral system has bugs
- ❌ Share rates are low (<5 shares/week)
- ❌ You haven't validated referral → booking attribution

### Phase 5 → Phase 6 Trigger

**Move when:**
- ✅ You have 3-6 months of attribution data
- ✅ You see clear patterns (e.g., "80% of bookings happen within 3 days")
- ✅ Team debates: "Should we credit first-touch or last-touch?"
- ✅ You need consistent model for stakeholder reports

**Do NOT move if:**
- ❌ Event data is sparse (<100 bookings attributed)
- ❌ Models produce nearly identical results (no decision needed)
- ❌ Team doesn't understand attribution concepts

### Phase 6 → Phase 7 Trigger

**Move when:**
- ✅ Attribution model is stable and trusted
- ✅ You have hypotheses to test (e.g., "Bottom embeds convert better")
- ✅ Traffic is sufficient (>1000 views/article/month)
- ✅ Team has experimentation discipline (won't peek early)

**Do NOT move if:**
- ❌ Traffic is too low for statistical significance
- ❌ Team wants to "just try stuff" without rigorous testing
- ❌ You're still fixing bugs from previous phases

---

## File Locations

### Database Migrations
```
tools/database/migrations/
├── 179_create_blog_attribution_events.sql          # Event stream (source of truth)
├── 180_update_blog_listing_links_metadata.sql      # Embed metadata
├── 181_add_visibility_to_blog_article_saves.sql    # Privacy controls
└── 182_create_blog_orchestrator_rpcs.sql           # Phase 3 analytics RPCs
```

### Utilities
```
apps/web/src/lib/utils/
├── sessionTracking.ts                              # 30-day cookie-based sessions
└── embedInstanceId.ts                              # Stable hash-based embed IDs
```

### Components
```
apps/web/src/app/components/blog/
├── embeds/
│   ├── TutorEmbed.tsx                              # Embed tutor profiles
│   ├── ListingGrid.tsx                             # Embed marketplace listings
│   ├── TutorCarousel.tsx                           # Swipeable tutor carousel
│   └── useBlogAttribution.ts                       # Attribution tracking hook
└── SaveArticleButton.tsx                           # Save articles to wiselists
```

### Admin Dashboard
```
apps/web/src/app/(admin)/admin/blog/orchestrator/
├── page.tsx                                        # Main dashboard component
└── page.module.css                                 # Dashboard styles
```

### API Routes
```
apps/web/src/app/api/
├── blog/
│   ├── attribution/
│   │   ├── route.ts                                # Dual-write for conversions
│   │   └── events/
│   │       └── route.ts                            # Event recording
│   └── saves/
│       └── route.ts                                # Article saves with dual-write
└── admin/blog/orchestrator/
    ├── stats/route.ts                              # Overview stats (performance + funnel)
    ├── top-articles/route.ts                       # Articles sorted by revenue
    └── listings/route.ts                           # Blog-assisted listings
```

---

## Key Technical Decisions

### 1. Event-Based vs Field-Based Attribution
**Decision**: Event-based (immutable event stream)
**Rationale**: Enables multi-touch attribution, preserves full interaction history, allows query-time model selection

### 2. Dual-Write Pattern
**Decision**: Write events + cache fields
**Rationale**: Events = truth (for complex queries), cache = performance (for simple queries)

### 3. Session Tracking Approach
**Decision**: 30-day cookie-based UUID
**Rationale**: Tracks anonymous users, persists across login, no server-side state

### 4. Attribution Window
**Decision**: 7 days (default, explicit parameter)
**Rationale**: Validated by Phase 3 time-to-conversion distribution, passed as parameter for flexibility

### 5. Privacy-First Design
**Decision**: Article saves are private by default
**Rationale**: Protect reading history, require explicit opt-in for public sharing

### 6. Multi-Touch Attribution (Phase 3)
**Decision**: Read-only observation, no model selection yet
**Rationale**: Phase 3 is observation layer, attribution model selection is Phase 6 optimization

---

## Anti-Patterns to Avoid

### 1. Skipping Phase 3 Observation Period

**Symptom:** Rushing to A/B tests before understanding baseline patterns

**Consequence:** Testing random variations without strategy

**Fix:** Force 3-month observation period (Phase 3) before optimization (Phase 7)

### 2. Attribution Model Thrashing

**Symptom:** Switching models every week based on latest data

**Consequence:** Reports become incomparable, team loses trust

**Fix:** Lock model for 6 months after selection (Phase 6)

### 3. Premature Referral Incentives

**Symptom:** Offering bonuses for shares before validating share → conversion

**Consequence:** Gaming the system, low-quality referrals

**Fix:** Phase 4 tracks referrals WITHOUT incentives first

### 4. Over-Indexing on Vanity Metrics

**Symptom:** Celebrating "10,000 article views!" without checking bookings

**Consequence:** Content strategy optimizes for traffic, not revenue

**Fix:** Phase 3 dashboard shows revenue first, views second

### 5. A/B Testing Without Statistical Discipline

**Symptom:** Declaring winners after 2 days with 50 conversions

**Consequence:** False positives, implementing changes that don't work

**Fix:** Phase 7 enforces >95% confidence, minimum sample sizes

### 6. Hard-Coding Attribution Window

**Symptom:** Baking 7-day assumption into SQL

**Consequence:** Inflexible system, requires migration to change

**Fix:** Guardrail 1 - explicit `p_attribution_window_days` parameter in every RPC

### 7. Privacy Violations

**Symptom:** Exposing reading history on public wiselists by default

**Consequence:** User trust erosion, potential GDPR violations

**Fix:** Privacy-first design with opt-in sharing (`visibility` column)

---

## Phase-Specific Risks & Mitigations

### Phase 4 Risks

**Risk:** Referral abuse (users gaming share counts)
**Mitigation:** Track clicks, not just shares. Only count unique visitors.

**Risk:** Referral cookie conflicts with existing system
**Mitigation:** Use separate cookie namespace, document interaction clearly.

### Phase 5 Risks

**Risk:** Cross-links create circular navigation (user trapped in loop)
**Mitigation:** Limit to 3-5 links per page, track bounce rates.

**Risk:** Auto-suggestions surface low-quality links
**Mitigation:** All links require manual approval (never auto-publish).

### Phase 6 Risks

**Risk:** Model selection becomes political (team disagreement)
**Mitigation:** Use data to decide. If models agree 90%, pick simplest (last-touch).

**Risk:** Switching models invalidates historical comparisons
**Mitigation:** Store model used for each report, allow "recalculate with new model".

### Phase 7 Risks

**Risk:** Insufficient traffic for statistical significance
**Mitigation:** Don't run Phase 7 until >1000 views/article/month. Wait.

**Risk:** Experiment "pollution" (multiple experiments interfere)
**Mitigation:** Limit to 1 active experiment per article at a time.

---

## Resource Requirements

### Phase 4 (Referral Integration)

- **Engineering:** 2 weeks
- **Design:** 3 days (share buttons, referral dashboard)
- **QA:** 1 week (test referral flow end-to-end)

### Phase 5 (Cross-Linking)

- **Engineering:** 3 weeks
- **Design:** 1 week (widgets, admin UI)
- **Content:** Ongoing (curate links)

### Phase 6 (Attribution Models)

- **Engineering:** 1 week (SQL + UI toggle)
- **Analytics:** 1 week (validate model calculations)
- **Leadership:** 2 hours (decide which model)

### Phase 7 (A/B Testing)

- **Engineering:** 4 weeks
- **Design:** 1 week (experiment UI)
- **QA:** 2 weeks (test randomization, tracking)
- **Statistics:** Consultant (validate significance tests)

---

## Final Word

**Phase 3 gives you the map.**
**Phases 4-7 teach you to drive.**

But here's the truth:

You won't need all of these phases.

After Phase 3, you'll know which 1-2 optimizations matter most.

Maybe it's referrals (Phase 4).
Maybe it's cross-linking (Phase 5).
Maybe it's neither.

This roadmap exists so you don't have to invent it later.

But don't treat it as a checklist.

Treat it as options.

Phase 3 tells you which options to exercise.

---

## Related Documentation

### Core Context Files
- [ROADMAP.md](../.ai/1 - ROADMAP.md) - Phase 3 completion status
- [PLATFORM-SPECIFICATION.md](../.ai/2 - PLATFORM-SPECIFICATION.md) - Blog system architecture
- [SYSTEM-NAVIGATION.md](../.ai/3 - SYSTEM-NAVIGATION.md) - File locations

### Feature Documentation
- [HYBRID_UI_SUMMARY.md](../HYBRID_UI_SUMMARY.md) - Manual MDX vs automatic embeds
- [FORMS_UI_COMPARISON.md](../FORMS_UI_COMPARISON.md) - Form patterns

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-16 | Initial creation - Phases 1-3 documentation |
| 1.1 | 2026-01-16 | Merged BLOG-SEO.md and PHASE-4-7-ROADMAP.md into single document |
| 1.2 | 2026-01-16 | Updated Phase 3 status - Dashboard UI implemented and complete |

---

**Status**: Phase 1-3 Complete (Dashboard Live), Phases 4-7 Planned
**Next Review**: After 3 months of Phase 3 dashboard usage
**Owner**: Product Lead + Engineering Lead
**Last Updated**: 2026-01-16
