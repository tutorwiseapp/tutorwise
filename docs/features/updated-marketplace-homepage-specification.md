# Marketplace Homepage - Updated Specification

**Last Updated:** October 5, 2025
**Status:** Design Complete - Ready for Implementation
**Sources:** Roadmap (Section 5.3.3 Search and Filters) + Figma Design + Airbnb/Superprof Patterns

**Latest Changes (Oct 5):**
- ✅ Aligned with "editable template + duplicate" architecture for listing creation
- ✅ "Create Listing" CTAs now use template-based flow (see Listing Management spec)

---

## Executive Summary

The Marketplace Homepage is the **primary entry point** for discovery. It connects:
- **Search & Filters** (user intent)
- **Listings** (supply & demand)
- **Matching Engine** (AI + rules)
- **Profiles** (trust & identity)

**Inspired by:**
- **Airbnb** → Visual cards, powerful filters, instant search
- **Superprof** → Education-specific taxonomy, tutor discovery
- **Upwork** → Dual marketplace (supply + demand)

**Key Principle:** The homepage serves **all user types** (clients finding tutors, tutors finding clients, agents promoting services).

---

## Homepage Architecture

### Three Homepage Variants

| User Type | Default View | CTA | URL |
|-----------|--------------|-----|-----|
| **Logged Out** | Browse tutor listings (supply) | "Request Lessons" or "Sign Up" | `/` |
| **Client** | Browse tutor listings + agent listings (jobs, sessions, courses) | "Request Lessons" (quick) | `/home` |
| **Tutor** | Browse client requests + agent listings (jobs, sessions, courses) | "Create Service Listing" | `/home` |
| **Agent** | Browse all marketplace activity (supply + demand) | "Post Job / Session / Course" | `/home` |

**Smart Routing:**
```typescript
// Middleware logic
if (!user) return '/'; // Public marketplace
if (user.primary_role === 'client') return '/home?view=all'; // Tutors + agent services
if (user.primary_role === 'tutor') return '/home?view=opportunities'; // Requests + agent jobs
if (user.primary_role === 'agent') return '/home?view=marketplace'; // Full marketplace
```

---

## 1. Logged Out Homepage (Public Marketplace)

**Route:** `/`

**Purpose:** SEO landing page + tutor discovery for visitors

### Visual Structure

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo] Tutorwise         [Find Tutors] [Become a Tutor] [Login]│
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│           Find the perfect tutor for your needs                 │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ 🔍 Search: "GCSE Maths tutor in London"              [→]│  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   Or browse by:                                                 │
│   [📚 GCSE] [📖 A-Level] [🎓 University] [👶 Primary]          │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│  FEATURED TUTORS                                    [View All →]│
├────────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │ [Avatar]  │  │ [Avatar]  │  │ [Avatar]  │  │ [Avatar]  │   │
│  │ Sarah K.  │  │ John L.   │  │ Emma T.   │  │ David M.  │   │
│  │ GCSE Maths│  │ A-Level   │  │ Primary   │  │ GCSE Sci  │   │
│  │ ⭐ 4.9    │  │ Physics   │  │ English   │  │ ⭐ 4.8    │   │
│  │ £45/hr    │  │ ⭐ 5.0    │  │ ⭐ 4.7    │  │ £40/hr    │   │
│  │ [View]    │  │ £60/hr    │  │ £35/hr    │  │ [View]    │   │
│  └───────────┘  │ [View]    │  │ [View]    │  └───────────┘   │
│                 └───────────┘  └───────────┘                   │
├────────────────────────────────────────────────────────────────┤
│  POPULAR SUBJECTS                                               │
├────────────────────────────────────────────────────────────────┤
│  [Mathematics] [English] [Sciences] [Languages] [Music] [...]  │
├────────────────────────────────────────────────────────────────┤
│  HOW IT WORKS                                                   │
│  1. Search for tutors  2. Compare & message  3. Book sessions  │
└────────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Hero Search Bar:**
   - Natural language input
   - Auto-suggestions (subjects, locations, tutor names)
   - Instant results on type

