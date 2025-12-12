# Public Profile

**Status**: Active
**Last Code Update**: 2025-12-12
**Last Doc Update**: 2025-12-12
**Priority**: High (Tier 1 - Critical)
**Architecture**: Server-Side Rendered Public Pages

## Quick Links
- [Solution Design](./public-profile-solution-design.md)
- [Implementation Guide](./public-profile-implementation.md)
- [AI Prompt Context](./public-profile-prompt.md)

## Overview

The Public Profile feature is Tutorwise's primary showcase for users, serving as the "shop window" for tutors, agents, and clients. Built as a Next.js Server Component with SEO optimization, it displays comprehensive professional information, service listings, reviews, and credibility metrics to potential clients and visitors.

## Key Features

- **SEO-Friendly URLs**: Permanent [id]/[[...slug]] routing with 301 redirects
- **Server-Side Rendering**: Fast TTFB, fully indexable by search engines
- **15 Modular Cards**: Flexible component architecture
- **Real-Time Statistics**: Live aggregations (sessions, reviews, profile views)
- **Role-Based Content**: Different professional info per role (tutor/client/agent)
- **Own Profile Detection**: "Edit My Profile" vs "Book Session" CTAs
- **Mobile-Optimized**: 2-column desktop, stacked mobile, sticky bottom CTA
- **Analytics Tracking**: Profile view logging for dashboard metrics
- **Slug Resilience**: Name changes don't break shared links

## Component Architecture

### Main Page
- [public-profile/[id]/[[...slug]]/page.tsx](../../../apps/web/src/app/public-profile/[id]/[[...slug]]/page.tsx) - Server Component (CRITICAL)

### Card Components (15 total)
**Hero Section**:
- `ProfileHeroSection` - Avatar, name, role, quick stats

**Main Column** (Left, 2fr width):
- `AboutCard` - Bio text
- `ProfessionalInfoCard` - Role-specific professional details
- `ServicesCard` - Listings (max 5 with count badge)
- `AvailabilityScheduleCard` - Weekly availability grid
- `ReviewsCard` - Reviews with ratings

**Sidebar Column** (Right, 1fr width):
- `VerificationCard` - Identity, DBS, address badges
- `RoleStatsCard` - Sessions, reviews, tutors/clients stats
- `GetInTouchCard` - Sticky CTAs

**Related Section** (Full width):
- `SimilarProfilesCard` - Discover similar profiles

**Mobile-Only**:
- `MobileBottomCTA` - Fixed bottom bar with CTAs

**Analytics**:
- `ProfileViewTracker` - Hidden component, logs views

**Additional**:
- `IntroductionCard`, `AvailabilityCard`, `CredibilityScoreCard`

## Routes

### Main Route
- **Path**: `/public-profile/[id]/[[...slug]]`
- **Type**: Server Component (async)
- **Dynamic**: Yes (ID + optional slug for SEO)

### Examples
- `/public-profile/uuid` - Base profile URL
- `/public-profile/uuid/john-smith-mathematics-tutor` - SEO-friendly URL

## Database Tables

### Primary Tables
- `profiles` - User profile data (id, full_name, slug, avatar_url, bio, active_role, professional_details)
- `listings` - Service offerings (profile_id, title, hourly_rate, subjects, levels, status)
- `profile_reviews` - 6-way mutual review system (reviewer_id, reviewee_id, session_id, rating, comment)
- `bookings` - Session statistics (student_id, tutor_id, status)
- `profile_view_counts` - Materialized view for performance (profile_id, total_views)

## Key Workflows

### URL Validation Flow
```
1. User lands on /public-profile/{id}/{slug}
2. Server fetches profile by ID only
3. Server validates slug matches profile.slug
4. If slug wrong: 301 redirect to correct slug
5. If slug correct: Render profile
```

### Statistics Aggregation Flow
```
1. Fetch reviews → Calculate average_rating, total_reviews
2. Fetch bookings → Count sessions_completed
3. Fetch profile_views → Get total_views from materialized view
4. Augment profile with calculated stats
5. Pass enrichedProfile to components
```

### Own Profile Detection Flow
```
1. Get current user session
2. Check if user.id === profile.id
3. If TRUE: Show "Edit My Profile" CTA
4. If FALSE: Show "Book Session", "Message", "Connect" CTAs
```

## Integration Points

- **Authentication**: Own profile detection, CTA customization
- **Listings**: Service offerings display (ServicesCard)
- **Reviews**: 6-way mutual review system (ReviewsCard)
- **Bookings**: Session statistics (RoleStatsCard)
- **Analytics**: Profile view tracking (ProfileViewTracker)
- **CaaS**: Credibility scores (VerificationCard)
- **Hub Layout**: Account editing (/account/personal-info)
- **Marketplace**: Similar profiles discovery

## Design System

**Colors**:
- Card header background: `#E6F0F0` (light teal)
- Border: `#e5e7eb`
- Text primary: `#1f2937`
- Text secondary: `#6b7280`

**Spacing**:
- Card padding: `16px` (desktop), `12px` (mobile)
- Card header padding: `12px 16px` (desktop), `10px 12px` (mobile)

**Border Radius**:
- Card: `8px`
- Card header: `8px 8px 0 0` (top corners only)

**Responsive Breakpoints**:
- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

## Performance Metrics

**Current Performance**:
- TTFB: ~150ms (server-side rendering)
- LCP: ~1.2s
- FID: <100ms
- CLS: <0.1

**Optimization Techniques**:
- Server-side rendering
- Parallel queries (`Promise.all()`)
- Materialized views (profile_view_counts)
- Image optimization (`next/image`)
- CSS Modules (scoped styles)

## Recent Changes

### v4.9 - Redesign (2025-12-12)
- Redesigned to match listing details gold standard
- 2-column layout (2fr 1fr)
- Sticky sidebar on desktop
- MobileBottomCTA for mobile devices
- Real-time statistics aggregation
- ProfileViewTracker analytics

### v4.8 - ServicesCard Updates
- Added `excludeListingId` prop to ServicesCard
- Clickable badge (own profile) → navigates to `/listings`
- Max 5 listings display
- Card header border-radius fixes

## User Roles

### All Roles
- View public profiles
- See reviews, listings, availability
- Share profiles (viral loop)

### Tutors
- Professional qualifications display
- Service listings showcase
- Verification badges (DBS, ID, address)
- Response rate, session stats

### Clients
- Learning goals and preferences
- Tutors worked with
- Reviews given

### Agents
- Agency information
- Managed tutors showcase
- Business credentials

## Status

- [x] Server-side rendering
- [x] SEO-friendly URLs with slug validation
- [x] 301 redirects for slug changes
- [x] 15 modular card components
- [x] Real-time statistics aggregation
- [x] Own profile detection
- [x] Mobile-responsive design
- [x] Profile view tracking
- [x] Role-based professional info
- [x] Similar profiles discovery

---

**Last Updated**: 2025-12-12
**Version**: v4.9
**Architecture**: Server-Side Rendered Public Pages
**For Questions**: See [public-profile-implementation.md](./public-profile-implementation.md)
