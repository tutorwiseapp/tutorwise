# Public Organisation Profile - File Reference

**Created:** 2025-12-31
**Status:** Production Ready ✅

---

## 📁 Directory Structure

```
apps/web/src/
├── app/
│   ├── api/organisations/[id]/track-view/
│   │   └── route.ts                        # View tracking API endpoint
│   └── public-organisation-profile/[slug]/
│       ├── page.tsx                        # Main server component
│       └── page.module.css                 # Page layout styles
│
└── components/feature/public-organisation-profile/
    ├── AboutCard.tsx                       # Organisation bio & info
    ├── AboutCard.module.css
    ├── MobileBottomCTA.tsx                 # Fixed mobile CTA bar
    ├── MobileBottomCTA.module.css
    ├── OrganisationHeroSection.tsx         # Hero banner with CTAs
    ├── OrganisationHeroSection.module.css
    ├── OrganisationStatsCard.tsx           # Stats sidebar
    ├── OrganisationStatsCard.module.css
    ├── OrganisationViewTracker.tsx         # Analytics tracking
    ├── ReviewsCard.tsx                     # Team reviews display
    ├── ReviewsCard.module.css
    ├── SimilarOrganisationsCard.tsx        # Recommendations
    ├── SimilarOrganisationsCard.module.css
    ├── TeamMembersCard.tsx                 # Team grid showcase
    ├── TeamMembersCard.module.css
    ├── VerificationCard.tsx                # Trust credentials
    └── VerificationCard.module.css

tools/database/migrations/
└── 154_add_public_organisation_profile_fields.sql
```

---

## 🗂️ Component Reference

### 1. Main Route

**File:** [page.tsx](apps/web/src/app/public-organisation-profile/[slug]/page.tsx)
- Server component with SSR
- Fetches organisation data, stats, team, reviews, similar orgs
- Generates SEO metadata (OpenGraph, Twitter, JSON-LD)
- Trust-based indexing (CaaS ≥75)
- 5-minute revalidation caching

### 2. Hero Section

**Files:**
- [OrganisationHeroSection.tsx](apps/web/src/components/feature/public-organisation-profile/OrganisationHeroSection.tsx)
- [OrganisationHeroSection.module.css](apps/web/src/components/feature/public-organisation-profile/OrganisationHeroSection.module.css)

**Features:**
- Gradient banner background
- Logo with fallback icon
- Trust badge (Top 5%, Top 10%, Verified)
- Stats pills (team size, rating, location)
- Tagline and subject pills
- Primary CTAs (Book Session, Join Team)
- Referral CTA (Refer & Earn 10%)
- Share button with modal
- Fully responsive

### 3. Stats Sidebar

**Files:**
- [OrganisationStatsCard.tsx](apps/web/src/components/feature/public-organisation-profile/OrganisationStatsCard.tsx)
- [OrganisationStatsCard.module.css](apps/web/src/components/feature/public-organisation-profile/OrganisationStatsCard.module.css)

**Features:**
- Icon-based metrics display
- Sessions completed, average rating, team size, reviews
- Profile views, established year
- Subjects offered (color-coded tags)
- Levels offered (color-coded tags)
- Clients served highlight
- Sticky positioning on desktop
- Grid layout on mobile

### 4. Team Members Showcase

**Files:**
- [TeamMembersCard.tsx](apps/web/src/components/feature/public-organisation-profile/TeamMembersCard.tsx)
- [TeamMembersCard.module.css](apps/web/src/components/feature/public-organisation-profile/TeamMembersCard.module.css)

**Features:**
- Responsive grid (4 → 2 → 1 columns)
- Avatar with DBS verification badge
- Subject filtering dropdown
- Rating display per tutor
- Location tags
- "View All X Tutors" expansion
- Hover effects with "View Profile" overlay
- Click to navigate to tutor profile

### 5. About Card

**Files:**
- [AboutCard.tsx](apps/web/src/components/feature/public-organisation-profile/AboutCard.tsx)
- [AboutCard.module.css](apps/web/src/components/feature/public-organisation-profile/AboutCard.module.css)

**Features:**
- Tagline with quote styling
- Bio with read more/less expansion (300 char limit)
- Video introduction with modal player
- Website link with external icon
- Service area tags
- Professional layout

### 6. Reviews Display

