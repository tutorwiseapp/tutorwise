# Service Listing Management - Updated Specification

**Last Updated:** October 5, 2025
**Status:** Design Complete - Ready for Implementation
**Sources:** Roadmap (Aspirational/Futuristic) + Figma Design (Current) + Profile Management Design

**Latest Changes (Oct 5):**
- ✅ Updated to reflect "editable template + duplicate" architecture
- ✅ Changed role_details from "one-time seed" to "editable template"
- ✅ Updated tutor listing UX flow with "Use Template" vs "Start Fresh" options
- ✅ Clarified template/listing decoupling (no cascading updates)

---

## Executive Summary

This specification unifies the **aspirational AI-first roadmap** with the **existing Figma design** to create a practical, scalable service listing management system that:

1. **Keeps profiles basic** (identity only)
2. **Makes listings the primary unit** (one-to-many relationship)
3. **Supports 5 service types**: Request Lessons, Tutor Services, Post Jobs, Group Sessions, Sell Courses
4. **Enables AI-powered matching** while maintaining human control
5. **Future-proofs for semantic search, graph referrals, and continuous learning**

---

## Core Architecture Principles

### 1. Listings-First Philosophy

**Every service interaction is a listing:**
- **Client Request Lessons** → Client Listing (demand)
- **Tutor Services** → Tutor Listing (supply)
- **Agent Post Jobs** → Agent Listing (marketplace)
- **Agent Group Sessions** → Agent Listing (bundled service)
- **Agent Sell Courses** → Agent Listing (packaged product)

**Why this matters:**
- Unified matching engine (listing ↔ listing)
- Scalable to new service types without schema changes
- AI can operate on structured canonical data
- Users can create multiple listings (flexibility)

### 2. Profile vs Listing Separation

| Component | What It Contains | Purpose |
|-----------|------------------|---------|
| **Profile** | Name, avatar, contact, trust badges, basic bio | Identity & trust |
| **Personal Info** | Demographics, location, preferences | User settings |
| **Professional Info** (from onboarding) | Stored in `role_details`, editable template | Reusable baseline for creating listings |
| **Listings** | Subjects, rates, availability, goals, credentials | Matchable service units |

**Data Flow:**
```
Onboarding → role_details (editable template) → "Use Template" or "Start Fresh" → Create Listing → Listing appears in marketplace
```

**Template Architecture:**
- `role_details` is an **editable template** (not one-time seed)
- User can update template anytime in Account > Professional Info
- When creating listing: Choose "Use Template" (pre-filled) or "Start Fresh" (empty)
- Template and listings are **fully decoupled** (no cascading updates)
- Each listing is independent once created

---

## Service Listing Types (5 Types)

### Type 1: Request Lessons (Client Demand)

**User Role:** Client
**Figma Component:** `dashboard_client_request-lesons_listings`
**Purpose:** Client states what they need

**Listing Structure:**
```typescript
interface RequestLessonListing {
  listing_id: string;
  user_id: string;
  type: 'client_request';
  status: 'draft' | 'published' | 'matched' | 'archived';

  // Core Fields
  title: string; // "GCSE Maths Tutoring for Exam Prep"
  subject_id: string; // Canonical taxonomy ID
  level_id: string; // GCSE, A-Level, KS3, etc.
  goals: string[]; // ['exam_prep', 'homework_help', 'confidence_building']

  // Budget & Schedule
  budget_min: number;
  budget_max: number;
  budget_type: 'hourly' | 'package' | 'flexible';
  preferred_schedule: AvailabilityWindow[];
  session_frequency: 'weekly' | 'biweekly' | 'intensive' | 'flexible';

  // Format & Location
  delivery_format: 'online' | 'in_person' | 'hybrid';
  location?: GeoLocation; // If in-person

  // Student Context
  student_age?: number;
  student_level_detail?: string;
  special_requirements?: string[];

  // AI Metadata
  embedding_vector: number[];
  canonical_tags: string[];
  priority_score?: number; // Urgency indicator

  created_at: DateTime;
  expires_at?: DateTime; // Auto-archive after X days
}
```

