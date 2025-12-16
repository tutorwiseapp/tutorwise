# Marketplace

**Status**: Active
**Last Code Update**: 2025-12-12
**Last Doc Update**: 2025-12-14
**Priority**: Critical (Tier 1 - Core Discovery Engine)
**Architecture**: Client-Side Rendered Discovery Hub with AI Search

---

## Quick Links

- [Solution Design v2](./marketplace-solution-design-v2.md) - Complete architecture, 8 system integrations
- [Implementation Guide v2](./marketplace-implementation-v2.md) - Developer guide with code examples
- [AI Prompt Context v2](./marketplace-prompt-v2.md) - AI assistant guide

---

## How to Navigate This Documentation

### 📖 For Product Managers (20-30 min read)

**Read in this order**:
1. This README (overview + key features)
2. [Solution Design v2](./marketplace-solution-design-v2.md) sections:
   - Executive Summary
   - Business Impact
   - System Integrations
   - Future Roadmap

**You'll learn**:
- Why marketplace is the core discovery engine for the platform
- AI search business value (reduced search friction)
- 8 system integrations and their impact
- Personalization approach and benefits

---

### 💻 For Backend Engineers (1-2 hour read)

**Read in this order**:
1. This README (overview + component architecture)
2. [Solution Design v2](./marketplace-solution-design-v2.md) sections:
   - System Architecture
   - Database Tables + Indexes
   - API Endpoints (8 endpoints)
   - Performance Optimization
3. [Implementation Guide v2](./marketplace-implementation-v2.md) sections:
   - Query Patterns
   - Performance Best Practices
   - Common Pitfalls & Solutions

**You'll learn**:
- Parallel query architecture (`Promise.all()`)
- GIN index optimization (10x performance)
- Smart interleaving algorithm
- AI search integration (Gemini API)

---

### 🎨 For Frontend Engineers (45 min read)

**Read in this order**:
1. This README (component architecture + workflows)
2. [Implementation Guide v2](./marketplace-implementation-v2.md) sections:
   - Component Patterns
   - State Management
   - Infinite Scroll Implementation
3. [AI Prompt v2](./marketplace-prompt-v2.md) sections:
   - Component Quick Reference
   - DO's and DON'Ts

**You'll learn**:
- 15 marketplace components
- Client-side state management patterns
- Infinite scroll pagination
- Quick-save wiselist integration

---

### 🤖 For AI Assistants (10-15 min read)

**Read**:
1. [AI Prompt v2](./marketplace-prompt-v2.md) - Complete quick reference

**You'll learn**:
- 8 API endpoints with examples
- Component architecture
- Key workflows (AI search, filters, infinite scroll)
- DO/DON'T code patterns

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
- **GIN Indexes**: Fast array searches for subjects/levels (10x performance)
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
- **File**: `apps/web/src/app/marketplace/page.tsx`
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
- Primary Key: `id` (UUID)
- Foreign Keys: `profile_id` → profiles
- Array Columns (GIN indexed): `subjects[]`, `levels[]`, `languages[]`
- Status Types: 'draft', 'published', 'unpublished'
- Location Types: 'online', 'in_person', 'hybrid'
- Category Types: 'session', 'course', 'job'
- Semantic Search: `embedding` (JSONB) for vector embeddings
- Cached Metrics: `view_count`, `inquiry_count`, `booking_count`, `average_rating`, `review_count`

**profiles** - Tutor profiles
- Primary Key: `id` (UUID)
- Role Types: 'tutor', 'client', 'agent'
- Verification Flags: `identity_verified`, `dbs_verified`
- Cached Metrics: `average_rating`, `total_reviews`

**wiselist_items** - Saved listings
- Unique Constraint: `(user_id, listing_id)` prevents duplicate saves
- Foreign Keys: `user_id`, `listing_id`, `wiselist_id`

**saved_searches** - User filter presets
- Stores JSONB filter state for re-execution
- User-specific saved search queries

### Performance Indexes

**GIN Indexes** (Critical for array searches):
- `idx_listings_subjects` - 10x faster subject filtering
- `idx_listings_levels` - 10x faster level filtering
- `idx_listings_fts` - Full-text search on title/description
- `idx_listings_embedding` - Vector similarity search

**Partial Indexes** (60% smaller index size):
- `idx_listings_published_at WHERE status = 'published'`
- `idx_listings_price WHERE status = 'published'`
- `idx_listings_location WHERE status = 'published'`

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

