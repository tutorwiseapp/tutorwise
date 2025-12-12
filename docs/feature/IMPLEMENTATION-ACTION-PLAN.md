# Implementation Action Plan

**Created:** October 3, 2025
**Status:** Ready to Begin
**Estimated Duration:** 22-26 weeks (full implementation)

---

## 📋 Overview

This document provides a **step-by-step action plan** to implement the updated specifications:
- Service Listing Management
- Profile Management
- Marketplace Homepage

All three specs have been designed and are ready for implementation.

---

## ✅ Pre-Implementation Checklist

### 1. Stakeholder Approval (Week 0)

**Tasks:**
- [ ] Product Owner reviews all 3 specifications
- [ ] Technical Lead reviews database schema & architecture
- [ ] Designer reviews UI/UX specifications
- [ ] Approve or request changes
- [ ] Sign-off to proceed

**Deliverables:**
- Approved specifications document
- List of any required changes/clarifications

---

### 2. Canonical Taxonomy Creation (Week 0-1)

**Critical: Must be completed before Phase 0 development**

**Tasks:**
- [ ] Create `docs/taxonomy/subjects.json`
  - List all subjects (Mathematics, English, Sciences, etc.)
  - Assign canonical IDs (MATHS, ENG, PHYS, etc.)
  - Define subtopics for each subject
- [ ] Create `docs/taxonomy/levels.json`
  - UK education levels (Primary, KS3, GCSE, A-Level, University)
  - Age ranges for each level
  - Map to curriculum standards
- [ ] Create `docs/taxonomy/tags.json`
  - Skill tags (algebra, geometry, calculus, etc.)
  - Goal tags (exam_prep, homework_help, enrichment, etc.)
- [ ] Validate with educational experts
- [ ] Load into database as seed data

**Deliverables:**
- 3 JSON files with complete taxonomies
- Database seed migration file

**Example Structure:**
```json
// subjects.json
{
  "MATHS": {
    "id": "MATHS",
    "name": "Mathematics",
    "levels": ["PRIMARY", "KS3", "GCSE", "A_LEVEL", "UNIVERSITY"],
    "subtopics": ["ALGEBRA", "GEOMETRY", "CALCULUS", "STATISTICS"],
    "exam_boards": ["AQA", "EDEXCEL", "OCR", "WJEC"]
  }
}
```

---

### 3. Figma Design Completion (Week 0-2)

**Missing screens to design:**

- [ ] **Tutor Service Listing Creation Form**
  - Similar to agent listing forms but for individual tutors
  - Multi-step wizard
  - Subject/level selection
  - Rate & availability input
  - Preview & publish

- [ ] **Match Results Page**
  - For clients after creating request
  - Shows tutor listings with match scores
  - Match explainability cards ("Why this matches")
  - Quick actions: Message, Book, Save

- [ ] **Conversational Request Wizard**
  - Natural language input box
  - AI parsing progress indicator
  - Structured preview of parsed data
  - Edit & confirm flow

- [ ] **Public Listing Detail Pages**
  - Full view for each listing type
  - Tutor service listing
  - Group session listing
  - Course listing
  - Job posting

**Deliverables:**
- Updated Figma file with all screens
- Design system tokens exported (colors, typography, spacing)
- Component library for developers

---

### 4. Development Environment Setup (Week 1)

**Tasks:**
- [ ] Install pgvector extension in Supabase
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- [ ] Set up Python FastAPI project (for Phase 1 AI services)
- [ ] Configure CI/CD for monorepo
- [ ] Set up staging environment
- [ ] Install testing frameworks (Playwright, Jest)

**Deliverables:**
- Dev environment ready
- All developers can run project locally
- CI/CD pipeline active

---

## 🚀 Phase 0: MVP Foundation (Weeks 2-9)

**Duration:** 6-8 weeks
**Team:** 2-3 full-stack developers + 1 designer

### Week 2-3: Database & API Layer

