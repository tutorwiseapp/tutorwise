# Updated Specifications - Executive Summary

**Created:** October 3, 2025
**Last Updated:** October 5, 2025
**Status:** Ready for Review & Approval
**Sources:** Roadmap (Aspirational) + Figma Design + Current Codebase

**Latest Changes (Oct 5):**
- ✅ Updated all specs to reflect "editable template + duplicate" architecture
- ✅ Changed role_details from "one-time seed" to "editable template"
- ✅ Clarified listing creation flow with "Use Template" vs "Start Fresh" options

---

## 📋 What Was Updated

Based on your request to **"use the roadmap (very aspirational/futuristic), Figma design (which is a bit out of date) and update the listing management, profile and marketplace homepage"**, I have created three comprehensive specifications that reconcile:

1. **The futuristic roadmap vision** (AI-first, hybrid architecture, semantic search)
2. **The current Figma design** (role-based dashboards, service listing components)
3. **The existing codebase** (onboarding data in `role_details`, Supabase setup)

---

## 📄 Three New Specifications

### 1. [Service Listing Management](./updated-listing-management-specification.md)

**Key Decisions:**
- ✅ **Listings are the atomic unit** (not profiles)
- ✅ **One-to-many relationship** (users can create multiple listings)
- ✅ **5 listing types defined:**
  - Request Lessons (Client demand)
  - Tutor Services (Tutor supply)
  - Post Jobs (Agent marketplace)
  - Group Sessions (Agent bundled service)
  - Sell Courses (Agent packaged product)
- ✅ **AI-first schema** (embeddings, canonical tags, metadata JSONB)
- ✅ **Conversational creation flow** for clients (natural language → structured)
- ✅ **Template-based creation** for tutors/agents ("Use Template" from role_details or "Start Fresh")

**Database:** Option C architecture (unified `listings` table + type-specific detail tables)

**Implementation:** 3 phases (MVP → Smart Matching → Graph/Community)

---

### 2. [Profile Management](./updated-profile-management-specification.md)

**Key Decisions:**
- ✅ **Profiles are minimal** (identity + trust only)
- ✅ **Two profile views:**
  - **Public profile** → Basic info + active listings (no professional data)
  - **Account settings** → Edit personal/professional info privately
- ✅ **role_details is editable template** in Account > Professional Info
- ✅ **Template-based listing creation** (duplicate template or start fresh)
- ✅ **Trust verification system** (email, phone, DBS, QTS badges)
- ✅ **Matches Figma structure** (Personal Info, Professional Info, Settings tabs)

**Data Flow:**
```
Onboarding → role_details (editable template)
                ↓
        Account > Professional Info (edit template anytime)
                ↓
        Create Listing → [Use Template] or [Start Fresh]
                ↓
        If Use Template → Pre-filled form → Customize → Save as independent listing
                ↓
        Public Profile shows Listings (template unchanged)
```

---

### 3. [Marketplace Homepage](./updated-marketplace-homepage-specification.md)

**Key Decisions:**
- ✅ **Role-based homepage variants:**
  - Logged out → Browse tutors (SEO landing page)
  - Client → Browse tutors + agent listings (jobs, sessions, courses) + quick "Request Lessons"
  - Tutor → Browse client requests + agent listings (jobs, sessions, courses) with match scores
  - Agent → Full marketplace view (supply + demand)
- ✅ **Search modes:**
  - Natural language (LLM NLU)
  - Filter-based (sidebar)
  - Semantic (embeddings) - Phase 1+
- ✅ **Canonical taxonomy required** (subjects + levels with IDs)
- ✅ **Inspired by Airbnb/Superprof** (visual cards, powerful filters)

**Implementation:** 3 phases (Basic Homepage → Smart Search → Personalization)

---

## 🎯 Core Architecture Principles (Unified)

### 1. Listings-First Philosophy

**Everything is a listing:**
- Client needs → Listing (Request Lessons)
- Tutor offers → Listing (Tutor Services)
- Agent posts → Listing (Jobs, Sessions, Courses)

