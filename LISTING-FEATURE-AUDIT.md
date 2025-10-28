# Service Listing Feature Audit Report

**Date**: 2025-10-27
**Auditor**: AI Analysis
**Scope**: Complete audit of service listing feature including my-listings functionality

---

## Executive Summary

This comprehensive audit covers the entire service listing system, from creation workflows to template generation, database schema, and integration points. The feature is **functionally complete** but has significant **UX and role permission issues** that need immediate attention.

### Overall Status: ⚠️ **FUNCTIONAL BUT NEEDS IMPROVEMENT**

**Strengths**:
- ✅ Complete CRUD operations
- ✅ Sophisticated template system with auto-generation
- ✅ Hybrid draft auto-save (localStorage + database)
- ✅ Comprehensive search/filter functionality
- ✅ Proper database schema with 25+ fields

**Critical Issues**:
- ❌ Role guards too permissive (students can access listings!)
- ❌ Single massive form (250+ lines) - poor mobile UX
- ❌ No draft save status indicator
- ❌ No listing preview before publish

**Recommendation**: Address critical issues before production launch.

---

## Table of Contents

1. [Feature Architecture](#1-feature-architecture)
2. [Components Analysis](#2-components-analysis)
3. [Data Flow & State Management](#3-data-flow--state-management)
4. [Database Schema](#4-database-schema)
5. [Pages & Routes](#5-pages--routes)
6. [Integration Points](#6-integration-points)
7. [Critical Issues](#7-critical-issues)
8. [Missing Features](#8-missing-features)
9. [Code Quality Issues](#9-code-quality-issues)
10. [Recommendations](#10-recommendations)

---

## 1. Feature Architecture

### 1.1 High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LISTING SYSTEM                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │ My Listings  │◄────►│  API Layer   │◄────►│ Supabase  │ │
│  │   (CRUD UI)  │      │ (listings.ts)│      │ listings  │ │
│  └──────────────┘      └──────────────┘      │   table   │ │
│         ▲                      ▲              └───────────┘ │
│         │                      │                            │
│         │              ┌───────┴───────┐                    │
│         │              │               │                    │
│  ┌──────┴──────┐  ┌───▼───────┐  ┌───▼─────────┐          │
│  │   Create    │  │  Template │  │ Marketplace │          │
│  │  Listing    │  │ Generator │  │   Search    │          │
│  │   Wizard    │  │           │  │             │          │
│  └─────────────┘  └───────────┘  └─────────────┘          │
│         ▲              ▲                                    │
│         │              │                                    │
│         │    ┌─────────┴──────────┐                        │
│         │    │  Tutor Onboarding  │                        │
│         │    │    (generates 4    │                        │
│         │    │     templates)     │                        │
│         │    └────────────────────┘                        │
│         │                                                   │
│  ┌──────┴──────────────────┐                               │
│  │  Draft Auto-Save System │                               │
│  │ (localStorage + DB sync)│                               │
│  └─────────────────────────┘                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Tree

```
apps/web/src/
├── app/
│   ├── my-listings/
│   │   ├── page.tsx                    # List view (grid of ListingCards)
│   │   ├── ListingCard.tsx             # Individual listing display
│   │   ├── create/
│   │   │   └── page.tsx                # Creation page (wraps wizard)
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx            # Edit page (reuses wizard)
│   ├── marketplace/
│   │   ├── page.tsx                    # Public marketplace search
│   │   └── ListingCard.tsx             # Public listing card (different)
│   └── components/
│       └── listings/
│           ├── CreateListingWizard.tsx # State management wrapper
│           ├── CreateListingForm.tsx   # Thin wrapper (28 lines)
│           ├── ImageUpload.tsx         # Image upload with drag-drop
│           └── wizard-steps/
│               ├── CreateListings.tsx  # MAIN FORM (250+ lines)
│               ├── CustomCalendar.tsx  # Calendar picker
│               ├── CustomTimePicker.tsx
│               └── CustomDateInput.tsx
├── lib/
│   ├── api/
│   │   └── listings.ts                 # CRUD API (377 lines)
│   ├── utils/
│   │   ├── templateGenerator.ts        # Template generation logic
│   │   └── draftSync.ts                # Draft auto-save system
│   └── data/
│       └── listingTemplates.json       # 4 predefined templates
└── hooks/
    └── useRoleGuard.ts                 # Permission checking
```

---

## 2. Components Analysis

### 2.1 CreateListingWizard vs CreateListingForm

**Observation**: Confusing naming - not actually a multi-step wizard!

#### CreateListingForm.tsx (28 lines)
```typescript
// Just a thin wrapper - passes props through
export default function CreateListingForm({ listing, onSubmit }: Props) {
  return <CreateListingWizard listing={listing} onSubmit={onSubmit} />;
}
```
**Purpose**: Legacy wrapper, could be removed.

#### CreateListingWizard.tsx (98 lines)
```typescript
// Core responsibilities:
├─ Form data state initialization with defaults
├─ Draft loading from database via loadDraft()
├─ Auto-save every 30 seconds via useAutoSaveDraft()
├─ Profile pre-population (subjects, rate, experience)
├─ Draft cleanup on submit
└─ Passes data to CreateListings step
```

**Key Code**:
```typescript
const formData = {
  title: listing?.title || '',
  description: listing?.description || '',
  subjects: listing?.subjects || profile?.role_details?.subjects || [],
  // ... 20+ fields
};

useAutoSaveDraft(user?.id, DRAFT_KEY, formData, (data) =>
  !!(data.title || data.description) // Only save if user started typing
);
```

**Issue**: Name implies multi-step wizard but it's single-step state management.

### 2.2 CreateListings.tsx - The Massive Form

**Stats**:
- 250+ lines
- 25+ input fields
- No progressive disclosure
- Single scrollable form

**Field Groups**:
```typescript
1. Basic Info (2 fields)
   - title (min 10 chars)
   - description (textarea, min 50 chars)

2. Teaching Details (5 fields)
   - subjects (multi-select, 8 options)
   - levels (multi-select, 7 options)
   - languages (multi-select, default: English)
   - duration_options (multi-select: 30/60/90/120 min)
   - teaching_methods (text input)

3. Pricing (2 fields)
   - hourly_rate (number, required)
   - currency (default: GBP)

4. Delivery Mode (1 field)
   - location_type (online/in-person/hybrid)

5. AI Tools (1 field)
   - ai_tools_used (multi-select: ChatGPT, Claude, etc.)

6. Trial Offer (2 fields)
   - free_trial (checkbox)
   - trial_duration_minutes (30/60 if checked)

7. Instant Booking (1 field)
   - instant_booking_enabled (checkbox)

8. Cancellation (1 field)
   - cancellation_policy (select: Flexible/Moderate/Strict)

9. Images (1 field)
   - images (ImageUpload component)

10. Tags (1 field)
    - tags (multi-select chips)
```

**Validation**:
```typescript
- title: min 10 characters ✓
- description: min 50 characters ✓
- subjects: min 1 required ✓
- hourly_rate: required ✓
- No validation on levels (should require at least 1)
- No validation on images (can publish without images)
```

**Critical UX Issues**:
1. Mobile scroll nightmare (need to scroll through 250+ lines)
2. No indication of which fields are required until submit
3. No inline validation feedback
4. Save button at very bottom - easy to miss on mobile
5. No progress indicator

**Recommendation**: Break into 3-4 steps:
- Step 1: Basic Info (title, description, subjects)
- Step 2: Teaching Details (levels, languages, duration, methods)
- Step 3: Pricing & Policies (rate, trial, cancellation)
- Step 4: Media & Finalize (images, review, publish)

### 2.3 ListingCard Component

**Two Versions**:

#### Version 1: `/my-listings/ListingCard.tsx`
```typescript
// For tutor's own listings
Features:
├─ Image with 56.25% aspect ratio (16:9)
├─ Badge: "Template" if is_template
├─ Status badge: Draft/Published/Paused
├─ Title, description (truncated)
├─ Meta: subjects, rate, location
├─ Stats: views, inquiries, bookings
└─ Actions:
    ├─ Templates: Duplicate button (red badge)
    └─ Regular: Edit, Publish/Unpublish, Delete
```

#### Version 2: `/marketplace/ListingCard.tsx`
```typescript
// For public marketplace
Features:
├─ Link to /marketplace/{id}
├─ Image with gradient overlay
├─ Subjects/levels as colored badges
├─ Free trial badge
├─ Location and price
├─ Stats: views, bookings
└─ No action buttons (view-only)
```

**Issue**: Duplicated code, inconsistent styling. Should extract shared base component.

### 2.4 ImageUpload Component

**Features**:
- Drag and drop
- Multiple image upload
- Preview grid
- Remove individual images
- Upload on drop (immediate)

**Technical Details**:
```typescript
interface ImageUploadHandle {
  getImages: () => string[];
  clearImages: () => void;
}

// Usage via ref
const imageUploadRef = useRef<ImageUploadHandle>(null);
const images = imageUploadRef.current?.getImages() || [];
```

**Issue**: Upload happens on drop but no visual feedback. User doesn't know if upload succeeded/failed.

---

## 3. Data Flow & State Management

### 3.1 CRUD Operation Flows

#### Create Flow
```
User clicks "Create Listing"
    ↓
Navigate to /my-listings/create
    ↓
CreateListingPage loads
    ├─ Check user authentication
    ├─ Load draft from localStorage/database
    ├─ Pre-fill from professional_details.tutor
    └─ Render CreateListingWizard
    ↓
User fills form (auto-saves every 30s)
    ↓
User clicks "Submit"
    ↓
handleSubmit(data)
    ├─ Get images from ImageUpload ref
    ├─ Call createListing(data) API
    │   ├─ Add profile_id = current user
    │   ├─ Set status = 'draft'
    │   ├─ INSERT into listings table
    │   └─ Return new listing
    ├─ Clear localStorage draft
    ├─ Show success toast
    └─ Redirect to /my-listings
```

#### Read/List Flow
```
User navigates to /my-listings
    ↓
MyListingsPage loads
    ├─ Check authentication
    ├─ Check role permissions ⚠️ Issue: includes 'seeker'
    └─ loadListings()
        ├─ Call getMyListings() API
        │   └─ SELECT * FROM listings WHERE profile_id = user.id
        ├─ Sort: templates first, then by created_at DESC
        └─ Render ListingCard grid
```

#### Update Flow
```
User clicks "Edit" on listing
    ↓
Navigate to /my-listings/[id]/edit
    ↓
EditListingPage loads
    ├─ Load listing by ID via getListing(id)
    ├─ Verify ownership (profile_id = user.id)
    ├─ Pre-fill CreateListingWizard with listing data
    └─ Render form
    ↓
User edits (auto-saves draft every 30s)
    ↓
User clicks "Submit"
    ↓
handleSubmit(data)
    ├─ Call updateListing({ id, ...data }) API
    │   ├─ UPDATE listings WHERE id = {id} AND profile_id = user.id
    │   └─ Return updated listing
    ├─ Clear draft
    ├─ Show success toast
    └─ Redirect to /my-listings
```

#### Delete Flow
```
User clicks "Delete" on listing
    ↓
Confirm dialog: "Are you sure?"
    ↓
If confirmed:
    ├─ Call deleteListing(id) API
    │   └─ DELETE FROM listings WHERE id = {id} AND profile_id = user.id
    ├─ Remove from local state (optimistic update)
    └─ Show success toast
```

#### Publish/Unpublish Flow
```
User clicks "Publish" or "Unpublish"
    ↓
handleToggleStatus(listing)
    ├─ If status === 'published':
    │   └─ Call unpublishListing(id, 'paused')
    │       └─ UPDATE status = 'paused'
    └─ Else:
        └─ Call publishListing(id)
            └─ UPDATE status = 'published', published_at = NOW()
    ↓
Reload listings (full refetch - not optimistic)
    └─ Show success toast
```

**Issue**: Publish/unpublish does full refetch instead of optimistic update. Causes flicker.

### 3.2 Template System

#### Template Generation Flow

```
Tutor completes onboarding
    ↓
TutorOnboardingWizard.handleAvailabilitySubmit()
    ├─ updateOnboardingProgress()
    ├─ Add 'provider' role
    └─ generateListingTemplates(userId, tutorName)
        ├─ Check hasExistingTemplates(userId)
        │   └─ SELECT COUNT(*) FROM listings WHERE profile_id = userId AND is_template = true
        ├─ If templates exist: Skip (prevent duplicates)
        └─ Else: For each template in listingTemplates.json (4 templates):
            ├─ Load template definition
            ├─ Personalize description
            │   └─ Replace "Dr. Emily Chen" with {tutorName}
            ├─ Map to Listing schema:
            │   ├─ is_template: true
            │   ├─ is_deletable: false
            │   ├─ template_id: unique identifier
            │   ├─ status: 'draft'
            │   └─ All other fields from template
            └─ INSERT into listings table
```

**Templates Included** (from `listingTemplates.json`):

1. **mathematics-gcse-group**
   - £20/hr, group session, online
   - Subjects: GCSE Mathematics
   - Tags: GCSE, Mathematics, Group Learning

2. **english-gcse-onetoone**
   - £35/hr, 1-on-1, hybrid (online/in-person)
   - Subjects: GCSE English
   - Tags: GCSE, English, One-on-One

3. **ai-tutor-study-support**
   - £10/hr, on-demand, online
   - AI-assisted tutoring supervised by tutor
   - Tags: AI Tutor, Study Support, Flexible

4. **science-tutor-referral**
   - £40/hr, referral program, hybrid
   - Subjects: GCSE Science (Physics, Chemistry, Biology)
   - Tags: GCSE, Science, Referral

**Template Benefits**:
- Quick start for new tutors
- Pre-written descriptions (SEO optimized)
- Common price points
- Variety of service types

**Template Limitations**:
- Only 4 templates (limited variety)
- Generic descriptions (low personalization)
- No A-Level or University templates
- Fixed pricing (may not match tutor's rates)

#### Duplicate Template Flow

```
User clicks "Duplicate" on template card
    ↓
handleDuplicate(templateId)
    ├─ Import duplicateTemplate() dynamically
    └─ duplicateTemplate(templateId, userId)
        ├─ Fetch template by id WHERE is_template = true
        ├─ Create copy:
        │   ├─ New ID: undefined (auto-generate)
        │   ├─ Title: "{original} (Copy)"
        │   ├─ is_template: false → User can edit
        │   ├─ is_deletable: true → User can delete
        │   ├─ template_id: null → No longer linked
        │   ├─ slug: null → Force new slug generation
        │   └─ All other fields copied
        └─ INSERT as new listing (status: 'draft')
    ↓
Reload listings
    └─ Show success toast
```

**Design Decision**: Templates are immutable. Users duplicate them to create editable copies.

### 3.3 Draft Auto-Save System

**Architecture**: Hybrid approach (localStorage + database)

#### Components

1. **draftSync.ts** - Core sync logic
2. **useAutoSaveDraft** - React hook
3. **localStorage** - Immediate, offline-first
4. **profiles.preferences.wizard_drafts** - Database backup

#### Save Flow

```typescript
useAutoSaveDraft(userId, draftKey, formData, shouldSave)
    ├─ Runs every 30 seconds
    ├─ If shouldSave(formData) === false: Skip
    └─ saveDraft(userId, draftKey, formData)
        ├─ 1. Save to localStorage immediately
        │   └─ Key: `wizard_draft_${userId}_${draftKey}`
        │   └─ Value: { data: formData, timestamp: ISO }
        ├─ 2. Fire-and-forget async save to database:
        │   ├─ Fetch profiles.preferences
        │   ├─ Merge into preferences.wizard_drafts[draftKey]
        │   ├─ UPDATE profiles SET preferences = ...
        │   └─ With retry logic (3 attempts, exponential backoff)
        └─ User never waits for database
```

**Key Insight**: Prioritizes responsiveness over consistency. User always sees instant save to localStorage.

#### Load Flow

```typescript
loadDraft(userId, draftKey)
    ├─ Load from localStorage (instant)
    │   └─ Parse JSON, return data
    ├─ Load from database (async)
    │   └─ Fetch profiles.preferences.wizard_drafts[draftKey]
    └─ Reconcile:
        ├─ Compare timestamps
        ├─ Use whichever is newer
        └─ Return merged data
```

**Conflict Resolution**:
- localStorage has priority (offline-first)
- Database acts as backup across devices
- Newer timestamp wins

#### Clear Flow

```typescript
clearDraft(userId, draftKey)
    ├─ Remove from localStorage
    └─ Remove from database:
        └─ UPDATE profiles SET preferences.wizard_drafts[draftKey] = null
```

**When Cleared**:
- On successful form submission
- On explicit "Discard Draft" button (if implemented)

**Limitations**:
1. ❌ No conflict UI if timestamps differ significantly
2. ❌ No draft history/versioning
3. ❌ No visual "Saved" indicator for user
4. ❌ Silent failures on poor network

---

## 4. Database Schema

### 4.1 Listings Table

**Source**: `packages/shared-types/src/listing.ts`

```sql
CREATE TABLE listings (
  -- Primary
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic Info
  full_name TEXT,
  listing_type TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status listing_status NOT NULL DEFAULT 'draft',  -- ENUM

  -- Teaching Details
  subjects TEXT[] NOT NULL DEFAULT '{}',
  levels TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT ARRAY['English'],
  specializations TEXT[],
  teaching_methods TEXT[],
  qualifications TEXT[],
  teaching_experience TEXT,  -- Also stores learning outcomes (mixed use)

  -- Pricing
  hourly_rate NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'GBP',
  pricing_packages JSONB,  -- Array of { sessions, price, discount, name }
  free_trial BOOLEAN DEFAULT false,
  trial_duration_minutes INTEGER,

  -- MVP Fields
  instant_booking_enabled BOOLEAN DEFAULT false,
  ai_tools_used TEXT[],
  cancellation_policy TEXT,
  duration_options INTEGER[],  -- e.g., [30, 60, 90, 120]

  -- Location & Availability
  location_type location_type NOT NULL,  -- ENUM: online, in_person, hybrid
  location_address TEXT,
  location_city TEXT,
  location_postcode TEXT,
  location_country TEXT NOT NULL DEFAULT 'United Kingdom',
  location_details TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  availability JSONB,  -- { monday: [{ start: '09:00', end: '12:00' }], ... }

  -- Media
  images TEXT[] NOT NULL DEFAULT '{}',
  video_url TEXT,

  -- SEO & Discovery
  slug TEXT UNIQUE,  -- Auto-generated from title
  tags TEXT[] NOT NULL DEFAULT '{}',

  -- Metrics
  view_count INTEGER NOT NULL DEFAULT 0,
  inquiry_count INTEGER NOT NULL DEFAULT 0,
  booking_count INTEGER NOT NULL DEFAULT 0,
  response_time TEXT,

  -- Template Fields
  is_template BOOLEAN DEFAULT false,
  is_deletable BOOLEAN DEFAULT true,
  template_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- Indexes
  CREATE INDEX idx_listings_profile_id ON listings(profile_id);
  CREATE INDEX idx_listings_status ON listings(status);
  CREATE INDEX idx_listings_slug ON listings(slug);
  CREATE INDEX idx_listings_subjects ON listings USING GIN(subjects);
  CREATE INDEX idx_listings_levels ON listings USING GIN(levels);
  CREATE INDEX idx_listings_tags ON listings USING GIN(tags);
);

-- ENUM types
CREATE TYPE listing_status AS ENUM ('draft', 'published', 'paused', 'archived');
CREATE TYPE location_type AS ENUM ('online', 'in_person', 'hybrid');
```

### 4.2 Field Details

#### Status States
```typescript
'draft'      // User-created, not visible in marketplace
'published'  // Visible in marketplace, searchable
'paused'     // Previously published, temporarily hidden
'archived'   // Soft-deleted, hidden but not removed
```

**State Transitions**:
```
draft → published → paused → published
draft → published → archived (one-way)
draft → archived (one-way)
```

#### Template Fields

```typescript
is_template: boolean
// true: System-generated template, immutable
// false: User-created or duplicated, editable

is_deletable: boolean
// true: User can delete
// false: System template, protected

template_id: string | null
// Unique identifier for template (e.g., "mathematics-gcse-group")
// null for non-templates
```

**Constraint**: If `is_template = true`, then `is_deletable = false` (enforced in application, not database).

#### Availability Field

```typescript
// JSONB structure
{
  "monday": [
    { "start": "09:00", "end": "12:00" },
    { "start": "14:00", "end": "17:00" }
  ],
  "tuesday": [],
  "wednesday": [
    { "start": "10:00", "end": "16:00" }
  ],
  // ... other days
}
```

**Issue**: No validation on JSONB structure. Malformed data could be inserted.

#### Pricing Packages

```typescript
// JSONB array
[
  {
    "sessions": 5,
    "price": 150.00,
    "discount": 10,  // 10% off
    "name": "Starter Pack"
  },
  {
    "sessions": 10,
    "price": 280.00,
    "discount": 15,
    "name": "Monthly Bundle"
  }
]
```

**Not Used**: Field exists but UI doesn't support creating packages yet.

### 4.3 Row-Level Security (RLS)

**Supabase Policies**:

```sql
-- Read own listings
CREATE POLICY "Users can view own listings"
  ON listings FOR SELECT
  USING (auth.uid() = profile_id);

-- Read published listings (marketplace)
CREATE POLICY "Anyone can view published listings"
  ON listings FOR SELECT
  USING (status = 'published');

-- Create own listings
CREATE POLICY "Users can create own listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Update own listings
CREATE POLICY "Users can update own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = profile_id);

-- Delete own listings (if deletable)
CREATE POLICY "Users can delete own deletable listings"
  ON listings FOR DELETE
  USING (auth.uid() = profile_id AND is_deletable = true);
```

**Security**: Properly scoped. Even if UI allows wrong users, database blocks them.

---

## 5. Pages & Routes

### 5.1 Route Map

```
/my-listings
├─ GET: List all user's listings
├─ Role Guard: ['provider', 'agent', 'seeker'] ⚠️ ISSUE
└─ Features:
    ├─ Grid display (ListingCard components)
    ├─ Sort: templates first, then by created_at
    ├─ Empty state with CTA
    └─ Actions per card:
        ├─ Edit → /my-listings/[id]/edit
        ├─ Delete (with confirmation)
        ├─ Publish/Unpublish toggle
        └─ Duplicate (templates only)

/my-listings/create
├─ GET: Create new listing form
├─ Role Guard: ['provider', 'agent', 'seeker'] ⚠️ ISSUE
├─ Pre-fill from professional_details.tutor
└─ POST: Submit → Redirect to /my-listings

/my-listings/[id]/edit
├─ GET: Edit existing listing form
├─ Role Guard: ['provider', 'agent', 'seeker'] ⚠️ ISSUE
├─ Load listing with ownership check
└─ PATCH: Submit → Redirect to /my-listings

/marketplace
├─ GET: Public listing search
├─ No auth required
├─ Filter by subjects, levels, price, location
└─ View listing details: /marketplace/[id]

/marketplace/[id]
├─ GET: Public listing detail page
├─ No auth required
├─ Increment view_count
└─ Show contact/inquiry form
```

### 5.2 Missing Routes

```
❌ /my-listings/[id]
   - Detail view for own listing (preview before publish)
   - Currently: Can only edit or see in marketplace after publish

❌ /my-listings/analytics
   - Dashboard showing view trends, inquiry conversion
   - Metrics per listing

❌ /my-listings/templates
   - Dedicated template gallery/management
   - Currently: Mixed with regular listings

❌ /my-listings/bulk-actions
   - Publish/unpublish multiple
   - Bulk delete
   - Reorder

❌ /api/listings/[id]/duplicate
   - Explicit duplicate endpoint
   - Currently: Client-side function
```

### 5.3 Role Guard Analysis

**Current Implementation**:
```typescript
// In all listing pages
const { isAllowed } = useRoleGuard(['provider', 'agent', 'seeker']);
```

**Problem**: `seeker` (student/client) should NOT have access to listings!

**Correct Permissions**:
```typescript
// Should be:
useRoleGuard(['provider', 'agent'])

Roles:
- provider (tutor): ✅ Create/manage their own services
- agent: ✅ Maybe, if managing tutors' listings
- seeker (student): ❌ NO - they browse marketplace, not create listings
```

**Impact**:
- Students see "My Listings" in navigation
- Students can access /my-listings/create
- Empty state since students have no listings
- Confusing UX

**Fix Required**: Update role guards in 3 files:
1. `/my-listings/page.tsx` line 18
2. `/my-listings/create/page.tsx` line ~18
3. `/my-listings/[id]/edit/page.tsx` line ~18

---

## 6. Integration Points

### 6.1 Tutor Onboarding Integration

**Trigger**: Completion of tutor onboarding wizard

**Code Location**: `TutorOnboardingWizard.tsx` line 251

```typescript
const handleAvailabilitySubmit = async (data: AvailabilityData) => {
  // 1. Force navigation to CompletionStep (2-second success message)
  onComplete();

  // 2. While success message showing, save to database
  await updateOnboardingProgress({
    current_step: 'completion',
    provider: { subjects, qualifications, availability: data },
    onboarding_completed: true,
    completed_at: new Date().toISOString()
  });

  // 3. Add provider role
  if (!currentRoles.includes('provider')) {
    await supabase.from('profiles').update({
      roles: [...currentRoles, 'provider']
    });
  }

  // 4. Generate listing templates (CRITICAL)
  const hasTemplates = await hasExistingTemplates(user!.id);
  if (!hasTemplates) {
    const tutorName = personalInfo.firstName && personalInfo.lastName
      ? `${personalInfo.firstName} ${personalInfo.lastName}`
      : profile?.full_name || 'Tutor';

    await generateListingTemplates(user!.id, tutorName);
  }

  // 5. Clear onboarding draft
  await clearDraft(user?.id, DRAFT_KEY);
};
```

**Data Flow**:
```
Tutor Onboarding Data → Listing Templates
├─ personalInfo.firstName + lastName → Template descriptions personalization
├─ subjects → Not used in templates (templates have fixed subjects)
├─ qualifications → Not used in templates
├─ availability → Not used in templates (templates have fixed availability)
└─ hourlyRate → Not used in templates (templates have fixed rates)
```

**Gap**: Onboarding data not used to personalize templates beyond name. Templates are generic.

### 6.2 Profile Data Integration

**Pre-fill on Create**: `CreateListingPage` attempts to pre-fill from `professional_details.tutor`

```typescript
const tutorDetails = profile?.professional_details?.tutor;

const initialData = {
  subjects: tutorDetails?.subjects || [],
  hourly_rate: tutorDetails?.hourly_rate
    ? Math.min(tutorDetails.hourly_rate)
    : undefined,
  // ... other mappings
};
```

**Issues**:
1. Field name mismatches:
   - `tutorDetails.certifications` → `listing.academic_qualifications` (wrong)
   - `tutorDetails.experience` → `listing.years_of_experience` (type mismatch)
2. No sync on profile update - edit profile doesn't update existing listings
3. Creates data duplication - same info in two places

**Recommendation**: Use profile as source of truth. Listings should reference profile data, not duplicate.

### 6.3 Marketplace Search Integration

**Search API**: `searchListings()` in `listings.ts`

**Filters Supported**:
```typescript
interface ListingSearchParams {
  filters?: {
    subjects?: string[];           // Overlaps operator
    levels?: string[];             // Overlaps operator
    location_type?: LocationType;  // Exact match
    location_city?: string;        // ILIKE (case-insensitive)
    min_price?: number;            // >=
    max_price?: number;            // <=
    free_trial_only?: boolean;     // Exact match
    languages?: string[];          // Overlaps
    tags?: string[];               // Overlaps
    search?: string;               // Full-text search on title
  };
  sort?: {
    field: string;                 // created_at, hourly_rate, view_count, booking_count
    order: 'asc' | 'desc';
  };
  limit?: number;                  // Default: 20
  offset?: number;                 // Default: 0
}
```

**Always Applied**:
```typescript
.eq('status', 'published')  // Only published listings
```

**Usage**:
```typescript
// Marketplace page
const result = await searchListings({
  filters: {
    subjects: ['Mathematics'],
    levels: ['GCSE'],
    min_price: 20,
    max_price: 40,
  },
  sort: { field: 'hourly_rate', order: 'asc' },
  limit: 20,
  offset: 0,
});

// Result
{
  listings: Listing[],
  total: 127,
  limit: 20,
  offset: 0
}
```

**Missing**:
- ❌ No relevance scoring
- ❌ No fuzzy matching
- ❌ No location radius search (e.g., "within 10 miles")
- ❌ No tutor rating filter
- ❌ No availability filter (e.g., "available weekends")

---

## 7. Critical Issues

### 7.1 Role Guard Too Permissive ⚠️ **HIGH PRIORITY**

**Issue**: Students (`seeker` role) can access listing management pages.

**Evidence**:
```typescript
// All three pages have:
useRoleGuard(['provider', 'agent', 'seeker'])
```

**Impact**:
- Confusing UX for students
- "My Listings" appears in navigation for students
- Students see empty state instead of being blocked
- Security not compromised (RLS blocks database access)

**Fix**:
```typescript
// Update to:
useRoleGuard(['provider', 'agent'])
```

**Files to Change**:
1. `apps/web/src/app/my-listings/page.tsx` line 18
2. `apps/web/src/app/my-listings/create/page.tsx` line ~18
3. `apps/web/src/app/my-listings/[id]/edit/page.tsx` line ~18

**Estimated Effort**: 5 minutes

---

### 7.2 Single Massive Form - Poor Mobile UX ⚠️ **HIGH PRIORITY**

**Issue**: 250+ line form with 25+ fields on one page.

**Problems**:
1. Endless scrolling on mobile
2. No sense of progress
3. Easy to miss required fields
4. Save button far below fold
5. No validation feedback until submit

**Evidence**: `CreateListings.tsx` is 250+ lines with no step segmentation.

**Impact**:
- High bounce rate on mobile
- Frustrated users
- Incomplete listings

**Solution**: Convert to multi-step wizard

```typescript
Step 1: Basic Info (30% progress)
├─ title
├─ description
└─ subjects (min 1)

Step 2: Teaching Details (60% progress)
├─ levels (min 1)
├─ languages
├─ duration_options
└─ teaching_methods

Step 3: Pricing & Policies (80% progress)
├─ hourly_rate
├─ currency
├─ free_trial + trial_duration
├─ instant_booking
└─ cancellation_policy

Step 4: Media & Finalize (100% progress)
├─ location_type
├─ ai_tools_used
├─ images
├─ tags
└─ Review + Publish
```

**Benefits**:
- Clear progress indicator
- Mobile-friendly (one screen per step)
- Focused attention on fewer fields
- Natural validation points
- "Save & Continue" vs "Publish" distinction

**Estimated Effort**: 8-12 hours (refactor form, add step navigation, update validation)

---

### 7.3 No Draft Save Status Indicator ⚠️ **MEDIUM PRIORITY**

**Issue**: Users don't know if draft was saved successfully.

**Current Behavior**:
- Auto-saves every 30 seconds
- Silent success
- Silent failure (poor network)
- No "Saved" or "Saving..." text

**Impact**:
- User anxiety ("Did my work save?")
- Lost data on poor network
- No trust in auto-save

**Solution**: Add visual feedback

```typescript
// State
const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

// In useAutoSaveDraft
const { saveDraft } = useAutoSaveDraft(/* ... */, {
  onSave: () => setDraftStatus('saving'),
  onSuccess: () => {
    setDraftStatus('saved');
    setTimeout(() => setDraftStatus('idle'), 2000);
  },
  onError: () => setDraftStatus('error'),
});

// UI
{draftStatus === 'saving' && <span>Saving draft...</span>}
{draftStatus === 'saved' && <span>✓ Draft saved</span>}
{draftStatus === 'error' && <span>⚠ Failed to save (offline?)</span>}
```

**Estimated Effort**: 2-3 hours

---

### 7.4 No Listing Preview Before Publish ⚠️ **MEDIUM PRIORITY**

**Issue**: Users can't see how listing looks before publishing.

**Current Flow**:
```
Create listing → Save as draft → Go to marketplace → Search for it → View
```

**Problem**:
- Must publish to see public view
- Can't iterate on appearance
- Risk of publishing incomplete/ugly listing

**Solution**: Add preview route

```typescript
// Route
/my-listings/[id]/preview

// Component
<ListingPreview listing={listing} mode="owner" />
├─ Shows public marketplace view
├─ But with "Edit" button
└─ Warning: "This is how it will look in search"
```

**Estimated Effort**: 4-6 hours

---

## 8. Missing Features

### 8.1 No Bulk Operations

**Missing**:
- Publish multiple listings at once
- Unpublish multiple
- Delete multiple
- Bulk edit (change price across all listings)
- Reorder (drag-to-rearrange)

**Use Case**: Tutor with 10 listings wants to temporarily pause all for vacation.

**Solution**:
```typescript
// Add checkbox selection
const [selectedIds, setSelectedIds] = useState<string[]>([]);

// Bulk action buttons
<Button onClick={() => bulkPublish(selectedIds)}>Publish Selected</Button>
<Button onClick={() => bulkUnpublish(selectedIds)}>Unpublish Selected</Button>
<Button onClick={() => bulkDelete(selectedIds)}>Delete Selected</Button>
```

**Estimated Effort**: 6-8 hours

---

### 8.2 No Analytics Dashboard

**Missing**:
- View trends over time (line chart)
- Inquiry conversion rate (inquiries / views)
- Booking conversion rate (bookings / inquiries)
- Best performing listings
- Traffic sources

**Use Case**: Tutor wants to know which listing gets most inquiries.

**Solution**: Create `/my-listings/analytics` page with charts.

**Estimated Effort**: 12-16 hours

---

### 8.3 No Listing Cloning

**Missing**: Can only duplicate templates, not regular listings.

**Use Case**: Tutor has successful "GCSE Maths Online" listing, wants to create similar "A-Level Maths Online".

**Current Workaround**: Manually re-enter all fields.

**Solution**:
```typescript
// Add "Clone" action to ListingCard
<Button onClick={() => cloneListing(listing.id)}>Clone</Button>

// Function
async function cloneListing(listingId: string) {
  const original = await getListing(listingId);
  const copy = {
    ...original,
    id: undefined, // Generate new
    title: `${original.title} (Copy)`,
    status: 'draft',
    slug: null,
  };
  await createListing(copy);
}
```

**Estimated Effort**: 2-3 hours

---

### 8.4 No SEO Slug Management

**Missing**: Slug field never exposed in UI.

**Current Behavior**:
- Slug auto-generated from title on INSERT
- Immutable after creation
- No customization

**Use Case**: Tutor wants SEO-friendly URL like `/marketplace/gcse-maths-expert-london` instead of `/marketplace/gcse-maths-tutoring-23894`.

**Solution**:
```typescript
// Add to form
<Input
  label="URL Slug (optional)"
  name="slug"
  placeholder="gcse-maths-expert-london"
  help="Customize your listing's URL for SEO"
/>

// Validation
- Must be unique
- Allow letters, numbers, hyphens only
- Show preview: "tutorwise.com/marketplace/{slug}"
```

**Estimated Effort**: 3-4 hours

---

### 8.5 No Scheduling Integration

**Missing**: Availability field stored but never used for actual booking.

**Current Behavior**:
- User enters availability slots
- Stored in database
- Never connected to booking system

**Use Case**: Student wants to book session during tutor's available time.

**Solution**: Integrate with booking flow

```typescript
// On listing detail page
<AvailabilityCalendar
  tutorAvailability={listing.availability}
  onSelectSlot={handleBooking}
/>
```

**Estimated Effort**: 40-60 hours (requires booking system)

---

## 9. Code Quality Issues

### 9.1 Inconsistent Error Handling

**Problem**: Some functions throw, others return null.

**Examples**:
```typescript
// Throws error
export async function createListing(input): Promise<Listing> {
  if (error) throw error;  // Caller must try/catch
  return data;
}

// Returns null
export async function getListing(id): Promise<Listing | null> {
  if (error && error.code !== 'PGRST116') throw error;
  if (!data) return null;  // Caller must check null
}
```

**Impact**:
- Inconsistent error handling in components
- Some errors caught, others crash app
- Difficult to debug

**Solution**: Standardize on Result type

```typescript
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createListing(input): Promise<Result<Listing>> {
  try {
    // ...
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**Estimated Effort**: 6-8 hours (refactor all API functions)

---

### 9.2 Magic Strings Everywhere

**Problem**: Hardcoded strings instead of constants.

**Examples**:
```typescript
// Delivery modes
const deliveryModes = [
  { value: 'online', label: 'Online' },
  { value: 'in_person', label: 'In Person' },
  { value: 'hybrid', label: 'Hybrid' },
];

// AI tools
const aiTools = [
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
];
```

**Problem**: Repeated across multiple components.

**Solution**: Extract to constants file

```typescript
// lib/constants/listings.ts
export const LOCATION_TYPES = {
  ONLINE: 'online',
  IN_PERSON: 'in_person',
  HYBRID: 'hybrid',
} as const;

export const LOCATION_TYPE_OPTIONS = [
  { value: LOCATION_TYPES.ONLINE, label: 'Online' },
  { value: LOCATION_TYPES.IN_PERSON, label: 'In Person' },
  { value: LOCATION_TYPES.HYBRID, label: 'Hybrid' },
];
```

**Estimated Effort**: 2-3 hours

---

### 9.3 Missing JSDoc Comments

**Problem**: Complex functions lack documentation.

**Examples**:
```typescript
// No explanation of what this does
export async function duplicateTemplate(templateId: string, userId: string) {
  // 50 lines of code...
}

// No explanation of reconciliation logic
async function loadDraft(userId, key) {
  // Complex merging...
}
```

**Solution**: Add JSDoc

```typescript
/**
 * Duplicates a listing template as an editable user listing
 *
 * @param templateId - UUID of template listing (must have is_template = true)
 * @param userId - UUID of user who will own the copy
 * @returns UUID of newly created listing, or null if failed
 *
 * @example
 * const newId = await duplicateTemplate('abc-123', user.id);
 */
export async function duplicateTemplate(templateId: string, userId: string): Promise<string | null>
```

**Estimated Effort**: 4-6 hours

---

### 9.4 Component Duplication

**Problem**: Two `ListingCard` components with 70% overlap.

**Files**:
1. `/my-listings/ListingCard.tsx` - Owner view (edit/delete actions)
2. `/marketplace/ListingCard.tsx` - Public view (view-only)

**Overlap**:
- Image rendering
- Title/description display
- Meta info (subjects, rate, location)
- Stats (views, bookings)

**Difference**:
- Actions (edit/delete vs view)
- Link destination (/my-listings/[id]/edit vs /marketplace/[id])

**Solution**: Extract base component

```typescript
// BaseListingCard.tsx
export default function BaseListingCard({
  listing,
  actions,
  linkHref
}) {
  return (
    <div className={styles.card}>
      <Link href={linkHref}>
        {/* Shared image, title, meta, stats */}
      </Link>
      <div className={styles.actions}>{actions}</div>
    </div>
  );
}

// MyListings version
<BaseListingCard
  listing={listing}
  linkHref={`/my-listings/${listing.id}/edit`}
  actions={<EditDeleteButtons />}
/>

// Marketplace version
<BaseListingCard
  listing={listing}
  linkHref={`/marketplace/${listing.id}`}
  actions={null}
/>
```

**Estimated Effort**: 3-4 hours

---

### 9.5 Validation Gaps

**Problem**: Form validation doesn't match database constraints.

**Examples**:
1. Form requires `title >= 10 chars`, database has no constraint → Could save invalid via API
2. Form requires `subjects.length >= 1`, database allows empty → Could save invalid
3. Form requires `description >= 50 chars`, database has no constraint → Could save invalid

**Solution**: Add database constraints

```sql
ALTER TABLE listings
  ADD CONSTRAINT title_length CHECK (char_length(title) >= 10),
  ADD CONSTRAINT description_length CHECK (char_length(description) >= 50),
  ADD CONSTRAINT subjects_not_empty CHECK (array_length(subjects, 1) >= 1);
```

**Estimated Effort**: 2-3 hours (migration + testing)

---

## 10. Recommendations

### 10.1 Immediate Fixes (This Sprint)

**Priority 1 - Critical**:
1. ✅ **Fix role guards** - Remove 'seeker' from listing pages (5 min)
2. ✅ **Add draft save indicator** - Show "Saving..." / "Saved" toast (2-3 hours)
3. ✅ **Add listing preview route** - `/my-listings/[id]/preview` (4-6 hours)

**Estimated Total**: 1 day

---

### 10.2 Short-Term Improvements (Next Sprint)

**Priority 2 - Important**:
4. ✅ **Refactor to multi-step wizard** - Break 250-line form into 4 steps (8-12 hours)
5. ✅ **Add bulk operations** - Select multiple, publish/delete (6-8 hours)
6. ✅ **Extract constants** - Stop hardcoding strings (2-3 hours)
7. ✅ **Add JSDoc comments** - Document complex functions (4-6 hours)

**Estimated Total**: 3-4 days

---

### 10.3 Medium-Term Enhancements (Month 2)

**Priority 3 - Nice-to-Have**:
8. ✅ **Analytics dashboard** - View trends, conversion metrics (12-16 hours)
9. ✅ **Listing cloning** - Duplicate any listing (2-3 hours)
10. ✅ **SEO slug management** - Customizable URLs (3-4 hours)
11. ✅ **Extract base ListingCard** - DRY refactor (3-4 hours)
12. ✅ **Add database validation** - Match form constraints (2-3 hours)

**Estimated Total**: 1 week

---

### 10.4 Long-Term Vision (Quarter 2)

**Priority 4 - Strategic**:
13. ✅ **Scheduling integration** - Connect availability to booking system (40-60 hours)
14. ✅ **A/B testing** - Create listing variants, track performance (30-40 hours)
15. ✅ **Advanced search** - Fuzzy matching, relevance scoring (20-30 hours)
16. ✅ **Image optimization** - Resize, thumbnails, lazy loading (12-16 hours)
17. ✅ **Pagination** - Virtual scroll for 100+ listings (8-12 hours)

**Estimated Total**: 1 month

---

### 10.5 Architecture Improvements

**Consider These Patterns**:

1. **Extract Shared Components**
   ```
   components/
   ├── listings/
   │   ├── BaseListingCard.tsx      # Shared
   │   ├── OwnerListingCard.tsx     # Wraps Base
   │   └── PublicListingCard.tsx    # Wraps Base
   ```

2. **Use Constants File**
   ```typescript
   lib/constants/
   ├── listings.ts                  # Location types, AI tools, etc.
   ├── validation.ts                # Min/max lengths
   └── routes.ts                    # Path constants
   ```

3. **Standardize API Responses**
   ```typescript
   type ApiResponse<T> =
     | { success: true; data: T }
     | { success: false; error: { message: string; code: string } };
   ```

4. **Add Feature Flags**
   ```typescript
   const FEATURES = {
     bulkOperations: false,        // Not ready yet
     analytics: false,             // Coming soon
     listingCloning: true,         // Ready
   };
   ```

---

## Appendix A: File Inventory

### Core Files (17 files)

```
apps/web/src/
├── app/
│   ├── my-listings/
│   │   ├── page.tsx                          # 165 lines - List view
│   │   ├── page.module.css                   # Styles
│   │   ├── ListingCard.tsx                   # 78 lines - Card component
│   │   ├── ListingCard.module.css            # Styles
│   │   ├── create/
│   │   │   └── page.tsx                      # 95 lines - Create page
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx                  # 102 lines - Edit page
│   ├── marketplace/
│   │   ├── page.tsx                          # Marketplace search
│   │   └── ListingCard.tsx                   # Public card (different)
│   └── components/
│       └── listings/
│           ├── CreateListingWizard.tsx       # 98 lines - State management
│           ├── CreateListingForm.tsx         # 28 lines - Thin wrapper
│           ├── ImageUpload.tsx               # 153 lines - Image upload
│           └── wizard-steps/
│               ├── CreateListings.tsx        # 250+ lines - Main form
│               ├── CustomCalendar.tsx        # Calendar picker
│               ├── CustomTimePicker.tsx      # Time picker
│               └── CustomDateInput.tsx       # Date input
├── lib/
│   ├── api/
│   │   └── listings.ts                       # 377 lines - CRUD API
│   ├── utils/
│   │   ├── templateGenerator.ts              # Template generation
│   │   └── draftSync.ts                      # Draft auto-save
│   └── data/
│       └── listingTemplates.json             # 4 templates
└── hooks/
    └── useRoleGuard.ts                       # Permission checking
```

**Total Lines of Code**: ~1,500 lines (excluding CSS)

---

## Appendix B: Quick Reference

### API Functions

```typescript
// listings.ts exports
getMyListings()                              → Promise<Listing[]>
getListing(id)                               → Promise<Listing | null>
getListingBySlug(slug)                       → Promise<Listing | null>
createListing(input)                         → Promise<Listing>
updateListing(input)                         → Promise<Listing>
deleteListing(id)                            → Promise<void>
publishListing(id)                           → Promise<Listing>
unpublishListing(id, status?)                → Promise<Listing>
searchListings(params)                       → Promise<ListingSearchResult>
incrementListingViews(id)                    → Promise<void>
incrementListingInquiries(id)                → Promise<void>
```

### Draft Functions

```typescript
// draftSync.ts exports
saveDraft(userId, key, data)                 → Promise<void>
loadDraft(userId, key)                       → Promise<T | null>
clearDraft(userId, key)                      → Promise<void>
```

### Template Functions

```typescript
// templateGenerator.ts exports
generateListingTemplates(userId, name)       → Promise<string[]>
hasExistingTemplates(userId)                 → Promise<boolean>
duplicateTemplate(templateId, userId)        → Promise<string | null>
```

---

## Conclusion

The service listing feature is **functionally complete** with all CRUD operations, sophisticated template system, and comprehensive search functionality. However, critical UX and permission issues must be addressed before production:

**Must Fix**:
1. Role guard too permissive (students accessing listings)
2. Single massive form (poor mobile experience)
3. No draft save feedback (user anxiety)

**Should Add**:
4. Listing preview before publish
5. Multi-step wizard
6. Bulk operations
7. Analytics dashboard

**Total Estimated Effort for Critical Fixes**: 1-2 days

**Overall Grade**: B+ (Functional but needs polish)

---

**Audit Completed**: 2025-10-27
