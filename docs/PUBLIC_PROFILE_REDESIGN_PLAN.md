# Public Profile Redesign: Listing Page Gold Standard Implementation Plan
**Date:** 2025-11-12
**Goal:** Transform `/public-profile/[id]/[[...slug]]` to match `/listings/[id]/[[...slug]]` quality
**Layout Change:** Abolish 3-column → Implement 2-column with Container

---

## Executive Summary

This plan outlines the complete redesign of the public profile page to match the listing details page "gold standard". We will:

1. **Remove 3-column layout** (AppSidebar | Main | Right Sidebar)
2. **Implement 2-column layout** with Container (Main 2fr | Sidebar 1fr)
3. **Match listing page architecture** exactly
4. **Upgrade all components** to professional quality
5. **Add hero image section** like listing page
6. **Implement sticky sidebar** with enhanced cards
7. **Improve visual polish** to match listing page standards

---

## Phase 1: Layout Architecture Transformation

### Current Architecture (TO BE REPLACED)
```
PublicProfileLayout (full-width grid)
├── AppSidebar (240px) - if authenticated
├── Main Content (2fr)
│   ├── Page Header ("Public Profile")
│   └── UnifiedProfileTabs
└── Right Sidebar (1fr)
    ├── HeroProfileCard
    ├── PublicActionCard
    └── RoleStatsCard
```

### New Architecture (LISTING PAGE STANDARD)
```
Container (max-width constrained)
├── Top Section (1-column full width)
│   ├── ProfileHeader (name, role, stats, save/share)
│   └── HeroImageSection (banner image or gradient)
├── Body Section (2-column grid: 2fr + 1fr)
│   ├── Main Column (left, 2fr)
│   │   ├── AboutSection (bio, intro)
│   │   ├── ProfessionalDetailsCard
│   │   ├── ExperienceCard
│   │   ├── EducationCard
│   │   ├── ServicesCard (active listings)
│   │   └── ReviewsCard (with real reviews)
│   └── Sidebar Column (right, 1fr, sticky)
│       ├── ProfileActionCard (Book Session, Send Message)
│       ├── VerificationCard (Email, Phone, ID, DBS)
│       ├── StatsCard (Response time, rating, reviews)
│       └── TrustBadgesCard (guarantees)
└── Related Section (1-column full width)
    └── SimilarProfilesCard (recommendations)
```

---

## Phase 2: Component Breakdown & Implementation

### 2.1 Top Section Components

#### **ProfileHeader Component** (NEW)
**File:** `apps/web/src/app/components/public-profile/ProfileHeader.tsx`

**Purpose:** Replace simple "Public Profile" title with rich header

**Features:**
- Large profile name with role badge
- Stats bar: "★ 4.8 (127 reviews) · Response time: 24h · 95% response rate"
- Location indicator
- Save and Share buttons (like listing page)
- "Refer & Earn" button

**UI Structure:**
```tsx
<div className={styles.header}>
  <div className={styles.titleRow}>
    <h1>{profile.full_name}</h1>
    <StatusBadge>{profile.active_role}</StatusBadge>
  </div>

  <div className={styles.metadataBar}>
    <span className={styles.rating}>★ {rating} ({reviewCount} reviews)</span>
    <span>·</span>
    <span>{location}</span>
    <span>·</span>
    <span>Response time: {responseTime}</span>
  </div>

  <div className={styles.actions}>
    <button onClick={handleSave}>
      <HeartIcon /> Save
    </button>
    <button onClick={handleShare}>
      <ShareIcon /> Share
    </button>
    <button onClick={handleReferEarn}>
      <GiftIcon /> Refer & Earn
    </button>
  </div>
</div>
```

**Styling:** Match ListingHeader.module.css exactly

---

#### **HeroImageSection Component** (NEW)
**File:** `apps/web/src/app/components/public-profile/HeroImageSection.tsx`

**Purpose:** Add visual appeal like listing page image grid

**Options:**
1. **If profile has banner/cover image:** Display large hero image
2. **If no image:** Display gradient background with profile avatar overlay
3. **Future:** Add image upload capability

**UI Structure:**
```tsx
<div className={styles.heroSection}>
  {profile.cover_photo_url ? (
    <img
      src={profile.cover_photo_url}
      alt={`${profile.full_name} cover`}
      className={styles.heroImage}
    />
  ) : (
    <div className={styles.gradientHero}>
      <div className={styles.heroOverlay}>
        <img
          src={profile.avatar_url}
          alt={profile.full_name}
          className={styles.heroAvatar}
        />
      </div>
    </div>
  )}
</div>
```