**Why:**
- Unified matching engine (listing ↔ listing)
- Scalable to new service types
- AI operates on structured data
- Users have flexibility (multiple listings)

### 2. Profile vs Listing Separation

| Component | Contains | Visible Where |
|-----------|----------|---------------|
| **Public Profile** | Name, avatar, bio, trust badges | `/profile/[username]` - Everyone sees |
| **Personal Info** | Contact, location, preferences | `/account/personal-info` - Owner only |
| **Professional Info** | Onboarding data (role_details) | `/account/professional-info` - Owner only, NOT on public profile |
| **Listings** | Subjects, rates, availability, goals | Marketplace + public profile - Everyone sees |

### 3. AI-Native from Day One

**Every listing has:**
- `embedding_vector` (for semantic matching)
- `canonical_tags` (from controlled taxonomy)
- `metadata` JSONB (flexible extensibility)

**AI features:**
- Natural language client request parsing
- Smart listing creation (auto-suggestions)
- Hybrid matching (filters + semantic + graph)
- Match explainability
- Continuous learning from outcomes

---

## 🗂️ Unified Database Schema

### Core Tables

```sql
-- 1. Profiles (minimal, identity only)
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    username TEXT UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT CHECK (char_length(bio) <= 280),
    location_city TEXT,
    location_country TEXT,
    roles TEXT[], -- ['client', 'tutor', 'agent']
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Role Details (professional info, not public)
CREATE TABLE role_details (
    id UUID PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id),
    role TEXT CHECK (role IN ('client', 'tutor', 'agent')),
    details JSONB, -- Role-specific professional data
    UNIQUE(profile_id, role)
);

-- 3. Listings (unified hub, AI-ready)
CREATE TABLE listings (
    listing_id UUID PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    type TEXT CHECK (type IN (
        'client_request',
        'tutor_service',
        'agent_job',
        'agent_group_session',
        'agent_course'
    )),
    status TEXT,

    -- AI Metadata
    embedding_vector vector(768),
    canonical_tags TEXT[],
    metadata JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Listing Detail Tables (one per type)
CREATE TABLE listing_details_client_request (...);
CREATE TABLE listing_details_tutor_service (...);
CREATE TABLE listing_details_agent_job (...);
CREATE TABLE listing_details_agent_group_session (...);
CREATE TABLE listing_details_agent_course (...);

-- 5. Trust Verifications (new)
CREATE TABLE trust_verifications (
    id UUID PRIMARY KEY,
    profile_id UUID REFERENCES profiles(id),
    verification_type TEXT, -- 'email', 'phone', 'dbs', 'qts', etc.
    status TEXT DEFAULT 'pending',
    verified_at TIMESTAMPTZ
);

-- 6. Matches (future)
CREATE TABLE matches (
    match_id UUID PRIMARY KEY,
    tutor_listing_id UUID REFERENCES listings(listing_id),
    client_request_id UUID REFERENCES listings(listing_id),
    score DECIMAL(3,2), -- 0.00 to 1.00
    status TEXT,
    created_at TIMESTAMPTZ
);
```

---

## 🛠️ Implementation Roadmap

### Phase 0: MVP Foundation (6-8 weeks)

**Deliverables:**

**Database:**
1. ✅ Create `listings` table with pgvector extension
2. ✅ Create 5 listing detail tables
3. ✅ Create `trust_verifications` table
4. ✅ Update `profiles` table (if needed)

**Listing Management:**
1. ✅ CRUD API for all 5 listing types
2. ✅ Dashboard listing table (unified view)
3. ✅ Create listing forms (manual, no AI yet)
4. ✅ Figma component mapping:
   - `dashboard_client_request-lesons_listings`
   - `dashboard_agent_post-jobs_listings`
   - `dashboard_agent_post-group-sessions_listings`
   - `dashboard_agent_sell-courses_listings`

**Profile Management:**
1. ✅ Public profile page (minimal, shows listings)
2. ✅ Account settings pages:
   - Personal Info form
   - Professional Info forms (3 role-specific)
   - Settings form
   - Security panel (trust verifications UI)

