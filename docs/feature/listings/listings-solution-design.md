# Listings Solution Design

**Version**: v5.8 (Snapshot Mechanism)
**Date**: 2025-12-12
**Status**: Active
**Owner**: Product Team
**Architecture**: Marketplace Discovery + Booking Snapshot System

---

## Executive Summary

The Listings feature is Tutorwise's core marketplace infrastructure, enabling tutors to create, publish, and manage service offerings that clients can discover and book. The system implements a sophisticated **snapshot mechanism** (v5.8) that preserves listing data at booking time, ensuring historical accuracy even if the listing is later modified or deleted. Built with full-text search, GIN indexes for array filtering, and RLS policies, the system supports multiple service types, availability management, and commission delegation.

**Key Capabilities**:
- **Listing Creation & Publishing**: Multi-step wizard with draft/published states
- **Snapshot Mechanism (v5.8)**: Bookings preserve listing context permanently
- **Commission Delegation**: Tutors can delegate referral commission to partner stores
- **Full-Text Search**: GIN-indexed search across titles, descriptions, subjects
- **Availability Management**: Recurring and one-time availability periods
- **Multi-Service Support (v4.0+)**: One-to-one, group sessions, workshops, study packages
- **SEO-Friendly URLs**: Auto-generated slugs for discoverability
- **Analytics Tracking**: View count, inquiry count, booking count

---

## System Architecture

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     LISTINGS SYSTEM ARCHITECTURE                    │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│                      LISTING CREATION FLOW                          │
└────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    Tutor     │
│ (Creator)    │
└──────┬───────┘
       │
       │ 1. Navigate to /create-listing
       ↓