**Tasks:**
- [ ] Create database migration for new schema
  - `listings` table with pgvector
  - 5 `listing_details_*` tables
  - `trust_verifications` table
  - Update `profiles` table
- [ ] Write API endpoints:
  - `POST /api/listings` (create)
  - `GET /api/listings/my` (user's listings)
  - `GET /api/listings/:id` (single listing)
  - `PATCH /api/listings/:id` (update)
  - `DELETE /api/listings/:id` (delete)
  - `POST /api/listings/:id/publish` (publish draft)
- [ ] Add Row Level Security (RLS) policies
- [ ] Write API tests

**Deliverables:**
- Database schema deployed
- API endpoints functional
- Test coverage >80%

---

### Week 4-5: Listing Management UI

**Tasks:**
- [ ] Build `/dashboard/listings` page
  - Unified table showing all user's listings
  - Filter by type, status
  - Sort by date, performance
- [ ] Build Create Listing forms (5 types):
  - Request Lessons form (client)
  - Tutor Service form (tutor)
  - Post Job form (agent)
  - Group Session form (agent)
  - Sell Course form (agent)
- [ ] Implement form validation
- [ ] Add draft/publish workflow
- [ ] Build listing cards component (reusable)

**Deliverables:**
- Dashboard listing page complete
- All 5 create listing forms functional
- Users can create, edit, publish listings

---

### Week 5-6: Profile Management

**Tasks:**
- [ ] Build public profile page
  - `/profile/[username]` route
  - Basic info display
  - Trust badges component
  - Active listings tab
  - Reviews tab (placeholder)
  - About tab
- [ ] Build Account Settings pages:
  - `/account/personal-info` (edit form)
  - `/account/professional-info` (role-specific forms)
  - `/account/settings` (preferences)
  - `/account/security` (verifications)
- [ ] Implement trust verification UI
  - Email verification flow
  - Phone verification flow
  - Document upload for DBS/QTS
- [ ] Add "Create listing from profile" flow

**Deliverables:**
- Public profiles viewable
- Account settings fully editable
- Trust verification system working

---

### Week 7-9: Marketplace Homepage

**Tasks:**
- [ ] Build logged-out homepage (`/`)
  - Hero search bar
  - Featured tutors section
  - Popular subjects
  - Trust signals
- [ ] Build logged-in homepage (`/home`)
  - Role-based routing
  - Quick action cards
  - View tabs (All, Tutors, Sessions, etc.)
- [ ] Build filter sidebar
  - Subject multi-select
  - Level multi-select
  - Format checkboxes
  - Budget range slider
  - Location input + radius
- [ ] Implement filter-based search
  - SQL query builder
  - Pagination
  - Sort controls
- [ ] Build listing card component (all types)
- [ ] Implement search results page

**Deliverables:**
- Homepage functional for all user types
- Search & filters working (SQL-based)
- Listing cards render correctly
- Mobile responsive

---

### Week 9: Testing & Launch Prep

**Tasks:**
- [ ] Write E2E tests (Playwright)
  - Create listing flow
  - Search & filter flow
  - Profile editing flow
- [ ] Performance testing
  - Page load times <2s
  - Search latency <300ms
- [ ] SEO optimization
  - Meta tags
  - Sitemap generation
  - robots.txt
  - Structured data (schema.org)
- [ ] Bug fixes & polish
- [ ] User acceptance testing (UAT)

**Deliverables:**
- All tests passing
- Performance targets met
- SEO optimized
- Ready for beta launch

---

## 🧠 Phase 1: Smart Matching (Weeks 10-17)

**Duration:** 6-8 weeks
**Team:** 2 full-stack developers + 1 ML engineer

### Week 10-11: AI Infrastructure

**Tasks:**
- [ ] Set up Python FastAPI microservice
  - Docker container
  - Deploy to Railway/Cloud Run
- [ ] Integrate OpenAI API or choose open-source LLM
- [ ] Build embedding generation service
  - Endpoint: `POST /ai/embed`
  - Batch processing for existing listings
- [ ] Build NLU parser service
  - Endpoint: `POST /ai/parse-request`
  - Extract subject, level, goals, budget, schedule

**Deliverables:**
- Python AI service deployed
- Embedding generation working
- NLU parser functional

---

### Week 12-13: Semantic Search

**Tasks:**
- [ ] Generate embeddings for all existing listings
  - Backfill script
  - Store in `listings.embedding_vector`
- [ ] Update listing create/edit to generate embeddings
- [ ] Implement vector similarity search
  - Use pgvector `<=>` operator
  - Combine with filter queries
- [ ] Build hybrid ranking algorithm
  - Weight: 40% semantic, 30% price match, 30% availability
  - Tunable weights via config

**Deliverables:**
- All listings have embeddings
- Semantic search working
- Hybrid ranking deployed

---

### Week 14-15: Conversational UI

**Tasks:**
- [ ] Build conversational Request Lessons wizard
  - Natural language input
  - "Generate Form" button
  - AI parsing with loading state
  - Structured preview
  - Edit & confirm
- [ ] Build match score display components
  - Match percentage badge
  - Explainability tooltip
  - "Why this matches" expanded view
- [ ] Implement smart suggestions for tutors
  - Suggest competitive rate
  - Generate title/description
  - Suggest learning outcomes

**Deliverables:**
- Conversational wizard live for clients
- Match scores visible
- Smart suggestions for tutors

---

### Week 16-17: Matching Engine

**Tasks:**
- [ ] Build matches table & API
  - `POST /api/matches/generate` (trigger matching)
  - `GET /api/matches/my` (user's matches)
  - `PATCH /api/matches/:id/status` (accept/reject)
- [ ] Implement match generation logic
  - Run on client request publish
  - Find top 20 tutor listings
  - Calculate hybrid score
  - Store in matches table
- [ ] Build match results page for clients
  - Shows tutor matches with scores
  - Quick actions: Message, Book
- [ ] Build match notifications for tutors
  - Email/push when new high-match request

**Deliverables:**
- Matching engine generating matches
- Match results page functional
- Notifications working

---

### Week 17: Testing & Refinement

**Tasks:**
- [ ] A/B test different ranking weights
- [ ] Measure match acceptance rates
- [ ] Optimize embedding model if needed
- [ ] Bug fixes
- [ ] Performance tuning

**Deliverables:**
- Match quality validated
- Users accepting matches
- System stable

---

## 🕸️ Phase 2: Graph & Community (Weeks 18-26)

**Duration:** 8-10 weeks
**Team:** 2 developers + 1 data engineer

### Week 18-19: Neo4j Setup

**Tasks:**
- [ ] Set up Neo4j database (Aura or self-hosted)
- [ ] Design graph schema
  - Nodes: User, Listing, Referral, Endorsement
  - Relationships: REFERRED, ENDORSED, BOOKED, RATED
- [ ] Build sync pipeline (Postgres → Neo4j)
  - On user signup → Create User node
  - On booking → Create BOOKED relationship
  - On review → Create RATED relationship

**Deliverables:**
- Neo4j database running
- Sync pipeline active
- Graph populated with existing data

---

### Week 20-21: Trust Score System

**Tasks:**
- [ ] Build trust score calculation
  - 1st-degree referrals: +10 points
  - 2nd-degree: +5 points
  - Endorsements: +3 points
  - Completed bookings: +2 each
  - High ratings: +1 per 5-star review
- [ ] Run graph queries for multi-hop discovery
  - Cypher: `MATCH (u1)-[:REFERRED*1..2]->(u2)`
- [ ] Update match ranking to include graph score
  - New weight: 30% semantic, 20% price, 20% availability, 30% trust

**Deliverables:**
- Trust scores calculated
- Graph queries optimized
- Ranking algorithm updated

---

### Week 22-23: Referral Features

**Tasks:**
- [ ] Build "Refer a Tutor" flow
  - Email invite form
  - Referral tracking link
  - Reward system (future: credits)
- [ ] Build endorsement system
  - "Endorse" button on profiles
  - Endorsement reasons (expertise, reliability, etc.)
- [ ] Build network visualization page
  - `/network` route
  - Graph visualization (D3.js or vis.js)
  - Shows connections, referrals

**Deliverables:**
- Referral system live
- Endorsements working
- Network page viewable

---

### Week 24-25: Discovery Features

**Tasks:**
- [ ] Add "Tutors in my network" filter
- [ ] Build "Recommended by your network" section on homepage
- [ ] Implement referral-based match boosting
- [ ] Add social proof badges ("3 friends referred this tutor")

**Deliverables:**
- Network-based discovery working
- Social proof visible
- Referral boost in rankings

---

### Week 26: Testing & Launch

**Tasks:**
- [ ] Test all referral flows
- [ ] Validate graph query performance
- [ ] Measure impact on match quality
- [ ] Bug fixes
- [ ] Full system integration test

**Deliverables:**
- Graph features stable
- Trust system validated
- Phase 2 complete

---

## 📈 Phase 3: Advanced AI (Continuous)

**Timeline:** Ongoing after Phase 2
**Team:** 1 ML engineer + 1 developer (part-time)

### Continuous Improvements

**Q1 2026:**
- [ ] Outcome tracking system
  - Match → Contact → Booking → Completion → Rating
  - Store in outcomes table
- [ ] Continuous learning pipeline
  - Use outcomes to retrain ranking model
  - A/B test new model versions
- [ ] Personalized ranking
  - User preference learning
  - Collaborative filtering

**Q2 2026:**
- [ ] Conversational negotiation assistant
  - AI suggests opening offer
  - Negotiation templates
- [ ] Auto-generated lesson plans
  - Based on subject, level, goals
  - Tutor can customize
- [ ] Market pricing recommendations
  - Real-time rate suggestions
  - Based on supply/demand

**Q3 2026:**
- [ ] Demand forecasting for agents
  - Predict high-demand subjects
  - Optimal pricing suggestions
- [ ] Advanced personalization
  - User-specific match algorithms
  - Custom ranking per user

---

## 📊 Success Metrics (Track from Day 1)

### Phase 0 Metrics

**Listing Management:**
- [ ] Listings created per user (target: 1.5 avg)
- [ ] Draft → published conversion (target: >70%)
- [ ] Active listings per user (target: 1.2 avg)
- [ ] Listing edit frequency (engagement)

**Profile Management:**
- [ ] Profile completeness score (target: >80%)
- [ ] Trust badge adoption (target: >60% email verified)
- [ ] Professional Info → Listing creation (target: >50%)

**Marketplace:**
- [ ] Search → listing view conversion (target: >40%)
- [ ] Listing view → contact conversion (target: >15%)
- [ ] Homepage bounce rate (target: <60%)
- [ ] Avg. listings viewed per session (target: >5)

### Phase 1 Metrics

**Matching:**
- [ ] Match to contact rate (target: >30%)
- [ ] Client requests with 3+ matches (target: >80%)
- [ ] Match score accuracy (accepted matches avg score >0.85)
- [ ] Time to first contact after listing (target: <24 hrs)

**AI Features:**
- [ ] NLU parser accuracy (target: >90%)
- [ ] Conversational wizard completion (target: >75%)
- [ ] Smart suggestion adoption (target: >60%)

### Phase 2 Metrics

**Graph/Community:**
- [ ] Referral conversion rate (target: >10%)
- [ ] Users with endorsements (target: >30%)
- [ ] Network-based matches clicked (engagement)
- [ ] Trust score impact on conversions

---

## 🎯 Critical Path Items

**Must be completed in order:**

1. ✅ **Week 0:** Canonical taxonomy (BLOCKS Phase 0)
2. ✅ **Week 0-2:** Figma designs (BLOCKS Phase 0 UI)
3. **Week 2-3:** Database schema (BLOCKS everything)
4. **Week 3-4:** API layer (BLOCKS UI development)
5. **Week 10-11:** AI infrastructure (BLOCKS Phase 1)
6. **Week 18-19:** Neo4j setup (BLOCKS Phase 2)

**If any of these are delayed, all subsequent phases are delayed.**

---

## 🚨 Risk Mitigation

### Risk 1: Taxonomy incompleteness
**Impact:** Poor search quality, matching failures
**Mitigation:**
- Allocate dedicated resource for taxonomy research
- Validate with educators before Phase 0
- Plan for taxonomy updates without schema changes

### Risk 2: AI service latency
**Impact:** Slow conversational wizard, poor UX
**Mitigation:**
- Use fast LLM (GPT-3.5-turbo or Llama 3 8B)
- Implement client-side loading states
- Cache common queries
- Set timeout limits (5s max)

### Risk 3: Graph database performance
**Impact:** Slow trust score calculations
**Mitigation:**
- Index critical relationships
- Cache trust scores (update daily, not real-time)
- Use read replicas for queries
- Limit graph depth (max 2 hops)

### Risk 4: Scope creep
**Impact:** Timeline delays
**Mitigation:**
- Strict phase boundaries
- No new features mid-phase
- Defer nice-to-haves to Phase 3
- Weekly sprint reviews

---

## 👥 Team Allocation

### Phase 0 (Weeks 2-9)
- **Lead Developer** (full-time): Database, API, architecture
- **Frontend Developer** (full-time): UI components, forms, homepage
- **Designer** (part-time): Figma updates, design system
- **QA Engineer** (part-time, Week 9): Testing

### Phase 1 (Weeks 10-17)
- **Lead Developer** (full-time): Integration, matching engine
- **Frontend Developer** (full-time): Conversational UI, match pages
- **ML Engineer** (full-time): AI services, embeddings, NLU
- **QA Engineer** (part-time, Week 17): Testing

### Phase 2 (Weeks 18-26)
- **Backend Developer** (full-time): Graph sync, trust scores
- **Frontend Developer** (part-time): Network visualization, referrals
- **Data Engineer** (full-time): Neo4j, graph queries
- **QA Engineer** (part-time, Week 26): Testing

---

## 💰 Estimated Costs

**Phase 0 (MVP):**
- Development: 2 devs × 8 weeks × £5,000/week = **£80,000**
- Design: 1 designer × 2 weeks × £4,000/week = **£8,000**
- Infrastructure: Supabase Pro, hosting = **£500/month × 2 = £1,000**
- **Total Phase 0: ~£89,000**

**Phase 1 (AI):**
- Development: 2 devs × 8 weeks × £5,000/week = **£80,000**
- ML Engineer: 1 × 8 weeks × £6,000/week = **£48,000**
- OpenAI API: ~£1,000/month × 2 = **£2,000**
- **Total Phase 1: ~£130,000**

**Phase 2 (Graph):**
- Development: 1.5 devs × 10 weeks × £5,000/week = **£75,000**
- Neo4j Aura: £500/month × 3 = **£1,500**
- **Total Phase 2: ~£76,500**

**Grand Total: ~£295,500** (all 3 phases)

---

## ✅ Next Immediate Actions

**This Week:**
1. [ ] Product Owner reviews all specifications
2. [ ] Schedule kickoff meeting with dev team
3. [ ] Assign taxonomy creation to researcher
4. [ ] Designer starts missing Figma screens

**Next Week:**
1. [ ] Complete canonical taxonomy
2. [ ] Finalize Figma designs
3. [ ] Set up dev environment
4. [ ] Begin Phase 0 database work

---

**Ready to begin when you approve! 🚀**