**Marketplace Homepage:**
1. ✅ Logged-out homepage with hero search
2. ✅ Filter sidebar (subject, level, budget, location)
3. ✅ Listing cards (all 5 types)
4. ✅ Filter-based search (SQL queries, no AI)
5. ✅ Featured tutors section

**Stack:**
- Next.js 14 App Router
- Postgres (Supabase) with pgvector
- Tailwind CSS (Figma design system)
- Supabase Auth

**Definition of Done:**
- [ ] User can create all 5 listing types
- [ ] User can edit profile & professional info
- [ ] Public profile shows user's active listings
- [ ] Homepage search works with filters
- [ ] Listing cards clickable → full listing view

---

### Phase 1: Smart Matching (6-8 weeks)

**Deliverables:**

**AI Services:**
1. ✅ Python FastAPI microservice for LLM/embeddings
2. ✅ Natural language client request parser
3. ✅ Embedding generation on listing create/update
4. ✅ Semantic search (vector similarity)

**Matching Engine:**
1. ✅ Hybrid matching algorithm:
   - Filters (subject, budget, location)
   - Semantic similarity (embeddings)
   - Business rules (availability overlap)
2. ✅ Match score calculation
3. ✅ Match explainability cards ("Why this matches")

**UX Enhancements:**
1. ✅ Conversational "Request Lessons" wizard
2. ✅ Smart tutor listing templates
3. ✅ Match score badges on tutor homepage
4. ✅ Autocomplete suggestions

**Stack:**
- Python FastAPI (AI service)
- OpenAI API or open-source LLM (Llama, Mistral)
- pgvector for similarity search

**Definition of Done:**
- [ ] Client can type natural language request → structured listing
- [ ] Tutor sees client requests with match scores
- [ ] Search supports semantic queries
- [ ] Match cards show explanations

---

### Phase 2: Graph & Community (8-10 weeks)

**Deliverables:**

**Graph Database:**
1. ✅ Neo4j setup for referrals/trust network
2. ✅ Sync user connections, referrals, endorsements
3. ✅ Trust score calculation (multi-hop)

**Matching Enhancements:**
1. ✅ Graph-based match boosting (referrals add score)
2. ✅ Network discovery ("Tutors recommended by your network")

**UX Features:**
1. ✅ Refer-a-tutor flow
2. ✅ Network visualization (connections graph)
3. ✅ Endorsements system

**Stack:**
- Neo4j (managed cloud or self-hosted)
- GraphQL for graph queries

**Definition of Done:**
- [ ] Users can refer tutors
- [ ] Referrals boost match scores
- [ ] Network page shows connections
- [ ] "Find tutors via network" works

---

### Phase 3: Advanced AI (Continuous)

**Deliverables:**

**Learning Pipeline:**
1. ✅ Outcome tracking (match → contact → booking → rating)
2. ✅ Continuous model fine-tuning
3. ✅ Personalized ranking per user

**Advanced Features:**
1. ✅ Conversational negotiation assistant
2. ✅ Auto-generated lesson plans
3. ✅ Pricing recommendations (market data)
4. ✅ Demand forecasting (agents)

**Stack:**
- MLflow or Weights & Biases (experiment tracking)
- Ray or Kubeflow (ML pipelines)

---

## 📊 Key Metrics to Track

### Listing Management
- Listings created per user
- Draft → published conversion
- Active listings per user (avg)

### Profile Management
- Profile completeness score
- Trust badge adoption rate
- Professional Info → Listing creation conversion

### Marketplace
- Search → listing view conversion
- Listing view → contact conversion
- Bounce rate from homepage
- Avg. listings viewed per session

### Matching (Phase 1+)
- Match to contact rate
- Match score accuracy (accepted matches have higher scores)
- Client requests with 3+ matches (%)

---

## 🎯 Critical Success Factors

### 1. Canonical Taxonomy (Before Phase 0)

**Must define:**
- Full subject list with IDs (MATHS, ENG, PHYS, etc.)
- Level taxonomy (PRIMARY, KS3, GCSE, A_LEVEL, UNIVERSITY)
- Subtopics/tags for each subject

