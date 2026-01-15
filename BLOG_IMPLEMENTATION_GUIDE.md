# Tutorwise Blog Implementation Guide

**Status**: Foundation Created (Route structure, layout, CSS)
**Completion**: 30% - Structure ready, needs components and content
**Created**: 2026-01-15

---

## What's Been Created

### ✅ Completed

1. **Directory Structure**:
   ```
   apps/web/src/
   ├── app/blog/
   │   ├── page.tsx          # Blog landing page
   │   ├── page.module.css   # Blog styles (copied from Help Centre)
   │   ├── layout.tsx        # SEO metadata
   │   ├── [slug]/           # Individual article pages
   │   └── category/[category]/  # Category pages
   └── content/blog/
       ├── for-clients/
       ├── for-tutors/
       ├── for-agents/
       ├── education-insights/
       └── company-news/
   ```

2. **Blog Landing Page** (`apps/web/src/app/blog/page.tsx`):
   - Hero section
   - Category cards (5 categories)
   - Featured articles section
   - Latest articles grid
   - Newsletter signup CTA

3. **CSS Styling** (`apps/web/src/app/blog/page.module.css`):
   - Exact copy of Help Centre styles
   - Blog-specific enhancements (category colors, author bylines)
   - Responsive design
   - Newsletter section styling

4. **SEO Metadata** (`apps/web/src/app/blog/layout.tsx`):
   - Title, description, keywords
   - Open Graph tags
   - Twitter cards
   - RSS feed link

---

## Next Steps to Complete

### Step 1: Copy Help Centre Layout Components (30 min)

**Action**: Copy the 3-column layout from Help Centre

```bash
# Copy layout components
cp -r apps/web/src/app/components/help-centre/layout apps/web/src/app/components/blog/

# Rename files
cd apps/web/src/app/components/blog/layout
mv HelpCentreLayout.tsx BlogLayout.tsx
mv HelpCentreLayoutClient.tsx BlogLayoutClient.tsx
mv LeftSidebar.tsx BlogLeftSidebar.tsx
```

**Update in files**:
1. Replace "Help Centre" with "Blog" in all component names
2. Update left sidebar categories to:
   - For Clients
   - For Tutors
   - For Agents
   - Education Insights
   - Company News
3. Update right sidebar widgets to:
   - Popular Articles Widget
   - Newsletter Signup Widget
   - Social Share Widget

### Step 2: Create Individual Article Page (20 min)

**File**: `apps/web/src/app/blog/[slug]/page.tsx`

```typescript
// Copy from: apps/web/src/app/help-centre/[category]/[slug]/page.tsx
// Changes needed:
// 1. Add author byline
// 2. Add publish date
// 3. Add social sharing buttons
// 4. Add "Related Articles" section
// 5. Update metadata for BlogPosting schema
```

### Step 3: Create Category Page (15 min)

**File**: `apps/web/src/app/blog/category/[category]/page.tsx`

```typescript
// Similar to blog landing page but filtered by category
// Shows:
// - Category header with description
// - All articles in that category
// - Pagination (if needed)
```

### Step 4: Create Blog Widgets (30 min)

**Files**: `apps/web/src/app/components/blog/widgets/`

1. **PopularArticlesWidget.tsx**:
   - Shows 5 most-read articles
   - Links to full articles

2. **NewsletterSignupWidget.tsx**:
   - Email input form
   - Submits to Supabase
   - Success/error states

3. **SocialShareWidget.tsx**:
   - Share buttons (Twitter, LinkedIn, Facebook, Copy Link)
   - Share count (optional)

4. **CategoryNavWidget.tsx**:
   - Quick links to all categories
   - Article counts per category

### Step 5: Create 5 Flagship Articles (2 hours)

**Content to create in** `apps/web/src/content/blog/`:

1. **for-clients/how-to-find-perfect-tutor.mdx**:
   - 1,500 words
   - Target keyword: "how to find a tutor"
   - Includes: checklist, CTA to `/tutors`, wiselist example

2. **for-tutors/building-successful-tutoring-business.mdx**:
   - 2,000 words
   - Target: "tutoring business tips"
   - Includes: CTA to create profile, agent referral link

3. **education-insights/uk-tutoring-market-2026.mdx**:
   - 2,500 words
   - Target: "UK tutoring industry"
   - Includes: Stats, graphs, backlink opportunities

4. **for-tutors/how-to-price-tutoring-services.mdx**:
   - 1,200 words
   - Target: "tutoring rates UK"
   - Includes: Pricing calculator, CTA to listings

5. **for-agents/growing-tutoring-agency.mdx**:
   - 1,800 words
   - Target: "tutoring agency growth"
   - Includes: CTA to organisation signup

### Step 6: Add SEO Enhancements (20 min)

1. **Schema.org Markup**:
   - Add BlogPosting schema to article pages
   - Add BreadcrumbList schema
   - Add Author schema

2. **Sitemap**:
   - Add blog routes to `sitemap.xml`
   - Include lastmod dates

3. **RSS Feed**:
   - Create `apps/web/src/app/blog/rss.xml/route.ts`
   - Generate RSS feed from articles

### Step 7: Internal Linking Strategy (15 min)

