# Help Centre Implementation Progress

**Date:** 2025-01-19
**Status:** In Progress (Phase 1 Complete)
**Completion:** ~30% (MDX Foundation Complete)

---

## ✅ Completed

### 1. Planning & Design (100%)
- [x] Final specifications agreed (320px + 320px layout)
- [x] Architecture designed (Hybrid: MDX + Supabase)
- [x] Component structure mapped
- [x] 5 essential articles identified

### 2. Dependencies & Configuration (100%)
- [x] MDX packages installed (`@next/mdx`, `@mdx-js/loader`, etc.)
- [x] Next.js configured for MDX support
- [x] Directory structure created

### 3. MDX Components (100%)
- [x] `MDXProvider.tsx` - Component provider
- [x] `CalloutBox.tsx` + CSS - Info/warning/success/error/tip boxes
- [x] `CodeBlock.tsx` + CSS - Syntax-highlighted code with copy button
- [x] `VideoEmbed.tsx` + CSS - YouTube/Vimeo/Loom embed support
- [x] `Tabs.tsx` + CSS - Tabbed content interface

### 4. Database Schema (100%)
- [x] Migration `131_add_help_centre_analytics.sql` created
- [x] Tables: `help_article_views`, `help_article_feedback`, `help_search_queries`
- [x] Materialized views for popular articles and helpfulness scores
- [x] RLS policies configured

### 5. API Layer (100%)
- [x] `/lib/api/help-centre.ts` created
- [x] Functions: `trackArticleView`, `submitArticleFeedback`, `getPopularArticles`, `trackSearchQuery`

---

## ⏳ Remaining Work

### Phase 2: Layout Components (4-5 hours)

#### A. Main Layout
```
📄 /app/help-centre/layout.tsx
📄 /app/components/help-centre/layout/HelpCentreLayout.tsx
📄 /app/components/help-centre/layout/HelpCentreLayout.module.css
```

**Features:**
- 320px left sidebar (sticky)
- Fluid content area (max 800px)
- 320px right sidebar (sticky)
- Mobile responsive (drawer pattern)

#### B. Left Sidebar Navigation (320px)
```
📄 /app/components/help-centre/layout/LeftSidebar.tsx
📄 /app/components/help-centre/layout/LeftSidebar.module.css
```

**Features:**
- Search input
- Audience filter pills (All/Tutors/Students/Agents)
- Category navigation (collapsible)
- Active state highlighting

#### C. Breadcrumbs
```
📄 /app/components/help-centre/layout/Breadcrumbs.tsx
📄 /app/components/help-centre/layout/Breadcrumbs.module.css
```

**Features:**
- Help Centre > Category > Article
- Click to navigate
- Current page highlighted

---

### Phase 3: Right Sidebar Widgets (2-3 hours)

#### A. Popular Articles Widget
```
📄 /app/components/help-centre/widgets/PopularArticlesWidget.tsx
```

**Features:**
- Fetches from Supabase (`getPopularArticles`)
- Shows top 5 articles with view counts
- React Query integration

#### B. Search Widget
```
📄 /app/components/help-centre/widgets/SearchWidget.tsx
```

**Features:**
- Quick search input
- Popular search terms (pills)
- Integration with Pagefind

#### C. Contact Support Widget
```
📄 /app/components/help-centre/widgets/ContactSupportWidget.tsx
```

**Features:**
- Live chat button (Crisp integration)
- Email support link
- Community forum link

#### D. Helpfulness Widget
```
📄 /app/components/help-centre/widgets/HelpfulnessWidget.tsx
```

**Features:**
- "Was this helpful?" Yes/No buttons
- Vote counts display
- Submits to Supabase

---

### Phase 4: Pages & Routing (2-3 hours)

#### A. Landing Page
```
📄 /app/help-centre/page.tsx
```

**Features:**
- Hero with search
- Category cards (6-8 categories)
- Popular articles section
- Getting started CTA

#### B. Category Page
```
📄 /app/help-centre/[category]/page.tsx
```

**Features:**
- List all articles in category
- Filter by audience
- Sort by relevance/date
- Pagination

#### C. Article Page
```
📄 /app/help-centre/[category]/[slug]/page.tsx
```

**Features:**
- MDX rendering
- Table of contents
- Breadcrumbs
- Helpfulness widget
- Related articles
- View tracking

---

### Phase 5: Content & Search (3-4 hours)

#### A. Article Utilities
```
📄 /lib/help-centre/articles.ts
📄 /lib/help-centre/toc.ts
```

**Features:**
- Load article metadata
- Generate table of contents from headings
- Get related articles

#### B. Pagefind Search
```
📄 /lib/help-centre/search.ts
```

**Features:**
- Initialize Pagefind
- Search articles
- Track queries

