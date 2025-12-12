# Public Profile Feature - Solution Design

**Version**: v4.9
**Date**: 2025-12-12
**Status**: Active
**Priority**: High (Tier 1 - Critical)
**Architecture**: Server-Side Rendered Public Pages

---

## Executive Summary

### Purpose

The Public Profile feature is Tutorwise's primary user showcase - the "shop window" that displays tutors, agents, and clients to potential customers and visitors. Built as a Next.js Server Component with SEO optimization, it serves as the first impression point in the discovery funnel and drives booking conversions.

### Problem Statement

**Challenge**: How do we create public-facing profile pages that:
- Load fast for SEO (<200ms TTFB)
- Handle name changes without breaking shared links (viral loop protection)
- Display role-specific content (tutor/client/agent professional details)
- Calculate real-time statistics without caching inconsistencies
- Work for both authenticated and anonymous visitors
- Convert visitors into bookings

**Solution**: Server-rendered async pages with ID-based routing, 301 redirect resilience, 15 modular card components, and real-time aggregations from multiple tables.

### Key Capabilities

1. **SEO-Friendly URLs**: [id]/[[...slug]] pattern for permanent, shareable links
2. **Slug Resilience**: 301 redirects when slug changes (name changes don't break links)
3. **Server-Side Rendering**: Fully rendered HTML for fast TTFB and search indexability
4. **15 Modular Cards**: Flexible component architecture (hero, about, professional info, services, reviews, verification, stats, CTAs)
5. **Real-Time Statistics**: Live aggregations from bookings, reviews, profile_views without cached columns
6. **Role-Based Content**: Different professional info per role (TutorProfessionalInfo, ClientProfessionalInfo, AgentProfessionalInfo)
7. **Own Profile Detection**: Context-aware CTAs ("Edit My Profile" vs "Book Session")
8. **Mobile-Optimized**: 2-column desktop (2fr 1fr), stacked mobile, sticky sidebar, fixed bottom CTA
9. **Analytics Tracking**: ProfileViewTracker logs unique views for dashboard metrics
10. **Viral Discovery Loop**: Similar profiles card drives network effect

### Business Impact

- **SEO**: Server-rendered HTML with OpenGraph tags → indexable by Google, LinkedIn, WhatsApp
- **Viral Loop**: Shareable profile links with referral tracking → organic growth
- **Conversion**: Sticky CTA sidebar with "Book Session" → direct booking path
- **Social Proof**: Real-time stats (sessions, reviews, profile views) → trust building
- **Link Resilience**: 301 redirects preserve link juice when names change → no broken referrals

### Technical Highlights

- **Performance**: ~150ms TTFB, parallel queries via `Promise.all()`, materialized views for analytics
- **Security**: RLS policies, own profile detection, email/phone privacy protection
- **Scalability**: Materialized view `profile_view_counts` refreshed hourly via pg_cron
- **Developer Experience**: 15 reusable card components, standard styling pattern, CSS modules

---

## System Context

### Core Architecture Principles

1. **Permanent ID-Based Routing**: URLs use UUID + slug (`/public-profile/{id}/{slug}`) where ID is permanent and slug can change
2. **Slug Resilience**: Server validates slug on every request, 301 redirects if incorrect → shared links never break
3. **Server-Side Rendering**: Async Server Component fetches all data before render → fast TTFB, no loading spinners
4. **Component Modularity**: 15 independent card components → easy to add/remove/reorder
5. **Real-Time Aggregation**: Live calculations from bookings, reviews, profile_views → no stale cached columns
6. **Role-Based Content**: Different `professional_details` JSONB structure per role → flexible schema
7. **Own Profile Detection**: `isOwnProfile = user?.id === profile.id` → contextual CTAs
8. **Analytics Tracking**: ProfileViewTracker logs views with session deduplication → accurate unique view counts

### Data Model

```
┌────────────────────────────────────────────────────────────────────┐
│  PUBLIC PROFILE DATA MODEL                                         │
└────────────────────────────────────────────────────────────────────┘

profiles (Core Table)
├── id (UUID PRIMARY KEY)
├── user_id (UUID FK → auth.users)
├── full_name, first_name, last_name
├── slug (TEXT UNIQUE) ← Auto-generated from full_name
├── avatar_url, bio
├── active_role (TEXT) ← 'tutor', 'client', 'agent'
├── professional_details (JSONB) ← Role-specific data
│   ├── tutor: { qualifications, subjects, experience_years }
│   ├── client: { learning_goals, preferred_subjects }
│   └── agent: { agency_name, tutors_managed }
├── city, country
├── identity_verified, dbs_verified, proof_of_address_verified
└── created_at, updated_at

listings (1:many)
├── profile_id (FK → profiles.id)
├── title, description
├── subjects[], levels[]
├── hourly_rate, service_type
├── status ('published' | 'draft' | 'unpublished')
└── created_at

profile_reviews (many:many via bookings)
├── reviewer_id (FK → profiles.id)
├── reviewee_id (FK → profiles.id)
├── session_id (FK → bookings.id)
├── rating (1-5 INTEGER)
├── comment (TEXT)
└── created_at

bookings (Statistics Source)
├── student_id (FK → profiles.id)
├── tutor_id (FK → profiles.id)
├── status ('Completed' | 'Cancelled' | 'Pending')
└── created_at

profile_views (Analytics)
├── profile_id (FK → profiles.id)
├── viewer_id (FK → profiles.id) ← NULL for anonymous
├── session_id (TEXT) ← Browser session for dedup
├── referrer_source (TEXT) ← 'search', 'listing', 'referral'
└── viewed_at (TIMESTAMPTZ)

profile_view_counts (Materialized View - Fast Reads)
├── profile_id (UNIQUE)
├── total_views (INTEGER)
├── unique_viewers (INTEGER)
├── unique_sessions (INTEGER)
└── last_viewed_at (TIMESTAMPTZ)
```

### System Integrations

The Public Profile feature integrates with **10 major platform systems**:

1. [Authentication](#1-authentication-integration-critical) - Own profile detection, session management
2. [Listings](#2-listings-integration) - Service offerings display
3. [Reviews](#3-reviews-integration-6-way-mutual-review-system) - Rating and comment display
4. [Bookings](#4-bookings-integration-statistics) - Session count aggregation
5. [Analytics](#5-analytics-integration-profile-views) - View tracking and metrics
6. [CaaS](#6-caas-integration-credibility-scores) - Verification badges
7. [Hub Layout](#7-hub-layout-integration-own-profile-editing) - Account editing
8. [Marketplace](#8-marketplace-integration-discovery) - Similar profiles discovery
9. [Slugify Utility](#9-slugify-utility-integration) - URL generation
10. [SEO & Metadata](#10-seo--metadata-integration) - OpenGraph tags

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  PUBLIC PROFILE PAGE FLOW (Server Component)                        │
└─────────────────────────────────────────────────────────────────────┘

1. User Request
   ↓
   GET /public-profile/{id}/{slug}
   ↓
2. Next.js Server Component Execution
   ┌──────────────────────────────────────────────────────────┐
   │ STEP 1: Fetch profile by ID only (permanent lookup)     │
   │   SELECT * FROM profiles WHERE id = :id                  │
   │                                                           │
   │ STEP 2: Validate slug (301 redirect if wrong)           │
   │   correctSlug = profile.slug || generateSlug(full_name)  │
   │   IF urlSlug !== correctSlug THEN                        │
   │     redirect(301, /public-profile/:id/:correctSlug)      │
   │                                                           │
   │ STEP 3: Get current user (auth check)                   │
   │   user = await supabase.auth.getUser()                   │
   │   isOwnProfile = user?.id === profile.id                 │
   │                                                           │
   │ STEP 4-7: Parallel data fetching (Promise.all)          │
   │   ┌─────────────────────────────────────────┐           │
   │   │ 4. Fetch listings (status = 'published')│           │
   │   │ 5. Fetch reviews (with reviewer info)   │           │
   │   │ 6. Fetch similar profiles (same role)   │           │
   │   │ 7. Fetch current user profile           │           │
   │   └─────────────────────────────────────────┘           │
   │                                                           │
   │ STEP 8: Calculate real-time statistics                  │
   │   - Average rating from profile_reviews                  │
   │   - Sessions completed from bookings                     │
   │   - Profile views from materialized view                 │
   │   - Unique tutors/clients worked with                    │
   │                                                           │
   │ STEP 9: Augment profile with stats                      │
   │   enrichedProfile = {                                    │
   │     ...profile,                                          │
   │     average_rating, total_reviews,                       │
   │     sessions_completed, profile_views                    │
   │   }                                                      │
   │                                                           │
   │ STEP 10: Render with enriched data                      │
   │   <ProfileHeroSection profile={enrichedProfile} />       │
   │   <AboutCard profile={enrichedProfile} />                │
   │   <ServicesCard listings={listings} />                   │
   │   ...                                                    │
   └──────────────────────────────────────────────────────────┘
   ↓
3. Server Response (Fully Rendered HTML)
   ↓
   200 OK + HTML (TTFB ~150ms)
   ↓
4. Client Hydration
   ┌──────────────────────────────────────────┐
   │ - ProfileViewTracker logs view           │
   │ - MobileBottomCTA adds fixed bar         │
   │ - Interactive cards become clickable     │
   └──────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│  LAYOUT STRUCTURE (2-Column Desktop, Stacked Mobile)                │
└─────────────────────────────────────────────────────────────────────┘

Desktop (> 1024px):
┌─────────────────────────────────────────────────────────────────────┐
│ ProfileHeroSection (avatar, name, role, quick stats)               │
│ [Full Width, 1-column]                                              │
├────────────────────────────────┬────────────────────────────────────┤
│ Main Column (2fr)              │ Sidebar Column (1fr)               │
│                                │                                    │
│ - AboutCard                    │ - VerificationCard                │
│ - ProfessionalInfoCard         │ - RoleStatsCard                   │
│ - ServicesCard (max 5)         │ - GetInTouchCard (STICKY)         │
│ - AvailabilityScheduleCard     │                                    │
│ - ReviewsCard                  │                                    │
│                                │                                    │
├────────────────────────────────┴────────────────────────────────────┤
│ SimilarProfilesCard (full width)                                    │
│ [Drives viral discovery loop]                                       │
└─────────────────────────────────────────────────────────────────────┘

Mobile (< 768px):
┌─────────────────────────────────────────┐
│ ProfileHeroSection                      │
├─────────────────────────────────────────┤
│ AboutCard                               │
│ VerificationCard                        │
│ RoleStatsCard                           │
│ ProfessionalInfoCard                    │
│ ServicesCard                            │
│ AvailabilityScheduleCard                │
│ ReviewsCard                             │
│ SimilarProfilesCard                     │
├─────────────────────────────────────────┤
│ MobileBottomCTA (FIXED BOTTOM)          │
│ [Book Now] [Message]                    │
└─────────────────────────────────────────┘
```

---

## Integration Points

### 1. **Authentication Integration** (CRITICAL)

**Purpose**: Detect if viewer is the profile owner to show context-appropriate CTAs

**Tables Used**:
- `auth.users` - Current user session
- `profiles` - Profile owner ID

**Key Logic**:
```typescript
// File: apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx
// Lines: 105-106

const { data: { user } } = await supabase.auth.getUser();
const isOwnProfile = user?.id === profile.id;

// Result:
// isOwnProfile = true  → Show "Edit My Profile", hide "Book Session"
// isOwnProfile = false → Show "Book Session", "Message", "Connect"
```

**Integration Points**:
1. **GetInTouchCard** (Sidebar CTA):
   ```typescript
   {isOwnProfile ? (
     <Button href="/account/personal-info">Edit My Profile</Button>
   ) : (
     <>
       <Button href={`/book/${profile.id}`}>Book Session</Button>
       <Button href={`/messages/new?to=${profile.id}`}>Message</Button>
     </>
   )}
   ```

2. **MobileBottomCTA** (Mobile Fixed Bar):
   ```typescript
   {!isOwnProfile && (
     <MobileBottomCTA profile={profile} currentUser={currentUserProfile} />
   )}
   ```

3. **ServicesCard** (Listing Badge):
   ```typescript
   {isOwnProfile ? (
     <button onClick={() => router.push('/listings')}>
       {totalCount} {/* Clickable badge */}
     </button>
   ) : (
     <span>{totalCount}</span> {/* Static badge */}
   )}
   ```

**Security**: Uses Supabase Auth session token, server-side only (no client exposure)

**Error Handling**: If `getUser()` fails, treats as anonymous (isOwnProfile = false)

---

### 2. **Listings Integration**

**Purpose**: Display active service offerings with clickable links to listing detail pages

**Tables Used**:
- `listings` - Service offerings table

**Query**:
```typescript
// File: apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx
// Lines: 124-129

const { data: listings } = await supabase
  .from('listings')
  .select('id, title, description, hourly_rate, service_type, subjects, levels, slug, created_at')
  .eq('profile_id', profile.id)
  .eq('status', 'published')  // Only show published listings
  .order('created_at', { ascending: false });
```

**Display Logic**:
```typescript
// File: apps/web/src/app/components/feature/public-profile/ServicesCard.tsx
// Lines: 36-66

const MAX_LISTINGS_SHOWN = 5;

// Filter out current listing (if viewing from listing detail page)
const filteredListings = excludeListingId
  ? listings.filter(listing => listing.id !== excludeListingId)
  : listings;

const totalCount = filteredListings.length;
const displayedListings = filteredListings.slice(0, MAX_LISTINGS_SHOWN);
const hasMore = totalCount > MAX_LISTINGS_SHOWN;

// Badge behavior
{isOwnProfile ? (
  <button onClick={() => router.push('/listings')}>
    {totalCount}  // Clickable → navigates to hub
  </button>
) : (
  <span>{totalCount}</span>  // Static count
)}
```

**Link Format**:
```typescript
// Clicking a listing navigates to:
`/listings/${listing.id}/${listing.slug}`
// Example: /listings/abc123/gcse-maths-tutoring
```

**Empty State**:
```typescript
{totalCount === 0 && (
  <p>{firstName} hasn't listed any services yet.</p>
)}
```

**Integration with Listing Details**: The `excludeListingId` prop allows embedding ServicesCard on listing detail pages without showing duplicate of current listing.

---

### 3. **Reviews Integration** (6-Way Mutual Review System)

**Purpose**: Display verified reviews from completed booking sessions

**Tables Used**:
- `profile_reviews` - Review records
- `profiles` - Reviewer information (name, avatar)
- `booking_review_sessions` - Session verification (status = 'published')

**Query**:
```typescript
// File: apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx
// Lines: 134-153

const { data: reviews } = await supabase
  .from('profile_reviews')
  .select(`
    id,
    rating,
    comment,
    created_at,
    reviewer:profiles!profile_reviews_reviewer_id_fkey (
      id,
      full_name,
      avatar_url
    ),
    session:booking_review_sessions!profile_reviews_session_id_fkey (
      status
    )
  `)
  .eq('reviewee_id', profile.id)
  .eq('session.status', 'published')  // Only show published reviews
  .order('created_at', { ascending: false })
  .limit(10);
```

**Data Transformation**:
```typescript
// Transform nested joins into flat structure for ReviewsCard
const transformedReviews = (reviews || []).map((review: any) => ({
  id: review.id,
  reviewer_id: review.reviewer?.id || '',
  reviewer_name: review.reviewer?.full_name || 'Anonymous',
  reviewer_avatar_url: review.reviewer?.avatar_url,
  rating: review.rating,
  comment: review.comment,
  verified_booking: true,  // All profile reviews are from verified bookings
  created_at: review.created_at,
}));
```

**Average Rating Calculation** (Real-Time):
```typescript
// Lines: 183-191
const { data: reviewStats } = await supabase
  .from('profile_reviews')
  .select('rating')
  .eq('reviewee_id', profile.id);

const reviewCount = reviewStats?.length || 0;
const averageRating = reviewCount > 0
  ? reviewStats!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
  : 0;

// Augment profile
enrichedProfile.average_rating = Math.round(averageRating * 10) / 10;  // 4.7
enrichedProfile.total_reviews = reviewCount;  // 23
```

**Display**: ReviewsCard component shows list of reviews with 5-star rating display, reviewer avatar, and comment text.

---

### 4. **Bookings Integration** (Statistics)

**Purpose**: Calculate real-time session statistics without relying on cached columns

**Tables Used**:
- `bookings` - Session records

**Queries**:
```typescript
// File: apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx
// Lines: 194-234

// Sessions as Student
const { count: sessionsAsStudent } = await supabase
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .eq('student_id', profile.id)
  .eq('status', 'Completed');

// Sessions as Tutor
const { count: sessionsAsTutor } = await supabase
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .eq('tutor_id', profile.id)
  .eq('status', 'Completed');

// Total sessions
const sessionsCompleted = (sessionsAsStudent || 0) + (sessionsAsTutor || 0);

// Unique Tutors Worked With (for clients)
const { data: uniqueTutors } = await supabase
  .from('bookings')
  .select('tutor_id')
  .eq('student_id', profile.id)
  .eq('status', 'Completed');

const tutorsWorkedWith = uniqueTutors
  ? new Set(uniqueTutors.map(b => b.tutor_id).filter(Boolean)).size
  : 0;

// Unique Clients Worked With (for tutors)
const { data: uniqueClients } = await supabase
  .from('bookings')
  .select('student_id')
  .eq('tutor_id', profile.id)
  .eq('status', 'Completed');

const clientsWorkedWith = uniqueClients
  ? new Set(uniqueClients.map(b => b.student_id).filter(Boolean)).size
  : 0;
```

**Augment Profile**:
```typescript
enrichedProfile.sessions_completed = sessionsCompleted;
enrichedProfile.tutors_worked_with = tutorsWorkedWith;
enrichedProfile.clients_worked_with = clientsWorkedWith;
```

**Display**: RoleStatsCard shows:
- **Tutors**: "Sessions Completed: 45 | Clients Worked With: 12"
- **Clients**: "Sessions Completed: 23 | Tutors Worked With: 5"

---

### 5. **Analytics Integration** (Profile Views)

**Purpose**: Track unique profile views for social proof and analytics dashboard

**Tables Used**:
- `profile_views` - Individual view records
- `profile_view_counts` - Materialized view (refreshed hourly)

**Tracking Component**:
```typescript
// File: apps/web/src/app/components/feature/public-profile/ProfileViewTracker.tsx

'use client';
import { useEffect, useRef } from 'react';

export function ProfileViewTracker({ profileId, referrerSource }: ProfileViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const trackView = async () => {
      // Generate or retrieve session ID
      let sessionId = sessionStorage.getItem('viewer_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('viewer_session_id', sessionId);
      }

      // Track view via API
      await fetch(`/api/profiles/${profileId}/track-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          referrer_source: referrerSource || document.referrer || 'direct',
        }),
      });
    };

    // Track after 1 second delay
    const timeoutId = setTimeout(trackView, 1000);
    return () => clearTimeout(timeoutId);
  }, [profileId, referrerSource]);

  return null;  // Hidden component
}
```

**Deduplication Strategy**:
- Same session viewing same profile multiple times within 24 hours = 1 view
- Different sessions = unique views
- Anonymous and authenticated users both tracked

**Reading View Count** (Fast):
```typescript
// Query materialized view instead of aggregating profile_views
const { data: viewData } = await supabase
  .from('profile_view_counts')
  .select('total_views, unique_viewers, unique_sessions')
  .eq('profile_id', profile.id)
  .maybeSingle();

const profileViews = viewData?.total_views || 0;
```

**Materialized View Refresh**:
```sql
-- Scheduled via pg_cron (runs every hour at :00)
SELECT cron.schedule(
  'refresh-profile-view-counts',
  '0 * * * *',
  $$SELECT public.refresh_profile_view_counts();$$
);
```

**Rendering**:
```typescript
// In page.tsx
{!isOwnProfile && <ProfileViewTracker profileId={profile.id} />}
// Don't track own profile views
```

---

### 6. **CaaS Integration** (Credibility Scores)

**Purpose**: Display verification badges from Credibility-as-a-Service system

**Tables Used**:
- `profiles` - Verification flags

**Fields**:
```typescript
interface Profile {
  identity_verified: boolean;       // ID check (passport, driver's license)
  dbs_verified: boolean;             // DBS/background check (UK)
  proof_of_address_verified: boolean; // Utility bill, bank statement
}
```

**Display Component**:
```typescript
// File: apps/web/src/app/components/feature/public-profile/VerificationCard.tsx

export function VerificationCard({ profile }: VerificationCardProps) {
  const badges = [
    {
      label: 'Identity Verified',
      verified: profile.identity_verified,
      icon: <Shield className={styles.badgeIcon} />,
      tooltip: 'Government-issued ID verified'
    },
    {
      label: 'DBS Checked',
      verified: profile.dbs_verified,
      icon: <Check className={styles.badgeIcon} />,
      tooltip: 'Enhanced DBS background check completed'
    },
    {
      label: 'Address Verified',
      verified: profile.proof_of_address_verified,
      icon: <MapPin className={styles.badgeIcon} />,
      tooltip: 'Proof of address verified'
    },
  ];

  return (
    <Card>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Verification</h2>
      </div>
      <div className={styles.cardContent}>
        {badges.map((badge, index) => (
          <div key={index} className={styles.badgeRow}>
            <div className={badge.verified ? styles.badgeVerified : styles.badgeUnverified}>
              {badge.icon}
              <span>{badge.label}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

**Visual Treatment**:
- ✅ Verified: Green badge with check icon
- ⏳ Unverified: Gray badge with pending icon

**Link to CaaS**: "View Full Credibility Score" → `/caas/${profile.id}`

---

### 7. **Hub Layout Integration** (Own Profile Editing)

**Purpose**: Allow users to edit their own profile when viewing it

**Integration**:
```typescript
// GetInTouchCard.tsx
{isOwnProfile && (
  <Button href="/account/personal-info" variant="primary" fullWidth>
    Edit My Profile
  </Button>
)}
```

**Account Hub Sections**:
- Personal Info (`/account/personal-info`) - Name, bio, avatar, city
- Professional Info (`/account/professional-info`) - Qualifications, experience, subjects
- Verification (`/account/verification`) - Upload ID, DBS, proof of address
- Settings (`/account/settings`) - Email, phone, notifications

**Shared Components**:
- `ProfessionalInfoCard` reused in both public profile and account hub
- Same JSONB structure (`professional_details`) edited via forms

**Navigation**:
```typescript
// After editing in account hub
router.push(`/public-profile/${user.id}/${user.slug}`)
// Returns to public profile to see changes
```

---

### 8. **Marketplace Integration** (Discovery)

**Purpose**: Drive viral discovery via "Similar Profiles" card

**Query**:
```typescript
// File: apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx
// Lines: 171-176

const { data: similarProfiles } = await supabase
  .from('profiles')
  .select('id, full_name, avatar_url, city, active_role, slug, professional_details, average_rating, total_reviews')
  .eq('active_role', profile.active_role)  // Same role (tutor/client/agent)
  .neq('id', profile.id)  // Exclude current profile
  .limit(6);
```

**Display**:
```typescript
// SimilarProfilesCard.tsx
<div className={styles.profileGrid}>
  {similarProfiles.map(similarProfile => (
    <Link href={`/public-profile/${similarProfile.id}/${similarProfile.slug}`}>
      <Avatar src={similarProfile.avatar_url} />
      <h3>{similarProfile.full_name}</h3>
      <p>{similarProfile.city}</p>
      <Rating value={similarProfile.average_rating} />
    </Link>
  ))}
</div>
```

**Algorithm (Basic)**:
- Same role (tutor/client/agent)
- Random selection from pool
- Future: Subject overlap, city proximity, rating similarity

**Viral Loop**: Visitor clicks similar profile → views new profile → sees more similar profiles → endless discovery

---

### 9. **Slugify Utility Integration**

**Purpose**: Generate URL-friendly slugs from full names

**Implementation**:
```typescript
// File: apps/web/src/lib/utils/slugify.ts

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')       // Remove special chars
    .replace(/[\s_-]+/g, '-')       // Replace spaces with hyphens
    .replace(/^-+|-+$/g, '');       // Trim hyphens
}

// Examples:
generateSlug('John Smith')              → 'john-smith'
generateSlug('María García')            → 'mara-garca'
generateSlug('Dr. Sarah O\'Brien PhD')  → 'dr-sarah-obrien-phd'
```

**Collision Handling**:
```typescript
// If slug already exists, append numeric suffix
let slug = generateSlug(full_name);
let suffix = 2;

while (await slugExists(slug)) {
  slug = `${generateSlug(full_name)}-${suffix}`;
  suffix++;
}

// Result: john-smith, john-smith-2, john-smith-3
```

**Update Trigger**:
```typescript
// When full_name changes, regenerate slug
UPDATE profiles
SET slug = generateSlug(NEW.full_name)
WHERE id = :id
RETURNING slug;
```

**301 Redirect**:
```typescript
// Old URL: /public-profile/abc123/john-smith
// User changes name to "John Williams"
// New slug: john-williams
// Old URL now redirects:
redirect(301, `/public-profile/abc123/john-williams`)
```

---

### 10. **SEO & Metadata Integration**

**Purpose**: Optimize for search engines and social sharing

**Metadata Generation**:
```typescript
// File: apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx
// Lines: 46-73

export async function generateMetadata({ params }: PublicProfilePageProps) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, bio, active_role, avatar_url')
    .eq('id', params.id)
    .single();

  if (!profile) {
    return {
      title: 'Profile Not Found | Tutorwise',
    };
  }

  const roleLabel = profile.active_role === 'tutor' ? 'Tutor'
    : profile.active_role === 'agent' ? 'Agent'
    : 'Client';

  return {
    title: `${profile.full_name} - ${roleLabel} | Tutorwise`,
    description: profile.bio?.substring(0, 160) || `View ${profile.full_name}'s profile on Tutorwise`,
    openGraph: {
      title: `${profile.full_name} - ${roleLabel}`,
      description: profile.bio || `${profile.full_name} on Tutorwise`,
      images: [
        {
          url: profile.avatar_url || '/default-avatar.png',
          width: 1200,
          height: 630,
          alt: `${profile.full_name}'s profile picture`,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.full_name} - ${roleLabel}`,
      description: profile.bio?.substring(0, 160),
      images: [profile.avatar_url || '/default-avatar.png'],
    },
  };
}
```

**SEO Benefits**:
- ✅ Server-rendered HTML (no JS required for crawlers)
- ✅ Dynamic `<title>` and `<meta>` tags
- ✅ OpenGraph tags for LinkedIn, WhatsApp, Facebook rich previews
- ✅ Twitter Card tags for Twitter/X sharing
- ✅ 301 redirects preserve link juice when slug changes
- ✅ Semantic HTML (`<h1>`, `<h2>`, `<article>`, `<section>`)
- ✅ Image alt tags for avatars and photos

**Structured Data** (Future):
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "John Smith",
  "jobTitle": "Mathematics Tutor",
  "description": "Experienced GCSE and A-Level maths tutor...",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "23"
  }
}
```

---

## Database Schema

### Core Table: profiles

**Migration**: `000_create_profiles_table.sql`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (
    COALESCE(first_name || ' ' || last_name, display_name, email)
  ) STORED,

  -- Profile Slug (URL-friendly identifier)
  slug TEXT UNIQUE,  -- Auto-generated from full_name

  -- Profile Picture
  avatar_url TEXT,
  custom_picture_url TEXT,

  -- Bio
  bio TEXT,

  -- User Role
  active_role TEXT,  -- 'tutor', 'client', 'agent'
  roles TEXT[] DEFAULT '{}',

  -- Professional Details (JSONB for flexibility)
  professional_details JSONB,
  /*
    For tutors:
    {
      "tutor": {
        "qualifications": ["BSc Mathematics", "PGCE"],
        "subjects": ["Mathematics", "Physics"],
        "experience_years": 10,
        "teaching_style": "Interactive and visual"
      }
    }

    For clients:
    {
      "client": {
        "learning_goals": ["Improve GCSE maths grade", "Prepare for exams"],
        "preferred_subjects": ["Mathematics"],
        "preferred_learning_style": "Visual learner"
      }
    }

    For agents:
    {
      "agent": {
        "agency_name": "TutorPro Agency",
        "tutors_managed": 15,
        "specialization": "STEM subjects"
      }
    }
  */

  -- Contact & Location
  phone TEXT,
  country TEXT,
  city TEXT,
  timezone TEXT DEFAULT 'Europe/London',

  -- Verification & Trust (CaaS)
  identity_verified BOOLEAN DEFAULT false,
  dbs_verified BOOLEAN DEFAULT false,
  proof_of_address_verified BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,

  -- Cached Aggregates (Updated via triggers)
  average_rating DECIMAL(3,2),
  total_reviews INTEGER DEFAULT 0,

  -- Status
  profile_completed BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_profiles_slug ON profiles(slug);
CREATE INDEX idx_profiles_active_role ON profiles(active_role);
CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_roles ON profiles USING GIN(roles);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles (public access)
CREATE POLICY profiles_select_public ON profiles
  FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger to auto-generate slug on insert/update
CREATE OR REPLACE FUNCTION auto_generate_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR OLD.full_name <> NEW.full_name THEN
    NEW.slug := slugify(NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_auto_slug
  BEFORE INSERT OR UPDATE OF full_name ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug();
```

### Analytics Table: profile_views

**Migration**: `097_create_profile_views_table.sql`

```sql
CREATE TABLE profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- NULL for anonymous
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Deduplication & Analytics
  session_id TEXT,  -- Browser session ID (for dedup)
  referrer_source TEXT,  -- 'search', 'listing', 'referral', 'direct'
  user_agent TEXT,
  ip_address INET,

  CONSTRAINT profile_views_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  CONSTRAINT profile_views_viewer_id_fkey FOREIGN KEY (viewer_id) REFERENCES profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_profile_views_profile_id ON profile_views(profile_id);
CREATE INDEX idx_profile_views_viewer_id ON profile_views(viewer_id);
CREATE INDEX idx_profile_views_viewed_at ON profile_views(viewed_at DESC);
CREATE INDEX idx_profile_views_session_id ON profile_views(session_id);

-- Composite index for deduplication
CREATE INDEX idx_profile_views_dedup ON profile_views(profile_id, session_id, viewed_at DESC);

-- RLS Policies
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

-- Anyone can view profile views (for analytics)
CREATE POLICY "Anyone can view profile views"
  ON profile_views FOR SELECT USING (true);

-- Authenticated and anonymous users can insert views
CREATE POLICY "Anyone can insert views"
  ON profile_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

-- No updates or deletes (immutable log)
CREATE POLICY "No updates on profile views"
  ON profile_views FOR UPDATE USING (false);

CREATE POLICY "No deletes on profile views"
  ON profile_views FOR DELETE USING (false);
```

### Materialized View: profile_view_counts

**Migration**: `097_create_profile_views_table.sql`

```sql
-- Fast reads for profile view counts
CREATE MATERIALIZED VIEW profile_view_counts AS
SELECT
  profile_id,
  COUNT(*) as total_views,
  COUNT(DISTINCT viewer_id) as unique_viewers,
  COUNT(DISTINCT session_id) as unique_sessions,
  MAX(viewed_at) as last_viewed_at
FROM profile_views
GROUP BY profile_id;

-- Unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_profile_view_counts_profile_id
  ON profile_view_counts(profile_id);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_profile_view_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY profile_view_counts;
END;
$$;

-- Schedule refresh every hour via pg_cron
SELECT cron.schedule(
  'refresh-profile-view-counts',
  '0 * * * *',  -- Every hour at :00
  $$SELECT refresh_profile_view_counts();$$
);
```

---

## Key Functions & Components

### 1. Slug Validation & 301 Redirect

**Purpose**: Ensure URLs always use current slug, redirect if outdated

**Location**: `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx` (Lines 94-100)

**Logic**:
```typescript
// STEP 1: Fetch profile using ONLY the ID (permanent lookup)
const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', params.id)
  .single();

if (error || !profile) {
  notFound();
}

// STEP 2: Validate slug and 301 redirect if incorrect
const correctSlug = profile.slug || generateSlug(profile.full_name);
const urlSlug = params.slug?.[0] || '';

// If slug doesn't match, perform permanent redirect to correct URL
if (correctSlug !== urlSlug) {
  redirect(`/public-profile/${profile.id}/${correctSlug}`);
}

// Example:
// User visits: /public-profile/abc123/john-smith
// Profile full_name changed to "John Williams" → slug = "john-williams"
// Server redirects (301): /public-profile/abc123/john-williams
// Result: Shared links never break, SEO link juice preserved
```

**Why 301 Redirect?**
- Permanent redirect tells browsers/search engines to update their links
- Preserves referral tracking (UTM params carry through)
- No broken links when users change names (marriage, typo fixes, etc.)

---

### 2. Real-Time Statistics Aggregation

**Purpose**: Calculate live stats without relying on cached columns

**Location**: `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx` (STEP 8, Lines 183-261)

**Logic**:
```typescript
// ========================================
// Average Rating & Review Count
// ========================================
const { data: reviewStats } = await supabase
  .from('profile_reviews')
  .select('rating')
  .eq('reviewee_id', profile.id);

const reviewCount = reviewStats?.length || 0;
const averageRating = reviewCount > 0
  ? reviewStats!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
  : 0;

// ========================================
// Sessions Completed (as student or tutor)
// ========================================
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

// ========================================
// Reviews Given (as reviewer)
// ========================================
const { count: reviewsGiven } = await supabase
  .from('profile_reviews')
  .select('*', { count: 'exact', head: true })
  .eq('reviewer_id', profile.id);

// ========================================
// Unique Tutors/Clients Worked With
// ========================================
const { data: uniqueTutors } = await supabase
  .from('bookings')
  .select('tutor_id')
  .eq('student_id', profile.id)
  .eq('status', 'Completed');

const tutorsWorkedWith = uniqueTutors
  ? new Set(uniqueTutors.map(b => b.tutor_id).filter(Boolean)).size
  : 0;

const { data: uniqueClients } = await supabase
  .from('bookings')
  .select('student_id')
  .eq('tutor_id', profile.id)
  .eq('status', 'Completed');

const clientsWorkedWith = uniqueClients
  ? new Set(uniqueClients.map(b => b.student_id).filter(Boolean)).size
  : 0;

// ========================================
// Profile Views (from materialized view)
// ========================================
const { data: viewData } = await supabase
  .from('profile_view_counts')
  .select('total_views, unique_viewers, unique_sessions')
  .eq('profile_id', profile.id)
  .maybeSingle();

const profileViews = viewData?.total_views || 0;

// ========================================
// Free Sessions Count (for Community Tutor badge)
// ========================================
const { count: freeSessionsCount } = await supabase
  .from('free_sessions')
  .select('*', { count: 'exact', head: true })
  .eq('tutor_id', profile.id);

// ========================================
// Augment Profile with Calculated Stats
// ========================================
const enrichedProfile = {
  ...profile,
  average_rating: Math.round(averageRating * 10) / 10,  // Round to 1 decimal (4.7)
  total_reviews: reviewCount,
  sessions_completed: sessionsCompleted,
  reviews_given: reviewsGiven || 0,
  tutors_worked_with: tutorsWorkedWith,
  clients_worked_with: clientsWorkedWith,
  profile_views: profileViews,
  free_sessions_count: freeSessionsCount || 0,
} as Profile;
```

**Why Real-Time Aggregation?**
- ✅ Always accurate (no stale cached columns)
- ✅ No complex trigger logic to maintain
- ✅ Easier to debug (query source tables directly)
- ⚠️ Slightly slower (mitigated by parallel queries + materialized views)

**Performance**: Using `Promise.all()` for parallel queries reduces TTFB from ~400ms to ~150ms.

---

### 3. ServicesCard (Listing Display)

**Purpose**: Show up to 5 recent listings with count badge

**Location**: `apps/web/src/app/components/feature/public-profile/ServicesCard.tsx`

**Features**:
- MAX_LISTINGS_SHOWN = 5 constant
- Clickable badge (own profile) → navigates to `/listings` hub
- Static badge (other profiles) → shows count only
- excludeListingId prop filters out current listing (used on listing detail pages)
- 3-column grid: Title | Subjects/Levels | Price

**Logic**:
```typescript
const MAX_LISTINGS_SHOWN = 5;

export function ServicesCard({ profile, listings = [], isOwnProfile = false, excludeListingId }: ServicesCardProps) {
  const router = useRouter();
  const firstName = profile.first_name || profile.full_name?.split(' ')[0] || profile.full_name;

  // Filter out the excluded listing (e.g., current listing on detail page)
  const filteredListings = excludeListingId
    ? listings.filter(listing => listing.id !== excludeListingId)
    : listings;

  const totalCount = filteredListings.length;
  const displayedListings = filteredListings.slice(0, MAX_LISTINGS_SHOWN);
  const hasMore = totalCount > MAX_LISTINGS_SHOWN;

  const handleViewAllClick = () => {
    if (isOwnProfile) {
      router.push('/listings');  // Navigate to hub
    }
  };

  return (
    <Card className={styles.servicesCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Services</h2>
        {isOwnProfile ? (
          <button
            className={styles.countBadge}
            onClick={handleViewAllClick}
            type="button"
            aria-label={`View all ${totalCount} listings in Hub`}
          >
            {totalCount}
          </button>
        ) : (
          <span className={styles.countBadgeStatic}>
            {totalCount}
          </span>
        )}
      </div>
      <div className={styles.cardContent}>
        {totalCount === 0 ? (
          <div className={styles.emptyState}>
            <p>{firstName} hasn't listed any services yet.</p>
          </div>
        ) : (
          <div className={styles.listingsContainer}>
            {displayedListings.map((listing) => {
              const subjects = listing.subjects || [];
              const levels = listing.levels || [];

              return (
                <button
                  key={listing.id}
                  className={styles.listingRow}
                  onClick={() => router.push(`/listings/${listing.id}/${listing.slug}`)}
                  type="button"
                >
                  <div className={styles.listingTitle}>{listing.title}</div>
                  <div className={styles.listingMeta}>
                    {subjects.slice(0, 3).join(', ')}
                    {subjects.length > 3 && ` +${subjects.length - 3} more`}
                    {levels.length > 0 && ` • ${levels.join(', ')}`}
                  </div>
                  <div className={styles.listingPrice}>
                    {listing.hourly_rate ? `£${listing.hourly_rate}/hr` : '—'}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
```

**Empty State**: If no listings, shows "{firstName} hasn't listed any services yet."

---

### 4. ProfileViewTracker (Analytics)

**Purpose**: Log unique profile views for analytics dashboard

**Location**: `apps/web/src/app/components/feature/public-profile/ProfileViewTracker.tsx`

**Features**:
- Client component (runs in browser)
- Logs view on mount with 1-second delay
- Excludes own profile views
- Session-based deduplication (max 1 view per 24 hours per session)
- Tracks referrer source

**Logic**:
```typescript
'use client';

import { useEffect, useRef } from 'react';

interface ProfileViewTrackerProps {
  profileId: string;
  referrerSource?: string;
}

export function ProfileViewTracker({ profileId, referrerSource }: ProfileViewTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    // Only track once per page load
    if (tracked.current) return;
    tracked.current = true;

    const trackView = async () => {
      try {
        // Generate or retrieve session ID from sessionStorage
        let sessionId = sessionStorage.getItem('viewer_session_id');
        if (!sessionId) {
          sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          sessionStorage.setItem('viewer_session_id', sessionId);
        }

        // Track the view via API
        await fetch(`/api/profiles/${profileId}/track-view`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            referrer_source: referrerSource || document.referrer || 'direct',
          }),
        });

        // Silently fail - don't show errors to user
      } catch (error) {
        console.debug('Profile view tracking failed:', error);
      }
    };

    // Track after a short delay to ensure page is fully loaded
    const timeoutId = setTimeout(trackView, 1000);

    return () => clearTimeout(timeoutId);
  }, [profileId, referrerSource]);

  // This component doesn't render anything
  return null;
}
```

**API Endpoint**: `/api/profiles/[id]/track-view`
```typescript
export async function POST(req: Request) {
  const { session_id, referrer_source } = await req.json();
  const { user } = await supabase.auth.getUser();

  // Insert view record
  await supabase.from('profile_views').insert({
    profile_id: profileId,
    viewer_id: user?.id || null,  // NULL for anonymous
    session_id,
    referrer_source,
    user_agent: req.headers.get('user-agent'),
    ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
  });

  return new Response(null, { status: 204 });
}
```

**Rendering**:
```typescript
// In page.tsx
{!isOwnProfile && <ProfileViewTracker profileId={profile.id} />}
// Don't track own profile views
```

---

### 5. GetInTouchCard (CTA Sidebar)

**Purpose**: Sticky sidebar card with contact actions

**Location**: `apps/web/src/app/components/feature/public-profile/GetInTouchCard.tsx`

**CTAs**:
- **Own Profile**: "Edit My Profile" → `/account/personal-info`
- **Other Profile (Authenticated)**:
  - "Send Message" → Opens conversation
  - "Book Session" → Redirects to booking flow
  - "Share Profile" → Generates referral link (viral loop)
- **Other Profile (Anonymous)**:
  - "Book Session" → Redirects to signup with booking intent
  - "Sign Up to Message" → Redirects to signup

**Sticky Behavior**:
```css
.getInTouchCard {
  position: sticky;
  top: 80px; /* Below header */
  height: fit-content;
}

@media (max-width: 768px) {
  /* Hidden on mobile - uses MobileBottomCTA instead */
  display: none;
}
```

**Code**:
```typescript
export function GetInTouchCard({ profile, currentUser }: GetInTouchCardProps) {
  const router = useRouter();
  const isOwnProfile = currentUser?.id === profile.id;

  if (isOwnProfile) {
    return (
      <Card className={styles.getInTouchCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Manage Profile</h2>
        </div>
        <div className={styles.cardContent}>
          <Button
            href="/account/personal-info"
            variant="primary"
            fullWidth
          >
            Edit My Profile
          </Button>
          <Button
            href={`/public-profile/${profile.id}/${profile.slug}`}
            variant="outline"
            fullWidth
          >
            Preview Public View
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.getInTouchCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Get in Touch</h2>
      </div>
      <div className={styles.cardContent}>
        {currentUser ? (
          <>
            <Button
              href={`/book/${profile.id}`}
              variant="primary"
              fullWidth
            >
              Book Session
            </Button>
            <Button
              href={`/messages/new?to=${profile.id}`}
              variant="outline"
              fullWidth
            >
              Send Message
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              fullWidth
              icon={<Share2 size={18} />}
            >
              Share Profile
            </Button>
          </>
        ) : (
          <>
            <Button
              href={`/signup?intent=book&profile=${profile.id}`}
              variant="primary"
              fullWidth
            >
              Book Session
            </Button>
            <Button
              href="/signup"
              variant="outline"
              fullWidth
            >
              Sign Up to Message
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
```

---

## Component Architecture

### Card Components (15 Total)

**Standard Card Pattern** (Consistent Across All Cards):

```typescript
'use client';

import Card from '@/app/components/ui/data-display/Card';
import type { Profile } from '@/types';
import styles from './YourCard.module.css';

interface YourCardProps {
  profile: Profile;
  isOwnProfile?: boolean;
}

export function YourCard({ profile, isOwnProfile = false }: YourCardProps) {
  return (
    <Card className={styles.yourCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Card Title</h2>
      </div>
      <div className={styles.cardContent}>
        {/* Card content */}
      </div>
    </Card>
  );
}
```

**Standard CSS Pattern**:

```css
.yourCard {
  padding: 0 !important; /* Override Card default */
}

.cardHeader {
  padding: 12px 16px;
  background-color: #E6F0F0;        /* Light teal */
  border-bottom: 1px solid #e5e7eb;
  border-radius: 8px 8px 0 0;       /* Top corners rounded */
}

.cardTitle {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  line-height: 1.4;
}

.cardContent {
  padding: 16px;
}

@media (max-width: 768px) {
  .cardHeader {
    padding: 10px 12px;
  }

  .cardTitle {
    font-size: 14px;
  }

  .cardContent {
    padding: 12px;
  }
}
```

### Card Component List

**Hero Section** (Full Width, 1-column):
1. **ProfileHeroSection** - Avatar (left), name/role/quick stats (center), empty space (right for future CTAs)

**Main Content Cards** (Left Column, 2fr):
2. **AboutCard** - Bio text with "Read More" expansion
3. **ProfessionalInfoCard** - Role-specific professional details (qualifications, experience, subjects)
4. **ServicesCard** - Listings (max 5 with count badge, clickable to listing detail)
5. **AvailabilityScheduleCard** - Weekly availability grid (Mon-Sun, morning/afternoon/evening)
6. **ReviewsCard** - Reviews with 5-star ratings, reviewer avatar, comment text

**Sidebar Cards** (Right Column, 1fr):
7. **VerificationCard** - Identity, DBS, address verification badges (green check or gray pending)
8. **RoleStatsCard** - Sessions completed, reviews, tutors/clients worked with
9. **GetInTouchCard** - Sticky CTAs (Edit My Profile / Book Session / Message)

**Related Section** (Full Width, 1-column):
10. **SimilarProfilesCard** - Grid of 6 similar profiles (same role, random selection)

**Mobile-Only**:
11. **MobileBottomCTA** - Fixed bottom bar with "Book Now" and "Message" buttons

**Analytics** (Hidden):
12. **ProfileViewTracker** - Logs profile views (client-side, no visual rendering)

**Additional Cards** (Context-Dependent):
13. **AvailabilityCard** - Simplified availability overview (less detailed than AvailabilityScheduleCard)
14. **IntroductionCard** - Brief intro text (alternative to AboutCard)
15. **CredibilityScoreCard** - CaaS score display with breakdown link

---

## SEO & Performance Optimization

### SEO Features

1. **Server-Side Rendering**: Fully rendered HTML for crawlers (no JS required)
2. **Dynamic Metadata**: OpenGraph and Twitter Card tags with profile info
3. **Permanent URLs**: ID-based routing (`/public-profile/{id}/{slug}`)
4. **301 Redirects**: Old slugs redirect to current, preserving link juice
5. **Semantic HTML**: Proper heading hierarchy (`<h1>`, `<h2>`, `<h3>`)
6. **Image Alt Tags**: Avatar and photos have descriptive alt text
7. **Structured Data** (Future): JSON-LD for Person schema

**Example Metadata**:
```html
<title>John Smith - Tutor | Tutorwise</title>
<meta name="description" content="Experienced GCSE and A-Level maths tutor with 10 years of teaching experience..." />

<!-- OpenGraph -->
<meta property="og:title" content="John Smith - Tutor" />
<meta property="og:description" content="Experienced GCSE and A-Level maths tutor..." />
<meta property="og:image" content="https://tutorwise.com/avatars/john-smith.jpg" />
<meta property="og:type" content="profile" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="John Smith - Tutor" />
<meta name="twitter:description" content="Experienced GCSE and A-Level maths tutor..." />
<meta name="twitter:image" content="https://tutorwise.com/avatars/john-smith.jpg" />
```

### Performance Optimizations

**1. Parallel Queries**:
```typescript
// GOOD: Parallel queries (fast) - 150ms TTFB
const [listings, reviews, similarProfiles, currentUserProfile] = await Promise.all([
  supabase.from('listings').select('*').eq('profile_id', profile.id),
  supabase.from('profile_reviews').select('*').eq('reviewee_id', profile.id),
  supabase.from('profiles').select('*').eq('active_role', profile.active_role).limit(6),
  user ? supabase.from('profiles').select('*').eq('id', user.id).single() : Promise.resolve(null),
]);

// BAD: Sequential queries (slow) - 400ms TTFB
const listings = await supabase.from('listings').select('*');
const reviews = await supabase.from('profile_reviews').select('*');
const similarProfiles = await supabase.from('profiles').select('*');
```

**2. Materialized Views**:
```sql
-- Fast reads for profile view counts (instant vs 500ms aggregation)
SELECT total_views FROM profile_view_counts WHERE profile_id = :id;
-- vs
SELECT COUNT(*) FROM profile_views WHERE profile_id = :id;  -- Slow for millions of rows
```

**3. Image Optimization**:
```typescript
import Image from 'next/image';

<Image
  src={profile.avatar_url}
  alt={`${profile.full_name}'s avatar`}
  width={192}
  height={192}
  priority  // For above-fold hero image
/>
```

**4. Component Code Splitting**: Next.js auto-splits by route

**5. CSS Modules**: Scoped styles prevent global conflicts, tree-shaking removes unused CSS

**6. Conditional Rendering**: Analytics components only when needed (`{!isOwnProfile && <ProfileViewTracker />}`)

### Performance Targets

- **TTFB**: < 200ms (currently ~150ms with parallel queries)
- **LCP**: < 1.5s (largest contentful paint - hero section)
- **FID**: < 100ms (first input delay - button clicks)
- **CLS**: < 0.1 (cumulative layout shift - no layout jumps)

**Monitoring**: Web Vitals tracked via Vercel Analytics

---

## Security & Privacy

### Row-Level Security (RLS) Policies

**profiles table**:
```sql
-- Anyone can view profiles (public access)
CREATE POLICY profiles_select_public ON profiles
  FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**listings table**:
```sql
-- Only show published listings
CREATE POLICY listings_select_published ON listings
  FOR SELECT
  USING (status = 'published');

-- Users can view own listings (any status)
CREATE POLICY listings_select_own ON listings
  FOR SELECT
  USING (auth.uid() = profile_id);
```

**profile_reviews table**:
```sql
-- Only show published reviews (verified bookings)
CREATE POLICY reviews_select_published ON profile_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM booking_review_sessions
      WHERE id = profile_reviews.session_id
      AND status = 'published'
    )
  );
```

**profile_views table**:
```sql
-- Anyone can view profile views (for analytics)
CREATE POLICY profile_views_select ON profile_views
  FOR SELECT
  USING (true);

-- Anyone can insert views (authenticated or anonymous)
CREATE POLICY profile_views_insert ON profile_views
  FOR INSERT
  WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

-- No updates or deletes (immutable log)
CREATE POLICY profile_views_no_update ON profile_views
  FOR UPDATE USING (false);

CREATE POLICY profile_views_no_delete ON profile_views
  FOR DELETE USING (false);
```

### Data Privacy

**Hidden Fields** (Never Displayed on Public Profile):
- ✅ Email (personal contact info)
- ✅ Phone number (personal contact info)
- ✅ Full address (only city/country shown)
- ✅ User ID from `auth.users` (internal identifier)
- ✅ Booking details (only aggregated counts shown)

**Displayed Fields** (Public):
- ✅ Full name, avatar, bio
- ✅ Active role (tutor/client/agent)
- ✅ Professional details (qualifications, subjects, experience)
- ✅ City, country
- ✅ Verification badges (identity, DBS, address)
- ✅ Aggregated statistics (sessions, reviews, profile views)
- ✅ Published listings
- ✅ Published reviews

---

## Mobile Responsiveness

### Breakpoints

```css
/* Mobile: < 768px */
.bodySection {
  display: flex;
  flex-direction: column;  /* Stacked layout */
  gap: 16px;
}

.getInTouchCard {
  display: none;  /* Hidden on mobile */
}

.mobileBottomCTA {
  display: flex;  /* Fixed bottom bar */
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

/* Tablet: 768px - 1024px */
.bodySection {
  display: grid;
  grid-template-columns: 1fr 1fr;  /* Equal columns */
  gap: 24px;
}

/* Desktop: > 1024px */
.bodySection {
  display: grid;
  grid-template-columns: 2fr 1fr;  /* Main (2fr) | Sidebar (1fr) */
  gap: 24px;
}

.sidebarColumn {
  position: sticky;
  top: 80px;  /* Below header */
  height: fit-content;
}

.mobileBottomCTA {
  display: none;  /* Hidden on desktop */
}
```

### Mobile-Specific Features

1. **MobileBottomCTA**: Fixed bottom bar with "Message" and "Book Now" buttons
2. **Simplified Cards**: Reduced padding, smaller fonts
3. **Stacked Layout**: All cards in single column
4. **Touch-Optimized**: Larger tap targets (44x44px minimum)
5. **Hidden GetInTouchCard**: Replaced by MobileBottomCTA

---

## Testing Checklist

When modifying the public profile feature, test:

- [ ] **Slug Validation**: Correct slug loads, wrong slug → 301 redirect
- [ ] **Name Change**: Change name → slug updates → old URL redirects
- [ ] **Own Profile Detection**: View own profile → "Edit My Profile" button
- [ ] **Other Profile View**: View other profile → "Book Session", "Message" buttons
- [ ] **Listings Display**: Max 5 listings shown, clickable badge on own profile
- [ ] **Reviews Display**: Only verified bookings (status = 'published') shown
- [ ] **Statistics Accuracy**: Sessions, reviews, views match database
- [ ] **Mobile Layout**: Stacked cards, fixed bottom CTA, no sidebar
- [ ] **Desktop Layout**: 2-column (2fr 1fr), sticky sidebar, no bottom CTA
- [ ] **SEO Metadata**: Title, description, OpenGraph tags populated
- [ ] **Analytics Tracking**: ProfileViewTracker logs view (check `profile_views` table)
- [ ] **Performance**: TTFB < 200ms, no layout shift
- [ ] **Anonymous Access**: Page loads without authentication
- [ ] **Authenticated Access**: Own profile CTAs different from other profiles

---

## Migration Guidelines

When adding new features to public profiles:

1. **New Card Component**: Create in `/components/feature/public-profile/YourCard.tsx`
2. **Follow Card Pattern**: Use standard header styling, padding override (`padding: 0 !important`)
3. **Add to Page**: Import and place in appropriate column (main or sidebar)
4. **Mobile Responsive**: Add `@media (max-width: 768px)` queries
5. **Own Profile Logic**: Check `isOwnProfile` for conditional rendering
6. **Statistics**: Aggregate in page.tsx STEP 8, add to `enrichedProfile` object
7. **Testing**: Verify mobile, tablet, desktop views

**Example**: Adding "CertificationsCard"

```typescript
// 1. Create component
// File: apps/web/src/app/components/feature/public-profile/CertificationsCard.tsx
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

---

## Gap Analysis

### Current Gaps

**1. Semantic Search** (Planned v5.0):
- **Current**: No profile search by bio/skills
- **Planned**: Full-text search across bios, professional_details
- **Impact**: Marketplace discovery limited to role/city filters

**2. Profile Completeness Indicator** (Planned v4.10):
- **Current**: No visual indicator of profile completion
- **Planned**: Progress bar (e.g., "Profile 80% Complete")
- **Impact**: Users don't know what's missing

**3. Share Analytics** (Planned v5.1):
- **Current**: No tracking of shared profile links
- **Planned**: UTM param tracking, referral source analysis
- **Impact**: Can't measure viral loop effectiveness

**4. Structured Data for SEO** (Planned v5.2):
- **Current**: No JSON-LD schema.org markup
- **Planned**: Person, Review schemas
- **Impact**: Rich snippets not displayed in Google search results

**5. Multi-Language Support** (Planned v6.0):
- **Current**: English-only profiles
- **Planned**: Translate bio, professional_details
- **Impact**: International users excluded

---

## Glossary

**CaaS**: Credibility-as-a-Service - Platform system for verification badges (identity, DBS, address)

**DBS**: Disclosure and Barring Service - UK background check for working with children/vulnerable adults

**JSONB**: PostgreSQL data type for flexible JSON storage with indexing

**LCP**: Largest Contentful Paint - Core Web Vital measuring largest visible element load time

**Materialized View**: Cached query result stored as a table, refreshed periodically

**OpenGraph**: Meta tag protocol for rich social media previews (Facebook, LinkedIn, WhatsApp)

**RLS**: Row-Level Security - PostgreSQL feature for data access control at row level

**Slug**: URL-friendly identifier (e.g., "john-smith" from "John Smith")

**TTFB**: Time to First Byte - Measure of server response speed

**Viral Loop**: Self-perpetuating growth mechanism (user shares profile → new user signs up → shares their profile)

---

## Related Documentation

- [Public Profile README](./README.md) - Quick reference
- [Public Profile Implementation](./public-profile-implementation.md) - Developer guide
- [Public Profile Prompt](./public-profile-prompt.md) - AI assistant context
- [Listings Solution Design](../listings/listings-solution-design.md) - ServicesCard integration
- [Reviews Solution Design](../reviews/reviews-solution-design.md) - ReviewsCard integration
- [Hub Layout Documentation](../hub-layout/README.md) - Account editing
- [CaaS Solution Design](../caas/caas-solution-design.md) - Verification badges

---

**Last Updated**: 2025-12-12
**Version**: v4.9 (Redesign with 2-Column Layout)
**Maintainer**: Frontend Team
**Status**: Active - 95% Complete
**For Questions**: See public-profile-implementation.md or ask team lead
