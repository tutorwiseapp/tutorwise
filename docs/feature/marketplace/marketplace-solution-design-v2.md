# Marketplace Feature - Solution Design v5.9

**Version**: v5.9
**Date**: 2025-12-14
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

- **Discovery Efficiency**: AI search significantly reduces search time by parsing natural language into structured filters
- **Conversion Rate**: Unified search (profiles + listings) provides more discovery paths compared to listing-only search
- **User Engagement**: Interleaved results improve tutor profile visibility compared to listings-only display
- **Personalization**: Match scoring helps clients identify better-fit tutors based on learning preferences
- **Mobile Usage**: Responsive design ensures marketplace works across all device sizes

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

**Why AI Parsing?**

Traditional keyword search requires users to understand exact filter terminology and manually select multiple dropdown menus. AI parsing allows natural queries like "affordable GCSE Maths tutor near me" to automatically extract:
- Subject: Mathematics
- Level: GCSE
- Price preference: Lower hourly rates prioritized
- Location: User's city (if authenticated) or "online" fallback

This reduces the number of user actions from 6+ filter selections to a single search query.

**How It Works**:

The Gemini API receives a system prompt defining our filter schema and examples, then parses the user's query into structured JSON.

**System Prompt Structure**:
- Defines available subjects (Mathematics, English, Science, etc.)
- Defines education levels (GCSE, A-Level, Primary, etc.)
- Defines location types (online, in_person, hybrid)
- Provides 10+ example query → filter mappings
- Includes confidence scoring (0-1) for parse quality

**Example Transformations**:

| User Query | Parsed Filters |
|------------|----------------|
| "GCSE Maths tutor" | subjects: ["Mathematics"], levels: ["GCSE"] |
| "Online piano lessons £30/hr" | subjects: ["Music"], location_type: "online", min_price: 30, max_price: 30 |
| "Science tutor for 7 year old" | subjects: ["Science"], levels: ["Primary"] (inferred from age) |
| "Cheap French lessons" | subjects: ["French"], max_price: 25 (AI infers "cheap" threshold) |

**Fallback Parser**:

When Gemini API fails (timeout, rate limit, network error), a regex-based keyword extractor handles basic queries:
- Keyword dictionary: "math" → "Mathematics", "gcse" → "GCSE", etc.
- Price regex: `£?(\d+)\s*(?:-|to)\s*£?(\d+)` extracts ranges
- Location keywords: "online", "in person", "remote" → location_type mapping

Fallback parser confidence: ~60% vs Gemini's ~95%, but ensures search always works.

**API Endpoint**: `POST /api/search/parse`

**Implementation Reference**: `apps/web/src/lib/services/gemini.ts:51-164`

---

### 2. **Listings Integration**

**Purpose**: Search and filter service offerings with GIN-indexed queries

**Why GIN Indexes?**

Listings have array columns (`subjects[]`, `levels[]`) that need fast containment queries. Traditional B-tree indexes don't support array operations efficiently.

**Performance Comparison**:

| Query Type | Without GIN Index | With GIN Index | Improvement |
|------------|-------------------|----------------|-------------|
| `subjects @> ARRAY['Mathematics']` | 450ms (seq scan) | 45ms (index scan) | **10x faster** |
| `levels @> ARRAY['GCSE']` | 380ms | 38ms | **10x faster** |

**GIN Index Commands**:
```sql
CREATE INDEX idx_listings_subjects ON listings USING GIN(subjects);
CREATE INDEX idx_listings_levels ON listings USING GIN(levels);
```

**Query Structure**:

Listings API accepts URL query parameters and builds a filtered PostgreSQL query:

**API Endpoint**: `GET /api/marketplace/search`

**Query Parameters**:
- `subjects`: Comma-separated ("Mathematics,Physics")
- `levels`: Comma-separated ("GCSE,A-Level")
- `location_type`: 'online' | 'in_person' | 'hybrid'
- `location_city`: City name string
- `min_price`, `max_price`: Numeric hourly rate range
- `free_trial_only`: Boolean filter
- `listing_category`: 'session' | 'course' | 'job'
- `semantic`: Boolean (use vector search instead of traditional)
- `offset`, `limit`: Pagination controls

**Database Query Logic**:

The backend builds a dynamic WHERE clause based on provided filters:
- Subject/level filters use `@>` operator (GIN index scan)
- Price uses `BETWEEN` operator (range scan)
- Location uses equality match on indexed column
- Status always filtered to `published` only (security)

**Join with Profiles**:

Every listing query joins with `profiles` table to include tutor verification badges (identity_verified, dbs_verified) for display on cards.

**Semantic Search Mode**:

When `semantic=true`, the system:
1. Generates embedding vector for search query text
2. Fetches listings with pre-calculated embeddings
3. Calculates cosine similarity for each listing
4. Sorts by similarity score (descending)
5. Applies traditional filters as post-filter

**Cosine Similarity Formula**:
```
similarity = dot_product(query_vector, listing_vector) /
             (norm(query_vector) * norm(listing_vector))
```

This enables intent-based matching: "help struggling student" matches listings emphasizing patience/support even if they don't mention "struggling".

**Response Format**:

Returns array of listings with nested profile data, plus total count for pagination UI.

**Implementation Reference**:
- Traditional search: `apps/web/src/app/api/marketplace/search/route.ts:23-155`
- Semantic search: `apps/web/src/app/api/marketplace/search/route.ts:156-254`

---

### 3. **Profiles Integration**

**Purpose**: Fetch tutor profiles with aggregated listing data

**Why Aggregate Listings?**

Profile cards display summary data (subjects taught, price range, listing count). Instead of N+1 queries, we aggregate all published listings per profile in a single query.

**Data Aggregation Pattern**:

The profiles API performs a `GROUP BY` query that:
1. Joins profiles with their published listings
2. Aggregates all subjects into a unique set
3. Aggregates all levels into a unique set
4. Calculates min/max hourly rates across listings
5. Counts total listings

**Example Aggregation**:

**Tutor has 3 listings**:
- Listing 1: Mathematics (GCSE), £25/hr, online
- Listing 2: Mathematics (A-Level), £35/hr, online
- Listing 3: Physics (GCSE), £30/hr, hybrid

**Aggregated Profile Data**:
- subjects: ["Mathematics", "Physics"]
- levels: ["GCSE", "A-Level"]
- location_types: ["online", "hybrid"]
- min_hourly_rate: £25
- max_hourly_rate: £35
- listing_count: 3

**Display on Profile Card**:
- "Teaches Mathematics, Physics"
- "GCSE & A-Level"
- "£25-35/hr"
- "3 listings"

**API Endpoint**: `GET /api/marketplace/profiles`

**Query Parameters**:
- `offset`, `limit`: Pagination (default 10 per page)
- Future: Subject/level filters for profile search

**Why Profiles in Marketplace?**

Profiles provide a "browse tutor first" path vs "find specific listing" path. Users can:
1. Click profile to see tutor's full bio + all listings
2. Explore tutor's qualifications before choosing a specific service
3. Message tutor directly from profile page

This "people-first" discovery complements listing-focused search, providing an alternative browsing path for users who prefer to explore tutors before viewing specific services.

**Implementation Reference**: `apps/web/src/app/api/marketplace/profiles/route.ts:23-88`

---

### 4. **Wiselists Integration** (Quick Save)

**Purpose**: One-click save/unsave listings to default "My Saves" wiselist

**Why Quick Save?**

Traditional "add to favorites" flows require:
1. Click save button
2. Modal opens with wiselist picker
3. Select wiselist
4. Confirm

This 4-step process has higher friction and cognitive load. Quick save reduces to 1 click:
1. Click heart icon → saved to default wiselist → toast confirmation

**The Default Wiselist Pattern**:

Every user automatically gets a "My Saves" wiselist (created on signup):
- `is_default = true` flag in `wiselists` table
- Acts as implicit save target for quick-save action
- Users can organize into custom wiselists later

**Toggle Behavior**:

The API checks if listing is already saved:
- **If saved**: Delete from wiselist_items → show "Removed" toast
- **If not saved**: Insert into wiselist_items → show "Saved" toast

This idempotent toggle UX matches familiar patterns (Twitter likes, Instagram saves).

**Guest User Handling**:

Anonymous users can still quick-save:
- Saves to `localStorage` with key `wiselist_temp_items`
- Toast shows: "Saved! Sign in to sync across devices."
- On signup/login: Middleware migrates localStorage saves to database

**Optimistic UI Updates**:

Frontend immediately updates heart icon (filled/unfilled) before API call completes. If API fails, icon reverts with error toast. This prevents perceived lag.

**API Endpoint**: `POST /api/wiselists/quick-save`

**Request Body**:
```
{ listingId: "uuid" }
```

**Response**:
```
{ saved: true } or { saved: false }
```

**Implementation Reference**:
- Backend: `apps/web/src/app/api/wiselists/quick-save/route.ts`
- Frontend: `apps/web/src/app/components/feature/marketplace/MarketplaceListingCard.tsx:85-109`

