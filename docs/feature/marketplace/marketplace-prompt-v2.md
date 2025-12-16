# Marketplace Feature - AI Prompt

**Version**: v1.0 (Unified Search)
**Date**: 2025-12-12
**Purpose**: Guide AI assistants when working on the marketplace feature

---

## Feature Overview

The marketplace is Tutorwise's **unified tutor discovery platform** that combines AI-powered natural language search with smart interleaving of profiles and listings. Built for multi-role users, it delivers personalized results through semantic matching and match scoring algorithms.

**Key Responsibilities**:
- Unified search (simultaneous profile + listing queries)
- AI natural language query parsing (Gemini API)
- Smart interleaving algorithm (alternating profiles/listings)
- Semantic search with vector embeddings
- Advanced filtering (12 filter types)
- Quick save to wiselists
- Infinite scroll pagination
- Match scoring for personalized results
- Role-based homepage variants

---

## System Context

### Core Architecture

The marketplace system is built on these principles:

1. **Unified Discovery**: Single search queries both profiles AND listings in parallel
2. **AI-First Search**: Natural language input ("online GCSE maths tutor £20-30/hr") parsed by Gemini
3. **Smart Interleaving**: Alternating pattern (Listing, Profile, Listing, Profile) for variety
4. **Client-Side State**: React component manages search state, no backend session
5. **GIN Indexes**: PostgreSQL Generalized Inverted Index for fast array searches
6. **Semantic Matching**: Vector embeddings for intent-based search (Phase 1)
7. **Optimistic UI**: Quick save updates UI immediately before server confirmation

### Database Tables

**Primary**:
- `listings` - Service offerings (search target)
- `profiles` - Tutor profiles (search target)

**Related**:
- `wiselists` - User's saved collections
- `wiselist_items` - Saved listing references
- `saved_searches` - Saved filter combinations

**Key Fields**:
```sql
listings {
  id UUID,
  profile_id UUID,
  title TEXT,
  subjects TEXT[],                    -- GIN indexed
  levels TEXT[],                      -- GIN indexed
  location_type TEXT,                 -- 'online', 'in_person', 'hybrid'
  location_city TEXT,
  hourly_rate NUMERIC,
  free_trial BOOLEAN,
  listing_category TEXT,              -- 'session', 'course', 'job'
  status TEXT,                        -- 'draft', 'published', 'archived'
  embedding JSONB,                    -- Vector for semantic search
  average_rating NUMERIC,
  review_count INTEGER
}

profiles {
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  identity_verified BOOLEAN,
  dbs_verified BOOLEAN,
  available_free_help BOOLEAN,       -- Priority badge
  active_role TEXT                   -- 'client', 'tutor', 'agent', 'school'
}
```

---

## Integration Points

### Critical Dependencies

1. **Gemini AI** (CRITICAL - Natural Language Parsing):
   - `/api/ai/parse-query` endpoint
   - Converts "GCSE maths tutor in London" → { subjects: ['Mathematics'], levels: ['GCSE'], location_city: 'London' }
   - Falls back to regex parser if API fails
   - Confidence score indicates parse quality

2. **Listings**:
   - `/api/marketplace/search` endpoint
   - GIN-indexed array queries for subjects/levels
   - Semantic search mode with vector embeddings
   - Filter composition (subjects AND levels AND location_type)

3. **Profiles**:
   - `/api/marketplace/profiles` endpoint
   - Inner join on published listings only
   - Aggregates subjects/levels/prices from all listings
   - Returns price range (min/max hourly rate)

4. **Wiselists** (Quick Save):
   - `quickSaveItem()` function creates/updates "My Saves" wiselist
   - Optimistic UI updates before server confirmation
   - Guest mode uses localStorage (syncs on login)

5. **Match Scoring** (Personalization):
   - Calculates compatibility based on client preferences
   - Ranks listings by relevance (Phase 2)
   - Displays match percentage badge

---

## Key Functions & Mechanisms

### 1. AI Query Parsing (Gemini)

**Purpose**: Convert natural language to structured filters

**Location**: `apps/web/src/lib/services/gemini.ts`

```typescript
export async function parseSearchQuery(query: string): Promise<ParsedSearchQuery> {
  try {
    const response = await fetch('/api/ai/parse-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) throw new Error('Failed to parse query');

    return await response.json();
  } catch (error) {
    console.error('Error parsing search query:', error);

    // Fallback to regex-based parser
    return fallbackQueryParser(query);
  }
}
```