┌──────────────────────────────────────────────────────────────────────┐
│  Create Listing Wizard (Multi-Step Form)                            │
│                                                                      │
│  Step 1: Service Type Selection                                     │
│  □ One-to-One Session                                               │
│  □ Group Session (2-10 people)                                      │
│  □ Workshop/Webinar (10-500 people)                                 │
│  □ Study Package (PDF/Video/Bundle)                                 │
│                                                                      │
│  Step 2: Core Details                                               │
│  - Service Title (min 10, max 200 chars)                            │
│  - Description (min 50, max 2000 chars)                             │
│  - Subjects (array: Mathematics, Physics, etc.)                     │
│  - Levels (array: GCSE, A-Level, University)                        │
│  - Languages (array: English, Spanish, etc.)                        │
│                                                                      │
│  Step 3: Pricing & Delivery                                         │
│  - Hourly Rate (£X.XX)                                              │
│  - Location Type (online/in_person/hybrid)                          │
│  - Session Durations (30min, 60min, 90min, 120min)                  │
│                                                                      │
│  Step 4: Availability (One-to-One & Group Sessions only)            │
│  - Recurring: Monday-Sunday with time slots                         │
│  - One-time: Specific dates with time ranges                        │
│  - Load from Profile (copy tutor's general availability)            │
│                                                                      │
│  Step 5: Workshop Details (Workshops only)                          │
│  - Event Date + Start/End Time                                      │
│  - Max Participants                                                 │
│  - Speaker Bio, Event Agenda                                        │
│                                                                      │
│  Step 6: Media                                                       │
│  - Hero Image Upload                                                │
│  - Video URL (optional)                                             │
│                                                                      │
│  Step 7: Advanced Settings                                          │
│  - Commission Delegation (to store/partner)                         │
│  - Cancellation Policy                                              │
│  - Tags for discoverability                                         │
└──────────────────────────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────────────────┐
│  Save Listing                                                        │
│  → POST /api/listings                                                │
│                                                                      │
│  1. Validate input (Zod schema)                                     │
│  2. Generate slug from title (auto)                                 │
│  3. Insert into listings table                                      │
│  4. Set status = 'draft' OR 'published'                             │
│  5. Return listing ID                                               │
└──────────────────────────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────────────────┐
│  Listing Published (status = 'published')                           │
│  → Appears in marketplace search                                    │
│  → SEO-friendly URL: /listings/{id}/{slug}                          │
└──────────────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────┐
│                   SNAPSHOT MECHANISM (v5.8)                         │
│               (Preserves listing context in bookings)               │
└────────────────────────────────────────────────────────────────────┘

Client Creates Booking
       │
       ↓
┌──────────────────────────────────────────────────────────────────────┐
│  Booking Creation API                                                │
│  → apps/web/src/app/api/bookings/route.ts                           │
│                                                                      │
│  1. Fetch listing (current state):                                  │
│     const listing = await getListing(listing_id);                   │
│                                                                      │
│  2. SNAPSHOT CRITICAL FIELDS into bookings table:                   │
│     {                                                                │
│       listing_id: listing.id,           // Link (can be deleted)    │
│       listing_slug: listing.slug,       // Snapshot                 │
│       service_name: listing.title,      // Snapshot                 │
│       subjects: listing.subjects,       // Snapshot                 │
│       levels: listing.levels,           // Snapshot                 │
│       location_type: listing.location_type, // Snapshot             │
│       hourly_rate: listing.hourly_rate, // Snapshot                 │
│       tutor_id: listing.profile_id      // Direct reference         │
│     }                                                                │
│                                                                      │
│  3. Create booking record with snapshot fields                      │
│                                                                      │
│  WHY THIS MATTERS:                                                   │
│  - Listing can be edited later → booking shows original context     │
│  - Listing can be deleted → booking still has service details       │
│  - Transaction history remains accurate                             │
│  - Dispute resolution has complete context                          │
└──────────────────────────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────────────────┐
│  Booking Record Example (Migration 104):                            │
│                                                                      │
│  bookings {                                                          │
│    id: uuid,                                                         │
│    listing_id: uuid,              // ← Can be NULL if deleted       │
│    listing_slug: "gcse-maths",    // ← Snapshot (permanent)         │
│    service_name: "GCSE Maths",    // ← Snapshot (permanent)         │
│    subjects: ["Mathematics"],     // ← Snapshot (permanent)         │
│    levels: ["GCSE"],              // ← Snapshot (permanent)         │
│    location_type: "online",       // ← Snapshot (permanent)         │
│    hourly_rate: 35.00,            // ← Snapshot (permanent)         │
│    tutor_id: uuid,                // ← Direct reference             │
│    client_id: uuid                                                   │
│  }                                                                   │
│                                                                      │
│  RESULT: Even if listing deleted, booking has all context           │
└──────────────────────────────────────────────────────────────────────┘
```

---

## System Integrations

The listings system integrates with **10 major platform features**:

### 1. Auth Integration (User Identity & Permissions)

**Purpose**: Ensure only authenticated tutors can create listings

**Key Files**:
- `apps/web/src/app/api/listings/route.ts`
- RLS policies on `listings` table

**RLS Policies**:

```sql
-- Users can view all published listings (anonymous + authenticated)
CREATE POLICY listings_select_published ON listings
  FOR SELECT
  USING (status = 'published');

-- Users can view their own listings (any status)
CREATE POLICY listings_select_own ON listings
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can only create listings for themselves
CREATE POLICY listings_insert_own ON listings
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Users can only update their own listings
CREATE POLICY listings_update_own ON listings
  FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Users can only delete their own listings
CREATE POLICY listings_delete_own ON listings
  FOR DELETE
  USING (auth.uid() = profile_id);
```

**Integration Points**:
- Listing creation requires authenticated user
- `profile_id` automatically set from `auth.uid()`
- Role check: Only tutors/agents can create listings

---

### 2. Bookings Integration (CRITICAL - Snapshot Mechanism v5.8)

**Purpose**: Preserve listing context at booking time for historical accuracy

**Key Files**:
- `apps/web/src/app/api/bookings/route.ts`
- `apps/api/migrations/104_add_booking_snapshot_fields.sql`
- `bookings` table schema

**Snapshot Fields** (Migration 104):

```sql
ALTER TABLE bookings
ADD COLUMN listing_slug TEXT,           -- Snapshot from listings.slug
ADD COLUMN service_name TEXT,           -- Snapshot from listings.title
ADD COLUMN subjects TEXT[],             -- Snapshot from listings.subjects
ADD COLUMN levels TEXT[],               -- Snapshot from listings.levels
ADD COLUMN location_type TEXT,          -- Snapshot from listings.location_type
ADD COLUMN hourly_rate DECIMAL(10,2);   -- Snapshot from listings.hourly_rate
```

**Booking Creation Logic**:

```typescript
// apps/web/src/app/api/bookings/route.ts
export async function POST(request: Request) {
  const { listing_id, client_id, session_start_time, duration } = await request.json();

  // 1. Fetch listing (current state)
  const { data: listing } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listing_id)
    .eq('status', 'published')
    .single();

  if (!listing) {
    return Response.json({ error: 'Listing not found or not published' }, { status: 404 });
  }

  // 2. Create booking with SNAPSHOT fields (v5.8)
  const { data: booking } = await supabase
    .from('bookings')
    .insert({
      listing_id: listing.id,
      client_id,
      tutor_id: listing.profile_id,
      // SNAPSHOT FIELDS (preserve listing context)
      listing_slug: listing.slug,
      service_name: listing.title,
      subjects: listing.subjects,
      levels: listing.levels,
      location_type: listing.location_type,
      hourly_rate: listing.hourly_rate,
      // Booking-specific
      session_start_time,
      session_end_time: addMinutes(session_start_time, duration),
      status: 'Pending',
      payment_status: 'Pending'
    })
    .select()
    .single();

  // 3. Increment listing.booking_count
  await supabase.rpc('increment_listing_booking_count', { listing_id: listing.id });

  return Response.json({ booking });
}
```

**Why Snapshot Matters**:

1. **Listing Edits**: Tutor changes hourly rate from £35 to £45 → Old bookings still show £35
2. **Listing Deletion**: Tutor deletes listing → Booking history still shows service details
3. **Dispute Resolution**: Complete context available even if listing modified
4. **Financial Accuracy**: Commission calculations based on snapshot rate, not current rate
5. **Historical Reporting**: Analytics show what was actually offered/booked

**Integration Points**:
- Booking creation copies 6 critical fields from listings
- `listing_id` foreign key can be NULL (if listing deleted)
- Transactions table also uses snapshot fields (v5.10)

---

### 3. Profiles Integration (Tutor Information Display)

**Purpose**: Display tutor profile data on listing pages

**Key Files**:
- `apps/web/src/app/listings/[id]/[[...slug]]/page.tsx`
- `profiles` table

**Data Flow**:

```typescript
// Fetch listing with tutor profile
const { data: listing } = await supabase
  .from('listings')
  .select(`
    *,
    tutor:profiles!profile_id (
      id,
      full_name,
      slug,
      avatar_url,
      bio,
      rating,
      review_count,
      verified,
      business_name,
      professional_details
    )
  `)
  .eq('id', listingId)
  .single();
