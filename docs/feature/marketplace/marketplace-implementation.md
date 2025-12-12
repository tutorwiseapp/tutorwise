# Marketplace - Implementation Guide

**Version**: v1.0 (Unified Search)
**Last Updated**: 2025-12-12
**Target Audience**: Developers

---

## Table of Contents
1. [File Structure](#file-structure)
2. [Component Overview](#component-overview)
3. [Setup Instructions](#setup-instructions)
4. [Common Tasks](#common-tasks)
5. [API Reference](#api-reference)
6. [Database Queries](#database-queries)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## File Structure

```
apps/web/src/
├─ app/marketplace/
│   ├─ page.tsx                          # Main marketplace page (unified search)
│   └─ page.module.css
│
├─ app/components/feature/marketplace/
│   ├─ HeroSection.tsx                   # AI search bar + filter button
│   ├─ HeroSection.module.css
│   ├─ FilterChips.tsx                   # Quick filters (subjects, levels)
│   ├─ AdvancedFilters.tsx               # Drawer with rich filter controls
│   ├─ AdvancedFilters.module.css
│   ├─ RoleBasedHomepage.tsx             # Role-specific marketplace variants
│   ├─ MarketplaceListingCard.tsx        # Airbnb-style listing card
│   ├─ MarketplaceListingCard.module.css
│   ├─ MarketplaceTutorCard.tsx          # Profile card
│   └─ MarketplaceTutorCard.module.css
│
├─ app/api/marketplace/
│   ├─ search/route.ts                   # Listing search endpoint
│   ├─ profiles/route.ts                 # Profile search endpoint
│   └─ save-search/route.ts              # Save search functionality
│
├─ lib/services/
│   ├─ gemini.ts                         # AI query parser (Gemini API)
│   ├─ embeddings.ts                     # Vector embedding generation
│   ├─ savedSearches.ts                  # Saved search management
│   └─ matchScoring.ts                   # Personalized match scoring
│
└─ lib/api/
    ├─ listings.ts                       # Listing API client
    ├─ wiselists.ts                      # Quick save/unsave
    └─ profiles.ts                       # Profile API client

apps/api/
├─ migrations/
│   ├─ 098_create_marketplace_indexes.sql
│   └─ 099_add_semantic_search.sql
└─ functions/
    └─ generate_listing_embedding.sql    # Trigger for auto-embedding
```

---

## Component Overview

### Marketplace Architecture

```
┌──────────────────────────────────────────────────────────┐
│ Marketplace Page (/marketplace)                          │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ HeroSection                                        │  │
│  │ - AI Search Bar (natural language)                │  │
│  │ - Advanced Filters button (badge count)           │  │
│  │ - Reset button                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ FilterChips (hidden by default)                   │  │
│  │ - Subjects, Levels, Location Type                 │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ RoleBasedHomepage                                  │  │
│  │ ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐   │  │
│  │ │Listing │  │Profile │  │Listing │  │Profile │   │  │
│  │ │ Card   │  │ Card   │  │ Card   │  │ Card   │   │  │
│  │ └────────┘  └────────┘  └────────┘  └────────┘   │  │
│  │ [Interleaved: L, P, L, P, L, P...]               │  │
│  │ [Load More button]                                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ AdvancedFilters (drawer)                          │  │
│  │ - Subjects (multi-select)                          │  │
│  │ - Levels (multi-select)                            │  │
│  │ - Location Type (radio)                            │  │
│  │ - Price Range (min/max)                            │  │
│  │ - Listing Type (session/course/job)                │  │
│  │ - Min Rating                                       │  │
│  │ - Verified Only                                    │  │
│  │ [Reset All] [Save Search] [Apply Filters]         │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Component Breakdown

**HeroSection** ([HeroSection.tsx](../../apps/web/src/app/components/feature/marketplace/HeroSection.tsx))
- AI-powered natural language search bar
- Advanced filters button with active filter count badge
- Reset button to clear all filters
- Prominent call-to-action design

**RoleBasedHomepage** ([RoleBasedHomepage.tsx](../../apps/web/src/app/components/feature/marketplace/RoleBasedHomepage.tsx))
- Displays interleaved profiles and listings
- Infinite scroll with "Load More" button
- Role-specific messaging (client, tutor, agent, school)

**MarketplaceListingCard** ([MarketplaceListingCard.tsx](../../apps/web/src/app/components/feature/marketplace/MarketplaceListingCard.tsx))
- Airbnb-inspired design (image-first)
- Quick save to wiselist (heart icon)
- Badge overlays (Free Help, Trial, Verification, Category)
- Rating display
- Instant book link

**AdvancedFilters** ([AdvancedFilters.tsx](../../apps/web/src/app/components/feature/marketplace/AdvancedFilters.tsx))
- Mobile-responsive drawer
- Rich filter controls (checkboxes, radio buttons, price inputs)
- Active filter count display
- Save search functionality

---

## Setup Instructions

### Prerequisites
- Next.js 14+ installed
- Supabase configured
- Google Gemini API key for AI search
- Node.js 18+ for vector embeddings

### Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Gemini AI (for natural language search)
GEMINI_API_KEY=your_gemini_api_key

# App URL
NEXT_PUBLIC_APP_URL=https://tutorwise.com
```

### Development Setup

```bash
# 1. Navigate to web app
cd apps/web

# 2. Install dependencies (no extra packages needed)
npm install

# 3. Run migrations for marketplace indexes
npm run db:migrate

# 4. Start dev server
npm run dev

# 5. Open marketplace page
open http://localhost:3000/marketplace
```

---

## Common Tasks

### Task 1: Implement Unified Search (Profiles + Listings)

```typescript
// app/marketplace/page.tsx (excerpt)

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
    if (searchFilters.subjects) {
      params.append('subjects', searchFilters.subjects.join(','));
    }
    if (searchFilters.levels) {
      params.append('levels', searchFilters.levels.join(','));
    }
    if (searchFilters.location_type) {
      params.append('location_type', searchFilters.location_type);
    }
    if (searchFilters.min_price) {
      params.append('min_price', searchFilters.min_price.toString());
    }
    if (searchFilters.max_price) {
      params.append('max_price', searchFilters.max_price.toString());
    }
    if (searchFilters.free_trial_only) {
      params.append('free_trial_only', 'true');
    }

    params.append('offset', '0');
    params.append('limit', '20');

    // Fetch both profiles and listings in parallel using Promise.all()
    const [profilesRes, listingsRes] = await Promise.all([
      fetch(`/api/marketplace/profiles?limit=10&offset=0`),
      fetch(`/api/marketplace/search?${params.toString()}`),
    ]);

    const profilesData = await profilesRes.json();
    const listingsData = await listingsRes.json();

    // Merge into unified MarketplaceItem[]
    const profileItems: MarketplaceItem[] = (profilesData.profiles || []).map((profile: any) => ({
      type: 'profile' as const,
      data: profile,
    }));

    const listingItems: MarketplaceItem[] = (listingsData.listings || []).map((listing: any) => ({
      type: 'listing' as const,
      data: listing,
    }));

    // Interleave profiles and listings for variety
    const merged = interleaveItems(profileItems, listingItems);

    setItems(merged);
    setTotal((profilesData.total || 0) + (listingsData.total || 0));
    setHasMore(merged.length === 20);
    setOffset(20);
  } catch (error) {
    console.error('Search execution error:', error);
  } finally {
    setIsLoading(false);
  }
}, [filters]);
```

### Task 2: Interleave Profiles and Listings

```typescript
// Helper function to interleave profiles and listings (alternating pattern)
// Pattern: Listing, Profile, Listing, Profile, ...
const interleaveItems = (profiles: MarketplaceItem[], listings: MarketplaceItem[]): MarketplaceItem[] => {
  const result: MarketplaceItem[] = [];
  const maxLength = Math.max(profiles.length, listings.length);

  for (let i = 0; i < maxLength; i++) {
    if (i < listings.length) result.push(listings[i]);
    if (i < profiles.length) result.push(profiles[i]);
  }

  return result;
};

// Usage
const merged = interleaveItems(profileItems, listingItems);
```

### Task 3: AI Natural Language Search (Gemini)

```typescript
// lib/services/gemini.ts

export interface ParsedSearchQuery {
  subjects?: string[];
  levels?: string[];
  location?: string;
  locationType?: 'online' | 'in_person' | 'hybrid';
  minPrice?: number;
  maxPrice?: number;
  availability?: string;
  freeTrialOnly?: boolean;
  intent: 'search' | 'browse' | 'specific_request';
  confidence: number;
  interpretedQuery: string;
}

export async function parseSearchQuery(query: string): Promise<ParsedSearchQuery> {
  try {
    const response = await fetch('/api/ai/parse-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error('Failed to parse query');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error parsing search query:', error);

    // Fallback to basic keyword extraction
    return fallbackQueryParser(query);
  }
}

// Usage in search handler
const handleSearch = async (query: string) => {
  setCurrentQuery(query);
  setIsLoading(true);
  setHasSearched(true);

  try {
    // Parse the natural language query using AI
    const parsed = await parseSearchQuery(query);
    console.log('Parsed query:', parsed);

    // Convert parsed query to filters
    const searchFilters = queryToFilters(parsed);

    // Update filter state
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

    // Execute the search
    await executeSearch(searchFilters);
  } catch (error) {
    console.error('Search error:', error);
  } finally {
    setIsLoading(false);
  }
};
```

### Task 4: Fallback Parser (Regex-Based)

```typescript
// lib/services/gemini.ts (excerpt)

function fallbackQueryParser(query: string): ParsedSearchQuery {
  const lowerQuery = query.toLowerCase();

  // Extract subjects using common keywords
  const subjects: string[] = [];
  const subjectKeywords: Record<string, string> = {
    'math': 'Mathematics',
    'maths': 'Mathematics',
    'mathematics': 'Mathematics',
    'english': 'English',
    'science': 'Science',
    'physics': 'Physics',
    'chemistry': 'Chemistry',
    'biology': 'Biology',
    'history': 'History',
    'geography': 'Geography',
    'spanish': 'Languages',
    'french': 'Languages',
    'german': 'Languages',
    'music': 'Music',
    'piano': 'Music',
    'guitar': 'Music',
    'art': 'Art',
  };

  for (const [keyword, subject] of Object.entries(subjectKeywords)) {
    if (lowerQuery.includes(keyword)) {
      if (!subjects.includes(subject)) {
        subjects.push(subject);
      }
    }
  }

  // Extract levels
  const levels: string[] = [];
  const levelKeywords: Record<string, string> = {
    'gcse': 'GCSE',
    'a-level': 'A-Level',
    'a level': 'A-Level',
    'alevel': 'A-Level',
    'primary': 'Primary',
    'ks3': 'KS3',
    'university': 'University',
    'degree': 'University',
    'adult': 'Adult Learning',
  };

  for (const [keyword, level] of Object.entries(levelKeywords)) {
    if (lowerQuery.includes(keyword)) {
      if (!levels.includes(level)) {
        levels.push(level);
      }
    }
  }

  // Extract location type
  let locationType: 'online' | 'in_person' | 'hybrid' | undefined;
  if (lowerQuery.includes('online') || lowerQuery.includes('remote') || lowerQuery.includes('virtual')) {
    locationType = 'online';
  } else if (lowerQuery.includes('in person') || lowerQuery.includes('in-person') || lowerQuery.includes('face to face')) {
    locationType = 'in_person';
  } else if (lowerQuery.includes('hybrid') || lowerQuery.includes('both')) {
    locationType = 'hybrid';
  }

  // Extract price range
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  const pricePattern = /£?(\d+)\s*(?:-|to)\s*£?(\d+)/;
  const priceMatch = query.match(pricePattern);
  if (priceMatch) {
    minPrice = parseInt(priceMatch[1], 10);
    maxPrice = parseInt(priceMatch[2], 10);
  }

  // Check for free trial
  const freeTrialOnly = lowerQuery.includes('free trial') || lowerQuery.includes('trial lesson');

  return {
    subjects: subjects.length > 0 ? subjects : undefined,
    levels: levels.length > 0 ? levels : undefined,
    locationType,
    minPrice,
    maxPrice,
    freeTrialOnly,
    intent: 'search',
    confidence: 0.6, // Lower confidence for fallback parser
    interpretedQuery: query,
  };
}
```

### Task 5: Quick Save to Wiselist

```typescript
// lib/api/wiselists.ts (excerpt)

export async function quickSaveItem(params: { listingId: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // Guest mode: save to localStorage
    const saved = toggleGuestWiselist(params.listingId);
    return { saved, wiselist: null };
  }

  // Get or create "My Saves" wiselist
  let { data: wiselist } = await supabase
    .from('wiselists')
    .select('id')
    .eq('profile_id', user.id)
    .eq('name', 'My Saves')
    .single();

  if (!wiselist) {
    const { data: newWiselist } = await supabase
      .from('wiselists')
      .insert({
        profile_id: user.id,
        name: 'My Saves',
        description: 'Default wiselist',
      })
      .select('id')
      .single();

    wiselist = newWiselist;
  }

  // Check if already saved
  const { data: existing } = await supabase
    .from('wiselist_items')
    .select('id')
    .eq('wiselist_id', wiselist!.id)
    .eq('listing_id', params.listingId)
    .single();

  if (existing) {
    // Remove from wiselist
    await supabase
      .from('wiselist_items')
      .delete()
      .eq('id', existing.id);

    return { saved: false, wiselist };
  } else {
    // Add to wiselist
    await supabase
      .from('wiselist_items')
      .insert({
        wiselist_id: wiselist!.id,
        listing_id: params.listingId,
      });

    return { saved: true, wiselist };
  }
}

// Usage in MarketplaceListingCard
const handleSaveClick = async (e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  setIsLoading(true);
  try {
    const result = await quickSaveItem({ listingId: listing.id });
    setIsSaved(result.saved);

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
    console.error('Error saving listing:', error);
    toast.error('Something went wrong');
  } finally {
    setIsLoading(false);
  }
};
```

### Task 6: Fetch Profiles with Aggregated Listing Data

```typescript
// app/api/marketplace/profiles/route.ts

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supabase = await createClient();

    // Parse pagination parameters
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Fetch tutor profiles with published listings
    // Use explicit FK relationship to avoid ambiguity (profiles own listings via profile_id)
    let query = supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        bio,
        city,
        identity_verified,
        dbs_verified,
        available_free_help,
        listings!listings_profile_id_fkey!inner(id, status, subjects, levels, location_type, hourly_rate)
      `, { count: 'exact' })
      .eq('listings.status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Profile fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch profiles' },
        { status: 500 }
      );
    }

    // Transform and aggregate subjects/levels/location_types/prices from listings
    const profiles: TutorProfile[] = (data || []).map((profile: any) => {
      // Aggregate unique subjects, levels, and location types from all published listings
      const allSubjects = new Set<string>();
      const allLevels = new Set<string>();
      const allLocationTypes = new Set<string>();
      const hourlyRates: number[] = [];

      profile.listings?.forEach((listing: any) => {
        listing.subjects?.forEach((subject: string) => allSubjects.add(subject));
        listing.levels?.forEach((level: string) => allLevels.add(level));
        if (listing.location_type) allLocationTypes.add(listing.location_type);
        if (listing.hourly_rate) hourlyRates.push(listing.hourly_rate);
      });

      // Calculate price range
      const minPrice = hourlyRates.length > 0 ? Math.min(...hourlyRates) : undefined;
      const maxPrice = hourlyRates.length > 0 ? Math.max(...hourlyRates) : undefined;

      return {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        city: profile.city,
        identity_verified: profile.identity_verified,
        dbs_verified: profile.dbs_verified,
        available_free_help: profile.available_free_help,
        listing_count: profile.listings?.length || 0,
        subjects: Array.from(allSubjects),
        levels: Array.from(allLevels),
        location_types: Array.from(allLocationTypes),
        min_hourly_rate: minPrice,
        max_hourly_rate: maxPrice,
        average_rating: 0, // TODO: Get actual ratings from reviews
        review_count: 0,
      };
    });

    return NextResponse.json({
      profiles,
      total: count || 0,
    });
  } catch (error) {
    console.error('Profiles API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Task 7: Semantic Search with Embeddings

```typescript
// app/api/marketplace/search/route.ts (excerpt)

async function searchListingsSemantic(query: string, params: ListingSearchParams) {
  try {
    const supabase = createServiceRoleClient();

    // 1. Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // 2. Build filter conditions
    const { filters = {}, limit = 20, offset = 0 } = params;

    // Start with base query
    let dbQuery = supabase
      .from('listings')
      .select('*, profile:profiles(id, full_name, avatar_url, active_role, identity_verified, dbs_verified)', { count: 'exact' })
      .eq('status', 'published')
      .not('embedding', 'is', null);

    // Apply filters
    if (filters.subjects && filters.subjects.length > 0) {
      dbQuery = dbQuery.overlaps('subjects', filters.subjects);
    }

    if (filters.levels && filters.levels.length > 0) {
      dbQuery = dbQuery.overlaps('levels', filters.levels);
    }

    if (filters.location_type) {
      dbQuery = dbQuery.eq('location_type', filters.location_type);
    }

    if (filters.min_price) {
      dbQuery = dbQuery.gte('hourly_rate', filters.min_price);
    }

    if (filters.max_price) {
      dbQuery = dbQuery.lte('hourly_rate', filters.max_price);
    }

    if (filters.free_trial_only) {
      dbQuery = dbQuery.eq('free_trial', true);
    }

    // Execute query to get filtered results
    const { data: listings, error, count } = await dbQuery;

    if (error) throw error;
    if (!listings || listings.length === 0) {
      return { listings: [], total: 0 };
    }

    // 3. Calculate cosine similarity for each listing
    const listingsWithScores = listings.map((listing: any) => {
      if (!listing.embedding) {
        return { ...listing, similarity: 0 };
      }

      const listingEmbedding = JSON.parse(listing.embedding);

      // Calculate cosine similarity (1 - cosine distance)
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (let i = 0; i < queryEmbedding.length; i++) {
        dotProduct += queryEmbedding[i] * listingEmbedding[i];
        normA += queryEmbedding[i] * queryEmbedding[i];
        normB += listingEmbedding[i] * listingEmbedding[i];
      }

      const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

      return { ...listing, similarity };
    });

    // 4. Sort by similarity (descending)
    listingsWithScores.sort((a, b) => b.similarity - a.similarity);

    // 5. Apply pagination
    const paginatedListings = listingsWithScores.slice(offset, offset + limit);

    return {
      listings: paginatedListings,
      total: count || 0,
    };

  } catch (error) {
    console.error('Semantic search error:', error);
    throw error;
  }
}
```

### Task 8: Infinite Scroll Pagination

```typescript
// app/marketplace/page.tsx (excerpt)

const loadMore = useCallback(async () => {
  if (!hasMore || isLoadingMore) return;

  setIsLoadingMore(true);
  try {
    const searchFilters = {
      subjects: filters.subjects.length > 0 ? filters.subjects : undefined,
      levels: filters.levels.length > 0 ? filters.levels : undefined,
      location_type: filters.locationType || undefined,
      min_price: filters.priceRange.min || undefined,
      max_price: filters.priceRange.max || undefined,
      free_trial_only: filters.freeTrialOnly || undefined,
    };

    const params = new URLSearchParams();
    if (searchFilters.subjects) {
      params.append('subjects', searchFilters.subjects.join(','));
    }
    if (searchFilters.levels) {
      params.append('levels', searchFilters.levels.join(','));
    }
    if (searchFilters.location_type) {
      params.append('location_type', searchFilters.location_type);
    }
    if (searchFilters.min_price) {
      params.append('min_price', searchFilters.min_price.toString());
    }
    if (searchFilters.max_price) {
      params.append('max_price', searchFilters.max_price.toString());
    }
    if (searchFilters.free_trial_only) {
      params.append('free_trial_only', 'true');
    }

    params.append('offset', offset.toString());
    params.append('limit', '20');

    // Fetch more profiles and listings
    const [profilesRes, listingsRes] = await Promise.all([
      fetch(`/api/marketplace/profiles?limit=10&offset=${Math.floor(offset / 2)}`),
      fetch(`/api/marketplace/search?${params.toString()}`),
    ]);

    const profilesData = await profilesRes.json();
    const listingsData = await listingsRes.json();

    const profileItems: MarketplaceItem[] = (profilesData.profiles || []).map((profile: any) => ({
      type: 'profile' as const,
      data: profile,
    }));

    const listingItems: MarketplaceItem[] = (listingsData.listings || []).map((listing: any) => ({
      type: 'listing' as const,
      data: listing,
    }));

    const newMerged = interleaveItems(profileItems, listingItems);

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

---

## API Reference

### GET /api/marketplace/search

Search listings with filters.

**Query Parameters**:
```typescript
{
  subjects?: string;         // Comma-separated (e.g., "Mathematics,Physics")
  levels?: string;           // Comma-separated (e.g., "GCSE,A-Level")
  location_type?: 'online' | 'in_person' | 'hybrid';
  location_city?: string;    // e.g., "London"
  min_price?: number;        // e.g., 20
  max_price?: number;        // e.g., 50
  free_trial_only?: boolean; // true or false
  search?: string;           // Text search
  semantic?: boolean;        // Enable semantic search (Phase 1)
  limit?: number;            // Default: 20
  offset?: number;           // Default: 0
}
```

**Response**:
```typescript
{
  listings: Listing[];
  total: number;
}
```

### GET /api/marketplace/profiles

Fetch tutor profiles with aggregated listing data.

**Query Parameters**:
```typescript
{
  limit?: number;  // Default: 10
  offset?: number; // Default: 0
}
```

**Response**:
```typescript
{
  profiles: TutorProfile[];
  total: number;
}
```

### POST /api/ai/parse-query

Parse natural language query using Gemini AI.

**Request Body**:
```typescript
{
  query: string; // e.g., "online GCSE maths tutor in London"
}
```

**Response**:
```typescript
{
  subjects?: string[];
  levels?: string[];
  location?: string;
  locationType?: 'online' | 'in_person' | 'hybrid';
  minPrice?: number;
  maxPrice?: number;
  freeTrialOnly?: boolean;
  intent: 'search' | 'browse' | 'specific_request';
  confidence: number;
  interpretedQuery: string;
}
```

---

## Database Queries

### Listings with GIN Indexes

```sql
-- GIN indexes for fast array searches
CREATE INDEX idx_listings_subjects ON listings USING GIN (subjects);
CREATE INDEX idx_listings_levels ON listings USING GIN (levels);
CREATE INDEX idx_listings_status ON listings (status);
CREATE INDEX idx_listings_location_type ON listings (location_type);
CREATE INDEX idx_listings_hourly_rate ON listings (hourly_rate);
CREATE INDEX idx_listings_free_trial ON listings (free_trial);

-- Composite index for common filter combinations
CREATE INDEX idx_listings_search ON listings (status, location_type, hourly_rate);
```

### Profiles with Inner Join on Published Listings

```sql
-- Fetch profiles with aggregated listing data
SELECT
  p.id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.city,
  p.identity_verified,
  p.dbs_verified,
  p.available_free_help,
  ARRAY_AGG(DISTINCT l.subjects) AS subjects,
  ARRAY_AGG(DISTINCT l.levels) AS levels,
  ARRAY_AGG(DISTINCT l.location_type) AS location_types,
  MIN(l.hourly_rate) AS min_hourly_rate,
  MAX(l.hourly_rate) AS max_hourly_rate,
  COUNT(l.id) AS listing_count
FROM profiles p
INNER JOIN listings l ON l.profile_id = p.id
WHERE l.status = 'published'
GROUP BY p.id
ORDER BY p.created_at DESC
LIMIT 10 OFFSET 0;
```

### Semantic Search with Vector Embeddings

```sql
-- Store embeddings for listings
ALTER TABLE listings ADD COLUMN embedding JSONB;

-- Trigger to auto-generate embeddings on insert/update
CREATE OR REPLACE FUNCTION generate_listing_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate embedding using external service (called via webhook)
  -- Embedding stored as JSONB array: [0.1, 0.2, 0.3, ...]
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_listing_embedding
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION generate_listing_embedding();
```

---

## Testing

### Component Testing

```typescript
describe('MarketplaceListingCard', () => {
  it('renders listing card with correct data', () => {
    const listing = {
      id: '123',
      title: 'GCSE Maths Tutor',
      hourly_rate: 30,
      subjects: ['Mathematics'],
      levels: ['GCSE'],
      location_type: 'online',
      full_name: 'John Doe',
      avatar_url: null,
      free_trial: true,
      available_free_help: false,
      average_rating: 4.8,
      review_count: 12,
    };

    render(<MarketplaceListingCard listing={listing} />);

    expect(screen.getByText('GCSE Maths Tutor')).toBeInTheDocument();
    expect(screen.getByText('£30/hr')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('Free Trial')).toBeInTheDocument();
  });
});
```

### API Testing

```typescript
describe('GET /api/marketplace/search', () => {
  it('returns listings filtered by subjects', async () => {
    const response = await fetch('/api/marketplace/search?subjects=Mathematics&limit=10');
    const data = await response.json();

    expect(data.listings).toHaveLength(10);
    expect(data.listings[0].subjects).toContain('Mathematics');
  });

  it('returns empty array when no results', async () => {
    const response = await fetch('/api/marketplace/search?subjects=NonExistentSubject');
    const data = await response.json();

    expect(data.listings).toHaveLength(0);
    expect(data.total).toBe(0);
  });
});
```

---

## Troubleshooting

### Issue: Profiles not showing in marketplace

**Cause**: Profiles only appear if they have at least one published listing.

**Solution**: Ensure the profile has published listings:

```sql
-- Check profile's published listings
SELECT COUNT(*) FROM listings WHERE profile_id = 'profile_id' AND status = 'published';

-- If 0, the profile won't appear in marketplace
```

### Issue: AI search returns incorrect filters

**Cause**: Gemini API may misinterpret ambiguous queries.

**Solution**: Use fallback parser or improve prompt:

```typescript
// Check confidence score in ParsedSearchQuery
if (parsed.confidence < 0.7) {
  // Low confidence - show clarification prompt to user
  console.warn('Low confidence parse:', parsed);
}
```

### Issue: Slow search performance

**Cause**: Missing GIN indexes or inefficient queries.

**Solution**: Ensure all indexes are created:

```sql
-- Check if GIN indexes exist
SELECT indexname FROM pg_indexes WHERE tablename = 'listings';

-- Re-create indexes if missing
CREATE INDEX CONCURRENTLY idx_listings_subjects ON listings USING GIN (subjects);
CREATE INDEX CONCURRENTLY idx_listings_levels ON listings USING GIN (levels);
```

---

**Last Updated**: 2025-12-12
**Version**: v1.0
**Maintainer**: Marketplace Team