**Fallback Parser** (Regex-Based):
```typescript
function fallbackQueryParser(query: string): ParsedSearchQuery {
  const lowerQuery = query.toLowerCase();

  // Extract subjects
  const subjects: string[] = [];
  const subjectKeywords = {
    'math': 'Mathematics',
    'english': 'English',
    'science': 'Science',
    // ... 20+ mappings
  };

  for (const [keyword, subject] of Object.entries(subjectKeywords)) {
    if (lowerQuery.includes(keyword)) {
      if (!subjects.includes(subject)) subjects.push(subject);
    }
  }

  // Extract price range using regex
  const pricePattern = /£?(\d+)\s*(?:-|to)\s*£?(\d+)/;
  const match = query.match(pricePattern);
  let minPrice, maxPrice;
  if (match) {
    minPrice = parseInt(match[1], 10);
    maxPrice = parseInt(match[2], 10);
  }

  return {
    subjects: subjects.length > 0 ? subjects : undefined,
    levels, // extracted similarly
    locationType, // extracted similarly
    minPrice,
    maxPrice,
    freeTrialOnly,
    intent: 'search',
    confidence: 0.6, // Lower for fallback
    interpretedQuery: query,
  };
}
```

### 2. Unified Search (Profiles + Listings)

**Purpose**: Fetch both profiles and listings in parallel, then interleave

**Location**: `apps/web/src/app/marketplace/page.tsx`

