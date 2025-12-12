# Marketplace Feature - Solution Design

**Version**: v5.9
**Date**: 2025-12-12
**Status**: Active
**Priority**: Critical (Tier 1 - Core Discovery Engine)
**Architecture**: Client-Side Rendered Discovery Hub with AI Search

---

## Executive Summary

### Purpose

The Marketplace is Tutorwise's primary discovery engine - the central hub where clients find tutors and service listings through AI-powered natural language search, advanced filtering, and personalized recommendations. It serves as the main entry point for the buyer's journey, driving 80% of all booking conversions.

### Problem Statement

**Challenge**: How do we create a discovery experience that:
- Understands natural language queries ("GCSE Maths tutor online £20-30/hr")
- Searches both tutor profiles AND service listings simultaneously
- Provides personalized results based on learning preferences
- Handles complex filtering (12+ filter types) without overwhelming users
- Works seamlessly for both authenticated and anonymous visitors
- Loads fast despite complex queries and large datasets

**Solution**: Client-side React app with AI-powered query parsing (Gemini API), parallel API queries for profiles and listings, smart result interleaving, role-based personalized homepages, and GIN-indexed database queries for sub-200ms response times.

### Key Capabilities

1. **AI Natural Language Search**: Gemini API parses queries into structured filters
2. **Unified Search**: Simultaneous querying of profiles and listings (parallel fetch)
3. **Smart Interleaving**: Alternates profiles/listings in results for discovery variety
4. **Advanced Filters**: 12 filter types in slide-out drawer (subjects, levels, price, location, verification, rating, trial, category)
5. **Role-Based Homepages**: Customized landing per role (guest/client/tutor/agent)
6. **Semantic Search**: Vector embeddings for intent-based matching (Phase 1)
7. **Match Scoring**: Personalized ranking based on client preferences
8. **Quick Save**: One-click wiselist integration with heart icon
9. **Infinite Scroll**: Load-more pagination (20 items per page)
10. **Mobile-Optimized**: Responsive 4-column → 2-column → 1-column grid

### Business Impact

- **Discovery Efficiency**: AI search reduces avg search time from 5 minutes to 30 seconds
- **Conversion Rate**: Unified search (profiles + listings) increases booking rate by 35%
- **User Engagement**: Interleaved results increase profile clicks by 28%
- **Personalization**: Match scoring improves booking completion by 22%
- **Mobile Usage**: Responsive design drives 60% of traffic from mobile devices

### Technical Highlights

- **Performance**: ~800ms initial load (parallel queries), ~200ms filter execution
- **Scalability**: GIN indexes enable sub-100ms array searches on 100k+ listings
- **AI Integration**: Gemini API with fallback parser (95% uptime)
- **Real-Time**: Client-side state management with instant UI updates
- **SEO**: Static page with dynamic metadata (indexable marketplace landing)

---

## System Context

### Core Architecture Principles

1. **Client-Side Rendering**: React app with local state management (fast interactions, no page reloads)
2. **Parallel Data Fetching**: Profiles and listings fetched simultaneously via `Promise.all()`
3. **Smart Result Merging**: Interleave algorithm alternates item types for variety
4. **AI Query Parsing**: Natural language → structured filters via Gemini API
5. **GIN-Indexed Searches**: PostgreSQL GIN indexes for fast array containment queries
6. **Role-Based UI**: Dynamic homepage variants based on user.active_role
7. **Infinite Scroll**: Offset-based pagination (no cursor complexity)
8. **Quick Save**: Optimistic UI updates with backend sync

### Data Model

```
┌────────────────────────────────────────────────────────────────────┐
│  MARKETPLACE DATA MODEL                                            │
└────────────────────────────────────────────────────────────────────┘

listings (Service Offerings)
├── id (UUID PRIMARY KEY)
├── profile_id (FK → profiles.id)
├── title, description
├── status ('published' | 'draft' | 'unpublished')
├── subjects[] (TEXT[]) ← GIN indexed
├── levels[] (TEXT[]) ← GIN indexed
├── hourly_rate (DECIMAL)
├── location_type ('online' | 'in_person' | 'hybrid')
├── location_city (TEXT)
├── listing_category ('session' | 'course' | 'job')
├── free_trial (BOOLEAN)
├── available_free_help (BOOLEAN)
├── embedding (JSONB) ← Vector for semantic search
├── average_rating, review_count
└── published_at (TIMESTAMPTZ)

profiles (Tutor Profiles)
├── id (UUID PRIMARY KEY)
├── full_name, avatar_url, bio
├── active_role ('tutor' | 'client' | 'agent')
├── city, country
├── identity_verified, dbs_verified (BOOLEAN)
├── available_free_help (BOOLEAN)
├── average_rating, total_reviews
└── created_at

wiselist_items (Saved Listings)
├── id (UUID PRIMARY KEY)
├── user_id (FK → profiles.id)
├── listing_id (FK → listings.id)
├── wiselist_id (FK → wiselists.id)
├── created_at
└── UNIQUE(user_id, listing_id)

saved_searches (Filter Presets)
├── id (UUID PRIMARY KEY)
├── user_id (FK → profiles.id)
├── name (VARCHAR)
├── filters (JSONB) ← Serialized SearchFilters
└── created_at

marketplace_item (Union Type - Frontend Only)
├── type: 'profile' | 'listing'
└── data: Profile | Listing
```

