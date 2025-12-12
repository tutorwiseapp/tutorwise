# Marketplace

**Status**: Active
**Last Code Update**: 2025-12-12
**Last Doc Update**: 2025-12-12
**Priority**: Critical (Tier 1 - Core Discovery Engine)
**Architecture**: Client-Side Rendered Discovery Hub with AI Search

---

## Quick Links
- [Solution Design](./marketplace-solution-design.md) - Complete architecture, 8 system integrations
- [Implementation Guide](./marketplace-implementation.md) - Developer guide with code examples
- [AI Prompt Context](./marketplace-prompt.md) - AI assistant guide

---

## Overview

The Marketplace is Tutorwise's primary discovery engine, enabling clients to find tutors and service listings through AI-powered natural language search, advanced filtering, and personalized recommendations. Built as a client-side React app with parallel API queries, smart result interleaving, and role-based personalized homepages.

**Core Innovation**: Unified search that simultaneously queries both tutor profiles AND service listings, interleaving results for maximum discovery variety.

---

## Key Features

### Search & Discovery
- **AI-Powered Natural Language Search**: Gemini API parses queries like "GCSE Maths tutor online £20-30/hr" into structured filters
- **Unified Search**: Searches both tutor profiles and service listings simultaneously (parallel queries)
- **Smart Interleaving**: Alternates profiles and listings in results for discovery variety
- **Semantic Search** (Phase 1): Vector embeddings for intent-based matching
- **Advanced Filters**: 12 filter types (subjects, levels, price, location, availability, trial, category)
- **Full-Text Search**: GIN-indexed search across listing titles and descriptions

### Personalization
- **Role-Based Homepages**: Customized landing experience per role (guest/client/tutor/agent)
- **Match Scoring**: Personalized ranking based on client learning preferences
- **Saved Searches**: Store filter combinations for quick re-execution
- **Recommendations**: AI-curated suggestions based on browsing history

### User Experience
- **Infinite Scroll**: Load-more pagination (20 items per page)
- **Quick Save**: One-click wiselist integration with heart icon
- **Free Help Badge**: Priority badge for tutors offering immediate free help
- **Instant Book**: Direct booking links on listing cards
- **Mobile-Optimized**: 1-column mobile, 2-column tablet, 4-column desktop grid

### Performance
- **Parallel Queries**: Profiles and listings fetched simultaneously (~800ms initial load)
- **GIN Indexes**: Fast array searches for subjects/levels
- **Materialized Views**: Cached aggregations for recommendations
- **Image Lazy Loading**: Next.js optimized images

---

## Implementation Status

### ✅ Completed (v5.9)
- AI natural language search (Gemini API integration)
- Unified profile + listing search
- Smart interleaving algorithm
- Advanced filters (12 types)
- Role-based homepage variants (4 roles)
- Infinite scroll pagination
- Quick-save wiselist integration
- Match scoring algorithm
- Free help badge priority
- Instant book links
- Mobile-responsive 4-column grid
- Full-text search with GIN indexes
- Semantic search (Phase 1 - vector embeddings)

### 🚧 In Progress
- Semantic search Phase 2 (hybrid ranking)
- Saved searches execution
- Advanced match scoring (v2 algorithm)
- Real-time availability indicators

### 📋 Planned
- AI chat interface for conversational search
- Video preview on hover
- 3D profile cards
- AR try-before-you-book
- Voice search
- Multi-language search

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  MARKETPLACE PAGE STRUCTURE                                     │
└─────────────────────────────────────────────────────────────────┘

MarketplacePage (page.tsx) - State management, API orchestration
├── HeroSection - AI search bar with natural language input
├── AdvancedFilters - Drawer with 12 filter types
├── FilterChips - Active filter display (optional)
└── RoleBasedHomepage - Wrapper for role-specific variants
    ├── GuestHomepage - Unauthenticated landing
    ├── ClientHomepage - Student discovery experience
    ├── TutorHomepage - Tutor network discovery
    └── AgentHomepage - Agent business tools
        ├── RecommendedSection - AI-curated suggestions
        ├── TrendingSection - Popular tutors/listings
        └── MarketplaceGrid - 4-column responsive grid
            ├── MarketplaceListingCard (Airbnb-inspired)
            └── TutorProfileCard (Profile showcase)