**Why critical:**
- Powers filtering and search
- Enables AI matching
- Ensures data consistency

**Action:** Create `docs/taxonomy/subjects.json` and `levels.json`

### 2. Figma Design Completion

**Missing screens:**
- Tutor service listing creation form
- Public tutor listing view (full page)
- Match results page with explainability
- Conversational request wizard UI

**Action:** Design these screens based on existing components

### 3. Testing Strategy

**Unit Tests:**
- Listing CRUD operations
- Filter query builder
- Match score calculation

**Integration Tests:**
- End-to-end listing creation flow
- Search API with filters
- Profile → listing data flow

**E2E Tests:**
- Client creates request → Tutor sees + responds
- Search → view → contact flow

---

## 📁 File Structure

```
docs/features/
├── updated-listing-management-specification.md    ← Service listings (5 types)
├── updated-profile-management-specification.md    ← Public + account settings
├── updated-marketplace-homepage-specification.md  ← Homepage + search
├── UPDATED-SPECS-SUMMARY.md                       ← This file
├── profile-and-service-listing-management.md      ← Original Confluence doc
└── tutorwise-roadmap-confluence.md                ← Original roadmap

docs/design/
├── figma-design-overview.md                       ← Figma analysis
└── figma-design-summary.json                      ← Figma API data

docs/taxonomy/                                      ← To be created
├── subjects.json                                  ← Subject taxonomy
├── levels.json                                    ← Level taxonomy
└── tags.json                                      ← Skill/goal tags
```

---

## ✅ Next Steps

### Immediate (Week 1)

1. **Review & Approve** these three specifications
2. **Define canonical taxonomy:**
   - Create `subjects.json` with full UK curriculum coverage
   - Create `levels.json` with education stages
3. **Complete missing Figma designs:**
   - Tutor service listing form
   - Match results page
   - Request wizard UI

### Near-term (Weeks 2-4)

1. **Phase 0 Development:**
   - Set up database schema (run migrations)
   - Build listing CRUD APIs
   - Implement dashboard listing table
   - Build create listing forms

2. **Profile Pages:**
   - Public profile component
   - Account settings tabs

3. **Homepage:**
   - Hero search + featured tutors
   - Filter sidebar
   - Listing cards

### Medium-term (Weeks 5-12)

1. **Complete Phase 0** (MVP launch)
2. **Start Phase 1:**
   - Set up Python AI microservice
   - Implement NLU parser
   - Add embeddings to listings
3. **User Testing:**
   - Beta test with 10-20 users
   - Gather feedback on listing creation flow

---

## 🚀 Why This Architecture Wins

1. **Future-Proof:**
   - AI-ready from day one (embeddings, canonical data)
   - Extensible (new listing types = new detail table)
   - Scalable (hybrid architecture supports millions of listings)

2. **User-Centric:**
   - Profiles are simple (low cognitive load)
   - Listings are powerful (full flexibility)
   - Matching is smart (AI + human control)

3. **Buildable:**
   - Phased approach (MVP → AI → Graph)
   - Uses existing tech (Supabase, Next.js)
   - Clear success metrics at each phase

4. **Aligned:**
   - Matches Figma design (role-based dashboards)
   - Implements roadmap vision (listings-first, AI-native)
   - Integrates current code (role_details, onboarding)

---

## 🙋 Questions & Decisions Needed

1. **Canonical Taxonomy:** Should I create the full `subjects.json` and `levels.json` now, or do you have an existing source?

2. **Figma Updates:** Do you want me to spec out the missing screens (tutor listing form, match results page) in detail, or will your designer create these?

3. **Phase 0 Start Date:** When do you want to begin implementation? Do you need resource allocation planning?

4. **AI Service:** For Phase 1, should we use OpenAI API (fast, paid) or open-source LLM (slower, self-hosted)?

5. **Prioritization:** Are all 5 listing types equal priority for Phase 0, or should we launch with fewer (e.g., just Request Lessons + Tutor Services)?

---

**Ready to proceed when you approve! 🚀**
