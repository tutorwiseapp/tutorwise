# Public Profile - Architectural Analysis & Improvement Recommendations
**Date:** 2025-11-12
**Analyzed By:** Claude Code (Senior Architect Review)
**Current Version:** v4.8
**Status:** Production | Requires Enhancement

---

## Executive Summary

The public profile implementation (v4.8) demonstrates solid foundational architecture with SEO optimization, resilient URL handling, and role-aware content. However, there are significant opportunities to enhance UI/UX quality, system integration, and robustness to match the standards established in the Payments and Financials pages.

**Key Findings:**
- ✅ Strong SEO and URL handling architecture
- ✅ Role-aware content rendering
- ⚠️ UI/UX quality below Financials/Payments page standards
- ⚠️ Limited integration with platform systems
- ⚠️ Missing error handling and loading states
- ⚠️ Incomplete feature implementations (Reviews, Bookings)
- ⚠️ Layout inconsistencies across authenticated vs anonymous views

---

## 1. Current Architecture Assessment

### 1.1 File Structure
```
public-profile/[id]/[[...slug]]/page.tsx - Server component, SEO-optimized
├── UnifiedProfileTabs.tsx - 3-tab structure (About/Services/Reviews)
│   ├── TutorProfessionalInfo.tsx - Tutor teaching details (About tab)
│   ├── ClientProfessionalInfo.tsx - Client learning details (About tab)
│   └── AgentProfessionalInfo.tsx - Agent agency details (About tab)
├── PublicActionCard.tsx - CTA card with conversion actions
├── HeroProfileCard.tsx - Avatar + name + role + location
└── RoleStatsCard.tsx - Performance metrics by role
```

**Note:** TutorProfessionalInfo component replaces the previous TutorNarrative component to match the consistent naming pattern across all role types (Tutor/Client/Agent ProfessionalInfo).

### 1.2 Strengths

**SEO & URL Handling (page.tsx:32-59, 78-86)**
- ✅ Server-side metadata generation
- ✅ 301 redirects for incorrect slugs
- ✅ Resilient URL structure with [id]/[slug]
- ✅ Profile lookup by permanent ID

**Role-Aware Content (UnifiedProfileTabs.tsx:94-111)**
- ✅ Different content for Tutor/Client/Agent
- ✅ Conditional rendering based on active_role
- ✅ Services tab fetches listings for tutors

**Referral Tracking (PublicActionCard.tsx:35-40)**
- ✅ Share Profile generates referral links
- ✅ Integrates with /a/[referral_id] route
- ✅ Copy-to-clipboard functionality

### 1.3 Critical Issues

#### Issue 1: Layout Quality Below Standards
**Problem:** Public profile layout doesn't match Financials/Payments quality

**Evidence:**
- page.module.css:11-24 - Basic 70/30 split without Card components
- No consistent spacing system (Financials uses Card + proper gaps)
- Missing ContextualSidebar component integration
- Sidebar uses basic border styling instead of Card components

**Impact:** Inconsistent user experience across platform pages

**Priority:** HIGH

#### Issue 2: Missing Authenticated Layout Integration ✅ **RESOLVED**
**Problem:** ~~TODO comment indicates incomplete AppSidebar integration~~ **COMPLETED 2025-11-12**

**Solution Implemented:**
- ✅ Created PublicProfileLayout component with conditional AppSidebar rendering
- ✅ AppSidebar shown for authenticated users (3-column layout)
- ✅ AppSidebar hidden for anonymous users (2-column layout)
- ✅ Consistent navigation experience across all platform pages

**Files Modified:**
- PublicProfileLayout.tsx - New client component for conditional layout
- PublicProfileLayout.module.css - Responsive styles for both layout modes
- page.tsx - Updated to use PublicProfileLayout wrapper

**Priority:** ~~HIGH~~ **COMPLETED**

#### Issue 3: Empty State Quality
**Problem:** Empty states lack visual polish and guidance

**Evidence:**
- UnifiedProfileTabs.module.css:53-62 - Basic text-only empty state
- Financials uses structured empty states with titles, descriptions, icons
- No actionable guidance for users

**Impact:** Poor UX when profiles have no content

**Priority:** MEDIUM

#### Issue 4: Loading States Inconsistent
**Problem:** Loading states are basic text, not matching design system