**Styling:**
- Hero image: 600px height, full width
- Gradient fallback: Linear gradient matching brand colors
- Avatar overlay: 160px circle, centered

---

### 2.2 Main Column Components

#### **AboutSection Component** (NEW)
**File:** `apps/web/src/app/components/public-profile/AboutSection.tsx`

**Purpose:** Rich introduction section (like listing page description)

**UI Structure:**
```tsx
<Card className={styles.aboutCard}>
  <h2 className={styles.cardTitle}>
    Hi, I'm {firstName} - {profile.active_role}
  </h2>

  <p className={styles.bio}>{profile.bio}</p>

  {profile.tagline && (
    <div className={styles.tagline}>
      <QuoteIcon />
      <span>"{profile.tagline}"</span>
    </div>
  )}

  <div className={styles.quickStats}>
    <StatBadge icon={<CalendarIcon />} label="Member since" value={joinYear} />
    <StatBadge icon={<BookIcon />} label="Sessions taught" value={sessionCount} />
    <StatBadge icon={<StarIcon />} label="Average rating" value={rating} />
  </div>
</Card>
```

---

#### **ProfessionalDetailsCard Component** (ENHANCED)
**File:** Use existing `TutorProfessionalInfo`, `ClientProfessionalInfo`, `AgentProfessionalInfo` but with enhanced styling

**Improvements:**
- Add section icons (like listing page checkmarks)
- Better spacing and typography
- Visual subject tags with icons
- Collapsible sections for long content

**Example Enhancement:**
```tsx
<Card className={styles.detailsCard}>
  <h2 className={styles.cardTitle}>
    <BriefcaseIcon /> Professional Details
  </h2>

  {/* Subjects with icons */}
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Subjects & Specializations</h3>
    <div className={styles.tagCloud}>
      {subjects.map(subject => (
        <span className={styles.subjectTag} key={subject}>
          <CheckCircleIcon className={styles.checkIcon} />
          {subject}
        </span>
      ))}
    </div>
  </div>

  {/* Experience */}
  <div className={styles.section}>
    <h3 className={styles.sectionTitle}>Experience</h3>
    <p>{experience}</p>
  </div>
</Card>
```

---

#### **ServicesCard Component** (NEW)
**File:** `apps/web/src/app/components/public-profile/ServicesCard.tsx`

**Purpose:** Display active listings (like listing page related listings)

**Features:**
- Fetch user's active listings
- Display as cards with image, title, price, rating
- "View Listing" CTA
- Shows max 3 listings, "View All" button

**UI Structure:**
```tsx
<Card className={styles.servicesCard}>
  <div className={styles.cardHeader}>
    <h2 className={styles.cardTitle}>
      <ListIcon /> Available Services
    </h2>
    <Button variant="link" onClick={handleViewAll}>
      View all {totalCount}
    </Button>
  </div>

  <div className={styles.servicesGrid}>
    {listings.map(listing => (
      <ServiceCard
        key={listing.id}
        image={listing.hero_image_url}
        title={listing.title}
        price={`£${listing.hourly_rate}/hr`}
        rating={listing.average_rating}
        onClick={() => router.push(`/listings/${listing.id}`)}
      />
    ))}
  </div>
</Card>
```

---

#### **ReviewsCard Component** (ENHANCED)
**File:** `apps/web/src/app/components/public-profile/ReviewsCard.tsx`

**Purpose:** Display actual reviews (not hardcoded)

**Features:**
- Fetch real reviews from database
- Star ratings with visual stars
- Review text with "Read more" expansion
- Reviewer avatar and name
- Date posted
- "Show all reviews" button

**UI Structure:**
```tsx
<Card className={styles.reviewsCard}>
  <div className={styles.cardHeader}>
    <h2 className={styles.cardTitle}>
      <StarIcon /> Reviews ({totalReviews})
    </h2>
    <div className={styles.ratingOverview}>
      <span className={styles.avgRating}>{avgRating}</span>
      <StarRating rating={avgRating} />
      <span className={styles.reviewCount}>({totalReviews} reviews)</span>
    </div>
  </div>

  <div className={styles.reviewsList}>
    {reviews.map(review => (
      <ReviewItem key={review.id} review={review} />
    ))}
  </div>

  <Button variant="secondary" onClick={handleShowAll}>
    Show all {totalReviews} reviews
  </Button>
</Card>
```