**UX Flow (Conversational AI Assistant):**
1. Client clicks "Request Lessons" from dashboard
2. **Natural Language Input:** "I need GCSE maths help for my 14-year-old, exam prep, evenings, £25/hr"
3. **AI Parses & Structures:**
   - Subject: GCSE Maths
   - Level: GCSE (Year 10-11 inferred from age)
   - Goals: Exam preparation
   - Schedule: Evenings (Mon-Fri 17:00-20:00)
   - Budget: £25/hr
4. **Preview & Confirm:** Shows structured card with edit options
5. **Publish:** Listing goes live, matching engine starts working
6. **Smart Prompts:** "Would you like to auto-match now or browse tutors first?"

**Figma Alignment:**
- Uses "Dashboard REQUEST LESSONS table components"
- Table shows all client requests with status
- Click row to view/edit listing details

---

### Type 2: Tutor Services (Tutor Supply)

**User Role:** Tutor
**Figma Component:** *(Not explicitly in Figma - needs design)*
**Purpose:** Tutor advertises their tutoring services

**Listing Structure:**
```typescript
interface TutorServiceListing {
  listing_id: string;
  user_id: string;
  type: 'tutor_service';
  status: 'draft' | 'active' | 'paused' | 'archived';

  // Core Fields
  title: string; // "A-Level Physics Tutoring - Exam Specialist"
  subject_ids: string[]; // Multiple subjects allowed
  level_ids: string[];
  teaching_methods: string[]; // ['interactive', 'exam_focused', 'visual_learning']

  // Pricing
  hourly_rate: number;
  trial_session_rate?: number;
  package_deals?: PackageOption[]; // E.g. "10 sessions for £400"

  // Availability
  availability_windows: AvailabilityWindow[];
  max_students_per_week: number;

  // Credentials & Experience
  qualifications: Qualification[];
  teaching_experience_years: number;
  specializations: string[]; // ['ADHD_support', 'exam_boards:AQA', 'oxbridge_prep']

  // Delivery
  delivery_format: ('online' | 'in_person' | 'hybrid')[];
  location?: GeoLocation;
  service_areas?: string[]; // Geographic coverage for in-person

  // Resources
  demo_video_url?: string;
  sample_lesson_plan?: string;

  // AI Metadata
  embedding_vector: number[];
  skill_profile: SparseVector; // Skill weightings
  outcome_history: OutcomePointer[]; // Links to completed bookings/ratings

  // Stats
  views_count: number;
  booking_count: number;
  avg_rating?: number;

  created_at: DateTime;
  updated_at: DateTime;
}
```

**UX Flow (Template-Based Creation):**
1. Tutor clicks "Create Listing" from dashboard
2. **Choose Creation Method:**
   - **[Use Professional Info Template]** ← Primary (pre-filled with role_details)
   - [Start From Scratch] ← Secondary (empty form)
3. **If "Use Template":**
   - Form pre-filled with: subjects, qualifications, hourly rate range, teaching methods
   - AI suggests optimized title based on template data
   - AI suggests market-competitive pricing based on qualifications
4. **Choose Listing Type (optional subtemplates):**
   - One-on-one tutoring (default)
   - Exam prep intensive
   - Weekly ongoing support
   - Summer crash course
5. **Customize:** Tutor edits any field for THIS specific listing
6. **Preview:** See public listing view
7. **Publish:** Saved as independent listing, goes live in marketplace

**Figma Alignment:**
- Similar to Agent listings structure
- Reuse "Home > Tutors > John Lee" component for public view
- Dashboard table shows tutor's own listings

---

### Type 3: Post Jobs (Agent Marketplace)

**User Role:** Agent
**Figma Component:** `dashboard_agent_post-jobs_listings`
**Purpose:** Agent posts tutoring job opportunities