```

### Main Page
- **File**: [marketplace/page.tsx](../../apps/web/src/app/marketplace/page.tsx)
- **Type**: Client Component ('use client')
- **State Management**: React useState + useCallback hooks
- **Data Fetching**: Parallel fetch calls with Promise.all()

### Feature Components (15 total)

**Search & Filters**:
1. `HeroSection` - AI chat bar with search input, filter button, reset button
2. `AdvancedFilters` - Slide-out drawer with 12 filter types
3. `FilterChips` - Active filter display chips (hidden by default)
4. `SearchFilters` - Legacy filter panel (deprecated)

**Homepage Variants**:
5. `RoleBasedHomepage` - Wrapper that selects variant based on user role
6. `GuestHomepage` - Hero CTA, trending listings, featured tutors
7. `ClientHomepage` - Personalized recommendations, match-scored results
8. `TutorHomepage` - Network opportunities, client lesson requests
9. `AgentHomepage` - Business analytics, tutor recruitment

**Results Display**:
10. `MarketplaceGrid` - Responsive grid (4 cols desktop, 2 tablet, 1 mobile)
11. `RecommendedSection` - Curated AI suggestions
12. `TrendingSection` - Popular tutors/listings (7-day window)

**Cards**:
13. `MarketplaceListingCard` - Airbnb-inspired listing card (image-first design)
14. `TutorProfileCard` - Tutor profile card (avatar, bio, stats)
15. `MatchScoreBadge` - Personalized match percentage display

---

## Routes

### Main Route
- **Path**: `/marketplace`
- **Type**: Client Component
- **Authentication**: Optional (works for guest + authenticated users)
- **SEO**: Static metadata + dynamic OG tags

### API Endpoints (8 total)

1. **`GET /api/marketplace/search`** - Search listings with filters
   - Query params: subjects, levels, location_type, min_price, max_price, free_trial_only, offset, limit
   - Returns: { listings, total }

2. **`GET /api/marketplace/profiles`** - Fetch featured tutors
   - Query params: limit, offset, role
   - Returns: { profiles, total }

3. **`POST /api/search/parse`** - AI natural language query parsing
   - Body: { query: string }
   - Returns: { subjects, levels, location_type, min_price, max_price }

4. **`GET /api/marketplace/recommendations`** - Personalized suggestions
   - Query params: user_id, limit
   - Returns: { listings, profiles, match_scores }

5. **`GET /api/marketplace/match-score`** - Calculate match percentage
   - Query params: listing_id, user_id
   - Returns: { score, reasons }

6. **`GET /api/marketplace/saved-searches`** - User's saved filter sets
   - Returns: { searches }

7. **`POST /api/marketplace/saved-searches/execute`** - Run saved search
   - Body: { search_id }
   - Returns: { listings, profiles }

8. **`GET /api/marketplace/insights`** - Marketplace analytics
   - Query params: metric, time_range
   - Returns: { data, trends }

---

## Database Tables

### Primary Tables

**listings** - Service offerings
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
  hourly_rate DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'GBP',
  free_trial BOOLEAN DEFAULT false,

  -- Location
  location_type VARCHAR(20),  -- 'online', 'in_person', 'hybrid'
  location_city VARCHAR(100),

  -- Category (v5.0)
  listing_category VARCHAR(20),  -- 'session', 'course', 'job'

  -- Free help
  available_free_help BOOLEAN DEFAULT false,

  -- SEO
  slug VARCHAR(255) UNIQUE,

  -- Semantic search (Phase 1)
  embedding JSONB,  -- Vector embedding for semantic search

  -- Metrics
  view_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  booking_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2),
  review_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);
```

**profiles** - Tutor profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  active_role TEXT,  -- 'tutor', 'client', 'agent'
  city TEXT,
  country TEXT,

  -- Verification
  identity_verified BOOLEAN DEFAULT false,
  dbs_verified BOOLEAN DEFAULT false,

  -- Cached aggregates
  average_rating DECIMAL(3,2),
  total_reviews INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**wiselist_items** - Saved listings
```sql
CREATE TABLE wiselist_items (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  listing_id UUID REFERENCES listings(id),
  wiselist_id UUID REFERENCES wiselists(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, listing_id)
);
```

**saved_searches** - User filter presets
```sql
CREATE TABLE saved_searches (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  name VARCHAR(100),
  filters JSONB,  -- Stored filter state
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Indexes for Performance

```sql
-- GIN indexes for array searches (CRITICAL for performance)
CREATE INDEX idx_listings_subjects ON listings USING GIN(subjects);
CREATE INDEX idx_listings_levels ON listings USING GIN(levels);

-- Composite index for hot path (published listings)
CREATE INDEX idx_listings_published_at ON listings (published_at DESC)
  WHERE status = 'published';

