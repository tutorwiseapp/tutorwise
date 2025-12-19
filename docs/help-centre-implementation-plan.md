# Help Centre - Complete Implementation Plan

**Created:** 2025-01-19
**Status:** Ready for Implementation
**Estimated Time:** 8-12 hours full implementation

---

## Architecture Overview

### **Hybrid Approach**
- **Content:** MDX files in `/src/content/help-centre/`
- **Analytics:** Supabase database (views, feedback, search tracking)
- **Search:** Pagefind (static search index)
- **Layout:** 320px left sidebar + fluid content + 320px right sidebar

---

## File Structure

```
apps/web/
├── src/
│   ├── content/help-centre/          # MDX articles
│   │   ├── getting-started/
│   │   │   ├── for-tutors.mdx
│   │   │   ├── for-students.mdx
│   │   │   └── for-agents.mdx
│   │   ├── features/
│   │   │   ├── bookings.mdx
│   │   │   ├── payments.mdx
│   │   │   ├── referrals.mdx
│   │   │   ├── listings.mdx
│   │   │   └── stripe-setup.mdx
│   │   ├── account/
│   │   │   ├── profile-setup.mdx
│   │   │   └── security.mdx
│   │   ├── billing/
│   │   │   ├── pricing.mdx
│   │   │   └── refunds.mdx
│   │   └── troubleshooting/
│   │       └── common-issues.mdx
│   │
│   ├── app/
│   │   ├── help-centre/
│   │   │   ├── page.tsx                    # Main landing page
│   │   │   ├── page.module.css
│   │   │   ├── [category]/
│   │   │   │   ├── page.tsx                # Category listing
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx            # Article detail
│   │   │   └── layout.tsx                  # Help centre layout
│   │   │
│   │   └── components/help-centre/
│   │       ├── layout/
│   │       │   ├── HelpCentreLayout.tsx    # Main 3-column layout
│   │       │   ├── HelpCentreLayout.module.css
│   │       │   ├── LeftSidebar.tsx         # Category navigation
│   │       │   ├── LeftSidebar.module.css
│   │       │   └── Breadcrumbs.tsx
│   │       │
│   │       ├── widgets/
│   │       │   ├── PopularArticlesWidget.tsx
│   │       │   ├── SearchWidget.tsx
│   │       │   ├── ContactSupportWidget.tsx
│   │       │   ├── CategoriesWidget.tsx
│   │       │   └── HelpfulnessWidget.tsx   # "Was this helpful?"
│   │       │
│   │       └── mdx/
│   │           ├── MDXProvider.tsx
│   │           ├── CalloutBox.tsx
│   │           ├── CalloutBox.module.css
│   │           ├── CodeBlock.tsx
│   │           ├── CodeBlock.module.css
│   │           ├── VideoEmbed.tsx
│   │           ├── VideoEmbed.module.css
│   │           ├── Tabs.tsx
│   │           └── Tabs.module.css
│   │
│   └── lib/
│       ├── api/help-centre.ts              # Supabase API (✅ created)
│       └── help-centre/
│           ├── articles.ts                  # Article metadata loader
│           ├── search.ts                    # Pagefind integration
│           └── toc.ts                       # Table of contents generator
│
├── apps/api/migrations/
│   └── 131_add_help_centre_analytics.sql   # ✅ Created
│
└── scripts/
    └── validate-help-articles.js            # Validation script

```

---

## Component Specifications

### 1. Help Centre Layout (320px + Fluid + 320px)

```typescript
// HelpCentreLayout.tsx
<div className={styles.layout}>
  {/* Left Sidebar - 320px */}
  <aside className={styles.leftSidebar}>
    <SearchInput />
    <AudienceFilter />
    <CategoryNavigation />
  </aside>

  {/* Main Content - Fluid */}
  <main className={styles.mainContent}>
    <Breadcrumbs />
    {children}
  </main>

  {/* Right Sidebar - 320px */}
  <aside className={styles.rightSidebar}>
    <SearchWidget />
    <PopularArticlesWidget />
    <ContactSupportWidget />
    <CategoriesWidget />
  </aside>
</div>
```

