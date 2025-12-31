# Public Organisation Profile - Implementation Summary

**Date:** 2025-12-31
**Status:** ✅ Phase 1 Complete - Basic implementation ready for testing
**Route:** `/organisation/[slug]` (rewrites to `/public-organisation-profile/[slug]`)

---

## ✅ Completed Steps

### 1. Database Migration (Migration 154)

**File:** `tools/database/migrations/154_add_public_organisation_profile_fields.sql`

**Added to `connection_groups` table:**
- ✅ `tagline` - Short mission statement
- ✅ `bio` - Full description
- ✅ `cover_image_url` - Hero banner
- ✅ `video_intro_url` - Video introduction
- ✅ `location_city`, `location_country`, `service_area[]`
- ✅ `subjects_offered[]`, `levels_offered[]`, `established_date`
- ✅ `business_verified`, `safeguarding_certified`, `professional_insurance`, `association_member`
- ✅ `social_links` (JSONB)
- ✅ `public_visible`, `allow_indexing`
- ✅ `caas_score` (aggregate team trust score)

**New tables created:**
- ✅ `organisation_views` - Track page views
- ✅ `organisation_view_counts` - Materialized view for analytics

**New RPC functions:**
- ✅ `get_organisation_public_stats(p_org_id UUID)` - Returns comprehensive stats:
  - `total_sessions`, `total_reviews`, `avg_rating`
  - `total_tutors`, `profile_views`, `total_clients`
  - `unique_subjects[]`, `unique_levels[]`
  - `dbs_verified_tutors`, `established_date`

**Indexes created:**
- ✅ Slug lookups (public orgs only)
- ✅ City filtering
- ✅ Subjects GIN index
- ✅ CaaS score sorting

**RLS Policies:**
- ✅ Anyone can track views
- ✅ Users can view own view history
- ✅ Org owners can view their analytics

---

### 2. Directory Structure

```
apps/web/src/app/
└── public-organisation-profile/     # Internal directory name
    └── [slug]/                      # Slug-only route (simpler than profiles)
        ├── page.tsx                 # Main server component
        └── page.module.css          # Styles (copied from public-profile)

apps/web/src/components/feature/
└── public-organisation-profile/     # Component library (copied from public-profile)
    ├── AboutCard.tsx
    ├── ServicesCard.tsx
    ├── ReviewsCard.tsx
    ├── VerificationCard.tsx
    ├── RoleStatsCard.tsx            # Will become OrganisationStatsCard
    ├── ProfileHeroSection.tsx       # Will become OrganisationHeroSection
    ├── (... 25+ other components)
```

---

### 3. URL Routing

**Public URL:** `https://tutorwise.io/organisation/london-maths-tutors`
**Internal Route:** `/public-organisation-profile/[slug]`

**Configuration:** Added to `next.config.js`:
```javascript
async rewrites() {
  return [
    {
      source: '/organisation/:slug',
      destination: '/public-organisation-profile/:slug',
    },
  ];
}
```

---

### 4. Basic Page Implementation

**File:** `apps/web/src/app/public-organisation-profile/[slug]/page.tsx`

**Current Features:**
- ✅ Server-side rendering with 5-min revalidation
- ✅ Slug-based lookup (no ID required)
- ✅ SEO metadata generation (title, description, OpenGraph, Twitter)
- ✅ Trust-based indexing (CaaS score >= 75)
- ✅ JSON-LD structured data (EducationalOrganization schema)
- ✅ Fetch organisation data from `connection_groups`
- ✅ Fetch team members from `network_group_members`
- ✅ Aggregate team reviews
- ✅ Stats from `get_organisation_public_stats()` RPC
- ✅ Similar organisations recommendation
- ✅ 2-column layout (main content + sticky sidebar)
- ✅ Responsive design with placeholder components

**Data Flow:**
```
1. User visits: /organisation/london-maths-tutors
2. Next.js rewrites to: /public-organisation-profile/london-maths-tutors
3. Server component:
   a. Fetch org by slug from connection_groups
   b. Call get_organisation_public_stats(org_id)
   c. Fetch team members
   d. Fetch aggregate reviews
   e. Fetch similar organisations
4. Render with basic layout
5. Return HTML with SEO metadata
```