-- Full-text search index
CREATE INDEX idx_listings_fts ON listings USING GIN(
  to_tsvector('english', title || ' ' || description)
);

-- Semantic search index (Phase 1)
CREATE INDEX idx_listings_embedding ON listings USING GIN(embedding jsonb_path_ops)
  WHERE embedding IS NOT NULL;

-- Price range queries
CREATE INDEX idx_listings_price ON listings (hourly_rate)
  WHERE status = 'published';

-- Location queries
CREATE INDEX idx_listings_location ON listings (location_type, location_city)
  WHERE status = 'published';
```

---

## Key Workflows

### 1. AI Natural Language Search Flow

```
User Input: "GCSE Maths tutor online £20-30/hr"
     ↓
HeroSection.handleSearch()
     ↓
POST /api/search/parse (Gemini API)
     ↓
AI Parsing: {
  subjects: ['Mathematics'],
  levels: ['GCSE'],
  location_type: 'online',
  min_price: 20,
  max_price: 30
}
     ↓
Update filter state
     ↓
executeSearch() with parsed filters
     ↓
Parallel API calls:
  ├─ GET /api/marketplace/profiles?limit=10
  └─ GET /api/marketplace/search?subjects=Mathematics&levels=GCSE&...
     ↓
Merge results: [listing, profile, listing, profile, ...]
     ↓
Display in MarketplaceGrid
```

### 2. Filter Change Flow

```
User clicks "Advanced Filters" button
     ↓
AdvancedFilters drawer opens
     ↓
User selects: Subjects, Levels, Price Range
     ↓
Click "Apply Filters"
     ↓
handleAdvancedFiltersChange()
     ↓
Update filter state
     ↓
executeSearch() with new filters (reset offset to 0)
     ↓
Fetch fresh results
     ↓
Replace existing items array
     ↓
Display updated results
```

### 3. Infinite Scroll Load More Flow

```
User scrolls to bottom
     ↓
Click "Load More" button
     ↓
loadMore() function
     ↓
Set isLoadingMore = true
     ↓
Fetch next 20 items (offset += 20)
     ↓
Parallel API calls with current filters + new offset
     ↓
Append to existing items array
     ↓
Update hasMore flag (false if < 20 results)
     ↓
Set isLoadingMore = false
     ↓
Render additional items
```

### 4. Quick Save Flow

```
User clicks heart icon on MarketplaceListingCard
     ↓
handleSaveClick() (e.preventDefault, e.stopPropagation)
     ↓
Call quickSaveItem({ listingId })
     ↓
POST /api/wiselists/quick-save
     ↓
Backend:
  IF saved → DELETE from wiselist_items
  ELSE → INSERT into wiselist_items (default "My Saves" wiselist)
     ↓
Return { saved: boolean }
     ↓
Update isSaved state
     ↓
Show toast notification
  - Guest: "Saved! Sign in to sync across devices."
  - Authenticated: "Saved to My Saves!" / "Removed from My Saves"
```

---

## System Integrations

The Marketplace integrates with **8 major platform features**:

1. **AI Search** - Gemini API for natural language parsing
2. **Listings** - Service offerings database (published status)
3. **Profiles** - Tutor showcase with verification badges
4. **Wiselists** - Quick-save functionality
5. **Bookings** - Instant book links
6. **Analytics** - Search query logging, view tracking
7. **CaaS** - Verification badges (identity, DBS)
8. **Match Scoring** - Personalized ranking algorithm

See [marketplace-solution-design.md](./marketplace-solution-design.md) for detailed integration documentation.

---

## Usage Examples

### Search Listings with Filters

```typescript
// GET request
const params = new URLSearchParams({
  subjects: 'Mathematics,Physics',
  levels: 'GCSE,A-Level',
  location_type: 'online',
  min_price: '20',
  max_price: '50',
  offset: '0',
  limit: '20'
});

const response = await fetch(`/api/marketplace/search?${params}`);
const { listings, total } = await response.json();
```

### Parse Natural Language Query

```typescript
const response = await fetch('/api/search/parse', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'GCSE Maths tutor online £20-30/hr' })
});

const parsed = await response.json();
// Returns: { subjects: ['Mathematics'], levels: ['GCSE'], ... }
```

### Quick Save Listing

```typescript
import { quickSaveItem } from '@/lib/api/wiselists';

const result = await quickSaveItem({ listingId: 'listing-uuid' });
console.log(result.saved); // true or false
```

---

## Security

### RLS Policies

```sql
-- Only show published listings
CREATE POLICY listings_select_published ON listings
  FOR SELECT
  USING (status = 'published');

