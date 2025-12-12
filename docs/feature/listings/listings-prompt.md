# Listings Feature - AI Prompt

**Version**: v5.8 (Snapshot Mechanism)
**Date**: 2025-12-12
**Purpose**: Guide AI assistants when working on the listings feature

---

## Feature Overview

The listings feature is Tutorwise's core marketplace infrastructure, enabling tutors to create, publish, and manage service offerings. It implements a sophisticated **snapshot mechanism** (v5.8) that preserves listing data in bookings, ensuring historical accuracy even if listings are modified or deleted.

**Key Responsibilities**:
- Listing creation, publishing, and management
- Snapshot mechanism (6 fields copied to bookings)
- Commission delegation to partner stores
- Full-text search with GIN indexes
- Multi-service support (one-to-one, group, workshops)
- SEO-friendly URL slugs
- Saved listings functionality

---

## System Context

### Core Architecture

The listings system is built on these principles:

1. **Snapshot Mechanism**: Bookings preserve listing context (service name, subjects, hourly rate) even if listing deleted
2. **Lifecycle States**: draft → published → unpublished → archived
3. **Discovery Engine**: Full-text search + array filtering (subjects, levels)
4. **SEO Optimization**: Auto-generated slugs (`/listings/{id}/{slug}`)
5. **Commission Delegation**: Tutors delegate referral commission to partner stores
6. **Metrics Tracking**: View count, inquiry count, booking count

### Database Tables

**Primary**:
- `listings` - Main marketplace table (tutor service offerings)

**Related**:
- `profiles` - Listing ownership (profile_id)
- `bookings` - Snapshot destination (listing context preserved)
- `saved_listings` - Client favorites
- `reviews` - Rating aggregation

**Key Fields**:
```sql
listings {
  id UUID,
  profile_id UUID,                  -- Tutor who owns listing
  title VARCHAR(200),
  description TEXT,
  status TEXT,                       -- 'draft', 'published', 'unpublished', 'archived'
  subjects TEXT[],                   -- GIN indexed
  levels TEXT[],                     -- GIN indexed
  hourly_rate DECIMAL(10,2),
  location_type TEXT,                -- 'online', 'in_person', 'hybrid'
  delegate_commission_to_profile_id UUID,  -- v4.3 - Store delegation
  slug VARCHAR(255) UNIQUE,          -- Auto-generated
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
}
```

---

## Integration Points

### Critical Dependencies

1. **Bookings** (CRITICAL - Snapshot Destination):
   - When booking created, 6 listing fields copied to bookings table
   - Snapshot fields: listing_slug, service_name, subjects, levels, location_type, hourly_rate
   - Ensures historical accuracy even if listing edited/deleted

2. **Profiles**:
   - Listing ownership via profile_id
   - Tutor display information

3. **Referrals**:
   - Commission delegation via `delegate_commission_to_profile_id`
   - Overrides default agent commission

4. **Reviews**:
   - Average rating calculated from reviews
   - Displayed on listing detail page

5. **Search/Discovery**:
   - Full-text search on title + description
   - Array containment search (subjects, levels)
   - GIN indexes for performance

6. **Wiselist** (Saved Listings):
   - Clients save/favorite listings
   - Stored in `saved_listings` junction table

7. **Auth**:
   - RLS policies: Public can view published, users can view own drafts
   - Only owner can edit/delete

---

## Key Functions & Triggers

### Database Triggers

**1. generate_listing_slug()**
- **Purpose**: Auto-generate URL-friendly slug from title
- **Location**: `apps/api/migrations/002_create_listings_table.sql`
- **Logic**:
  1. Strip non-alphanumeric characters
  2. Replace spaces with hyphens
  3. Append UUID prefix (first 8 chars)
  4. Result: "gcse-maths-tutoring-a1b2c3d4"
- **Trigger**: BEFORE INSERT ON listings