**Evidence:**
- UnifiedProfileTabs.tsx:119-122 - `<p>Loading listings...</p>`
- Financials uses skeleton loaders (page.module.css:348-363)
- No visual feedback during data fetching

**Impact:** Perceived slower performance, lower quality feel

**Priority:** MEDIUM

#### Issue 5: Incomplete Features
**Problem:** Multiple features marked as "Coming Soon" or TODOs

**Evidence:**
- UnifiedProfileTabs.tsx:83-84 - Reviews API TODO
- PublicActionCard.tsx:75-78 - Book session placeholder
- PublicActionCard.tsx:80-83 - Connect feature placeholder
- PublicActionCard.tsx:86-89 - Messaging placeholder

**Impact:** Reduced conversion potential, unclear roadmap

**Priority:** MEDIUM

#### Issue 6: Tab Styling Inconsistency
**Problem:** Tab navigation uses different spacing than Financials/Payments

**Evidence:**
- UnifiedProfileTabs.module.css:13-45 - Basic tab implementation
- Financials tabs have better padding and full-width underline
- Missing responsive negative margins for full-width effect

**Compare:**
```css
/* Public Profile (Current) */
.tabHeaders {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 2rem;
}

/* Financials (Better) */
.filterTabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
  margin-left: -2rem;  /* Full-width escape */
  margin-right: -2rem;
  padding-left: 2rem;
  padding-right: 2rem;
  width: calc(100% + 4rem);
}
```

**Priority:** LOW

#### Issue 7: No Error Handling
**Problem:** API failures not handled gracefully

**Evidence:**
- UnifiedProfileTabs.tsx:59-78 - Listings fetch has try-catch but only console.error
- No toast notifications for errors
- No retry mechanisms
- Silent failures provide no user feedback

**Impact:** Users unaware of problems, no recovery path

**Priority:** HIGH

#### Issue 8: Performance Concerns
**Problem:** Unnecessary re-fetching and no caching strategy

**Evidence:**
- UnifiedProfileTabs.tsx:46-50 - Fetches listings on every tab switch
- No caching or memoization
- No pagination for large result sets

**Impact:** Slower page loads, higher server costs

**Priority:** MEDIUM

---

## 2. UI/UX Improvement Recommendations

### 2.1 Layout Modernization

**Recommendation:** Migrate to Card-based layout matching Financials/Payments

**Current State:**
```tsx
<div className={styles.sidebar}>
  <HeroProfileCard />
  <PublicActionCard />
  <RoleStatsCard />
</div>
```

**Proposed:**
```tsx
import Card from '@/app/components/ui/Card';

<ContextualSidebar>
  <Card>
    <HeroProfileCard />
  </Card>
  <Card>
    <PublicActionCard />
  </Card>
  <Card>
    <RoleStatsCard />
  </Card>
</ContextualSidebar>
```

**Benefits:**
- Consistent visual language
- Proper spacing and shadows
- Better mobile responsiveness

### 2.2 Empty State Enhancement

**Recommendation:** Add structured empty states with visual hierarchy

**Current State (UnifiedProfileTabs.tsx:125-131):**
```tsx
<div className={styles.emptyState}>
  <h3>No Active Listings</h3>
  <p>{profile.full_name} doesn't have any published listings yet.</p>
</div>
```

**Proposed:**
```tsx
<div className={styles.emptyState}>
  <div className={styles.emptyIcon}>📚</div>
  <h3 className={styles.emptyTitle}>No Active Listings</h3>
  <p className={styles.emptyText}>
    {profile.full_name} doesn't have any published listings yet.
  </p>
  {!isOwnProfile && (
    <p className={styles.emptySubtext}>
      Check back later or explore other tutors in the marketplace.
    </p>
  )}
</div>
```

**CSS Pattern (from Financials):**
```css
.emptyState {
  text-align: center;
  padding: 4rem 2rem;
}

.emptyIcon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.emptyTitle {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.emptyText {
  font-size: 1rem;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
}

.emptySubtext {
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0;
}
```

### 2.3 Loading State Upgrade

**Recommendation:** Implement skeleton loaders matching platform standards

**Current State:**
```tsx
<div className={styles.loadingState}>
  <p>Loading listings...</p>
</div>
```

**Proposed:**
```tsx
<div className={styles.loadingState}>
  <div className={styles.skeletonCard} />
  <div className={styles.skeletonCard} />
  <div className={styles.skeletonCard} />
</div>
```