**Listing Structure:**
```typescript
interface PostJobListing {
  listing_id: string;
  user_id: string; // Agent ID
  type: 'agent_job';
  status: 'draft' | 'active' | 'filled' | 'archived';

  // Job Details
  title: string; // "GCSE Maths Tutor - West London"
  job_type: 'full_time' | 'part_time' | 'contract' | 'freelance';
  subject_ids: string[];
  level_ids: string[];

  // Compensation
  salary_min?: number;
  salary_max?: number;
  compensation_type: 'hourly' | 'salary' | 'per_session' | 'commission';
  commission_rate?: number;

  // Requirements
  required_qualifications: Qualification[];
  min_experience_years: number;
  certifications_required: string[]; // DBS, QTS, etc.

  // Work Details
  location: GeoLocation;
  remote_allowed: boolean;
  expected_hours_per_week: number;
  start_date: Date;
  duration?: string; // "6 months", "ongoing"

  // Benefits
  benefits: string[]; // ['pension', 'training', 'materials_provided']

  // Application
  application_deadline?: Date;
  application_count: number;

  // AI Metadata
  embedding_vector: number[];
  canonical_tags: string[];

  created_at: DateTime;
}
```

**Figma Alignment:**
- Uses "Dashboard POST JOBS table components"
- Similar structure to other agent listings

---

### Type 4: Post Group Sessions (Agent Bundled Service)

**User Role:** Agent
**Figma Component:** `dashboard_agent_post-group-sessions_listings`
**Purpose:** Agent offers group tutoring sessions

**Listing Structure:**
```typescript
interface GroupSessionListing {
  listing_id: string;
  user_id: string;
  type: 'agent_group_session';
  status: 'draft' | 'active' | 'full' | 'completed' | 'archived';

  // Session Details
  title: string; // "Easter Revision Bootcamp - GCSE Maths"
  subject_id: string;
  level_id: string;
  session_type: 'workshop' | 'bootcamp' | 'study_group' | 'revision_session';

  // Schedule
  start_date: Date;
  end_date: Date;
  session_times: SessionTime[]; // Specific dates/times
  total_sessions: number;
  duration_per_session: number; // minutes

  // Capacity
  min_students: number;
  max_students: number;
  current_enrollments: number;

  // Pricing
  price_per_student: number;
  early_bird_discount?: Discount;
  group_discount?: Discount;

  // Delivery
  delivery_format: 'online' | 'in_person';
  location?: GeoLocation;
  platform?: string; // Zoom, Teams, etc.

  // Resources
  materials_included: string[];
  prerequisites?: string[];

  // AI Metadata
  embedding_vector: number[];
  canonical_tags: string[];

  created_at: DateTime;
}
```

**Figma Alignment:**
- Uses "Dashboard POST GROUP SESSIONS table components"

---

### Type 5: Sell Courses (Agent Packaged Product)

**User Role:** Agent
**Figma Component:** `dashboard_agent_sell-courses_listings`
**Purpose:** Agent sells pre-packaged online courses

**Listing Structure:**
```typescript
interface SellCourseListing {
  listing_id: string;
  user_id: string;
  type: 'agent_course';
  status: 'draft' | 'active' | 'archived';

  // Course Details
  title: string; // "Complete GCSE Biology Course"
  subject_id: string;
  level_id: string;
  course_type: 'self_paced' | 'instructor_led' | 'hybrid';

  // Content
  modules: CourseModule[];
  total_duration_hours: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';

  // Pricing
  price: number;
  pricing_model: 'one_time' | 'subscription' | 'pay_per_module';
  subscription_period?: 'monthly' | 'annual';

  // Access
  lifetime_access: boolean;
  certificate_included: boolean;

  // Resources
  video_count: number;
  quiz_count: number;
  downloadable_resources: Resource[];

  // Ratings
  avg_rating?: number;
  total_enrollments: number;
  completion_rate?: number;

  // AI Metadata
  embedding_vector: number[];
  canonical_tags: string[];
  skill_profile: SparseVector;

  created_at: DateTime;
}
```

**Figma Alignment:**
- Uses "Dashboard SELL COURSES table components"

---

## Unified Listing Management Dashboard

### Dashboard Structure (All Roles)

**Route:** `/dashboard/listings`

