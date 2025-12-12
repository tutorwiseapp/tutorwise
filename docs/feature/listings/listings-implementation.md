# Listings - Implementation Guide

**Version**: v5.8
**Last Updated**: 2025-12-12
**Target Audience**: Developers

---

## Table of Contents
1. [File Structure](#file-structure)
2. [Component Overview](#component-overview)
3. [Setup Instructions](#setup-instructions)
4. [Common Tasks](#common-tasks)
5. [API Reference](#api-reference)
6. [Database Schema](#database-schema)
7. [State Management](#state-management)
8. [Testing](#testing)

---

## File Structure

```
apps/web/src/
├─ app/listings/
│   ├─ [id]/[[...slug]]/
│   │   ├─ page.tsx                       # Listing detail page (Server Component)
│   │   └─ page.module.css
│   └─ components/
│       ├─ ListingHeroSection.tsx         # Hero with title, price, rating
│       ├─ ListingDetailsCard.tsx         # Subjects, levels, description
│       ├─ ActionCard.tsx                 # Book button + save
│       ├─ TutorCredibleStats.tsx         # Reviews, bookings, response time
│       └─ AvailabilityCalendar.tsx       # Session scheduling
│
├─ app/(authenticated)/listings/
│   ├─ page.tsx                           # Tutor's listings dashboard
│   ├─ page.module.css
│   ├─ create/
│   │   ├─ page.tsx                       # Create listing wizard
│   │   └─ page.module.css
│   └─ components/
│       ├─ ListingCard.tsx                # Individual listing card
│       ├─ CreateListingWizard.tsx        # Multi-step form
│       ├─ BasicInfoStep.tsx              # Step 1: Title, description
│       ├─ SubjectsLevelsStep.tsx         # Step 2: Teaching details
│       ├─ PricingStep.tsx                # Step 3: Hourly rate
│       ├─ AvailabilityStep.tsx           # Step 4: Schedule
│       └─ ReviewPublishStep.tsx          # Step 5: Review & publish
│
├─ app/api/listings/
│   ├─ route.ts                           # GET/POST listings
│   ├─ [id]/route.ts                      # GET/PATCH/DELETE single listing
│   ├─ [id]/publish/route.ts              # Publish listing
│   ├─ [id]/view/route.ts                 # Increment view count
│   └─ search/route.ts                    # Search listings
│
└─ lib/api/
    └─ listings.ts                        # Client-side API functions

apps/api/migrations/
├─ 002_create_listings_table.sql
├─ 023_add_listing_template_fields.sql
├─ 025_add_listing_mvp_fields.sql
├─ 031_add_archived_at_to_listings.sql
├─ 032_add_listing_details_v4.1_fields.sql
├─ 034_add_listing_commission_delegation.sql
├─ 098_create_saved_listings_table.sql
├─ 102_update_listing_status_paused_to_unpublished.sql
├─ 112_add_semantic_search_embeddings.sql
└─ 113_add_marketplace_listing_types.sql
```

---

## Component Overview

### Listing Detail Page Architecture

```
┌────────────────────────────────────────────┐
│ Listing Detail Page (/listings/[id]/slug) │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ ListingHeroSection                     │ │
│ │ - Title, Price, Rating, Save button    │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ ┌──────────────┐  ┌─────────────────────┐ │
│ │ Details Card │  │ ActionCard          │ │
│ │ - Subjects   │  │ - Book button       │ │
│ │ - Levels     │  │ - Contact tutor     │ │
│ │ - Description│  │ - Share listing     │ │
│ └──────────────┘  └─────────────────────┘ │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ TutorCredibleStats                     │ │
│ │ - Reviews (4.8★), Bookings (127)       │ │
│ └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### Component Breakdown

**CreateListingWizard** (apps/web/src/app/components/feature/listings/CreateListingWizard.tsx)
- Multi-step form (5 steps)
- Progress indicator
- Draft auto-save
- Validation per step
- Final review before publish

**ListingCard** (apps/web/src/app/(authenticated)/listings/components/ListingCard.tsx)
- Displays listing preview
- Status badge (draft, published, unpublished)
- Quick actions: Edit, Publish, Archive
- Metrics: Views, inquiries, bookings

**ListingHeroSection** (apps/web/src/app/listings/components/ListingHeroSection.tsx)
- Listing title
- Hourly rate
- Average rating (from reviews)
- Save/unsave button
- Location type badge

---

## Setup Instructions

### Prerequisites
- Next.js 14+ installed
- Supabase configured
- Image upload service (Supabase Storage or Cloudinary)
- React Query installed

### Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Image upload (optional)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset
```

### Development Setup

```bash
# 1. Navigate to web app
cd apps/web

# 2. Install dependencies
npm install

# 3. Run migrations
npm run db:migrate

# 4. Start dev server
npm run dev

# 5. Open listings page
open http://localhost:3000/listings
```

---

## Common Tasks

### Task 1: Create a Listing

```typescript
// Client-side API call
import { createListing } from '@/lib/api/listings';

const handleCreateListing = async () => {
  const listingData = {
    title: 'GCSE Maths Tutoring - Expert Help for Exam Success',
    description: 'I provide personalized maths tutoring for GCSE students...',
    subjects: ['Mathematics'],
    levels: ['GCSE'],
    hourly_rate: 35.00,
    location_type: 'online',
    languages: ['English'],
    status: 'draft'  // Start as draft
  };

  try {
    const listing = await createListing(listingData);
    console.log('Listing created:', listing.id);

    // Auto-generate slug (handled by database trigger)
    console.log('Slug:', listing.slug); // "gcse-maths-tutoring-expert-help-for-exam-success-a1b2c3d4"
  } catch (error) {
    console.error('Listing creation failed:', error);
  }
};
```

### Task 2: Publish a Listing

```typescript
// POST /api/listings/[id]/publish
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const { data: listing } = await supabase
    .from('listings')
    .select('profile_id, status')
    .eq('id', params.id)
    .single();

  if (listing.profile_id !== user.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (listing.status === 'published') {
    return Response.json({ error: 'Already published' }, { status: 400 });
  }

  // Publish
  const { error } = await supabase
    .from('listings')
    .update({
      status: 'published',
      published_at: new Date().toISOString()
    })
    .eq('id', params.id);

  if (error) throw error;

  return Response.json({ success: true });
}
```

### Task 3: Search Listings with Filters

```typescript
// GET /api/listings/search
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const query = searchParams.get('q') || '';
  const subjects = searchParams.get('subjects')?.split(',') || [];
  const levels = searchParams.get('levels')?.split(',') || [];
  const locationType = searchParams.get('location_type');
  const minRate = parseFloat(searchParams.get('min_rate') || '0');
  const maxRate = parseFloat(searchParams.get('max_rate') || '999');

  const supabase = await createClient();

  let listingsQuery = supabase
    .from('listings')
    .select('*, tutor:profiles!profile_id(*)')
    .eq('status', 'published');

  // Full-text search
  if (query) {
    listingsQuery = listingsQuery.textSearch('title_description', query);
  }

  // Array filters
  if (subjects.length > 0) {
    listingsQuery = listingsQuery.contains('subjects', subjects);
  }

  if (levels.length > 0) {
    listingsQuery = listingsQuery.contains('levels', levels);
  }

  // Location filter
  if (locationType) {
    listingsQuery = listingsQuery.eq('location_type', locationType);
  }

  // Price range
  listingsQuery = listingsQuery
    .gte('hourly_rate', minRate)
    .lte('hourly_rate', maxRate);

  // Sort by relevance (published_at desc)
  listingsQuery = listingsQuery.order('published_at', { ascending: false });

  const { data: listings, error } = await listingsQuery;

  if (error) throw error;

  return Response.json({ listings });
}

// Usage in component
const { data: listings } = useQuery({
  queryKey: ['listings', 'search', filters],
  queryFn: () => searchListings(filters),
});
```

### Task 4: Update Listing

```typescript
// PATCH /api/listings/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const updates = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify ownership
  const { data: listing } = await supabase
    .from('listings')
    .select('profile_id')
    .eq('id', params.id)
    .single();

  if (listing.profile_id !== user.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Update (RLS enforces ownership)
  const { error } = await supabase
    .from('listings')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', params.id);

  if (error) throw error;

  return Response.json({ success: true });
}

// Usage
await updateListing(listingId, {
  hourly_rate: 40.00,
  description: 'Updated description...'
});
```

### Task 5: Save/Unsave Listing (Client)

```typescript
// Save listing
const handleSaveListing = async (listingId: string) => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    alert('Please sign in to save listings');
    return;
  }

  const { error } = await supabase
    .from('saved_listings')
    .insert({
      user_id: user.id,
      listing_id: listingId
    });

  if (error) {
    if (error.code === '23505') {
      // Already saved (unique constraint violation)
      console.log('Already saved');
    } else {
      throw error;
    }
  }
};

// Unsave listing
const handleUnsaveListing = async (listingId: string) => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('saved_listings')
    .delete()
    .eq('user_id', user.id)
    .eq('listing_id', listingId);

  if (error) throw error;
};

// Check if saved
const { data: savedListings } = useQuery({
  queryKey: ['saved-listings', userId],
  queryFn: async () => {
    const { data } = await supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', userId);
    return data?.map(sl => sl.listing_id) || [];
  }
});

const isSaved = savedListings?.includes(listingId);
```

### Task 6: Increment View Count

```typescript
// POST /api/listings/[id]/view
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  // Increment view count (no auth required)
  const { error } = await supabase.rpc('increment_listing_views', {
    p_listing_id: params.id
  });

  if (error) throw error;

  return Response.json({ success: true });
}

// RPC function (migration)
CREATE OR REPLACE FUNCTION increment_listing_views(p_listing_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE listings
  SET view_count = view_count + 1
  WHERE id = p_listing_id;
END;
$$ LANGUAGE plpgsql;

// Usage (call on page load)
useEffect(() => {
  incrementListingView(listingId);
}, [listingId]);
```

### Task 7: Commission Delegation to Store

```typescript
// Set commission delegation when creating/updating listing
const handleDelegateCommission = async (
  listingId: string,
  storeProfileId: string
) => {
  const supabase = createClient();

  const { error } = await supabase
    .from('listings')
    .update({
      delegate_commission_to_profile_id: storeProfileId
    })
    .eq('id', listingId);

  if (error) throw error;

  console.log(`Commission delegated to store: ${storeProfileId}`);
};

// When booking is created, commission goes to delegated store
// This is handled in process_booking_payment() RPC function
```

### Task 8: Display Listing with Snapshot Awareness

```typescript
// Listing detail page
export default async function ListingPage({
  params
}: {
  params: { id: string; slug?: string[] }
}) {
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from('listings')
    .select('*, tutor:profiles!profile_id(*)')
    .eq('id', params.id)
    .single();

  if (!listing) {
    return <NotFound />;
  }

  // When user books, these fields are copied to bookings table
  const snapshotFields = {
    listing_id: listing.id,
    listing_slug: listing.slug,
    service_name: listing.title,
    subjects: listing.subjects,
    levels: listing.levels,
    location_type: listing.location_type,
    hourly_rate: listing.hourly_rate
  };

  return (
    <div>
      <ListingHeroSection listing={listing} />
      <ListingDetailsCard listing={listing} />
      <ActionCard
        listingId={listing.id}
        snapshotData={snapshotFields}  // Pass to booking creation
      />
    </div>
  );
}
```

---

## API Reference

### GET /api/listings

Fetch all published listings (or user's own).

**Query Parameters**:
- `status` - Filter by status (draft, published, unpublished)
- `subjects` - Comma-separated list
- `levels` - Comma-separated list

**Response**:
```typescript
{
  listings: Listing[];
}
```

### POST /api/listings

Create a new listing.

**Request Body**:
```typescript
{
  title: string;
  description: string;
  subjects: string[];
  levels: string[];
  hourly_rate: number;
  location_type: 'online' | 'in_person' | 'hybrid';
  status?: 'draft' | 'published';
}
```

**Response**:
```typescript
{
  listing: Listing;
}
```

### GET /api/listings/[id]

Fetch single listing by ID.

**Response**:
```typescript
{
  listing: Listing & {
    tutor: Profile;
  };
}
```

### PATCH /api/listings/[id]

Update listing.

**Request Body**:
```typescript
{
  // Any listing fields to update
}
```

### POST /api/listings/[id]/publish

Publish a draft listing.

**Response**:
```typescript
{
  success: boolean;
}
```

### GET /api/listings/search

Search listings with filters.

**Query Parameters**:
- `q` - Search query (full-text)
- `subjects` - Comma-separated
- `levels` - Comma-separated
- `location_type` - online/in_person/hybrid
- `min_rate` - Minimum hourly rate
- `max_rate` - Maximum hourly rate

**Response**:
```typescript
{
  listings: Listing[];
}
```

---

## Database Schema

### listings table

```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Core fields
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished', 'archived')),

  -- Teaching details
  subjects TEXT[] NOT NULL DEFAULT '{}',
  levels TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{}',

  -- Pricing
  hourly_rate DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'GBP',

  -- Location
  location_type VARCHAR(20) CHECK (location_type IN ('online', 'in_person', 'hybrid')),
  location_city VARCHAR(100),

  -- Commission delegation (v4.3)
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_listings_profile_id ON listings(profile_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_subjects ON listings USING GIN(subjects);
CREATE INDEX idx_listings_levels ON listings USING GIN(levels);
CREATE INDEX idx_listings_published_at ON listings(published_at DESC) WHERE status = 'published';

-- Full-text search
CREATE INDEX idx_listings_search ON listings USING GIN(
  to_tsvector('english', title || ' ' || description)
);
```

### Slug Auto-Generation

```sql
-- Function to generate slug
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

-- Trigger
CREATE TRIGGER listings_generate_slug
  BEFORE INSERT ON listings
  FOR EACH ROW
  EXECUTE FUNCTION generate_listing_slug();
```

---

## State Management

### React Query Setup

```typescript
// apps/web/src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: true,
    },
  },
});
```

### Query Keys Structure

```typescript
// Listings queries
['listings'] // All listings
['listings', { status: 'published' }] // Filtered
['listings', listingId] // Single listing
['listings', 'search', filters] // Search results
['saved-listings', userId] // Saved listings
```

### Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: publishListing,
  onMutate: async (listingId) => {
    await queryClient.cancelQueries({ queryKey: ['listings'] });
    const previous = queryClient.getQueryData(['listings']);

    queryClient.setQueryData(['listings'], (old: Listing[]) =>
      old.map(l =>
        l.id === listingId
          ? { ...l, status: 'published', published_at: new Date() }
          : l
      )
    );

    return { previous };
  },
  onError: (err, vars, context) => {
    queryClient.setQueryData(['listings'], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['listings'] });
  },
});
```

---

## Testing

### Component Testing

```typescript
// __tests__/ListingCard.test.tsx

import { render, screen } from '@testing-library/react';
import { ListingCard } from '../ListingCard';

describe('ListingCard', () => {
  const mockListing = {
    id: '123',
    title: 'GCSE Maths Tutoring',
    subjects: ['Mathematics'],
    levels: ['GCSE'],
    hourly_rate: 35.00,
    status: 'published',
    view_count: 127
  };

  it('renders listing details', () => {
    render(<ListingCard listing={mockListing} />);

    expect(screen.getByText('GCSE Maths Tutoring')).toBeInTheDocument();
    expect(screen.getByText('£35.00')).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
  });
});
```

### API Testing

```typescript
// __tests__/api/listings.test.ts

describe('POST /api/listings', () => {
  it('creates a listing', async () => {
    const response = await fetch('/api/listings', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Listing',
        description: 'Test description...',
        subjects: ['Mathematics'],
        levels: ['GCSE'],
        hourly_rate: 30.00,
        location_type: 'online'
      })
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.listing).toBeDefined();
    expect(data.listing.slug).toBeDefined(); // Auto-generated
  });
});
```

---

## Troubleshooting

### Issue: Listing not appearing in search

**Solution**: Check status and published_at

```sql
SELECT status, published_at FROM listings WHERE id = :listing_id;
```

Ensure `status = 'published'` and `published_at IS NOT NULL`.

### Issue: Slug collision

**Solution**: Slug auto-generation includes UUID prefix to prevent collisions. If manual slug provided, check uniqueness:

```sql
SELECT COUNT(*) FROM listings WHERE slug = :slug;
```

### Issue: Snapshot fields NULL in booking

**Solution**: Verify booking creation copies snapshot fields:

```typescript
// When creating booking
const booking = await supabase.from('bookings').insert({
  listing_id: listing.id,
  listing_slug: listing.slug,  // ← Snapshot
  service_name: listing.title,  // ← Snapshot
  subjects: listing.subjects,   // ← Snapshot
  // ...
});
```

---

**Last Updated**: 2025-12-12
**Version**: v5.8
**Maintainer**: Backend Team
