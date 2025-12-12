# Profile and Service Listing Management

**Source:** Confluence - Technology Operations (TO)
**Page ID:** 13008898
**Version:** 1
**URL:** https://tutorwise.atlassian.net/wiki/spaces/TO/pages/13008898/Profile+and+the+service+listing+management

---

## Problem Statement

The onboarding data has not been shared with their existing profile and the service listing management system (when we build it).

Currently, the onboarding data captured during the tutor/agent/client onboarding flows is being stored, but it's not being integrated into:

- **User Profile** - The profile data collected during onboarding should populate the user's profile
- **Service Listing Management System** - For tutors/agents, their onboarding data (subjects, rates, availability, etc.) should feed into their service listings

## Current Data Flow

**Tutor Onboarding** saves to `role_details`:
- subjects, teaching_experience, qualifications, hourly_rate, availability, teaching_methods

**Agent Onboarding** saves to `role_details`:
- agency_name, agency_size, years_in_business, agency_description, services, commission_rate, service_areas, student_capacity

### The Issue

- This data is NOT being pulled into the user's main profile view
- It's NOT integrated with any service listing management system (because that doesn't exist yet)
- The role_details table might need additional fields for a full service listing system

---

## DESIGN PROPOSAL: Profile Integration & Service Listing Management

### Part 1: Enhanced Profile Page with Role-Specific Data

#### Design Overview

Update the profile page to show role-specific information from role_details table in separate tab sections.

#### Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    PROFILE PAGE                              │
├─────────────────┬───────────────────────────────────────────┤
│  SIDEBAR        │  TABS: [Profile] [Tutor Info] [Agent Info]│
│  - Avatar       │                                            │
│  - Name         │  ┌──────────────────────────────────────┐ │
│  - Roles        │  │  Role-Specific Content               │ │
│  - Stats        │  │  (Dynamic based on active tab)       │ │
│                 │  │                                       │ │
│  ROLES:         │  │  • Tutor: subjects, rates, schedule  │ │
│  🎓 Tutor       │  │  • Agent: agency info, services      │ │
│  🏠 Agent       │  │  • Editable fields                   │ │
│                 │  └──────────────────────────────────────┘ │
└─────────────────┴───────────────────────────────────────────┘
```

#### Tab Structure

- **Profile Details** (existing) - Basic user info
- **Tutor Profile** (new) - Only shown if user has provider role
- **Agency Profile** (new) - Only shown if user has agent role
- **Account Security** (existing)

#### Data Flow

```
UserProfileContext
    ↓
Profile Page loads user + role_details
    ↓
Display role-specific tabs dynamically
    ↓
Allow editing → Save to role_details table
```

---

### Part 2: Service Listing Management System

#### Design Overview

A dedicated system for tutors/agents to create, manage, and publish service listings that pull from their onboarding data.

#### Database Schema Extension

```sql
-- New table: service_listings
CREATE TABLE service_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_type TEXT NOT NULL CHECK (role_type IN ('provider', 'agent')),

    -- Basic Information
    title TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE,

    -- Service Details
    subjects JSONB,
    hourly_rate DECIMAL(10,2),
    trial_session_rate DECIMAL(10,2),

    -- Availability
    availability JSONB,
    max_students_per_week INTEGER,

    -- Location & Delivery
    location_type TEXT[], -- ['online', 'in_person', 'hybrid']
    service_areas TEXT[], -- Geographic areas if in-person

    -- Status & Visibility
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    published_at TIMESTAMPTZ,

    -- Metadata
    views_count INTEGER DEFAULT 0,
    booking_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_service_listings_profile ON service_listings(profile_id);
CREATE INDEX idx_service_listings_status ON service_listings(status);
CREATE INDEX idx_service_listings_role_type ON service_listings(role_type);
CREATE INDEX idx_service_listings_subjects ON service_listings USING GIN(subjects);
CREATE INDEX idx_service_listings_published ON service_listings(published_at) WHERE status = 'active';
```

#### Visual Interface Design

**A. Listings Management Dashboard**

```
┌──────────────────────────────────────────────────────────────┐
│  MY SERVICE LISTINGS                        [+ New Listing]   │
├──────────────────────────────────────────────────────────────┤
│  Filters: [All] [Active] [Draft] [Paused]                    │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📚 GCSE Maths Tutoring                    [Active]     │  │
│  │ £45/hr • Online & In-person • 12 bookings             │  │
│  │ [Edit] [Pause] [View Public] [Analytics]              │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 🎓 A-Level Physics Tutoring              [Draft]      │  │
│  │ £60/hr • Online only • 0 bookings                     │  │
│  │ [Edit] [Publish] [Preview] [Delete]                   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**B. Create/Edit Listing Form**