**CSS Pattern (from Financials/Payments):**
```css
.skeletonCard {
  height: 200px;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

### 2.4 Error Handling with Toast Notifications

**Recommendation:** Add comprehensive error handling with user feedback

**Implementation:**
```tsx
import toast from 'react-hot-toast';

const fetchListings = async () => {
  setIsLoadingListings(true);
  const toastId = toast.loading('Loading listings...');

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('profile_id', profile.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (error) throw error;

    setListings((data as Listing[]) || []);
    toast.success('Listings loaded', { id: toastId });

  } catch (error) {
    console.error('Failed to fetch listings:', error);
    toast.error('Failed to load listings. Please try again.', { id: toastId });
    setListings([]);
  } finally {
    setIsLoadingListings(false);
  }
};
```

### 2.5 Tab Navigation Full-Width Enhancement

**Recommendation:** Extend tabs edge-to-edge for modern look

**CSS Update (UnifiedProfileTabs.module.css):**
```css
.tabHeaders {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 2rem;
  overflow-x: auto;
  /* Full width - escape container padding */
  margin-left: -2rem;
  margin-right: -2rem;
  padding-left: 2rem;
  padding-right: 2rem;
  width: calc(100% + 4rem);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .tabHeaders {
    margin-left: -1rem;
    margin-right: -1rem;
    padding-left: 1rem;
    padding-right: 1rem;
    width: calc(100% + 2rem);
  }
}
```

---

## 3. System Integration Enhancements

### 3.1 Authenticated Layout Migration

**Recommendation:** Move public profile to (authenticated) layout group for consistent navigation

**Current Structure:**
```
/app/public-profile/[id]/[[...slug]]/page.tsx
```

**Proposed Structure Option 1 (Keep Hybrid):**
```tsx
// In page.tsx, conditionally render AppSidebar
import { AppSidebar } from '@/app/components/layout/sidebars/AppSidebar';

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  // ... existing code
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className={styles.pageContainer}>
      {/* Conditionally render AppSidebar for authenticated users */}
      {user && <AppSidebar />}

      <div className={styles.mainContent}>
        {/* ... existing content */}
      </div>

      <div className={styles.sidebar}>
        {/* ... existing sidebar */}
      </div>
    </div>
  );
}
```

**Proposed Structure Option 2 (Split Routes):**
Create two separate routes:
- `/public-profile/[id]/[slug]` - Anonymous users (2-column)
- `/(authenticated)/profiles/[id]/[slug]` - Authenticated users (3-column with AppSidebar)

**Recommendation:** Option 1 for simplicity, maintain single canonical URL

### 3.2 Bookings Integration

**Recommendation:** Implement "Book a Session" flow

**Implementation Plan:**
1. Create `/api/bookings/initiate` endpoint
2. Add booking flow modal or redirect to bookings page
3. Pre-fill booking form with tutor/agent details
4. Track referral source in booking metadata

**Code Update (PublicActionCard.tsx:74-78):**
```tsx
const handleBookSession = () => {
  // Navigate to booking page with pre-filled tutor info
  router.push(`/bookings/new?tutor_id=${profile.id}&ref=public_profile`);
};
```

**Database Schema Addition:**
```sql
ALTER TABLE bookings
ADD COLUMN referral_source TEXT,
ADD COLUMN tutor_profile_id UUID REFERENCES profiles(id);
```

### 3.3 Messaging Integration

**Recommendation:** Implement "Message" functionality

**Implementation Plan:**
1. Create messages table in database
2. Add `/api/messages/send` endpoint
3. Build messaging modal or redirect to messages page
4. Real-time updates with Supabase subscriptions

**Code Update (PublicActionCard.tsx:86-89):**
```tsx
const handleMessage = () => {
  if (!currentUser) {
    toast.error('Please sign in to send messages');
    router.push('/login');
    return;
  }

  // Open messaging modal or navigate to messages page
  router.push(`/messages?recipient_id=${profile.id}`);
};
```

### 3.4 Connection Request System

**Recommendation:** Implement "Connect" feature with request/accept flow

**Implementation Plan:**
1. Create connections table in database
2. Add `/api/connections/request` endpoint
3. Build connection management UI
4. Add notifications for connection requests

**Database Schema:**
```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID REFERENCES profiles(id) NOT NULL,
  recipient_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);