2. **Quick Filters (Level Badges):**
   - One-click filter by education level
   - GCSE, A-Level, Primary, etc.

3. **Featured Tutors:**
   - Top-rated tutors (algorithmic + curated)
   - Shows avatar, name, subject, rating, rate
   - Click → View full tutor profile

4. **Popular Subjects:**
   - Category browse (Mathematics, Sciences, etc.)
   - Click → Filtered search results

5. **Trust Signals:**
   - "1,247 qualified tutors"
   - "15,642 lessons delivered"
   - "4.8★ average rating"

---

## 2. Client Homepage (Tutor & Service Discovery)

**Route:** `/home?view=all` (default for clients)

**Purpose:** Help clients find tutors, group sessions, courses, and other educational services

### Visual Structure

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo] Tutorwise    [Dashboard] [Messages] [Account] [Avatar] │
├────────────────────────────────────────────────────────────────┤
│  👋 Welcome back, Mike!                                         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🚀 Quick Action: Request Lessons                        │   │
│  │ Tell us what you need, we'll find matches               │   │
│  │ [Request Lessons Now →]                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│  VIEW: [🏠 All] [🎓 Tutors] [👥 Sessions] [📖 Courses]         │
├────────────────────────────────────────────────────────────────┤
│  FILTERS                                    🔍 Search: [______]│
│  ┌─────────────────┐                                           │
│  │ Listing Type     │                                           │
│  │ ☑ Tutors         │  BROWSE ALL SERVICES          Sort: [▼]  │
│  │ ☑ Group Sessions │  ─────────────────────────────────────   │
│  │ ☑ Courses        │  ┌────────────────────────────────────┐  │
│  │                  │  │ 📚 GCSE Maths Tutoring  [Active]  │  │
│  │ Subject          │  │ Sarah K. • ⭐ 4.9 (28 reviews)     │  │
│  │ ☑ Mathematics    │  │ £45/hr • Online & In-person        │  │
│  │ ☐ English        │  │ "Experienced exam prep specialist" │  │
│  │ ☐ Sciences       │  │ Type: One-on-One Tutoring          │  │
│  │                  │  │ [View Details] [Message] [Book]    │  │
│  │ Level            │  └────────────────────────────────────┘  │
│  │ ☑ GCSE           │  ┌────────────────────────────────────┐  │
│  │ ☐ A-Level        │  │ 👥 Easter Revision Bootcamp        │  │
│  │                  │  │ TutorPro Agency • 8/15 enrolled    │  │
│  │ Format           │  │ £180/student • Apr 15-19, 2025     │  │
│  │ ☑ Online         │  │ Intensive GCSE prep • Online       │  │
│  │ ☑ In-person      │  │ Type: Group Session                │  │
│  │                  │  │ [View Details] [Enroll Now]        │  │
│  │ Budget           │  └────────────────────────────────────┘  │
│  │ £[20] - £[300]   │  ┌────────────────────────────────────┐  │
│  │ ────────────     │  │ 📖 Complete GCSE Maths Course      │  │
│  │                  │  │ LearnHub • ⭐ 4.7 (156 reviews)    │  │
│  │ Location         │  │ £299 • Self-paced • Certificate    │  │
│  │ 📍 London        │  │ 40 hours content • Lifetime access │  │
│  │ Radius: 5 miles  │  │ Type: Online Course                │  │
│  │                  │  │ [View Course] [Enroll]             │  │
│  │ [Apply Filters]  │  └────────────────────────────────────┘  │
│  └─────────────────┘  ... (more listings) ...                 │
└────────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Quick Action Card:**
   - Prominent "Request Lessons" CTA
   - One-click to open conversational wizard

2. **View Tabs:**
   - **All** → Shows tutors, group sessions, and courses (default)
   - **Tutors** → Filter to only individual tutor services
   - **Sessions** → Filter to only group sessions
   - **Courses** → Filter to only online courses

