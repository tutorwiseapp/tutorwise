# Listings

**Status**: Active
**Last Code Update**: 2025-11-13 (Migration 113 - Marketplace types)
**Last Doc Update**: 2025-12-12
**Priority**: Critical (Tier 1 - Core Marketplace)
**Architecture**: Discovery Engine + Snapshot System (v5.8)

## Quick Links
- [Solution Design](./listings-solution-design.md) - Complete architecture, 10 system integrations
- [Implementation Summary](./create-listing-v4-implementation-summary.md) - v4.0 multi-service support

## Overview

The listings feature is Tutorwise's core marketplace infrastructure, enabling tutors to create, publish, and manage service offerings. The system implements a sophisticated **snapshot mechanism** (v5.8) that preserves listing data in bookings, ensuring historical accuracy even if listings are modified or deleted. Built with full-text search, GIN indexes, and multi-service support, it powers the entire booking ecosystem.

## Key Features

- **Listing Creation & Publishing**: Multi-step wizard with draft/published states
- **Snapshot Mechanism (v5.8)**: Bookings preserve listing context permanently
- **Commission Delegation**: Tutors delegate referral commission to partner stores
- **Full-Text Search**: GIN-indexed search across titles, descriptions, subjects
- **Multi-Service Support (v4.0+)**: One-to-one, group sessions, workshops, study packages
- **SEO-Friendly URLs**: Auto-generated slugs (`/listings/{id}/{slug}`)
- **Availability Management**: Recurring and one-time availability periods
- **Analytics Tracking**: View count, inquiry count, booking count
- **Saved Listings**: Clients can favorite/save listings for later

## Implementation Status

### ✅ Completed (v5.8)
- Listing CRUD operations (Create, Read, Update, Delete)
- Multi-step creation wizard
- Snapshot mechanism in bookings (6 critical fields)
- Commission delegation to stores/partners (v4.3)
- Full-text search with GIN indexes
- Slug auto-generation
- RLS policies (draft vs published access)
- Analytics metrics (views, inquiries, bookings)
- Saved listings functionality (migration 098)
- Image upload + video URL support

### 🚧 In Progress (v4.0)
- Multi-service type support (partially implemented)
- Workshop/webinar specific fields
- Study package materials upload
- Group session management

### 📋 Planned
- Semantic search with embeddings (v4.12)
- AI-generated keywords
- Dynamic pricing (seasonal, demand-based)
- Listing templates for quick creation
- Advanced availability rules
- Multi-currency support

## System Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                       LISTING LIFECYCLE                             │
└────────────────────────────────────────────────────────────────────┘

draft → published → [bookable] → unpublished → archived
  │         │                          │
  └─────────┴──────────────────────────┘
         (can transition back)