---

### 2.3 Sidebar Column Components (Sticky)

#### **ProfileActionCard Component** (ENHANCED)
**File:** Enhanced version of existing `PublicActionCard`

**Purpose:** Primary CTAs (like listing page ActionCard)

**Features:**
- **Prominent pricing display** (if applicable for tutors)
- **"Book Session" CTA** (teal button, full width)
- **"Send Message" button** (secondary)
- **"Connect" button** (outline)
- **Trust indicators:**
  - ✓ Free cancellation up to 24 hours
  - ✓ Money-back guarantee
  - ✓ Verified identity

**UI Structure:**
```tsx
<Card className={styles.actionCard}>
  {/* Pricing (for tutors) */}
  {role === 'tutor' && (
    <div className={styles.pricingSection}>
      <div className={styles.priceLabel}>Starting from</div>
      <div className={styles.price}>
        £{hourlyRate}<span className={styles.priceUnit}>/hr</span>
      </div>
      <div className={styles.priceNote}>
        📅 Select date & time after clicking "Book Now"
      </div>
    </div>
  )}

  {/* Primary CTA */}
  <Button
    variant="primary"
    size="large"
    fullWidth
    onClick={handleBookSession}
  >
    Book Session
  </Button>

  {/* Secondary actions */}
  <div className={styles.secondaryActions}>
    <Button variant="secondary" fullWidth onClick={handleSendMessage}>
      <MessageIcon /> Send Message
    </Button>
    <Button variant="outline" fullWidth onClick={handleConnect}>
      <LinkIcon /> Connect
    </Button>
  </div>

  {/* Trust badges */}
  <div className={styles.trustBadges}>
    <TrustBadge icon={<CheckIcon />} text="Free cancellation" />
    <TrustBadge icon={<ShieldIcon />} text="Money-back guarantee" />
  </div>
</Card>
```

---

#### **VerificationCard Component** (NEW)
**File:** `apps/web/src/app/components/public-profile/VerificationCard.tsx`

**Purpose:** Show verification status (like listing page tutor verification)

**UI Structure:**
```tsx
<Card className={styles.verificationCard}>
  <h3 className={styles.cardTitle}>Verification</h3>

  <div className={styles.verificationGrid}>
    <VerificationBadge
      icon={<MailIcon />}
      label="Email"
      status={emailVerified ? 'verified' : 'unverified'}
    />
    <VerificationBadge
      icon={<PhoneIcon />}
      label="Phone"
      status={phoneVerified ? 'verified' : 'unverified'}
    />
    <VerificationBadge
      icon={<IdCardIcon />}
      label="ID Verified"
      status={idVerified ? 'verified' : 'unverified'}
    />
    <VerificationBadge
      icon={<ShieldCheckIcon />}
      label="DBS Check"
      status={dbsVerified ? 'verified' : 'unverified'}
    />
  </div>
</Card>
```

**Styling:** Match listing page ActionCard verification section

---

#### **StatsCard Component** (ENHANCED)
**File:** Enhanced version of `RoleStatsCard`

**Purpose:** Key metrics (like listing page tutor stats)

**Features:**
- Visual icons for each stat
- Color-coded values (green for good metrics)
- Tooltips explaining metrics

**UI Structure:**
```tsx
<Card className={styles.statsCard}>
  <h3 className={styles.cardTitle}>Performance Stats</h3>

  <div className={styles.statsGrid}>
    <StatItem
      icon={<GraduationCapIcon />}
      label="Sessions Taught"
      value={sessionsTaught}
      color="blue"
    />
    <StatItem
      icon={<StarIcon />}
      label="Reviews"
      value={reviewCount}
      color="yellow"
    />
    <StatItem
      icon={<ClockIcon />}
      label="Response Time"
      value={`${responseTimeHours}h`}
      color="green"
    />
    <StatItem
      icon={<PercentIcon />}
      label="Response Rate"
      value={`${responseRate}%`}
      color="green"
    />
  </div>
</Card>
```

---

### 2.4 Related Section Components

#### **SimilarProfilesCard Component** (NEW)
**File:** `apps/web/src/app/components/public-profile/SimilarProfilesCard.tsx`

**Purpose:** Recommendations (like listing page related listings)

**Features:**
- Fetch similar profiles by role/subjects/location
- Display as cards with avatar, name, role, rating
- "View Profile" CTA

---

## Phase 3: Layout Implementation

### 3.1 Update Main Page Component