3. **Sidebar Filters:**
   - **Listing Type** (multi-select: Tutors, Group Sessions, Courses)
   - **Subject** (multi-select, canonical taxonomy)
   - **Level** (GCSE, A-Level, Primary, etc.)
   - **Format** (Online, In-person, Hybrid)
   - **Budget** (range slider: £20 - £300+)
   - **Location** (geo-radius for in-person)
   - **Availability** (calendar picker) - Phase 1

4. **Mixed Listing Types in Feed:**
   - **Tutor Services** → One-on-one tutoring from individual tutors
   - **Group Sessions** → Agent-led workshops, bootcamps, study groups
   - **Courses** → Agent-sold packaged online courses
   - All shown in unified feed with type badges

5. **Listing Cards:**
   - **Type badge** (📚 One-on-One, 👥 Group Session, 📖 Course)
   - Provider name + avatar (tutor or agency)
   - Rating + review count
   - Price + format (per hour, per student, one-time)
   - **Type indicator** in card body
   - Quick actions: View Details, Message/Enroll, Book/Request

6. **Sort Options:**
   - **Recommended** (default - AI matching score, Phase 1+)
   - Price: Low to High
   - Price: High to Low
   - Top Rated
   - Most Recent

7. **Empty State:**
   - If no agent listings in area: "No group sessions or courses found. [Request Lessons] to get matched with tutors."

---

## 3. Tutor Homepage (Client Request & Opportunity Discovery)

**Route:** `/home?view=opportunities` (default for tutors)

**Purpose:** Help tutors find client requests to respond to AND agent job opportunities

### Visual Structure

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo] Tutorwise    [Dashboard] [Messages] [Account] [Avatar] │
├────────────────────────────────────────────────────────────────┤
│  👋 Welcome back, Sarah!                                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 💡 3 new client requests match your expertise           │   │
│  │ 💼 2 new job opportunities from agencies                │   │
│  │ [View Matches →]                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│  VIEW: [🏠 All] [📖 Client Requests] [💼 Jobs] [👥 Sessions]   │
├────────────────────────────────────────────────────────────────┤
│  FILTERS                                    🔍 Search: [______]│
│  ┌─────────────────┐                                           │
│  │ Opportunity Type │                                           │
│  │ ☑ Client Requests│  OPPORTUNITIES FOR YOU    Sort: [Match ▼]│
│  │ ☑ Agent Jobs     │  ─────────────────────────────────────   │
│  │ ☑ Group Sessions │  ┌────────────────────────────────────┐  │
│  │                  │  │ 📖 GCSE Maths Exam Prep Needed     │  │
│  │ Subject          │  │ Mike Q. • Posted 2 hours ago       │  │
│  │ ☑ Mathematics    │  │ Budget: £25-30/hr • Online pref.   │  │
│  │ ☑ Physics        │  │ "Need help preparing for June      │  │
│  │ ☐ Chemistry      │  │  exams, struggling with algebra"   │  │
│  │                  │  │ 🎯 Match: 92% (your subjects +     │  │
│  │ Level            │  │    availability align)             │  │
│  │ ☑ GCSE           │  │ Type: Client Request               │  │
│  │ ☐ A-Level        │  │ [View Details] [Send Proposal]     │  │
│  │                  │  └────────────────────────────────────┘  │
│  │ Match Score      │  ┌────────────────────────────────────┐  │
│  │ ●────────        │  │ 💼 GCSE Maths Tutor - West London  │  │
│  │ 70%+             │  │ TutorPro Agency • Posted 3 days ago│  │
│  │                  │  │ £35-45/hr • Part-time • In-person  │  │
│  │ Compensation     │  │ "Looking for experienced tutor"    │  │
│  │ £[30] - £[60]    │  │ 🎯 Match: 88% (expertise matches,  │  │
│  │ ────────────     │  │    location convenient)            │  │
│  │                  │  │ Type: Agent Job                    │  │
│  │ Location         │  │ [View Job] [Apply Now]             │  │
│  │ 📍 Your area     │  └────────────────────────────────────┘  │
│  │ 10 miles         │  ┌────────────────────────────────────┐  │
│  │                  │  │ 👥 Lead Easter Revision Sessions   │  │
│  │ [Apply Filters]  │  │ LearnHub • Hiring tutors           │  │
│  └─────────────────┘  │ £50/hr • Apr 15-19 • 20 hrs total  │  │
│                        │ Group tutoring • Online platform   │  │
│                        │ 🎯 Match: 85% (subject + teaching  │  │
│                        │    style match)                    │  │
│                        │ Type: Group Session (Lead Tutor)   │  │
│                        │ [View Details] [Apply]             │  │
│                        └────────────────────────────────────┘  │
│                        ... (more opportunities) ...            │
└────────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Match Notification:**
   - Alert banner for new high-match requests AND job opportunities
   - Proactive discovery of both client requests and agent listings
   - Example: "3 new client requests + 2 new job opportunities"