```typescript
const executeSearch = useCallback(async (customFilters?: any, resetOffset = true) => {
  setIsLoading(true);
  if (resetOffset) setOffset(0);

  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (searchFilters.subjects) {
      params.append('subjects', searchFilters.subjects.join(','));
    }
    if (searchFilters.levels) {
      params.append('levels', searchFilters.levels.join(','));
    }
    // ... other filters

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
    const profileItems = profilesData.profiles.map(profile => ({
      type: 'profile' as const,
      data: profile,
    }));

    const listingItems = listingsData.listings.map(listing => ({
      type: 'listing' as const,
      data: listing,
    }));

    // Interleave for variety
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

### 3. Interleaving Algorithm

**Purpose**: Alternate profiles and listings for variety

**Location**: `apps/web/src/app/marketplace/page.tsx`

```typescript
// Pattern: Listing, Profile, Listing, Profile, ...
const interleaveItems = (
  profiles: MarketplaceItem[],
  listings: MarketplaceItem[]
): MarketplaceItem[] => {
  const result: MarketplaceItem[] = [];
  const maxLength = Math.max(profiles.length, listings.length);

  for (let i = 0; i < maxLength; i++) {
    if (i < listings.length) result.push(listings[i]);
    if (i < profiles.length) result.push(profiles[i]);
  }

  return result;
};
```

### 4. Semantic Search (Vector Embeddings)

**Purpose**: Match search intent using vector similarity

**Location**: `apps/web/src/app/api/marketplace/search/route.ts`

```typescript
async function searchListingsSemantic(query: string, params: ListingSearchParams) {
  const supabase = createServiceRoleClient();

  // 1. Generate embedding for search query
  const queryEmbedding = await generateEmbedding(query);

  // 2. Fetch filtered listings with embeddings
  let dbQuery = supabase
    .from('listings')
    .select('*, profile:profiles(id, full_name, avatar_url, identity_verified, dbs_verified)', { count: 'exact' })
    .eq('status', 'published')
    .not('embedding', 'is', null);

  // Apply filters (subjects, levels, location_type, etc.)
  if (filters.subjects && filters.subjects.length > 0) {
    dbQuery = dbQuery.overlaps('subjects', filters.subjects);
  }
  // ... other filters

  const { data: listings, error, count } = await dbQuery;

  if (error) throw error;
  if (!listings || listings.length === 0) {
    return { listings: [], total: 0 };
  }

  // 3. Calculate cosine similarity for each listing
  const listingsWithScores = listings.map((listing: any) => {
    if (!listing.embedding) return { ...listing, similarity: 0 };

    const listingEmbedding = JSON.parse(listing.embedding);

    // Cosine similarity calculation
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
}
```

### 5. Quick Save to Wiselist

**Purpose**: Save/unsave listings with optimistic UI update

**Location**: `apps/web/src/lib/api/wiselists.ts`

```typescript
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
```

---

## Common Tasks & Patterns

### Task 1: Handle Natural Language Search

**Example**: User types "online GCSE maths tutor £20-30/hr"

```typescript
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

### Task 2: Implement Infinite Scroll

**Requirement**: Load more results as user scrolls

```typescript
const loadMore = useCallback(async () => {
  if (!hasMore || isLoadingMore) return;

  setIsLoadingMore(true);
  try {
    const params = new URLSearchParams();
    // ... build filters
    params.append('offset', offset.toString());
    params.append('limit', '20');

    // Fetch more profiles and listings
    const [profilesRes, listingsRes] = await Promise.all([
      fetch(`/api/marketplace/profiles?limit=10&offset=${Math.floor(offset / 2)}`),
      fetch(`/api/marketplace/search?${params.toString()}`),
    ]);

    const profilesData = await profilesRes.json();
    const listingsData = await listingsRes.json();

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

### Task 3: Fetch Profiles with Aggregated Data

**Requirement**: Show profiles with combined data from all their listings

```typescript
// app/api/marketplace/profiles/route.ts

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Fetch tutor profiles with published listings
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

  // Transform and aggregate subjects/levels/prices from listings
  const profiles = (data || []).map((profile: any) => {
    const allSubjects = new Set<string>();
    const allLevels = new Set<string>();
    const hourlyRates: number[] = [];

    profile.listings?.forEach((listing: any) => {
      listing.subjects?.forEach((subject: string) => allSubjects.add(subject));
      listing.levels?.forEach((level: string) => allLevels.add(level));
      if (listing.hourly_rate) hourlyRates.push(listing.hourly_rate);
    });

    return {
      id: profile.id,
      full_name: profile.full_name,
      subjects: Array.from(allSubjects),
      levels: Array.from(allLevels),
      min_hourly_rate: hourlyRates.length > 0 ? Math.min(...hourlyRates) : undefined,
      max_hourly_rate: hourlyRates.length > 0 ? Math.max(...hourlyRates) : undefined,
      listing_count: profile.listings?.length || 0,
      // ... other fields
    };
  });

  return NextResponse.json({ profiles, total: count || 0 });
}
```

---

## Testing Checklist

When modifying the marketplace feature, test:

- [ ] AI search parsing (correct filter extraction from natural language)
- [ ] Fallback parser (handles Gemini API failures gracefully)
- [ ] Unified search (profiles + listings fetched in parallel)
- [ ] Interleaving algorithm (alternating pattern maintained)
- [ ] Quick save (optimistic UI update, server confirmation)
- [ ] Guest mode saves (localStorage persistence)
- [ ] Infinite scroll (offset calculation, no duplicates)
- [ ] Advanced filters (12 filter types applied correctly)
- [ ] Semantic search (vector similarity ranking)
- [ ] Empty state (graceful handling of no results)

---

## Security Considerations

1. **SQL Injection**: All queries use parameterized inputs (Supabase client prevents injection)
2. **Rate Limiting**: AI query parsing limited to 10 requests/minute per IP
3. **Guest Wiselist Size**: localStorage limited to 50 items (prevent abuse)
4. **RLS Policies**: Profiles/listings filtered by `status='published'` only
5. **CORS**: API endpoints restricted to app domain

---

## Performance Optimization

1. **Indexes**:
   - `idx_listings_subjects` - GIN index for fast array searches
   - `idx_listings_levels` - GIN index for fast array searches
   - `idx_listings_status` - B-tree index for published filter

2. **Caching**:
   - Featured items cached (5-minute stale time)
   - QR codes cached (immutable)
   - Profile aggregations cached (10-minute stale time)

3. **Parallel Queries**:
   - Profiles and listings fetched concurrently via `Promise.all()`
   - Reduces latency by ~50%

---

## Migration Guidelines

When creating new migrations for marketplace:

1. **Preserve GIN Indexes**: Always recreate GIN indexes on subjects/levels arrays
2. **Semantic Search**: Add embedding column to new listing types
3. **Filter Compatibility**: Ensure new filters work with existing query builder
4. **Profile Aggregation**: Update aggregation logic if adding new listing fields

---

## Related Documentation

- [Marketplace Solution Design](./marketplace-solution-design.md) - Complete architecture
- [Marketplace README](./README.md) - Quick reference
- [Marketplace Implementation](./marketplace-implementation.md) - Code examples
- [Wiselists Solution Design](../wiselists/wiselists-solution-design.md) - Quick save integration
- [Listings Solution Design](../listings/listings-solution-design.md) - Listing search logic

---

**Last Updated**: 2025-12-12
**Maintainer**: Marketplace Team
**For Questions**: See marketplace-solution-design.md or ask team lead
