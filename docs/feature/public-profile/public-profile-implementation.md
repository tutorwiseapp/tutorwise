# Public Profile Feature - Implementation Guide

**Version**: v4.9
**Date**: 2025-12-12
**Target Audience**: Developers
**Purpose**: Step-by-step guide for implementing and modifying public profiles

---

## File Structure

```
apps/web/src/
  app/
    public-profile/[id]/[[...slug]]/
      page.tsx                           # Main Server Component (CRITICAL)
      page.module.css

    components/feature/public-profile/
      ProfileHeroSection.tsx             # Avatar, name, role, stats
      ProfileHeroSection.module.css
      AboutCard.tsx                      # Bio text
      AboutCard.module.css
      ProfessionalInfoCard.tsx           # Role-specific professional details
      ProfessionalInfoCard.module.css
      ServicesCard.tsx                   # Listings (max 5)
      ServicesCard.module.css
      AvailabilityScheduleCard.tsx       # Weekly availability grid
      AvailabilityScheduleCard.module.css
      ReviewsCard.tsx                    # Reviews with ratings
      ReviewsCard.module.css
      VerificationCard.tsx               # Identity, DBS, address badges
      VerificationCard.module.css
      RoleStatsCard.tsx                  # Sessions, reviews stats
      RoleStatsCard.module.css
      GetInTouchCard.tsx                 # Sticky CTAs
      GetInTouchCard.module.css
      SimilarProfilesCard.tsx            # Discover similar profiles
      SimilarProfilesCard.module.css
      MobileBottomCTA.tsx                # Fixed mobile CTA bar
      MobileBottomCTA.module.css
      ProfileViewTracker.tsx             # Analytics (hidden)
      IntroductionCard.tsx               # Intro text
      IntroductionCard.module.css
      AvailabilityCard.tsx               # Simplified availability
      AvailabilityCard.module.css
      CredibilityScoreCard.tsx           # CaaS score
      CredibilityScoreCard.module.css

  lib/utils/
    slugify.ts                           # generateSlug() function
```

---

## Common Implementation Tasks

### Task 1: Add a New Card Component

**Requirement**: Add a "CertificationsCard" to display tutor certifications

**Steps**:

```typescript
// 1. Create component file
// File: apps/web/src/app/components/feature/public-profile/CertificationsCard.tsx

'use client';

import Card from '@/app/components/ui/data-display/Card';
import type { Profile } from '@/types';
import styles from './CertificationsCard.module.css';

interface CertificationsCardProps {
  profile: Profile;
  isOwnProfile?: boolean;
}

export function CertificationsCard({ profile, isOwnProfile = false }: CertificationsCardProps) {
  // Extract certifications from professional_details JSONB
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
              <li key={index} className={styles.certificationItem}>
                {cert}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
```

```css
/* 2. Create styles file
   File: apps/web/src/app/components/feature/public-profile/CertificationsCard.module.css */

.certificationsCard {
  padding: 0 !important;
}

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
  line-height: 1.4;
}

.cardContent {
  padding: 16px;
}

.certificationsList {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.certificationItem {
  padding: 12px;
  background-color: #f9fafb;
  border-left: 3px solid #006c67;
  border-radius: 4px;
}

.emptyState {
  color: #6b7280;
  text-align: center;
  padding: 24px;
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

```typescript
// 3. Add to page.tsx
// File: apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx

import { CertificationsCard } from '@/app/components/feature/public-profile/CertificationsCard';

// ... in JSX (add to main column)
<div className={styles.mainColumn}>
  <AboutCard profile={enrichedProfile} />
  <ProfessionalInfoCard profile={enrichedProfile} />
  <CertificationsCard profile={enrichedProfile} isOwnProfile={isOwnProfile} />
  <ServicesCard profile={enrichedProfile} listings={listings || []} isOwnProfile={isOwnProfile} />
  {/* ... rest of cards */}
</div>
```

---

### Task 2: Modify Slug Validation Logic

**Requirement**: Add custom slug support (allow users to set vanity URLs)

**File**: `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx`

```typescript
// Current implementation (lines 94-100)
const correctSlug = profile.slug || generateSlug(profile.full_name);
const urlSlug = params.slug?.[0] || '';

if (correctSlug !== urlSlug) {
  redirect(`/public-profile/${profile.id}/${correctSlug}`);
}