2. **View Tabs:**
   - **All** → Shows client requests, agent jobs, and group sessions (default)
   - **Client Requests** → Filter to only student/parent requests
   - **Jobs** → Filter to only agent job postings
   - **Sessions** → Filter to group session teaching opportunities

3. **Sidebar Filters:**
   - **Opportunity Type** (multi-select: Client Requests, Agent Jobs, Group Sessions)
   - **Subject** (filter by what you teach)
   - **Level** (GCSE, A-Level, etc.)
   - **Match Score** threshold (70%+, 80%+, 90%+)
   - **Compensation** range (£30-£60/hr)
   - **Location** proximity (your area, 5/10/20 miles)

4. **Match Score Display:**
   - AI-computed match percentage for ALL opportunity types
   - Explainer tooltip: "Why this matches"
   - Example: "✓ Subject expertise ✓ Schedule fits ✓ Rate aligned"

5. **Mixed Opportunity Cards:**
   - **Client Request Cards:**
     - Request title + client name
     - Budget range + location + format
     - Description excerpt
     - Match score + type badge
     - Actions: View Details, Send Proposal

   - **Agent Job Cards:**
     - Job title + agency name
     - Compensation + job type + location
     - Job description excerpt
     - Match score + type badge
     - Actions: View Job, Apply Now

   - **Group Session Cards:**
     - Session title + agency name
     - Hourly rate + total hours + dates
     - Session description
     - Match score + type badge
     - Actions: View Details, Apply

6. **Type Indicator:**
   - Each card clearly shows: "Type: Client Request" / "Type: Agent Job" / "Type: Group Session"
   - Color-coded badges for quick identification

7. **Sort Options:**
   - **Best Match** (default - AI score across all types)
   - Most Recent
   - Highest Compensation
   - Closest Location

8. **Empty State:**
   - If no opportunities: "No opportunities match your filters. [Adjust filters] or [Create your own listing]"

---

## 4. Agent Homepage (Full Marketplace View)

**Route:** `/home?view=all` (default for agents)

**Purpose:** Agents see both supply (tutors to hire) and demand (client requests)

### Visual Structure