---

### 5. **Bookings Integration** (Instant Book)

**Purpose**: Direct booking links on listing cards

**The Instant Book Flow**:

1. User clicks "Instant Book" button on MarketplaceListingCard
2. Navigate to `/listings/{id}/{slug}?action=book`
3. Listing detail page detects `?action=book` query param
4. Auto-opens booking modal with pre-filled data:
   - Selected listing (locked, non-editable)
   - Hourly rate from listing
   - Subject/level from listing metadata
5. User completes session details (date, time, duration)
6. Proceeds to payment → booking confirmation

**Why Direct Links?**

Traditional flow: Marketplace → Listing Detail → Click Book Button → Modal Opens (3 clicks)

Instant book: Marketplace → Modal Opens (1 click, via URL param)

This reduces booking funnel steps and friction for users ready to book immediately.

**Link Format**:

All marketplace listing cards render:
```
<Link href={`/listings/${listing.id}/${listing.slug}?action=book`}>
  Instant Book
</Link>
```

The `?action=book` query param is the trigger signal for auto-opening modal on page load.

**Implementation Reference**:
- Link: `apps/web/src/app/components/feature/marketplace/MarketplaceListingCard.tsx`
- Modal trigger: `apps/web/src/app/(authenticated)/listings/[id]/[slug]/page.tsx`

---

### 6. **Analytics Integration**

**Purpose**: Track search queries, filters, clicks for marketplace insights

**Events Tracked**:

1. **Search Query**: Query text, AI parse result, filter values, result count
2. **Filter Change**: Which filters changed, new values, result count change
3. **Listing Click**: Listing ID, position in results, search context
4. **Profile Click**: Profile ID, position in results
5. **Load More**: Offset value, items loaded
6. **Quick Save**: Listing ID, save vs unsave action

**Why Track Position in Results?**

Position data reveals:
- Are lower-ranked items getting any clicks? (If no, ranking algorithm may be too strong)
- Do users browse deeply or only click top 3? (Informs pagination strategy)
- Which listing attributes correlate with clicks at different positions?

**Implementation Pattern**:

All analytics events use `fetch('/api/analytics/event')` with structured payload. Backend stores in `analytics_events` table with JSONB metadata column for flexible querying.

**Dashboard Metrics**:

Product team queries analytics for:
- Top 20 search queries (last 7 days) → informs feature priorities
- Most clicked listings → highlights successful tutor profiles for case studies
- Average filters per search → complexity metric (target: 2-3 active filters)
- Search → booking conversion rate → primary success metric (currently 4.1%)

**Implementation Reference**: Various `fetch('/api/analytics/*')` calls throughout marketplace components

---

### 7. **CaaS Integration** (Verification Badges)

**Purpose**: Display verification badges on listing/profile cards

**Verification Types**:

1. **identity_verified**: Government ID verified (passport, driver's license)
   - Trust & Safety team manually reviews ID photo + selfie match
   - Prevents identity theft and fake accounts

2. **dbs_verified**: DBS background check (UK safeguarding)
   - Disclosure and Barring Service check for criminal records
   - Required for tutors working with under-18 students in person

**Display Logic**:

Listing/profile cards show green shield icons when verification flags are true. Icons appear as centered overlay on card image with tooltip on hover.

**Why This Integration Matters**:

Verification badges serve as trust signals, reducing perceived risk for first-time clients who lack direct experience with the tutor. The visible badges help clients quickly identify tutors who have completed identity and background verification processes.

**Badge Position**: Center overlay on card image (white stroke green shield SVG)

**Tooltip Text**:
- identity_verified: "Government ID Verified"
- dbs_verified: "DBS Background Check Completed"

**Implementation Reference**: `apps/web/src/app/components/feature/marketplace/MarketplaceListingCard.tsx:148-181`

---

### 8. **Match Scoring Integration**

**Purpose**: Personalize search results based on client learning preferences

**The Match Percentage Algorithm**:

For authenticated clients with learning preferences, the system calculates 0-100% match score for each listing.

**Scoring Formula** (v1):

```
Total Score (0-100) = Subject Match (40%) + Level Match (30%)
                      + Location Match (20%) + Price Match (10%)
```

**Component Breakdown**:

| Component | Points | Criteria |
|-----------|--------|----------|
| Subject Match | 0-40 | Any overlap between listing.subjects and client.preferred_subjects |
| Level Match | 0-30 | Listing teaches client's current_level |
| Location Match | 0-20 | Listing.location_type matches client.preferred_location_type |
| Price Match | 0-10 | Listing.hourly_rate ≤ client.max_hourly_rate budget |

**Worked Example**:

**Client Profile**:
- preferred_subjects: ["Mathematics", "Physics"]
- current_level: "GCSE"
- preferred_location_type: "online"
- max_hourly_rate: £40

**Listing A**:
- subjects: ["Mathematics"]
- levels: ["GCSE", "A-Level"]
- location_type: "online"
- hourly_rate: £35

**Match Score Calculation**:
- Subject match: ✅ Mathematics overlaps → **40 points**
- Level match: ✅ Teaches GCSE → **30 points**
- Location match: ✅ Online matches preference → **20 points**
- Price match: ✅ £35 ≤ £40 budget → **10 points**
- **Total: 100% match** (perfect fit)

**Listing B**:
- subjects: ["French"]
- levels: ["GCSE"]
- location_type: "online"
- hourly_rate: £35

**Match Score Calculation**:
- Subject match: ❌ French not in preferences → **0 points**
- Level match: ✅ Teaches GCSE → **30 points**
- Location match: ✅ Online matches → **20 points**
- Price match: ✅ Within budget → **10 points**
- **Total: 60% match** (decent alternative)

**Display**:

Match score appears as colored badge on listing card:
- 85-100%: Green "95% Match" badge
- 70-84%: Yellow "78% Match" badge
- Below 70%: No badge shown (avoid highlighting poor matches)

Tooltip on hover shows reasons:
- "Teaches Mathematics • Teaches GCSE • Offers online sessions • Within your budget"

**Ranking Impact**:

For authenticated clients, search results sort by match score (descending) instead of published_at. This personalization helps surface better-fit tutors earlier in search results.

**Implementation Reference**: `apps/web/src/lib/services/match-scoring.ts`

---

## Database Schema

### Core Tables

**listings** (Primary Search Target)

Key design decisions:
- `subjects[]` and `levels[]` as TEXT arrays (not foreign keys) for flexible querying with GIN indexes
- `status` enum controls visibility (only 'published' appear in search)
- `embedding` JSONB column stores 768-dimension vector for semantic search
- Cached aggregates (average_rating, review_count) avoid JOIN overhead on every search

Indexes:
- GIN on `subjects` and `levels` for array containment queries (10x performance)
- Partial index on `published_at WHERE status = 'published'` (60% smaller index size)
- Full-text search index on `title || description` for keyword search fallback
- GIN on `embedding` for vector similarity search

RLS Policies:
- Public users can SELECT only where `status = 'published'`
- Profile owners can SELECT own listings (any status)

**profiles** (Tutor Search Target)

Key fields:
- `active_role` determines user type (tutor/client/agent)
- `identity_verified` and `dbs_verified` for verification badges
- `learning_preferences` JSONB stores match scoring criteria for clients

**wiselist_items** (Saved Listings)

Unique constraint on `(user_id, listing_id)` prevents duplicate saves.

RLS ensures users can only access own saved items.

**saved_searches** (Filter Presets)

`filters` JSONB column stores full SearchFilters object for re-execution. Unique constraint on `(user_id, name)` prevents duplicate preset names.

---

## Performance Optimization

### 1. Parallel Queries (50% Faster Initial Load)

**Problem**: Sequential API calls for profiles then listings took 1600ms total.

**Solution**: `Promise.all()` executes both fetches simultaneously.

**Result**: 800ms total (limited by slowest query, not sum of both).

### 2. GIN Indexes (10x Faster Array Searches)

**Problem**: Array containment queries (`subjects @> ARRAY['Mathematics']`) required sequential scans.

**Solution**: GIN indexes on array columns enable index scans.

**Result**: 45ms vs 450ms for typical subject filter.

### 3. Pagination (Prevents Large Data Transfers)

**Problem**: Fetching all 10,000 listings took 2000ms and transferred 15MB.

**Solution**: LIMIT 20 OFFSET 0 pattern with infinite scroll.

**Result**: 200ms for 20 items, ~50KB transfer per page.

### 4. Image Lazy Loading

**Problem**: All 20 card images loaded immediately, blocking page render.

**Solution**: `loading="lazy"` attribute on Image components.

**Result**: Only visible images load initially, reducing initial payload by 70%.

### 5. useCallback for Expensive Functions

**Problem**: executeSearch function recreated on every render, causing unnecessary re-renders.

**Solution**: Wrap in `useCallback` with dependencies array.

**Result**: Function only recreates when filters change, preventing render cascade.

---

## Security & Privacy

### RLS Policies

**listings** table:
- Public can only view published listings (prevents draft leakage)
- Users can view own listings (any status) for editing

**wiselist_items** table:
- Users can only access own saved items (prevents snooping on others' saves)

### Input Validation

All API endpoints validate query parameters with Zod schemas:
- `subjects`, `levels`: Must be from predefined enum lists
- `min_price`, `max_price`: Must be 0-500 range (prevents absurd queries)
- `offset`, `limit`: Offset ≥ 0, limit 1-100 (prevents abuse)

Invalid inputs return 400 Bad Request before hitting database.

---

## Testing Checklist

- [ ] **AI Search**: Type "GCSE Maths online" → verify filters populate correctly
- [ ] **Parallel Queries**: Network tab shows 2 simultaneous requests on page load
- [ ] **Interleaving**: Results alternate profiles/listings (not all listings then all profiles)
- [ ] **Quick Save**: Click heart → toast shows, icon fills, click again → unfills
- [ ] **Load More**: Click button → 20 more items append, no duplicates in list
- [ ] **Advanced Filters**: Open drawer, select filters, apply → results update
- [ ] **Mobile Grid**: Resize to mobile → 1-column layout, cards full-width
- [ ] **Instant Book**: Click "Instant Book" → navigate to listing detail with `?action=book`
- [ ] **Guest Access**: Logout → marketplace still works (no auth errors)
- [ ] **Performance**: Initial load < 1s, filter change < 300ms

---

## Design Decisions

### Why Interleave Profiles and Listings?

**Decision**: Alternate profiles/listings in search results instead of showing all listings first.

**Alternatives Considered**:
1. **Listings-only view**: Simpler implementation, but hides tutor discovery path
2. **Separate tabs**: "Listings" vs "Profiles" tabs, but increases clicks to explore both
3. **Listings-first, profiles-last**: Easier to implement, but profiles get buried

**Why Interleaving Won**:
- Users discover tutors they wouldn't have explored in a listings-only view
- Alternating pattern provides variety, keeping page visually interesting
- Doesn't penalize either item type (fair visibility)
- Provides multiple discovery paths (service-first vs tutor-first)

### Why Client-Side Rendering Instead of SSR?

**Decision**: Marketplace page is a client component with local state management.

**Alternatives Considered**:
1. **Server-side rendering (SSR)**: Better SEO, faster initial paint
2. **Static site generation (SSG)**: Fastest loads, but can't personalize
3. **Hybrid (SSR + client hydration)**: Best of both, but complex

**Why Client-Side Won**:
- Frequent state changes (filters, pagination, quick-save) need instant UI updates
- Personalization (match scoring, role-based homepages) requires user context
- Search is interactive tool, not content page (SEO less critical than app speed)
- Parallel queries on mount still achieve ~800ms initial load (acceptable)

### Why Provisional Score for New Tutors?

**Decision**: New tutors with 0 sessions get full 30/30 performance points provisionally.

**The Problem**:
Without provisional scoring, new tutors with strong qualifications (Masters degree, 15 years experience) would score 0 in performance bucket due to no reviews, making them invisible in search despite being potentially excellent tutors.

**Why This Works**:
- New tutors get fair visibility initially (appear in search results)
- Must earn their score through real performance after first few bookings
- Prevents permanent disadvantage for late-joining tutors
- Aligns with CaaS "fair cold start" principle

---

## Gap Analysis

### Current Limitations

1. **Saved Searches Execution**: UI exists but backend incomplete (can't re-run saved filter sets)
2. **Match Scoring v2**: Current algorithm is basic (4 factors only), planned expansion to 10+ signals
3. **Real-Time Availability**: No live availability indicators (planned: green "Available Now" badge)
4. **Video Previews**: No hover video for listings (planned: 15s intro clips)
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
- [Marketplace Implementation v2](./marketplace-implementation-v2.md) - Developer guide
- [Marketplace Prompt v2](./marketplace-prompt-v2.md) - AI assistant context
- [Listings Solution Design](../listings/listings-solution-design.md) - Service offerings
- [Wiselists Solution Design v2](../wiselists/wiselists-solution-design-v2.md) - Save functionality
- [CaaS Solution Design v2](../caas/caas-solution-design-v2.md) - Verification system

---

**Last Updated**: 2025-12-14
**Version**: v5.9 (Free Help Priority)
**Maintainer**: Marketplace Team
**Status**: Active - 95% Complete
**For Questions**: See [marketplace-implementation-v2.md](./marketplace-implementation-v2.md)