**2. update_listings_updated_at()**
- **Purpose**: Auto-update timestamp on changes
- **Trigger**: BEFORE UPDATE ON listings

### API Routes

**1. GET /api/listings**
- Fetch listings with optional filtering (status, subjects, levels)
- Returns: `{ listings[] }`

**2. POST /api/listings**
- Create new listing
- Validates: title (10-200 chars), description (50-2000 chars), hourly_rate (min £5)
- Auto-generates slug via trigger

**3. GET /api/listings/[id]**
- Fetch single listing by ID
- Includes tutor profile data

**4. PATCH /api/listings/[id]**
- Update listing fields
- RLS enforces ownership

**5. POST /api/listings/[id]/publish**
- Publish draft listing
- Sets: status = 'published', published_at = NOW()

**6. POST /api/listings/[id]/view**
- Increment view count (analytics)

---

## Listing Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│  LISTING STATE MACHINE                                         │
└────────────────────────────────────────────────────────────────┘

draft (created)
  │
  ↓ [publish]
published (live in marketplace)
  │
  ├─→ [unpublish] → unpublished (hidden but not deleted)
  │                    │
  │                    └─→ [re-publish] → published
  │
  └─→ [archive] → archived (soft delete)

Status values: 'draft', 'published', 'unpublished', 'archived'
```

---

## Common Tasks & Patterns

### Task 1: Create Listing with Auto-Generated Slug

**Example**: Tutor creates new listing

```typescript
// Frontend
const listing = await createListing({
  title: "GCSE Maths Tutoring - Expert Help for Exam Success",
  description: "I provide personalized maths tutoring...",
  subjects: ["Mathematics"],
  levels: ["GCSE"],
  hourly_rate: 35.00,
  location_type: "online",
  status: "draft"
});

// Database trigger auto-generates slug
console.log(listing.slug);
// → "gcse-maths-tutoring-expert-help-for-exam-success-a1b2c3d4"
```

### Task 2: Search Listings with Filters

**Requirement**: Client searches for "maths" tutors, GCSE level, £20-£40/hr

```typescript
// GET /api/listings/search?q=maths&levels=GCSE&min_rate=20&max_rate=40
const { data: listings } = await supabase
  .from('listings')
  .select('*, tutor:profiles!profile_id(*)')
  .eq('status', 'published')
  .textSearch('title_description', 'maths')  // Full-text search
  .contains('levels', ['GCSE'])              // Array containment
  .gte('hourly_rate', 20)
  .lte('hourly_rate', 40)
  .order('published_at', { ascending: false });
```

### Task 3: Implement Snapshot Mechanism in Bookings

**Requirement**: When booking created, preserve listing context

```typescript
// apps/web/src/app/api/bookings/route.ts

// 1. Fetch listing data
const { data: listing } = await supabase
  .from('listings')
  .select('*')
  .eq('id', listingId)
  .single();

// 2. Create booking with snapshot fields
const booking = await supabase.from('bookings').insert({
  client_id: clientId,
  tutor_id: tutorId,
  listing_id: listingId,

  // ← SNAPSHOT FIELDS (v5.8)
  listing_slug: listing.slug,
  service_name: listing.title,
  subjects: listing.subjects,
  levels: listing.levels,
  location_type: listing.location_type,
  hourly_rate: listing.hourly_rate,

  session_date: sessionDate,
  hours_requested: hours
});

// 3. Even if listing deleted/edited, booking retains original context
```

### Task 4: Commission Delegation to Store

**Requirement**: Tutor delegates commission to partner store

```typescript
// Update listing to delegate commission
await supabase
  .from('listings')
  .update({
    delegate_commission_to_profile_id: storeProfileId  // Partner store
  })
  .eq('id', listingId);