```
┌────────────────────────────────────────────────────────────────┐
│  [Logo] Tutorwise    [Dashboard] [Messages] [Account] [Avatar] │
├────────────────────────────────────────────────────────────────┤
│  👋 Welcome back, Clare (TutorPro Agency)!                      │
│                                                                 │
│  Quick Actions:                                                 │
│  [Post Job] [Create Group Session] [Sell Course] [View Stats]  │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│  VIEW: [📈 Dashboard] [📖 Client Requests] [🎓 Tutors]          │
│         [💼 Jobs] [👥 Sessions] [📚 Courses]                    │
├────────────────────────────────────────────────────────────────┤
│  MY ACTIVE LISTINGS                          [+ Create Listing]│
│  ─────────────────────────────────────────────────────────────  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 💼 GCSE Maths Tutor - West London  [Active] [35 apps] │    │
│  │ Job posting • £35-45/hr • Part-time                    │    │
│  │ [View Applications] [Edit] [Pause]                     │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ 👥 Easter Revision Bootcamp        [Active] [8/15]    │    │
│  │ Group session • £180/student • Apr 15-19               │    │
│  │ [Manage Enrollments] [Edit] [Cancel]                  │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  MARKETPLACE INSIGHTS                                           │
│  ─────────────────────────────────────────────────────────────  │
│  📊 42 new client requests this week in your specializations    │
│  🎓 18 qualified tutors available for hire in London            │
│  📈 GCSE Maths demand up 23% this month                         │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Key Features

1. **Multi-View Tabs:**
   - Dashboard (overview + quick actions)
   - Client Requests (find students)
   - Tutors (find tutors to hire)
   - Jobs (manage job postings)
   - Sessions (manage group sessions)
   - Courses (manage course listings)

2. **Quick Actions:**
   - One-click to create any listing type
   - Fast access to stats and analytics

3. **Active Listings Summary:**
   - Shows agent's own active listings
   - Application/enrollment counts
   - Quick management actions

4. **Marketplace Insights:**
   - Data-driven suggestions
   - Demand trends in agent's subjects
   - Available tutor supply

---

## Search & Filter Architecture

### Canonical Taxonomy (Critical)

**Must be defined before implementation:**

```typescript
// Subject taxonomy (simplified example)
const SUBJECTS = {
  MATHEMATICS: {
    id: 'MATHS',
    name: 'Mathematics',
    levels: ['PRIMARY', 'KS3', 'GCSE', 'A_LEVEL', 'UNIVERSITY'],
    subtopics: ['ALGEBRA', 'GEOMETRY', 'CALCULUS', 'STATISTICS']
  },
  ENGLISH: {
    id: 'ENG',
    name: 'English',
    levels: ['PRIMARY', 'KS3', 'GCSE', 'A_LEVEL'],
    subtopics: ['LITERATURE', 'LANGUAGE', 'CREATIVE_WRITING']
  },
  // ... more subjects
};

// Level taxonomy (UK education system)
const LEVELS = {
  PRIMARY: { id: 'PRIMARY', name: 'Primary School', ages: [5, 11] },
  KS3: { id: 'KS3', name: 'Key Stage 3 (Years 7-9)', ages: [11, 14] },
  GCSE: { id: 'GCSE', name: 'GCSE (Years 10-11)', ages: [14, 16] },
  A_LEVEL: { id: 'A_LEVEL', name: 'A-Level (Years 12-13)', ages: [16, 18] },
  UNIVERSITY: { id: 'UNIVERSITY', name: 'University Level', ages: [18, null] }
};
```

**Why this matters:**
- Enables precise filtering
- Powers AI matching (canonical IDs)
- Ensures data consistency
- Supports future analytics

---

### Search Implementation

**Three Search Modes:**

#### 1. Natural Language Search (Phase 1+)

**Input:** "GCSE maths tutor in London under £40"

**Processing:**
1. LLM NLU parses intent
2. Extracts structured filters:
   - Subject: MATHS
   - Level: GCSE
   - Location: London
   - Budget: <£40
3. Applies filters to listings
4. Returns results

#### 2. Filter-Based Search (Phase 0)

**UI:** Sidebar checkboxes + range sliders

**Query Building:**
```sql
SELECT l.*, tl.*
FROM listings l
JOIN listing_details_tutor_service tl ON l.listing_id = tl.listing_id
WHERE l.type = 'tutor_service'
  AND l.status = 'active'
  AND 'MATHS' = ANY(tl.subject_ids)
  AND 'GCSE' = ANY(tl.level_ids)
  AND 'online' = ANY(tl.delivery_format)
  AND tl.hourly_rate BETWEEN :budget_min AND :budget_max
  AND ST_DWithin(tl.location::geography, :user_location::geography, :radius_meters)
ORDER BY l.views_count DESC, tl.avg_rating DESC
LIMIT 20;
```

#### 3. Semantic Search (Phase 1+)

**Input:** User's search query

**Processing:**
1. Generate embedding for search query
2. Find listings with similar embeddings
3. Combine with filters
4. Rank by combined score

```sql
SELECT
    l.*,
    tl.*,
    1 - (l.embedding_vector <=> :query_embedding) AS similarity_score
FROM listings l
JOIN listing_details_tutor_service tl ON l.listing_id = tl.listing_id
WHERE l.type = 'tutor_service'
  AND l.status = 'active'
  -- Apply filters
  AND ...
