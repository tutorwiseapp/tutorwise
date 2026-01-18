# Signal Platform Migration Plan

**Purpose**: Migrate from `blog_*` naming to `signal_*` naming to establish TutorWise as a content-to-revenue platform, not just a blog tool
**Strategy**: Zero-downtime migration using views for backward compatibility
**Duration**: 4 weeks (with buffer)
**Risk Level**: Low (views prevent breakage, gradual rollout)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Strategic Rationale](#strategic-rationale)
3. [Migration Scope](#migration-scope)
4. [Zero-Downtime Strategy](#zero-downtime-strategy)
5. [Week-by-Week Plan](#week-by-week-plan)
6. [File Audit](#file-audit)
7. [Rollback Plan](#rollback-plan)
8. [Verification Checklist](#verification-checklist)

---

## Executive Summary

### What We're Migrating

| Current Table | New Table | Reason |
|---------------|-----------|--------|
| `blog_attribution_events` | `signal_events` | Platform core (content-agnostic) |
| `blog_article_metrics` | `signal_metrics` | Platform core (content-agnostic) |
| `blog_listing_links` | `signal_content_embeds` | Platform core (content-agnostic) |
| `blog_article_saves` | `signal_content_saves` | Platform core (content-agnostic) |

### What We're Keeping

| Table | Status | Reason |
|-------|--------|--------|
| `blog_articles` | ✅ Keep | Content-type specific (blogs ARE articles) |
| `blog_categories` | ✅ Keep | Blog structure (not reusable for podcasts/videos) |
| `blog_authors` | ✅ Keep | Blog authorship (specific to articles) |
| `blog_seo_keywords` | ✅ Keep | SEO-specific (not part of signal platform) |

### Key Addition

**`signal_id` column** added to `signal_events` table:
- Unique identifier for each user journey
- Links all events in a conversion path
- Enables deterministic multi-touch attribution
- Foundation for Datadog-style trace visualization

---

## Strategic Rationale

### The Platform Play

**Current Position**: "Blog ROI Tracker"
- Market: Niche (tutoring blogs)
- Valuation: 5-10x revenue
- Expansion: Limited to blog features

**Target Position**: "Revenue Signal Platform"
- Market: Broad (content ROI across all formats)
- Valuation: 15-20x revenue
- Expansion: Blogs → Podcasts → Videos → Webinars

### Why Rename Now

**Migration Cost Over Time**:
```
Today (Phase 3 complete):      9 days
After Distribution v1:        15 days (+67% increase)
After Phase 4-7:             25+ days (+178% increase)
After 1 year:                40+ days (+344% increase)
```

**ROI Calculation**:
- Migration cost: 9 days (one-time)
- Avoided cost: ~18 days/year (confusion, fragmentation, complex queries)
- Break-even: 6 months
- 5-year savings: **81 days** (4 months of engineering time)

### The Datadog Parallel

Datadog didn't call it:
- ❌ `apm_ruby_events` → requires new table for each language
- ✅ `traces` → generic, extensible to all languages

TutorWise shouldn't call it:
- ❌ `blog_attribution_events` → requires new table for each content type
- ✅ `signal_events` → generic, extensible to all content types

---

## Migration Scope

### Phase 1: Core Tables (Week 1)

**Table: `blog_attribution_events` → `signal_events`**

**Changes**:
1. Rename table
2. Add `signal_id UUID` column (nullable initially)
3. Add index on `signal_id`
4. Create backward-compatible view

**New Schema**:
```sql
CREATE TABLE signal_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- NEW: Signal ID for journey tracking
  signal_id UUID,  -- Links all events in a user journey

  -- Source Context (renamed from blog_article_id)
  content_id UUID NOT NULL,  -- Generic: article, episode, video
  content_type TEXT NOT NULL DEFAULT 'article', -- 'article', 'podcast', 'video'

  -- User Identity
  user_id UUID REFERENCES profiles(id),
  session_id TEXT,

  -- Event Target
  target_type TEXT NOT NULL CHECK (target_type IN (
    'article', 'tutor', 'listing', 'booking',
    'referral', 'wiselist_item'
  )),
  target_id UUID NOT NULL,

  -- Event Classification
  event_type TEXT NOT NULL CHECK (event_type IN (
    'impression', 'click', 'save', 'refer', 'convert'
  )),

  -- Interaction Surface
  source_component TEXT NOT NULL CHECK (source_component IN (
    'listing_grid', 'tutor_embed', 'tutor_carousel',
    'cta_button', 'inline_link', 'floating_save',
    'article_header', 'distribution'  -- NEW
  )),

  -- Additional Context
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

**Backward Compatibility View**:
```sql
CREATE VIEW blog_attribution_events AS
SELECT
  id,
  content_id AS blog_article_id,  -- Map back to old name
  user_id,
  session_id,
  target_type,
  target_id,
  event_type,
  source_component,
  metadata,
  created_at
FROM signal_events
WHERE content_type = 'article';  -- Only show article events
```

---

**Table: `blog_article_metrics` → `signal_metrics`**

**Changes**:
1. Rename table
2. Add `content_type` column (default 'article')
3. Create backward-compatible view

**New Schema**:
```sql
CREATE TABLE signal_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content Reference (generic)
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article',

  -- Date
  date DATE NOT NULL,

  -- Metrics (same as before)
  page_views BIGINT DEFAULT 0,
  unique_visitors BIGINT DEFAULT 0,
  avg_time_on_page INTEGER,
  bounce_rate NUMERIC(5,2),

  -- Traffic Sources
  organic_search BIGINT DEFAULT 0,
  direct_traffic BIGINT DEFAULT 0,
  social_traffic BIGINT DEFAULT 0,

  -- Search Metrics
  search_impressions BIGINT DEFAULT 0,
  search_clicks BIGINT DEFAULT 0,
  avg_search_position NUMERIC(5,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(content_id, content_type, date)
);
```

**Backward Compatibility View**:
```sql
CREATE VIEW blog_article_metrics AS
SELECT
  id,
  content_id AS article_id,
  date,
  page_views,
  unique_visitors,
  avg_time_on_page,
  bounce_rate,
  organic_search,
  direct_traffic,
  social_traffic,
  search_impressions,
  search_clicks,
  avg_search_position,
  created_at,
  updated_at
FROM signal_metrics
WHERE content_type = 'article';
```

---

**Table: `blog_listing_links` → `signal_content_embeds`**

**New Schema**:
```sql
CREATE TABLE signal_content_embeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content Reference (generic)
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article',

  -- Embed Target
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,

  -- Embed Details
  position_in_content INTEGER,
  embed_instance_id TEXT,  -- Stable hash for A/B testing

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(content_id, listing_id, position_in_content)
);
```

---

**Table: `blog_article_saves` → `signal_content_saves`**

**New Schema**:
```sql
CREATE TABLE signal_content_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Content Reference (generic)
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article',

  -- User & Wiselist
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wiselist_id UUID NOT NULL REFERENCES wiselists(id) ON DELETE CASCADE,

  -- Privacy
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN (
    'private', 'inherit_wiselist'
  )),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(content_id, user_id, wiselist_id)
);
```

---

### Phase 2: Distribution Tables (Week 2)

**New Tables** (using `signal_` prefix from day one):

```sql
CREATE TABLE signal_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'article',

  platform TEXT NOT NULL DEFAULT 'linkedin',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'scheduled', 'published', 'failed'
  )),

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

---

## Zero-Downtime Strategy

### The View Pattern

**Key Principle**: Old code reads from views, new code reads from tables.

**Week 1**: Create new tables + views
```sql
-- 1. Create new table
CREATE TABLE signal_events AS
SELECT * FROM blog_attribution_events;

-- 2. Drop old table (scary but safe - we have backup)
ALTER TABLE blog_attribution_events
RENAME TO blog_attribution_events_backup;

-- 3. Create view with old name
CREATE VIEW blog_attribution_events AS
SELECT ... FROM signal_events;

-- 4. All old code continues working (reads via view)
-- 5. New code writes to signal_events directly
```

✅ **Zero downtime**: Views provide seamless transition
✅ **Rollback-safe**: Backup table exists for 30 days
✅ **Gradual migration**: Can update code incrementally

---

## Week-by-Week Plan

### Week 1: Database Layer (Zero Downtime)

**Monday-Tuesday**: Table Creation
- [ ] Create `signal_events` table (copy from `blog_attribution_events`)
- [ ] Add `signal_id` column (nullable)
- [ ] Add `content_type` column (default 'article')
- [ ] Create indexes on `signal_id`, `content_type`
- [ ] Rename `blog_article_id` → `content_id`

**Wednesday**: View Creation
- [ ] Rename `blog_attribution_events` → `blog_attribution_events_backup`
- [ ] Create view `blog_attribution_events` → `signal_events`
- [ ] Verify all queries work via view
- [ ] Run RPC tests (4 functions should work unchanged)

**Thursday**: Metrics Table
- [ ] Create `signal_metrics` table (copy from `blog_article_metrics`)
- [ ] Add `content_type` column (default 'article')
- [ ] Rename `article_id` → `content_id`
- [ ] Create view `blog_article_metrics` → `signal_metrics`

**Friday**: Buffer & Testing
- [ ] Monitor logs for view access patterns
- [ ] Verify dashboard still works
- [ ] Check for any broken queries

---

### Week 2: Application Code (Components)

**Monday-Tuesday**: Session Tracking
- [ ] Update `sessionTracking.ts`:
  - `getOrCreateSessionId()` → `getOrCreateSignalId()`
  - Add distribution-aware logic
- [ ] Add `signal_id` generation to all components:
  - `TutorEmbed.tsx`
  - `ListingGrid.tsx`
  - `TutorCarousel.tsx`
  - `SaveArticleButton.tsx`

**Wednesday-Thursday**: API Routes
- [ ] Update `/api/blog/attribution/events` to:
  - Accept `signal_id` in payload
  - Write to `signal_events` table directly (bypass view)
- [ ] Update `/api/blog/attribution` (dual-write route)
- [ ] Update `/api/blog/saves` (wiselist saves)

**Friday**: Verification
- [ ] Test event creation end-to-end
- [ ] Verify `signal_id` propagates correctly
- [ ] Check dual-write pattern still works

---

### Week 3: Dashboard & RPCs

**Monday-Tuesday**: Update RPCs
- [ ] `get_article_performance_summary`:
  - Read from `signal_events` (not view)
  - Add `signal_id` grouping option
- [ ] `get_conversion_funnel`:
  - Read from `signal_events`
  - Add `signal_id` filtering
- [ ] `get_blog_assisted_listings`:
  - Update to use `signal_events`
- [ ] `get_time_to_conversion_distribution`:
  - Update to use `signal_events`

**Wednesday-Thursday**: Dashboard UI
- [ ] Update dashboard to show `signal_id` in tables
- [ ] Add "Signal Path Viewer" (show events for a given signal_id)
- [ ] Update monitoring alerts to use `signal_events`

**Friday**: Integration Testing
- [ ] End-to-end test: Article view → Embed click → Wiselist save → Booking
- [ ] Verify `signal_id` links all events
- [ ] Check dashboard shows correct attribution

---

### Week 4: Cutover & Cleanup

**Monday**: Final Verification
- [ ] Run all queries against `signal_events` (not views)
- [ ] Compare results: view queries vs direct table queries
- [ ] Fix any discrepancies

**Tuesday**: Drop Views
- [ ] Drop view `blog_attribution_events`
- [ ] Drop view `blog_article_metrics`
- [ ] Update any remaining code to reference `signal_events` directly

**Wednesday**: Documentation Update
- [ ] Update `REVENUE-SIGNAL.md` with new schema
- [ ] Update API docs with `signal_id` parameter
- [ ] Update component usage examples

**Thursday**: Monitoring Setup
- [ ] Set up alerts for `signal_id` NULL values
- [ ] Track signal conversion rates in dashboard
- [ ] Add signal health metrics

**Friday**: Cleanup
- [ ] Drop backup tables (after 30-day safety period)
- [ ] Archive old migration files
- [ ] Celebrate migration complete! 🎉

---

## File Audit

### Files Requiring Updates (17 total)

**Migration Files** (5 files):
1. `tools/database/migrations/179_create_blog_attribution_events.sql` → Create `signal_events` migration
2. `tools/database/migrations/182_create_blog_orchestrator_rpcs.sql` → Update RPCs
3. `tools/database/migrations/175_create_blog_seo_analytics_tables.sql` → Update metrics table
4. `tools/database/migrations/180_update_blog_listing_links_metadata.sql` → Update embeds table
5. `tools/database/migrations/181_add_visibility_to_blog_article_saves.sql` → Update saves table

**Component Files** (5 files):
6. `apps/web/src/app/components/blog/embeds/TutorEmbed.tsx` → Add signal_id
7. `apps/web/src/app/components/blog/embeds/ListingGrid.tsx` → Add signal_id
8. `apps/web/src/app/components/blog/embeds/useBlogAttribution.ts` → Rename to useSignalTracking.ts
9. `apps/web/src/lib/utils/sessionTracking.ts` → Add getOrCreateSignalId()
10. `apps/web/src/app/api/blog/saves/route.ts` → Update to signal_content_saves

**API Routes** (3 files):
11. `apps/web/src/app/api/blog/attribution/route.ts` → Update to signal_events
12. `apps/web/src/app/api/blog/attribution/events/route.ts` → Update to signal_events
13. `apps/web/src/app/api/blog/listing-links/route.ts` → Update to signal_content_embeds

**Utility Files** (2 files):
14. `apps/web/src/lib/api/wiselists.ts` → Update references
15. `apps/web/src/lib/utils/embedInstanceId.ts` → Add signal_id support

**Documentation** (2 files):
16. `REVENUE-SIGNAL.md` → Update with new schema
17. `.ai/2-PLATFORM-SPECIFICATION.md` → Update architecture diagrams

---

## Rollback Plan

### If Issues Discovered in Week 1-2

**Immediate Rollback** (5 minutes):
```sql
-- 1. Drop views
DROP VIEW blog_attribution_events;
DROP VIEW blog_article_metrics;

-- 2. Restore original tables
ALTER TABLE blog_attribution_events_backup
RENAME TO blog_attribution_events;

ALTER TABLE blog_article_metrics_backup
RENAME TO blog_article_metrics;

-- 3. Drop new tables
DROP TABLE signal_events;
DROP TABLE signal_metrics;
```

✅ **System restored to pre-migration state**
✅ **Zero data loss** (backup tables untouched)

---

### If Issues Discovered in Week 3-4

**Partial Rollback** (Component-level):
- Revert individual component changes (git revert)
- Keep new tables, restore view access
- Continue using views until issues resolved

---

## Verification Checklist

### Week 1 Verification

Database Layer:
- [ ] `signal_events` table created successfully
- [ ] `signal_id` column added with index
- [ ] View `blog_attribution_events` returns correct data
- [ ] All 4 RPCs execute without errors
- [ ] Dashboard loads (may show stale data)

### Week 2 Verification

Application Code:
- [ ] Components generate `signal_id` correctly
- [ ] Events written to `signal_events` table
- [ ] `signal_id` persists across session
- [ ] Distribution-aware signal_id works (test with `?d=` param)

### Week 3 Verification

Dashboard & RPCs:
- [ ] RPCs return data from `signal_events` table
- [ ] Dashboard shows signal_id in UI
- [ ] Signal Path Viewer displays event sequences
- [ ] Multi-touch attribution works correctly

### Week 4 Verification

Production Readiness:
- [ ] All views dropped (no longer needed)
- [ ] All code references `signal_events` directly
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Team trained on new terminology

---

## Success Metrics

**Week 1**: Zero downtime, all existing queries work
**Week 2**: 100% of events include signal_id
**Week 3**: Dashboard shows signal-based attribution
**Week 4**: Migration complete, views dropped

**Long-term** (3 months post-migration):
- Signal conversion rates tracked in dashboard
- Podcast tracking ready to implement (uses same tables)
- Team refers to "Signal" (not "Blog Attribution")
- Investor pitch updated: "Revenue Signal Platform"

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| View performance slower than direct table | Low | Medium | Monitor query times, optimize if needed |
| signal_id NULL values | Medium | Low | Dashboard alerts, component testing |
| RPC migration breaks dashboard | Low | High | Test RPCs before deploying UI changes |
| Forgotten references to old tables | Medium | Low | Comprehensive grep audit before cutover |

---

## Communication Plan

**Week 0 (Pre-Migration)**:
- Email team: "Signal Platform Migration - What to Expect"
- Share this document
- Q&A session

**Week 1**:
- Daily standups: "Migration Day X - Database Layer"
- Slack updates: Query performance, issues encountered

**Week 2-3**:
- Weekly update: "Migration Progress - Application Layer"
- Demo session: Show signal_id in action

**Week 4**:
- Final email: "Migration Complete - Signal Platform Live"
- Team training: New terminology, dashboard features

---

## Next Steps

1. **Review this plan** with team
2. **Approve migration** (go/no-go decision)
3. **Schedule Week 1** start date
4. **Create backup** of production database
5. **Begin Week 1** migration

**Recommended Start Date**: Monday, [INSERT DATE]
**Estimated Completion**: Friday, 4 weeks later

---

**Status**: ⏳ Ready for Approval
**Owner**: Engineering Lead
**Approver**: Product Lead + CTO
**Last Updated**: 2026-01-17