**CSS:**
```css
.layout {
  display: flex;
  gap: 2rem;
  max-width: 1480px; /* 320px + 800px + 320px + gaps */
  margin: 0 auto;
  padding: 2rem 1rem;
}

.leftSidebar {
  width: 320px;
  min-width: 320px;
  position: sticky;
  top: 80px;
  height: fit-content;
  flex-shrink: 0;
}

.mainContent {
  flex: 1;
  max-width: 800px;
  min-width: 0;
}

.rightSidebar {
  width: 320px;
  min-width: 320px;
  position: sticky;
  top: 80px;
  height: fit-content;
  flex-shrink: 0;
}

@media (max-width: 1279px) {
  .rightSidebar { display: none; }
  .layout { max-width: 1120px; } /* 320px + 800px */
}

@media (max-width: 1023px) {
  .leftSidebar {
    position: fixed;
    transform: translateX(-100%);
    /* Mobile drawer implementation */
  }
  .layout { max-width: 800px; }
}
```

---

### 2. MDX Components

#### CalloutBox
```mdx
<CalloutBox type="info">
  💡 **Pro Tip**: Book recurring sessions to save time!
</CalloutBox>

<CalloutBox type="warning" title="Important">
  Stripe account required before receiving payments
</CalloutBox>
```

#### CodeBlock
```mdx
<CodeBlock language="typescript">
const booking = await fetch('/api/v1/bookings', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
</CodeBlock>
```

#### VideoEmbed
```mdx
<VideoEmbed
  src="https://youtube.com/watch?v=..."
  title="How to Create Your First Listing"
/>
```

#### Tabs
```mdx
<Tabs>
  <Tab label="For Tutors">
    Instructions for tutors...
  </Tab>
  <Tab label="For Students">
    Instructions for students...
  </Tab>
</Tabs>
```

---

### 3. Widgets

#### Popular Articles Widget
```typescript
const { data: popularArticles } = useQuery({
  queryKey: ['popular-help-articles'],
  queryFn: () => getPopularArticles(5),
  staleTime: 5 * 60 * 1000,
});

// Renders:
// 🔥 Most Helpful
// 1. How to Get Paid (234 views)
// 2. Create a Listing (189 views)
// 3. Referral System (156 views)
```

#### Helpfulness Widget
```typescript
<HelpfulnessWidget
  articleSlug="how-bookings-work"
  onFeedback={(wasHelpful) => {
    submitArticleFeedback(articleSlug, wasHelpful);
    toast.success('Thanks for your feedback!');
  }}
/>

// Renders:
// Was this helpful?
// [👍 Yes (34)] [👎 No (2)]
```

---

## Article Template

```mdx
---
title: "How Bookings Work"
slug: "how-bookings-work"
category: "features"
audience: "all"  # or "tutor", "student", "agent"
description: "Learn how to create and manage bookings on Tutorwise"
keywords: ["bookings", "scheduling", "calendar"]
author: "Tutorwise Team"
lastUpdated: "2025-01-19"
readTime: "5 min"
relatedArticles:
  - "setting-up-payments"
  - "managing-availability"
  - "cancellation-policy"
---

# How Bookings Work

<CalloutBox type="info">
  💡 This guide covers booking basics for both tutors and students
</CalloutBox>

## For Tutors

When a student requests a booking:

1. You'll receive an **email notification**
2. Review the booking details in your [Dashboard](/dashboard)
3. Accept or decline within 24 hours

<VideoEmbed src="https://youtube.com/..." title="Accepting Bookings Demo" />

## For Students

Booking a session is easy:

<Tabs>
  <Tab label="Step 1">
    Find a tutor in the [Marketplace](/marketplace)
  </Tab>
  <Tab label="Step 2">
    Select available time slot
  </Tab>
  <Tab label="Step 3">
    Complete payment securely
  </Tab>
</Tabs>

<CalloutBox type="warning">
  ⚠️ Cancellations within 24 hours may incur fees
</CalloutBox>

## Payment Processing

<CodeBlock language="typescript">
// Example booking API call
const response = await fetch('/api/v1/bookings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tutor_id: "123",
    start_time: "2025-01-20T10:00:00Z",
    duration_minutes: 60
  })
});
</CodeBlock>

## Need Help?

Still have questions? [Contact support](/contact) or browse [related articles](#related).
```