**Blog → Platform Links**:
- Articles link to relevant hub pages (`/tutors/gcse-maths`)
- Articles link to wiselists (`/w/best-gcse-tutors`)
- CTAs link to signup/onboarding
- Footer links to blog from main site

**Example in article**:
```markdown
Looking for a GCSE Maths tutor? [Browse our vetted tutors](/tutors/gcse-maths)
or check out our [curated list of top-rated GCSE Maths tutors](/w/best-gcse-maths-tutors).
```

---

## File Copy Commands (Quick Setup)

```bash
# 1. Copy layout structure from Help Centre
cp -r apps/web/src/app/components/help-centre/layout apps/web/src/app/components/blog/

# 2. Copy article page structure
cp apps/web/src/app/help-centre/\[category\]/\[slug\]/page.tsx apps/web/src/app/blog/\[slug\]/page.tsx

# 3. Copy widgets structure
mkdir -p apps/web/src/app/components/blog/widgets
cp apps/web/src/app/components/help-centre/widgets/PopularArticlesWidget.tsx apps/web/src/app/components/blog/widgets/

# 4. Update imports in all copied files
# Find and replace:
# - "help-centre" → "blog"
# - "HelpCentre" → "Blog"
# - Article categories → Blog categories
```

---

## Configuration Changes Needed

### 1. Update Main Navigation

**File**: `apps/web/src/app/components/layout/Header.tsx`

Add "Blog" link to main navigation:
```typescript
{ label: 'Blog', href: '/blog' }
```

### 2. Update Footer

**File**: `apps/web/src/app/components/layout/Footer.tsx`

Add blog link:
```html
<Link href="/blog">Blog</Link>
```

### 3. Update Sitemap Generation

**File**: `apps/web/src/app/sitemap.ts`

Add blog routes:
```typescript
// Blog pages
{ url: 'https://tutorwise.com/blog', priority: 0.8 },
...blogArticles.map(article => ({
  url: `https://tutorwise.com/blog/${article.slug}`,
  lastModified: article.date,
  priority: 0.7,
})),
```

---

## Testing Checklist

- [ ] Blog landing page loads (`/blog`)
- [ ] Categories filter works
- [ ] Individual articles load (`/blog/[slug]`)
- [ ] Category pages load (`/blog/category/[category]`)
- [ ] Newsletter signup works
- [ ] Social sharing buttons work
- [ ] Mobile responsive (test 3-column layout collapse)
- [ ] SEO metadata present (view source)
- [ ] Internal links work (blog → platform)
- [ ] RSS feed generates (`/blog/rss.xml`)

---

## Performance Targets

- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Lighthouse SEO Score**: 100/100
- **Core Web Vitals**: All green

---

## Content Marketing Integration

### Hub & Spoke Model

**Blog** (Content Layer):
```
Blog Post: "How to Find a GCSE Maths Tutor"
    ↓ (internal link)
Hub: /tutors/gcse-maths
    ↓ (internal link)
Wiselist: /w/best-gcse-maths-tutors
    ↓ (CTA)
Tutor Profile: /profile/[tutor-id]
```

### Conversion Funnel

1. **Awareness**: Blog article ranks for "how to find a tutor"
2. **Interest**: Article explains benefits, links to hub page
3. **Consideration**: Hub page shows tutors, wiselist suggestions
4. **Action**: User books tutor or signs up

---

## Estimated Time to Complete

| Task | Time |
|------|------|
| Copy layout components | 30 min |
| Create article page | 20 min |
| Create category page | 15 min |
| Create widgets | 30 min |
| Write 5 articles | 2 hours |
| SEO enhancements | 20 min |
| Internal linking | 15 min |
| Testing & fixes | 30 min |
| **Total** | **4.5 hours** |

---

## Launch Checklist

- [ ] All pages created
- [ ] 5 articles published
- [ ] Navigation updated
- [ ] Sitemap updated
- [ ] RSS feed working
- [ ] Newsletter signup tested
- [ ] Social sharing tested
- [ ] Mobile responsive verified
- [ ] SEO metadata verified
- [ ] Internal links checked
- [ ] Analytics tracking added

---

## Post-Launch (Week 1)

1. **Promote initial articles**:
   - Share on social media
   - Email to existing users
   - Submit to Google Search Console

2. **Monitor performance**:
   - Google Analytics (traffic sources)
   - Search Console (impressions, clicks)
   - Newsletter signups

3. **Create content calendar**:
   - 3-4 articles per week
   - Mix of client/tutor/agent content
   - Target high-volume keywords

---

## Quick Reference: Where Everything Lives

```
Blog Structure:
├── /blog                          → Landing page (all articles)
├── /blog/category/for-tutors      → Category filtered view
├── /blog/how-to-find-perfect-tutor → Individual article
└── /blog/rss.xml                  → RSS feed

Components:
├── apps/web/src/app/components/blog/layout/     → 3-column layout
├── apps/web/src/app/components/blog/widgets/    → Right sidebar widgets
└── apps/web/src/content/blog/[category]/        → MDX article content

Styles:
└── apps/web/src/app/blog/page.module.css        → Main blog styles
```

---

**Ready to complete?** Follow steps 1-7 above in order. Total time: ~4.5 hours for full implementation.