**Files:**
- [ReviewsCard.tsx](apps/web/src/components/feature/public-organisation-profile/ReviewsCard.tsx)
- [ReviewsCard.module.css](apps/web/src/components/feature/public-organisation-profile/ReviewsCard.module.css)

**Features:**
- Aggregate team reviews
- Tutor attribution ("for [Tutor Name]")
- Rating filter dropdown (All, 5★, 4★, 3★)
- Verified booking badges
- Reviewer avatar with fallback
- Smart date formatting (Today, X days ago, etc.)
- Load more functionality (5 at a time)
- Empty state handling

### 7. Verification & Trust

**Files:**
- [VerificationCard.tsx](apps/web/src/components/feature/public-organisation-profile/VerificationCard.tsx)
- [VerificationCard.module.css](apps/web/src/components/feature/public-organisation-profile/VerificationCard.module.css)

**Features:**
- Business verified status
- DBS percentage with progress bar
- Safeguarding certification
- Professional insurance
- Association membership display
- Trust badge for high CaaS scores
- Icon-based design

### 8. Similar Organisations

**Files:**
- [SimilarOrganisationsCard.tsx](apps/web/src/components/feature/public-organisation-profile/SimilarOrganisationsCard.tsx)
- [SimilarOrganisationsCard.module.css](apps/web/src/components/feature/public-organisation-profile/SimilarOrganisationsCard.module.css)

**Features:**
- Smart recommendations (same city)
- Logo with fallback
- Trust badges
- Rating and team size display
- Location tags
- Hover effects
- Grid layout (3 → 2 → 1 columns)
- Limits to 6 organisations

### 9. View Tracking

**Files:**
- [OrganisationViewTracker.tsx](apps/web/src/components/feature/public-organisation-profile/OrganisationViewTracker.tsx)
- [route.ts](apps/web/src/app/api/organisations/[id]/track-view/route.ts)

**Features:**
- Session-based deduplication (24 hours)
- Anonymous and authenticated tracking
- Referrer source capture
- User agent and IP logging
- Silent failure (no user disruption)
- Only tracks for non-owners

### 10. Mobile CTA

**Files:**
- [MobileBottomCTA.tsx](apps/web/src/components/feature/public-organisation-profile/MobileBottomCTA.tsx)
- [MobileBottomCTA.module.css](apps/web/src/components/feature/public-organisation-profile/MobileBottomCTA.module.css)

**Features:**
- Fixed bottom bar (mobile only)
- Book Session button (links to marketplace)
- Join Team button (links to careers)
- Safe area insets support
- Hidden for organisation owners
- Stacks on very small screens (<400px)

---

## 🗄️ Database Schema

### Tables Created

**1. organisation_views**
```sql
id              UUID PRIMARY KEY
organisation_id UUID REFERENCES connection_groups(id)
viewer_id       UUID REFERENCES profiles(id)
session_id      TEXT NOT NULL
referrer_source TEXT
user_agent      TEXT
ip_address      INET
viewed_at       TIMESTAMPTZ DEFAULT NOW()
```

**Indexes:**
- `idx_organisation_views_org_id` on organisation_id
- `idx_organisation_views_session` on session_id
- `idx_organisation_views_viewed_at` on viewed_at DESC
- `idx_organisation_views_viewer` on viewer_id (WHERE viewer_id IS NOT NULL)

**RLS Policies:**
- Anyone can INSERT (track views)
- Organisation owners can SELECT their analytics
- Users can SELECT their own view history

**2. organisation_view_counts** (Materialized View)
```sql
organisation_id       UUID PRIMARY KEY
total_views           BIGINT
unique_viewers        BIGINT
last_view_date        DATE
views_last_7_days     BIGINT
views_last_30_days    BIGINT
top_referrer_sources  TEXT[]
```

Refreshed hourly via pg_cron.

### Fields Added to connection_groups

```sql
tagline                TEXT
bio                    TEXT
cover_image_url        TEXT
video_intro_url        TEXT
location_city          TEXT
location_country       TEXT
business_verified      BOOLEAN DEFAULT false
safeguarding_certified BOOLEAN DEFAULT false
professional_insurance BOOLEAN DEFAULT false
association_membership TEXT
careers_url            TEXT
caas_score             INTEGER
subjects_offered       TEXT[]
levels_offered         TEXT[]
public_visible         BOOLEAN DEFAULT false
allow_indexing         BOOLEAN DEFAULT true
website                TEXT
social_links           JSONB
```