```
┌──────────────────────────────────────────────────────────────┐
│  CREATE SERVICE LISTING                                       │
├──────────────────────────────────────────────────────────────┤
│  Step 1: Basic Information                                    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Title: [________________________]                       │ │
│  │ Description: [_____________________________________]    │ │
│  │             [_____________________________________]     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Step 2: Subjects & Expertise (Pre-filled from onboarding)   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ☑ Mathematics    ☑ Physics    ☐ Chemistry             │ │
│  │ ☐ English        ☐ History                            │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Step 3: Pricing (Pre-filled from onboarding)                │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Hourly Rate: £ [45] /hour                              │ │
│  │ ☑ Offer trial session  Trial rate: £ [20]              │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  Step 4: Availability (Pre-filled from onboarding)           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Mon: [09:00-12:00] [14:00-17:00]  [+ Add slot]         │ │
│  │ Tue: [09:00-12:00]                [+ Add slot]         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Save as Draft] [Preview] [Publish]                         │
└──────────────────────────────────────────────────────────────┘
```

**C. Public Listing Page**

URL: `/listings/[listing-id]` or `/tutors/[username]/[listing-slug]`

```
┌──────────────────────────────────────────────────────────────┐
│  GCSE Mathematics Tutoring with Sarah K.                      │
│  ⭐⭐⭐⭐⭐ 4.9/5 (42 reviews)                                 │
├──────────────────────────────────────────────────────────────┤
│  [Photo]           │  £45/hour                                │
│                    │  📍 Online & In-person (London)          │
│  About this        │  ⏰ Available Mon-Fri afternoons         │
│  listing:          │                                          │
│  Experienced GCSE  │  [Book a Session] [Message Tutor]       │
│  maths tutor...    │                                          │
│                    │  What you'll learn:                      │
│                    │  • Algebra & equations                   │
│                    │  • Geometry & trigonometry               │
│                    │  • Statistics & probability              │
└────────────────────┴──────────────────────────────────────────┘
```

#### Key Features

**1. Auto-Population from Onboarding**

When a user creates their first listing:
- Pull subjects, hourly_rate, availability, qualifications from role_details
- User can override/customize for specific listings
- Smart defaults reduce friction

**2. Multi-Listing Support**
- Tutors can create multiple listings (e.g., "GCSE Maths", "A-Level Maths")
- Different pricing for different subjects/levels
- Different availability for different services

**3. Listing States**
- **Draft**: Not visible publicly, can be edited freely
- **Active**: Published and visible in marketplace/search
- **Paused**: Temporarily hidden (keeping data for reactivation)
- **Archived**: Permanently retired

#### Component Architecture

```
/app
  /listings
    /page.tsx                      # Browse all listings (marketplace)
    /[id]
      /page.tsx                    # Public listing view
    /manage
      /page.tsx                    # User's listing management dashboard
      /new
        /page.tsx                  # Create new listing wizard
      /[id]
        /edit
          /page.tsx                # Edit existing listing
        /analytics
          /page.tsx                # Listing performance stats

/components
  /listings
    /ListingCard.tsx               # Card in marketplace
    /ListingForm.tsx               # Create/edit form
    /ListingPublicView.tsx         # Public-facing listing page
    /AvailabilitySelector.tsx      # Schedule picker
    /PricingConfigurator.tsx       # Rate & trial session config
```

#### API Routes

```javascript
// GET /api/listings - Get all active listings (public)
// GET /api/listings/my - Get user's own listings (authed)
// POST /api/listings - Create new listing (authed)
// PATCH /api/listings/[id] - Update listing (authed, owner only)
// DELETE /api/listings/[id] - Delete listing (authed, owner only)
// POST /api/listings/[id]/publish - Publish draft (authed, owner only)
// POST /api/listings/[id]/pause - Pause active listing (authed, owner only)
```

#### Integration Points

**Onboarding → Role Details → Listings**

```
User completes onboarding
    ↓
Data saved to role_details table
    ↓
User clicks "Create Listing" in dashboard
    ↓
Form pre-populated with role_details data
    ↓
User customizes & publishes listing
    ↓
Listing appears in marketplace
```

**Profile Page → Listings**

Profile page shows:
- "View My Listings" button (if provider/agent)
- Quick stats: "3 active listings, 42 bookings this month"
- Link to create first listing if none exist

**Dashboard Integration**

Dashboard shows:
- Recent inquiries from listings
- Upcoming sessions from bookings
- Performance metrics per listing
- "Quick actions" to create/edit listings

---

## Benefits of This Design

1. **Reduces Data Entry**: Onboarding data auto-fills listing forms
2. **Flexibility**: Users can customize per listing or update globally in role_details
3. **Scalability**: Tutors can manage multiple specialized listings
4. **Discoverability**: Public listings improve SEO and marketplace visibility
5. **Analytics**: Track which listings perform best
6. **Professional**: Dedicated listing pages look more credible than basic profiles

---

## Implementation Priority

### Phase 1: Profile Integration (Easier, foundational)
- Add role-specific tabs to profile page
- Display role_details data
- Enable editing role details

### Phase 2: Basic Listing System
- Create service_listings table
- Build listing management dashboard
- Implement create/edit/publish flow

### Phase 3: Public Marketplace
- Public listing pages
- Search/filter listings
- Booking integration

### Phase 4: Analytics & Optimization
- Performance tracking
- A/B testing for listing optimization
- Smart recommendations