// NEW: Support custom_slug field
const correctSlug = profile.custom_slug || profile.slug || generateSlug(profile.full_name);
const urlSlug = params.slug?.[0] || '';

if (correctSlug !== urlSlug) {
  redirect(`/public-profile/${profile.id}/${correctSlug}`);
}

// Migration: Add custom_slug column to profiles table
// ALTER TABLE profiles ADD COLUMN custom_slug TEXT UNIQUE;
```

---

### Task 3: Add New Real-Time Statistic

**Requirement**: Add "Response Rate" to RoleStatsCard

**File**: `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx`

```typescript
// Add to STEP 8: Calculate real-time statistics (after line 242)

// Response rate from messages table
const { data: messages } = await supabase
  .from('messages')
  .select('id, responded_at, created_at')
  .eq('recipient_id', profile.id)
  .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

const totalMessages = messages?.length || 0;
const respondedMessages = messages?.filter(m => m.responded_at).length || 0;
const responseRate = totalMessages > 0 ? (respondedMessages / totalMessages) * 100 : 0;

// Add to enrichedProfile (line 252)
const enrichedProfile = {
  ...profile,
  average_rating: Math.round(averageRating * 10) / 10,
  total_reviews: reviewCount,
  sessions_completed: sessionsCompleted,
  reviews_given: reviewsGiven || 0,
  tutors_worked_with: tutorsWorkedWith,
  clients_worked_with: clientsWorkedWith,
  profile_views: profileViews,
  free_sessions_count: freeSessionsCount || 0,
  response_rate: Math.round(responseRate), // NEW
} as Profile;
```

```typescript
// Update RoleStatsCard component to display response_rate
// File: apps/web/src/app/components/feature/public-profile/RoleStatsCard.tsx

// Add to stats array
{
  label: 'Response Rate',
  value: `${profile.response_rate}%`,
  icon: MessageSquare,
  tooltip: 'Percentage of messages replied to within 24 hours',
}
```

---

### Task 4: Change ServicesCard MAX_LISTINGS_SHOWN

**Requirement**: Show 10 listings instead of 5

**File**: `apps/web/src/app/components/feature/public-profile/ServicesCard.tsx`

```typescript
// Line 36
const MAX_LISTINGS_SHOWN = 5; // Change to 10

// NEW:
const MAX_LISTINGS_SHOWN = 10;

// That's it! The component will now show 10 listings.
```

---

### Task 5: Add Own Profile Indicator to Hero Section

**Requirement**: Display "Viewing Your Profile" badge when viewing own profile

**File**: `apps/web/src/app/components/feature/public-profile/ProfileHeroSection.tsx`

```typescript
// Add to props
interface ProfileHeroSectionProps {
  profile: Profile;
  isOwnProfile?: boolean; // Already exists
}

// Add to JSX (after role badge)
{isOwnProfile && (
  <div className={styles.ownProfileBadge}>
    Viewing Your Profile
  </div>
)}
```

```css
/* Add to ProfileHeroSection.module.css */
.ownProfileBadge {
  display: inline-block;
  padding: 4px 12px;
  background-color: #FEF3C7;
  color: #92400E;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  margin-left: 8px;
}
```

---

### Task 6: Filter Listings by Service Type

**Requirement**: Add "Service Type" filter to ServicesCard

**File**: `apps/web/src/app/components/feature/public-profile/ServicesCard.tsx`

```typescript
// Add prop
interface ServicesCardProps {
  profile: Profile;
  listings?: Listing[];
  isOwnProfile?: boolean;
  excludeListingId?: string;
  filterServiceType?: 'one_to_one' | 'group' | 'workshop'; // NEW
}

// Update filtering logic (line 42)
let filteredListings = excludeListingId
  ? listings.filter(listing => listing.id !== excludeListingId)
  : listings;

// NEW: Filter by service type
if (filterServiceType) {
  filteredListings = filteredListings.filter(
    listing => listing.service_type === filterServiceType
  );
}

const totalCount = filteredListings.length;
```

---

### Task 7: Add Share Profile Button

**Requirement**: Add "Share Profile" button to GetInTouchCard with referral link

**File**: `apps/web/src/app/components/feature/public-profile/GetInTouchCard.tsx`

```typescript
'use client';