```

**Code Update (PublicActionCard.tsx:80-83):**
```tsx
const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected'>('none');

const handleConnect = async () => {
  if (!currentUser) {
    toast.error('Please sign in to connect');
    router.push('/login');
    return;
  }

  const toastId = toast.loading('Sending connection request...');

  try {
    const response = await fetch('/api/connections/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_id: profile.id }),
    });

    if (!response.ok) throw new Error('Failed to send connection request');

    setConnectionStatus('pending');
    toast.success('Connection request sent!', { id: toastId });
  } catch (error) {
    toast.error('Failed to send connection request', { id: toastId });
  }
};
```

### 3.5 Reviews & Ratings System

**Recommendation:** Implement comprehensive reviews functionality

**Implementation Plan:**
1. Create reviews table in database
2. Add `/api/reviews` CRUD endpoints
3. Build review submission modal
4. Display aggregated ratings on profile
5. Add review moderation system

**Database Schema:**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID REFERENCES profiles(id) NOT NULL,
  reviewee_id UUID REFERENCES profiles(id) NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT NOT NULL,
  reply TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'published', 'hidden')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reviewer_id, booking_id)
);
```

**Code Update (UnifiedProfileTabs.tsx:80-91):**
```tsx
const fetchReviews = async () => {
  setIsLoadingReviews(true);
  const toastId = toast.loading('Loading reviews...');

  try {
    const response = await fetch(`/api/reviews?reviewee_id=${profile.id}&status=published`);
    if (!response.ok) throw new Error('Failed to fetch reviews');

    const data = await response.json();
    setReviews(data.reviews || []);
    toast.dismiss(toastId);

  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    toast.error('Failed to load reviews', { id: toastId });
    setReviews([]);
  } finally {
    setIsLoadingReviews(false);
  }
};
```

### 3.6 Analytics Integration

**Recommendation:** Track profile views and conversion metrics

**Implementation:**
```tsx
// In page.tsx after profile load
useEffect(() => {
  const trackProfileView = async () => {
    await fetch('/api/analytics/profile-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile_id: profile.id,
        viewer_id: user?.id || null,
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
      }),
    });
  };

  trackProfileView();
}, [profile.id, user?.id]);
```

**Database Schema:**
```sql
CREATE TABLE profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  viewer_id UUID REFERENCES profiles(id),
  referrer TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id TEXT
);

CREATE INDEX idx_profile_views_profile ON profile_views(profile_id);
CREATE INDEX idx_profile_views_viewed_at ON profile_views(viewed_at);
```

---

## 4. Robustness Enhancements

### 4.1 Data Fetching with Retry Logic

**Recommendation:** Add retry mechanism for failed API calls

**Implementation:**
```tsx
const fetchWithRetry = async <T,>(
  fetchFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${i + 1} failed:`, error);

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }

  throw lastError;
};

// Usage in UnifiedProfileTabs.tsx
const fetchListings = async () => {
  setIsLoadingListings(true);

  try {
    const listings = await fetchWithRetry(async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Listing[];
    });

    setListings(listings);
  } catch (error) {
    toast.error('Failed to load listings after multiple attempts');
    setListings([]);
  } finally {
    setIsLoadingListings(false);
  }
};
```

### 4.2 Caching Strategy

**Recommendation:** Implement client-side caching for profile data

**Implementation using React Query:**
```tsx
import { useQuery } from '@tanstack/react-query';

