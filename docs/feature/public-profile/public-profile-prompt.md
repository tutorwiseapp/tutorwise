# Public Profile Feature - AI Prompt

**Version**: v4.9
**Date**: 2025-12-12
**Purpose**: Guide AI assistants when working on the public profile feature

---

## Feature Overview

The Public Profile feature displays comprehensive user profiles to potential clients and visitors. Built as a Next.js Server Component with SEO optimization, resilient URL patterns, and 15 modular card components for flexible content display.

**Key Responsibilities**:
- SEO-friendly URLs with permanent [id]/[[...slug]] routing
- 301 redirects when slug changes (name changes don't break links)
- Server-side rendering for fast TTFB and indexability
- Real-time statistics aggregation (sessions, reviews, profile views)
- Role-based professional info (tutor/client/agent)
- Own profile detection (Edit vs Book/Message CTAs)
- Mobile-responsive 2-column layout
- Profile view analytics tracking

---

## System Context

### Core Architecture

The public profile is built on these principles:

1. **Permanent ID-Based Routing**: URLs use UUID + slug (`/public-profile/{id}/{slug}`)
2. **Slug Resilience**: Server validates slug, 301 redirects if incorrect
3. **Server-Side Rendering**: Async Server Component fetches all data before render
4. **Component Modularity**: 15 independent card components
5. **Real-Time Aggregation**: Live calculations from bookings, reviews, profile_views
6. **Role-Based Content**: Different cards per role (TutorProfessionalInfo, ClientProfessionalInfo, AgentProfessionalInfo)
7. **Own Profile Detection**: `isOwnProfile = user?.id === profile.id`
8. **Analytics Tracking**: ProfileViewTracker logs views for dashboard

### Database Tables

**Primary Queries**:
- `profiles` - User data, professional_details JSONB
- `listings` - Service offerings (status = 'published')
- `profile_reviews` - 6-way mutual review system
- `bookings` - Session statistics (status = 'Completed')
- `profile_view_counts` - Materialized view (performance)

**Key Fields**:
```sql
profiles {
  id UUID,
  user_id UUID,
  full_name TEXT,
  slug TEXT UNIQUE,                  -- Auto-generated from full_name
  avatar_url TEXT,
  bio TEXT,
  active_role TEXT,                  -- 'tutor', 'client', 'agent'
  professional_details JSONB,        -- Role-specific data
  city TEXT,
  country TEXT,
  identity_verified BOOLEAN,
  dbs_verified BOOLEAN,
  proof_of_address_verified BOOLEAN
}

profile_reviews {
  id UUID,
  reviewer_id UUID,
  reviewee_id UUID,
  session_id UUID,
  rating INTEGER,                    -- 1-5 stars
  comment TEXT,
  created_at TIMESTAMPTZ
}
```

---

## Integration Points

### Critical Dependencies

1. **Authentication** (CRITICAL - Own Profile Detection):
   - Uses `createClient()` from `/utils/supabase/server`
   - Fetches current user session
   - Sets `isOwnProfile = user?.id === profile.id`
   - Changes CTAs: "Edit My Profile" vs "Book Session"

2. **Listings**:
   - Fetches active listings via `supabase.from('listings')`
   - Filters by `profile_id` and `status = 'published'`
   - Displays in ServicesCard (max 5)

3. **Reviews** (6-Way Mutual Review System):
   - Fetches from `profile_reviews` table
   - Joins with `profiles` (reviewer info)
   - Filters by `reviewee_id` and `session.status = 'published'`

4. **Bookings** (Statistics):
   - Counts completed sessions as student/tutor
   - Calculates unique tutors/clients worked with
   - Aggregates for RoleStatsCard

5. **Analytics** (Profile Views):
   - ProfileViewTracker component (client-side)
   - Logs view to `profile_views` table
   - Materialized view `profile_view_counts` for fast reads

6. **Hub Layout** (Own Profile Editing):
   - "Edit My Profile" button links to `/account/personal-info`
   - Reuses professional info components from account hub

7. **Slugify Utility**:
   - Uses `generateSlug(full_name)` from `/lib/utils/slugify`
   - Creates URL-friendly slugs (lowercase, hyphens)
   - Handles collisions with numeric suffix

---

## Key Functions & Workflows

### 1. Slug Validation & 301 Redirect

**Purpose**: Ensure URLs always use current slug, redirect if outdated

**Location**: `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx`

**Logic**:
```typescript
// STEP 1: Fetch profile using ONLY the ID (permanent lookup)
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', params.id)
  .single();

// STEP 2: Validate slug and 301 redirect if incorrect
const correctSlug = profile.slug || generateSlug(profile.full_name);
const urlSlug = params.slug?.[0] || '';

if (correctSlug !== urlSlug) {
  redirect(`/public-profile/${profile.id}/${correctSlug}`);
}
```

### 2. Real-Time Statistics Aggregation

**Purpose**: Calculate live stats without relying on cached columns

**Location**: Same page.tsx, STEP 8

**Logic**:
```typescript
// Average Rating from profile_reviews
const { data: reviewStats } = await supabase
  .from('profile_reviews')
  .select('rating')
  .eq('reviewee_id', profile.id);

const reviewCount = reviewStats?.length || 0;
const averageRating = reviewCount > 0
  ? reviewStats!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
  : 0;

// Sessions completed
const { count: sessionsAsStudent } = await supabase
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .eq('student_id', profile.id)
  .eq('status', 'Completed');

const { count: sessionsAsTutor } = await supabase
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .eq('tutor_id', profile.id)
  .eq('status', 'Completed');

const sessionsCompleted = (sessionsAsStudent || 0) + (sessionsAsTutor || 0);

// Profile views from materialized view
const { data: viewData } = await supabase
  .from('profile_view_counts')
  .select('total_views')
  .eq('profile_id', profile.id)
  .maybeSingle();

// Augment profile with calculated stats
const enrichedProfile = {
  ...profile,
  average_rating: Math.round(averageRating * 10) / 10,
  total_reviews: reviewCount,
  sessions_completed: sessionsCompleted,
  profile_views: viewData?.total_views || 0,
};
```

### 3. ServicesCard (Listing Display)

**Purpose**: Show up to 5 recent listings with count badge

**Location**: `apps/web/src/app/components/feature/public-profile/ServicesCard.tsx`

**Logic**:
```typescript
const MAX_LISTINGS_SHOWN = 5;

const filteredListings = excludeListingId
  ? listings.filter(listing => listing.id !== excludeListingId)
  : listings;

const totalCount = filteredListings.length;
const displayedListings = filteredListings.slice(0, MAX_LISTINGS_SHOWN);

// Badge behavior
{isOwnProfile ? (
  <button onClick={() => router.push('/listings')}>
    {totalCount}
  </button>
) : (
  <span>{totalCount}</span>
)}
```

### 4. ProfileViewTracker (Analytics)

**Purpose**: Log unique profile views for analytics dashboard

**Location**: `apps/web/src/app/components/feature/public-profile/ProfileViewTracker.tsx`

**Logic**:
```typescript
'use client';

useEffect(() => {
  const logView = async () => {
    if (!profileId) return;

    // Don't log own profile views
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === profileId) return;

    await fetch(`/api/analytics/profile-view`, {
      method: 'POST',
      body: JSON.stringify({ profileId }),
    });
  };

  logView();
}, [profileId]);
```

---

## Common Tasks & Patterns

### Task 1: Add New Card Component

**Example**: Add "CertificationsCard"

```typescript
// 1. Create component
// apps/web/src/app/components/feature/public-profile/CertificationsCard.tsx
'use client';

import Card from '@/app/components/ui/data-display/Card';
import styles from './CertificationsCard.module.css';

export function CertificationsCard({ profile }: { profile: Profile }) {
  const certifications = profile.professional_details?.tutor?.certifications || [];

  return (
    <Card className={styles.certificationsCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Certifications</h2>
      </div>
      <div className={styles.cardContent}>
        {certifications.length === 0 ? (
          <p className={styles.emptyState}>No certifications listed</p>
        ) : (
          <ul className={styles.certificationsList}>
            {certifications.map((cert: string, index: number) => (
              <li key={index}>{cert}</li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

// 2. Add standard styling (CertificationsCard.module.css)
.certificationsCard { padding: 0 !important; }
.cardHeader {
  padding: 12px 16px;
  background-color: #E6F0F0;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 8px 8px 0 0;
}
.cardTitle {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}
.cardContent { padding: 16px; }

// 3. Add to page.tsx
import { CertificationsCard } from '@/app/components/feature/public-profile/CertificationsCard';

<div className={styles.mainColumn}>
  <AboutCard profile={enrichedProfile} />
  <ProfessionalInfoCard profile={enrichedProfile} />
  <CertificationsCard profile={enrichedProfile} />
  {/* ... rest of cards */}
</div>
```

### Task 2: Add New Real-Time Statistic

**Requirement**: Add "Response Rate" to RoleStatsCard

```typescript
// In page.tsx, STEP 8 (after line 242)

// Response rate from messages table
const { data: messages } = await supabase
  .from('messages')
  .select('id, responded_at')
  .eq('recipient_id', profile.id)
  .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

const totalMessages = messages?.length || 0;
const respondedMessages = messages?.filter(m => m.responded_at).length || 0;
const responseRate = totalMessages > 0 ? (respondedMessages / totalMessages) * 100 : 0;

// Add to enrichedProfile
const enrichedProfile = {
  ...profile,
  average_rating: Math.round(averageRating * 10) / 10,
  total_reviews: reviewCount,
  sessions_completed: sessionsCompleted,
  response_rate: Math.round(responseRate), // NEW
};
```

### Task 3: Change ServicesCard Listing Limit

**Requirement**: Show 10 listings instead of 5

```typescript
// apps/web/src/app/components/feature/public-profile/ServicesCard.tsx
// Line 36
const MAX_LISTINGS_SHOWN = 5; // Change to 10
```

### Task 4: Filter Reviews by Rating

**Requirement**: Show only 5-star reviews

```typescript
// In page.tsx, STEP 6 (line 134)
const { data: reviews } = await supabase
  .from('profile_reviews')
  .select(`...`)
  .eq('reviewee_id', profile.id)
  .eq('session.status', 'published')
  .eq('rating', 5) // NEW: Only 5-star reviews
  .order('created_at', { ascending: false })
  .limit(10);
```

---

## Testing Checklist

When modifying the public profile feature, test:

- [ ] Slug validation (correct slug, wrong slug → 301 redirect)
- [ ] Name change → slug update → old URL redirects
- [ ] Own profile detection (correct CTAs)
- [ ] Other profile view (Book/Message/Connect buttons)
- [ ] Listings display (max 5, clickable badge on own profile)
- [ ] Reviews display (verified bookings only)
- [ ] Statistics accuracy (sessions, reviews, views)
- [ ] Mobile layout (stacked cards, bottom CTA)
- [ ] Desktop layout (2-column, sticky sidebar)
- [ ] SEO metadata (title, description, OG tags)
- [ ] Analytics tracking (ProfileViewTracker logs)
- [ ] Performance (TTFB < 200ms, parallel queries)

---

## Security Considerations

1. **RLS Policies**: Public can view published profiles, listings, reviews
2. **Own Profile Detection**: Auth check for "Edit My Profile" CTA
3. **Email Privacy**: Email never displayed on public profile
4. **Phone Privacy**: Phone number not shown
5. **Address Privacy**: Only city/country displayed
6. **Session Details Hidden**: No booking details exposed

---

## Performance Optimization

1. **Parallel Queries**: All data fetched via `Promise.all()` (400ms → 150ms)
2. **Materialized Views**: profile_view_counts for instant reads
3. **Image Optimization**: `next/image` with lazy loading
4. **Code Splitting**: Auto-split by Next.js
5. **CSS Modules**: Scoped styles, no global conflicts

**Performance Targets**:
- TTFB: < 200ms
- LCP: < 1.5s
- FID: < 100ms
- CLS: < 0.1

---

## Migration Guidelines

When adding new features to public profiles:

1. **New Card Component**: Create in `/components/feature/public-profile/YourCard.tsx`
2. **Follow Card Pattern**: Use standard header styling, padding override
3. **Add to Page**: Import and place in appropriate column (main or sidebar)
4. **Mobile Responsive**: Add `@media` queries for < 768px
5. **Own Profile Logic**: Check `isOwnProfile` for conditional rendering
6. **Statistics**: Aggregate in page.tsx STEP 8, add to enrichedProfile
7. **Testing**: Verify mobile, tablet, desktop views

---

## Related Documentation

- [Public Profile README](./README.md) - Quick reference
- [Public Profile Solution Design](./public-profile-solution-design.md) - Complete architecture
- [Public Profile Implementation](./public-profile-implementation.md) - Developer guide
- [Listings Solution Design](../listings/listings-solution-design.md) - ServicesCard integration
- [Reviews Solution Design](../reviews/reviews-solution-design.md) - ReviewsCard integration

---

**Last Updated**: 2025-12-12
**Maintainer**: Frontend Team
**For Questions**: See public-profile-solution-design.md or ask team lead