**Components:**
```
┌─────────────────────────────────────────────────────────────┐
│  MY LISTINGS                            [+ Create Listing]   │
├─────────────────────────────────────────────────────────────┤
│  Filters: [All Types] [Active] [Draft] [Archived]           │
│  Sort: [Recent] [Performance] [Status]                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 📚 GCSE Maths Tutoring - Exam Prep    [Active]      │   │
│  │ Type: Tutor Service • £45/hr • 12 bookings           │   │
│  │ Views: 234 • Match Score: 92% • Last updated: 2d ago │   │
│  │ [Edit] [Pause] [View Public] [Analytics] [Duplicate] │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 📖 Request: GCSE Maths Help             [Matched]   │   │
│  │ Type: Client Request • Budget: £25/hr • 3 matches    │   │
│  │ [View Matches] [Edit] [Archive]                      │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 👥 Easter Revision Bootcamp             [Active]    │   │
│  │ Type: Group Session • £180/student • 8/15 enrolled   │   │
│  │ Starts: 15 Apr 2025 • [Manage Enrollments] [Edit]   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Figma Mapping:**
- Reuses table components from each listing type
- Unified view combines all user's listings
- Type-specific actions per listing card

### Create Listing Flow (AI-Assisted)

**Step 1: Choose Type**
```
┌──────────────────────────────────────────────────────────┐
│  What would you like to create?                          │
├──────────────────────────────────────────────────────────┤
│  [🎯 Request Lessons]     Find a tutor for your needs    │
│  [📚 Tutor Service]       Offer tutoring services        │
│  [💼 Post a Job]          Hire tutors (Agents only)      │
│  [👥 Group Session]       Run group tutoring (Agents)    │
│  [📖 Sell a Course]       Sell packaged course (Agents)  │
└──────────────────────────────────────────────────────────┘
```

**Step 2: AI Quick Entry (For Clients)**
```
┌──────────────────────────────────────────────────────────┐
│  Tell us what you need (or use the form below)           │
├──────────────────────────────────────────────────────────┤
│  💬 "I need GCSE maths help for my 14-year-old,          │
│      exam prep, evenings, around £25/hr"                 │
│                                          [Generate Form]  │
│  ────────────────────────────────────────────────────────│
│  Or fill in details manually:                            │
│  Subject: [          ▼]  Level: [        ▼]             │
│  Budget: £[    ] to £[    ] per hour                     │
│  ...                                                      │
└──────────────────────────────────────────────────────────┘
```

**Step 3: Smart Templates (For Tutors/Agents)**
```
┌──────────────────────────────────────────────────────────┐
│  Choose a template or start from scratch                 │
├──────────────────────────────────────────────────────────┤
│  ⚡ Quick Templates (auto-filled from your profile):     │
│  [Exam Prep Tutoring]  [Weekly Support]  [Crash Course]  │
│                                                           │
│  Or [Start from Scratch]                                 │
└──────────────────────────────────────────────────────────┘
```

---

## Database Schema (AI-First, Option C)

### Core Tables

```sql
-- Central listings hub
CREATE TABLE listings (
    listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'client_request',
        'tutor_service',
        'agent_job',
        'agent_group_session',
        'agent_course'
    )),
    status TEXT NOT NULL,

    -- AI Metadata (future-proof)
    embedding_vector vector(768), -- pgvector extension
    embedding_version TEXT,
    canonical_tags TEXT[],
    metadata JSONB, -- Flexible extensibility

    -- Analytics
    views_count INT DEFAULT 0,
    interaction_count INT DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_listings_user ON listings(user_id);
CREATE INDEX idx_listings_type_status ON listings(type, status);
CREATE INDEX idx_listings_published ON listings(published_at) WHERE status = 'active';
CREATE INDEX idx_listings_embedding ON listings USING ivfflat (embedding_vector vector_cosine_ops);
CREATE INDEX idx_listings_tags ON listings USING GIN(canonical_tags);