---

### 5. Test Data

**Test Organisation:** `michael-agency`

**URL to test:** `http://localhost:3000/organisation/michael-agency`

**Data populated:**
- Name: Michael Agency
- Tagline: Expert GCSE & A-Level Tutoring in London
- Location: London, United Kingdom
- Subjects: Mathematics, Physics, Chemistry
- Levels: GCSE, A-Level
- Established: 2020
- CaaS Score: 85 (Top 10%)
- Verifications: Business ✅, Safeguarding ✅, Insurance ✅
- Public: Visible & Indexable

---

## 📋 What's Working Now

1. ✅ **Route is accessible** at `/organisation/michael-agency`
2. ✅ **Database queries work** (organisation data, stats, members, reviews)
3. ✅ **SEO metadata generated** (proper title, description, robots tags)
4. ✅ **JSON-LD structured data** (EducationalOrganization schema)
5. ✅ **Basic layout renders** (hero, about, team, reviews, stats, verification)
6. ✅ **Similar orgs recommendation** works
7. ✅ **Responsive 2-column layout** (main + sidebar)

---

## 🚧 TODO: Next Phase (Polish & Production-Ready)

### High Priority

1. **Replace Placeholder Components with Real Ones:**
   - [ ] OrganisationHeroSection (currently basic div)
   - [ ] TeamMembersCard (currently basic grid)
   - [ ] AboutCard (needs proper styling)
   - [ ] ReviewsCard (needs tutor attribution)
   - [ ] OrganisationStatsCard (sidebar stats)
   - [ ] VerificationCard (business credentials)

2. **Implement View Tracking:**
   - [ ] Create `OrganisationViewTracker.tsx` component
   - [ ] Copy pattern from `ProfileViewTracker.tsx`
   - [ ] Track to `organisation_views` table
   - [ ] Session deduplication (24-hour window)

3. **Add Missing Features:**
   - [ ] ServicesCard (aggregate team offerings by subject)
   - [ ] SimilarOrganisationsCard (proper styling)
   - [ ] MobileBottomCTA (fixed CTA bar on mobile)
   - [ ] GetInTouchCard (Contact, Join Team, Book Session CTAs)

### Medium Priority

4. **Enhance SEO:**
   - [ ] Add breadcrumb schema
   - [ ] Enhance EducationalOrganization schema with more fields
   - [ ] Add social sharing images (logo/cover)
   - [ ] Implement canonical URLs

5. **Add Interactivity:**
   - [ ] "View All Tutors" expands team grid
   - [ ] Subject filtering for team members
   - [ ] Review pagination/filtering
   - [ ] Social share buttons

6. **Performance:**
   - [ ] Add loading states
   - [ ] Optimize image loading (Next Image)
   - [ ] Add error boundaries
   - [ ] Implement ISR (Incremental Static Regeneration)

### Low Priority

7. **Analytics:**
   - [ ] Track referrer sources
   - [ ] Track CTA clicks
   - [ ] Dashboard for org owners
   - [ ] Conversion funnel tracking

8. **Advanced Features:**
   - [ ] Location map (service area)
   - [ ] Calendar integration (team availability)
   - [ ] Testimonials showcase
   - [ ] Success stories/case studies

---

## 🎯 Architecture Decisions

### Why We Copied Public Profile:

1. **Proven Pattern** - Already works for individual profiles
2. **Consistent UX** - Users familiar with profile pages
3. **SEO-Optimized** - Trust-first approach, structured data
4. **Fast Development** - 80% code reuse
5. **Component Library** - 25+ reusable cards

### Key Differences from Public Profile:

| Aspect | Public Profile | Public Organisation |
|--------|---------------|---------------------|
| **URL Pattern** | `/public-profile/[id]/[slug]` | `/organisation/[slug]` |
| **Data Source** | `profiles` table | `connection_groups` table |
| **Primary Entity** | Individual person | Business/Agency |
| **Stats** | Individual metrics | Aggregate team metrics |
| **Services** | Personal listings | Team offerings |
| **Reviews** | Individual reviews | All team reviews |
| **Unique Feature** | Personal bio, qualifications | Team roster, business credentials |
| **Schema.org Type** | Person | EducationalOrganization |

