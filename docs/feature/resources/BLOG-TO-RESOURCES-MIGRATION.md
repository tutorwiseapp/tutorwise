# Blog → Resources Migration Plan

**Goal:** Completely rename "Blog" to "Resources" across the entire codebase with zero technical debt
**Created:** 2026-01-18
**Status:** Planning Phase
**Estimated Effort:** 8-12 hours
**Risk Level:** Medium (URL structure changes require careful execution)

---

## Table of Contents

1. [Migration Strategy](#migration-strategy)
2. [Phase-by-Phase Implementation](#phase-by-phase-implementation)
3. [Complete File Audit](#complete-file-audit)
4. [Database Changes](#database-changes)
5. [Frontend Changes](#frontend-changes)
6. [Backend Changes](#backend-changes)
7. [SEO Considerations](#seo-considerations)
8. [Testing Checklist](#testing-checklist)
9. [Rollback Plan](#rollback-plan)

---

## Migration Strategy

### Approach: Incremental with Backward Compatibility

**Key Decision:** Keep `/blog` URLs for 6 months with redirects, then full migration

```
Phase 1: Labels & Internal References (Week 1)
  ↓
Phase 2: Database Schema (Week 1)
  ↓
Phase 3: Component & File Renaming (Week 2)
  ↓
Phase 4: URL Structure + Redirects (Week 2)
  ↓
Phase 5: Cleanup Legacy Code (Month 6)
```

### Why Not "Big Bang" Approach?

❌ **Don't do:**
- Change everything at once
- Break backlinks immediately
- Risk SEO penalty
- No fallback if issues arise

✅ **Do instead:**
- Incremental changes
- Maintain backward compatibility
- Monitor SEO metrics
- Graceful deprecation period

---

## Phase-by-Phase Implementation

### Phase 1: Labels & Internal References (2 hours)

**Goal:** Change user-facing labels while keeping technical names

**Changes:**
- ✅ Navigation labels: "Blog" → "Resources"
- ✅ Page titles: "Blog" → "Resource Centre"
- ✅ Admin sidebar: "Blog" → "Resources"
- ✅ Meta descriptions
- ❌ Keep URLs: `/blog` (for now)
- ❌ Keep database tables: `blog_articles` (for now)
- ❌ Keep API routes: `/api/blog/*` (for now)

**Files to Update:**
```
apps/web/src/app/components/admin/sidebar/AdminSidebar.tsx
apps/web/src/app/components/layout/Header.tsx (if exists)
apps/web/src/app/blog/layout.tsx (metadata)
apps/web/src/app/(admin)/admin/blog/page.tsx (page title)
```

**Testing:**
- ✅ Check all navigation shows "Resources"
- ✅ Verify URLs still work
- ✅ No broken links

---

### Phase 2: Database Schema (3 hours)

**Goal:** Rename database tables and columns

#### 2.1 Create Migration

**File:** `tools/database/migrations/191_rename_blog_to_resources.sql`

```sql
-- Migration 191: Rename Blog to Resources
-- Purpose: Align database schema with "Resources" terminology
-- Created: 2026-01-18

-- Step 1: Rename tables
ALTER TABLE blog_articles RENAME TO resource_articles;
ALTER TABLE blog_categories RENAME TO resource_categories;
ALTER TABLE blog_article_saves RENAME TO resource_article_saves;
ALTER TABLE blog_listing_links RENAME TO resource_listing_links;

-- Step 2: Rename indexes
ALTER INDEX idx_blog_articles_slug RENAME TO idx_resource_articles_slug;
ALTER INDEX idx_blog_articles_category RENAME TO idx_resource_articles_category;
ALTER INDEX idx_blog_articles_published_at RENAME TO idx_resource_articles_published_at;
ALTER INDEX idx_blog_articles_status RENAME TO idx_resource_articles_status;
ALTER INDEX idx_blog_article_saves_user_id RENAME TO idx_resource_article_saves_user_id;
ALTER INDEX idx_blog_article_saves_article_id RENAME TO idx_resource_article_saves_article_id;

-- Step 3: Rename constraints
ALTER TABLE resource_articles
  RENAME CONSTRAINT blog_articles_pkey TO resource_articles_pkey;

ALTER TABLE resource_articles
  RENAME CONSTRAINT blog_articles_slug_key TO resource_articles_slug_key;

ALTER TABLE resource_article_saves
  RENAME CONSTRAINT blog_article_saves_pkey TO resource_article_saves_pkey;

ALTER TABLE resource_article_saves
  RENAME CONSTRAINT blog_article_saves_user_id_fkey TO resource_article_saves_user_id_fkey;

ALTER TABLE resource_article_saves
  RENAME CONSTRAINT blog_article_saves_article_id_fkey TO resource_article_saves_article_id_fkey;

-- Step 4: Update RPC functions
DROP FUNCTION IF EXISTS get_article_performance_summary(INT, INT);
CREATE OR REPLACE FUNCTION get_resource_article_performance_summary(
  p_days INT DEFAULT 30,
  p_attribution_window_days INT DEFAULT 7
)
RETURNS TABLE (
  article_id UUID,
  title TEXT,
  slug TEXT,
  category TEXT,
  published_at TIMESTAMPTZ,
  total_views BIGINT,
  unique_visitors BIGINT,
  total_interactions BIGINT,
  saves BIGINT,
  bookings_attributed BIGINT,
  revenue_attributed NUMERIC,
  avg_time_to_conversion_hours NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ra.id::UUID,
    ra.title::TEXT,
    ra.slug::TEXT,
    ra.category::TEXT,
    ra.published_at::TIMESTAMPTZ,
    -- (rest of query logic stays same, just table names change)
  FROM resource_articles ra
  -- ... rest of query
END;
$$;

-- Step 5: Create backward compatibility views (TEMPORARY - 6 months)
CREATE OR REPLACE VIEW blog_articles AS SELECT * FROM resource_articles;
CREATE OR REPLACE VIEW blog_article_saves AS SELECT * FROM resource_article_saves;
CREATE OR REPLACE VIEW blog_listing_links AS SELECT * FROM resource_listing_links;

COMMENT ON VIEW blog_articles IS 'DEPRECATED: Use resource_articles. This view will be removed in 6 months.';

-- Verification
SELECT
  'Tables renamed successfully' AS status,
  COUNT(*) AS article_count
FROM resource_articles;
```

**Rollback:**
```sql
-- Rollback Migration 191
ALTER TABLE resource_articles RENAME TO blog_articles;
ALTER TABLE resource_categories RENAME TO blog_categories;
-- ... (reverse all changes)
```

#### 2.2 Update All RPC Functions

**Functions to rename:**
1. `get_article_performance_summary` → `get_resource_article_performance_summary`
2. `get_conversion_funnel` → Keep (doesn't reference "blog")
3. `get_blog_assisted_listings` → `get_resource_assisted_listings`
4. `get_signal_journey` → Keep (doesn't reference "blog")
5. `get_attribution_comparison` → Keep (doesn't reference "blog")

**Create aliases (6-month deprecation):**
```sql
-- Backward compatibility wrappers
CREATE OR REPLACE FUNCTION get_article_performance_summary(p_days INT, p_attribution_window_days INT)
RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY SELECT * FROM get_resource_article_performance_summary(p_days, p_attribution_window_days);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_article_performance_summary IS 'DEPRECATED: Use get_resource_article_performance_summary';
```

---

### Phase 3: Component & File Renaming (4 hours)

**Goal:** Rename all frontend components and files

#### 3.1 Component Files

**Rename these files:**

```bash
# Blog components → Resource components
apps/web/src/app/components/blog/
  → apps/web/src/app/components/resources/

mv apps/web/src/app/components/blog apps/web/src/app/components/resources

# Specific files:
BlogLayout.tsx → ResourceLayout.tsx
BlogLayoutClient.tsx → ResourceLayoutClient.tsx
BlogLeftSidebar.tsx → ResourceLeftSidebar.tsx
ArticleCard.tsx → ResourceArticleCard.tsx
SaveArticleButton.tsx → SaveResourceButton.tsx
ArticleStructuredData.tsx → ResourceStructuredData.tsx
```

**Update imports in ALL files:**
```typescript
// OLD
import BlogLayout from '@/app/components/blog/layout/BlogLayout';
import { ArticleCard } from '@/app/components/blog/ArticleCard';

// NEW
import ResourceLayout from '@/app/components/resources/layout/ResourceLayout';
import { ResourceArticleCard } from '@/app/components/resources/ResourceArticleCard';
```

#### 3.2 Admin Components

```bash
apps/web/src/app/(admin)/admin/blog/
  → apps/web/src/app/(admin)/admin/resources/

# Keep URL at /admin/blog for now (Phase 4)
# But rename component files
ArticlesTable.tsx → ResourceArticlesTable.tsx
ArticleEditorForm.tsx → ResourceArticleEditorForm.tsx
```

---

### Phase 4: URL Structure + Redirects (3 hours)

**Goal:** Change URLs with proper SEO redirects

#### 4.1 Update Routes

**Before:**
```
/blog
/blog/[slug]
/blog/category/[category]
/admin/blog
/admin/blog/new
/admin/blog/edit/[slug]
/api/blog/*
```

**After:**
```
/resources
/resources/[slug]
/resources/category/[category]
/admin/resources
/admin/resources/new
/admin/resources/edit/[slug]
/api/resources/*
```

#### 4.2 Create Redirect Middleware

**File:** `apps/web/src/middleware.ts` (add to existing)

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Blog → Resources redirects (301 Permanent)
  if (pathname.startsWith('/blog')) {
    const newPath = pathname.replace('/blog', '/resources');
    return NextResponse.redirect(new URL(newPath, request.url), {
      status: 301, // Permanent redirect (SEO-friendly)
    });
  }

  // Admin blog → resources redirects
  if (pathname.startsWith('/admin/blog')) {
    const newPath = pathname.replace('/admin/blog', '/admin/resources');
    return NextResponse.redirect(new URL(newPath, request.url), {
      status: 301,
    });
  }

  // API blog → resources redirects
  if (pathname.startsWith('/api/blog')) {
    const newPath = pathname.replace('/api/blog', '/api/resources');
    return NextResponse.redirect(new URL(newPath, request.url), {
      status: 301,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/blog/:path*',
    '/admin/blog/:path*',
    '/api/blog/:path*',
  ],
};
```

#### 4.3 Update Sitemap

**File:** `apps/web/src/app/resources/sitemap.ts`

```typescript
// Change from /blog/sitemap.ts
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getPublishedResourceArticles();

  return articles.map((article) => ({
    url: `https://tutorwise.com/resources/${article.slug}`,
    lastModified: article.updated_at,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));
}
```

#### 4.4 Update robots.txt

**File:** `apps/web/public/robots.txt`

```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

# Sitemaps
Sitemap: https://tutorwise.com/sitemap.xml
Sitemap: https://tutorwise.com/resources/sitemap.xml
```

---

### Phase 5: Cleanup Legacy Code (After 6 months)

**Goal:** Remove all deprecated code

```sql
-- Remove backward compatibility views
DROP VIEW IF EXISTS blog_articles;
DROP VIEW IF EXISTS blog_article_saves;
DROP VIEW IF EXISTS blog_listing_links;

-- Remove deprecated functions
DROP FUNCTION IF EXISTS get_article_performance_summary(INT, INT);
DROP FUNCTION IF EXISTS get_blog_assisted_listings(INT, INT);
```

Remove middleware redirects (users have adapted).

---

## Complete File Audit

### Files Requiring Changes

#### Database (7 files)
```
tools/database/migrations/
├── 191_rename_blog_to_resources.sql (NEW)
├── 174_create_blog_articles_table.sql (update comments)
├── 179_create_signal_events.sql (update comments if references blog)
├── 182_create_blog_orchestrator_rpcs.sql (rename RPCs)
├── 187_update_rpcs_for_signal_events.sql (rename RPCs)
├── 189_add_blog_orchestrator_permissions.sql (update permissions)
└── 190_add_signal_rbac_permissions.sql (no changes needed)
```

#### Frontend Components (25+ files)
```
apps/web/src/app/components/resources/ (renamed from blog/)
├── layout/
│   ├── ResourceLayout.tsx
│   ├── ResourceLayoutClient.tsx
│   └── ResourceLeftSidebar.tsx
├── embeds/
│   ├── TutorEmbed.tsx (update imports)
│   ├── ListingGrid.tsx (update imports)
│   └── TutorCarousel.tsx (update imports)
├── widgets/
│   ├── NewsletterWidget.tsx
│   ├── PopularArticlesWidget.tsx (update queries)
│   └── CategoriesWidget.tsx (update queries)
├── ResourceArticleCard.tsx
├── SaveResourceButton.tsx
└── ResourceStructuredData.tsx
```

#### Routes (12+ files)
```
apps/web/src/app/
├── resources/ (renamed from blog/)
│   ├── page.tsx
│   ├── layout.tsx
│   ├── sitemap.ts
│   ├── [slug]/page.tsx
│   └── category/[category]/page.tsx
└── (admin)/admin/resources/ (renamed from blog/)
    ├── page.tsx
    ├── new/page.tsx
    ├── edit/[slug]/page.tsx
    ├── categories/page.tsx
    ├── seo/page.tsx
    └── settings/page.tsx
```

#### API Routes (10+ files)
```
apps/web/src/app/api/resources/ (renamed from blog/)
├── route.ts
├── [slug]/route.ts
├── category/[category]/route.ts
└── search/route.ts
```

#### Admin Signal Routes (5 files)
```
apps/web/src/app/api/admin/signal/
├── stats/route.ts (update table references)
├── top-articles/route.ts (update table references)
├── listings/route.ts (update table references)
├── journey/route.ts (no changes needed)
└── attribution/route.ts (update table references)
```

#### Configuration Files (5 files)
```
apps/web/
├── middleware.ts (add redirects)
├── next.config.js (update if blog-specific config exists)
└── public/robots.txt (update sitemap references)

docs/feature/
├── revenue-signal/REVENUE-SIGNAL.md (find/replace blog → resources)
└── resources/README.md (NEW)
```

---

## Database Changes

### Tables to Rename

| Old Name | New Name | Impact |
|----------|----------|--------|
| `blog_articles` | `resource_articles` | High - referenced everywhere |
| `blog_categories` | `resource_categories` | Medium |
| `blog_article_saves` | `resource_article_saves` | Medium |
| `blog_listing_links` | `resource_listing_links` | Medium |

### Indexes to Rename

```sql
idx_blog_articles_slug → idx_resource_articles_slug
idx_blog_articles_category → idx_resource_articles_category
idx_blog_articles_published_at → idx_resource_articles_published_at
idx_blog_articles_status → idx_resource_articles_status
```

### Functions to Rename

```sql
get_article_performance_summary → get_resource_article_performance_summary
get_blog_assisted_listings → get_resource_assisted_listings
```

### RBAC Permissions

**Current:**
```sql
('admin', 'blog', 'view_analytics')
('admin', 'blog', 'manage_content')
('admin', 'blog', 'export_data')
```

**New (Migration 192):**
```sql
-- Add new permissions
INSERT INTO admin_role_permissions (role, resource, action, description)
VALUES
  ('superadmin', 'resources', '*', 'Full access to resources management'),
  ('admin', 'resources', 'view_analytics', 'View resource analytics'),
  ('admin', 'resources', 'manage_content', 'Manage resource articles'),
  ('admin', 'resources', 'export_data', 'Export resource data');

-- Keep 'blog' permissions for 6 months (backward compatibility)
-- Mark as deprecated
UPDATE admin_role_permissions
SET description = description || ' (DEPRECATED - use resources permissions)'
WHERE resource = 'blog';
```

---

## Frontend Changes

### Navigation Labels

**Admin Sidebar:**
```typescript
// apps/web/src/app/components/admin/sidebar/AdminSidebar.tsx

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/signal', label: 'Signal' },
  {
    href: '/admin/resources', // ← Changed URL
    label: 'Resources',       // ← Changed label
    subItems: [
      { href: '/admin/resources', label: 'All Articles', indent: true },
      { href: '/admin/resources/new', label: 'New Article', indent: true },
      { href: '/admin/resources/seo', label: 'SEO Performance', indent: true },
      { href: '/admin/resources/categories', label: 'Categories', indent: true },
      { href: '/admin/resources/settings', label: 'Settings', indent: true },
    ],
  },
  // ... rest
];
```

**Public Header:**
```typescript
// apps/web/src/app/components/layout/Header.tsx (if exists)

<Link href="/resources">Resources</Link>
```

### Page Titles

```typescript
// apps/web/src/app/resources/layout.tsx

export const metadata: Metadata = {
  title: 'Resource Centre | Tutorwise',
  description: 'Guides, tutorials, and insights to help you succeed on Tutorwise',
  // ...
};
```

### Component Renames

| Old Component | New Component | Reason |
|---------------|---------------|--------|
| `BlogLayout` | `ResourceLayout` | Consistency |
| `ArticleCard` | `ResourceArticleCard` | Clarity |
| `SaveArticleButton` | `SaveResourceButton` | Terminology |

---

## Backend Changes

### API Route Structure

**Before:**
```
/api/blog/[slug]
/api/blog/category/[category]
/api/admin/blog/articles
```

**After:**
```
/api/resources/[slug]
/api/resources/category/[category]
/api/admin/resources/articles
```

### Server Actions

```typescript
// apps/web/src/app/resources/actions.ts (renamed from blog/actions.ts)

export async function getResourceArticles() {
  const supabase = await createClient();

  const { data } = await supabase
    .from('resource_articles') // ← Changed table name
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });

  return data;
}
```

---

## SEO Considerations

### 301 Redirects (Permanent)

```
/blog → /resources (301)
/blog/slug → /resources/slug (301)
/blog/category/x → /resources/category/x (301)
```

**Why 301 not 302?**
- 301 = Permanent (passes SEO juice)
- 302 = Temporary (doesn't pass SEO juice)

### Sitemap Updates

```xml
<!-- Old sitemap -->
<url>
  <loc>https://tutorwise.com/blog/getting-started</loc>
</url>

<!-- New sitemap -->
<url>
  <loc>https://tutorwise.com/resources/getting-started</loc>
</url>
```

### Meta Tag Updates

```html
<!-- Update Open Graph URLs -->
<meta property="og:url" content="https://tutorwise.com/resources/getting-started" />

<!-- Update canonical URLs -->
<link rel="canonical" href="https://tutorwise.com/resources/getting-started" />
```

### Google Search Console

**Manual steps:**
1. Submit new sitemap: `https://tutorwise.com/resources/sitemap.xml`
2. Remove old sitemap: `https://tutorwise.com/blog/sitemap.xml`
3. Monitor 404 errors for broken /blog links
4. Use URL inspection tool to verify new URLs indexed

---

## Testing Checklist

### Automated Tests

```bash
# Create test suite
apps/web/__tests__/resources-migration.test.ts
```

```typescript
describe('Blog → Resources Migration', () => {
  describe('Redirects', () => {
    it('redirects /blog to /resources', async () => {
      const res = await fetch('http://localhost:3000/blog');
      expect(res.redirected).toBe(true);
      expect(res.url).toBe('http://localhost:3000/resources');
      expect(res.status).toBe(200);
    });

    it('redirects /blog/slug to /resources/slug', async () => {
      const res = await fetch('http://localhost:3000/blog/getting-started');
      expect(res.redirected).toBe(true);
      expect(res.url).toBe('http://localhost:3000/resources/getting-started');
    });
  });

  describe('Database', () => {
    it('resource_articles table exists', async () => {
      const { data } = await supabase
        .from('resource_articles')
        .select('count');
      expect(data).toBeDefined();
    });

    it('blog_articles view still works (backward compat)', async () => {
      const { data } = await supabase
        .from('blog_articles')
        .select('count');
      expect(data).toBeDefined();
    });
  });

  describe('API Routes', () => {
    it('/api/resources/slug returns article', async () => {
      const res = await fetch('/api/resources/getting-started');
      expect(res.status).toBe(200);
    });

    it('/api/blog/slug redirects to /api/resources/slug', async () => {
      const res = await fetch('/api/blog/getting-started');
      expect(res.redirected).toBe(true);
    });
  });
});
```

### Manual Testing Checklist

#### Public Site
- [ ] Navigate to `/resources` - should load
- [ ] Navigate to `/blog` - should redirect to `/resources`
- [ ] Click article - URL should be `/resources/[slug]`
- [ ] Check category pages - `/resources/category/for-tutors`
- [ ] Verify meta tags (view source)
- [ ] Check sitemap: `/resources/sitemap.xml`
- [ ] Test search functionality
- [ ] Verify "Save Article" button works
- [ ] Check newsletter widget

#### Admin Dashboard
- [ ] Navigate to `/admin/resources` - should load
- [ ] Navigate to `/admin/blog` - should redirect
- [ ] Create new article - URL should be `/admin/resources/new`
- [ ] Edit existing article
- [ ] View categories management
- [ ] Check SEO dashboard
- [ ] Verify analytics work (Signal dashboard)

#### Database
- [ ] Run migration 191
- [ ] Verify tables renamed
- [ ] Check indexes exist
- [ ] Test RPCs work
- [ ] Verify backward compat views work
- [ ] Check RBAC permissions

#### SEO
- [ ] Submit new sitemap to Google Search Console
- [ ] Monitor 404 errors (should be none)
- [ ] Check canonical URLs correct
- [ ] Verify Open Graph tags updated
- [ ] Test social sharing (Twitter, LinkedIn)

---

## Rollback Plan

### If Migration Fails (Before Going Live)

```bash
# 1. Rollback database
psql "connection_string" -f tools/database/migrations/191_rollback.sql

# 2. Revert code changes
git revert <migration-commit-hash>
git push origin main

# 3. Verify old URLs work
curl -I https://tutorwise.com/blog
# Should return 200 OK
```

### If Issues Discovered (After Going Live)

**Option 1: Quick Fix (Keep Resources, Fix Bug)**
- Fix specific issue
- Keep Resources branding
- Update redirect rules if needed

**Option 2: Full Rollback (Emergency Only)**
```sql
-- Restore old table names
ALTER TABLE resource_articles RENAME TO blog_articles;
-- ... etc

-- Update middleware to redirect resources → blog
-- Deploy hotfix
```

---

## Timeline & Effort Estimate

### Week 1 (Day 1-5)

| Day | Task | Hours | Owner |
|-----|------|-------|-------|
| Mon | Phase 1: Labels & Internal References | 2h | Dev |
| Mon | Create Migration 191 | 2h | Dev |
| Tue | Phase 2: Database Schema Migration | 3h | Dev |
| Tue | Test database changes locally | 1h | Dev |
| Wed | Phase 3: Component Renaming (Part 1) | 4h | Dev |
| Thu | Phase 3: Component Renaming (Part 2) | 4h | Dev |
| Fri | Testing & QA | 4h | QA |

**Total Week 1:** 20 hours

### Week 2 (Day 6-10)

| Day | Task | Hours | Owner |
|-----|------|-------|-------|
| Mon | Phase 4: URL Structure + Redirects | 3h | Dev |
| Mon | Update sitemap & SEO metadata | 2h | Dev |
| Tue | Comprehensive testing (all endpoints) | 4h | QA |
| Wed | Deploy to staging | 1h | DevOps |
| Wed | Staging validation | 3h | QA |
| Thu | Deploy to production | 2h | DevOps |
| Thu | Production smoke tests | 2h | QA |
| Fri | Monitor SEO metrics & fix issues | 3h | Dev |

**Total Week 2:** 20 hours

**Grand Total:** 40 hours (1 week per developer)

---

## Success Criteria

### Technical
- ✅ All `/blog` URLs redirect to `/resources` (301)
- ✅ All database tables renamed
- ✅ All components renamed consistently
- ✅ All tests passing
- ✅ No console errors
- ✅ No 404 errors in production

### SEO
- ✅ New sitemap submitted to Google Search Console
- ✅ No drop in organic traffic (monitor 30 days)
- ✅ Canonical URLs correct
- ✅ Social sharing works (Twitter, LinkedIn, Facebook)
- ✅ Backlinks still resolve (via redirects)

### User Experience
- ✅ Navigation shows "Resources"
- ✅ Old bookmarks still work (redirects)
- ✅ Admin dashboard updated
- ✅ No broken links
- ✅ Save article feature works

---

## Risk Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SEO traffic drop | High | Medium | Use 301 redirects, monitor GSC, 6-month redirect period |
| Broken backlinks | Medium | Low | Permanent redirects catch all old URLs |
| Database migration fails | High | Low | Test thoroughly in staging, have rollback script ready |
| User confusion | Low | Medium | Clear messaging, gradual rollout |
| Code breaks | Medium | Low | Comprehensive test suite, staging environment |

---

## Communication Plan

### Internal Team
- **Dev Team:** Brief on Monday, review plan
- **QA Team:** Provide test checklist
- **Marketing:** Update materials (if "Blog" mentioned)
- **Support:** Update docs, FAQ

### External (Optional)
- **Blog Post:** "We're now the Resource Centre" (if public blog exists)
- **Email:** Notify subscribers (optional)

---

## Post-Migration Monitoring

### Week 1 After Launch
- Monitor Google Search Console daily
- Check Google Analytics (traffic patterns)
- Review server logs (404 errors)
- Monitor Sentry (error tracking)

### Month 1 After Launch
- Weekly SEO metrics review
- Compare traffic: /resources vs historical /blog
- User feedback collection

### Month 6 After Launch
- **Remove backward compatibility code**
- Drop deprecated database views
- Remove redirect middleware (if traffic adapted)
- Clean up legacy documentation

---

## Next Steps

1. **Review Plan:** Team review this document
2. **Get Approval:** Product/Engineering sign-off
3. **Create Branch:** `feature/blog-to-resources-migration`
4. **Start Phase 1:** Labels & Internal References
5. **Proceed Incrementally:** Follow phase-by-phase plan

---

**Status:** ✅ Ready for Implementation
**Last Updated:** 2026-01-18
**Owner:** Engineering Team
**Reviewer:** Product Team

