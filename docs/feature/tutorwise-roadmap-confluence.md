# Tutorwise Roadmap

**Source:** Confluence - Technology Operations (TO)
**Page ID:** 14254084
**Version:** 2
**URL:** https://tutorwise.atlassian.net/wiki/spaces/TO/pages/14254084/Tutorwise+roadmap

---

## Core Architecture Decisions

### 1. One Page per Service Listing

- Each service type (e.g. *Post Jobs*, *Sell Courses*, *Post Group Sessions*, etc.) has its **own dedicated page**.
- The form is filled in by the **Client** (or **Agent**) when creating a listing.
- Once published, the listing appears under their **Dashboard → Listings tab**.

### 2. Consistent, Modular Structure

- All listing pages follow the same structure so they remain **independent**, but still feel consistent.
- This modularity helps future scaling (e.g. adding new services won't break existing ones).

### 3. Unified UI/UX & Data Structure

- All **five service delivery processes** (Listings, Applications, Referrals, Bookings, Payments) share a **unified UI/UX approach**.
- Under the hood: a **single table schema** can support multiple listing workflows rather than separate siloed tables.

### 4. Matching Engine Dependency

- The **matching engine** relies on this listings structure.
- Data captured on the **Request Form (from clients)** and **Profile Form (from tutors)** is aligned, ensuring consistency for search, filtering, and matching.

### 5. Entry via Search & Filters ("Home")

- Section **5.3.3 Search and Filters** (the "Home" marketplace page) acts like Airbnb/Superprof:
  - Primary entry point for users.
  - Connects dashboards, profiles, and listings.
  - Powered by the structured listings data.

---

## Profile vs Listing Strategy

### Decision: Basic Profile + Detailed Listings

**Confirmed approach:**
- Keep the **Tutor Profile** fairly **basic** (identity, contact essentials, maybe a short intro)
- Push all **professional information** (subjects taught, pricing, availability, delivery format, credentials, etc.) into the **Listings**

**Result:**
- A **Tutor → Listings** relationship is **one-to-many**
- A single tutor can post multiple listings (e.g. *GCSE Maths tutoring*, *A-Level Physics group session*, *Online coding bootcamp*)
- Each listing can carry its own "professional layer" without bloating the profile or forcing a one-to-one structure

**Benefits:**
- Keeps the **matching engine** flexible (since matching runs off listings, not rigid profiles)
- Makes it easier to expand into new service types without reworking the tutor profile structure
- Avoids locking into a **one-to-one tutor → service model**

---

## Client Request System

### Client Listings Structure

**Tutor Side (Supply):**
- **Tutor Profile = Basic** (identity, trust markers, not overloaded)
- **Tutor Listings = Standardised Service Units** (subject, level, format, rate, availability)
- A tutor can have **multiple listings** → one-to-many relationship

**Client Side (Demand):**
- **Client Profile = Basic** (name, child's age/level, location, trust markers)
- **Lesson Requests = Structured Listings** (requirements: subject, level, frequency, budget, preferred format)
- A client can post multiple requests → one-to-many relationship

### Matching Model

**Matching = Listing ↔ Request**
- Engine matches **Tutor Listings ↔ Client Requests** (both structured listings)
- Profiles exist only for **identity and continuity** — they aren't the matching object
- This creates a **true marketplace graph**:
  - One tutor listing can match many client requests
  - One client request can match many tutor listings

---

## Data Architecture: Option C (Recommended)

### Storage Strategy: Unified Listings Table + Detail Tables

**Core Tables:**

1. **Users**
   - `user_id` (PK)
   - `role` (tutor, client, agent, admin)
   - `name`, `email`, `auth_id`, etc.
   - `profile_basic` (identity & trust markers only, not professional info)

2. **Listings** (unified hub)
   - `listing_id` (PK)
   - `user_id` (FK → Users)
   - `type` (`tutor_service`, `client_request`, `group_session`, `course`, `referral`)
   - `status` (`draft`, `published`, `archived`)
   - `created_at`, `updated_at`
   - AI metadata fields (see AI-First Architecture below)

3. **TutorListingDetails** (supply-side detail)
   - `listing_id` (FK → Listings)
   - `subject`, `level`, `hourly_rate`, `availability`, `format` (online, in-person)
   - `experience`, `credentials`, etc.

4. **ClientRequestDetails** (demand-side detail)
   - `listing_id` (FK → Listings)
   - `subject`, `level`, `budget`, `lesson_goals`, `preferred_schedule`
   - `format` (online, in-person), etc.

5. **Matches**
   - `match_id` (PK)
   - `tutor_listing_id` (FK → TutorListingDetails)
   - `client_request_id` (FK → ClientRequestDetails)
   - `score` (match % from engine)
   - `status` (`pending`, `accepted`, `rejected`, `booked`)
   - `created_at`

**Why Option C Wins:**
- **Scalability:** New service types just get their own `...Details` table while pointing at unified `Listings`
- **Clarity:** Tutors and clients don't get mixed up in one bloated table
- **Innovation:** Makes the matching engine the heart of the platform, not the profile

---

## AI-First Architecture

### Core Principle: Listings are the Atomic Unit

- Forget "profiles" as the core — they're just wrappers for trust/identity
- The **Listing** is the building block for everything:
  - **Tutor Service Listing** = supply side
  - **Client Lesson Request** = demand side
  - **AI Recommendation Listing** = AI-generated suggestions
  - **Agent/Referrer Listing** = referrals as listings with metadata

### AI Metadata (stored with every listing)

**Essential AI Fields:**
- `embedding_vector` (float[], updated on create/update)
- `embedding_version` (model id + timestamp)
- `canonical_tags` (IDs from taxonomy)
- `skill_profile` (sparse vector of skill weights)
- `outcome_history` pointers (to bookings/ratings for learning)

### Canonical Taxonomy

**Critical for AI reliability:**
- Controlled ontology for subjects, levels, skills, and competencies
- Store IDs not free text
- This is the single most important step to make AI reliable and scalable

---

## Matching Engine Architecture

### Multi-Stage Matching Pipeline (fast → slow)

1. **Filter stage (fast):** Boolean & range filters via SQL/Elasticsearch
   - Subject ID, format, budget, location radius, availability window

2. **Semantic stage:** Vector similarity on embeddings
   - Client request embedding ↔ tutor listing embedding

3. **Graph stage:** Apply trust/referral boosts
   - Social distance and prior interactions via graph queries

4. **Business rules:**
   - Availability conflict checks, capacity, admin rules

5. **Rank stage:** Combined score = weighted sum of:
   - `rule_score`, `semantic_score`, `graph_score`, `performance_score`

6. **Diversification & exploration:**
   - Controlled randomness to surface under-seen tutors
   - Avoid filter bubbles

### Explainability

For each match, surface human-readable reason:
> "Matches subject (A-Level Physics), available Wed evenings, 92% curriculum coverage, 1st-degree referral from your network."

### Continuous Learning

- Store match outcomes: accepted/rejected, time-to-accept, booking completed, rating
- Use outcomes to update ranking weights
- Implement online learning for personalization (reward = successful booking + rating)

---

## Hybrid Data Infrastructure

### High-Level Architecture

**Primary data store:** Postgres (single Listings hub + detail tables)

**Read/search layer:** Elasticsearch / OpenSearch
- Structured & full-text search

**Semantic layer:** Vector store (Pinecone / Weaviate / Milvus)
- Embeddings for semantic similarity

**Relationship layer:** Graph DB (Neo4j / Memgraph)
- Network, referrals, trust, multi-hop discovery

**Cache/eventing:** Redis + Kafka
- Events, notifications, streaming

**AI microservices:** Python services (FastAPI)
- Hosting models, calling LLMs, embedding services

### Why Hybrid (Three Stores)

- **Postgres** = source of truth, strong transactional guarantees
- **Search** = fast faceted queries, geospatial, text
- **Vector** = semantic similarity, paraphrase matching, intent matching
- **Graph** = referrals, trust chains, multi-hop recommendations

---

## Semantic Intelligence

### Auto-Structure Client Requests

Allow clients to write natural language; NLU/LLM microservice parses into structured fields.

**Example:**
> "GCSE maths for my 14-year-old; wants exam prep; evenings; £25/hr"

**Parsed to:**
- `subject_id=GCSE_Maths`
- `level=GCSE`
- `goals=[exam_prep]`
- `availability=Mon/Wed/Fri evenings`
- `price=£25`

### Tutor Listing Augmentation

When tutors create a listing, AI creates rich profile snapshot:
- Suggested learning outcomes
- Suggested hourly rate based on market
- Suggested tags from free text
- Starter lesson plan

### Embeddings Strategy

- Use curriculum-aware embeddings combining general LLM embeddings with domain adapters
- Maintain `embedding_version` for bulk re-embedding when upgrading models

---

## Graph & Referral System

### Trust & Referrals

- Store social connections, referrals, endorsements, prior bookings in graph DB
- Multi-hop signals: friends of friends, referrals with successful outcomes get multiplier
- **This is your moat for community trust**

### Network Discovery

Support queries like:
> "Find tutors with at least one positive referral from a school within two hops"

---

## UX & Product Features

### Client Quick-Post Wizard (Conversational)
- Natural input → AI parse → progress bar to structured request
- "Smart defaults" based on child's age and past data
- Offer "Auto-match now" or "Browse tutors first"

### Tutor Smart Templates and Bundles
- One-click create from templates: exam prep, weekly tutoring, group session, crash course
- Tutors can create packaged offers (micro-courses) with different booking flows

### Match Cards with Reasons + Negotiation Assistant
- Card shows key signals and score
- "AI negotiate" button suggests opening offer and session length
- Keep tutor in control — AI suggests, humans confirm

### Match Feedback Loop
- After every first lesson, prompt both sides for structured feedback
- "Did goals align?" feeds the learning pipeline

---

## Engineering Patterns

### CQRS + Event Sourcing

- Writes go to Postgres (source of truth) and emit domain events to Kafka
- Read side builds indexes: Elastic for search, vector DB for embeddings, graph DB for relationships
- A/B ranking algorithms by swapping read services — no data model churn

### APIs & Developer Ergonomics
- Expose GraphQL for frontend and partner integrators
- Versioned REST/GraphQL and OpenAPI
- Strong feature flags and canary deploys

### Observability & SLOs
- Instrument: match latency, match quality conversion, booking success rate, unfair rejection rates
- Use Prometheus + Grafana + tracing

---

## Privacy, Safety & Governance

### GDPR & Data Minimisation
- Keep profiles basic, store only necessary PII
- Offer deletion & export
- Pseudonymised logs for ML training
- Synthetic or differential privacy for model training

### Safety & Verification
- Credential badges (verified by ID or third-party)
- DBS checks stored as badge references, not raw docs
- Abuse/fraud detection pipeline

### Ethical AI
- Explainability + appeal path for automated decisions
- Fairness monitoring — check match outcomes don't systematically disadvantage by demographics

---

## Implementation Roadmap

### Phase 0 — Core (MVP) [6-10 weeks]
- Option C schema (Listings + details)
- Postgres + Elasticsearch + Redis
- Basic rule-based matching (subject, level, availability, price)
- Client quick-post wizard (structured, no LLM)
- Booking and payments MVP

### Phase 1 — Smart Matching & Experiments [6-10 weeks]
- Add embeddings and vector store
- Build ranking pipeline combining rules + vector
- Basic match explainability card
- Feedback capture pipeline

### Phase 2 — Graph & Community [8-12 weeks]
- Add Neo4j for referrals and trust signals
- Referral incentives, endorsements
- Bandit exploration for diversification

### Phase 3 — Automation & Advanced AI [Continuous]
- Auto-structured requests via LLM NLU
- Auto generation of lesson plans and resources
- Personalised feeds, pricing suggestions, conversational negotiation
- Governance, bias audits, differential privacy for ML

---

## Key Metrics (Track from Day 1)

- Match to booking conversion rate (by match score bucket)
- Time to first booking after request posted
- Repeat booking rate (retention signal)
- Diversity metric (how often under-seen tutors surface)
- Match acceptance rate variance by demographic (fairness check)
- Model & ranking uplift (A/B control)

---

## Trade-offs & Realities

**Cost Management:**
- Embeddings and graph add cost
- Start with cheap, deterministic signals and prove product/market fit
- Add costly infrastructure (vector + graph) targeted at improving conversion metrics

**Human Oversight:**
- AI appears magical but needs human oversight
- Surface recommendations, don't auto-commit critical actions without consent

**Canonical Taxonomy:**
- Single biggest lever for good matching is clean canonical taxonomy and structured availability
- Invest time in this foundation

---

## Why This Architecture Wins

1. **Smart:** Matching is structured (listing ↔ request) instead of fuzzy profile ↔ profile
2. **Scalable:** New service types slot in as listing/request types without changing profiles
3. **Practical:** Tutors don't cram everything into one profile; clients don't browse endlessly
4. **Innovative:** Both sides contribute structured demand/supply data, making matching engine the differentiator
5. **Future-proof:** Built for human AND AI agents from day one
6. **Explainable:** Every match has clear, auditable reasons
7. **Learning:** Continuous feedback loop improves matching over time