### RPC Function

**get_organisation_public_stats(p_org_id UUID)**

Returns:
- total_sessions BIGINT
- total_reviews BIGINT
- avg_rating NUMERIC
- total_tutors BIGINT
- profile_views BIGINT
- unique_subjects TEXT[]
- unique_levels TEXT[]
- dbs_verified_tutors BIGINT
- established_date DATE
- total_clients BIGINT

---

## 🎨 Design System

### Color Palette

**Primary Gradient:**
- `#667eea` to `#764ba2` (purple gradient)

**Trust Badges:**
- Top 5%: `#10b981` (green)
- Top 10%: `#3b82f6` (blue)
- Verified: `#8b5cf6` (purple)

**Text Colors:**
- Primary: `#1e293b` (slate-900)
- Secondary: `#64748b` (slate-500)
- Tertiary: `#94a3b8` (slate-400)

**UI Elements:**
- Background: `white`
- Borders: `#e2e8f0` (slate-200)
- Hover: `#f1f5f9` (slate-100)

### Typography

- **Headings:** 700 weight (bold)
- **Body:** 400 weight (normal)
- **Labels:** 500-600 weight (medium/semibold)

### Spacing

- Card padding: `2rem` (desktop), `1.5rem` (mobile)
- Gap between elements: `0.75rem - 1.5rem`
- Border radius: `8px - 12px`

### Breakpoints

- Desktop: `> 1024px`
- Tablet: `768px - 1024px`
- Mobile: `< 768px`
- Small mobile: `< 480px`

---

## 🔗 URL Structure

**Clean URLs via Next.js Rewrites:**

```
/organisation/[slug] → /public-organisation-profile/[slug]
```

**Examples:**
- `/organisation/london-maths-tutors`
- `/organisation/oxford-learning-centre`
- `/organisation/michael-agency`

---

## 📊 SEO Implementation

### Metadata Generated

1. **Title:** `{Organisation Name} | Tutorwise`
2. **Description:** Tagline or bio (160 char limit)
3. **OpenGraph:** Image, title, description, type
4. **Twitter Card:** Large image, title, description
5. **Robots:** Index/noindex based on CaaS score ≥75

### JSON-LD Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "Organisation Name",
  "description": "Bio or tagline",
  "url": "https://tutorwise.io/organisation/slug",
  "logo": "logo_url",
  "image": "cover_image_url",
  "address": { ... },
  "aggregateRating": { ... },
  "numberOfEmployees": total_tutors,
  "foundingDate": established_date,
  "award": "Top 10% Rated Organisation",
  "knowsAbout": [subjects]
}
```

---

## ⚡ Performance Optimizations

1. **SSR with Revalidation:** 5-minute cache
2. **Parallel Queries:** All data fetched concurrently
3. **Image Optimization:** Next/Image with automatic sizing
4. **Lazy Loading:** Images below fold
5. **Materialized Views:** Hourly refresh for analytics
6. **Database Indexes:** Optimized query performance
7. **Modular CSS:** Scoped styles, tree-shakable

---

## 🧪 Testing Checklist

### Functionality
- ✅ Data fetching works
- ✅ RPC function returns correct stats
- ✅ Team members query works
- ✅ Reviews aggregation works
- ✅ View tracking increments
- ✅ Similar orgs filtered by city
- ✅ CTAs navigate correctly
- ✅ Share modal integration works

### Responsive Design
- ✅ Desktop (> 1024px) - 2-column layout
- ✅ Tablet (768-1024px) - Stacked sections
- ✅ Mobile (< 768px) - Single column
- ✅ Mobile CTA bar visible
- ✅ Grid layouts adapt (4→2→1)

### SEO
- ✅ Metadata generated
- ✅ JSON-LD present
- ✅ Trust-based indexing works
- ✅ OpenGraph tags correct
- ✅ Twitter cards correct

### Accessibility
- ✅ ARIA labels present
- ✅ Semantic HTML
- ✅ Keyboard navigation
- ✅ Focus states
- ✅ Alt text on images

---

## 🚀 Deployment

**Ready for:**
- Vercel deployment
- Production database migration
- User testing
- A/B testing

**URL Pattern:**
- `https://tutorwise.io/organisation/[slug]`

---

**Last Updated:** 2025-12-31
**Version:** 1.0.0
**Status:** Production Ready ✅