```

**Integration Points**:
- Listing page shows tutor name, avatar, rating
- Verification badge displayed from `profiles.verified`
- Professional details (qualifications, experience) shown
- Public profile link: `/tutors/{tutor.slug}`

---

### 4. Reviews Integration (Rating Aggregation)

**Purpose**: Display aggregate rating and review count on listings

**Key Files**:
- `reviews` table
- `profiles.rating` (aggregated from reviews)
- `profiles.review_count`

**Rating Display**:

```typescript
// Display tutor rating on listing
<div className={styles.rating}>
  <Star filled />
  <span>{listing.tutor.rating.toFixed(1)}</span>
  <span>({listing.tutor.review_count} reviews)</span>
</div>
```

**Integration Points**:
- Listing displays tutor's aggregate rating
- Reviews are NOT listing-specific (they're tutor-specific)
- Recent reviews shown on listing page

---

### 5. Referrals Integration (Commission Delegation)

**Purpose**: Enable tutors to delegate referral commission to partner stores

**Key Files**:
- `listings.delegate_commission_to_profile_id` (v4.3)
- `apps/api/migrations/034_add_listing_commission_delegation.sql`

**Schema**:

```sql
ALTER TABLE listings
ADD COLUMN delegate_commission_to_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Constraint: Cannot delegate to self
ALTER TABLE listings
ADD CONSTRAINT listings_no_self_delegation
CHECK (delegate_commission_to_profile_id != profile_id);
```

**Use Case**:

```
Tutor prints flyers with QR code → Coffee shop displays flyers
→ Client scans QR → Books session
→ Coffee shop (delegate) earns 10% commission instead of tutor's original referrer
```

**Integration with Payments**:

```sql
-- In process_booking_payment()
IF listing.delegate_commission_to_profile_id IS NOT NULL
   AND booking.agent_profile_id = listing.profile_id