-- Detail tables (one per type)
CREATE TABLE listing_details_client_request (
    listing_id UUID PRIMARY KEY REFERENCES listings(listing_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    level_id TEXT NOT NULL,
    goals TEXT[],
    budget_min DECIMAL(10,2),
    budget_max DECIMAL(10,2),
    budget_type TEXT,
    preferred_schedule JSONB,
    session_frequency TEXT,
    delivery_format TEXT[],
    location JSONB,
    student_age INT,
    student_level_detail TEXT,
    special_requirements TEXT[],
    priority_score DECIMAL(3,2)
);

CREATE TABLE listing_details_tutor_service (
    listing_id UUID PRIMARY KEY REFERENCES listings(listing_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject_ids TEXT[],
    level_ids TEXT[],
    teaching_methods TEXT[],
    hourly_rate DECIMAL(10,2),
    trial_session_rate DECIMAL(10,2),
    package_deals JSONB,
    availability_windows JSONB,
    max_students_per_week INT,
    qualifications JSONB,
    teaching_experience_years INT,
    specializations TEXT[],
    delivery_format TEXT[],
    location JSONB,
    service_areas TEXT[],
    demo_video_url TEXT,
    sample_lesson_plan TEXT,
    skill_profile JSONB,
    outcome_history JSONB,
    avg_rating DECIMAL(2,1),
    booking_count INT DEFAULT 0
);

CREATE TABLE listing_details_agent_job (
    listing_id UUID PRIMARY KEY REFERENCES listings(listing_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    job_type TEXT,
    subject_ids TEXT[],
    level_ids TEXT[],
    salary_min DECIMAL(10,2),
    salary_max DECIMAL(10,2),
    compensation_type TEXT,
    commission_rate DECIMAL(5,2),
    required_qualifications JSONB,
    min_experience_years INT,
    certifications_required TEXT[],
    location JSONB,
    remote_allowed BOOLEAN,
    expected_hours_per_week INT,
    start_date DATE,
    duration TEXT,
    benefits TEXT[],
    application_deadline DATE,
    application_count INT DEFAULT 0
);

CREATE TABLE listing_details_agent_group_session (
    listing_id UUID PRIMARY KEY REFERENCES listings(listing_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject_id TEXT,
    level_id TEXT,
    session_type TEXT,
    start_date DATE,
    end_date DATE,
    session_times JSONB,
    total_sessions INT,
    duration_per_session INT,
    min_students INT,
    max_students INT,
    current_enrollments INT DEFAULT 0,
    price_per_student DECIMAL(10,2),
    early_bird_discount JSONB,
    group_discount JSONB,
    delivery_format TEXT,
    location JSONB,
    platform TEXT,
    materials_included TEXT[],
    prerequisites TEXT[]
);

CREATE TABLE listing_details_agent_course (
    listing_id UUID PRIMARY KEY REFERENCES listings(listing_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject_id TEXT,
    level_id TEXT,
    course_type TEXT,
    modules JSONB,
    total_duration_hours INT,
    difficulty_level TEXT,
    price DECIMAL(10,2),
    pricing_model TEXT,
    subscription_period TEXT,
    lifetime_access BOOLEAN,
    certificate_included BOOLEAN,
    video_count INT,
    quiz_count INT,
    downloadable_resources JSONB,
    avg_rating DECIMAL(2,1),
    total_enrollments INT DEFAULT 0,
    completion_rate DECIMAL(3,2),
    skill_profile JSONB
);
```

---

## AI Features Integration

### 1. Auto-Structure Client Requests (Phase 1)

**Endpoint:** `POST /api/listings/parse-natural-language`

**Input:**
```json
{
  "user_input": "I need GCSE maths help for my 14-year-old, exam prep, evenings, £25/hr"
}
```

**AI Processing (LLM NLU):**
- Extract entities: subject, level, goals, schedule, budget
- Map to canonical taxonomy IDs
- Generate structured fields

**Output:**
```json
{
  "parsed_fields": {
    "subject_id": "GCSE_MATHS",
    "level_id": "GCSE",
    "goals": ["exam_prep"],
    "preferred_schedule": [
      {"day": "monday", "start": "17:00", "end": "20:00"},
      ...
    ],
    "budget_min": 20,
    "budget_max": 30,
    "student_age": 14
  },
  "suggested_title": "GCSE Maths Exam Prep Tutoring",
  "confidence": 0.92
}
```

### 2. Semantic Matching (Phase 1)

**How it works:**
1. On listing create/update, generate embedding vector
2. Store in `listings.embedding_vector` column
3. Matching engine combines:
   - **Filters** (subject_id, budget range, location)
   - **Vector similarity** (cosine distance)
   - **Business rules** (availability overlap)
   - **Graph signals** (referrals, trust) - Phase 2

**Query Example:**
```sql
-- Find tutor listings matching client request
SELECT
    l.listing_id,
    l.type,
    tl.title,
    tl.hourly_rate,
    -- Semantic similarity score
    1 - (l.embedding_vector <=> :client_embedding) AS semantic_score,
    -- Business rule score
    CASE
        WHEN tl.hourly_rate BETWEEN :budget_min AND :budget_max THEN 1.0
        ELSE 0.5
    END AS price_score,
    -- Combined score
    (
        0.4 * (1 - (l.embedding_vector <=> :client_embedding)) +
        0.3 * CASE WHEN tl.hourly_rate BETWEEN :budget_min AND :budget_max THEN 1.0 ELSE 0.5 END +
        0.3 * availability_overlap_score(tl.availability_windows, :client_schedule)
    ) AS final_score
FROM listings l
JOIN listing_details_tutor_service tl ON l.listing_id = tl.listing_id
WHERE l.type = 'tutor_service'
  AND l.status = 'active'
  AND :client_subject_id = ANY(tl.subject_ids)
  AND tl.delivery_format && :client_delivery_format
ORDER BY final_score DESC
LIMIT 20;
```

### 3. Smart Suggestions (Phase 1)

**When tutor creates listing:**
- AI suggests competitive hourly rate based on:
  - Subject + level market rates
  - Tutor's experience and qualifications
  - Geographic location
- AI generates title and description from structured fields
- AI suggests learning outcomes and lesson plan outline

---

## Implementation Roadmap

### Phase 0: MVP Foundation (6-8 weeks)

**Deliverables:**
1. ✅ Option C database schema (listings + detail tables)
2. ✅ Basic CRUD API for all 5 listing types
3. ✅ Dashboard listing management UI (Figma components)
4. ✅ Create listing forms (manual, no AI)
5. ✅ Basic rule-based matching (filters only)

**Stack:**
- Postgres with pgvector extension (but not using yet)
- Next.js App Router for UI
- Supabase for auth + DB
- React components from Figma design system

### Phase 1: Smart Matching (6-8 weeks)

**Deliverables:**
1. ✅ Natural language client request parser (LLM)
2. ✅ Embedding generation for all listings
3. ✅ Hybrid matching (filters + semantic)
4. ✅ Match explainability cards
5. ✅ Smart suggestions for tutors

**New Services:**
- Python FastAPI microservice for LLM/embeddings
- Vector similarity search in Postgres
- Feedback capture for outcomes

### Phase 2: Graph & Community (8-10 weeks)

**Deliverables:**
1. ✅ Neo4j graph DB for referrals
2. ✅ Trust score calculation
3. ✅ Multi-hop referral discovery
4. ✅ Network-based match boosting

### Phase 3: Advanced AI (Continuous)

**Deliverables:**
1. ✅ Continuous learning from outcomes
2. ✅ Personalized ranking
3. ✅ Conversational negotiation assistant
4. ✅ Auto-generated lesson plans

---

## Success Metrics

**Track from Day 1:**
1. **Listing Creation Rate**
   - Listings created per user
   - Time to create first listing
   - Draft → published conversion

2. **Match Quality**
   - Match to contact conversion
   - Match to booking conversion
   - Average match score for accepted matches

3. **User Engagement**
   - Listings per active user
   - Listing edit/update frequency
   - Active vs paused listing ratio

4. **Business Outcomes**
   - Time to first booking after listing published
   - Repeat listing creation rate
   - Revenue per listing type

---

## Next Steps

1. **Review & Approve** this specification
2. **Design missing Figma screens:**
   - Tutor service listing creation form
   - Public tutor listing view
   - Match results page
3. **Build Phase 0 MVP:**
   - Start with database schema
   - Build API endpoints
   - Implement dashboard UI
4. **Prepare for Phase 1:**
   - Set up Python microservice infrastructure
   - Research embedding models (curriculum-aware)
   - Design canonical taxonomy for subjects/levels
