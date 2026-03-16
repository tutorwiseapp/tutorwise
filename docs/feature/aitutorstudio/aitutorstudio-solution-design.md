# AI Tutor Studio - Solution Design

**Document Version:** 1.2
**Last Updated:** 2026-03-16
**Author:** Tutorwise Product Team
**Status:** Implementation Phase (85% complete)
**Feature Name:** AI Tutor Studio (Studio)

> **Implementation Update (2026-02-23):** Phase 1 MVP is 85% complete. Builder form implemented as single-page (not wizard). See [implementation-status-update.md](./implementation-status-update.md) for current status and remaining tasks.

---

## Executive Summary

**AI Tutor Studio** is a feature that enables tutors, agents, and organisations to create, customize, and monetize their own AI tutors in the Tutorwise marketplace. Unlike Sage (the platform's general AI tutor), Studio-created AI tutors are specialized, trained on owner-uploaded materials, and positioned as first-class marketplace listings alongside human tutors.

### Key Value Propositions

**For Tutors:**
- 📈 Scale expertise 24/7 without time constraints
- 💰 Generate passive income (£10-15/hour AI sessions + subscription revenue)
- 🎯 Differentiate from competitors with specialized AI offerings
- 🔄 Complement human tutoring (AI for revision, human for quality teaching)

**For Clients:**
- 💵 Access specialized AI tutoring at lower cost than human tutors (£5-15/hour vs £40/hour)
- ⚡ Instant availability (no scheduling required)
- 📚 Expert materials curated by trusted tutors
- 🎓 Choice of hundreds of specialized AI tutors

**For Platform:**
- 💰 Double revenue stream: £10/month subscription per AI tutor + 10% commission per session
- 🚀 £250K-£1M ARR potential at scale (1,000-5,000 AI tutors)
- 🏆 Category-defining feature (first AI tutor marketplace)
- 🛡️ Defensible moat (hard to replicate tutor-created knowledge marketplace)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [User Flows](#user-flows)
5. [API Design](#api-design)
6. [UI/UX Design](#uiux-design)
7. [Technical Implementation](#technical-implementation)
8. [Business Logic](#business-logic)
9. [Phase Breakdown](#phase-breakdown)
10. [Success Metrics](#success-metrics)
11. [Risks & Mitigation](#risks--mitigation)

---

## Overview

### Feature Scope

**AI Tutor Studio allows users to:**
1. Create custom AI tutors (name, description, subject, skills, pricing)
2. Upload teaching materials (PDFs, DOCX, PPTX) up to 1GB per AI tutor
3. **Add URL links** to external resources (YouTube videos, Google Docs, webpages, online worksheets)
4. Assign pre-defined skills (Maths-GCSE, English Literature, etc.) to materials and links
5. Set per-hour session pricing (£5-100/hour, minimum £5)
6. Publish AI tutors as marketplace listings
7. Monitor sessions via anonymized transcripts
8. Earn revenue from AI tutor sessions (90% of session fee + subscription)

**Material Priority System:**
- **Priority 1**: Tutor-uploaded files (PDFs, DOCX, PPTX)
- **Priority 2**: Tutor-curated URL links
- **Priority 3**: Sage default knowledge (fallback)

**Clients can:**
1. Discover AI tutors in marketplace search
2. View AI tutor profiles (skills, materials, reviews, pricing)
3. Book instant AI tutor sessions (chat-based, 1-hour duration)
4. Review and rate AI tutors (5-star system)
5. Contact AI tutor owner (escalation path)
6. Dispute sessions (refund policy same as human tutors)

**Note:** Clients must be **signed in** to book AI tutor sessions (same as human tutor workflow). No guest booking.

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                     TUTORWISE PLATFORM                          │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   Sage   │  │   Lexi   │  │VirtualSpc│  │  EduPay  │      │
│  │(Platform │  │(Platform │  │ (Video   │  │ (Wallet) │      │
│  │AI Tutor) │  │Assistant)│  │Sessions) │  │          │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              AI Tutor Studio (NEW)                       │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │
│  │  │   Builder   │  │ Marketplace │  │  Sessions   │    │  │
│  │  │  (Create &  │  │  (Discover  │  │ (Chat-based │    │  │
│  │  │   Manage)   │  │  & Book)    │  │  AI Tutor)  │    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │  │
│  │  │Subscription │  │  Materials  │  │  Analytics  │    │  │
│  │  │  (Stripe)   │  │  (Storage)  │  │(Transcripts)│    │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Points

**Existing Systems:**
- **Sage Infrastructure**: Reuse chat UI, material upload, LaTeX rendering, session storage
- **Marketplace**: AI tutors appear as listings (same search, filter, booking flow as human tutors)
- **Stripe**: Reuse subscription infrastructure (new product: `ai_tutor_creator` at £10/month)
- **VirtualSpace**: Phase 2 integration (AI joins VirtualSpace sessions)
- **Messaging**: Contact tutor owner (reuse existing messaging system)
- **Reviews**: 5-star review system (same as human tutors)
- **Dispute System**: Refund/cancellation policy (same as human tutors)

---

## Architecture

### High-Level System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Studio UI   │  │ Marketplace  │  │  Session UI  │          │
│  │  (Builder)   │  │  (Search)    │  │  (Chat)      │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
└─────────┼──────────────────┼──────────────────┼──────────────────┘
          │                  │                  │
          │ HTTP/REST        │ HTTP/REST        │ WebSocket
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────────────┐
│                      APPLICATION LAYER                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Next.js App (apps/web/src)                  │   │
│  │                                                           │   │
│  │  /studio              /marketplace         /session      │   │
│  │  - Create UI          - Search AI tutors   - Chat UI     │   │
│  │  - Manage AI tutors   - Booking flow       - AI responses│   │
│  │  - Upload materials   - Profile pages      - Transcripts │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              API Routes (/api/studio/*)                  │   │
│  │                                                           │   │
│  │  POST /create            GET /list          POST /session│   │
│  │  PUT /update             GET /:id           GET /transcript│ │
│  │  POST /publish           POST /upload       POST /review │   │
│  │  DELETE /delete          POST /subscribe    POST /dispute│   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                       SERVICE LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  AI Tutor   │  │  Material   │  │   Session   │             │
│  │  Service    │  │  Service    │  │   Service   │             │
│  │             │  │             │  │             │             │
│  │ - CRUD ops  │  │ - Upload    │  │ - Chat AI   │             │
│  │ - Validate  │  │ - Storage   │  │ - RAG query │             │
│  │ - Publish   │  │ - Retrieve  │  │ - Fallback  │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │Subscription │  │   Search    │  │  Analytics  │             │
│  │  Service    │  │   Service   │  │   Service   │             │
│  │             │  │             │  │             │             │
│  │ - Stripe    │  │ - Index AI  │  │ - Transcripts│            │
│  │ - Billing   │  │ - Rank/sort │  │ - Anonymize │             │
│  │ - Status    │  │ - Filter    │  │ - Owner view│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└───────────────────────────────┬───────────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────────┐
│                        DATA LAYER                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Supabase (PostgreSQL + pgvector)            │   │
│  │                                                           │   │
│  │  ai_tutors              ai_tutor_materials               │   │
│  │  ai_tutor_skills        ai_tutor_sessions                │   │
│  │  ai_tutor_subscriptions ai_tutor_reviews                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Stripe    │  │  S3/Supabase│  │   Gemini    │             │
│  │  (Payment)  │  │  (Storage)  │  │   (AI)      │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└───────────────────────────────────────────────────────────────────┘
```

### AI Tutor Session Flow

```
┌──────────┐
│  Client  │
│  Books   │
│ AI Tutor │
└────┬─────┘
     │
     │ 1. Click "Book Now" on AI tutor listing
     │
     ▼
┌──────────────────┐
│  Payment Gateway │  2. Charge client upfront (e.g., £15/hour)
│    (Stripe)      │     Platform fee: 10% (£1.50)
└────┬─────────────┘     Owner gets: 90% (£13.50)
     │
     │ 3. Payment successful
     │
     ▼
┌──────────────────┐
│  Session Service │  4. Create session record
│  - Load AI tutor │     - ai_tutor_id
│  - Load materials│     - client_id
│  - Initialize AI │     - session_start_time
└────┬─────────────┘     - price_paid
     │
     │ 5. Open chat interface (reuse Sage UI)
     │
     ▼
┌──────────────────────────────────────────────────┐
│           AI Chat Session (1 hour)               │
│                                                  │
│  Client: "Can you help with quadratic equations?"│
│      │                                           │
│      ▼                                           │
│  ┌────────────────────────────────────┐         │
│  │  AI Session Handler                │         │
│  │  1. Check AI tutor's materials     │         │
│  │  2. Search uploaded PDFs (RAG)     │         │
│  │  3. If found → use tutor materials │         │
│  │  4. If not found → fallback to Sage│         │
│  └────────────────────────────────────┘         │
│      │                                           │
│      ▼                                           │
│  AI: "Of course! Let me reference the worksheet  │
│       on quadratic equations from your tutor's   │
│       materials..."                              │
│                                                  │
│  [Session continues for up to 1 hour]           │
│                                                  │
│  [Transcript saved: client + anonymized owner]  │
└──────────────────┬───────────────────────────────┘
                   │
                   │ 6. Session ends (1 hour or client exits)
                   │
                   ▼
              ┌─────────────┐
              │  Post-Session│  7. Prompt for review (5 stars)
              │   Actions    │  8. Show upsell: "Book human tutor?"
              └──────────────┘  9. Save transcript
```

### Material Upload & RAG Pipeline

```
┌──────────────┐
│  Owner       │
│  Uploads PDF │
└──────┬───────┘
       │
       │ 1. Upload file (e.g., "Algebra_Worksheets.pdf")
       │
       ▼
┌──────────────────────┐
│  Material Service    │  2. Validate file
│  - Check file type   │     - Max 1GB per AI tutor
│  - Check size        │     - Allowed: PDF, DOCX, PPTX
│  - Virus scan        │     - Virus scan (optional)
└──────┬───────────────┘
       │
       │ 3. Upload to storage
       │
       ▼
┌──────────────────────┐
│  Supabase Storage    │  4. Store file
│  or S3               │     Path: /ai-tutors/{ai_tutor_id}/{file_id}.pdf
└──────┬───────────────┘
       │
       │ 5. Extract text from PDF
       │
       ▼
┌──────────────────────┐
│  Text Extraction     │  6. Parse PDF → plain text
│  (pdf-parse lib)     │     Extract: text, page numbers
└──────┬───────────────┘
       │
       │ 7. Chunk text for embedding
       │
       ▼
┌──────────────────────┐
│  Embedding Service   │  8. Generate embeddings
│  (Gemini Embedding)  │     Model: gemini-embedding-001
│                      │     Dimensions: 768
└──────┬───────────────┘
       │
       │ 9. Store embeddings in vector DB
       │
       ▼
┌──────────────────────┐
│  Supabase (pgvector) │  10. Insert into ai_tutor_material_chunks
│  - text chunk        │      - chunk_text
│  - embedding vector  │      - embedding (vector 768)
│  - ai_tutor_id       │      - ai_tutor_id
│  - file_id           │      - material_id
└──────────────────────┘      - page_number

─────────────────────────────────────────────────────────

RETRIEVAL (During AI Session):

┌──────────────┐
│  Client asks │  "How do I solve quadratic equations?"
│  question    │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  Generate query      │  1. Embed question (Gemini)
│  embedding           │     embedding_vector = embed("How to solve...")
└──────┬───────────────┘
       │
       │ 2. Vector similarity search
       │
       ▼
┌──────────────────────────────────────────────────────┐
│  SELECT chunk_text, page_number                      │
│  FROM ai_tutor_material_chunks                       │
│  WHERE ai_tutor_id = $1                              │
│  ORDER BY embedding <=> $2  -- cosine similarity     │
│  LIMIT 5;                                            │
└──────┬───────────────────────────────────────────────┘
       │
       │ 3. Return top 5 relevant chunks
       │
       ▼
┌──────────────────────┐
│  AI Response         │  4. Context: "Based on your tutor's materials
│  Generation          │              (Algebra Worksheet, page 3)..."
│  (6-tier AI fallback)│     Generate answer using retrieved context
└──────────────────────┘
```

---

## Database Schema

### Core Tables

```sql
-- Main AI Tutor table
CREATE TABLE ai_tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Profile info
  name VARCHAR(100) NOT NULL,  -- e.g., "Maths-AITutor-123"
  display_name VARCHAR(100),   -- e.g., "MicQuan's GCSE Maths Tutor"
  description TEXT,
  subject VARCHAR(50) NOT NULL, -- 'maths', 'english', 'science'
  avatar_url TEXT,

  -- Pricing & availability
  price_per_hour DECIMAL(10, 2) NOT NULL CHECK (price_per_hour >= 5.00),
  currency VARCHAR(3) DEFAULT 'GBP',

  -- Status
  status VARCHAR(20) DEFAULT 'draft',
    -- 'draft', 'published', 'unpublished', 'suspended'
  subscription_status VARCHAR(20) DEFAULT 'inactive',
    -- 'active', 'inactive', 'past_due', 'canceled'

  -- Limits & storage
  storage_used_mb INTEGER DEFAULT 0,
  storage_limit_mb INTEGER DEFAULT 1024, -- 1GB per AI tutor

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_session_at TIMESTAMPTZ,

  -- Stats (denormalized for performance)
  total_sessions INTEGER DEFAULT 0,
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  avg_rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,

  -- Constraints
  CONSTRAINT unique_ai_tutor_name UNIQUE(name),
  CONSTRAINT valid_subject CHECK (subject IN (
    'maths', 'english', 'science', 'computing', 'humanities',
    'languages', 'social-sciences', 'business', 'arts',
    'music', 'design-technology', 'physical-education',
    'religious-studies', 'psychology', 'economics', 'law'
  ))
);

-- Indexes
CREATE INDEX idx_ai_tutors_owner ON ai_tutors(owner_id);
CREATE INDEX idx_ai_tutors_status ON ai_tutors(status);
CREATE INDEX idx_ai_tutors_subject ON ai_tutors(subject);
CREATE INDEX idx_ai_tutors_published ON ai_tutors(published_at)
  WHERE status = 'published';

-- Skills (pre-defined library + custom)
CREATE TABLE ai_tutor_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  skill_name VARCHAR(100) NOT NULL, -- e.g., "Maths-GCSE", "Algebra"
  is_primary BOOLEAN DEFAULT false,
  is_custom BOOLEAN DEFAULT false,  -- false = pre-defined, true = custom
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_skill_per_tutor UNIQUE(ai_tutor_id, skill_name)
);

CREATE INDEX idx_ai_tutor_skills_tutor ON ai_tutor_skills(ai_tutor_id);
CREATE INDEX idx_ai_tutor_skills_name ON ai_tutor_skills(skill_name);

-- Materials (uploaded files)
CREATE TABLE ai_tutor_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,

  -- File info
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'pdf', 'docx', 'pptx'
  file_size_mb DECIMAL(10, 2) NOT NULL,
  file_url TEXT NOT NULL, -- S3 or Supabase storage URL

  -- Processing status
  status VARCHAR(20) DEFAULT 'uploaded',
    -- 'uploaded', 'processing', 'ready', 'failed'

  -- Metadata
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Stats
  page_count INTEGER,
  chunk_count INTEGER DEFAULT 0
);

CREATE INDEX idx_ai_tutor_materials_tutor ON ai_tutor_materials(ai_tutor_id);

-- URL Links (Phase 1 - external resources)
CREATE TABLE ai_tutor_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,

  -- Link info
  url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  link_type VARCHAR(50), -- 'youtube', 'google_docs', 'webpage', 'worksheet'

  -- Skill assignment (can tag to multiple skills)
  skills JSONB DEFAULT '[]'::jsonb,
    -- e.g., ["Maths-GCSE", "Algebra"]

  -- Priority (for RAG context selection)
  priority INTEGER DEFAULT 2, -- 1=high, 2=medium, 3=low

  -- Metadata
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(20) DEFAULT 'active',
    -- 'active', 'broken', 'removed'

  CONSTRAINT valid_url CHECK (url ~* '^https?://.*')
);

CREATE INDEX idx_ai_tutor_links_tutor ON ai_tutor_links(ai_tutor_id);
CREATE INDEX idx_ai_tutor_links_status ON ai_tutor_links(status);

-- Material chunks (for RAG)
CREATE TABLE ai_tutor_material_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES ai_tutor_materials(id) ON DELETE CASCADE,
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,

  -- Chunk content
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL, -- Order in document
  page_number INTEGER,

  -- Embedding (pgvector)
  embedding vector(768), -- Gemini embedding dimension

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- pgvector index for similarity search
CREATE INDEX idx_ai_tutor_chunks_embedding ON ai_tutor_material_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_ai_tutor_chunks_tutor ON ai_tutor_material_chunks(ai_tutor_id);

-- Sessions (chat sessions with AI tutors)
CREATE TABLE ai_tutor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Session info
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Pricing
  price_paid DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL, -- 10% commission
  owner_earnings DECIMAL(10, 2) NOT NULL, -- 90%

  -- Transcript
  messages JSONB DEFAULT '[]'::jsonb,
    -- [{role: 'user', content: '...', timestamp: '...'}, ...]

  -- Quality indicators
  fallback_to_sage_count INTEGER DEFAULT 0,
  thumbs_up_count INTEGER DEFAULT 0,
  thumbs_down_count INTEGER DEFAULT 0,

  -- Status
  status VARCHAR(20) DEFAULT 'active',
    -- 'active', 'completed', 'disputed', 'refunded'

  -- Review
  reviewed BOOLEAN DEFAULT false,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_ai_tutor_sessions_tutor ON ai_tutor_sessions(ai_tutor_id);
CREATE INDEX idx_ai_tutor_sessions_client ON ai_tutor_sessions(client_id);
CREATE INDEX idx_ai_tutor_sessions_started ON ai_tutor_sessions(started_at);

-- Subscriptions (Stripe integration)
CREATE TABLE ai_tutor_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Stripe info
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_price_id VARCHAR(255),

  -- Subscription details
  status VARCHAR(20) NOT NULL,
    -- 'active', 'past_due', 'canceled', 'unpaid'
  price_per_month DECIMAL(10, 2) DEFAULT 10.00,
  currency VARCHAR(3) DEFAULT 'GBP',

  -- Billing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_subscription_per_tutor UNIQUE(ai_tutor_id)
);

CREATE INDEX idx_ai_tutor_subs_owner ON ai_tutor_subscriptions(owner_id);
CREATE INDEX idx_ai_tutor_subs_status ON ai_tutor_subscriptions(status);

-- Reviews (separate from sessions for flexibility)
CREATE TABLE ai_tutor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_tutor_sessions(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Review content
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_review_per_session UNIQUE(session_id)
);

CREATE INDEX idx_ai_tutor_reviews_tutor ON ai_tutor_reviews(ai_tutor_id);
CREATE INDEX idx_ai_tutor_reviews_client ON ai_tutor_reviews(client_id);
CREATE INDEX idx_ai_tutor_reviews_rating ON ai_tutor_reviews(rating);
```

### Database Relationships

```
┌─────────────────┐
│   profiles      │
│   (existing)    │
└────┬────────────┘
     │
     │ owner_id (1:N)
     │
     ▼
┌──────────────────────────────┐
│     ai_tutors                │
│  - id                        │
│  - owner_id (FK)             │
│  - name, display_name        │
│  - subject, price_per_hour   │
│  - status, subscription_status│
└─┬──────────────────────────┬─┘
  │                          │
  │ (1:N)                    │ (1:1)
  │                          │
  ▼                          ▼
┌──────────────────────┐   ┌───────────────────────────┐
│ ai_tutor_skills      │   │ ai_tutor_subscriptions    │
│  - ai_tutor_id (FK)  │   │  - ai_tutor_id (FK)       │
│  - skill_name        │   │  - stripe_subscription_id │
│  - is_primary        │   │  - status, price          │
└──────────────────────┘   └───────────────────────────┘
  │
  │ (1:N)
  │
  ▼
┌──────────────────────────────┐
│  ai_tutor_materials          │
│   - ai_tutor_id (FK)         │
│   - file_name, file_url      │
│   - status, page_count       │
└─┬────────────────────────────┘
  │
  │ (1:N)
  │
  ▼
┌──────────────────────────────┐
│ ai_tutor_material_chunks     │
│  - material_id (FK)          │
│  - ai_tutor_id (FK)          │
│  - chunk_text, embedding     │
│  - page_number               │
└──────────────────────────────┘

┌─────────────────┐
│   profiles      │
│   (clients)     │
└────┬────────────┘
     │
     │ client_id (1:N)
     │
     ▼
┌──────────────────────────────┐
│  ai_tutor_sessions           │
│   - ai_tutor_id (FK)         │
│   - client_id (FK)           │
│   - messages (JSONB)         │
│   - price_paid, rating       │
└─┬────────────────────────────┘
  │
  │ (1:1)
  │
  ▼
┌──────────────────────────────┐
│  ai_tutor_reviews            │
│   - ai_tutor_id (FK)         │
│   - session_id (FK)          │
│   - client_id (FK)           │
│   - rating, review_text      │
└──────────────────────────────┘
```

---

## User Flows

### Flow 1: Tutor Creates AI Tutor

```
┌─────────────────────────────────────────────────────────────────┐
│  TUTOR JOURNEY: Create AI Tutor                                 │
└─────────────────────────────────────────────────────────────────┘

START: Tutor logged in
   │
   ├─> Navigate to /studio
   │
   ▼
┌──────────────────────────────┐
│  Studio Dashboard            │  ← Shows existing AI tutors (if any)
│  "Create New AI Tutor" CTA   │     Stats: sessions, revenue, reviews
└──────────┬───────────────────┘
           │
           │ Click "Create New AI Tutor"
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 1: Basic Info                                          │
│                                                               │
│  Subject: [○ Maths  ○ English  ○ Science]                    │
│  Display Name: [MicQuan's GCSE Maths Tutor____________]      │
│  Description: [Specialized in GCSE algebra and geometry...]  │
│  Avatar: [Upload Image]                                      │
│                                                               │
│  [Cancel]  [Next: Skills →]                                  │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ Click "Next"
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 2: Skills                                              │
│                                                               │
│  Pre-defined Skills (select all that apply):                 │
│  ☑ Maths-GCSE      ☑ Algebra      □ Geometry                │
│  □ Maths-A-Level   □ Calculus     ☑ Problem Solving         │
│                                                               │
│  Primary Skills (students see first):                        │
│  • Maths-GCSE                                                │
│  • Algebra                                                   │
│                                                               │
│  [← Back]  [Next: Materials →]                               │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ Click "Next"
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 3: Upload Materials                                    │
│                                                               │
│  Upload teaching materials (PDF, DOCX, PPTX):                │
│  Storage: 0 MB / 1024 MB                                     │
│                                                               │
│  ┌────────────────────────────────────────┐                 │
│  │  Drag & drop files here                │                 │
│  │  or click to browse                    │                 │
│  └────────────────────────────────────────┘                 │
│                                                               │
│  Uploaded files:                                             │
│  ✓ Algebra_Worksheets.pdf (12.5 MB) [Remove]                │
│  ⏳ GCSE_Past_Papers.pdf (Processing...) [Remove]            │
│                                                               │
│  [← Back]  [Next: Pricing →]                                 │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ Click "Next"
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Step 4: Pricing & Publish                                   │
│                                                               │
│  Price per session (1 hour): £[15.00___] /hour              │
│  Minimum: £5.00                                              │
│                                                               │
│  You'll earn: £13.50 /session (90%)                          │
│  Platform fee: £1.50 /session (10%)                          │
│                                                               │
│  Subscription: £10.00 /month                                 │
│  ⚠️ You'll be charged £10/month to keep this AI tutor live   │
│                                                               │
│  Preview: [View how clients see your AI tutor listing]      │
│                                                               │
│  [← Back]  [Save as Draft]  [Publish & Subscribe →]         │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ Click "Publish & Subscribe"
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Stripe Checkout                                             │
│                                                               │
│  AI Tutor Subscription: £10.00 /month                        │
│  Auto-renews monthly                                         │
│                                                               │
│  [Card details...]                                           │
│  [Subscribe]                                                 │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ Payment successful
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Success! 🎉                                                 │
│                                                               │
│  Your AI tutor "MicQuan's GCSE Maths Tutor" is now live     │
│  in the marketplace!                                         │
│                                                               │
│  [View in Marketplace]  [Manage AI Tutor]  [Create Another] │
└──────────────────────────────────────────────────────────────┘

END: AI tutor published
```

### Flow 2: Client Books AI Tutor Session

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT JOURNEY: Book AI Tutor Session                          │
└─────────────────────────────────────────────────────────────────┘

START: Client searching for help
   │
   ├─> Navigate to /marketplace
   │
   ▼
┌──────────────────────────────┐
│  Marketplace Search          │  Search: "GCSE Maths"
│                              │  Filters: [All] [Humans] [AI Tutors]
└──────────┬───────────────────┘
           │
           │ Select filter: "AI Tutors"
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Search Results (AI Tutors only)                             │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🤖 MicQuan's GCSE Maths Tutor                        │   │
│  │ Created by: MicQuan                                  │   │
│  │ ⭐⭐⭐⭐⭐ 4.8 (24 reviews)                          │   │
│  │ Skills: Maths-GCSE, Algebra, Problem Solving        │   │
│  │ £15/hour • Available instantly                       │   │
│  │ [View Profile]                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🤖 TutorPro's Algebra Master                         │   │
│  │ Created by: TutorPro Academy                         │   │
│  │ ⭐⭐⭐⭐☆ 4.2 (12 reviews)                           │   │
│  │ Skills: Algebra, Geometry                            │   │
│  │ £10/hour • Available instantly                       │   │
│  │ [View Profile]                                       │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ Click "View Profile"
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  AI Tutor Profile: MicQuan's GCSE Maths Tutor                │
│                                                               │
│  🤖 [Avatar]                                                 │
│  Created by: MicQuan (🔗 View tutor profile)                │
│  ⭐⭐⭐⭐⭐ 4.8 (24 reviews)                                 │
│                                                               │
│  About:                                                      │
│  "Specialized AI tutor for GCSE Maths, trained on           │
│   expert worksheets and past papers. Perfect for algebra    │
│   and problem-solving practice."                            │
│                                                               │
│  Skills:                                                     │
│  • Maths-GCSE (Primary)                                     │
│  • Algebra (Primary)                                        │
│  • Problem Solving                                          │
│                                                               │
│  Resources:                                                  │
│  📄 5 worksheets, 3 past papers                             │
│                                                               │
│  Pricing: £15/hour                                          │
│                                                               │
│  Recent Reviews:                                             │
│  ⭐⭐⭐⭐⭐ "Really helpful for algebra revision!" - Sarah  │
│  ⭐⭐⭐⭐☆ "Good but needed human help on one topic" - Tom │
│                                                               │
│  [Contact Tutor]  [Start Session Now - £15]                 │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ Click "Start Session Now"
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Checkout                                                    │
│                                                               │
│  AI Tutor Session: MicQuan's GCSE Maths Tutor               │
│  Duration: 1 hour                                            │
│  Price: £15.00                                               │
│                                                               │
│  [Payment details...]                                        │
│  [Confirm & Start Session]                                   │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ Payment successful
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  AI Chat Session (1 hour timer: 59:32 remaining)            │
│  ─────────────────────────────────────────────────────────  │
│                                                               │
│  🤖 AI: Hi! I'm MicQuan's GCSE Maths Tutor. How can I help? │
│                                                               │
│  You: Can you help with quadratic equations?                │
│                                                               │
│  🤖 AI: Of course! Let me reference the worksheet on         │
│       quadratic equations. The standard form is ax² + bx + c │
│       = 0. Let's work through an example...                 │
│       [Shows content from uploaded materials]                │
│                                                               │
│  [Type your question...] [Send]                              │
│                                                               │
│  [Request Human Help] [End Session Early]                    │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ Session ends (1 hour or client exits)
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Session Complete! ✅                                        │
│                                                               │
│  How was your session?                                       │
│  ⭐⭐⭐⭐⭐ (Rate 1-5 stars)                                │
│  Comments (optional): [Great for algebra practice!_______]  │
│                                                               │
│  [Submit Review]  [Skip]                                     │
│                                                               │
│  ─────────────────────────────────────────────────────────  │
│  Need more help?                                             │
│  📚 Book another AI session (£15)                           │
│  👨‍🏫 Book MicQuan for human tutoring (£40/hour)            │
│                                                               │
│  [View Transcript]  [Back to Marketplace]                    │
└──────────────────────────────────────────────────────────────┘

END: Session reviewed
```

### Flow 3: Owner Monitors Sessions (Anonymized)

```
┌─────────────────────────────────────────────────────────────────┐
│  OWNER JOURNEY: Monitor AI Tutor Performance                    │
└─────────────────────────────────────────────────────────────────┘

START: Owner logged in
   │
   ├─> Navigate to /studio/my-ai-tutors
   │
   ▼
┌──────────────────────────────────────────────────────────────┐
│  My AI Tutors                                                │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 🤖 MicQuan's GCSE Maths Tutor                        │   │
│  │ Status: Published • Subscription: Active             │   │
│  │ ⭐ 4.8 (24 reviews) • 47 sessions • £705 earned      │   │
│  │ [Manage] [View Analytics] [Edit]                     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ Click "View Analytics"
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  AI Tutor Analytics: MicQuan's GCSE Maths Tutor              │
│                                                               │
│  📊 Overview (Last 30 days)                                  │
│  • Total sessions: 47                                        │
│  • Avg rating: 4.8/5                                         │
│  • Revenue: £705 (£634.50 after platform fee)               │
│  • Storage used: 87 MB / 1024 MB                             │
│                                                               │
│  📈 Most Asked Topics:                                       │
│  1. Quadratic equations (12 sessions)                        │
│  2. Algebra basics (9 sessions)                              │
│  3. Geometry (7 sessions)                                    │
│                                                               │
│  ⚠️ Knowledge Gaps (AI struggled):                           │
│  • Trigonometry (5 times - fallback to Sage used)           │
│    💡 Suggestion: Upload materials on trig basics            │
│                                                               │
│  📝 Recent Sessions (Anonymized)                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Session #1234 - Anonymous Client A                   │   │
│  │ Date: 2026-02-22 • Duration: 58 mins • ⭐⭐⭐⭐⭐   │   │
│  │ [View Transcript (anonymized)]                        │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  │ Session #1233 - Anonymous Client B                   │   │
│  │ Date: 2026-02-21 • Duration: 45 mins • ⭐⭐⭐⭐☆    │   │
│  │ Review: "Good but needed help on trigonometry"        │   │
│  │ [View Transcript (anonymized)]                        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────┬───────────────────────────────────────────────────┘
           │
           │ Click "View Transcript (anonymized)"
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Session Transcript #1234 (Anonymized)                      │
│  Date: 2026-02-22 • Duration: 58 mins                       │
│                                                               │
│  ⚠️ Client identity hidden for privacy                       │
│                                                               │
│  Anonymous Client: "Can you help with quadratic equations?" │
│                                                               │
│  AI: "Of course! Let me reference the worksheet on          │
│       quadratic equations from your tutor's materials..."   │
│                                                               │
│  Anonymous Client: "I don't understand step 3"              │
│                                                               │
│  AI: "Let me break down step 3 in more detail..."          │
│                                                               │
│  [Full transcript continues...]                             │
│                                                               │
│  💡 Insights:                                                │
│  • Materials used: Algebra_Worksheets.pdf (page 3)          │
│  • Fallback to Sage: 0 times                                │
│  • Client engagement: 👍 3 thumbs up, 0 thumbs down         │
│                                                               │
│  [Download Transcript] [Close]                               │
└──────────────────────────────────────────────────────────────┘

END: Owner reviewed performance
```

---

## API Design

### REST API Endpoints

```
POST   /api/studio/create              Create new AI tutor (draft)
GET    /api/studio/list                List owner's AI tutors
GET    /api/studio/:id                 Get AI tutor details
PUT    /api/studio/:id                 Update AI tutor
DELETE /api/studio/:id                 Delete AI tutor (if no sessions)
POST   /api/studio/:id/publish         Publish AI tutor (create subscription)
POST   /api/studio/:id/unpublish       Unpublish AI tutor
POST   /api/studio/:id/upload-material Upload material file
DELETE /api/studio/:id/material/:mid   Delete material
GET    /api/studio/:id/analytics       Get AI tutor analytics
GET    /api/studio/:id/sessions        List sessions (anonymized for owner)
GET    /api/studio/:id/transcript/:sid Get session transcript (anonymized)

POST   /api/marketplace/ai-tutors/search   Search AI tutors
GET    /api/marketplace/ai-tutors/:id      Get public AI tutor profile
POST   /api/marketplace/ai-tutors/:id/book Book session (payment)

POST   /api/session/ai-tutor/start        Start AI tutor session
POST   /api/session/ai-tutor/message      Send message (get AI response)
POST   /api/session/ai-tutor/end          End session
POST   /api/session/ai-tutor/review       Submit review
GET    /api/session/ai-tutor/:sid/transcript Get client's own transcript

POST   /api/webhook/stripe                Stripe webhooks (subscription events)
```

### Example API Request/Response

**POST /api/studio/create**

```json
// Request
{
  "display_name": "MicQuan's GCSE Maths Tutor",
  "description": "Specialized in GCSE algebra and geometry...",
  "subject": "maths",
  "price_per_hour": 15.00,
  "skills": ["Maths-GCSE", "Algebra", "Problem Solving"],
  "primary_skills": ["Maths-GCSE", "Algebra"]
}

// Response (201 Created)
{
  "id": "uuid-1234",
  "name": "Maths-AITutor-uuid-1234",
  "display_name": "MicQuan's GCSE Maths Tutor",
  "owner_id": "owner-uuid",
  "subject": "maths",
  "price_per_hour": 15.00,
  "status": "draft",
  "subscription_status": "inactive",
  "storage_used_mb": 0,
  "storage_limit_mb": 1024,
  "created_at": "2026-02-23T10:00:00Z",
  "skills": [
    {"name": "Maths-GCSE", "is_primary": true},
    {"name": "Algebra", "is_primary": true},
    {"name": "Problem Solving", "is_primary": false}
  ]
}
```

**POST /api/studio/:id/publish**

```json
// Request
{
  "confirm_subscription": true  // User confirmed £10/month charge
}

// Response (200 OK)
{
  "id": "uuid-1234",
  "status": "published",
  "subscription_status": "active",
  "published_at": "2026-02-23T10:05:00Z",
  "subscription": {
    "stripe_subscription_id": "sub_xyz",
    "status": "active",
    "current_period_start": "2026-02-23T10:05:00Z",
    "current_period_end": "2026-03-23T10:05:00Z",
    "price_per_month": 10.00
  }
}
```

**POST /api/session/ai-tutor/message**

```json
// Request
{
  "session_id": "session-uuid",
  "message": "Can you help with quadratic equations?"
}

// Response (200 OK)
{
  "session_id": "session-uuid",
  "ai_response": {
    "content": "Of course! Let me reference the worksheet on quadratic equations from your tutor's materials. The standard form is ax² + bx + c = 0...",
    "sources": [
      {
        "material": "Algebra_Worksheets.pdf",
        "page": 3,
        "chunk": "Quadratic equations are..."
      }
    ],
    "fallback_used": false
  },
  "timestamp": "2026-02-23T10:15:00Z"
}
```

---

## UI/UX Design

### Studio Pages Using Hub Architecture

**Studio Dashboard** (`/studio/page.tsx`)

```
┌───────────────────────────────────────────────────────────────────────┐
│  3-COLUMN HUB LAYOUT (from (authenticated)/layout.tsx)               │
└───────────────────────────────────────────────────────────────────────┘

┌────────────┬──────────────────────────────────┬──────────────────────┐
│ AppSidebar │     STUDIO MAIN CONTENT          │   HubSidebar         │
│            │                                  │                      │
│ Dashboard  │  AI Tutor Studio  [Create New +]│  📊 Overview         │
│ Studio ◀── │  ──────────────────────────────  │  ──────────────      │
│ Marketplace│                                  │  Total Sessions: 127 │
│ Bookings   │  📊 Overview (All AI Tutors)     │  Revenue: £1,905     │
│ Financials │  ┌────────────────────────────┐  │  Avg Rating: 4.6     │
│ Referrals  │  │ Sessions: 127  Revenue: £K │  │                      │
│ EduPay     │  │ AI Tutors: 3   Rating: 4.6 │  │  📈 Session Trends   │
│ Sage       │  └────────────────────────────┘  │  [Line Chart]        │
│            │                                  │                      │
│            │  Your AI Tutors  [Filter ▼]     │  📊 Skills Breakdown │
│            │  ────────────────────────────    │  [Bar Chart]         │
│            │  ┌─ HubDataTable ─────────────┐  │                      │
│            │  │ [Search...] [Filters] [⟳] │  │  💡 Quick Actions    │
│            │  ├─────────────────────────────│  │  • Upload materials  │
│            │  │ ID  Created  Name  Status  │  │  • View analytics    │
│            │  │ #123 2 Feb   Maths Published│  │  • Check earnings   │
│            │  │ #124 5 Feb   English Active │  │                      │
│            │  └─────────────────────────────┘  │                      │
│            │                                  │                      │
└────────────┴──────────────────────────────────┴──────────────────────┘
 240px width         Fluid (responsive)             320px width
```

**Component Usage:**

```tsx
// apps/web/src/app/(authenticated)/studio/page.tsx

import HubDataTable from '@/components/hub/data/HubDataTable';
import HubSidebar from '@/components/hub/sidebar/HubSidebar';
import HubTrendChart from '@/components/hub/charts/HubTrendChart';
import HubCategoryBreakdownChart from '@/components/hub/charts/HubCategoryBreakdownChart';

export default function StudioPage() {
  return (
    <>
      {/* Main Content (center column) */}
      <div className={styles.mainContent}>
        {/* Overview Stats */}
        <div className={styles.statsGrid}>
          <StatCard title="Total Sessions" value={127} />
          <StatCard title="Revenue" value="£1,905" />
          <StatCard title="Active AI Tutors" value={3} />
        </div>

        {/* AI Tutor List - HubDataTable */}
        <HubDataTable
          data={aiTutors}
          columns={columns}
          searchPlaceholder="Search AI tutors..."
          onSearch={handleSearch}
          filters={filters}
          actions={[
            { label: 'Create New', onClick: handleCreate, icon: <Plus /> }
          ]}
        />
      </div>

      {/* Right Sidebar (HubSidebar) */}
      <HubSidebar>
        {/* Session Trends Chart */}
        <HubTrendChart
          data={sessionTrends}
          title="Session Trends"
          subtitle="Last 7 days"
          valueName="Sessions"
          lineColor="#fbbf24"
        />

        {/* Skills Breakdown Chart */}
        <HubCategoryBreakdownChart
          data={skillsBreakdown}
          title="Skills Distribution"
          subtitle="Across all AI tutors"
        />

        {/* Quick Actions Widget */}
        <QuickActionsWidget />
      </HubSidebar>
    </>
  );
}
```

---

### Studio Dashboard (Owner View)

```
┌────────────────────────────────────────────────────────────────────┐
│  Tutorwise                     [Dashboard] [Studio] [Marketplace]   │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  AI Tutor Studio                                   [Create New +]   │
│  ────────────────────────────────────────────────────────────────  │
│                                                                      │
│  📊 Overview (All AI Tutors)                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Total Sessions: 127     Revenue: £1,905     Avg Rating: 4.6 │  │
│  │  Active AI Tutors: 3     Subscription: £30/month             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  Your AI Tutors                                                     │
│  ──────────────────────────────────────────────────────────────    │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 🤖 MicQuan's GCSE Maths Tutor                    [Manage ▼]  │ │
│  │ Status: 🟢 Published • Subscription: Active                   │ │
│  │ ⭐ 4.8 (24 reviews) • 47 sessions this month                  │ │
│  │ Revenue: £705 earned • Storage: 87 MB / 1024 MB               │ │
│  │                                                                │ │
│  │ [View Analytics] [Edit Details] [Manage Materials]            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 🤖 English Essay Coach                           [Manage ▼]  │ │
│  │ Status: 🟢 Published • Subscription: Active                   │ │
│  │ ⭐ 4.5 (12 reviews) • 28 sessions this month                  │ │
│  │ Revenue: £420 earned • Storage: 124 MB / 1024 MB              │ │
│  │                                                                │ │
│  │ [View Analytics] [Edit Details] [Manage Materials]            │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 🤖 Science Revision Bot                          [Manage ▼]  │ │
│  │ Status: ⚪ Draft • Not yet published                          │ │
│  │ ⚠️ Complete setup to publish                                  │ │
│  │                                                                │ │
│  │ [Continue Setup] [Delete Draft]                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
```

### AI Tutor Marketplace Listing (Client View)

```
┌────────────────────────────────────────────────────────────────────┐
│  Tutorwise                     [Dashboard] [Marketplace] [Bookings] │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🤖 MicQuan's GCSE Maths Tutor                                      │
│  ────────────────────────────────────────────────────────────────  │
│                                                                      │
│  ┌─────────────┐                                                    │
│  │   [Avatar]  │  Created by: MicQuan 🔗                            │
│  │     Image   │  ⭐⭐⭐⭐⭐ 4.8 (24 reviews)                        │
│  └─────────────┘  Available: Instantly • £15/hour                   │
│                                                                      │
│  ────────────────────────────────────────────────────────────────  │
│                                                                      │
│  About                                                               │
│  "Specialized AI tutor for GCSE Maths, trained on expert           │
│   worksheets and past papers. Perfect for algebra, geometry,        │
│   and problem-solving practice. I use proven teaching methods       │
│   from my 10+ years of tutoring experience."                        │
│                                                                      │
│  Skills                                                              │
│  • Maths-GCSE (Primary) • Algebra (Primary) • Problem Solving      │
│  • Geometry              • Revision                                 │
│                                                                      │
│  Resources                                                           │
│  📄 5 worksheets, 3 past papers, 2 formula sheets                   │
│                                                                      │
│  ────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Reviews (24)                                  Sort by: Most Recent │
│                                                                      │
│  ⭐⭐⭐⭐⭐ Sarah • 2 days ago                                       │
│  "Really helpful for algebra revision! The AI used the worksheets   │
│   from MicQuan's materials and explained everything clearly."       │
│                                                                      │
│  ⭐⭐⭐⭐☆ Tom • 5 days ago                                         │
│  "Good for most topics but I needed human help on trigonometry.     │
│   Overall worth the price for practice."                            │
│                                                                      │
│  [Show all 24 reviews]                                              │
│                                                                      │
│  ────────────────────────────────────────────────────────────────  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Ready to start learning?                                     │  │
│  │  £15/hour • 1-hour session                                    │  │
│  │                                                                │  │
│  │  [Start Session Now - £15]  [Contact MicQuan]                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  💡 Also available: Book MicQuan for human tutoring (£40/hour)     │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
```

### AI Chat Session (Client View)

```
┌────────────────────────────────────────────────────────────────────┐
│  AI Session: MicQuan's GCSE Maths Tutor        ⏱️ 47:23 remaining  │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  🤖 AI: Hi! I'm MicQuan's GCSE Maths Tutor, trained on expert      │
│       materials. How can I help you today?                          │
│       12:32 PM                                                       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ You: Can you help with quadratic equations?                │    │
│  │      12:33 PM                                               │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  🤖 AI: Of course! Let me reference the worksheet on quadratic      │
│       equations from your tutor's materials.                        │
│                                                                      │
│       A quadratic equation has the standard form:                   │
│       **ax² + bx + c = 0**                                          │
│                                                                      │
│       Let's work through an example. If we have:                    │
│       2x² + 5x + 3 = 0                                              │
│                                                                      │
│       We can solve this using the quadratic formula:                │
│       x = (-b ± √(b² - 4ac)) / 2a                                   │
│                                                                      │
│       Would you like me to walk through the solution step-by-step?  │
│                                                                      │
│       📄 Source: Algebra_Worksheets.pdf (page 3)                    │
│       12:33 PM                                          👍 👎       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ You: Yes please, I don't understand step 3                 │    │
│  │      12:34 PM                                               │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  🤖 AI: Let me break down step 3 in more detail...                  │
│       [Response continues...]                                       │
│       12:34 PM                                          👍 👎       │
│                                                                      │
│  ────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Type your question...                                   [Send]     │
│                                                                      │
│  [Request Human Help 🆘] [End Session Early]                        │
│                                                                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Tech Stack

**Frontend:**
- Next.js 16 (React)
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- React Hook Form (forms)
- Zustand (state management)
- **Hub Architecture** (see Design System section below)

**Backend:**
- Next.js API Routes
- Supabase (PostgreSQL + pgvector)
- Stripe (subscriptions + payments)
- 6-tier AI fallback chain: xAI Grok 4 Fast (primary) → Gemini Flash → DeepSeek R1 → Claude Sonnet 4.6 → GPT-4o → Rules-based
- Gemini Embedding API (embeddings, gemini-embedding-001, 768 dimensions)

**Storage:**
- Supabase Storage or AWS S3 (file uploads)

**Infrastructure:**
- Vercel (hosting)
- Supabase (database + auth)
- Stripe (payments)

### Design System & Hub Architecture

**IMPORTANT:** AI Tutor Studio MUST follow Tutorwise's Hub Architecture patterns and UI standards.

**Reference Documents:**
- **Hub UI Standards**: `apps/web/src/components/hub/HUB-UI-STANDARDS.md`
- **Hub Layout**: `apps/web/src/app/(authenticated)/layout.tsx` (3-column layout)
- **Hub Components**: `apps/web/src/components/hub/`

**Hub Architecture Overview:**

```
┌─────────────────────────────────────────────────────────────────┐
│  3-COLUMN AUTHENTICATED LAYOUT                                   │
│  ───────────────────────────────────────────────────────────    │
│                                                                  │
│  ┌────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  AppSidebar│  │  Main Content    │  │  HubSidebar      │   │
│  │            │  │                  │  │                  │   │
│  │  • Home    │  │  Studio Builder  │  │  • Quick Stats   │   │
│  │  • Studio  │  │  • AI Tutor List │  │  • Analytics     │   │
│  │  • Market  │  │  • Create Form   │  │  • Charts        │   │
│  │  • Bookings│  │  • Analytics     │  │  • Widgets       │   │
│  │  • Sage    │  │                  │  │                  │   │
│  │            │  │                  │  │                  │   │
│  └────────────┘  └──────────────────┘  └──────────────────┘   │
│   (Fixed 240px)      (Fluid width)        (Fixed 320px)       │
└─────────────────────────────────────────────────────────────────┘
```

**Layout Path:**
- Route: `/studio` (authenticated route group)
- Layout file: `apps/web/src/app/(authenticated)/layout.tsx`
- Studio pages: `apps/web/src/app/(authenticated)/studio/`

**Required Hub Components to Use:**

1. **HubDataTable** - For AI tutor list view
   - Path: `components/hub/data/HubDataTable.tsx`
   - Features: Search, filters, pagination, sorting
   - Standard: 36px × 36px icon buttons, Universal Column Order

2. **HubSidebar** - For analytics sidebar
   - Path: `components/hub/sidebar/HubSidebar.tsx`
   - Widgets: Stats, charts, quick actions

3. **HubModal** - For AI tutor creation wizard
   - Path: `components/hub/modal/HubModal.tsx`
   - Standard: 2 buttons per row, consistent padding

4. **Hub Charts** - For session analytics
   - **HubTrendChart**: Line charts for trends (sessions over time)
   - **HubCategoryBreakdownChart**: Bar charts for categories (skills distribution)
   - Path: `components/hub/charts/`

5. **Hub Toolbar** - For search/filter/actions
   - Standard: 36px height, icon-only buttons, filter badge

**Critical UI Standards to Follow:**

```typescript
// Icon Button Standard (Toolbar)
.iconButton {
  width: 36px;        // ✅ EXACT - NOT 2.5rem or 40px
  height: 36px;       // ✅ EXACT
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
}

// Icon Size Standard
<Filter size={16} />  // ✅ Always 16px, NO color prop

// Filter Badge Standard
.filtersBadge {
  width: 18px;
  height: 18px;
  top: -6px;
  right: -6px;
  background: #ef4444;
  border-radius: 50%;
}

// Data Table Column Order (UNIVERSAL STANDARD)
// ID → Date → Service/Title → Domain Data → Actions
// Example: ID → Created → AI Tutor Name → Skills → Sessions → Status → Actions
```

**Chart Data Type Standards:**

```typescript
// ✅ CORRECT - Use 'label' field
interface TrendDataPoint {
  label: string;    // NOT 'date' - MUST be 'label'
  value: number;
}

interface CategoryData {
  label: string;    // NOT 'category' - MUST be 'label'
  value: number;
  color?: string;
}

// ✅ CORRECT - Chart props
<HubTrendChart
  data={trendData}
  title="AI Tutor Sessions"
  subtitle="Last 7 days"
  valueName="Sessions"   // NOT 'valueLabel'
  lineColor="#fbbf24"     // NOT 'color'
/>
```

**Responsive Breakpoints:**

```css
/* Mobile */
@media (max-width: 767px) {
  /* Single column, reduce padding */
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  /* Hide HubSidebar, 2-column charts */
}

/* Desktop */
@media (min-width: 1024px) {
  /* Full 3-column layout */
}
```

**Component File Structure:**

```
apps/web/src/app/(authenticated)/studio/
├── page.tsx                    # Studio dashboard (AI tutor list)
├── create/
│   └── page.tsx               # AI tutor creation wizard
├── [id]/
│   ├── page.tsx               # AI tutor detail/edit
│   ├── analytics/
│   │   └── page.tsx          # AI tutor analytics
│   └── materials/
│       └── page.tsx          # Manage materials
└── components/
    ├── StudioToolbar.tsx      # Search, filters, actions (use Hub standards)
    ├── AITutorCard.tsx       # AI tutor list item
    ├── CreateWizard.tsx      # Multi-step creation form
    ├── MaterialUploader.tsx  # File upload component
    └── SessionsList.tsx      # Anonymized session transcripts
```

**CSS Module Standards:**

```css
/* Studio-specific styles */
.studioContainer {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  padding: 2rem;
}

/* Reuse Hub standards */
.toolbar {
  /* Import from HubDataTable.module.css patterns */
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
}

.iconButton {
  width: 36px;     /* ✅ Hub standard */
  height: 36px;
  /* ... rest from HUB-UI-STANDARDS.md */
}
```

**Verification Checklist Before Commit:**

- [ ] Toolbar icon buttons are exactly `36px × 36px`
- [ ] Icons are `size={16}` with no color prop
- [ ] Charts use `label` field (not `date` or `category`)
- [ ] Charts use `valueName` prop (not `valueLabel`)
- [ ] Charts always render (even when data empty)
- [ ] Tables follow Universal Column Order (ID → Date → Title → Data → Actions)
- [ ] Modal buttons are 2 per row on all screens
- [ ] Responsive breakpoints: 767px (mobile), 768-1023px (tablet), 1024px+ (desktop)

**Reference Implementations:**

Good examples to follow:
- ✅ `apps/web/src/app/(authenticated)/bookings/page.tsx`
- ✅ `apps/web/src/app/(authenticated)/financials/page.tsx`
- ✅ `components/hub/data/HubDataTable.tsx`

**DO NOT** copy from:
- ❌ Legacy implementations before 2025-12-27
- ❌ Non-hub pages (different patterns)

---

## Advanced Features

### Organisation Integration (Phase 2)

> **Sage v3.0 Integration (Phase 2):** Studio AI tutors can leverage Sage's PlatformUserContext for enriched learner profiles (growth scores, referral history, marketplace activity) and SEN/SEND adaptations (dyslexia-friendly formatting, scaffolded responses, sensory considerations). These are available automatically via the Sage fallback path and can be explicitly opted into by AI tutor owners for always-on accessibility support.

**Allow tutors to create organisations (agencies) and add AI tutors as team members.**

#### Organisation Creation Flow

```
Tutor creates AI tutor
     │
     ▼
┌──────────────────────────────────────┐
│  Add to Organisation? (Optional)     │
│                                      │
│  ○ Keep as individual AI tutor       │
│  ○ Add to existing organisation      │
│  ○ Create new organisation           │
└──────────┬───────────────────────────┘
           │
           │ Select "Create new organisation"
           │
           ▼
┌──────────────────────────────────────┐
│  Create Organisation                 │
│                                      │
│  Name: [TutorPro Academy_________]  │
│  Description: [We are...________]    │
│  Type: ☑ Tutoring Agency            │
│                                      │
│  [Create & Add AI Tutor]             │
└──────────┬───────────────────────────┘
           │
           ▼
AI tutor now owned by organisation
```

#### Database Schema

```sql
-- Organisations table (already exists)
-- connection_groups table with type='organisation'

-- Add organisation_id to ai_tutors
ALTER TABLE ai_tutors
ADD COLUMN organisation_id UUID REFERENCES connection_groups(id) ON DELETE SET NULL;

-- Composite owner: either owner_id OR organisation_id
-- If organisation_id is set, AI tutor is owned by org
-- If owner_id is set, AI tutor is owned by individual

CREATE INDEX idx_ai_tutors_organisation ON ai_tutors(organisation_id);
```

#### Ownership Rules

| Scenario | owner_id | organisation_id | Who manages? | Who gets revenue? |
|----------|----------|-----------------|--------------|-------------------|
| **Individual tutor** | user-123 | NULL | Tutor | Tutor (90%) |
| **Organisation-owned** | NULL | org-456 | Org admins | Organisation (90%) |
| **Tutor in org** | user-123 | org-456 | Tutor + Org admins | Split (configurable) |

#### Organisation Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  TutorPro Academy - AI Tutors                               │
│  ────────────────────────────────────────────────────────  │
│                                                             │
│  📊 Overview                                                │
│  Total AI Tutors: 5                                        │
│  Total Sessions: 347                                       │
│  Total Revenue: £5,205                                     │
│  Subscription: £50/month (5 AI tutors)                     │
│                                                             │
│  Organisation AI Tutors                  [Create New +]    │
│  ┌───────────────────────────────────────────────────┐    │
│  │ Maths-AITutor-Pro    Created by: John (Team)     │    │
│  │ Status: Published    Sessions: 127   Revenue: £K  │    │
│  │ [Manage] [Analytics] [Edit]                       │    │
│  └───────────────────────────────────────────────────┘    │
│                                                             │
│  Team Members                                              │
│  • John Smith (Admin) - Can manage all AI tutors          │
│  • Sarah Jones (Editor) - Can edit AI tutors              │
│  • Mike Brown (Viewer) - Can view analytics only          │
└─────────────────────────────────────────────────────────────┘
```

#### Team Member Permissions

| Role | Create AI Tutor | Edit AI Tutor | View Analytics | Delete AI Tutor | Manage Subscription |
|------|----------------|---------------|----------------|-----------------|---------------------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Viewer** | ❌ | ❌ | ✅ | ❌ | ❌ |

#### Revenue Split Configuration

```typescript
// Organisation can configure revenue split
interface OrganisationAITutorRevenue {
  organisation_id: string;
  ai_tutor_id: string;
  revenue_split: {
    organisation_percentage: number;  // e.g., 50%
    creator_percentage: number;       // e.g., 50%
  };
}

// Example: 50/50 split
// Session: £20
// Platform fee (10%): £2
// Net: £18
// Organisation gets: £9
// Creator gets: £9
```

#### Use Cases

**Use Case 1: Tutoring Agency**
- TutorPro Academy has 10 tutors
- Agency creates 5 AI tutors (Maths, English, Science, etc.)
- All tutors can use org's AI tutors in their sessions
- Revenue goes to organisation
- Organisation pays £50/month (5 AI tutors × £10)

**Use Case 2: School**
- Oxford Academy creates "Oxford Maths AI Tutor"
- All students at school can access
- School pays £10/month
- Students don't pay per session (included in school fees)
- White-label pricing: £5/month wholesale (Phase 3)

---

### Graduated AI Tutor Limits (Phase 1)

**Prevent marketplace spam by limiting AI tutor creation based on reputation.**

#### Limit Tiers

| Tutor Status | CaaS Score | AI Tutor Limit | Rationale |
|--------------|------------|----------------|-----------|
| **New tutor** | < 50 | 1 AI tutor | Prove quality first |
| **Basic tutor** | 50-69 | 3 AI tutors | Basic trust established |
| **Verified tutor** | 70-79 | 10 AI tutors | DBS + qualifications |
| **Top tutor** | 80-89 | 25 AI tutors | High reputation |
| **Elite tutor** | 90+ | 50 AI tutors | Platform star |
| **Organisation** | N/A | 100 AI tutors | Team-based |

#### Implementation

```typescript
// Check limit before creation
async function canCreateAITutor(userId: string): Promise<{ allowed: boolean; limit: number; current: number }> {
  const profile = await getProfile(userId);
  const currentCount = await countAITutors(userId);

  // Get limit based on CaaS score
  let limit = 1; // Default for new tutors

  if (profile.caas_score >= 90) limit = 50;
  else if (profile.caas_score >= 80) limit = 25;
  else if (profile.caas_score >= 70) limit = 10;
  else if (profile.caas_score >= 50) limit = 3;

  // Organisations get 100
  if (profile.is_organisation) limit = 100;

  return {
    allowed: currentCount < limit,
    limit,
    current: currentCount
  };
}
```

#### UI Display

```
┌─────────────────────────────────────────┐
│  Create New AI Tutor                    │
│  ───────────────────────────────────   │
│                                         │
│  AI Tutor Limit: 2 / 3 used            │
│  💡 Increase limit by improving your    │
│     Credibility Score (currently 65)    │
│                                         │
│  [Create AI Tutor]                      │
└─────────────────────────────────────────┘

// If at limit:
┌─────────────────────────────────────────┐
│  ⚠️ AI Tutor Limit Reached              │
│                                         │
│  You've reached your limit (3 / 3)     │
│                                         │
│  Increase your limit by:                │
│  • Improving Credibility Score (70+)    │
│  • Getting verified (DBS + quals)       │
│  • Joining/creating an organisation     │
│                                         │
│  Current score: 65 → Need: 70+ (5 more)│
└─────────────────────────────────────────┘
```

#### Benefits

- ✅ Prevents spam (new tutors can't create 100 AI tutors)
- ✅ Incentivizes quality (improve CaaS = more AI tutors)
- ✅ Rewards top tutors (50+ AI tutors for elite tutors)
- ✅ Scales with platform trust (organisations get 100)

---

### Sage Fallback Implementation (Phase 1)

**When AI tutor can't answer from uploaded materials, fallback to Sage's general knowledge.**

> **Sage v3.0 (2026-03):** Sage now covers 467+ topics across KS1 to A-Level, IB, AP, SQA, and CIE curricula spanning 15+ subjects. This means Studio AI tutors benefit from a comprehensive fallback covering maths, english, science, computing, humanities, languages, social-sciences, business, arts, and more. Sage's PlatformUserContext and SEN/SEND adaptations are also available to Studio AI tutors via fallback, enabling accessibility-aware responses.

#### How It Works

```
Client asks question
     │
     ▼
┌────────────────────────────────────┐
│ 1. Search AI tutor's materials    │
│    (RAG: PDFs + URL links)         │
└─────┬──────────────────────────────┘
      │
      ├─ Found relevant content? ────> Use tutor materials ✅
      │
      └─ No relevant content found
          │
          ▼
┌────────────────────────────────────┐
│ 2. Fallback to Sage knowledge      │
│    (General AI knowledge base)     │
└─────┬──────────────────────────────┘
      │
      ▼
AI response with disclaimer:
"I don't have specific materials on this topic in my training materials.
 Let me use general knowledge to help..."
```

#### Trigger Conditions

AI falls back to Sage when:
1. **No material matches**: Vector similarity score < 0.3 threshold
2. **Empty materials**: AI tutor has 0 uploaded files/links
3. **Topic outside skills**: Client asks about topic not in AI tutor's skills

#### Client Experience

```
Client: "Can you help with trigonometry?"

AI Tutor (has no trig materials):
──────────────────────────────────────────────
💡 I don't have specific materials on trigonometry
   in my training resources. Let me help using
   general knowledge instead.

Trigonometry is the study of triangles and the
relationships between their sides and angles.
The three main functions are:
• sin(θ) = opposite / hypotenuse
• cos(θ) = adjacent / hypotenuse
• tan(θ) = opposite / adjacent

Would you like me to work through an example?
──────────────────────────────────────────────
```

#### Owner Analytics

**Dashboard shows fallback usage:**

```
📊 Knowledge Gaps (Last 30 days)

Topics where AI used Sage fallback:
1. Trigonometry - 12 times
   💡 Suggestion: Upload trig materials

2. Geometry proofs - 5 times
   💡 Suggestion: Add geometry resources

3. Calculus derivatives - 3 times
   💡 Suggestion: Add calculus worksheets

[Upload Materials for These Topics]
```

#### Implementation

```typescript
async function generateAIResponse(
  aiTutorId: string,
  message: string
): Promise<{ response: string; usedFallback: boolean; source: string }> {

  // 1. Try to retrieve from AI tutor's materials
  const materials = await searchAITutorMaterials(aiTutorId, message);

  if (materials.length > 0 && materials[0].similarity > 0.3) {
    // Use tutor materials
    const response = await generateFromMaterials(materials, message);

    return {
      response,
      usedFallback: false,
      source: `${materials[0].fileName} (page ${materials[0].page})`
    };
  }

  // 2. Fallback to Sage
  const disclaimer = "💡 I don't have specific materials on this topic. " +
                    "Let me use general knowledge to help...\n\n";

  const sageResponse = await generateFromSageKnowledge(message);

  // Track fallback for analytics
  await trackFallback(aiTutorId, message, 'no_materials_found');

  return {
    response: disclaimer + sageResponse,
    usedFallback: true,
    source: 'Sage general knowledge'
  };
}
```

#### Fallback Tracking

```sql
-- Track when AI uses fallback
CREATE TABLE ai_tutor_fallback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_tutor_id UUID NOT NULL REFERENCES ai_tutors(id),
  session_id UUID REFERENCES ai_tutor_sessions(id),

  -- What was asked
  query TEXT NOT NULL,
  topic VARCHAR(100), -- Extracted topic (e.g., "trigonometry")

  -- Why fallback happened
  reason VARCHAR(50),
    -- 'no_materials_found', 'low_similarity', 'topic_outside_skills'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fallback_tutor ON ai_tutor_fallback_events(ai_tutor_id);
CREATE INDEX idx_fallback_topic ON ai_tutor_fallback_events(topic);
```

#### Benefits

- ✅ Client never gets "I don't know" dead-end
- ✅ AI tutor still useful even with limited materials
- ✅ Owner sees knowledge gaps and can improve
- ✅ Differentiates from pure chatbot (transparency about sources)

---

### AI Tutor Templates (Phase 1)

**Pre-filled templates to speed up AI tutor creation and ensure quality.**

#### Available Templates

**Template 1: GCSE Maths Tutor**
```
Name: [Your Name]'s GCSE Maths Tutor
Subject: Maths
Description: Specialized AI tutor for GCSE Maths exam preparation,
covering algebra, geometry, statistics, and problem-solving.

Pre-selected Skills:
✅ Maths-GCSE (Primary)
✅ Algebra (Primary)
✅ Geometry
✅ Statistics
✅ Problem Solving

Suggested Pricing: £12-15/hour
Suggested Materials: Past papers, formula sheets, worked examples
```

**Template 2: A-Level Physics Tutor**
```
Name: [Your Name]'s A-Level Physics Tutor
Subject: Science
Description: Expert AI tutor for A-Level Physics, covering mechanics,
electricity, waves, and quantum physics.

Pre-selected Skills:
✅ Physics-A-Level (Primary)
✅ Mechanics (Primary)
✅ Electricity
✅ Waves
✅ Quantum Physics

Suggested Pricing: £15-18/hour
Suggested Materials: Exam questions, derivations, practical notes
```

**Template 3: English Essay Coach**
```
Name: [Your Name]'s English Essay Coach
Subject: English
Description: AI writing assistant for GCSE and A-Level English essays,
focusing on structure, analysis, and exam technique.

Pre-selected Skills:
✅ Essay Writing (Primary)
✅ English Literature (Primary)
✅ Creative Writing
✅ Grammar & Spelling

Suggested Pricing: £10-12/hour
Suggested Materials: Essay examples, mark schemes, writing guides
```

**Template 4: General Homework Helper**
```
Name: [Your Name]'s Homework Helper
Subject: (Choose: Maths / English / Science)
Description: All-purpose AI tutor for homework help, revision,
and general study support.

Pre-selected Skills:
(Varies by subject - broad coverage)

Suggested Pricing: £8-10/hour
Suggested Materials: Mixed resources, past papers, revision guides
```

**Template 5: French GCSE Tutor** *(New — Sage v3.0 subjects)*
```
Name: [Your Name]'s French GCSE Tutor
Subject: Languages
Description: AI tutor for GCSE French covering speaking, listening,
reading, and writing exam skills with vocabulary practice.

Pre-selected Skills:
- French-GCSE (Primary)
- Vocabulary & Grammar (Primary)
- Speaking Practice
- Exam Technique

Suggested Pricing: £10-14/hour
Suggested Materials: Vocab lists, past papers, grammar guides
```

**Template 6: Psychology A-Level Tutor** *(New — Sage v3.0 subjects)*
```
Name: [Your Name]'s Psychology A-Level Tutor
Subject: Psychology
Description: AI tutor for A-Level Psychology covering approaches,
biopsychology, research methods, and key studies.

Pre-selected Skills:
- Psychology-A-Level (Primary)
- Research Methods (Primary)
- Biopsychology
- Social Influence

Suggested Pricing: £12-16/hour
Suggested Materials: Study notes, evaluation guides, past papers
```

**Template 7: Primary Maths Tutor** *(New — Sage v3.0 KS1/KS2)*
```
Name: [Your Name]'s Primary Maths Tutor
Subject: Maths
Description: Friendly AI tutor for KS1/KS2 Maths, focusing on
number bonds, times tables, fractions, and SATs preparation.

Pre-selected Skills:
- Maths-KS1 (Primary)
- Maths-KS2 (Primary)
- Times Tables
- SATs Prep

Suggested Pricing: £6-10/hour
Suggested Materials: Worksheets, visual aids, practice tests
```

#### UI Flow

```
┌─────────────────────────────────────────────────────────┐
│  Create New AI Tutor                                    │
│  ──────────────────────────────────────────────────    │
│                                                         │
│  Start from template or build from scratch?            │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ 📚 GCSE Maths   │  │ ⚛️ A-Level      │             │
│  │ Tutor Template  │  │ Physics Template│             │
│  │                 │  │                 │             │
│  │ Pre-filled with │  │ Pre-filled with │             │
│  │ skills, pricing │  │ skills, pricing │             │
│  │ [Use Template]  │  │ [Use Template]  │             │
│  └─────────────────┘  └─────────────────┘             │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │ ✍️ English      │  │ 🎓 Homework     │             │
│  │ Essay Coach     │  │ Helper Template │             │
│  │ Template        │  │                 │             │
│  │ [Use Template]  │  │ [Use Template]  │             │
│  └─────────────────┘  └─────────────────┘             │
│                                                         │
│  [Start from Scratch →]                                │
└─────────────────────────────────────────────────────────┘

// After selecting template:
┌─────────────────────────────────────────────────────────┐
│  Step 1: Basic Info (Pre-filled from template)         │
│  ──────────────────────────────────────────────────    │
│                                                         │
│  Subject: Maths ✅                                      │
│  Display Name: [MicQuan]'s GCSE Maths Tutor           │
│  Description: [Specialized AI tutor for GCSE Maths...] │
│                                                         │
│  💡 Template pre-filled - edit as needed               │
│                                                         │
│  [← Back]  [Next: Skills →]                            │
└─────────────────────────────────────────────────────────┘
```

#### Implementation

```typescript
// Template definitions
export const AI_TUTOR_TEMPLATES = {
  gcse_maths: {
    id: 'gcse_maths',
    name: 'GCSE Maths Tutor',
    subject: 'maths',
    description: 'Specialized AI tutor for GCSE Maths exam preparation, covering algebra, geometry, statistics, and problem-solving.',
    skills: [
      { name: 'Maths-GCSE', is_primary: true },
      { name: 'Algebra', is_primary: true },
      { name: 'Geometry', is_primary: false },
      { name: 'Statistics', is_primary: false },
      { name: 'Problem Solving', is_primary: false }
    ],
    suggested_price_min: 12,
    suggested_price_max: 15,
    suggested_materials: [
      'GCSE past papers',
      'Formula sheets',
      'Worked examples',
      'Mark schemes'
    ]
  },
  // ... other templates
};

// Apply template
function applyTemplate(templateId: string, userName: string): Partial<AITutor> {
  const template = AI_TUTOR_TEMPLATES[templateId];

  return {
    display_name: `${userName}'s ${template.name}`,
    subject: template.subject,
    description: template.description,
    price_per_hour: (template.suggested_price_min + template.suggested_price_max) / 2,
    // Skills will be pre-selected in UI
  };
}
```

#### Benefits

- ✅ **Faster creation** (10 mins → 3 mins with template)
- ✅ **Higher quality** (best practices baked in)
- ✅ **Better pricing** (suggested ranges prevent under/overpricing)
- ✅ **Clearer focus** (pre-selected skills ensure specialization)
- ✅ **Lower barrier** (new tutors don't need to figure out everything)

---

### Key Libraries

```json
{
  "dependencies": {
    "@google/generative-ai": "^0.24.1",
    "@stripe/stripe-js": "^4.0.0",
    "stripe": "^18.0.0",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.8.0",
    "langchain": "^0.3.0",
    "zod": "^3.23.0",
    "react-hook-form": "^7.53.0",
    "zustand": "^5.0.0"
  }
}
```

### Core Services

**1. AI Tutor Service** (`/src/lib/services/ai-tutor-service.ts`)

```typescript
export class AITutorService {
  async create(data: CreateAITutorInput): Promise<AITutor>
  async update(id: string, data: UpdateAITutorInput): Promise<AITutor>
  async publish(id: string): Promise<AITutor>
  async unpublish(id: string): Promise<AITutor>
  async delete(id: string): Promise<void>
  async getById(id: string): Promise<AITutor>
  async listByOwner(ownerId: string): Promise<AITutor[]>
  async search(query: SearchQuery): Promise<AITutor[]>
}
```

**2. Material Service** (`/src/lib/services/material-service.ts`)

```typescript
export class MaterialService {
  async upload(aiTutorId: string, file: File): Promise<Material>
  async processFile(materialId: string): Promise<void>
  async extractText(file: File): Promise<string>
  async generateEmbeddings(text: string): Promise<number[]>
  async storeChunks(materialId: string, chunks: Chunk[]): Promise<void>
  async delete(materialId: string): Promise<void>
}
```

**3. Session Service** (`/src/lib/services/session-service.ts`)

```typescript
export class SessionService {
  async create(aiTutorId: string, clientId: string): Promise<Session>
  async sendMessage(sessionId: string, message: string): Promise<AIResponse>
  async retrieveContext(aiTutorId: string, query: string): Promise<Context[]>
  async generateResponse(context: Context[], message: string): Promise<string>
  async end(sessionId: string): Promise<Session>
  async saveTranscript(sessionId: string): Promise<void>
  async getAnonymizedTranscript(sessionId: string, ownerId: string): Promise<Transcript>
}
```

**4. Subscription Service** (`/src/lib/services/subscription-service.ts`)

```typescript
export class SubscriptionService {
  async createSubscription(aiTutorId: string, ownerId: string): Promise<Subscription>
  async cancelSubscription(subscriptionId: string): Promise<void>
  async handleWebhook(event: Stripe.Event): Promise<void>
  async checkStatus(aiTutorId: string): Promise<SubscriptionStatus>
  async unpublishExpired(): Promise<void> // Cron job: unpublish after 5 days
}
```

---

## Business Logic

### Subscription Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│  SUBSCRIPTION LIFECYCLE                                          │
└─────────────────────────────────────────────────────────────────┘

Owner clicks "Publish & Subscribe"
           │
           ▼
    Create Stripe Checkout
           │
           ▼
    Payment Successful
           │
           ├─> Create subscription record (status: 'active')
           ├─> Update ai_tutor.subscription_status = 'active'
           ├─> Update ai_tutor.status = 'published'
           └─> Update ai_tutor.published_at = NOW()

    ───────────────────────────────────────────────

Monthly Renewal (Stripe webhook: invoice.paid)
           │
           ├─> Update subscription.current_period_end
           └─> Keep ai_tutor.subscription_status = 'active'

    ───────────────────────────────────────────────

Payment Failed (Stripe webhook: invoice.payment_failed)
           │
           ├─> Update subscription.status = 'past_due'
           ├─> Update ai_tutor.subscription_status = 'past_due'
           └─> Send email notification to owner

    ───────────────────────────────────────────────

Subscription Canceled (Stripe webhook: customer.subscription.deleted)
           │
           ├─> Update subscription.status = 'canceled'
           ├─> Update ai_tutor.subscription_status = 'canceled'
           └─> Schedule unpublish (after 5 days grace period)

    ───────────────────────────────────────────────

Cron Job (Daily): Unpublish Expired AI Tutors
           │
           ▼
    SELECT * FROM ai_tutors
    WHERE subscription_status = 'canceled'
      AND updated_at < NOW() - INTERVAL '5 days'
      AND status = 'published'
           │
           ├─> Update ai_tutor.status = 'unpublished'
           └─> Send email notification to owner
```

### Session Pricing & Revenue Split

```
Client books AI tutor session @ £15/hour
           │
           ▼
    Stripe charge: £15.00
           │
           ├─> Platform fee (10%): £1.50
           └─> Owner earnings (90%): £13.50

    Session record saved:
    - price_paid: £15.00
    - platform_fee: £1.50
    - owner_earnings: £13.50

    ───────────────────────────────────────────────

Revenue to owner (via Stripe Connect):
    - Transfer £13.50 to owner's Stripe account
    - Platform retains £1.50 commission

Platform monthly revenue per AI tutor:
    - Subscription: £10.00 /month
    - Commission: £X /month (depends on sessions)

Example (20 sessions/month @ £15):
    - Subscription: £10.00
    - Commission: 20 × £1.50 = £30.00
    - Total: £40.00 /month per AI tutor
```

### Minimum Price Enforcement (£5/hour)

```typescript
// In AI Tutor creation/update
if (price_per_hour < 5.00) {
  throw new Error('Minimum price is £5.00 per hour');
}

// In marketplace search
// Sort by: relevance, rating, price (but all prices >= £5)

// No dynamic pricing below £5 allowed
```

---

## Phase Breakdown

### Phase 1: MVP (Week 1-3) - Closed Beta

**Goal:** Validate demand with 10 top tutors

**Status Update (2026-02-23):**
- **Progress:** 85% complete
- **ETA to Beta:** 4-5 days
- See [implementation-status-update.md](./implementation-status-update.md) for detailed status

**Scope:**
- ✅ AI Tutor Builder (single-page form - COMPLETE, not wizard)
- 🟡 **AI Tutor Templates** (API ready, needs template data)
- ✅ Material upload (PDF, DOCX, PPTX - 1GB limit per AI tutor)
- ✅ **URL link support** (YouTube, Google Docs, webpages - max 20 links per AI tutor)
- ✅ Pre-defined skills library (no custom skills in MVP)
- ✅ Stripe subscription (£10/month per AI tutor)
- 🟡 Marketplace listings (API ready, UI filters pending)
- 🔴 Chat-based sessions (API ready, client UI pending)
- ✅ RAG pipeline (Gemini + pgvector)
- ✅ **Sage fallback system** (AI uses Sage knowledge when materials insufficient)
- ✅ Material priority (uploaded files > URL links > Sage knowledge)
- ✅ Reviews (5-star system, same as human tutors)
- ✅ Refund/dispute (reuse human tutor policies - 24h window)
- ✅ Anonymized owner transcripts (privacy-first design)
- 🟡 **Graduated AI tutor limits** (Database ready, enforcement pending)

**Success Criteria:**
- 5/10 tutors create AI tutors
- 50+ sessions booked
- 4.0+ avg client satisfaction
- <10% drop in human sessions

**Timeline:** 2-3 weeks

---

### Phase 2: Open Beta (Week 4-12)

**Goal:** Scale to 100 AI tutors

**Scope:**
- ✅ Open to all verified tutors (CaaS 70+)
- ✅ AI Quality Score (0-100 scoring system)
- ✅ Custom skills (create unique skills beyond pre-defined library)
- ✅ Advanced analytics dashboard (session heatmaps, skill performance)
- ✅ Material skill-tagging (tag specific PDFs/links to specific skills)
- ✅ Owner notifications (escalation, reviews, low ratings)
- ✅ In-session "Request Human Help" button
- ✅ Organisation integration (create org, add AI tutor as team member)

**URL Link Feature Details (Phase 1 - MVP):**

Tutors can add external resource links alongside uploaded files:

**Supported Link Types:**
- YouTube tutorial videos
- Google Docs / Sheets (public or shared links)
- Online worksheets or quizzes
- Educational websites
- Past paper repositories

**How It Works:**

1. **Add Links in AI Tutor Builder:**
   ```
   Materials Tab:
   ┌─────────────────────────────────────┐
   │ Upload Files  |  Add URL Links      │
   ├─────────────────────────────────────┤
   │                                     │
   │ URL: [https://youtube.com/...____] │
   │ Title: [GCSE Algebra Tutorial___]  │
   │ Skills: ☑ Maths-GCSE ☑ Algebra     │
   │                                     │
   │ [Add Link]                          │
   │                                     │
   │ Added Links:                        │
   │ 🔗 GCSE Algebra Tutorial (YouTube)  │
   │    Skills: Maths-GCSE, Algebra      │
   │    [Edit] [Remove]                  │
   └─────────────────────────────────────┘
   ```

2. **Material Priority System:**
   - Priority 1: Uploaded files (PDFs, DOCX, PPTX)
   - Priority 2: URL links
   - Priority 3: Sage default knowledge

3. **AI Session Behavior:**
   ```
   Client: "Can you help with quadratic equations?"

   AI searches:
   1. Uploaded PDFs tagged with "Maths-GCSE" → Found!
   2. Uses content from "Algebra_Worksheets.pdf"
   3. Also references YouTube link: "For a video explanation,
      check out this tutorial: [GCSE Algebra Tutorial]"
   ```

4. **Link Validation:**
   - Check URL is accessible (HTTP 200 response)
   - Warn if link is broken or inaccessible
   - Allow owner to update/remove broken links

**Implementation:**

```typescript
interface AITutorLink {
  id: string;
  ai_tutor_id: string;
  url: string;
  title: string;
  description?: string;
  link_type: 'youtube' | 'google_docs' | 'webpage' | 'worksheet';
  skills: string[];  // e.g., ["Maths-GCSE", "Algebra"]
  priority: number;  // 1=high, 2=medium, 3=low
  status: 'active' | 'broken' | 'removed';
  added_at: Date;
}
```

**Benefits:**
- ✅ Tutors don't need to download/upload external content
- ✅ Links to specialized online tools (e.g., Desmos, Khan Academy)
- ✅ AI can reference video tutorials without embedding
- ✅ Keeps materials up-to-date (link to latest past papers)

**Limits:**
- Max 20 links per AI tutor (Phase 2)
- Links must be publicly accessible (no authentication required)
- Platform doesn't scrape link content (just displays URL to client)

**Success Criteria:**
- 100 AI tutors created
- 2,000 sessions/month
- £25/month revenue per AI tutor
- 20% AI → human conversion rate

**Timeline:** 8 weeks

---

### Phase 3: Public Launch (Week 13+)

**Goal:** 1,000+ AI tutors

**Scope:**
- ✅ VirtualSpace integration (AI joins video sessions)
- ✅ Bundle pricing (3 AI + 1 human = £50)
- ✅ Client subscriptions to AI tutors (£30/month unlimited)
- ✅ Material marketplace (tutors share/sell materials)
- ✅ White-label AI for organisations (£5/month wholesale)
- ✅ Advanced RAG (fine-tuning, multi-modal)

**Timeline:** 12+ weeks

---

## Success Metrics

### Phase 1 (MVP - Week 4)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| AI tutors created | 5 | TBD | 🟡 Pending |
| Avg creation time | <15 mins | TBD | 🟡 Pending |
| Sessions booked | 50 | TBD | 🟡 Pending |
| Client satisfaction | 4.0+ stars | TBD | 🟡 Pending |
| Human session drop | <10% | TBD | 🟡 Pending |
| Revenue/AI tutor | £20+ | TBD | 🟡 Pending |

### Phase 2 (Open Beta - Month 3)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| AI tutors live | 100 | TBD | 🟡 Pending |
| Sessions/month | 2,000 | TBD | 🟡 Pending |
| MRR | £2,500 | TBD | 🟡 Pending |
| AI → human conversion | 20% | TBD | 🟡 Pending |

### Phase 3 (Public Launch - Month 12)

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| AI tutors live | 1,000 | TBD | 🟡 Pending |
| Sessions/month | 20,000 | TBD | 🟡 Pending |
| MRR | £30,000 | TBD | 🟡 Pending |
| ARR | £360,000 | TBD | 🟡 Pending |

---

## Risks & Mitigation

### Risk 1: Low Tutor Adoption

**Risk:** Tutors don't create AI tutors (too much effort, unclear ROI)

**Mitigation:**
- ✅ Make creation EASY (10-min setup, templates, auto-suggestions)
- ✅ Show revenue projections upfront ("Earn £100-300/month extra")
- ✅ Provide pre-filled templates (GCSE Maths template, A-Level Physics template)
- ✅ Offer 1-month free trial for early adopters

### Risk 2: Low AI Quality

**Risk:** AI tutors give wrong answers, materials are poor, clients don't rebook

**Mitigation:**
- ✅ Fallback to Sage (if AI can't answer from materials, use Sage knowledge)
- ✅ Review system (bad AI tutors get low ratings, fewer bookings)
- ✅ Knowledge gap monitoring (owner sees when AI struggles)
- ✅ Limit creation to verified tutors initially (CaaS 70+)
- ✅ Refund policy (clients can dispute low-quality sessions)

### Risk 3: Revenue Cannibalization

**Risk:** Human sessions drop as tutors push clients to cheaper AI sessions

**Mitigation:**
- ✅ Monitor human session rates closely (alert if drop >10%)
- ✅ Position AI as "revision/practice", human as "quality tutoring"
- ✅ Bundle pricing (2 AI + 1 human = £50)
- ✅ Upsell AI clients to human sessions (post-session CTA)
- ✅ £5 minimum price (prevents undercutting too much)

### Risk 4: Technical Scalability

**Risk:** 1,000 AI tutors = 1,000 RAG pipelines, Gemini rate limits, high costs

**Mitigation:**
- ✅ Start small (100 AI tutors in beta)
- ✅ Monitor Gemini API usage (rate limits, quotas)
- ✅ Optimize embedding generation (batch processing, caching)
- ✅ Use HNSW indexes for fast vector search (pgvector)
- ✅ CDN for material storage (reduce bandwidth costs)
- ✅ Consider multi-tenant RAG architecture (shared infrastructure)

### Risk 5: Legal Liability

**Risk:** AI gives wrong exam advice, student sues Tutorwise or tutor

**Mitigation:**
- ✅ Clear disclaimer: "AI-generated answers, verify important information"
- ✅ Terms of Service: "Owner responsible for uploaded materials"
- ✅ Copyright validation: "You confirm you have rights to upload all materials"
- ✅ DMCA takedown process (flagged content removed quickly)
- ✅ Content moderation (automated scanning for harmful content)

### Risk 6: Client Confusion (Sage vs AI Tutors)

**Risk:** Clients don't understand difference between Sage and AI Tutors

**Mitigation:**
- ✅ Clear marketplace filters: [All] [Humans] [AI Tutors] [Platform AI (Sage)]
- ✅ Badge on listings: "🤖 AI Tutor" vs "👨‍🏫 Human Tutor" vs "🏢 Platform AI"
- ✅ Help text: "AI Tutors are created by verified tutors with specialized materials"
- ✅ Comparison table on /studio landing page

### Risk 7: Stripe Subscription Management Complexity

**Risk:** Webhooks fail, subscriptions not updated, AI tutors unpublished incorrectly

**Mitigation:**
- ✅ Robust webhook handling (retry logic, idempotency)
- ✅ Monitor webhook failures (alerts to dev team)
- ✅ Grace period (5 days after subscription lapses before unpublishing)
- ✅ Email notifications (owner warned before unpublish)
- ✅ Manual override (admin can re-publish if false positive)

---

## Next Steps

### Immediate (This Week)

1. ✅ **Finalize design** - Review this document with team
2. ✅ **Create database migrations** - Set up tables in Supabase
3. ✅ **Set up Stripe product** - Create `ai_tutor_creator` subscription product
4. ✅ **Design UI mockups** - Figma designs for Studio Builder
5. ✅ **Identify beta tutors** - Invite 10 top tutors (CaaS 80+)

### Week 1-2 (Development)

1. ✅ Build AI Tutor Builder UI (4-step flow)
2. ✅ Implement material upload + RAG pipeline
3. ✅ Create marketplace integration (search, listings)
4. ✅ Build chat session UI (reuse Sage)
5. ✅ Integrate Stripe subscriptions

### Week 3 (Testing & Beta Launch)

1. ✅ Internal testing (QA)
2. ✅ Invite 10 beta tutors
3. ✅ Monitor metrics daily
4. ✅ Iterate based on feedback
5. ✅ Prepare for Phase 2 (if success criteria met)

---

## Strategic Context & Market Positioning

### Why This Feature is a Game-Changer

**Unique Market Position:**
- First AI tutor marketplace (no competitor has this)
- Khan Academy: One AI (Khanmigo)
- TutorAI.me: Generic AI
- **Tutorwise**: Marketplace of 100s of specialized, human-created AI tutors

**Category-Defining Feature:**
- Positions Tutorwise as "The AI Tutor Marketplace"
- Hard to replicate (requires tutors + AI + marketplace)
- Defensible moat (tutor-created knowledge base)

### Natural Market Segmentation (Three Tiers)

> **Three-tier learning model:** Sage (platform AI) → AI Tutor Studio (customised AI) → Human Tutor. Each tier serves a distinct need; clients self-select and often use all three.

Market forces will create three distinct tiers without platform intervention:

| Tier | Use Case | Price Point | Value Prop |
|------|----------|-------------|------------|
| **Sage** | Quick questions, general help | £10/month unlimited | "Your everyday study buddy" |
| **AI Tutors** | Specialized revision, practice | £5-15/hour | "Expert materials for focused practice" |
| **Human Tutors** | Quality tutoring, exam prep | £40/hour | "Personalized teaching & strategy" |

**Why this works:**
- ✅ No cannibalization (different use cases)
- ✅ Clients self-select based on need
- ✅ AI Tutors complement human sessions (not replace)
- ✅ Revenue expansion (clients use all three tiers)

### Pricing Dynamics & Market Forces

**Client Confusion → Solved by Competition:**

Initial concern: "Why pay £15/hour for AI when Sage is £10/month?"

**Reality:** Creators will naturally price competitively because they KNOW they compete with Sage:
- Sage effective cost: ~£0.50/session (if used 20 times/month)
- AI Tutors must offer value: specialized materials, expert curation, focused topics
- Market finds equilibrium: £5-15/hour range

**Creators will position AI tutors as:**
- 🎯 "Revision" vs Sage's "general help"
- 📚 "Practice with past papers" vs Sage's "quick questions"
- 🎓 "GCSE Maths specialist" vs Sage's "all subjects"

**Revenue Floor Protected (Subscription Anchor):**

Even if session prices drop, platform revenue is protected:
- **Subscription**: £10/month guaranteed (regardless of session price)
- **Commission**: Bonus revenue on top (10% of sessions)

Example at minimum price (£5/hour):
- Subscription: £10/month ✅
- Commission: 20 sessions × £0.50 = £10/month ✅
- **Total: £20/month per AI tutor** (2× Sage Pro revenue)

### Competitive Analysis

**vs Platform AI Tutors (Sage, Khanmigo):**
- **Sage/Khanmigo**: Generic knowledge, one-size-fits-all
- **AI Tutors**: Specialized, curated by expert tutors, personalized materials

**vs Generic AI Platforms (TutorAI.me):**
- **TutorAI.me**: One generic AI, no marketplace, no human connection
- **Tutorwise Studio**: Marketplace of specialized AI tutors, created by verified tutors

**vs Human Tutors Only Platforms:**
- **Traditional platforms**: Only human tutors, limited by time
- **Tutorwise**: Human + AI hybrid (scale + quality)

**Unique Advantages:**
1. ✅ Only platform with human-created AI tutor marketplace
2. ✅ Material upload capability (no competitor has this)
3. ✅ Fallback to Sage (safety net)
4. ✅ Seamless AI → Human escalation (upsell path)
5. ✅ Double revenue stream (subscription + commission)

### Refund & Cancellation Policy (Simplified)

**Approach: Reuse Human Tutor Policies**

**Refund Policy:**
- Same as human tutors (24-hour dispute window)
- Client can dispute session within 24 hours
- Platform reviews case-by-case
- Valid disputes: technical failure, AI gave incorrect information, AI couldn't teach stated skills
- Invalid disputes: subjective ("didn't like it"), preference ("preferred human")

**Benefits:**
- ✅ Reuse existing dispute resolution system
- ✅ No new code needed
- ✅ Clients already understand the rules

**Cancellation Policy:**
- Same as human tutors (24-hour cancellation window)
- Client cancels >24 hours before session → full refund
- Client cancels <24 hours → no refund
- "Instant start" sessions → no cancellation (session starts immediately)

**Benefits:**
- ✅ Reuse existing cancellation logic
- ✅ Consistent across all marketplace bookings
- ✅ No special cases

**Fallback to Sage (Quality Safety Net):**
- If AI tutor quality is low → AI falls back to Sage knowledge (467+ topics across KS1 to A-Level, IB, AP, SQA, CIE covering 15+ subjects)
- Client still gets help (never stuck with useless AI)
- Owner sees feedback: "Needed Sage fallback" → uploads better materials
- Self-regulating quality mechanism

### Client Escalation Paths

**Multi-Path Escalation (Different scenarios, different solutions):**

**1. Pre-Booking Questions**
- "Contact Tutor" button on AI tutor listing
- Opens existing messaging system
- Pre-filled template: "Hi, I have a question about your AI tutor..."

**2. In-Session Help** (Phase 2)
- "Request Human Help" button appears when AI struggles
- Owner notified: "Client needs help in session #1234"
- Owner can message client, join session, or schedule human follow-up

**3. Post-Session Upsell**
- After AI session ends: "Need more help? Book [Owner] for human tutoring"
- One-click booking for human session
- Natural upgrade path (AI → Human)

**4. Automatic AI Detection** (Phase 2)
- AI detects when struggling (says "I don't know" 3+ times)
- AI suggests: "Would you like to connect with [Owner] (human tutor)?"
- Proactive quality control

**5. Disputes**
- Standard dispute flow (reuse existing system)
- "Report Issue" → Platform handles
- If legitimate issue → Platform contacts owner

**Owner Response Options:**
When notified of escalation, owner can:
- Message client (answer question via chat)
- Offer discount ("£5 off your first human session")
- Schedule callback
- Update AI materials (fix knowledge gap)
- Ignore (if not interested in human sessions)

### Revenue Model Deep Dive

**Per AI Tutor Economics:**

**Minimum Price Scenario (£5/hour):**
- Sessions: 20/month
- Platform revenue:
  - Subscription: £10/month
  - Commission: 20 × £5 × 10% = £10/month
  - **Total: £20/month**

**Realistic Scenario (£10/hour):**
- Sessions: 20/month
- Platform revenue:
  - Subscription: £10/month
  - Commission: 20 × £10 × 10% = £20/month
  - **Total: £30/month**

**Premium Scenario (£15/hour):**
- Sessions: 30/month (popular tutor)
- Platform revenue:
  - Subscription: £10/month
  - Commission: 30 × £15 × 10% = £45/month
  - **Total: £55/month**

**Platform Scale Projections:**

| AI Tutors | MRR (Conservative) | MRR (Realistic) | MRR (Optimistic) |
|-----------|-------------------|-----------------|------------------|
| 100 | £2,000 | £3,000 | £5,000 |
| 500 | £10,000 | £15,000 | £25,000 |
| 1,000 | £20,000 | £30,000 | £55,000 |
| 5,000 | £100,000 | £150,000 | £275,000 |

**ARR Potential:**
- 1,000 AI Tutors: **£240K-£660K ARR**
- 5,000 AI Tutors: **£1.2M-£3.3M ARR**

**This is a £250K-£3M ARR feature at scale.**

### Risk Assessment & Mitigation Summary

**Initial Concerns (Now Resolved):**

| Original Concern | Solution | Status |
|-----------------|----------|--------|
| Client confusion (Sage vs AI Tutors) | Market forces create natural tiers | ✅ Resolved |
| Pricing race to bottom | £5 minimum + £10 subscription anchor | ✅ Resolved |
| Revenue cannibalization | Different use cases (revision vs tutoring) | ✅ Resolved |
| Quality control | Sage fallback + reviews + refunds | ✅ Mitigated |

**Remaining Risks (Manageable):**

1. **Tutor Adoption** (Medium)
   - Make creation EASY (10 mins)
   - Show revenue projections
   - 1-month free trial for early adopters

2. **Technical Scalability** (Medium)
   - Start small (100 AI tutors)
   - Monitor Gemini API usage
   - Optimize RAG pipeline

3. **Legal Liability** (Low)
   - Clear disclaimers
   - Terms of Service
   - DMCA takedown process

### Expected Outcomes (12 Months)

**Conservative:**
- 500 AI tutors created
- 10 sessions/month each
- Avg price: £8/hour
- **Revenue: £108K ARR**

**Realistic:**
- 1,000 AI tutors created
- 20 sessions/month each
- Avg price: £10/hour
- **Revenue: £360K ARR**

**Optimistic:**
- 2,000 AI tutors created
- 30 sessions/month each
- Avg price: £12/hour
- **Revenue: £1.1M ARR**

**This could be a MILLION-POUND ARR feature.**

### Launch Strategy

**Phase 1: Closed Beta (Week 1-4)**
- Invite 10 top tutors (CaaS 80+)
- Simplified MVP (chat, basic skills, PDF uploads)
- £5/hour minimum enforced
- Watch metrics: creation rate, booking rate, satisfaction

**Success Criteria:**
- ✅ 5/10 tutors create AI tutors (50% adoption)
- ✅ 50+ sessions booked
- ✅ 4.0+ client satisfaction
- ✅ <10% human session drop (no cannibalization)
- ✅ £20+ revenue per AI tutor

**Phase 2: Open Beta (Week 5-12)**
- Invite 100 more tutors (CaaS 70+)
- Add AI Quality Score
- Refine based on feedback
- Monitor cannibalization closely

**Success Criteria:**
- ✅ 100 AI tutors live
- ✅ 2,000 sessions/month
- ✅ £25/month revenue per AI tutor
- ✅ 20% AI → human conversion (upsell working)

**Phase 3: Public Launch (Week 13+)**
- Open to all verified tutors
- Full marketing push
- VirtualSpace integration (if needed)
- Advanced features

**Target:**
- 1,000 AI tutors
- £30K MRR (£360K ARR)

### Why This Feature Will Succeed

**1. Revenue Model is Better Than Expected:**
- Subscription anchor (£10/month guaranteed)
- Commission is bonus (not primary revenue)
- 2× better than Sage Pro revenue (£20 vs £10)

**2. Market Self-Regulates:**
- Pricing naturally competitive (creators compete with Sage)
- Quality self-corrects (reviews + Sage fallback)
- Positioning emerges organically (revision vs tutoring)

**3. Low Cannibalization Risk:**
- Different use cases (AI for practice, human for quality)
- Three-tier market (Sage → AI Tutors → Human)
- Hybrid clients (use all three)

**4. Strong Value Props:**
- **For tutors**: Scale expertise 24/7, passive income, differentiation
- **For clients**: Specialized help, affordable, instant availability
- **For platform**: Double revenue, category-defining, defensible moat

**5. Technical Feasibility:**
- Reuse Sage infrastructure (80% of code)
- RAG pipeline proven (Sage uses it)
- Stripe subscriptions (already built)

**Final Assessment: BUILD THIS NOW** 🚀

This is a HIGH REWARD, MANAGEABLE RISK feature that could:
- Generate £250K-£1M ARR at scale
- Position Tutorwise as category leader
- Create defensible competitive moat
- Unlock new revenue streams

**The key: Ship fast (2-3 weeks), measure closely, iterate or kill based on data.**

---

## Appendix

### Pre-Defined Skill Library

```typescript
export const SKILL_LIBRARY = {
  maths: [
    'Maths-GCSE',
    'Maths-A-Level',
    'Maths-Revision',
    'Algebra',
    'Geometry',
    'Calculus',
    'Statistics',
    'Problem Solving',
    'Trigonometry'
  ],
  english: [
    'English-GCSE',
    'English-A-Level',
    'English Literature',
    'Creative Writing',
    'Essay Writing',
    'Grammar & Spelling',
    'Reading Comprehension'
  ],
  science: [
    'Science-GCSE',
    'Physics-GCSE',
    'Physics-A-Level',
    'Chemistry-GCSE',
    'Chemistry-A-Level',
    'Biology-GCSE',
    'Biology-A-Level',
    'Science-Revision'
  ]
};
```

### File Type Support

| Format | Supported | Max Size | Notes |
|--------|-----------|----------|-------|
| PDF | ✅ Yes | 100 MB | Primary format |
| DOCX | ✅ Yes | 50 MB | Microsoft Word |
| PPTX | ✅ Yes | 50 MB | Microsoft PowerPoint |
| TXT | ✅ Yes | 10 MB | Plain text |
| MD | ✅ Yes | 10 MB | Markdown |
| CSV | 🟡 Phase 2 | 10 MB | Data files |
| XLSX | 🟡 Phase 2 | 50 MB | Excel files |
| Images | 🟡 Phase 2 | 10 MB | PNG, JPG (OCR) |
| Videos | ❌ No | N/A | Too large |

### Revenue Projections

**Conservative (100 AI Tutors):**
- Subscriptions: 100 × £10 = £1,000/month
- Sessions: 100 × 10 sessions × £5 avg × 10% = £500/month
- **Total MRR: £1,500** (~£18K ARR)

**Realistic (1,000 AI Tutors):**
- Subscriptions: 1,000 × £10 = £10,000/month
- Sessions: 1,000 × 20 sessions × £10 avg × 10% = £20,000/month
- **Total MRR: £30,000** (~£360K ARR)

**Optimistic (5,000 AI Tutors):**
- Subscriptions: 5,000 × £10 = £50,000/month
- Sessions: 5,000 × 30 sessions × £12 avg × 10% = £180,000/month
- **Total MRR: £230,000** (~£2.76M ARR)

---

**Document Status:** Draft v1.0
**Next Review:** After MVP beta results (Week 4)
**Owner:** Tutorwise Product Team

---

*This solution design is a living document and will be updated as we learn from user feedback and technical implementation.*