```

## Database Schema

```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),

  -- Core fields
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',

  -- Arrays (GIN indexed)
  subjects TEXT[],
  levels TEXT[],
  languages TEXT[],

  -- Pricing
  hourly_rate DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'GBP',

  -- Location
  location_type VARCHAR(20),  -- 'online', 'in_person', 'hybrid'
  location_city VARCHAR(100),

  -- Delegation (v4.3)
  delegate_commission_to_profile_id UUID REFERENCES profiles(id),

  -- SEO
  slug VARCHAR(255) UNIQUE,
  tags TEXT[],

  -- Metrics
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
```

## Snapshot Mechanism (v5.8)

**Critical Feature**: When a booking is created, 6 listing fields are copied into the `bookings` table:

```sql
-- Booking snapshot fields (migration 104)
bookings {
  listing_id UUID,              -- Link (can be NULL if deleted)
  listing_slug TEXT,            -- Snapshot
  service_name TEXT,            -- Snapshot
  subjects TEXT[],              -- Snapshot
  levels TEXT[],                -- Snapshot
  location_type TEXT,           -- Snapshot
  hourly_rate DECIMAL           -- Snapshot
}
```

**Why This Matters**:
- ✅ Listing can be edited → booking shows original details
- ✅ Listing can be deleted → booking still has full context
- ✅ Financial accuracy → commission based on snapshot rate
- ✅ Dispute resolution → complete historical record

## API Routes

### Get Listings
```typescript
GET /api/listings?status=published&subjects=Mathematics&levels=GCSE
```

### Get Single Listing
```typescript
GET /api/listings/{id}
```

### Create Listing
```typescript
POST /api/listings
Body: {
  title: "GCSE Maths Tutoring",
  description: "...",
  subjects: ["Mathematics"],
  levels: ["GCSE"],
  hourly_rate: 35.00,
  location_type: "online",
  status: "draft"
}
```

### Update Listing
```typescript
PATCH /api/listings/{id}
```

### Publish Listing
```typescript
POST /api/listings/{id}/publish
```

### Increment Metrics
```typescript
POST /api/listings/{id}/view
POST /api/listings/{id}/inquiry
POST /api/listings/{id}/booking
```

## Key Files

### Frontend
```
apps/web/src/app/
├── listings/
│   └── [id]/[[...slug]]/
│       ├── page.tsx                    # Listing detail page
│       └── components/
│           ├── ListingHeroSection.tsx
│           ├── ListingDetailsCard.tsx
│           ├── ActionCard.tsx          # Book button
│           └── TutorCredibleStats.tsx
├── (authenticated)/listings/
│   ├── page.tsx                        # Tutor's listings dashboard
│   └── ListingCard.tsx
└── components/feature/listings/
    ├── CreateListingWizard.tsx         # Multi-step form
    ├── AvailabilityFormSection.tsx
    └── ImageUpload.tsx
```

### Backend
```
apps/api/migrations/
├── 002_create_listings_table.sql       # Core table
├── 023_add_listing_template_fields.sql
├── 025_add_listing_mvp_fields.sql
├── 031_add_archived_at_to_listings.sql
├── 032_add_listing_details_v4.1_fields.sql
├── 034_add_listing_commission_delegation.sql  # Delegation (v4.3)
├── 098_create_saved_listings_table.sql        # Saved listings
├── 102_update_listing_status_paused_to_unpublished.sql
├── 112_add_semantic_search_embeddings.sql     # AI search (v4.12)
└── 113_add_marketplace_listing_types.sql      # Service types (v4.0)
```

## System Integrations

The listings system integrates with **10 major platform features**:

1. **Auth** - RLS policies, ownership validation
2. **Bookings** - Snapshot mechanism (CRITICAL)
3. **Profiles** - Tutor information display
4. **Reviews** - Rating aggregation
5. **Referrals** - Commission delegation to stores
6. **Search/Discovery** - Full-text search, filtering
7. **Wiselist** - Saved listings functionality
8. **CaaS** - Credibility scoring
9. **Public Profile** - Listing display on tutor pages
10. **Analytics** - Performance tracking (views, inquiries, bookings)

See [listings-solution-design.md](./listings-solution-design.md) for detailed integration documentation.

## Usage Examples

### Create Listing

```typescript
const listing = await supabase
  .from('listings')
  .insert({
    profile_id: userId,
    title: "GCSE Maths Tutoring",
    description: "Expert maths tutor with 10 years experience...",
    subjects: ["Mathematics"],
    levels: ["GCSE"],
    hourly_rate: 35.00,
    location_type: "online",
    status: "draft"
  })
  .select()
  .single();
```

### Publish Listing

```typescript
await supabase
  .from('listings')
  .update({
    status: 'published',
    published_at: new Date().toISOString()
  })
  .eq('id', listingId);
```

### Search Listings

```typescript
const { data: listings } = await supabase
  .from('listings')
  .select('*, tutor:profiles!profile_id(*)')
  .eq('status', 'published')
  .textSearch('title_description', 'mathematics')
  .contains('subjects', ['Mathematics'])
  .contains('levels', ['GCSE'])
  .eq('location_type', 'online')
  .gte('hourly_rate', 20)
  .lte('hourly_rate', 50)
  .order('published_at', { ascending: false });
```

### Save Listing (Client)

```typescript
// Save
await supabase
  .from('saved_listings')
  .insert({ user_id: clientId, listing_id: listingId });