-- Users can view own listings (any status)
CREATE POLICY listings_select_own ON listings
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Users can only save to own wiselists
CREATE POLICY wiselist_items_insert_own ON wiselist_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Input Validation

```typescript
// Zod schema for search filters
const searchFiltersSchema = z.object({
  subjects: z.array(z.string()).optional(),
  levels: z.array(z.string()).optional(),
  location_type: z.enum(['online', 'in_person', 'hybrid']).optional(),
  min_price: z.number().min(0).max(500).optional(),
  max_price: z.number().min(0).max(500).optional(),
  free_trial_only: z.boolean().optional(),
  offset: z.number().min(0).default(0),
  limit: z.number().min(1).max(100).default(20)
});
```

---

## Performance Metrics

**Current Performance**:
- Initial load: ~800ms (parallel profile + listing queries)
- AI search parsing: ~300ms (Gemini API call)
- Filter execution: ~200ms (GIN-indexed queries)
- Load more: ~150ms (DB query only)

**Optimization Techniques**:
- Parallel API calls (`Promise.all([profiles, listings])`)
- GIN indexes for array searches (10x faster than LIKE queries)
- Full-text search indexes (instant results vs sequential scans)
- Pagination (20 items per page vs loading all)
- Image lazy loading (Next.js Image component)
- Infinite scroll (no page reloads)

---

## Testing

### Manual Test Scenarios

**Scenario 1: AI Search**
```
1. Type "GCSE Maths tutor online"
2. Verify filters auto-populate: Subjects=Mathematics, Levels=GCSE, Location=online
3. Verify results show only matching listings
✅ Verify: AI correctly parsed natural language
```

**Scenario 2: Quick Save**
```
1. Guest user clicks heart icon on listing
2. Verify toast: "Saved! Sign in to sync across devices."
3. Verify heart icon fills (isSaved = true)
4. Refresh page → verify still saved (localStorage persistence)
✅ Verify: Local storage save for guest users
```

**Scenario 3: Infinite Scroll**
```
1. Scroll to bottom of results
2. Click "Load More"
3. Verify 20 more items appended
4. Verify no duplicates
✅ Verify: Offset pagination working correctly
```

---

## Troubleshooting

### Issue 1: No Results Despite Filters

**Check**:
```sql
SELECT COUNT(*) FROM listings
WHERE status = 'published'
  AND subjects @> ARRAY['Mathematics']
  AND levels @> ARRAY['GCSE'];
```

**Fix**: Verify listings exist with matching subjects/levels AND status='published'

### Issue 2: AI Search Not Parsing Correctly

**Check**: Gemini API response in browser console
```typescript
console.log('Parsed query:', parsed);
```

**Fix**:
- Verify Gemini API key is set in `.env`
- Check API rate limits
- Review prompt template in `lib/services/gemini.ts`

### Issue 3: Save Icon Not Updating

**Check**: Browser console for API errors
```typescript
const result = await quickSaveItem({ listingId });
console.log('Save result:', result);
```

**Fix**:
- Verify user is authenticated (or guest mode enabled)
- Check wiselist_items table for insert
- Verify RLS policies allow insert

---

## Related Documentation

- [Listings Solution Design](../listings/listings-solution-design.md) - Service offerings architecture
- [Wiselists Solution Design](../wiselists/wiselists-solution-design.md) - Save functionality
- [AI Search Design](../ai-search/ai-search-solution-design.md) - Natural language parsing
- [Match Scoring Design](../match-scoring/match-scoring-solution-design.md) - Personalization algorithm

---

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-12 | v5.9 | Free Help Priority badge |
| 2025-12-10 | v5.8 | AI Natural Language Search (Gemini) |
| 2025-12-08 | v5.7 | Match Scoring Algorithm |
| 2025-12-05 | v5.6 | Wiselist Quick-Save Integration |
| 2025-12-01 | v5.5 | Semantic Search Phase 1 (Embeddings) |
| 2025-11-28 | v5.4 | Role-Based Homepage Variants |
| 2025-11-25 | v5.3 | Advanced Filters Drawer |
| 2025-11-20 | v5.0 | Unified Profile + Listing Search |

---

**Last Updated**: 2025-12-12
**Version**: v5.9 (Free Help Priority)
**Architecture**: Client-Side Rendered Discovery Hub
**Status**: Active - 95% Complete
**For Questions**: See [marketplace-implementation.md](./marketplace-implementation.md)