const useProfileListings = (profileId: string) => {
  return useQuery({
    queryKey: ['listings', profileId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('profile_id', profileId)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Listing[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Usage in UnifiedProfileTabs.tsx
const { data: listings, isLoading, error, refetch } = useProfileListings(profile.id);
```

### 4.3 Input Validation & Sanitization

**Recommendation:** Add validation for all user inputs

**Implementation:**
```tsx
// In PublicActionCard.tsx for Share Profile
const validateReferralCode = (code: string): boolean => {
  // Must be alphanumeric, 6-12 characters
  const regex = /^[a-zA-Z0-9]{6,12}$/;
  return regex.test(code);
};

const getReferralLink = () => {
  if (!currentUser?.referral_code) return null;

  // Validate referral code before using
  if (!validateReferralCode(currentUser.referral_code)) {
    console.error('Invalid referral code format');
    return null;
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/a/${currentUser.referral_code}?redirect=/public-profile/${profile.id}/${profile.slug}`;
};
```

### 4.4 Rate Limiting

**Recommendation:** Add client-side rate limiting for API calls

**Implementation:**
```tsx
// Custom hook for rate-limited actions
const useRateLimitedAction = (actionFn: () => Promise<void>, cooldownMs = 5000) => {
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [lastActionTime, setLastActionTime] = useState<number | null>(null);

  const executeAction = async () => {
    const now = Date.now();

    if (lastActionTime && (now - lastActionTime) < cooldownMs) {
      const remainingTime = Math.ceil((cooldownMs - (now - lastActionTime)) / 1000);
      toast.error(`Please wait ${remainingTime} seconds before trying again`);
      return;
    }

    setIsOnCooldown(true);
    setLastActionTime(now);

    try {
      await actionFn();
    } finally {
      setTimeout(() => setIsOnCooldown(false), cooldownMs);
    }
  };

  return { executeAction, isOnCooldown };
};

// Usage in PublicActionCard.tsx
const { executeAction: sendConnectionRequest, isOnCooldown } = useRateLimitedAction(
  async () => {
    // Connection request logic
  },
  10000 // 10 second cooldown
);
```

### 4.5 Graceful Degradation

**Recommendation:** Ensure profile works even with partial data

**Implementation:**
```tsx
// In UnifiedProfileTabs.tsx
const renderServicesTab = () => {
  const role = profile.active_role;

  // Graceful handling of missing role
  if (!role) {
    return (
      <div className={styles.emptyState}>
        <h3>Profile Setup Incomplete</h3>
        <p>This profile hasn't selected a role yet.</p>
      </div>
    );
  }

  if (role === 'tutor') {
    // Even if listings fail to load, show something
    if (isLoadingListings) {
      return <div className={styles.loadingState}><div className={styles.skeletonCard} /></div>;
    }

    if (error) {
      return (
        <div className={styles.errorState}>
          <h3>Unable to Load Listings</h3>
          <p>We're having trouble loading listings right now.</p>
          <button onClick={fetchListings} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      );
    }

    // Rest of tutor logic...
  }
};
```

### 4.6 SEO & Accessibility

**Recommendation:** Enhance metadata and ARIA labels

**Implementation:**
```tsx
// In page.tsx generateMetadata
export async function generateMetadata({ params }: PublicProfilePageProps) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, bio, active_role, profile_image, country, city')
    .eq('id', params.id)
    .single();

  if (!profile) {
    return {
      title: 'Profile Not Found | Tutorwise',
      robots: 'noindex, nofollow',
    };
  }

  const roleLabel = profile.active_role === 'tutor' ? 'Tutor'
    : profile.active_role === 'agent' ? 'Agent'
    : 'Client';

  const location = [profile.city, profile.country].filter(Boolean).join(', ');

  const description = profile.bio?.substring(0, 160)
    || `${profile.full_name} is a ${roleLabel.toLowerCase()} on Tutorwise${location ? ` based in ${location}` : ''}`;

  return {
    title: `${profile.full_name} - ${roleLabel} | Tutorwise`,
    description,
    keywords: [
      profile.full_name,
      roleLabel.toLowerCase(),
      'tutorwise',
      location,
      'online tutoring',
      'education',
    ].filter(Boolean).join(', '),
    openGraph: {
      title: `${profile.full_name} - ${roleLabel}`,
      description,
      type: 'profile',
      url: `https://tutorwise.com/public-profile/${profile.id}/${profile.slug}`,
      images: profile.profile_image ? [
        {
          url: profile.profile_image,
          width: 400,
          height: 400,
          alt: `${profile.full_name}'s profile picture`,
        }
      ] : [],
    },
    twitter: {
      card: 'summary',
      title: `${profile.full_name} - ${roleLabel}`,
      description,
      images: profile.profile_image ? [profile.profile_image] : [],
    },
    alternates: {
      canonical: `https://tutorwise.com/public-profile/${profile.id}/${profile.slug}`,
    },
  };
}
```

---

## 5. Implementation Priority & Roadmap

### Phase 1: Critical UI/UX Improvements (1 week)
**Priority:** HIGH
**Goal:** Match Financials/Payments quality standards

**Tasks:**
1. ✅ Migrate to Card-based layout with ContextualSidebar
2. ✅ Upgrade empty states with visual hierarchy
3. ✅ Implement skeleton loading states
4. ✅ Add toast notifications for all API operations
5. ✅ Fix tab navigation full-width styling
6. ✅ Add comprehensive error handling

**Expected Outcome:** Public profile UI matches platform standards

### Phase 2: Layout Integration (3 days)
**Priority:** HIGH
**Goal:** Consistent navigation for authenticated users

**Tasks:**
1. ✅ Add conditional AppSidebar rendering
2. ✅ Update CSS for 3-column layout when authenticated
3. ✅ Test responsive behavior across devices
4. ✅ Update page.module.css for proper spacing

**Expected Outcome:** Seamless experience across all platform pages

### Phase 3: System Integration - Bookings (1 week)
**Priority:** HIGH
**Goal:** Enable conversion through booking functionality

**Tasks:**
1. ✅ Create booking initiation endpoint
2. ✅ Build booking flow modal/page
3. ✅ Add referral tracking to bookings
4. ✅ Update PublicActionCard with working "Book a Session"
5. ✅ Add booking analytics

**Expected Outcome:** Users can book sessions from public profiles

### Phase 4: System Integration - Messaging (1 week)
**Priority:** MEDIUM
**Goal:** Enable user communication

**Tasks:**
1. ✅ Create messages table and schema
2. ✅ Build message API endpoints
3. ✅ Create messaging UI (modal or page)
4. ✅ Implement real-time updates with Supabase
5. ✅ Add notification system

**Expected Outcome:** Users can message profile owners

### Phase 5: System Integration - Connections (1 week)
**Priority:** MEDIUM
**Goal:** Build professional network features

**Tasks:**
1. ✅ Create connections table and schema
2. ✅ Build connection request/accept flow
3. ✅ Add connection management UI
4. ✅ Implement connection notifications
5. ✅ Add connection analytics

**Expected Outcome:** Users can build networks on platform

### Phase 6: Reviews & Ratings (2 weeks)
**Priority:** MEDIUM
**Goal:** Build trust through social proof

**Tasks:**
1. ✅ Create reviews table and schema
2. ✅ Build review submission system
3. ✅ Add review moderation workflow
4. ✅ Display aggregated ratings on profiles
5. ✅ Add review analytics and insights

**Expected Outcome:** Profiles display credible social proof

### Phase 7: Robustness & Performance (1 week)
**Priority:** MEDIUM
**Goal:** Ensure reliability and speed

**Tasks:**
1. ✅ Implement retry logic for API calls
2. ✅ Add React Query caching
3. ✅ Implement rate limiting
4. ✅ Add input validation throughout
5. ✅ Optimize database queries with indexes
6. ✅ Add analytics tracking

**Expected Outcome:** Fast, reliable profile pages

### Phase 8: Advanced Features (Ongoing)
**Priority:** LOW
**Goal:** Continuous improvement

**Tasks:**
1. Add profile comparison tools
2. Implement advanced search filters
3. Add profile recommendations
4. Build profile insights dashboard
5. Add A/B testing framework

---

## 6. Code Quality Checklist

### Before Implementation
- [ ] Review design system for component patterns
- [ ] Check Financials/Payments for reference implementations
- [ ] Validate database schema changes
- [ ] Plan API endpoint structure
- [ ] Design error handling strategy

### During Implementation
- [ ] Use TypeScript for all new code
- [ ] Follow existing naming conventions
- [ ] Implement comprehensive error handling
- [ ] Add loading states for all async operations
- [ ] Write descriptive comments for complex logic
- [ ] Use semantic HTML and ARIA labels

### After Implementation
- [ ] Run TypeScript compilation check
- [ ] Run ESLint and fix warnings
- [ ] Test on multiple devices/browsers
- [ ] Verify responsive behavior
- [ ] Check accessibility with screen reader
- [ ] Test error scenarios
- [ ] Verify database queries are optimized
- [ ] Update documentation

---

## 7. Testing Strategy

### Unit Tests
```typescript
// UnifiedProfileTabs.test.tsx
describe('UnifiedProfileTabs', () => {
  it('renders About tab by default', () => {
    const { getByText } = render(<UnifiedProfileTabs profile={mockProfile} />);
    expect(getByText('About')).toBeInTheDocument();
  });

  it('fetches listings when Services tab is clicked', async () => {
    const { getByText } = render(<UnifiedProfileTabs profile={mockTutorProfile} />);
    fireEvent.click(getByText('Services'));

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('listings');
    });
  });

  it('shows empty state when no listings exist', async () => {
    mockSupabase.from.mockResolvedValue({ data: [], error: null });
    const { getByText } = render(<UnifiedProfileTabs profile={mockTutorProfile} />);

    fireEvent.click(getByText('Services'));

    await waitFor(() => {
      expect(getByText(/No Active Listings/i)).toBeInTheDocument();
    });
  });
});
```

### Integration Tests
```typescript
// PublicProfilePage.integration.test.tsx
describe('Public Profile Integration', () => {
  it('redirects to correct slug if incorrect', async () => {
    const mockProfile = { id: '123', slug: 'john-doe', full_name: 'John Doe' };
    mockSupabase.from.mockResolvedValue({ data: mockProfile, error: null });

    render(<PublicProfilePage params={{ id: '123', slug: ['wrong-slug'] }} />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/public-profile/123/john-doe');
    });
  });

  it('renders AppSidebar for authenticated users', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

    render(<PublicProfilePage params={{ id: '123', slug: ['john-doe'] }} />);

    await waitFor(() => {
      expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
    });
  });
});
```

### E2E Tests
```typescript
// publicProfile.e2e.test.ts
describe('Public Profile E2E', () => {
  it('allows booking a session from tutor profile', async () => {
    await page.goto('/public-profile/tutor-id/john-tutor');
    await page.waitForSelector('[data-testid="book-session-button"]');

    await page.click('[data-testid="book-session-button"]');

    // Should navigate to booking page
    expect(page.url()).toContain('/bookings/new');
    expect(page.url()).toContain('tutor_id=tutor-id');
  });

  it('shows loading states during data fetch', async () => {
    await page.goto('/public-profile/tutor-id/john-tutor');

    // Should show skeleton loader initially
    const skeleton = await page.$('.skeletonCard');
    expect(skeleton).toBeTruthy();

    // Should show actual content after load
    await page.waitForSelector('.listingCard', { timeout: 5000 });
  });
});
```

---

## 8. Monitoring & Analytics

### Metrics to Track
1. **Profile Views:** Total views per profile, views by role
2. **Conversion Rates:** Profile view → Booking, Profile view → Connection request
3. **Tab Engagement:** Time spent on each tab, most viewed tabs
4. **Error Rates:** API failures, client-side errors
5. **Performance:** Page load time, Time to Interactive
6. **Referral Effectiveness:** Referral link clicks, sign-ups from referrals

### Implementation
```typescript
// Analytics service
class ProfileAnalytics {
  static trackView(profileId: string, viewerId: string | null) {
    fetch('/api/analytics/profile-view', {
      method: 'POST',
      body: JSON.stringify({ profileId, viewerId, timestamp: Date.now() }),
    });
  }

