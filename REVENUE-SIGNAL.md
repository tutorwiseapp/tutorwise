# Revenue Signal - Complete Specification

**Purpose**: Detect and amplify content that generates revenue through intelligent attribution tracking, SEO optimization, and targeted distribution
**Status**: Phase 1-3 Complete (Signal Detection), Distribution v1 Frozen (Signal Amplification), Phases 4-7 Planned (Signal Optimization)
**Last Updated**: 2026-01-17
**Version**: 3.0 (Revenue Signal)

---

## Table of Contents

1. [Executive Overview](#executive-overview)
2. [System Architecture](#system-architecture)
3. [SEO Foundation](#seo-foundation)
4. [Attribution & Analytics (Phase 1-3)](#attribution--analytics-phase-1-3)
5. [Distribution Layer (Frozen v1)](#distribution-layer-frozen-v1)
6. [Future Phases (4-7)](#future-phases-4-7)
7. [Implementation Status](#implementation-status)
8. [Technical Reference](#technical-reference)
9. [Monitoring & Operations](#monitoring--operations)

---

## Executive Overview

### The Complete Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     REVENUE SIGNAL FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. CONTENT CREATION (Admin)
   ├─ Write article with MDX support
   ├─ Add SEO metadata (title, description, keywords)
   ├─ Embed marketplace components (TutorEmbed, ListingGrid)
   └─ Publish to blog

2. SEO FOUNDATION (Passive Discovery)
   ├─ Dynamic sitemaps (/blog/sitemap.xml)
   ├─ Structured data (JSON-LD Article markup)
   ├─ OpenGraph & Twitter Cards
   ├─ Google Search Console integration
   └─ Performance monitoring

3. SIGNAL AMPLIFICATION (Active Distribution) ← NEW
   ├─ LinkedIn Company Page posting
   ├─ Scheduled publishing queue
   ├─ UTM tracking for attribution
   └─ Failed post retry workflow

4. SIGNAL DETECTION (Event-Based Attribution)
   ├─ Session tracking (30-day cookies)
   ├─ Event stream (impressions, clicks, saves, converts)
   ├─ Dual-write pattern (events + cache fields)
   └─ Multi-touch attribution infrastructure

5. MARKETPLACE INTEGRATION (Signal Conversion)
   ├─ MDX embeds (tutors, listings, carousels)
   ├─ Click tracking with embed instance IDs
   ├─ Wiselist saves from articles
   └─ Conversion to bookings

6. SIGNAL ANALYTICS (/admin/signal)
   ├─ Article performance (views, clicks, bookings, revenue)
   ├─ Conversion funnel (View → Interact → Save → Book)
   ├─ Listing visibility uplift
   └─ Time-to-conversion distribution

7. REVENUE OUTCOMES
   ├─ Revenue attribution per article
   ├─ ROI calculation
   ├─ Signal-attributed bookings
   └─ Economic outcome tracking (vs vanity metrics)
```

### Core Philosophy

**Revenue Signal = Detect content that generates revenue + Amplify it to the right audiences**

**Signal Flow**:
- **SEO** builds passive demand (organic discovery)
- **Content** educates and builds trust (blog articles)
- **Signal Detection** tracks what drives revenue (attribution)
- **Signal Amplification** reaches targeted audiences (distribution)
- **Marketplace** converts interest to bookings (transactions)
- **Analytics** measures economic outcomes (revenue, not vanity metrics)

**Epistemic Boundary**:
- **Phase 1-3**: Signal Detection (observation layer - what's happening) ✅ **COMPLETE**
- **Distribution v1**: Signal Amplification (active distribution - LinkedIn only) ❄️ **FROZEN**
- **Phase 4-7**: Signal Optimization (optimization layer - what to improve) ⏳ **FUTURE**

### Naming Strategy (Strategic Migration to signal_*)

**Why "Revenue Signal"?**
- **Signal** = Intelligence, detection, pattern recognition (vs "Engine" = mechanical automation)
- **Revenue** = Economic outcomes, not vanity metrics (vs "Engagement", "Traffic")
- **Positioning**: Platform-level business intelligence ($1B+ vision), not product-level marketing tool

**Strategic Decision: Full Migration to `signal_*` Tables**

**BREAKING CHANGE (Migrations 183-186)**: Rename core tables from `blog_*` → `signal_*` for future-proofing.

**Tables Being Renamed**:
```
❌ blog_attribution_events  →  ✅ signal_events
❌ blog_article_metrics     →  ✅ signal_metrics
❌ blog_listing_links       →  ✅ signal_content_embeds
❌ blog_article_saves       →  ✅ signal_content_saves
```

**Tables Staying as `blog_*`** (Content-Type Specific):
```
✅ blog_articles            # Blog content structure
✅ blog_categories          # Blog taxonomy
✅ blog_authors             # Blog authorship
✅ blog_seo_keywords        # SEO-specific metadata
```

**Why Rename Now?**
1. **Platform vs Product**: Signal-instrumented content extends beyond blogs (podcasts, videos, webinars)
2. **Future-Proofing**: Avoid "the Blog Trap" - naming that limits expansion
3. **Datadog Parallel**: Generic "traces" beats specific "apm_events" for 10-year vision
4. **Migration Cost**: 9 days one-time vs 81 days cumulative over 5 years
5. **Zero-Downtime**: PostgreSQL views provide backward compatibility during transition

**New Schema Enhancements**:
- **signal_id**: Journey tracking across sessions (like Datadog's trace_id)
- **content_type**: Extensible to 'article', 'podcast', 'video', 'webinar'
- **target_type**: Expanded for multi-source attribution

**Navigation Structure**:
```
Admin Sidebar:
├─ Content
│  ├─ Articles (/admin/blog)
│  └─ SEO (/admin/blog/seo)
└─ Revenue Signal
   ├─ Analytics (/admin/signal)              ← Phase 3 dashboard
   ├─ Distribution (/admin/signal/distribution)  ← Distribution v1
   ├─ Attribution Models (/admin/signal/attribution) ← Phase 6
   └─ Experiments (/admin/signal/experiments)    ← Phase 7
```

**Backward Compatibility**:
- `/admin/blog/orchestrator` → redirects to `/admin/signal` (permanent)
- Event tracking continues to work (same events table)
- RPCs reference existing `blog_` tables (no changes needed)

---

## System Architecture

### Event-Based Attribution (Source of Truth)

**Philosophy**: Immutable event stream as single source of truth for all content interactions

```sql
CREATE TABLE signal_events (
  id UUID PRIMARY KEY,

  -- NEW: Signal ID for journey tracking (like Datadog's trace_id)
  signal_id UUID,              -- Links all events in a user journey across sessions

  -- Content Reference (generic, not blog-specific)
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article', -- article, podcast, video, webinar

  -- User Identity
  user_id UUID REFERENCES profiles(id),
  session_id TEXT,              -- 30-day cookie-based session

  -- Event Classification
  event_type TEXT NOT NULL,     -- impression, click, save, refer, convert
  target_type TEXT NOT NULL,    -- article, tutor, listing, booking, referral, wiselist_item
  target_id UUID NOT NULL,
  source_component TEXT,        -- listing_grid, tutor_embed, distribution, etc.

  -- Flexible metadata
  metadata JSONB,               -- distribution_id, context, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Event Taxonomy** (Locked Down):
- **event_type**: impression, click, save, refer, convert
- **target_type**: article, tutor, listing, booking, referral, wiselist_item
- **source_component**: listing_grid, tutor_embed, tutor_carousel, distribution, cta_button, floating_save

**Backward Compatibility**:
- View `blog_attribution_events` → reads from `signal_events WHERE content_type = 'article'`
- Existing code continues to work during migration (Migrations 183-186)
- See [SIGNAL-MIGRATION-PLAN.md](./SIGNAL-MIGRATION-PLAN.md) for details

### Dual-Write Pattern

Every significant user action triggers two writes:

1. **Event write** (immutable truth): `INSERT INTO blog_attribution_events`
2. **Cache write** (denormalized performance): Update `source_blog_article_id` column

**Example: Wiselist Save**
```typescript
// 1. Write event (source of truth)
await supabase.from('blog_attribution_events').insert({
  blog_article_id: articleId,
  event_type: 'save',
  target_type: 'wiselist_item',
  target_id: wiselistItemId,
  source_component: 'floating_save'
});

// 2. Update cache (last-touch attribution)
await supabase.from('wiselist_items')
  .update({ source_blog_article_id: articleId })
  .eq('id', wiselistItemId);
```

**Benefits**:
- Events table: Complete interaction history for multi-touch attribution
- Cache columns: Fast queries for simple "last-touch" attribution
- Graceful degradation: System still functions if event write fails

### Signal ID (Journey Tracking)

**NEW in Migration 183**: Datadog-inspired journey tracking using `signal_id` (like trace_id).

**Purpose**: Link all events in a user journey across sessions to understand multi-touch attribution.

**Generation Logic**:
```typescript
export function getOrCreateSignalId(distributionId?: string): string {
  // Priority 1: Distribution-specific signal (from LinkedIn post)
  if (distributionId) {
    const signalId = `dist_${distributionId}`;
    setCookie('tw_signal_id', signalId, 7); // 7-day attribution window
    return signalId;
  }

  // Priority 2: Session-based signal (organic traffic)
  let signalId = getCookie('tw_signal_id');
  if (!signalId) {
    signalId = `session_${uuidv4()}`;
    setCookie('tw_signal_id', signalId, 30); // 30-day session
  }
  return signalId;
}
```

**Usage in Components**:
```typescript
// In useBlogAttribution.ts → useSignalTracking.ts (Week 2 rename)
const signalId = getOrCreateSignalId(distributionId);

await supabase.from('signal_events').insert({
  signal_id: signalId,        // NEW - Links journey
  content_id: articleId,
  content_type: 'article',
  event_type: 'click',
  target_type: 'listing',
  target_id: listingId,
  // ...
});
```

**Signal Journey Visualization** (Phase 3+):
```
Signal: dist_abc123 (LinkedIn Post → Booking)
├─ 2026-01-15 10:30: impression (article)
├─ 2026-01-15 10:32: click (tutor_embed → listing_view)
├─ 2026-01-15 10:35: save (wiselist_item)
├─ 2026-01-17 14:20: click (wiselist → listing_view)  # 2 days later
└─ 2026-01-17 14:25: convert (booking)                 # Within 7-day window
```

**Implementation Status**:
- ✅ Week 1: Database schema with signal_id column (Migration 183)
- ⏳ Week 2: Update components to generate and pass signal_id
- ⏳ Week 3: Add Signal Path Viewer to /admin/signal dashboard
- ⏳ Week 4: Enable multi-touch attribution analytics

---

## SEO Foundation

### Implemented Features ✅

#### 1. Meta Tags & Metadata
- Dynamic page titles with article titles
- Custom meta descriptions (falls back to article description)
- Meta keywords support
- Author metadata
- Canonical URLs for all pages

#### 2. Open Graph Tags
- OG title, description, type (article)
- Published time, modified time
- Author names
- Featured images for social sharing
- Article tags

#### 3. Twitter Cards
- Summary large image cards
- Title, description, images

#### 4. Structured Data (JSON-LD)
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "How to Find the Perfect GCSE Maths Tutor",
  "author": {
    "@type": "Person",
    "name": "TutorWise Team"
  },
  "publisher": {
    "@type": "Organization",
    "name": "TutorWise"
  },
  "datePublished": "2024-01-15T10:00:00Z",
  "dateModified": "2024-01-16T14:30:00Z",
  "image": "https://tutorwise.io/og-image.jpg",
  "mainEntityOfPage": "https://tutorwise.io/blog/gcse-maths-tutor"
}
```

#### 5. Sitemaps
- Dynamic blog sitemap at `/blog/sitemap.xml`
- Automatically includes all published articles
- Category pages included
- Last modified dates
- Referenced in robots.txt

**File**: `apps/web/src/app/blog/sitemap.ts`

#### 6. Robots.txt
- Proper crawl directives
- Sitemap references
- Admin/API path exclusions

**File**: `apps/web/src/app/robots.ts`

#### 7. Technical SEO
- Proper heading hierarchy (H1 → H2 → H3)
- Semantic HTML structure
- Mobile-responsive design
- Fast page load (Next.js optimizations)
- Image optimization with Next.js Image component

### SEO Metrics Tracking

**Database Schema** (Migration 175):

```sql
-- Daily performance metrics per article
CREATE TABLE blog_article_metrics (
  id UUID PRIMARY KEY,
  article_id UUID REFERENCES blog_articles(id),
  date DATE NOT NULL,
  page_views BIGINT DEFAULT 0,
  unique_visitors BIGINT DEFAULT 0,
  avg_time_on_page INTEGER,       -- seconds
  bounce_rate NUMERIC(5,2),
  organic_search BIGINT DEFAULT 0,
  direct_traffic BIGINT DEFAULT 0,
  social_traffic BIGINT DEFAULT 0,
  search_impressions BIGINT DEFAULT 0,
  search_clicks BIGINT DEFAULT 0,
  avg_search_position NUMERIC(5,2)
);

-- Keyword rankings per article
CREATE TABLE blog_seo_keywords (
  id UUID PRIMARY KEY,
  article_id UUID REFERENCES blog_articles(id),
  keyword TEXT NOT NULL,
  current_position INTEGER,
  previous_position INTEGER,
  search_volume INTEGER,
  difficulty INTEGER,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  ctr NUMERIC(5,2)
);

-- External backlinks
CREATE TABLE blog_backlinks (
  id UUID PRIMARY KEY,
  article_id UUID REFERENCES blog_articles(id),
  source_url TEXT NOT NULL,
  source_domain TEXT,
  anchor_text TEXT,
  domain_authority INTEGER,
  is_follow BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  discovered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily summary of overall blog SEO health
CREATE TABLE blog_seo_summary (
  id UUID PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_articles INTEGER,
  total_page_views BIGINT,
  total_backlinks BIGINT,
  avg_search_position NUMERIC(5,2),
  top_article_id UUID,
  top_keyword TEXT
);
```

### Google Analytics Integration

**Component**: `apps/web/src/app/components/analytics/GoogleAnalytics.tsx`

```typescript
// Add to Layout.tsx
import GoogleAnalytics from '@/app/components/analytics/GoogleAnalytics';

export default function Layout({ children }: LayoutProps) {
  return (
    <>
      <GoogleAnalytics />
      {/* Rest of layout */}
    </>
  );
}
```

**Environment Variable Required**:
```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Custom Event Tracking**:
```typescript
// Track article views
gtag('event', 'article_view', {
  article_id: article.id,
  article_title: article.title,
  category: article.category
});

// Track scroll depth
gtag('event', 'scroll_depth', {
  percent_scrolled: 75,
  article_id: article.id
});
```

### SEO Admin Dashboard

**Location**: `/admin/blog/seo`

**Features**:
- Setup checklist showing configuration status
- Quick links to sitemaps and external tools
- Tabs for Overview, Articles, Keywords, Backlinks
- Integration status (Google Analytics, Search Console)
- Performance metrics overview

**File**: `apps/web/src/app/(admin)/admin/blog/seo/page.tsx`

### Manual Setup Tasks

**High Priority**:
1. ✅ Run database migration 175 (SEO analytics tables)
2. ⬜ Set up Google Analytics 4
   - Create GA4 property
   - Get Measurement ID (G-XXXXXXXXXX)
   - Add to `.env.local`
3. ⬜ Set up Google Search Console
   - Verify domain ownership (DNS or HTML file)
   - Submit sitemap: `blog/sitemap.xml`
4. ⬜ Add GoogleAnalytics component to main Layout

**Medium Priority**:
5. ⬜ Set up PageSpeed Insights API
6. ✅ Add SEO link to admin sidebar

**Optional**:
7. ⬜ Configure Ahrefs or SEMrush for backlink monitoring ($99-119/mo)

---

## Signal Detection & Analytics (Phase 1-3)

### Phase 1-2: Foundation (Complete) ✅

**Database Migrations**:
- **Migration 179**: `blog_attribution_events` table
- **Migration 180**: `blog_listing_links` metadata enhancements
- **Migration 181**: Privacy controls for article saves

**Session Tracking**: 30-day cookie-based sessions
```typescript
export function getOrCreateSessionId(): string {
  let sessionId = getCookie('tw_session_id');
  if (!sessionId) {
    sessionId = uuidv4();
    setCookie('tw_session_id', sessionId, 30); // 30-day expiry
  }
  return sessionId;
}
```

**Embed Instance IDs**: Stable, hash-based IDs for performance comparison
```typescript
export function generateEmbedInstanceId(
  articleId: string,
  componentType: string,
  position: number
): string {
  const payload = `${articleId}:${componentType}:${position}`;
  return createHash('sha256').update(payload).digest('hex').substring(0, 16);
}
```

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

**SaveArticleButton.tsx** - Save articles to wiselists
```tsx
<SaveArticleButton article={article} variant="icon" />
```
- One-click save to "My Saves" wiselist
- Anonymous users: localStorage → migrate on login
- Logged-in users: Database with event tracking
- Privacy-first: articles saved to wiselists are private by default

### Phase 3: Revenue Signal Analytics Dashboard (Complete) ✅

**Location**: `/admin/signal` (currently `/admin/blog/orchestrator` - will redirect)

**Purpose**: Detect which content generates revenue and provide actionable intelligence for product, SEO, and content decisions.

**Phase 3 Answers**:
- Which articles drive the most bookings?
- What's the conversion funnel (views → clicks → saves → bookings)?
- Which listings benefit from blog traffic? (correlation, not causation)
- How long does attribution typically take?

**Dashboard RPCs** (Migration 182):

**1. get_article_performance_summary**
```sql
CREATE OR REPLACE FUNCTION get_article_performance_summary(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  article_id UUID,
  article_title TEXT,
  article_slug TEXT,
  category TEXT,
  published_at TIMESTAMPTZ,
  views_count BIGINT,
  interaction_count BIGINT,        -- clicks + saves
  wiselist_save_count BIGINT,
  booking_count BIGINT,            -- blog-assisted bookings
  booking_revenue NUMERIC,
  conversion_rate NUMERIC
)
```

**2. get_conversion_funnel**
```sql
CREATE OR REPLACE FUNCTION get_conversion_funnel(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  stage_number INTEGER,            -- 1, 2, 3, 4
  stage_name TEXT,                 -- View, Interact, Save, Book
  count BIGINT,
  conversion_rate NUMERIC
)
```

**3. get_blog_assisted_listings**
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
  baseline_views NUMERIC,          -- same-category avg
  baseline_bookings NUMERIC,
  uplift_views_pct NUMERIC,        -- correlation signal
  uplift_bookings_pct NUMERIC
)
```

**4. get_time_to_conversion_distribution**
```sql
CREATE OR REPLACE FUNCTION get_time_to_conversion_distribution(
  p_days INTEGER DEFAULT 30,
  p_attribution_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  day_bucket INTEGER,              -- 0, 1, 2, 3, 4, 5, 6, 7+
  conversion_count BIGINT,
  cumulative_pct NUMERIC
)
```

**Dashboard UI Structure**:
- **Overview Tab**: KPI cards + funnel preview
  - Total Articles
  - Blog-Assisted Bookings
  - Revenue Generated
  - Conversion Rate
- **Top Articles Tab**: Revenue-sorted table with all metrics
- **Conversion Funnel Tab**: Four-stage funnel visualization
- **Listing Visibility Tab**: Blog-assisted listings with baseline comparison

**Features**:
- Date range selector (30/60/90 days)
- Attribution window selector (7/14/30 days)
- Loading states and placeholder messages
- Responsive design for mobile
- Admin-only access (auth checks on both page and API routes)

**API Routes** (New Signal namespace):
- `GET /api/admin/signal/analytics` (stats - performance + funnel)
- `GET /api/admin/signal/articles` (top articles sorted by revenue)
- `GET /api/admin/signal/listings` (blog-assisted listings with uplift)

**Legacy Routes** (redirect to new paths):
- `GET /api/admin/blog/orchestrator/stats` → `/api/admin/signal/analytics`
- `GET /api/admin/blog/orchestrator/top-articles` → `/api/admin/signal/articles`
- `GET /api/admin/blog/orchestrator/listings` → `/api/admin/signal/listings`

### Phase 3 Success Criteria ✅

- ✅ Signal Analytics dashboard live at `/admin/signal` (currently `/admin/blog/orchestrator`)
- ✅ All 4 tabs display correctly with data from RPCs
- ✅ Can answer: "Which article drove most bookings this quarter?"
- ✅ Admin-only access enforced
- ✅ No console errors, responsive design works
- 🔄 **Next**: Migrate routes from `/admin/blog/orchestrator` → `/admin/signal` (Distribution v1)

**Next Steps**: Wait for 3 months of real usage data before considering Phase 4

---

## Signal Amplification - Distribution Layer (Frozen v1)

### Purpose

Publish TutorWise blog articles to TutorWise LinkedIn Page for marketplace demand generation.

**Measurement**: Downstream marketplace outcomes (bookings, revenue), NOT social engagement

**Scope**: LinkedIn Page only, organic posts only

**Status**: ❄️ **FROZEN** - Implement exactly as specified

### Strategic Differentiation

**Buffer/Hootsuite**: Stop at engagement metrics (likes, shares, impressions)
**TutorWise**: Go from LinkedIn post → blog → marketplace → booking → revenue

**This is growth instrumentation**, not social scheduling.

### UI Mapping (Clean Separation)

**Location**: `/admin/signal/distribution`
**Pattern**: Hub layout (matching existing Signal Analytics dashboard)
**Entity**: `signal_distributions` table (NEW - uses signal_ prefix)

#### Tab-Driven Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│ Distribution Hub                                                │
├────────────────────────────────────────────────────────────────┤
│ Tabs: [Draft] [Scheduled] [Published] [Failed]                │
└────────────────────────────────────────────────────────────────┘
```

**NOT Kanban. NOT drag/drop. This is operations, not planning.**

#### Table Columns (Minimum Viable Set)

| Column | Type | Notes |
|--------|------|-------|
| Article | Link | Navigate to article |
| Channel | Badge | "LinkedIn" (read-only for v1) |
| Status | Badge | Draft/Scheduled/Published/Failed |
| Scheduled At | DateTime | When to publish |
| Published At | DateTime | Actual publish time (nullable) |
| Error | Text | If failed, show error message |
| Distribution ID | UUID | Read-only, for debugging |

#### Actions (Context-Aware)

| Action | Available When | Behavior |
|--------|---------------|----------|
| Schedule | Draft only | Set scheduled_at, status → 'scheduled' |
| Cancel | Scheduled only | status → 'draft' |
| Retry | Failed only | status → 'scheduled' (manual retry) |
| View Article | Always | Open blog article in new tab |
| View Results | Published only | Deep-link to Orchestrator with distribution filter |

### LinkedIn API Integration

**App Permissions** (Request ONLY These):
```
w_organization_social    - Write posts to company page
r_organization_social    - Read company page data
r_organization_admin     - Verify admin access
```

**Organization URN**: Hardcode per environment
```typescript
// config/linkedin.ts
export const LINKEDIN_ORG_URN = process.env.NODE_ENV === 'production'
  ? 'urn:li:organization:12345678'  // Production TutorWise page
  : 'urn:li:organization:87654321'; // Staging test page
```

### Core Publishing API

**Endpoint**: `POST https://api.linkedin.com/v2/ugcPosts`

**Payload** (FINAL for v1):
```json
{
  "author": "urn:li:organization:12345678",
  "lifecycleState": "PUBLISHED",
  "specificContent": {
    "com.linkedin.ugc.ShareContent": {
      "shareCommentary": {
        "text": "How to find the perfect GCSE Maths tutor 👇"
      },
      "shareMediaCategory": "ARTICLE",
      "media": [{
        "status": "READY",
        "originalUrl": "https://tutorwise.io/blog/slug?utm_source=linkedin&utm_medium=organic_social&utm_campaign=distribution&utm_content=dist_UUID"
      }]
    }
  },
  "visibility": {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
  }
}
```

**v1 Restrictions**:
- ❌ No image uploads (LinkedIn pulls from og:image)
- ❌ No video posts
- ❌ No carousels, polls, mentions
- Just: **Text + Link**

### UTM Parameters (Critical for Attribution)

**Standard Format**:
```
?utm_source=linkedin
&utm_medium=organic_social
&utm_campaign=distribution
&utm_content=dist_{DISTRIBUTION_ID}
```

**Alternative** (if UTMs clutter):
```
?d={DISTRIBUTION_ID}
```

Middleware expands `?d=` to full UTM set + tracks in `blog_attribution_events`.

### Distribution Worker (Background Job)

**Pattern**: Vercel Cron (serverless function)
**Schedule**: Every 5 minutes
**Location**: `app/api/cron/distribution/route.ts`

**Worker Query**:
```sql
SELECT *
FROM blog_distributions
WHERE status = 'scheduled'
  AND scheduled_at <= NOW()
ORDER BY scheduled_at ASC
LIMIT 10;
```

**Processing Rules**:

**Success Path**:
```typescript
try {
  const response = await postToLinkedIn(distribution);

  await supabase.from('blog_distributions').update({
    status: 'published',
    published_at: new Date(),
    external_post_id: response.id,
    error_code: null,
    error_message: null
  }).eq('id', distribution.id);
} catch (error) {
  // Handle failure...
}
```

**Failure Path**:
```typescript
catch (error) {
  await supabase.from('blog_distributions').update({
    status: 'failed',
    failed_at: new Date(),
    error_code: error.code,        // 'TOKEN_EXPIRED', 'RATE_LIMIT', etc.
    error_message: error.message,
    retry_count: distribution.retry_count + 1
  }).eq('id', distribution.id);
}
```

**No Auto-Retry.** Retries are manual via UI.

**Why**: Prevents infinite loops, ghost posts, rate-limit spirals. Admin explicitly decides whether to retry.

### Attribution Integration

**Middleware Enhancement**:
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const distributionId = url.searchParams.get('d');

  if (distributionId) {
    const response = NextResponse.next();
    response.cookies.set('tw_distribution_id', distributionId, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: true
    });
    return response;
  }

  return NextResponse.next();
}
```

**Event Tracking**:
```typescript
// When user clicks tutor embed from distributed article
await fetch('/api/blog/attribution/events', {
  method: 'POST',
  body: JSON.stringify({
    event_type: 'click',
    source_component: 'distribution',
    metadata: {
      distribution_id: getCookie('tw_distribution_id')
    }
  })
});
```

### Signal Analytics Dashboard Enhancement

**Add Distribution Filter** to existing Signal Analytics dashboard (`/admin/signal`):

**New Filter Dropdown**:
```
Filter by: [All Sources ▼]
  - All Sources
  - Organic Search (SEO)
  - Distribution (LinkedIn)  ← NEW
  - Direct Traffic
  - Referral
```

**New KPI Card** (Overview tab):
```
┌──────────────────────────────┐
│ LinkedIn Distribution        │
│ 12 posts sent this month     │
│ 450 clicks → 3 bookings      │
│ £180 revenue                 │
│ ROI: ∞ (£180 revenue, £0 cost) │
└──────────────────────────────┘
```

**Differentiation**:
- Buffer shows: 450 clicks, 3% CTR ✅ (stops here)
- TutorWise shows: 450 clicks → 3 bookings → £180 revenue ✅✅✅ (keeps going)

**This is the moat.**

### Database Schema (Hybrid Naming Strategy)

**Strategy**: Existing Phase 1-3 tables keep `blog_` prefix, new Distribution tables use `signal_` prefix

```sql
-- Signal Amplification - Distribution queue (NEW)
CREATE TABLE signal_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES blog_articles(id) ON DELETE CASCADE,

  platform TEXT NOT NULL DEFAULT 'linkedin' CHECK (platform = 'linkedin'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),

  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  post_text TEXT NOT NULL,
  post_url TEXT NOT NULL,

  external_post_id TEXT,
  external_response JSONB,

  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Signal Amplification - Social OAuth tokens (NEW)
CREATE TABLE signal_social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  platform TEXT NOT NULL DEFAULT 'linkedin',
  account_type TEXT NOT NULL DEFAULT 'company',

  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  organization_urn TEXT,
  organization_id TEXT,

  is_active BOOLEAN DEFAULT TRUE,
  last_auth_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### What We Do NOT Build (Locked)

**v1 Explicitly Excludes**:
- ❌ LinkedIn Analytics API (likes/comments/shares)
- ❌ Multi-channel publishing (Twitter, Facebook)
- ❌ Personal account posting
- ❌ Auto-retry logic
- ❌ Optimal posting time suggestions
- ❌ Hashtag suggestions
- ❌ Image uploads
- ❌ Video posts
- ❌ Carousels/polls
- ❌ Post previews beyond text box
- ❌ Slack/email notifications

**If it doesn't move sign-ups, listings, or bookings → it's out.**

### Implementation Checklist (12 days / 2.5 weeks)

**Phase 1: Database Schema (1 day)**
- Create `blog_distributions` table
- Create `blog_social_accounts` table
- Add indexes and RLS policies

**Phase 2: LinkedIn OAuth (2 days)**
- API routes: authorize, callback, disconnect, status
- OAuth flow with token storage
- Organization URN fetch and storage

**Phase 3: Distribution UI (3 days)**
- Main hub page with 4 tabs
- HubDataTable for distributions
- NewDistributionModal for scheduling
- DistributionSettingsWidget for connection status

**Phase 4: Background Worker (2 days)**
- Vercel Cron job at `/api/cron/distribution`
- LinkedIn posting logic
- Error handling and retry tracking

**Phase 5: Attribution Integration (1 day)**
- Middleware enhancement for `?d=` param
- Distribution ID cookie tracking
- Event tracking with distribution metadata

**Phase 6: Orchestrator Update (1 day)**
- Distribution source filter
- New KPI card for LinkedIn performance

**Phase 7: Testing & Launch (2 days)**
- End-to-end validation
- Error scenarios testing
- Admin access verification

### Success Metrics (30 Days Post-Launch)

**Must Achieve**:
- ✅ 20+ distributions sent (LinkedIn posts published)
- ✅ 200+ clicks from LinkedIn to blog
- ✅ 2+ bookings attributed to distributions
- ✅ £100+ revenue from distributed posts

**If Achieved**: Validate distribution is worth scaling → Consider Twitter (Phase 5)
**If NOT Achieved**: Investigate post reach, adjust frequency/content

---

## Future Phases (4-7)

### Phase 4: Referral Integration

**Purpose**: Turn blog content into viral acquisition channel by tracking referral-sourced conversions.

**Core Feature**: Social share with referral codes
```typescript
<ReferralShareButton
  article={article}
  platform="twitter" | "linkedin" | "facebook" | "copy"
/>
```

**Generated URL**: `/blog/[slug]?ref=[user_referral_code]`

**Attribution Flow**:
1. User A shares article with ref code
2. User B clicks link → referral cookie set
3. User B signs up → referral created → `source_blog_article_id` populated
4. User B books → dual-write event + referral revenue tracked

**Success Metrics**:
- Primary: Referred signups from blog (target: 10/month)
- Secondary: Referral → booking conversion (target: 5%)
- Tertiary: Revenue from referred users (target: £500/month)

**Trigger to Move**: Dashboard live, 3-5 high-signal articles identified, want to amplify via sharing

### Phase 5: Cross-Linking & SEO Amplification

**Purpose**: Bidirectional linking between blog and marketplace to amplify SEO.

**Components**:
- `RelatedArticlesWidget.tsx` on listing pages
- `RelatedMarketplaceWidget.tsx` on blog pages
- `/admin/blog/cross-links` curation tool

**Success Metrics**:
- Primary: Click-through rate on cross-links (target: 2%)
- Secondary: Cross-link → booking conversion (target: 1%)
- Tertiary: SEO internal linking score (target: 80/100)

**Trigger to Move**: Referral sharing working (>10 shares/week), want bidirectional traffic

### Phase 6: Attribution Model Selection

**Purpose**: Choose attribution model based on observed business patterns from Phase 3.

**Models Available**:
- First-Touch Attribution
- Last-Touch Attribution (default)
- Linear Attribution
- Time-Decay Attribution

**Implementation**: Dashboard toggle, side-by-side comparison, model lock-in

**Success Metrics**:
- Primary: Model stability (no changes for 6 months)
- Secondary: Team confidence in reports (>80% trust)
- Tertiary: Report consistency (same question = same answer)

**Trigger to Move**: 3-6 months of attribution data, clear patterns observed, team debates model choice

### Phase 7: A/B Testing & Optimization

**Purpose**: Experiment with content placement, embed types, CTAs to maximize conversions.

**Experiment Types**:
- Embed placement (top vs bottom)
- Embed type (carousel vs grid vs single card)
- CTA copy variations
- Article length impact

**Workflow**: Define experiment → Random assignment → Track performance → Declare winner → Roll out

**Success Metrics**:
- Primary: Experiments with declared winners (target: 2/quarter)
- Secondary: Conversion rate improvement (target: +15% vs baseline)
- Tertiary: Experimentation velocity (target: 1 new test/month)

**Trigger to Move**: Attribution model stable, sufficient traffic (>1000 views/article/month), hypotheses to test

---

## Implementation Status

### ✅ Complete (Phase 1-3)

**Database** (Original Implementation):
- ✅ Migration 174: Blog tables (articles, categories, authors)
- ✅ Migration 175: SEO analytics tables (blog_article_metrics - deprecated)
- ✅ Migration 179: Attribution events table (blog_attribution_events - deprecated)
- ✅ Migration 180: Blog listing links metadata (blog_listing_links - deprecated)
- ✅ Migration 181: Privacy controls for article saves (blog_article_saves - deprecated)
- ✅ Migration 182: Blog orchestrator RPCs (will be updated in Week 3)

**Database** (Strategic Migration - NEW):
- ✅ Migration 183: Migrate to signal_events (with signal_id column + backward-compatible views)
- ✅ Migration 184: Migrate to signal_metrics (content_type extensibility)
- ✅ Migration 185: Migrate to signal_content_embeds (generic embed tracking)
- ✅ Migration 186: Migrate to signal_content_saves (multi-content-type saves)
- ⏳ Week 2: Update application code to use signal_* tables
- ⏳ Week 3: Update RPCs and dashboard to leverage signal_id
- ⏳ Week 4: Cutover and cleanup (drop views, remove backup tables)

**SEO Infrastructure**:
- ✅ Dynamic sitemaps
- ✅ Structured data (JSON-LD)
- ✅ OpenGraph & Twitter Cards
- ✅ Robots.txt
- ✅ GoogleAnalytics component
- ✅ SEO admin dashboard

**Signal Detection Infrastructure** (Phase 1-3):
- ✅ Event tracking system (`blog_attribution_events`)
- ✅ Session tracking (30-day cookies)
- ✅ Embed instance IDs (stable hash-based)
- ✅ Dual-write pattern (events + cache)
- ✅ MDX embed components (TutorEmbed, ListingGrid, TutorCarousel)
- ✅ SaveArticleButton with wiselist integration
- ✅ Revenue Signal Analytics dashboard (4 tabs)

**Admin UI**:
- ✅ `/admin/blog` - Content management (articles CRUD)
- ✅ `/admin/blog/seo` - SEO optimization & monitoring
- ✅ `/admin/blog/orchestrator` - Signal Analytics (will redirect to `/admin/signal`)

### ⬜ Pending (Manual Setup)

**SEO**:
- ⬜ Set up Google Analytics 4
- ⬜ Set up Google Search Console
- ⬜ Submit sitemaps to GSC
- ⬜ Set up PageSpeed Insights API (optional)
- ⬜ Configure Ahrefs/SEMrush (optional)

### ❄️ Frozen (Signal Amplification - Distribution v1)

**Specification frozen, ready for implementation** (2.5 weeks):
- ⬜ Database schema (`signal_distributions`, `signal_social_accounts` - NEW signal_ prefix)
- ⬜ LinkedIn OAuth flow (`/api/admin/signal/distribution/linkedin/*`)
- ⬜ Signal Amplification UI (`/admin/signal/distribution` - 4 tabs)
- ⬜ Background worker (Vercel Cron at `/api/admin/signal/cron/distribution`)
- ⬜ Attribution integration (middleware with `?d=` param)
- ⬜ Signal Analytics enhancement (distribution source filter)
- ⬜ Route migration (`/admin/blog/orchestrator` → `/admin/signal` redirect)

### ⏳ Planned (Phases 4-7)

**Phase 4**: Referral Integration (2 weeks)
**Phase 5**: Cross-Linking (3 weeks)
**Phase 6**: Attribution Models (1 week)
**Phase 7**: A/B Testing (4 weeks)

---

## Technical Reference

### File Locations

#### Database Migrations
```
tools/database/migrations/
├── 174_create_blog_tables.sql
├── 175_create_blog_seo_analytics_tables.sql (deprecated - see 184)
├── 179_create_blog_attribution_events.sql (deprecated - see 183)
├── 180_update_blog_listing_links_metadata.sql (deprecated - see 185)
├── 181_add_visibility_to_blog_article_saves.sql (deprecated - see 186)
├── 182_create_blog_orchestrator_rpcs.sql
├── 183_migrate_to_signal_events.sql ✨ NEW - Zero-downtime migration
├── 184_migrate_to_signal_metrics.sql ✨ NEW - Content-type extensibility
├── 185_migrate_to_signal_content_embeds.sql ✨ NEW - Generic embed tracking
└── 186_migrate_to_signal_content_saves.sql ✨ NEW - Multi-content saves
```

**Migration Documentation**:
- See [SIGNAL-MIGRATION-PLAN.md](./SIGNAL-MIGRATION-PLAN.md) for complete 4-week migration strategy
- Migrations 183-186 use PostgreSQL views for backward compatibility
- All existing code continues to work during transition (no breaking changes)

#### Utilities
```
apps/web/src/lib/utils/
├── sessionTracking.ts
└── embedInstanceId.ts
```

#### Components
```
apps/web/src/app/components/
├── analytics/
│   └── GoogleAnalytics.tsx
├── blog/
│   ├── ArticleStructuredData.tsx
│   ├── SaveArticleButton.tsx
│   └── embeds/
│       ├── TutorEmbed.tsx
│       ├── ListingGrid.tsx
│       ├── TutorCarousel.tsx
│       └── useBlogAttribution.ts
└── ui/feedback/
    └── ShareModal.tsx
```

#### Admin Pages

**Content Management** (`/admin/blog/*`):
```
apps/web/src/app/(admin)/admin/blog/
├── page.tsx                      # All articles table (CRUD)
├── new/page.tsx                  # Create/edit article
└── seo/page.tsx                  # SEO optimization & monitoring
```

**Revenue Signal** (`/admin/signal/*` - NEW for Distribution v1):
```
apps/web/src/app/(admin)/admin/signal/
├── page.tsx                      # Signal Analytics dashboard (Phase 3)
├── distribution/
│   ├── page.tsx                  # Distribution hub (LinkedIn posting)
│   ├── components/
│   │   ├── DistributionTable.tsx
│   │   ├── NewDistributionModal.tsx
│   │   └── DistributionSettingsWidget.tsx
│   └── page.module.css
└── page.module.css
```

**Legacy (redirect to Signal)**:
```
apps/web/src/app/(admin)/admin/blog/
└── orchestrator/page.tsx         # → Redirects to /admin/signal
```

#### API Routes

**Public API** (blog content & attribution):
```
apps/web/src/app/api/blog/
├── articles/route.ts                               # Published articles
├── articles/[slug]/route.ts                        # Single article
├── attribution/route.ts                            # Dual-write for conversions
├── attribution/events/route.ts                     # Event recording
└── saves/route.ts                                  # Article saves with dual-write
```

**Admin API - Revenue Signal** (NEW for Distribution v1):
```
apps/web/src/app/api/admin/signal/
├── analytics/route.ts                              # Dashboard stats (performance + funnel)
├── articles/route.ts                               # Top articles sorted by revenue
├── listings/route.ts                               # Blog-assisted listings with uplift
├── distribution/
│   ├── route.ts                                    # List distributions
│   ├── [id]/route.ts                               # Get/update/delete distribution
│   ├── linkedin/
│   │   ├── authorize/route.ts                      # OAuth flow start
│   │   ├── callback/route.ts                       # OAuth callback
│   │   ├── disconnect/route.ts                     # Revoke OAuth
│   │   └── status/route.ts                         # Connection status
│   └── schedule/route.ts                           # Create scheduled distribution
└── cron/
    └── distribution/route.ts                       # Background worker (Vercel Cron)
```

**Legacy API** (redirect to Signal):
```
apps/web/src/app/api/admin/blog/orchestrator/
├── stats/route.ts                                  # → /admin/signal/analytics
├── top-articles/route.ts                           # → /admin/signal/articles
└── listings/route.ts                               # → /admin/signal/listings
```

#### Public Pages
```
apps/web/src/app/blog/
├── page.tsx                      # Blog landing page
├── [slug]/page.tsx               # Individual article page
├── category/[category]/page.tsx  # Category page
├── sitemap.ts                    # Dynamic sitemap
└── robots.ts                     # Robots.txt
```

### Environment Variables

**Required**:
```bash
# Database
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Optional (SEO)**:
```bash
# Google Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# PageSpeed Insights
PAGESPEED_API_KEY=your_api_key

# Backlink Monitoring
AHREFS_API_KEY=your_api_key
# OR
SEMRUSH_API_KEY=your_api_key
```

**Future (Distribution)**:
```bash
# LinkedIn OAuth
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=https://tutorwise.io/api/admin/blog/distribution/oauth/linkedin/callback

# Vercel Cron Security
CRON_SECRET=your_secret_key
```

---

## Monitoring & Operations

### Daily Monitoring Tasks

| Task | Frequency | Dashboard/Tool |
|------|-----------|----------------|
| Page views & top articles | Daily | Google Analytics |
| Signal-attributed bookings | Daily | `/admin/signal` |
| Distribution post status | Daily | `/admin/signal/distribution` (future) |

### Weekly Monitoring Tasks

| Task | Frequency | Dashboard/Tool |
|------|-----------|----------------|
| Keyword rankings | Weekly | Google Search Console |
| CTR & search position | Weekly | Google Search Console |
| Conversion funnel | Weekly | `/admin/signal` |
| Failed distributions | Weekly | `/admin/signal/distribution` (future) |

### Monthly Monitoring Tasks

| Task | Frequency | Dashboard/Tool |
|------|-----------|----------------|
| Content freshness (6+ months) | Monthly | Custom query |
| Backlinks monitoring | Monthly | Ahrefs/SEMrush (optional) |
| Page speed (Core Web Vitals) | Monthly | PageSpeed Insights |
| Revenue per article | Monthly | `/admin/signal` |

### Quarterly Monitoring Tasks

| Task | Frequency | Dashboard/Tool |
|------|-----------|----------------|
| Competitor analysis | Quarterly | Ahrefs/SEMrush (optional) |
| Attribution model review | Quarterly | Phase 6 (future) |
| Experiment results | Quarterly | Phase 7 (future) |

### Key Alerts to Set Up

**High Priority**:
- ⚠️ Signal-attributed bookings drop >50% week-over-week
- ⚠️ Google Search Console crawl errors detected
- ⚠️ Signal distribution worker failing (>10 failures) (future)

**Medium Priority**:
- ⚠️ Article views drop >30% week-over-week
- ⚠️ Conversion rate drop >20%
- ⚠️ LinkedIn OAuth token expired (future)

**Low Priority**:
- ℹ️ New high-authority backlink discovered
- ℹ️ Article enters top 3 for target keyword
- ℹ️ Distribution milestone (100 posts sent) (future)

### Reporting Cadence

**Weekly Reports** (Automated Email):
- Top 5 articles by revenue
- Signal-attributed bookings
- Conversion rate trends
- Signal amplification performance (future)

**Monthly Reports** (Dashboard Export):
- Month-over-month growth (views, bookings, revenue)
- Top performing categories
- Funnel conversion rates
- SEO keyword improvements

**Quarterly Reports** (Leadership Presentation):
- Strategic metrics (ROI, lifetime value)
- Content effectiveness analysis
- Attribution insights
- Optimization recommendations

---

## Decision Framework

### When to Move Between Phases

**Phase 3 → Distribution v1**:
- ✅ Phase 3 dashboard live and used weekly
- ✅ 3-5 high-signal articles identified
- ✅ Want active distribution to LinkedIn
- ✅ LinkedIn approval obtained

**Distribution v1 → Phase 4**:
- ✅ Distribution working (20+ posts/month)
- ✅ Seeing blog → booking conversions
- ✅ Want to amplify via user referrals

**Phase 4 → Phase 5**:
- ✅ Referral sharing working (>10 shares/week)
- ✅ Referred users converting to bookings
- ✅ Want bidirectional blog ↔ marketplace traffic

**Phase 5 → Phase 6**:
- ✅ 3-6 months of attribution data
- ✅ Clear patterns observed (e.g., "80% convert within 3 days")
- ✅ Team debates attribution model choice

**Phase 6 → Phase 7**:
- ✅ Attribution model stable and trusted
- ✅ Hypotheses to test (e.g., "Bottom embeds convert better")
- ✅ Sufficient traffic (>1000 views/article/month)

---

## Anti-Patterns to Avoid

### 1. Skipping Phase 3 Observation Period
**Symptom**: Rushing to A/B tests before understanding baseline
**Consequence**: Testing random variations without strategy
**Fix**: Force 3-month observation period (Phase 3) before optimization (Phase 7)

### 2. Over-Indexing on Vanity Metrics
**Symptom**: Celebrating "10,000 views!" without checking bookings
**Consequence**: Content strategy optimizes for traffic, not revenue
**Fix**: Phase 3 dashboard shows revenue first, views second

### 3. Hard-Coding Attribution Window
**Symptom**: Baking 7-day assumption into SQL
**Consequence**: Inflexible system, requires migration to change
**Fix**: Explicit `p_attribution_window_days` parameter in every RPC

### 4. Privacy Violations
**Symptom**: Exposing reading history on public wiselists by default
**Consequence**: User trust erosion, potential GDPR violations
**Fix**: Privacy-first design with opt-in sharing (`visibility` column)

### 5. Distribution Feature Creep
**Symptom**: Adding Twitter, analytics API, auto-retry in v1
**Consequence**: Delayed launch, complex system, maintenance burden
**Fix**: Frozen Distribution v1 spec - LinkedIn only, manual scheduling

### 6. Attribution Model Thrashing
**Symptom**: Switching models every week based on latest data
**Consequence**: Reports become incomparable, team loses trust
**Fix**: Lock model for 6 months after selection (Phase 6)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-15 | Initial SEO implementation |
| 1.1 | 2026-01-16 | Added Phase 1-3 attribution tracking |
| 1.2 | 2026-01-16 | Phase 3 dashboard implemented |
| 1.3 | 2026-01-17 | Distribution spec frozen (v1) |
| 2.0 | 2026-01-17 | Consolidated all docs into single spec |
| **3.0** | **2026-01-17** | **Renamed to "Revenue Signal" with hybrid naming strategy** |

---

## Related Documentation

**Now Archived** (content merged into this document):
- `1-SEO/BLOG-SEO-MONITORING-GUIDE.md`
- `1-SEO/MANUAL-SEO-SETUP-TASKS.md`
- `1-SEO/SEO-IMPLEMENTATION-SUMMARY.md`
- `2-BLOG/BLOG-DEMAND-ENGINE.md`
- `2-BLOG/DISTRIBUTION-GAP-ANALYSIS.md`
- `2-BLOG/DISTRIBUTION-SPEC-V1.md`

**Core Context Files**:
- [.ai/1-ROADMAP.md](../.ai/1-ROADMAP.md) - Product roadmap
- [.ai/2-PLATFORM-SPECIFICATION.md](../.ai/2-PLATFORM-SPECIFICATION.md) - System architecture
- [.ai/3-SYSTEM-NAVIGATION.md](../.ai/3-SYSTEM-NAVIGATION.md) - File locations

---

**Status**: Phase 1-3 Complete (Signal Detection) ✅, Distribution v1 Frozen (Signal Amplification) ❄️, Phases 4-7 Planned (Signal Optimization) ⏳
**Next Action**: Implement Signal Amplification v1 (12 days) OR wait for 3 months Signal Analytics data
**Owner**: Product Lead + Engineering Lead
**Last Updated**: 2026-01-17
**Renamed to**: Revenue Signal (v3.0) - Strategic positioning as business intelligence, not marketing automation