THEN
  -- Pay delegate (store) instead of original referrer
  v_commission_recipient_id := listing.delegate_commission_to_profile_id;
END IF;
```

**Integration Points**:
- Listing creation form has optional "Referral Partner" dropdown
- Shows connected agents/stores
- Delegation only applies when tutor is the direct referrer

---

### 6. Search/Discovery Integration (Full-Text Search)

**Purpose**: Enable clients to find listings via search and filters

**Key Files**:
- `apps/web/src/app/api/listings/search/route.ts`
- GIN indexes on `listings` table

**Search Implementation**:

```sql
-- Full-text search index
CREATE INDEX idx_listings_search ON listings USING GIN(
  to_tsvector('english', title || ' ' || description)
);

-- Array indexes for filtering
CREATE INDEX idx_listings_subjects ON listings USING GIN(subjects);
CREATE INDEX idx_listings_levels ON listings USING GIN(levels);
CREATE INDEX idx_listings_location_city ON listings(location_city);
```

**Search Query**:

```typescript
// Search with filters
const { data: listings } = await supabase
  .from('listings')
  .select('*, tutor:profiles!profile_id(*)')
  .eq('status', 'published')
  .textSearch('title_description', query) // Full-text search
  .contains('subjects', selectedSubjects) // Array filter
  .contains('levels', selectedLevels)
  .eq('location_type', selectedLocationType)
  .gte('hourly_rate', minRate)
  .lte('hourly_rate', maxRate)
  .order('published_at', { ascending: false })
  .range(offset, offset + limit);
```

**Integration Points**:
- Homepage search bar
- Advanced filters (subjects, levels, location, price range)
- Sorting (newest, price low-to-high, highest rated)

---

### 7. Wiselist Integration (Saved Listings)

**Purpose**: Enable clients to save/favorite listings for later

**Key Files**:
- `saved_listings` table (migration 098)
- `apps/web/src/app/api/listings/[id]/save/route.ts`

**Schema**:

```sql
CREATE TABLE saved_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

CREATE INDEX idx_saved_listings_user_id ON saved_listings(user_id);
CREATE INDEX idx_saved_listings_listing_id ON saved_listings(listing_id);
```

**Save/Unsave Logic**:

```typescript
// Save listing
POST /api/listings/{id}/save
→ INSERT INTO saved_listings (user_id, listing_id)

// Unsave listing
DELETE /api/listings/{id}/save
→ DELETE FROM saved_listings WHERE user_id = :user_id AND listing_id = :listing_id

// Get saved listings
GET /api/listings/saved
→ SELECT * FROM saved_listings WHERE user_id = :user_id
```

**Integration Points**:
- Heart icon on listing cards
- "Saved Listings" section in client dashboard
- Saved count analytics

---

### 8. CaaS Integration (Credibility Scoring)

**Purpose**: Display credibility score on listing pages

**Key Files**:
- `profiles.credibility_score`
- CaaS recalculation triggers

**Display**:

```typescript
// Show credibility badge on listing
{listing.tutor.credibility_score >= 80 && (
  <Badge variant="gold">Highly Credible</Badge>
)}
```

**Factors Affecting Score**:
- Number of published listings
- Booking completion rate
- Review ratings
- Verification status
- Response time

---

### 9. Public Profile Integration (Listing Display)

**Purpose**: Display tutor's listings on their public profile page

**Key Files**:
- `apps/web/src/app/tutors/[slug]/page.tsx`

**Query**:

```typescript
// Get tutor's published listings
const { data: listings } = await supabase
  .from('listings')
  .select('*')
  .eq('profile_id', tutorId)
  .eq('status', 'published')
  .order('published_at', { ascending: false });