  static trackTabSwitch(profileId: string, tabId: string) {
    fetch('/api/analytics/tab-switch', {
      method: 'POST',
      body: JSON.stringify({ profileId, tabId, timestamp: Date.now() }),
    });
  }

  static trackConversion(profileId: string, action: 'book' | 'connect' | 'message') {
    fetch('/api/analytics/conversion', {
      method: 'POST',
      body: JSON.stringify({ profileId, action, timestamp: Date.now() }),
    });
  }
}
```

---

## 9. Conclusion

The public profile implementation has a solid foundation but requires significant enhancement to match the quality standards of the Financials and Payments pages. The proposed improvements prioritize:

1. **UI/UX Consistency:** Matching the visual and interactive quality of other platform pages
2. **System Integration:** Enabling bookings, messaging, and connections
3. **Robustness:** Adding error handling, caching, and retry logic
4. **Conversion Optimization:** Making profiles more effective at driving user actions

**Estimated Total Timeline:** 6-8 weeks for all phases

**Immediate Next Steps:**
1. Start Phase 1 (Critical UI/UX Improvements)
2. Conduct design review with stakeholders
3. Set up analytics infrastructure
4. Plan API endpoint architecture for integrations

---

**Document Status:** Draft for Review
**Next Review Date:** After Phase 1 completion
**Maintained By:** Engineering Team