ORDER BY similarity_score DESC
LIMIT 20;
```

---

## API Endpoints

```typescript
// GET /api/marketplace/search
interface SearchRequest {
  query?: string; // Natural language or keyword
  filters?: {
    subject_ids?: string[];
    level_ids?: string[];
    delivery_format?: ('online' | 'in_person' | 'hybrid')[];
    budget_min?: number;
    budget_max?: number;
    location?: { lat: number; lng: number; radius_km: number };
    availability?: AvailabilityWindow[];
  };
  listing_types?: ('tutor_service' | 'client_request' | 'agent_job' | 'agent_group_session' | 'agent_course')[];
  sort?: 'recommended' | 'price_asc' | 'price_desc' | 'rating' | 'recent';
  page?: number;
  limit?: number;
}

interface SearchResponse {
  results: ListingSearchResult[];
  total_count: number;
  facets: {
    subjects: { id: string; name: string; count: number }[];
    levels: { id: string; name: string; count: number }[];
    price_range: { min: number; max: number; avg: number };
  };
  suggested_filters?: SuggestedFilter[];
}

// GET /api/marketplace/featured
interface FeaturedListingsResponse {
  featured_tutors: ListingSummary[];
  trending_subjects: SubjectTrend[];
  top_rated: ListingSummary[];
}

// GET /api/marketplace/autocomplete
interface AutocompleteRequest {
  query: string;
  type?: 'subject' | 'location' | 'tutor_name' | 'all';
}

interface AutocompleteResponse {
  suggestions: {
    type: string;
    value: string;
    display: string;
    count?: number;
  }[];
}
```

---

## Component Architecture

```
apps/web/src/app/
  page.tsx                          # Logged-out homepage
  home/
    page.tsx                        # Logged-in homepage (smart routing)

  components/
    marketplace/
      HeroSearch.tsx                # Main search bar
      FilterSidebar.tsx             # Subject, level, budget, etc.
      ListingCard.tsx               # Unified card (all listing types)
      ListingGrid.tsx               # Grid layout for cards
      SortControls.tsx              # Sort dropdown
      QuickActionCard.tsx           # "Request Lessons" CTA
      MatchScoreBadge.tsx           # AI match percentage display
      FeaturedTutors.tsx            # Carousel for homepage
      PopularSubjects.tsx           # Category badges
      TrustSignals.tsx              # Stats (tutors, lessons, rating)

  hooks/
    useMarketplaceSearch.ts         # Search state management
    useListingFilters.ts            # Filter state + URL sync
    useAutocomplete.ts              # Search suggestions