User clicks "Advanced Filters" → Drawer opens → Select filters → Click "Apply" → State updates → Execute search with new filters → Display updated results

### 3. Infinite Scroll Load More Flow

User scrolls to bottom → Click "Load More" → Set loading state → Fetch next 20 items (offset += 20) → Append to existing items → Update hasMore flag → Display additional items

### 4. Quick Save Flow

Click heart icon → Call quickSaveItem API → Toggle save state in DB → Update UI state → Show toast notification (guest: "Sign in to sync", authenticated: "Saved to My Saves!")

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

See [marketplace-solution-design-v2.md](./marketplace-solution-design-v2.md) for detailed integration documentation.

---

## Performance Metrics

**Current Performance**:
- Initial load: ~800ms (parallel profile + listing queries)
- AI search parsing: ~300ms (Gemini API call)
- Filter execution: ~200ms (GIN-indexed queries)
- Load more: ~150ms (DB query only)

**Optimization Techniques**:
- Parallel API calls (`Promise.all([profiles, listings])`) - 50% faster
- GIN indexes for array searches - 10x faster than LIKE queries
- Full-text search indexes - Instant results vs sequential scans
- Pagination (20 items per page) - Reduces transfer size by 95%
- Image lazy loading (Next.js Image component) - 70% less initial payload
- Infinite scroll - No page reloads

---

## Security

### RLS Policies

**listings** table:
- Public users can SELECT only where `status = 'published'`
- Users can view own listings (any status)

**wiselist_items** table:
- Users can only INSERT/SELECT/DELETE own saved items

### Input Validation

All API endpoints validate query parameters with Zod schemas:
- Subjects/levels must be from predefined enum lists
- Price range: 0-500 (prevents absurd queries)
- Offset ≥ 0, limit 1-100 (prevents abuse)
- Invalid inputs return 400 Bad Request before hitting database

---

## Testing

### Manual Test Scenarios

**AI Search Test**:
1. Type "GCSE Maths tutor online"
2. Verify filters auto-populate: Subjects=Mathematics, Levels=GCSE, Location=online
3. Verify results show only matching listings
4. ✅ Expected: AI correctly parsed natural language

**Quick Save Test**:
1. Guest user clicks heart icon on listing
2. Verify toast: "Saved! Sign in to sync across devices."
3. Verify heart icon fills (isSaved = true)
4. Refresh page → verify still saved (localStorage persistence)
5. ✅ Expected: Local storage save for guest users

**Infinite Scroll Test**:
1. Scroll to bottom of results
2. Click "Load More"
3. Verify 20 more items appended
4. Verify no duplicates
5. ✅ Expected: Offset pagination working correctly

---

## Troubleshooting

### Issue 1: No Results Despite Filters

**Check**: Verify listings exist with matching filters AND `status='published'`

**SQL Diagnostic**:
```sql
SELECT COUNT(*) FROM listings
WHERE status = 'published'
  AND subjects @> ARRAY['Mathematics']
  AND levels @> ARRAY['GCSE'];
```

---

### Issue 2: AI Search Not Parsing Correctly

**Check**: Gemini API response in browser console (look for `parsed` object)

**Common Fixes**:
- Verify `GEMINI_API_KEY` is set in `.env`
- Check Gemini API rate limits (1000 requests/day free tier)
- Review prompt template in `apps/web/src/lib/services/gemini.ts`

---

### Issue 3: Save Icon Not Updating

**Check**: Browser console for API errors

**Common Fixes**:
- Verify user is authenticated OR guest mode enabled in localStorage
- Check `wiselist_items` table for successful insert
- Verify RLS policies allow insert for current user

---

## Related Documentation

- [Wiselists Solution Design v2](../wiselists/wiselists-solution-design-v2.md) - Save & share functionality
- [CaaS Solution Design v5.5](../caas/caas-solution-design-v2.md) - Credibility scoring system

**Related Features** (documentation pending v2 updates):
- Listings - Service offerings architecture
- AI Search - Natural language parsing (Gemini API)
- Match Scoring - Personalization algorithm

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

**Last Updated**: 2025-12-14
**Version**: v5.9 (Free Help Priority)
**Architecture**: Client-Side Rendered Discovery Hub
**Status**: ✅ Active - 95% Complete
**For Questions**: See [marketplace-implementation-v2.md](./marketplace-implementation-v2.md)