// Unsave
await supabase
  .from('saved_listings')
  .delete()
  .eq('user_id', clientId)
  .eq('listing_id', listingId);
```

## Security

### RLS Policies

```sql
-- Public can view published
CREATE POLICY listings_select_published
  FOR SELECT USING (status = 'published');

-- Users can view own (any status)
CREATE POLICY listings_select_own
  FOR SELECT USING (auth.uid() = profile_id);

-- Users can only create for themselves
CREATE POLICY listings_insert_own
  FOR INSERT WITH CHECK (auth.uid() = profile_id);
```

### Validation

```typescript
// Zod schema
const listingSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(2000),
  subjects: z.array(z.string()).min(1),
  levels: z.array(z.string()).min(1),
  hourly_rate: z.number().min(5).max(500)
});
```

## Testing

### Manual Test Scenarios

**Scenario 1: Create & Publish**
```
1. Tutor creates listing (status = draft)
2. Verify not visible in marketplace
3. Tutor publishes listing
4. Verify appears in search results
✅ Verify: slug auto-generated, published_at set
```

**Scenario 2: Snapshot on Booking**
```
1. Client books listing (rate = £35)
2. Tutor edits listing (rate = £45)
3. Check booking record
✅ Verify: booking.hourly_rate = £35 (snapshot preserved)
```

**Scenario 3: Commission Delegation**
```
1. Tutor sets delegate = Store A
2. Client books via tutor's QR code
3. Check commission recipient
✅ Verify: Store A receives commission (not tutor's referrer)
```

## Performance

### Indexes

```sql
-- Hot path: published listings search
CREATE INDEX idx_listings_published_search
  ON listings (published_at DESC)
  WHERE status = 'published';

-- Array filters
CREATE INDEX idx_listings_subjects ON listings USING GIN(subjects);
CREATE INDEX idx_listings_levels ON listings USING GIN(levels);

-- Full-text search
CREATE INDEX idx_listings_search ON listings USING GIN(
  to_tsvector('english', title || ' ' || description)
);
```

### Caching

```typescript
// Cache published listings (5 min stale time)
const { data: listings } = useQuery({
  queryKey: ['listings', 'published', filters],
  queryFn: () => fetchListings(filters),
  staleTime: 5 * 60 * 1000
});
```

## Troubleshooting

### Issue 1: Listing Not Appearing in Search

**Check**:
```sql
SELECT status, published_at FROM listings WHERE id = :listing_id;
```

**Fix**: Ensure `status = 'published'` and `published_at IS NOT NULL`

### Issue 2: Snapshot Fields NULL in Booking

**Check**:
```sql
SELECT listing_slug, service_name, hourly_rate
FROM bookings WHERE id = :booking_id;
```

**Fix**: Verify booking creation API copies snapshot fields (migration 104 applied)

### Issue 3: Commission Delegation Not Working

**Check**:
```sql
SELECT delegate_commission_to_profile_id
FROM listings WHERE id = :listing_id;
```

**Fix**: Verify delegation field set + check payment processing logic

## Related Documentation

- [Bookings Solution Design](../bookings/bookings-solution-design.md) - Snapshot mechanism
- [Referrals Solution Design](../referrals/referrals-solution-design.md) - Commission delegation
- [Payments Solution Design](../payments/payments-solution-design.md) - Pricing
- [Account Solution Design](../account/account-solution-design.md) - Tutor profiles

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-12 | v5.8 | Documentation complete with integrations |
| 2025-11-13 | v4.13 | Added marketplace listing types |
| 2025-11-12 | v4.12 | Semantic search embeddings |
| 2025-12-09 | v4.11 | Saved listings table |
| 2025-11-07 | v4.3 | Commission delegation to stores |
| 2025-11-04 | v4.1 | Dynamic listing details fields |
| 2025-10-09 | v1.0 | Initial listings table creation |

---

**Last Updated**: 2025-12-12
**Version**: v5.8 (Snapshot Mechanism)
**Status**: Active - 90% Complete
**Architecture**: Discovery Engine + Booking Snapshot System