```

---

## SEO & Performance

### SEO Requirements

1. **Server-Side Rendering (SSR):**
   - Logged-out homepage fully SSR
   - Listing cards pre-rendered for crawlers

2. **Meta Tags (per page):**
   - Dynamic title based on search (e.g., "GCSE Maths Tutors in London | Tutorwise")
   - Description with key stats
   - Structured data (schema.org Organization, Service, Person)

3. **URL Structure:**
   - `/` → Homepage
   - `/search?subject=maths&level=gcse&location=london` → Search results
   - `/tutors` → Browse all tutors
   - `/tutors/[username]` → Individual tutor profile

4. **Sitemap:**
   - Auto-generate for all public tutor profiles
   - Update weekly

### Performance Targets

- **First Contentful Paint:** <1.5s
- **Time to Interactive:** <3.0s
- **Search Latency:** <300ms (filter-based), <800ms (semantic)
- **Page Size:** <500KB initial load

**Optimization Strategies:**
- Lazy load listing cards below fold
- Infinite scroll with virtualization
- CDN for images (avatars, thumbnails)
- Cache popular search results (Redis)
- Debounced autocomplete (300ms)

---

## User Flows

### Flow 1: Visitor → Find Tutor → Contact

1. User lands on `/` (logged out)
2. Sees hero search: "Find the perfect tutor"
3. Types "GCSE maths tutor London"
4. Autocomplete suggests subjects + locations
5. Presses Enter → `/search?q=gcse+maths+tutor+london`
6. Sees filtered results (tutor service listings)
7. Clicks listing card → `/listings/[id]` (full details)
8. Clicks "Message Tutor" → Prompt to sign up/login
9. Signs up → Returns to listing
10. Sends message to tutor

### Flow 2: Client → Request Lessons → Get Matches

1. Client logs in → `/home?view=all`
2. Sees mixed feed: tutors, group sessions, courses
3. Sees "Request Lessons Now" quick action card
4. Clicks → Opens conversational wizard
5. Types: "I need GCSE maths help for exam prep, evenings, £25/hr"
6. AI parses → Shows structured preview
7. Client confirms → Listing published
8. Redirects to "Your Matches" page
9. Shows 5 tutor listings + 2 group sessions with match scores
10. Client browses, can message tutors OR enroll in group sessions

### Flow 3: Tutor → Find Client Requests & Jobs → Respond

1. Tutor logs in → `/home?view=opportunities`
2. Sees banner: "3 new client requests + 2 new job opportunities match your expertise"
3. Sees mixed feed: client requests, agent jobs, group session opportunities
4. Filters to "All" view → Sees all opportunity types with match scores
5. Client request card: Match 92% → Clicks → Full request details
6. Reads: "Student needs algebra help, June exams"
7. Clicks "Send Proposal" → Writes intro message + confirms rate → Sends
8. Agent job card: Match 88% → Clicks → Full job description
9. Reads: "TutorPro Agency hiring part-time GCSE Maths tutor"
10. Clicks "Apply Now" → Submits application
11. Tutor can also filter to "Jobs only" or "Client Requests only" using view tabs

---

## Implementation Phases

### Phase 0: Basic Homepage (4-5 weeks)

**Deliverables:**
1. ✅ Logged-out homepage with hero search
2. ✅ Featured tutors (hardcoded/top-rated)
3. ✅ Filter sidebar (subject, level, format, budget)
4. ✅ Filter-based search (SQL queries)
5. ✅ Listing cards (tutor services only)
6. ✅ Sort controls (rating, price, recent)

**No AI yet** - Just filters + sorting

### Phase 1: Smart Search (3-4 weeks)

**Deliverables:**
1. ✅ Natural language search (LLM NLU)
2. ✅ Autocomplete with suggestions
3. ✅ Semantic search (embeddings)
4. ✅ Match score display (for client requests)
5. ✅ Mixed listing types (tutors, sessions, courses)

### Phase 2: Personalization (4-5 weeks)

**Deliverables:**
1. ✅ Role-based homepage (client/tutor/agent views)
2. ✅ "Recommended for you" section
3. ✅ Graph-based match boosting (referrals)
4. ✅ Trending subjects & insights

### Phase 3: Advanced Features (Continuous)

**Deliverables:**
1. ✅ Saved searches & alerts
2. ✅ "Invite tutor" for unfilled requests
3. ✅ Marketplace analytics dashboard (agents)
4. ✅ A/B testing for ranking algorithms

---

## Success Metrics

1. **Discovery:**
   - % users who search within first session
   - Search → listing view conversion
   - Listing view → contact conversion

2. **Engagement:**
   - Avg. listings viewed per session
   - Avg. time on marketplace
   - Bounce rate from homepage

3. **Matching:**
   - % client requests that get 3+ matches
   - % tutors who respond to requests
   - Time to first contact after listing publish

4. **Business:**
   - Homepage → signup conversion (logged out)
   - Marketplace → booking conversion (logged in)
   - Repeat search rate (user retention)

---

## Next Steps

1. ✅ **Approve specification**
2. **Design Figma screens** (if not already done):
   - Logged-out homepage
   - Search results page
   - Filter sidebar variations
3. **Define canonical taxonomy:**
   - Full subject list with IDs
   - Level definitions
   - Taxonomy config file
4. **Build Phase 0:**
   - Homepage component
   - Search API endpoint
   - Filter logic
5. **SEO setup:**
   - Meta tags + structured data
   - Sitemap generator
   - robots.txt