// When booking processed, commission goes to store instead of tutor's referrer
// Handled in process_booking_payment() RPC function:
// - If delegate_commission_to_profile_id IS NOT NULL
//   → Commission goes to delegated store
// - Else
//   → Commission goes to tutor's referred_by_profile_id
```

### Task 5: Saved Listings (Wiselist)

**Requirement**: Client saves listing for later

```typescript
// Save listing
await supabase.from('saved_listings').insert({
  user_id: clientId,
  listing_id: listingId
});

// Fetch saved listings
const { data: savedListings } = await supabase
  .from('saved_listings')
  .select('listing:listings(*)')
  .eq('user_id', clientId);

// Unsave
await supabase
  .from('saved_listings')
  .delete()
  .eq('user_id', clientId)
  .eq('listing_id', listingId);
```

### Task 6: Multi-Service Type Support (v4.0+)

**Requirement**: Support different service types (one-to-one, group, workshops)

```sql
-- Add service type field (migration 113)
ALTER TABLE listings ADD COLUMN service_type TEXT DEFAULT 'one_to_one'
  CHECK (service_type IN ('one_to_one', 'group', 'workshop', 'study_package'));

-- Create listing with service type
INSERT INTO listings (
  title,
  description,
  service_type,
  subjects,
  hourly_rate
) VALUES (
  'GCSE Maths Group Sessions',
  'Small group tutoring (max 4 students)...',
  'group',
  ARRAY['Mathematics'],
  25.00  -- Per student
);
```

---

## Testing Checklist

When modifying the listings feature, test:

- [ ] Listing creation (correct slug generation)
- [ ] Publish workflow (draft → published transition)
- [ ] Search functionality (full-text + filters)
- [ ] Snapshot mechanism (booking preserves listing context)
- [ ] Commission delegation (correct agent attribution)
- [ ] Saved listings (add/remove functionality)
- [ ] RLS policies (public sees published, owner sees all)
- [ ] Metrics tracking (view count increments)
- [ ] Listing editing (updated_at timestamp updates)
- [ ] Archiving (soft delete, not visible in marketplace)

---

## Security Considerations

1. **RLS Policies**:
   - Public can view published listings
   - Users can only edit/delete own listings
   - Draft listings only visible to owner

2. **Slug Uniqueness**:
   - UUID prefix prevents collisions
   - Unique constraint enforced

3. **Input Validation**:
   - Title: 10-200 characters
   - Description: 50-2000 characters
   - Hourly rate: £5-£500 range

4. **Snapshot Integrity**:
   - Booking snapshots immutable (no cascade delete)
   - Foreign key: listing_id ON DELETE SET NULL

---

## Performance Optimization

1. **Indexes**:
   - `idx_listings_published_at DESC WHERE status = 'published'` - Hot path
   - `idx_listings_subjects USING GIN(subjects)` - Array search
   - `idx_listings_levels USING GIN(levels)` - Array search
   - Full-text search: `to_tsvector('english', title || ' ' || description)`

2. **Caching**:
   - Cache published listings (5-minute stale time)
   - Auto-refresh listings every 60 seconds

3. **Pagination**:
   - Limit results to 50 per page
   - Offset-based pagination for marketplace

---

## Migration Guidelines

When creating new migrations for listings:

1. **Maintain Snapshot Compatibility**: If adding fields, decide if they should be snapshotted in bookings
2. **Create Indexes**: Add GIN indexes for new array columns
3. **Update Triggers**: Modify slug generation if title format changes
4. **Test Search**: Verify full-text search still works after schema changes
5. **Document Changes**: Update this prompt with new fields/behavior

---

## Related Documentation

- [Listings Solution Design](./listings-solution-design.md) - Complete architecture (43KB)
- [Listings README](./README.md) - Quick reference
- [Bookings Solution Design](../bookings/bookings-solution-design.md) - Snapshot mechanism
- [Referrals Solution Design](../referrals/referrals-solution-design.md) - Commission delegation

---

**Last Updated**: 2025-12-12
**Maintainer**: Backend Team
**For Questions**: See listings-solution-design.md or ask team lead