---

## 5 Essential Articles (Top Questions)

### 1. How to Get Paid (`/help-centre/billing/how-to-get-paid`)
- Connecting Stripe account
- Payment timeline
- Withdrawal process
- Fees and commissions

### 2. How to Create a Listing (`/help-centre/features/create-listing`)
- Step-by-step guide
- Pricing strategies
- Writing compelling descriptions
- Adding subjects and levels

### 3. Referral System (`/help-centre/features/referral-system`)
- How referrals work
- Commission structure
- Tracking referrals
- Payment distribution

### 4. How Bookings Work (`/help-centre/features/bookings`)
- Creating bookings (students)
- Accepting bookings (tutors)
- Cancellation policies
- Rescheduling

### 5. Stripe Account Setup (`/help-centre/billing/stripe-setup`)
- Creating Stripe account
- Connecting to Tutorwise
- Verification requirements
- Troubleshooting connection issues

---

## Search Implementation (Pagefind)

```bash
# Install Pagefind
npm install --save-dev pagefind

# Build search index (run after build)
npx pagefind --source ./out --bundle-dir ./public/pagefind
```

```typescript
// Search component
import * as pagefind from 'pagefind';

const search = await pagefind.search(query);
const results = await Promise.all(
  search.results.map(r => r.data())
);

// Results: [{ url, title, excerpt, ... }]
```

---

## Validation Script

```javascript
// scripts/validate-help-articles.js
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const HELP_DIR = './src/content/help-centre';

function validateArticle(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, content: body } = matter(content);

  const errors = [];

  // Required frontmatter fields
  if (!data.title) errors.push('Missing title');
  if (!data.slug) errors.push('Missing slug');
  if (!data.category) errors.push('Missing category');
  if (!data.description) errors.push('Missing description');

  // Validate audience
  const validAudiences = ['all', 'tutor', 'student', 'agent'];
  if (data.audience && !validAudiences.includes(data.audience)) {
    errors.push(`Invalid audience: ${data.audience}`);
  }

  // Check for broken links (basic)
  const internalLinks = body.match(/\[.*?\]\((\/.*?)\)/g) || [];
  // TODO: Validate these links exist

  return { filePath, errors };
}

// Run validation
const articles = /* glob all .mdx files */;
const results = articles.map(validateArticle);
const hasErrors = results.some(r => r.errors.length > 0);

if (hasErrors) {
  console.error('❌ Validation failed');
  process.exit(1);
} else {
  console.log('✅ All articles valid');
}
```

---

## Implementation Phases

### Phase 1: Foundation (4 hours)
- ✅ Supabase migration
- ✅ MDX setup
- ✅ Directory structure
- ⏳ Layout components (240px + 320px)
- ⏳ MDX components (CalloutBox, CodeBlock, etc.)
- ⏳ Article template

### Phase 2: Content (2 hours)
- ⏳ Write 5 essential articles
- ⏳ Test MDX rendering
- ⏳ Add images/videos

### Phase 3: Features (3 hours)
- ⏳ Search (Pagefind)
- ⏳ Popular Articles widget (Supabase)
- ⏳ Helpfulness widget
- ⏳ Analytics tracking

### Phase 4: Polish (1 hour)
- ⏳ Mobile responsive
- ⏳ Validation script
- ⏳ Documentation

---

## Next Steps

**Ready to implement?** I can build this in phases:

1. **Quick MVP** (2 hours): Basic layout + 2 sample articles
2. **Full Implementation** (8 hours): Everything above
3. **Incremental** (your pace): I build components, you review/approve

Which approach would you prefer?