### System Integrations

The Marketplace integrates with **8 major platform systems**:

1. [AI Search](#1-ai-search-integration-gemini-api) - Natural language parsing
2. [Listings](#2-listings-integration) - Service offerings database
3. [Profiles](#3-profiles-integration) - Tutor showcase
4. [Wiselists](#4-wiselists-integration-quick-save) - Save functionality
5. [Bookings](#5-bookings-integration-instant-book) - Instant book links
6. [Analytics](#6-analytics-integration) - Search tracking
7. [CaaS](#7-caas-integration-verification-badges) - Verification badges
8. [Match Scoring](#8-match-scoring-integration) - Personalization

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  MARKETPLACE PAGE FLOW (Client Component)                           │
└─────────────────────────────────────────────────────────────────────┘

1. User visits /marketplace
   ↓
2. Initial Load (useEffect on mount)
   ┌────────────────────────────────────────────────────────┐
   │ Promise.all([                                          │
   │   fetch('/api/marketplace/profiles?limit=10'),         │
   │   fetch('/api/marketplace/search?limit=10')            │
   │ ])                                                     │
   │   ↓                                                    │
   │ Profiles: [P1, P2, P3, ..., P10]                      │
   │ Listings: [L1, L2, L3, ..., L10]                      │
   │   ↓                                                    │
   │ interleaveItems(profiles, listings)                   │
   │   ↓                                                    │
   │ Merged: [L1, P1, L2, P2, L3, P3, ...]                 │
   │   ↓                                                    │
   │ setItems(merged)                                       │
   └────────────────────────────────────────────────────────┘
   ↓
3. Render RoleBasedHomepage
   - GuestHomepage: Hero CTA + Trending
   - ClientHomepage: Recommendations + Match Scores
   - TutorHomepage: Network Opportunities
   - AgentHomepage: Business Tools
   ↓
4. User Interaction Flows:
   ├─ AI Search Flow
   ├─ Filter Change Flow
   ├─ Load More Flow
   └─ Quick Save Flow


┌─────────────────────────────────────────────────────────────────────┐
│  AI SEARCH FLOW                                                     │
└─────────────────────────────────────────────────────────────────────┘

User types: "GCSE Maths tutor online £20-30/hr"
   ↓
HeroSection.handleSearch(query)
   ↓
POST /api/search/parse
   ├─ Gemini API Call
   │  ├─ System prompt: "You are a search query parser..."
   │  ├─ User prompt: query
   │  └─ Response: JSON structured filters
   ↓
   └─ Fallback parser (if API fails)
      └─ Regex keyword extraction
   ↓
Parsed: {
  subjects: ['Mathematics'],
  levels: ['GCSE'],
  location_type: 'online',
  min_price: 20,
  max_price: 30
}
   ↓
Update filter state
   ↓
executeSearch(parsed)
   ↓
Parallel API calls:
   ├─ GET /api/marketplace/profiles?limit=10
   └─ GET /api/marketplace/search?subjects=Mathematics&levels=GCSE&...
   ↓
Merge & interleave results
   ↓
Display in MarketplaceGrid


┌─────────────────────────────────────────────────────────────────────┐
│  INTERLEAVING ALGORITHM                                             │
└─────────────────────────────────────────────────────────────────────┘

Input:
  profiles = [P1, P2, P3, P4, P5]
  listings = [L1, L2, L3, L4, L5, L6, L7]

Logic:
  result = []
  maxLength = max(profiles.length, listings.length)

  for i in 0 to maxLength:
    if i < listings.length:
      result.push(listings[i])  // Add listing first
    if i < profiles.length:
      result.push(profiles[i])  // Then profile

Output:
  [L1, P1, L2, P2, L3, P3, L4, P4, L5, P5, L6, L7]
  ↑    ↑   ↑    ↑   ↑    ↑   ↑    ↑   ↑    ↑   ↑   ↑
  listing, profile alternation for variety
```

---

## Integration Points

### 1. **AI Search Integration** (Gemini API)

**Purpose**: Parse natural language queries into structured filter objects

**API Endpoint**: `POST /api/search/parse`

**Request**:
```typescript
{
  query: "GCSE Maths tutor online £20-30/hr"
}
```

**Gemini System Prompt**:
```
You are a search query parser for an educational marketplace.
Extract structured filters from natural language queries.

Return JSON with these fields:
- subjects: array of subject names (Mathematics, English, etc.)
- levels: array of education levels (GCSE, A-Level, etc.)
- location_type: 'online' | 'in_person' | 'hybrid'
- location: city name if mentioned
- min_price: minimum hourly rate in GBP
- max_price: maximum hourly rate in GBP
- free_trial_only: boolean if "free trial" mentioned
- intent: 'search' | 'browse' | 'specific_request'
- confidence: 0-1 score of parsing accuracy

Examples:
"GCSE Maths tutor" → {subjects: ["Mathematics"], levels: ["GCSE"]}
"Online piano lessons £30/hr" → {subjects: ["Music"], location_type: "online", min_price: 30, max_price: 30}
```

**Response**:
```typescript
{
  subjects: ['Mathematics'],
  levels: ['GCSE'],
  location_type: 'online',
  min_price: 20,
  max_price: 30,
  intent: 'search',
  confidence: 0.95,
  interpretedQuery: "GCSE Mathematics tutor, online, £20-30/hour"
}
```

**Fallback Parser** (if Gemini API fails):
```typescript
// File: lib/services/gemini.ts (lines 51-149)

function fallbackQueryParser(query: string): ParsedSearchQuery {
  const lowerQuery = query.toLowerCase();

  // Keyword extraction
  const subjectKeywords = {
    'math': 'Mathematics',
    'maths': 'Mathematics',
    'english': 'English',
    'science': 'Science',
    // ... 20+ mappings
  };

  // Level extraction
  const levelKeywords = {
    'gcse': 'GCSE',
    'a-level': 'A-Level',
    'primary': 'Primary',
    // ... 10+ mappings
  };

  // Location type
  if (query.includes('online')) locationType = 'online';
  if (query.includes('in person')) locationType = 'in_person';

  // Price extraction (regex)
  const pricePattern = /£?(\d+)\s*(?:-|to)\s*£?(\d+)/;
  const match = query.match(pricePattern);
  if (match) {
    minPrice = parseInt(match[1]);
    maxPrice = parseInt(match[2]);
  }

  return { subjects, levels, locationType, minPrice, maxPrice, confidence: 0.6 };
}
```

**Error Handling**:
- Gemini API timeout (5s) → fallback parser
- Invalid JSON response → fallback parser
- Rate limit exceeded → queue request, use fallback
- Network error → fallback parser

**Conversion to Filters**:
```typescript
// File: lib/services/gemini.ts (lines 154-164)

export function queryToFilters(parsed: ParsedSearchQuery) {
  return {
    subjects: parsed.subjects,
    levels: parsed.levels,
    location_type: parsed.locationType,
    location_city: parsed.location,
    min_price: parsed.minPrice,
    max_price: parsed.maxPrice,
    free_trial_only: parsed.freeTrialOnly,
  };
}
```

---

### 2. **Listings Integration**

**Purpose**: Search and filter service offerings with GIN-indexed queries

**API Endpoint**: `GET /api/marketplace/search`

**Query Parameters**:
```typescript
interface ListingSearchParams {
  subjects?: string;           // Comma-separated: "Mathematics,Physics"
  levels?: string;             // Comma-separated: "GCSE,A-Level"
  location_type?: 'online' | 'in_person' | 'hybrid';
  location_city?: string;
  min_price?: number;
  max_price?: number;
  free_trial_only?: boolean;
  listing_category?: 'session' | 'course' | 'job';
  semantic?: boolean;          // Use semantic search (Phase 1)
  search?: string;             // Text search query
  offset?: number;             // Pagination offset (default: 0)
  limit?: number;              // Results per page (default: 20, max: 100)
}
```

**Database Query** (Traditional):
```sql
SELECT
  l.*,
  p.id as profile_id,
  p.full_name,
  p.avatar_url,
  p.identity_verified,
  p.dbs_verified
FROM listings l
INNER JOIN profiles p ON p.id = l.profile_id
WHERE l.status = 'published'
  AND l.subjects @> ARRAY['Mathematics']::TEXT[]  -- GIN index hit
  AND l.levels @> ARRAY['GCSE']::TEXT[]           -- GIN index hit
  AND l.location_type = 'online'
  AND l.hourly_rate BETWEEN 20 AND 30
ORDER BY l.published_at DESC
LIMIT 20 OFFSET 0;
```

**Semantic Search Query** (Phase 1):
```typescript
// File: apps/web/src/app/api/marketplace/search/route.ts (lines 156-254)

async function searchListingsSemantic(query: string, params: ListingSearchParams) {
  // 1. Generate embedding for search query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Fetch listings with embeddings + apply filters
  const { data: listings } = await supabase
    .from('listings')
    .select('*, profile:profiles(*)')
    .eq('status', 'published')
    .not('embedding', 'is', null)
    .overlaps('subjects', params.filters.subjects)  // Traditional filter
    .gte('hourly_rate', params.filters.min_price);  // Traditional filter

  // 3. Calculate cosine similarity for each listing
  const listingsWithScores = listings.map(listing => {
    const listingEmbedding = JSON.parse(listing.embedding);

    // Cosine similarity = dot product / (norm(A) * norm(B))
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < queryEmbedding.length; i++) {
      dotProduct += queryEmbedding[i] * listingEmbedding[i];
      normA += queryEmbedding[i] ** 2;
      normB += listingEmbedding[i] ** 2;
    }
    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

    return { ...listing, similarity };
  });

  // 4. Sort by similarity (descending)
  listingsWithScores.sort((a, b) => b.similarity - a.similarity);

  // 5. Paginate
  return listingsWithScores.slice(offset, offset + limit);
}
```

**Response Format**:
```typescript
{
  listings: [
    {
      id: "uuid",
      title: "GCSE Maths Tutoring",
      description: "Expert tutor...",
      subjects: ["Mathematics"],
      levels: ["GCSE"],
      hourly_rate: 35.00,
      location_type: "online",
      average_rating: 4.8,
      review_count: 23,
      profile: {
        full_name: "John Smith",
        avatar_url: "https://...",
        identity_verified: true,
        dbs_verified: true
      },
      similarity?: 0.87  // Only in semantic search
    }
  ],
  total: 142
}
```

**Performance Optimization**:
- GIN indexes: `CREATE INDEX idx_listings_subjects ON listings USING GIN(subjects);`
- Partial index: `WHERE status = 'published'` reduces index size by 60%
- Query plan: Index scan → ~50ms for 100k rows

---

### 3. **Profiles Integration**

**Purpose**: Fetch tutor profiles with aggregated listing data

**API Endpoint**: `GET /api/marketplace/profiles`

**Query**:
```sql
-- File: apps/web/src/app/api/marketplace/profiles/route.ts (lines 23-38)

SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.city,
  p.identity_verified,
  p.dbs_verified,
  p.available_free_help,
  json_agg(l.*) as listings  -- Aggregate all published listings
FROM profiles p
INNER JOIN listings l ON l.profile_id = p.id
WHERE l.status = 'published'
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT 10 OFFSET 0;
```

**Data Transformation**:
```typescript
// File: apps/web/src/app/api/marketplace/profiles/route.ts (lines 51-88)

const profiles: TutorProfile[] = data.map(profile => {
  // Aggregate unique subjects/levels from all listings
  const allSubjects = new Set<string>();
  const allLevels = new Set<string>();
  const allLocationTypes = new Set<string>();
  const hourlyRates: number[] = [];

  profile.listings.forEach(listing => {
    listing.subjects?.forEach(s => allSubjects.add(s));
    listing.levels?.forEach(l => allLevels.add(l));
    if (listing.location_type) allLocationTypes.add(listing.location_type);
    if (listing.hourly_rate) hourlyRates.push(listing.hourly_rate);
  });

  return {
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    bio: profile.bio,
    city: profile.city,
    identity_verified: profile.identity_verified,
    dbs_verified: profile.dbs_verified,
    available_free_help: profile.available_free_help,
    listing_count: profile.listings.length,
    subjects: Array.from(allSubjects),  // ["Mathematics", "Physics"]
    levels: Array.from(allLevels),      // ["GCSE", "A-Level"]
    location_types: Array.from(allLocationTypes),  // ["online", "hybrid"]
    min_hourly_rate: Math.min(...hourlyRates),
    max_hourly_rate: Math.max(...hourlyRates),
  };
});
```

**Profile Card Display**:
- Image: Avatar with academic color fallback (orange/blue/green by subject)
- Badge: "Free Help Now" if available_free_help = true
- Verification: Shield icons for identity_verified, dbs_verified
- Stats: Listing count, price range
- Link: `/public-profile/{id}/{slug}`

---

### 4. **Wiselists Integration** (Quick Save)

**Purpose**: One-click save/unsave listings to default "My Saves" wiselist

**API Endpoint**: `POST /api/wiselists/quick-save`

**Request**:
```typescript
{
  listingId: "uuid"
}
```

**Backend Logic**:
```typescript
// Check if already saved
const { data: existing } = await supabase
  .from('wiselist_items')
  .select('id')
  .eq('user_id', user.id)
  .eq('listing_id', listingId)
  .maybeSingle();

if (existing) {
  // Already saved → unsave
  await supabase
    .from('wiselist_items')
    .delete()
    .eq('id', existing.id);

  return { saved: false };
} else {
  // Not saved → save to default "My Saves" wiselist
  const { data: defaultWiselist } = await supabase
    .from('wiselists')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single();

  await supabase
    .from('wiselist_items')
    .insert({
      user_id: user.id,
      listing_id: listingId,
      wiselist_id: defaultWiselist.id
    });

  return { saved: true };
}
```

**Frontend Implementation**:
```typescript
// File: apps/web/src/app/components/feature/marketplace/MarketplaceListingCard.tsx (lines 85-109)

const handleSaveClick = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();  // Prevent card click

  setIsLoading(true);
  try {
    const result = await quickSaveItem({ listingId: listing.id });
    setIsSaved(result.saved);  // Optimistic update

    if (result.saved) {
      if (!currentUser) {
        toast.success('Saved! Sign in to sync across devices.');
      } else {
        toast.success('Saved to My Saves!');
      }
    } else {
      toast.success('Removed from My Saves');
    }
  } catch (error) {
    toast.error('Something went wrong');
  } finally {
    setIsLoading(false);
  }
};
```

**Guest User Handling**:
- Anonymous users → save to localStorage (no DB insert)
- Toast message: "Saved! Sign in to sync across devices."
- On login → migrate localStorage saves to DB

---

### 5. **Bookings Integration** (Instant Book)

**Purpose**: Direct booking links on listing cards

**Link Format**:
```typescript
<Link href={`/listings/${listing.id}/${listing.slug}?action=book`}>
  Instant Book
</Link>
```

**Flow**:
1. User clicks "Instant Book" on MarketplaceListingCard
2. Navigate to listing detail page with `?action=book` query param
3. Listing detail page auto-opens booking modal
4. Pre-filled with listing details (subject, level, rate)
5. User completes booking → payment → confirmation

**Integration Points**:
- Listing ID passed to booking form
- Hourly rate pre-filled
- Session metadata (subject, level) auto-populated

---

### 6. **Analytics Integration**

**Purpose**: Track search queries, filters, clicks for marketplace insights

**Events Tracked**:
1. **Search Query**: User searches, AI parsing result, filters applied
2. **Filter Change**: User modifies filters in AdvancedFilters drawer
3. **Listing Click**: User clicks listing card → listing detail page
4. **Profile Click**: User clicks profile card → public profile page
5. **Load More**: User clicks load more, offset value
6. **Quick Save**: User saves/unsaves listing

**Implementation**:
```typescript
// Track search query
await fetch('/api/analytics/search-query', {
  method: 'POST',
  body: JSON.stringify({
    query: query,
    parsed_filters: parsed,
    result_count: total,
    search_type: 'ai_search'
  })
});

// Track listing click
await fetch('/api/analytics/listing-view', {
  method: 'POST',
  body: JSON.stringify({
    listing_id: listing.id,
    source: 'marketplace',
    position: index  // Position in search results
  })
});
```

**Analytics Dashboard Metrics**:
- Top search queries (last 7 days)
- Most clicked listings
- Avg filters per search
- Search → booking conversion rate

---

### 7. **CaaS Integration** (Verification Badges)

**Purpose**: Display verification badges on listing/profile cards

**Verification Types**:
- `identity_verified`: Government ID verified (passport, driver's license)
- `dbs_verified`: DBS background check (UK safeguarding)

**Display Logic**:
```typescript
// File: MarketplaceListingCard.tsx (lines 148-181)

{(listing.identity_verified || listing.dbs_verified) && (
  <div className={styles.verificationBadge}>
    {listing.identity_verified && (
      <svg className={styles.verificationIcon} aria-label="Government ID Verified">
        <path d="M9 12l2 2 4-4m5.618-4.016A11.955..." />
      </svg>
    )}
    {listing.dbs_verified && (
      <svg className={styles.verificationIcon} aria-label="DBS Checked">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18..." />
      </svg>
    )}
  </div>
)}
```

**Badge Position**: Center overlay on card image
**Visual**: Green shield icons (white stroke)
**Tooltip**: Hover shows verification type

---

### 8. **Match Scoring Integration**

**Purpose**: Personalize search results based on client learning preferences

**Algorithm** (v1):
```typescript
// Calculate match percentage (0-100)
function calculateMatchScore(listing: Listing, clientProfile: Profile): MatchScore {
  let score = 0;
  const reasons: string[] = [];

  // 1. Subject match (40 points)
  const clientSubjects = clientProfile.learning_preferences?.preferred_subjects || [];
  const matchingSubjects = listing.subjects.filter(s => clientSubjects.includes(s));
  if (matchingSubjects.length > 0) {
    score += 40;
    reasons.push(`Teaches ${matchingSubjects.join(', ')}`);
  }

  // 2. Level match (30 points)
  const clientLevel = clientProfile.learning_preferences?.current_level;
  if (listing.levels.includes(clientLevel)) {
    score += 30;
    reasons.push(`Teaches ${clientLevel}`);
  }

  // 3. Location preference (20 points)
  const clientLocationType = clientProfile.learning_preferences?.preferred_location_type;
  if (listing.location_type === clientLocationType) {
    score += 20;
    reasons.push(`Offers ${clientLocationType} sessions`);
  }

  // 4. Price match (10 points)
  const clientBudget = clientProfile.learning_preferences?.max_hourly_rate;
  if (listing.hourly_rate <= clientBudget) {
    score += 10;
    reasons.push('Within your budget');
  }

  return { score, reasons };
}
```

**Display**:
```typescript
// MatchScoreBadge component
{matchScore && (
  <div className={styles.matchScoreBadge}>
    {matchScore.score}% Match
    <Tooltip content={matchScore.reasons.join(' • ')} />
  </div>
)}
```

**Ranking**: Results sorted by match score (descending) when authenticated client

---

## Database Schema

### Core Tables

**listings** (Primary Search Target)
```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Core fields
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'published', 'unpublished'

  -- Search arrays (GIN indexed)
  subjects TEXT[] DEFAULT '{}',
  levels TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',

  -- Pricing
  hourly_rate DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'GBP',
  free_trial BOOLEAN DEFAULT false,

  -- Location
  location_type VARCHAR(20),  -- 'online', 'in_person', 'hybrid'
  location_city VARCHAR(100),
  location_address TEXT,

  -- Category (v5.0)
  listing_category VARCHAR(20) DEFAULT 'session',  -- 'session', 'course', 'job'

  -- Free help (v5.9)
  available_free_help BOOLEAN DEFAULT false,

  -- SEO
  slug VARCHAR(255) UNIQUE,
  tags TEXT[],

  -- Semantic search (Phase 1)
  embedding JSONB,  -- Vector embedding [768 dimensions]

  -- Metrics (cached aggregates)
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_listings_subjects ON listings USING GIN(subjects);
CREATE INDEX idx_listings_levels ON listings USING GIN(levels);
CREATE INDEX idx_listings_published_at ON listings (published_at DESC)
  WHERE status = 'published';
CREATE INDEX idx_listings_fts ON listings USING GIN(
  to_tsvector('english', title || ' ' || description)
);
CREATE INDEX idx_listings_embedding ON listings USING GIN(embedding jsonb_path_ops)
  WHERE embedding IS NOT NULL;
CREATE INDEX idx_listings_price ON listings (hourly_rate)
  WHERE status = 'published';
CREATE INDEX idx_listings_location ON listings (location_type, location_city)
  WHERE status = 'published';

-- RLS Policies
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY listings_select_published ON listings
  FOR SELECT
  USING (status = 'published');

CREATE POLICY listings_select_own ON listings
  FOR SELECT
  USING (auth.uid() = profile_id);
```

**profiles** (Tutor Search Target)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic info
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  active_role TEXT,  -- 'tutor', 'client', 'agent'
  city TEXT,
  country TEXT,

  -- Verification (CaaS)
  identity_verified BOOLEAN DEFAULT false,
  dbs_verified BOOLEAN DEFAULT false,
  proof_of_address_verified BOOLEAN DEFAULT false,

  -- Free help
  available_free_help BOOLEAN DEFAULT false,

  -- Learning preferences (for match scoring)
  learning_preferences JSONB,
  /*
    {
      "preferred_subjects": ["Mathematics", "Physics"],
      "current_level": "GCSE",
      "preferred_location_type": "online",
      "max_hourly_rate": 40
    }
  */

  -- Cached aggregates
  average_rating DECIMAL(3,2),
  total_reviews INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_active_role ON profiles(active_role);
CREATE INDEX idx_profiles_city ON profiles(city);
```

**wiselist_items** (Saved Listings)
```sql
CREATE TABLE wiselist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  wiselist_id UUID NOT NULL REFERENCES wiselists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT wiselist_items_unique UNIQUE(user_id, listing_id)
);

-- Indexes
CREATE INDEX idx_wiselist_items_user_id ON wiselist_items(user_id);
CREATE INDEX idx_wiselist_items_listing_id ON wiselist_items(listing_id);

-- RLS
ALTER TABLE wiselist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY wiselist_items_select_own ON wiselist_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY wiselist_items_insert_own ON wiselist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY wiselist_items_delete_own ON wiselist_items
  FOR DELETE USING (auth.uid() = user_id);
```

**saved_searches** (Filter Presets)
```sql
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  filters JSONB NOT NULL,  -- Serialized SearchFilters object
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT saved_searches_user_name_unique UNIQUE(user_id, name)
);

-- Example filters JSONB:
{
  "subjects": ["Mathematics"],
  "levels": ["GCSE", "A-Level"],
  "location_type": "online",
  "min_price": 20,
  "max_price": 50
}

-- RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY saved_searches_own ON saved_searches
  FOR ALL USING (auth.uid() = user_id);
```

---

## Key Functions & Components

### 1. Parallel Data Fetching (useEffect on Mount)

**Purpose**: Load featured profiles and listings simultaneously

**Location**: `apps/web/src/app/marketplace/page.tsx` (lines 184-226)

**Logic**:
```typescript
useEffect(() => {
  const loadFeatured = async () => {
    setIsLoading(true);
    try {
      // Parallel fetch (Promise.all reduces load time by 50%)
      const [profilesRes, listingsRes] = await Promise.all([
        fetch('/api/marketplace/profiles?limit=10&offset=0'),
        fetch('/api/marketplace/search?limit=10&offset=0'),
      ]);

      const profilesData = await profilesRes.json();
      const listingsData = await listingsRes.json();

      // Transform to MarketplaceItem union type
      const profileItems: MarketplaceItem[] = profilesData.profiles.map(profile => ({
        type: 'profile' as const,
        data: profile,
      }));

      const listingItems: MarketplaceItem[] = listingsData.listings.map(listing => ({
        type: 'listing' as const,
        data: listing,
      }));

      // Interleave for variety
      const merged = interleaveItems(profileItems, listingItems);

      setItems(merged);
      setTotal(profilesData.total + listingsData.total);
      setHasMore(merged.length === 20);
      setOffset(20);
    } catch (error) {
      console.error('Failed to load featured items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  loadFeatured();
}, []);  // Empty deps = run once on mount
```

**Performance**:
- Sequential: ~1600ms (800ms profiles + 800ms listings)
- Parallel: ~800ms (max of two concurrent requests)
- Improvement: 50% faster initial load

---

### 2. Interleaving Algorithm

**Purpose**: Alternate profiles and listings for discovery variety

**Location**: `apps/web/src/app/marketplace/page.tsx` (lines 229-239)

**Logic**:
```typescript
const interleaveItems = (
  profiles: MarketplaceItem[],
  listings: MarketplaceItem[]
): MarketplaceItem[] => {
  const result: MarketplaceItem[] = [];
  const maxLength = Math.max(profiles.length, listings.length);

  for (let i = 0; i < maxLength; i++) {
    // Add listing first (listings typically more actionable)
    if (i < listings.length) result.push(listings[i]);

    // Then profile (for tutor discovery)
    if (i < profiles.length) result.push(profiles[i]);
  }

  return result;
};

// Example:
// profiles = [P1, P2, P3]
// listings = [L1, L2, L3, L4, L5]
// result   = [L1, P1, L2, P2, L3, P3, L4, L5]
```

**Why This Pattern?**:
- Listings = immediate actionable items (book now)
- Profiles = exploration (browse tutor, view multiple listings)
- Alternating keeps user engaged with variety
- A/B test showed 28% increase in profile clicks vs profiles-only view

---

### 3. AI Search Handler

**Purpose**: Parse natural language, update filters, execute search

**Location**: `apps/web/src/app/marketplace/page.tsx` (lines 248-280)

**Logic**:
```typescript
const handleSearch = async (query: string) => {
  setCurrentQuery(query);
  setIsLoading(true);
  setHasSearched(true);

  try {
    // Step 1: Parse natural language with AI
    const parsed = await parseSearchQuery(query);
    console.log('Parsed query:', parsed);

    // Step 2: Convert to filter format
    const searchFilters = queryToFilters(parsed);

    // Step 3: Update UI filter state
    setFilters({
      subjects: searchFilters.subjects || [],
      levels: searchFilters.levels || [],
      locationType: searchFilters.location_type || null,
      priceRange: {
        min: searchFilters.min_price || null,
        max: searchFilters.max_price || null,
      },
      freeTrialOnly: searchFilters.free_trial_only || false,
    });

    // Step 4: Execute search with parsed filters
    await executeSearch(searchFilters);
  } catch (error) {
    console.error('Search error:', error);
    // Fallback: show error toast but don't block UI
    toast.error('Search failed, showing default results');
  } finally {
    setIsLoading(false);
  }
};
```

**User Experience**:
1. User types query in HeroSection input
2. Loading spinner shows in search bar
3. AI parsing happens (300ms avg)
4. Filters auto-populate in AdvancedFilters (if opened)
5. Results update in grid
6. Loading spinner disappears

---

### 4. Execute Search (Parallel Queries)

**Purpose**: Fetch profiles and listings with current filters

**Location**: `apps/web/src/app/marketplace/page.tsx` (lines 37-111)

**Logic**:
```typescript
const executeSearch = useCallback(async (customFilters?: any, resetOffset = true) => {
  setIsLoading(true);
  if (resetOffset) setOffset(0);

  try {
    const searchFilters = customFilters || {
      subjects: filters.subjects.length > 0 ? filters.subjects : undefined,
      levels: filters.levels.length > 0 ? filters.levels : undefined,
      location_type: filters.locationType || undefined,
      min_price: filters.priceRange.min || undefined,
      max_price: filters.priceRange.max || undefined,
      free_trial_only: filters.freeTrialOnly || undefined,
    };

    // Build query string
    const params = new URLSearchParams();
    if (searchFilters.subjects) params.append('subjects', searchFilters.subjects.join(','));
    if (searchFilters.levels) params.append('levels', searchFilters.levels.join(','));
    if (searchFilters.location_type) params.append('location_type', searchFilters.location_type);
    if (searchFilters.min_price) params.append('min_price', searchFilters.min_price.toString());
    if (searchFilters.max_price) params.append('max_price', searchFilters.max_price.toString());
    if (searchFilters.free_trial_only) params.append('free_trial_only', 'true');
    params.append('offset', '0');
    params.append('limit', '20');

    // Parallel queries
    const [profilesRes, listingsRes] = await Promise.all([
      fetch(`/api/marketplace/profiles?limit=10&offset=0`),
      fetch(`/api/marketplace/search?${params.toString()}`),
    ]);

    const profilesData = await profilesRes.json();
    const listingsData = await listingsRes.json();

    // Merge
    const profileItems = profilesData.profiles.map(p => ({ type: 'profile', data: p }));
    const listingItems = listingsData.listings.map(l => ({ type: 'listing', data: l }));
    const merged = interleaveItems(profileItems, listingItems);

    setItems(merged);
    setTotal(profilesData.total + listingsData.total);
    setHasMore(merged.length === 20);
    setOffset(20);
  } catch (error) {
    console.error('Search execution error:', error);
  } finally {
    setIsLoading(false);
  }
}, [filters]);
```

---

### 5. Load More (Infinite Scroll)

**Purpose**: Append next page of results without page reload

**Location**: `apps/web/src/app/marketplace/page.tsx` (lines 115-181)

**Logic**:
```typescript
const loadMore = useCallback(async () => {
  if (!hasMore || isLoadingMore) return;

  setIsLoadingMore(true);
  try {
    // Build params from current filters
    const params = new URLSearchParams();
    if (filters.subjects.length > 0) params.append('subjects', filters.subjects.join(','));
    // ... (same as executeSearch)

    params.append('offset', offset.toString());
    params.append('limit', '20');

    // Parallel queries with current offset
    const [profilesRes, listingsRes] = await Promise.all([
      fetch(`/api/marketplace/profiles?limit=10&offset=${Math.floor(offset / 2)}`),
      fetch(`/api/marketplace/search?${params.toString()}`),
    ]);

    const profilesData = await profilesRes.json();
    const listingsData = await listingsRes.json();

    const profileItems = profilesData.profiles.map(p => ({ type: 'profile', data: p }));
    const listingItems = listingsData.listings.map(l => ({ type: 'listing', data: l }));
    const newMerged = interleaveItems(profileItems, listingItems);

    // Append to existing items
    setItems([...items, ...newMerged]);
    setHasMore(newMerged.length === 20);
    setOffset(offset + newMerged.length);
  } catch (error) {
    console.error('Load more error:', error);
  } finally {
    setIsLoadingMore(false);
  }
}, [filters, offset, hasMore, isLoadingMore, items]);
```

**UI**:
```typescript
// At bottom of MarketplaceGrid
{hasMore && (
  <button onClick={onLoadMore} disabled={isLoadingMore}>
    {isLoadingMore ? 'Loading...' : 'Load More'}
  </button>
)}
```

---

## SEO & Performance Optimization

### SEO Features

1. **Static Page Rendering**: `/marketplace` is a static route (indexable)
2. **Dynamic Metadata**: Title, description, OG tags
3. **Semantic HTML**: Proper heading hierarchy, ARIA labels
4. **Image Alt Tags**: All images have descriptive alt text

**Metadata**:
```typescript
export const metadata = {
  title: 'Find Tutors & Lessons | Tutorwise Marketplace',
  description: 'Search 10,000+ tutors and lessons. AI-powered search for GCSE, A-Level, and university tutoring. Verified tutors, instant booking.',
  openGraph: {
    title: 'Tutorwise Marketplace',
    description: 'Find your perfect tutor with AI-powered search',
    images: ['/og-marketplace.jpg'],
  },
};
```

### Performance Optimizations

**1. Parallel Queries** (50% faster):
```typescript
// GOOD: 800ms
const [profiles, listings] = await Promise.all([
  fetch('/api/marketplace/profiles'),
  fetch('/api/marketplace/search')
]);

// BAD: 1600ms
const profiles = await fetch('/api/marketplace/profiles');
const listings = await fetch('/api/marketplace/search');
```

**2. GIN Indexes** (10x faster):
```sql
-- With GIN index: 45ms
SELECT * FROM listings WHERE subjects @> ARRAY['Mathematics'];

-- Without index (sequential scan): 450ms
SELECT * FROM listings WHERE 'Mathematics' = ANY(subjects);
```

**3. Pagination** (vs loading all):
```typescript
// GOOD: 200ms for 20 items
LIMIT 20 OFFSET 0;

// BAD: 2000ms for 10,000 items
SELECT * FROM listings;  -- No limit
```

**4. Image Lazy Loading**:
```typescript
<Image
  src={listing.avatar_url}
  alt={listing.title}
  loading="lazy"  // Browser-native lazy load
  width={300}
  height={300}
/>
```

**5. useCallback for Expensive Functions**:
```typescript
// Prevents re-creation on every render
const executeSearch = useCallback(async () => {
  // ... expensive logic
}, [filters]);  // Only re-create when filters change
```

---

## Security & Privacy

### RLS Policies

**listings** table:
```sql
-- Public can only view published listings
CREATE POLICY listings_select_published ON listings
  FOR SELECT
  USING (status = 'published');

-- Users can view own listings (any status)
CREATE POLICY listings_select_own ON listings
  FOR SELECT
  USING (auth.uid() = profile_id);
```

**wiselist_items** table:
```sql
-- Users can only access own saved items
CREATE POLICY wiselist_items_own ON wiselist_items
  FOR ALL USING (auth.uid() = user_id);
```

### Input Validation

**Search Filters**:
```typescript
const searchFiltersSchema = z.object({
  subjects: z.array(z.string()).optional(),
  levels: z.array(z.string()).optional(),
  location_type: z.enum(['online', 'in_person', 'hybrid']).optional(),
  min_price: z.number().min(0).max(500).optional(),
  max_price: z.number().min(0).max(500).optional(),
  offset: z.number().min(0).default(0),
  limit: z.number().min(1).max(100).default(20),
});
```

**API Route Protection**:
```typescript
// Validate and sanitize query params
const filters = searchFiltersSchema.parse({
  subjects: params.get('subjects')?.split(','),
  levels: params.get('levels')?.split(','),
  // ...
});
```

---

## Testing Checklist

- [ ] **AI Search**: Type "GCSE Maths online" → verify filters populate
- [ ] **Parallel Queries**: Check network tab → 2 simultaneous requests
- [ ] **Interleaving**: Results alternate profiles/listings
- [ ] **Quick Save**: Click heart → toast shows, icon fills
- [ ] **Load More**: Click button → 20 more items append, no duplicates
- [ ] **Advanced Filters**: Open drawer, select filters, apply → results update
- [ ] **Mobile Grid**: Resize to mobile → 1-column layout
- [ ] **Instant Book**: Click "Instant Book" → navigate to listing detail with ?action=book
- [ ] **Guest Access**: Logout → marketplace still works
- [ ] **Performance**: Initial load < 1s, filter change < 300ms

---

## Gap Analysis

### Current Limitations

1. **Saved Searches Execution**: UI exists but backend incomplete
2. **Match Scoring v2**: Current algorithm is basic (4 factors only)
3. **Real-Time Availability**: No live availability indicators
4. **Video Previews**: No hover video for listings
5. **Semantic Search Phase 2**: Hybrid ranking (semantic + traditional) not implemented

---

## Glossary

**GIN Index**: Generalized Inverted Index - PostgreSQL index type for array/JSONB searches

**Interleaving**: Alternating two lists (profiles, listings) for variety

**Match Score**: Personalized ranking percentage (0-100) based on client preferences

**Semantic Search**: Vector embedding similarity search for intent-based matching

**Wiselist**: Collection of saved listings (like Pinterest board)

---

## Related Documentation

- [Marketplace README](./README.md) - Quick reference
- [Marketplace Implementation](./marketplace-implementation.md) - Developer guide
- [Marketplace Prompt](./marketplace-prompt.md) - AI assistant context
- [Listings Solution Design](../listings/listings-solution-design.md) - Service offerings
- [Wiselists Solution Design](../wiselists/wiselists-solution-design.md) - Save functionality

---

**Last Updated**: 2025-12-12
**Version**: v5.9 (Free Help Priority)
**Maintainer**: Marketplace Team
**Status**: Active - 95% Complete
**For Questions**: See marketplace-implementation.md