**File:** `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx`

**Changes:**
```tsx
// BEFORE (current 3-column layout)
return (
  <PublicProfileLayout sidebar={...}>
    <div className={styles.container}>
      <h1>Public Profile</h1>
      <UnifiedProfileTabs profile={profile} />
    </div>
  </PublicProfileLayout>
);

// AFTER (new 2-column layout with Container)
return (
  <>
    <Container>
      {/* Top Section: Header + Hero (1-column) */}
      <div className={styles.topSection}>
        <ProfileHeader
          profile={profile}
          stats={profileStats}
          isOwnProfile={isOwnProfile}
        />
        <HeroImageSection profile={profile} />
      </div>

      {/* Body Section: 2-column grid */}
      <div className={styles.bodySection}>
        {/* Main Column (2fr) */}
        <div className={styles.mainColumn}>
          <AboutSection profile={profile} />

          {/* Role-specific professional info */}
          {renderProfessionalInfo()}

          <ServicesCard profileId={profile.id} />
          <ReviewsCard profileId={profile.id} />
        </div>

        {/* Sidebar Column (1fr, sticky) */}
        <div className={styles.sidebarColumn}>
          <ProfileActionCard
            profile={profile}
            currentUser={currentUserProfile}
            isOwnProfile={isOwnProfile}
          />
          <VerificationCard profile={profile} />
          <StatsCard profile={profile} stats={profileStats} />
        </div>
      </div>

      {/* Related Section: Similar profiles (1-column) */}
      <div className={styles.relatedSection}>
        <SimilarProfilesCard
          currentProfile={profile}
          role={profile.active_role}
        />
      </div>
    </Container>

    {/* Mobile-only: Fixed bottom CTA */}
    <MobileBottomCTA
      profile={profile}
      onBookSession={handleBookSession}
    />
  </>
);
```

---

### 3.2 New CSS Module

**File:** `apps/web/src/app/public-profile/[id]/[[...slug]]/page.module.css`

**Replace entire file with listing page structure:**

```css
/* Match listing page exactly */

/* Top Section: Header + Images (1-column) */
.topSection {
  margin-bottom: var(--space-6, 48px);
}

/* Body Section: 2-column grid (desktop) */
.bodySection {
  display: grid;
  grid-template-columns: 1fr; /* Mobile: single column */
  gap: var(--space-6, 48px);
  margin-bottom: var(--space-4, 32px);
}

@media (min-width: 768px) {
  .bodySection {
    grid-template-columns: 2fr 1fr; /* Desktop: 2/3 + 1/3 */
  }
}

/* Main Column (left side, 2/3 width) */
.mainColumn {
  display: flex;
  flex-direction: column;
  gap: var(--space-4, 32px);
}

/* Sidebar Column (right side, 1/3 width, sticky on desktop) */
.sidebarColumn {
  display: none; /* Hidden on mobile */
}

@media (min-width: 768px) {
  .sidebarColumn {
    display: block;
    position: sticky;
    top: var(--space-6, 48px);
    align-self: flex-start;
    max-height: calc(100vh - var(--space-6) * 2);
    overflow-y: auto;
  }
}

/* Related Section (1-column full width) */
.relatedSection {
  margin-bottom: var(--space-6, 48px);
}
```

---

## Phase 4: Remove Old Architecture

### 4.1 Deprecate PublicProfileLayout

**Action:** Mark as deprecated, add warning

**File:** `apps/web/src/app/components/public-profile/PublicProfileLayout.tsx`

```tsx
/**
 * @deprecated This component is deprecated in favor of Container-based layout
 * Used by legacy public profile page. Will be removed in v5.0
 */
```

### 4.2 Remove UnifiedProfileTabs

**Action:** Replace with individual section components

- Keep logic for fetching listings/reviews
- Break into separate AboutSection, ServicesCard, ReviewsCard
- Remove tab navigation (content is now sectioned vertically)

---

## Phase 5: Visual Polish Improvements

### 5.1 Typography Enhancement
- Match listing page font sizes exactly
- Use consistent heading hierarchy (h1: 2.5rem, h2: 1.875rem, h3: 1.5rem)
- Line heights using golden ratio (1.618)

### 5.2 Spacing System
- Use CSS variables consistently: `var(--space-4, 32px)`, `var(--space-6, 48px)`
- Match listing page gap values exactly