import { useState } from 'react';
import Button from '@/app/components/ui/actions/Button';
import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function GetInTouchCard({ profile, currentUser }: GetInTouchCardProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleShare = async () => {
    // Generate referral link
    const referralCode = currentUser?.referral_code;
    const profileUrl = `/public-profile/${profile.id}/${profile.slug}`;
    const shareUrl = referralCode
      ? `${window.location.origin}/a/${referralCode}?redirect=${profileUrl}`
      : `${window.location.origin}${profileUrl}`;

    // Copy to clipboard
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  return (
    <Card>
      {/* ... existing CTAs */}

      <Button
        onClick={handleShare}
        variant="outline"
        icon={<Share2 size={18} />}
      >
        Share Profile
      </Button>
    </Card>
  );
}
```

---

### Task 8: Customize Review Display

**Requirement**: Show only 5-star reviews in ReviewsCard

**File**: `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx`

```typescript
// Update STEP 6 query (line 134)
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
  .eq('session.status', 'published')
  .eq('rating', 5) // NEW: Only 5-star reviews
  .order('created_at', { ascending: false })
  .limit(10);
```

---

## API Integration Patterns

### Pattern 1: Fetch Additional Data for Cards

```typescript
// In page.tsx, add parallel query to STEP 4-6

const [listings, reviews, customData] = await Promise.all([
  supabase.from('listings').select('*').eq('profile_id', profile.id),
  supabase.from('profile_reviews').select('*').eq('reviewee_id', profile.id),
  supabase.from('your_table').select('*').eq('profile_id', profile.id), // NEW
]);

// Pass to component
<YourCard profile={enrichedProfile} customData={customData} />
```

### Pattern 2: Add Client-Side Interactivity

```typescript
// Create client component with 'use client'
'use client';

import { useState } from 'react';

export function InteractiveCard({ profile }: InteractiveCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <div className={styles.cardHeader} onClick={() => setIsExpanded(!isExpanded)}>
        <h2 className={styles.cardTitle}>Expandable Section</h2>
        <button>{isExpanded ? '−' : '+'}</button>
      </div>
      {isExpanded && (
        <div className={styles.cardContent}>
          {/* Content */}
        </div>
      )}
    </Card>
  );
}
```

### Pattern 3: Conditional Card Rendering

```typescript
// In page.tsx

{enrichedProfile.active_role === 'tutor' && (
  <TutorSpecificCard profile={enrichedProfile} />
)}

{enrichedProfile.active_role === 'client' && (
  <ClientSpecificCard profile={enrichedProfile} />
)}

{enrichedProfile.active_role === 'agent' && (
  <AgentSpecificCard profile={enrichedProfile} />
)}
```

---

## Testing Patterns

### Test 1: Slug Validation

```bash
# 1. Create profile "John Smith" (slug: john-smith)
# 2. Visit: /public-profile/abc123/john-smith
# 3. Change name to "John Williams"
# 4. Visit old URL: /public-profile/abc123/john-smith
# 5. Verify 301 redirect to: /public-profile/abc123/john-williams
```

### Test 2: Own Profile Detection

```bash
# 1. Sign in as User A
# 2. Navigate to own profile: /public-profile/{userA_id}/{slug}
# 3. Verify sidebar shows "Edit My Profile" button
# 4. Verify no "Book Session" button
# 5. Click "Edit My Profile"
# 6. Verify redirects to /account/personal-info
```

### Test 3: Real-Time Statistics

```bash
# 1. Create 5 completed bookings for User A
# 2. Create 3 reviews for User A (ratings: 5, 4, 5)
# 3. Visit User A's profile
# 4. Verify RoleStatsCard shows:
#    - Sessions Completed: 5
#    - Average Rating: 4.7
#    - Total Reviews: 3
```

### Test 4: Mobile Responsiveness

```bash
# 1. Open profile on mobile (< 768px)
# 2. Verify single-column layout
# 3. Verify MobileBottomCTA is visible and fixed
# 4. Verify GetInTouchCard is hidden
# 5. Resize to desktop (> 1024px)
# 6. Verify 2-column layout (2fr 1fr)
# 7. Verify GetInTouchCard is sticky
# 8. Verify MobileBottomCTA is hidden
```

---

## Debugging Tips

### Debug 1: Slug Mismatch Not Redirecting

```typescript
// Add console logs to page.tsx
console.log('Profile ID:', params.id);
console.log('URL Slug:', params.slug?.[0]);
console.log('Correct Slug:', correctSlug);
console.log('Will Redirect:', correctSlug !== urlSlug);