#### C. 5 Essential Articles (MDX)
```
📄 /content/help-centre/billing/how-to-get-paid.mdx
📄 /content/help-centre/features/create-listing.mdx
📄 /content/help-centre/features/referral-system.mdx
📄 /content/help-centre/features/bookings.mdx
📄 /content/help-centre/billing/stripe-setup.mdx
```

---

### Phase 6: Polish & Testing (1-2 hours)

#### A. Validation Script
```
📄 /scripts/validate-help-articles.js
```

**Features:**
- Check frontmatter completeness
- Validate internal links
- Check for broken images
- Lint MDX syntax

#### B. Article Template
```
📄 /content/help-centre/_template.mdx
```

**Features:**
- Frontmatter template
- Common sections structure
- MDX component examples

#### C. Documentation
```
📄 /docs/help-centre-writing-guide.md
```

**Features:**
- How to write articles
- MDX component usage
- Style guide
- Publishing process

---

## File Tree (Complete)

```
apps/web/
├── src/
│   ├── content/help-centre/
│   │   ├── _template.mdx
│   │   ├── getting-started/
│   │   │   ├── for-tutors.mdx
│   │   │   ├── for-students.mdx
│   │   │   └── for-agents.mdx
│   │   ├── features/
│   │   │   ├── bookings.mdx ✅ PRIORITY
│   │   │   ├── create-listing.mdx ✅ PRIORITY
│   │   │   ├── referral-system.mdx ✅ PRIORITY
│   │   │   ├── payments.mdx
│   │   │   └── listings.mdx
│   │   ├── billing/
│   │   │   ├── how-to-get-paid.mdx ✅ PRIORITY
│   │   │   ├── stripe-setup.mdx ✅ PRIORITY
│   │   │   ├── pricing.mdx
│   │   │   └── refunds.mdx
│   │   ├── account/
│   │   │   ├── profile-setup.mdx
│   │   │   └── security.mdx
│   │   └── troubleshooting/
│   │       └── common-issues.mdx
│   │
│   ├── app/
│   │   ├── help-centre/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx (landing)
│   │   │   ├── page.module.css
│   │   │   ├── [category]/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx
│   │   │
│   │   └── components/help-centre/
│   │       ├── layout/
│   │       │   ├── HelpCentreLayout.tsx
│   │       │   ├── HelpCentreLayout.module.css
│   │       │   ├── LeftSidebar.tsx
│   │       │   ├── LeftSidebar.module.css
│   │       │   ├── Breadcrumbs.tsx
│   │       │   └── Breadcrumbs.module.css
│   │       │
│   │       ├── widgets/
│   │       │   ├── PopularArticlesWidget.tsx
│   │       │   ├── SearchWidget.tsx
│   │       │   ├── ContactSupportWidget.tsx
│   │       │   ├── HelpfulnessWidget.tsx
│   │       │   └── widgets.module.css
│   │       │
│   │       └── mdx/
│   │           ├── MDXProvider.tsx ✅
│   │           ├── CalloutBox.tsx ✅
│   │           ├── CalloutBox.module.css ✅
│   │           ├── CodeBlock.tsx ✅
│   │           ├── CodeBlock.module.css ✅
│   │           ├── VideoEmbed.tsx ✅
│   │           ├── VideoEmbed.module.css ✅
│   │           ├── Tabs.tsx ✅
│   │           └── Tabs.module.css ✅
│   │
│   └── lib/
│       ├── api/
│       │   └── help-centre.ts ✅
│       └── help-centre/
│           ├── articles.ts
│           ├── search.ts
│           └── toc.ts
│
├── apps/api/migrations/
│   └── 131_add_help_centre_analytics.sql ✅
│
├── scripts/
│   └── validate-help-articles.js
│
└── docs/
    ├── help-centre-implementation-plan.md ✅
    ├── help-centre-progress-summary.md ✅
    └── help-centre-writing-guide.md
```

---

## Next Session Recommendation

**Continue with Phase 2: Layout Components**

Start with:
1. `HelpCentreLayout.tsx` (main 3-column layout)
2. `LeftSidebar.tsx` (320px category navigation)
3. `Breadcrumbs.tsx`

Then move to widgets and pages.

---

## Estimated Time Remaining

- Phase 2 (Layout): 4-5 hours
- Phase 3 (Widgets): 2-3 hours
- Phase 4 (Pages): 2-3 hours
- Phase 5 (Content): 3-4 hours
- Phase 6 (Polish): 1-2 hours

**Total**: 12-17 hours remaining (depending on content depth)

---

## Notes

- All MDX components are production-ready
- Database schema is complete and tested
- API layer is implemented with React Query in mind
- Ready to build layout and integrate everything

**Status**: Foundation is solid. Ready for systematic implementation of remaining phases.