---

## 📊 Database Schema Reference

### connection_groups (Extended)

```sql
-- Original fields (from migration 091)
id, profile_id, name, description, type, slug, avatar_url,
website, settings, contact_*, address_*

-- New public profile fields (migration 154)
tagline, bio, cover_image_url, video_intro_url,
location_city, location_country, service_area[],
subjects_offered[], levels_offered[], established_date,
business_verified, safeguarding_certified, professional_insurance,
association_member, social_links (JSONB),
public_visible, allow_indexing, caas_score
```

### RPC Function Signature

```sql
get_organisation_public_stats(p_org_id UUID)
RETURNS TABLE (
  total_sessions BIGINT,
  total_reviews BIGINT,
  avg_rating NUMERIC,
  total_tutors BIGINT,
  profile_views BIGINT,
  unique_subjects TEXT[],
  unique_levels TEXT[],
  dbs_verified_tutors BIGINT,
  established_date DATE,
  total_clients BIGINT
)
```

---

## 🧪 Testing Instructions

### 1. Start Dev Server

```bash
npm run dev
```

### 2. Visit Test Organisation

```
http://localhost:3000/organisation/michael-agency
```

### 3. Expected Result

You should see:
- ✅ Hero section with "Michael Agency" title
- ✅ Tagline: "Expert GCSE & A-Level Tutoring in London"
- ✅ Location: London | Team size | Rating
- ✅ About section with bio
- ✅ Team members grid (if any members exist)
- ✅ Reviews section (if any reviews exist)
- ✅ Stats sidebar with:
  - Sessions completed
  - Average rating
  - Number of tutors
  - Reviews count
  - Profile views
  - Subjects offered (Mathematics, Physics, Chemistry)
- ✅ Verification card with green checkmarks
- ✅ Page title in browser: "Michael Agency | Tutorwise"
- ✅ View page source: JSON-LD structured data present

### 4. Test SEO

```bash
# View generated metadata
curl http://localhost:3000/organisation/michael-agency | grep -A 20 "<head>"

# Check JSON-LD
curl http://localhost:3000/organisation/michael-agency | grep "application/ld+json" -A 30
```

### 5. Test Database Queries

```bash
# Check stats RPC
export PGPASSWORD="8goRkJd6cPkPGyIY"
psql "postgresql://postgres.lvsmtgmpoysjygdwcrir@aws-1-eu-west-2.pooler.supabase.com:5432/postgres" \
  -c "SELECT * FROM get_organisation_public_stats('7b52dcad-664f-46b9-a44f-c4055bee99e0');"
```

---

## 📝 Next Steps Recommendation

**Option A: Quick Polish (1-2 days)**
1. Style the placeholder divs with proper CSS
2. Add OrganisationViewTracker
3. Test with production data
4. Deploy behind feature flag

**Option B: Full Implementation (1 week)**
1. Build all custom components (HeroSection, TeamMembersCard, etc.)
2. Add all interactive features
3. Implement analytics
4. Full QA testing
5. Production deployment

**Option C: Iterative Approach (Recommended)**
1. ✅ Phase 1: Basic route + data (DONE)
2. Phase 2: Polish Hero & Stats (2 days)
3. Phase 3: Team Members showcase (2 days)
4. Phase 4: View tracking + Analytics (1 day)
5. Phase 5: Mobile optimization (1 day)
6. Phase 6: Production deployment

---

## 🎉 Summary

We've successfully created the **foundation for public organisation pages** by:

1. ✅ Extended database schema with all necessary fields
2. ✅ Created RPC function for aggregate stats
3. ✅ Set up view tracking infrastructure
4. ✅ Copied proven public-profile architecture
5. ✅ Created `/organisation/[slug]` route
6. ✅ Implemented basic server-side rendering
7. ✅ Added SEO metadata and JSON-LD
8. ✅ Created test organisation with data

**The page is functional and accessible** - users can visit `/organisation/michael-agency` and see organisation information. The next phase is to replace placeholder components with properly styled, production-ready ones.

**Timeline Estimate:**
- Basic (current): ✅ Complete
- Polished: +2-3 days
- Production-ready: +1 week
- Feature-complete: +2 weeks

Let me know which approach you'd like to take next!