```

**Integration Points**:
- Public profile shows all published listings
- Listings ordered by newest first
- Click listing → go to `/listings/{id}/{slug}`

---

### 10. Analytics Integration (Performance Tracking)

**Purpose**: Track listing performance metrics

**Key Fields**:
- `listings.view_count` - Incremented on page view
- `listings.inquiry_count` - Incremented on message sent
- `listings.booking_count` - Incremented on booking created

**Tracking Logic**:

```typescript
// Increment view count
await supabase.rpc('increment_listing_view_count', { listing_id });

// Increment inquiry count (when client messages tutor)
await supabase.rpc('increment_listing_inquiry_count', { listing_id });

// Increment booking count (when booking created)
await supabase.rpc('increment_listing_booking_count', { listing_id });
```

**Dashboard Display**:

```typescript
// Tutor's listings dashboard
{listings.map(listing => (
  <ListingCard key={listing.id}>
    <Stats>
      <Stat icon={<Eye />} value={listing.view_count} label="Views" />
      <Stat icon={<Message />} value={listing.inquiry_count} label="Inquiries" />
      <Stat icon={<Calendar />} value={listing.booking_count} label="Bookings" />
    </Stats>
  </ListingCard>
))}
```

---

## Database Schema

### Core Table

```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Basic Info
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
    -- 'draft', 'published', 'unpublished', 'archived'

  -- Teaching Details
  subjects TEXT[] NOT NULL DEFAULT '{}',     -- ['Mathematics', 'Physics']
  levels TEXT[] NOT NULL DEFAULT '{}',       -- ['GCSE', 'A-Level', 'University']
  languages TEXT[] NOT NULL DEFAULT '{}',    -- ['English', 'Spanish']
  specializations TEXT[] DEFAULT '{}',       -- ['Algebra', 'Calculus']
  teaching_methods TEXT[] DEFAULT '{}',      -- ['Visual', 'Interactive']
  qualifications TEXT[] DEFAULT '{}',        -- ['BSc Mathematics', 'PGCE']

  -- Pricing
  hourly_rate DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'GBP',
  pricing_packages JSONB,                    -- [{ sessions: 5, price: 100 }]
  free_trial BOOLEAN DEFAULT false,
  trial_duration_minutes INTEGER,

  -- Availability & Location
  location_type VARCHAR(20) NOT NULL,        -- 'online', 'in_person', 'hybrid'
  location_address TEXT,
  location_city VARCHAR(100),
  location_postcode VARCHAR(20),
  location_country VARCHAR(100) DEFAULT 'United Kingdom',
  timezone VARCHAR(50) DEFAULT 'Europe/London',
  availability JSONB,                        -- { monday: [{ start: '09:00', end: '17:00' }] }
  unavailability JSONB,                      -- [{ start_date, end_date, reason }]

  -- Service Type (v4.0+)
  service_type VARCHAR(50) DEFAULT 'one-to-one',
    -- 'one-to-one', 'group-session', 'workshop', 'study-package'
  service_details JSONB,                     -- Type-specific fields

  -- Media
  images TEXT[] DEFAULT '{}',
  video_url TEXT,

  -- SEO & Discovery
  slug VARCHAR(255) UNIQUE,
  tags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',              -- AI-generated (v4.12)
  embedding VECTOR(1536),                    -- Semantic search (v4.12)

  -- Commission Delegation (v4.3)
  delegate_commission_to_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Booking Options
  session_durations INTEGER[] DEFAULT '{30,60,90,120}', -- Minutes
  cancellation_policy TEXT,
  booking_buffer_minutes INTEGER DEFAULT 60,  -- Min time before session
  max_advance_booking_days INTEGER DEFAULT 90,

  -- Metrics
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_hourly_rate CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
  CONSTRAINT no_self_delegation CHECK (delegate_commission_to_profile_id != profile_id)
);