// Check:
// 1. Is profile.slug set in database?
// 2. Is generateSlug() producing expected output?
// 3. Is params.slug correctly extracted?
```

### Debug 2: Statistics Not Calculating

```typescript
// Add logs to statistics queries
const { data: reviewStats, error } = await supabase
  .from('profile_reviews')
  .select('rating')
  .eq('reviewee_id', profile.id);

console.log('Review Stats:', reviewStats);
console.log('Review Error:', error);
console.log('Calculated Rating:', averageRating);

// Check:
// 1. Are reviews in database with status = 'published'?
// 2. Is reviewee_id matching profile.id?
// 3. Is query returning data?
```

### Debug 3: Card Not Displaying

```typescript
// Check component import
import { YourCard } from '@/app/components/feature/public-profile/YourCard';
// NOT: import YourCard from '...'  (missing named export)

// Check JSX placement
<YourCard profile={enrichedProfile} />
// NOT: <yourCard ... /> (wrong capitalization)

// Check CSS module import
import styles from './YourCard.module.css';
// NOT: import './YourCard.css' (wrong module syntax)
```

---

## Performance Optimization

### Optimization 1: Parallel Queries

```typescript
// GOOD: Parallel queries (fast)
const [listings, reviews, stats] = await Promise.all([
  supabase.from('listings').select('*'),
  supabase.from('profile_reviews').select('*'),
  supabase.from('bookings').select('*'),
]);

// BAD: Sequential queries (slow)
const listings = await supabase.from('listings').select('*');
const reviews = await supabase.from('profile_reviews').select('*');
const stats = await supabase.from('bookings').select('*');
```

### Optimization 2: Use Materialized Views

```sql
-- Create materialized view for profile views (fast reads)
CREATE MATERIALIZED VIEW profile_view_counts AS
SELECT
  profile_id,
  COUNT(*) as total_views,
  MAX(viewed_at) as last_updated
FROM profile_views
GROUP BY profile_id;

-- Refresh nightly via cron job
REFRESH MATERIALIZED VIEW profile_view_counts;
```

```typescript
// Query materialized view (instant)
const { data: viewData } = await supabase
  .from('profile_view_counts')
  .select('total_views')
  .eq('profile_id', profile.id)
  .maybeSingle();
```

### Optimization 3: Lazy Load Below-Fold Cards

```typescript
import dynamic from 'next/dynamic';

const SimilarProfilesCard = dynamic(
  () => import('@/app/components/feature/public-profile/SimilarProfilesCard')
    .then(mod => ({ default: mod.SimilarProfilesCard })),
  { loading: () => <CardSkeleton /> }
);
```

---

## Common Gotchas

### Gotcha 1: isOwnProfile Not Passed

**Issue**: Badge not clickable on own profile

**Fix**:
```typescript
// In page.tsx (line 106)
const isOwnProfile = user?.id === profile.id;

// Pass to component (line 288)
<ServicesCard isOwnProfile={isOwnProfile} />
```

### Gotcha 2: Card Header Not Rounded

**Issue**: White space in card corners when zoomed

**Fix**:
```css
.cardHeader {
  border-radius: 8px 8px 0 0; /* Top corners only */
}

/* Also add to Card base component */
.card {
  overflow: hidden;
}
```

### Gotcha 3: enrichedProfile Not Including New Field

**Issue**: Added new stat but not showing in component

**Fix**:
```typescript
// Ensure new field is in enrichedProfile object (line 252)
const enrichedProfile = {
  ...profile,
  average_rating: Math.round(averageRating * 10) / 10,
  total_reviews: reviewCount,
  your_new_field: calculatedValue, // ADD THIS
} as Profile;
```

---

## Related Files

- Main Page: [apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx](../../../../apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx)
- Components: [apps/web/src/app/components/feature/public-profile/](../../../../apps/web/src/app/components/feature/public-profile/)
- Types: [packages/shared-types/src/profile.ts](../../../../packages/shared-types/src/profile.ts)
- Slugify: [apps/web/src/lib/utils/slugify.ts](../../../../apps/web/src/lib/utils/slugify.ts)

---

**Last Updated**: 2025-12-12
**Maintainer**: Frontend Team
**For Questions**: See public-profile-solution-design.md or ask team lead