### 5.3 Color Palette
- Primary CTA: Teal (#006C67)
- Secondary buttons: Gray
- Success indicators: Green (#10b981)
- Warning badges: Yellow
- Error states: Red

### 5.4 Shadows & Borders
- Card shadow: `0 1px 3px rgba(0, 0, 0, 0.1)`
- Hover shadow: `0 4px 6px rgba(0, 0, 0, 0.1)`
- Border radius: `var(--radius-lg, 12px)` for cards

### 5.5 Icons
- Use Lucide React icons consistently
- Icon size: 20px for inline, 24px for standalone
- Icon color: Match text color or brand color

### 5.6 Images
- Hero image: 16:9 aspect ratio, 600px height
- Profile avatar: 160px circle in hero, 120px in cards
- Service cards: 4:3 aspect ratio thumbnails

---

## Phase 6: Mobile Optimization

### 6.1 Mobile Bottom CTA

**File:** `apps/web/src/app/components/public-profile/MobileBottomCTA.tsx`

**Purpose:** Fixed bottom bar with "Book Session" CTA (like listing page)

```tsx
'use client';

export function MobileBottomCTA({ profile, onBookSession }) {
  return (
    <div className={styles.mobileBottomCTA}>
      <div className={styles.ctaContent}>
        <div className={styles.priceInfo}>
          <span className={styles.price}>£{profile.hourly_rate}/hr</span>
          <span className={styles.rating}>★ {profile.rating}</span>
        </div>
        <Button
          variant="primary"
          size="large"
          onClick={onBookSession}
          className={styles.bookButton}
        >
          Book Session
        </Button>
      </div>
    </div>
  );
}
```

**CSS:**
```css
.mobileBottomCTA {
  display: block;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e5e7eb;
  padding: 1rem;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 50;
}

@media (min-width: 768px) {
  .mobileBottomCTA {
    display: none; /* Hide on desktop */
  }
}
```

---

## Phase 7: Data Fetching Improvements

### 7.1 Fetch Real Stats

**Update:** `apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx`

```tsx
// Fetch profile stats (like listing page)
const profileStats = await getProfileStats(profile.id);

interface ProfileStats {
  sessionsTaught: number;
  totalReviews: number;
  averageRating: number;
  responseTimeHours: number;
  responseRate: number;
  joinDate: string;
}
```

### 7.2 Fetch Real Reviews

```tsx
// Fetch reviews
const { data: reviews } = await supabase
  .from('reviews')
  .select('*, reviewer:profiles(full_name, avatar_url)')
  .eq('reviewed_user_id', profile.id)
  .order('created_at', { ascending: false })
  .limit(5);
```

### 7.3 Fetch Active Listings

```tsx
// Fetch user's active listings
const { data: listings } = await supabase
  .from('listings')
  .select('id, title, hourly_rate, hero_image_url, average_rating, status')
  .eq('profile_id', profile.id)
  .eq('status', 'published')
  .order('created_at', { ascending: false })
  .limit(3);
```

---

## Phase 8: Implementation Timeline

### **Week 1: Foundation (Priority 1)**
- [ ] Remove PublicProfileLayout, switch to Container
- [ ] Implement new page.module.css with 2-column grid
- [ ] Create ProfileHeader component
- [ ] Create HeroImageSection component
- [ ] Test basic layout structure

### **Week 2: Main Content (Priority 2)**
- [ ] Create AboutSection component
- [ ] Enhance ProfessionalInfo components styling
- [ ] Create ServicesCard component
- [ ] Create ReviewsCard component with real data
- [ ] Implement data fetching for stats/reviews/listings

### **Week 3: Sidebar (Priority 3)**
- [ ] Enhance ProfileActionCard (Book Session, Send Message)
- [ ] Create VerificationCard component
- [ ] Enhance StatsCard styling
- [ ] Implement sticky positioning
- [ ] Add mobile bottom CTA

### **Week 4: Polish (Priority 4)**
- [ ] Create SimilarProfilesCard component
- [ ] Match typography/spacing/colors exactly to listing page
- [ ] Add all icons (Lucide React)
- [ ] Implement hover states and micro-interactions
- [ ] Mobile responsive testing

### **Week 5: Testing & Launch (Priority 5)**
- [ ] Test all CTAs (Book Session, Send Message, Connect)
- [ ] Test data fetching for all profile types (Tutor/Client/Agent)
- [ ] Mobile testing on real devices
- [ ] Performance optimization (image lazy loading)
- [ ] SEO verification (metadata, structured data)
- [ ] Deploy to production

---

## Phase 9: Success Metrics

### Before (Current State)
- ❌ 3-column layout with AppSidebar confusion
- ❌ Basic card styling
- ❌ Hardcoded stats (RoleStatsCard)
- ❌ No hero image section
- ❌ No sticky sidebar
- ❌ Limited CTAs
- ❌ No mobile optimization

### After (Target State)
- ✅ Clean 2-column layout with Container
- ✅ Professional card styling matching listing page
- ✅ Real data for stats/reviews/listings
- ✅ Hero image section with fallback
- ✅ Sticky sidebar on desktop
- ✅ Prominent CTAs (Book Session, Send Message)
- ✅ Mobile bottom CTA bar

### Key Improvements
1. **Visual Quality:** Match listing page professional appearance
2. **Layout Consistency:** Use same grid system and Container
3. **Functionality:** Real data instead of mocks, working CTAs
4. **Mobile UX:** Fixed bottom CTA bar for easy action
5. **SEO:** Better structured content with rich snippets
6. **Conversion:** Prominent "Book Session" CTAs throughout

---

## Phase 10: File Structure Summary

### New Files to Create
```
apps/web/src/app/components/public-profile/
├── ProfileHeader.tsx                    (NEW - replaces simple title)
├── ProfileHeader.module.css             (NEW)
├── HeroImageSection.tsx                 (NEW - hero banner)
├── HeroImageSection.module.css          (NEW)
├── AboutSection.tsx                     (NEW - rich intro)
├── AboutSection.module.css              (NEW)
├── ServicesCard.tsx                     (NEW - active listings)
├── ServicesCard.module.css              (NEW)
├── ReviewsCard.tsx                      (ENHANCE - real reviews)
├── ReviewsCard.module.css               (ENHANCE)
├── VerificationCard.tsx                 (NEW - verification badges)
├── VerificationCard.module.css          (NEW)
├── StatsCard.tsx                        (ENHANCE - visual stats)
├── StatsCard.module.css                 (ENHANCE)
├── SimilarProfilesCard.tsx              (NEW - recommendations)
├── SimilarProfilesCard.module.css       (NEW)
├── MobileBottomCTA.tsx                  (NEW - mobile CTA bar)
└── MobileBottomCTA.module.css           (NEW)
```

### Files to Modify
```
apps/web/src/app/public-profile/[id]/[[...slug]]/
├── page.tsx                             (MAJOR REFACTOR - new layout)
└── page.module.css                      (REPLACE - 2-column grid)

apps/web/src/app/components/public-profile/
├── PublicActionCard.tsx                 (ENHANCE - match ActionCard)
├── PublicActionCard.module.css          (ENHANCE)
└── UnifiedProfileTabs.tsx               (DEPRECATE - split into sections)
```

### Files to Deprecate
```
apps/web/src/app/components/public-profile/
├── PublicProfileLayout.tsx              (DEPRECATE - use Container)
└── PublicProfileLayout.module.css       (DEPRECATE)
```

---

## Phase 11: Technical Considerations

### 11.1 Server-Side Rendering
- Keep SSR for SEO (already implemented ✅)
- Fetch all data server-side in page.tsx
- Pass data as props to client components

### 11.2 Loading States
- Implement skeleton loaders for each section
- Match listing page loading experience

### 11.3 Error Handling
- Graceful fallbacks for missing images
- Empty states for no reviews/listings
- Error boundaries for component failures

### 11.4 Accessibility
- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels for buttons
- Keyboard navigation support
- Alt text for all images

### 11.5 Performance
- Lazy load images with Next.js Image component
- Optimize hero images (WebP format)
- Code split heavy components
- Cache profile data (ISR strategy)

---

## Conclusion

This plan transforms the public profile page from a **basic 3-column layout** into a **professional 2-column layout** matching the listing details page gold standard.

**Key Changes:**
1. ❌ **Remove:** 3-column grid with AppSidebar
2. ✅ **Add:** Container with 2-column grid (2fr + 1fr)
3. ✅ **Add:** Hero image section for visual appeal
4. ✅ **Add:** Rich content sections (About, Services, Reviews)
5. ✅ **Add:** Sticky sidebar with enhanced CTAs
6. ✅ **Add:** Mobile bottom CTA bar
7. ✅ **Upgrade:** All components to match listing page quality

**Timeline:** 5 weeks for complete implementation and testing

**Result:** Production-ready public profile page that matches listing details page quality and provides excellent user experience for conversion.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Implementation Plan - Ready for Approval