-- Indexes
CREATE INDEX idx_listings_profile_id ON listings(profile_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_subjects ON listings USING GIN(subjects);
CREATE INDEX idx_listings_levels ON listings USING GIN(levels);
CREATE INDEX idx_listings_location_type ON listings(location_type);
CREATE INDEX idx_listings_location_city ON listings(location_city);
CREATE INDEX idx_listings_published_at ON listings(published_at DESC) WHERE status = 'published';
CREATE INDEX idx_listings_slug ON listings(slug);
CREATE INDEX idx_listings_embedding ON listings USING ivfflat (embedding vector_cosine_ops); -- v4.12

-- Full-text search
CREATE INDEX idx_listings_search ON listings USING GIN(
  to_tsvector('english', title || ' ' || description)
);
```

### Helper Functions

```sql
-- Auto-generate slug from title
CREATE OR REPLACE FUNCTION generate_listing_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(
      regexp_replace(
        regexp_replace(NEW.title, '[^\w\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    ) || '-' || substring(NEW.id::text from 1 for 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_generate_slug
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION generate_listing_slug();

-- Increment metrics
CREATE OR REPLACE FUNCTION increment_listing_view_count(listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE listings SET view_count = view_count + 1 WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_listing_inquiry_count(listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE listings SET inquiry_count = inquiry_count + 1 WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_listing_booking_count(listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE listings SET booking_count = booking_count + 1 WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Listing States & Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      LISTING STATE MACHINE                       │
└─────────────────────────────────────────────────────────────────┘

   [Listing Created]
          │
          ↓
     ┌────────┐
     │ draft  │  → Tutor creating/editing listing
     └───┬────┘
         │
         │ (Publish action)
         ↓
   ┌────────────┐
   │ published  │  → Visible in marketplace, bookable
   └────┬───────┘
        │
        ├─ (Unpublish action)
        │  ↓
        │  ┌──────────────┐
        │  │ unpublished  │  → Hidden from marketplace, not bookable
        │  └──────┬───────┘
        │         │
        │         └─ (Re-publish) → back to published
        │
        └─ (Archive action)
           ↓
        ┌──────────┐
        │ archived │  → Soft deleted, historical only
        └──────────┘

Status Rules:
  - draft: Only visible to owner
  - published: Visible to all, appears in search
  - unpublished: Only visible to owner, hidden from search
  - archived: Only visible to owner, cannot be re-published
```

---

## Security & Validation

### Row Level Security (RLS)

```sql
-- Public can view published listings
CREATE POLICY listings_select_published ON listings
  FOR SELECT
  USING (status = 'published');

-- Users can view own listings (any status)
CREATE POLICY listings_select_own ON listings
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can only create for themselves
CREATE POLICY listings_insert_own ON listings
  FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

-- Users can only update own listings
CREATE POLICY listings_update_own ON listings
  FOR UPDATE
  USING (auth.uid() = profile_id);

-- Users can only delete own listings
CREATE POLICY listings_delete_own ON listings
  FOR DELETE
  USING (auth.uid() = profile_id);
```

### Input Validation (Zod)

```typescript
const listingSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(50).max(2000),
  subjects: z.array(z.string()).min(1),
  levels: z.array(z.string()).min(1),
  languages: z.array(z.string()).min(1),
  hourly_rate: z.number().min(5).max(500),
  location_type: z.enum(['online', 'in_person', 'hybrid']),
  status: z.enum(['draft', 'published']).optional()
});
```

---

## Performance Considerations

### Database Optimization

```sql
-- Partial index for published listings (hot path)
CREATE INDEX idx_listings_published_search
  ON listings (published_at DESC)
  WHERE status = 'published';

-- Composite index for filtered search
CREATE INDEX idx_listings_location_subjects
  ON listings (location_type, location_city)
  INCLUDE (subjects, levels);
```

### Caching Strategy

```typescript
// Cache published listings (5-minute stale time)
const { data: listings } = useQuery({
  queryKey: ['listings', 'published', filters],
  queryFn: () => fetchListings(filters),
  staleTime: 5 * 60 * 1000
});
```

---

## Related Documentation

- [Bookings Solution Design](../bookings/bookings-solution-design.md) - Snapshot mechanism
- [Referrals Solution Design](../referrals/referrals-solution-design.md) - Commission delegation
- [Payments Solution Design](../payments/payments-solution-design.md) - Pricing and payouts
- [Profiles Solution Design](../account/account-solution-design.md) - Tutor profiles

---

**Last Updated**: 2025-12-12
**Version**: v5.8 (Snapshot Mechanism)
**Status**: Active - 90% Complete
**Architecture**: Marketplace Discovery + Booking Snapshot System
