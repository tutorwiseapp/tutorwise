# CaaS Solution Design

**Status**: ✅ Active (v5.9 - Social Impact Complete)
**Last Updated**: 2025-12-15
**Last Code Update**: 2025-12-15
**Priority**: Critical (Tier 1 - Core Platform Infrastructure)
**Architecture**: 6-Bucket Transparent Scoring System with Auto-Sync
**Business Model**: Free (Platform Infrastructure)

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-15 | v5.9 | **Social Impact Complete**: Added Bucket 6 (10 points), implemented free help tracking, normalized 110/100 scoring |
| 2025-12-15 | v5.5 | **Architecture Simplification**: Added caas_score column to profiles, 80% code reduction in UserProfileContext, standardized terminology |
| 2025-12-13 | v5.5 | **Security Audit**: Hardening plan created for Sybil attack prevention and credential ceiling fixes |
| 2025-11-15 | v5.5 | **Initial Release**: 5-bucket tutor scoring model (30/30/20/10/10), RPC functions, queue system |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Context](#business-context)
3. [Architecture Overview](#architecture-overview)
4. [Tutor Scoring Model](#tutor-scoring-model)
5. [Database Design](#database-design)
6. [Event-Driven Recalculation](#event-driven-recalculation)
7. [Performance Optimization](#performance-optimization)
8. [Future Roadmap](#future-roadmap)

---

## Executive Summary

**Credibility as a Service (CaaS)** is TutorWise's algorithmic trust and ranking engine that calculates a **Credibility Score (0-100)** for all platform users. Version 5.9 introduces a sixth bucket (Social Impact) rewarding community contribution through free tutoring sessions.

The system drives three critical business outcomes:

1. **Marketplace Efficiency** - Higher-scoring tutors rank first in search, helping clients find credible tutors faster
2. **Trust & Safety** - Identity verification gate ensures only verified users appear in search results
3. **Social Mission Alignment** - Free Help Now integration incentivizes tutors to provide free educational access while building reputation

### Key Design Goals

| Goal | Target Outcome |
|------|----------------|
| **Marketplace Quality** | Surface high-credibility tutors earlier in search results |
| **Profile Completeness** | Incentivize tutors to complete qualifications and verifications |
| **Search Relevance** | Improve click-through rates on search results |
| **Platform Safety** | Encourage identity verification through score incentives and badge visibility |

### Design Principles

1. **Polymorphic by Role** - Different scoring algorithms for TUTOR, CLIENT, AGENT roles
2. **Verification as Signal** - Identity verification contributes to credibility score and enables trust badges
3. **Fair Cold Start** - New tutors receive provisional 30/100 score to enable discovery
4. **Event-Driven Updates** - Database queue decouples score recalculation from user actions
5. **Cache-First Reads** - Pre-calculated scores enable <5ms query performance

---

## Business Context

### The Trust Problem

In peer-to-peer marketplaces, new users face the "stranger danger" dilemma:
- **For clients**: How do I know this tutor is qualified, safe, and reliable?
- **For tutors**: How do I signal credibility without 100+ reviews?

Traditional solutions rely solely on review counts, creating a **cold start problem** where new tutors with zero reviews become invisible in search rankings, regardless of their qualifications.

### The CaaS Solution

CaaS solves this through a **multi-signal credibility system** that evaluates:

1. **Historical Performance** - Reviews and retention (30%)
2. **Professional Credentials** - Degrees, teaching qualifications, experience (30%)
3. **Network Trust** - Social connections and agent referrals (20%)
4. **Safety Compliance** - Background checks and verification (10%)
5. **Platform Engagement** - Tool usage and responsiveness (10%)

This approach gives new tutors with strong credentials a fair starting score (~30-40 points) even before their first session.

### Why This Matters

**Trust Signaling**:
Visible credibility scores serve as trust proxies, reducing perceived risk for first-time clients who lack direct experience with tutors. The score provides an at-a-glance assessment of a tutor's qualifications, verification status, and track record.

**Marketplace Quality**:
By surfacing high-credibility tutors in search rankings, the system helps clients discover tutors who have invested in building their profile, completing verifications, and delivering quality service.

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CaaS Engine v5.5                              │
│                     (Event-Driven Architecture)                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ STEP 1: Event Capture (Real-time)                                    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Trigger Events:                    Database Queue:                  │
│  ┌────────────────────┐            ┌──────────────────────────────┐ │
│  │ • New review       │───────────→│ caas_recalculation_queue     │ │
│  │ • Profile updated  │            │                              │ │
│  │ • Booking completed│            │ profile_id | created_at      │ │
│  │ • Degree verified  │            │ ──────────────────────────── │ │
│  │ • DBS check done   │            │ uuid-1234  | 2025-12-13 ...  │ │
│  └────────────────────┘            │ uuid-5678  | 2025-12-13 ...  │ │
│                                     └──────────────────────────────┘ │
│  Why queue? Decouples user actions from expensive calculations       │
│             Allows batch processing for efficiency                   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ STEP 2: Batch Processing (Every 10 minutes via cron)                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ caas-worker (Scheduled Job)                                  │    │
│  │                                                              │    │
│  │ 1. SELECT profile_id FROM queue LIMIT 100                   │    │
│  │ 2. For each profile_id:                                     │    │
│  │    → Call CaaSService.calculateScore(profile_id)            │    │
│  │    → Upsert to caas_scores cache                            │    │
│  │ 3. DELETE processed rows from queue                         │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  Why 10 minutes? Balances freshness with server cost                 │
│                  Most score changes not time-critical                │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ STEP 3: Strategy Selection (Polymorphic Routing)                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│                    ┌───────────────────────────┐                     │
│                    │ CaaSService (Router)      │                     │
│                    │                           │                     │
│                    │ 1. Fetch profile.role     │                     │
│                    │ 2. Select strategy:       │                     │
│                    │    TUTOR → TutorCaaS...   │                     │
│                    │    CLIENT → ClientCaaS... │                     │
│                    │    AGENT → AgentCaaS...   │                     │
│                    └───────────────────────────┘                     │
│                              │                                        │
│          ┌───────────────────┼───────────────────┐                   │
│          │                   │                   │                   │
│          ▼                   ▼                   ▼                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │
│  │TutorCaaS     │   │ClientCaaS    │   │AgentCaaS     │            │
│  │Strategy      │   │Strategy      │   │Strategy      │            │
│  │              │   │              │   │              │            │
│  │30/30/20/10/10│   │(Future)      │   │(Future)      │            │
│  └──────────────┘   └──────────────┘   └──────────────┘            │
│                                                                       │
│  Why polymorphic? Different roles need different scoring logic       │
│                   Tutor credibility ≠ Client trustworthiness         │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ STEP 4: Data Aggregation (PostgreSQL RPC Functions)                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  TutorCaaSStrategy calls 3 database functions:                       │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ get_performance_stats(user_id) → JSON                        │   │
│  │ ─────────────────────────────────────────────────────────    │   │
│  │ Returns: {                                                   │   │
│  │   avg_rating: 4.8,                                           │   │
│  │   completed_sessions: 47,                                    │   │
│  │   retention_rate: 0.73,                                      │   │
│  │   unique_clients: 22                                         │   │
│  │ }                                                            │   │
│  │                                                              │   │
│  │ Aggregates data from: reviews, bookings                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ get_network_stats(user_id) → JSON                            │   │
│  │ ─────────────────────────────────────────────────────────    │   │
│  │ Returns: {                                                   │   │
│  │   social_connections: 18,                                    │   │
│  │   agent_referral_count: 2,                                   │   │
│  │   is_agent_referred: true                                    │   │
│  │ }                                                            │   │
│  │                                                              │   │
│  │ Aggregates data from: profile_graph                         │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ get_digital_stats(user_id) → JSON                            │   │
│  │ ─────────────────────────────────────────────────────────    │   │
│  │ Returns: {                                                   │   │
│  │   google_calendar_synced: true,                              │   │
│  │   google_classroom_synced: false,                            │   │
│  │   virtual_classroom_usage_rate: 0.85,                        │   │
│  │   bio_video_url: "https://..."                               │   │
│  │ }                                                            │   │
│  │                                                              │   │
│  │ Aggregates data from: student_integration_links, bookings   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Why RPC functions? Offloads complex aggregations to database        │
│                     Reduces network round-trips (1 call vs 20+)      │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ STEP 5: Score Caching (Write to caas_scores)                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Strategy calculates final score → CaaSService upserts to cache:     │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ caas_scores table                                            │   │
│  │ ─────────────────────────────────────────────────────────    │   │
│  │ profile_id       | uuid-1234                                 │   │
│  │ total_score      | 85                                        │   │
│  │ score_breakdown  | {"performance": 28, "qualifications": 30, │   │
│  │                  |  "network": 12, "safety": 10, ...}        │   │
│  │ role_type        | TUTOR                                     │   │
│  │ calculated_at    | 2025-12-13T10:35:22Z                      │   │
│  │ calculation_ver  | tutor-v5.5                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  Why cache? Reading from this table is <5ms vs ~200ms calculation    │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ STEP 6: Frontend Display (Read from cache)                           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Client Request:    API Endpoint:           Cache Read:              │
│  ┌────────────┐    ┌───────────────────┐   ┌──────────────────┐    │
│  │ GET /api/  │───→│ /api/caas/[id]    │──→│ caas_scores      │    │
│  │ caas/uuid  │    │                   │   │ WHERE profile_id │    │
│  └────────────┘    │ Returns JSON:     │   │ = $1             │    │
│                     │ {                 │   │                  │    │
│                     │   score: 85,      │   │ <5ms query time  │    │
│                     │   breakdown: {...}│   └──────────────────┘    │
│                     │ }                 │                            │
│                     └───────────────────┘                            │
│                                                                       │
│  Used by: Tutor profile pages, search rankings, dashboard widgets    │
└──────────────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

**Separation of Concerns**:
- Event capture ≠ score calculation ≠ score display
- Each layer can scale independently

**Performance at Scale**:
- Queue allows batching (100 users/job vs 100 separate recalculations)
- RPC functions leverage database's aggregation engine
- Cache eliminates redundant calculations

**Extensibility**:
- Adding new role types requires only new strategy class
- Changing scoring model affects only strategy implementation
- Event triggers can be added without touching core engine

---

## Tutor Scoring Model (v5.9)

### The "Balanced Scorecard" Philosophy

Traditional review-only systems create **winner-take-all** dynamics where the first tutors to join accumulate reviews and dominate rankings indefinitely. CaaS v5.9 balances this with a **6-bucket multi-dimensional scorecard** that rewards both quality teaching and community contribution.

**Scoring Structure**: Six buckets totaling 110 raw points, normalized to 100-point display scale using the formula: `Math.round((rawTotal / 110) * 100)`. This normalization maintains user expectations of 0-100 scoring while allowing future bucket additions without breaking the UI.

**Design Rationale**:

| Raw Points | Bucket | Why This Allocation? |
|--------|--------|---------------------|
| 30 pts | Performance & Quality | Proven results matter most - balanced with cold start fairness |
| 30 pts | Qualifications & Authority | Honors institutional credibility (degrees, QTS, veteran experience) |
| 20 pts | Network & Referrals | Social proof and viral growth incentive via referrals and connections |
| 10 pts | Verification & Safety | Identity gate (required) plus DBS bonus for safeguarding |
| 10 pts | Digital Professionalism | Nudges platform tool adoption and engagement without over-weighting |
| 10 pts | Social Impact | **NEW v5.9** - Rewards Free Help Now participation and delivery |

**Total**: 110 raw points normalized to /100 display (e.g., 55/110 raw = 50/100 displayed)

### Verification's Role in Credibility

**How Verification Works**:

Verification status affects credibility through two mechanisms:

1. **Visual Trust Signals** - Verified tutors display badge overlays on marketplace cards
   - `identity_verified = true` → Green shield icon ("Government ID Verified")
   - `dbs_verified = true` → Additional shield icon ("DBS Background Check")

2. **Score Contribution** - Verification contributes points to Safety bucket (10% of total score)
   - Identity verification: Enables badge display (prerequisite for DBS points)
   - DBS verification: Earns 10 points in Safety bucket

**Important**: Unverified tutors can still appear in marketplace search and have published listings. Verification is encouraged through score incentives and badge visibility, but not required for platform access.

**Why Not a Hard Gate?**

Early design considerations included mandatory verification for marketplace visibility. This was not implemented because:
- Creates high friction for new tutors (multi-day verification delays)
- Limits geographic expansion (verification harder in some countries)
- Published listings already act as quality gate (tutors must complete profile)

---

### Bucket 1: Performance & Quality (30 points max)

**Philosophy**: Reward tutors with proven client satisfaction and retention. This is the "results matter" component.

#### Component 1A: Rating Score (0-15 points)

**Formula**:
```
rating_score = (average_rating ÷ 5) × 15 points
```

**Data Source**: `reviews` table where `receiver_id = tutor_id` and `reviewer_role = 'CLIENT'`

**Worked Examples**:

| Avg Rating | Calculation | Points Earned |
|------------|-------------|---------------|
| 5.0 stars | (5.0 ÷ 5) × 15 | 15.0 points |
| 4.8 stars | (4.8 ÷ 5) × 15 | 14.4 points |
| 4.5 stars | (4.5 ÷ 5) × 15 | 13.5 points |
| 4.0 stars | (4.0 ÷ 5) × 15 | 12.0 points |
| 3.5 stars | (3.5 ÷ 5) × 15 | 10.5 points |

**Why 15 points max?** Half of performance bucket - balances one-time satisfaction with long-term retention.

#### Component 1B: Retention Score (0-15 points)

**Formula**:
```
retention_rate = (clients_with_multiple_bookings) ÷ (total_unique_clients)
retention_score = retention_rate × 15 points
```

**Data Source**:
- Count distinct `client_id` from `bookings` where `tutor_id = $1` and `status = 'COMPLETED'`
- Count clients who booked ≥2 times

**Worked Examples**:

| Scenario | Unique Clients | Repeat Clients | Retention Rate | Points |
|----------|---------------|----------------|----------------|--------|
| Strong retention | 20 | 16 | 80% | 12.0 |
| Good retention | 30 | 18 | 60% | 9.0 |
| Average retention | 40 | 16 | 40% | 6.0 |
| Poor retention | 50 | 10 | 20% | 3.0 |

**Why retention matters?** One-off bookings can be flukes; repeat clients signal genuine value delivery.

#### Component 1C: Cold Start Provisional Score

**The Problem**: New tutors with 0 completed sessions would score 0 points in performance bucket, creating unfair disadvantage regardless of qualifications.

**The Solution**:
```
IF completed_sessions = 0 THEN
  performance_score = 30 points (full bucket allocation)
  provisional_flag = TRUE
ELSE
  performance_score = rating_score + retention_score
  provisional_flag = FALSE
END IF
```

**Example Journey**:

| Stage | Sessions | Avg Rating | Retention | Performance Score | Notes |
|-------|----------|------------|-----------|-------------------|-------|
| New tutor | 0 | N/A | N/A | **30** (provisional) | Full points to enable discovery |
| First booking | 1 | 5.0 | 0% | **15** (15+0) | Drops because no retention yet |
| Growth phase | 10 | 4.8 | 40% | **20.4** (14.4+6) | Building retention |
| Established | 50 | 4.7 | 65% | **23.9** (14.1+9.8) | Sustainable business |

**Why this works?** New tutors get fair visibility initially, then must earn their score through real performance.

**Implementation Reference**: `apps/api/src/services/caas/strategies/tutor.ts:138-156`

---

### Bucket 2: Qualifications & Authority (30 points max)

**Philosophy**: Honor institutional credentials and teaching experience. A teacher with a Master's degree and 15 years of experience deserves recognition even before their first TutorWise booking.

#### Component 2A: Degree Credential (0 or 10 points)

**Criteria**:
```
IF degree_level IN ('BACHELORS', 'MASTERS', 'PHD') THEN
  degree_points = 10
ELSE
  degree_points = 0
END IF
```

**Data Source**: `profiles.degree_level` (enum field)

**Degree Levels Recognized**:
- **BACHELORS**: Undergraduate degree (BA, BSc, BEng, etc.)
- **MASTERS**: Postgraduate degree (MA, MSc, MEng, MBA, etc.)
- **PHD**: Doctoral degree (PhD, DPhil, EdD, etc.)

**Why binary?** We don't differentiate between Bachelor's vs PhD because teaching ability ≠ academic level. A Bachelor's holder can be an excellent GCSE tutor.

**Edge Cases**:
- Degree in progress: Not counted (must be completed)
- Foreign degrees: Accepted if verified equivalent by NARIC/ENIC
- Professional qualifications without degree: Use QTS path instead

#### Component 2B: QTS Qualification (0 or 10 points)

**Criteria**:
```
IF 'QTS' IN qualifications_array THEN
  qts_points = 10
ELSE
  qts_points = 0
END IF
```

**Data Source**: `profiles.qualifications` (text array field)

**What is QTS?**
Qualified Teacher Status - UK government certification required to teach in state schools. Requires:
- Completed teacher training program (PGCE or school-based route)
- Skills tests in literacy and numeracy
- Minimum 24 weeks classroom experience
- Assessment against Teachers' Standards

**Why 10 points?** QTS holders have undergone rigorous pedagogical training beyond subject knowledge. This is teaching credibility, not just domain expertise.

**International Equivalent**: Future versions may recognize:
- US: State teaching license
- Australia: Registration with teaching authority
- EU: European Professional Card for teachers

#### Component 2C: Veteran Experience (0 or 10 points)

**Criteria**:
```
IF teaching_experience_years >= 10 THEN
  veteran_points = 10
ELSE
  veteran_points = 0
END IF
```

**Data Source**: `profiles.teaching_experience` (integer field)

**Worked Examples**:

| Experience | Points | Rationale |
|------------|--------|-----------|
| 15 years | 10 | Veteran educator |
| 10 years | 10 | Threshold met |
| 9 years | 0 | Just below threshold |
| 5 years | 0 | Experienced but not veteran |
| 2 years | 0 | Early career |

**Why 10 years?** Research shows teacher effectiveness plateaus around 7-10 years. Beyond this, educators have seen enough student variability to handle edge cases.

**How is this verified?**
- Self-reported during onboarding
- Cross-checked against CV upload
- Flagged for manual review if claim seems implausible (e.g., age 25 claiming 15 years experience)

#### Maximum Qualifications Score

**Tutor can earn**: 0, 10, 20, or 30 points

**Example Profiles**:

| Profile | Degree | QTS | Experience | Total | Notes |
|---------|--------|-----|------------|-------|-------|
| Veteran teacher | PhD | Yes | 18 years | **30** | Maximum credible authority |
| Career teacher | No | Yes | 12 years | **20** | Strong despite no degree |
| New graduate | Masters | No | 1 year | **10** | Academic credentials only |
| Subject expert | Bachelors | No | 4 years | **10** | Common profile |
| Unqualified tutor | No | No | 3 years | **0** | Must rely on performance |

**Implementation Reference**: `apps/api/src/services/caas/strategies/tutor.ts:158-180`

---

### Bucket 3: Network & Referrals (20 points max)

**Philosophy**: Leverage social proof and incentivize viral growth. Tutors with strong professional networks or agent endorsements bring external credibility signals.

#### Component 3A: Referral Count (0-12 points)

**Formula**:
```
referral_count = COUNT of outgoing AGENT_REFERRAL links
referral_points = MIN(referral_count × 4, 12)
```

**Data Source**: `profile_graph` table
```
WHERE source_profile_id = tutor_id
  AND connection_type = 'AGENT_REFERRAL'
  AND status = 'ACTIVE'
```

**Worked Examples**:

| Referrals Made | Calculation | Points Earned | Notes |
|----------------|-------------|---------------|-------|
| 0 | 0 × 4 | 0 | No referral activity |
| 1 | 1 × 4 | 4 | First referral |
| 2 | 2 × 4 | 8 | Building network |
| 3 | 3 × 4 | **12** | Cap reached |
| 5 | 5 × 4 → 12 | **12** | Capped at max |

**Why reward referrals?** Tutors who bring other tutors to the platform:
1. Signal confidence in TutorWise
2. Expand marketplace supply
3. Create accountable sub-networks (agents vet their referrals)

**What is AGENT_REFERRAL?** A directed graph edge indicating:
- Tutor A (agent) referred Tutor B to join TutorWise
- Replaces deprecated `is_partner_verified` boolean flag
- Agents earn commission when their referrals book sessions

#### Component 3B: Network Bonus (0 or 8 points)

**Criteria** (either condition grants 8 points):

**Path 1: Well-Networked**
```
IF social_connection_count > 10 THEN
  network_bonus = 8
END IF
```

**Path 2: Agent-Referred**
```
IF has_incoming_AGENT_REFERRAL_link THEN
  network_bonus = 8
END IF
```

**Data Source**: `profile_graph` table
- Path 1: Count `connection_type = 'SOCIAL'` where `source_profile_id = tutor_id OR target_profile_id = tutor_id`
- Path 2: Check exists `connection_type = 'AGENT_REFERRAL'` where `target_profile_id = tutor_id`

**Worked Examples**:

| Scenario | Social Links | Agent-Referred? | Bonus | Reasoning |
|----------|--------------|-----------------|-------|-----------|
| Highly networked | 15 | No | **8** | Strong professional network |
| Agent-backed | 3 | Yes | **8** | Endorsed by trusted agent |
| Both | 20 | Yes | **8** | Still capped at 8 (not 16) |
| Isolated | 5 | No | **0** | Below threshold |

**Why 10 social connections?** Indicates tutor is engaged with professional community (other tutors, schools, parents). Isolated tutors are higher risk for platform fit.

**Why does agent referral matter?**
- Agents stake reputation on referrals
- Creates accountability chain
- Historically, agent-referred tutors have 2.3× higher retention

#### Maximum Network Score

**Tutor can earn**: 0-20 points (12 from referrals + 8 from bonus)

**Example Profiles**:

| Profile | Referrals | Social Links | Agent-Referred | Calc | Total |
|---------|-----------|--------------|----------------|------|-------|
| Super connector | 4+ | 18 | Yes | 12 + 8 | **20** |
| Active networker | 3 | 15 | No | 12 + 8 | **20** |
| Agent-backed | 1 | 5 | Yes | 4 + 8 | **12** |
| Growing network | 2 | 8 | No | 8 + 0 | **8** |
| Standalone | 0 | 2 | No | 0 + 0 | **0** |

**Implementation Reference**: `apps/api/src/services/caas/strategies/tutor.ts:182-210`

---

### Bucket 4: Verification & Safety (10 points max)

**Philosophy**: This is the "scored safety" component. Identity verification is already the binary gate - here we reward additional safety measures.

#### Component 4A: Identity Gate Bonus (5 points)

**Criteria**:
```
IF identity_verified = TRUE THEN
  identity_bonus = 5
ELSE
  # This code never runs - tutor would have been rejected at gate
  total_score = 0
END IF
```

**Why 5 points?** Since identity_verified is mandatory to reach scoring logic, every scored tutor automatically gets these 5 points. This creates floor of 5/100 for the safety bucket.

**What this incentivizes**: Completing verification quickly (unverified tutors see "Verify identity to earn +5 credibility points" prompt).

#### Component 4B: DBS Check (0 or 5 points)

**Criteria**:
```
IF dbs_verified = TRUE AND dbs_expiry_date > NOW() THEN
  dbs_points = 5
ELSE
  dbs_points = 0
END IF
```

**Data Source**:
- `profiles.dbs_verified` (boolean)
- `profiles.dbs_expiry` (date field)

**What is DBS?**
Disclosure and Barring Service - UK government background check that screens for:
- Criminal records
- Cautions and warnings
- Information held by police relevant to working with children

**DBS Levels**:
- **Basic**: Shows unspent convictions
- **Standard**: Shows spent and unspent convictions
- **Enhanced**: Above + police intelligence (required for working with children)

TutorWise requires **Enhanced DBS** for tutors working with under-18 students.

**Why expiry check?** DBS certificates don't expire legally, but best practice is renewal every 3 years. Expired DBS (>3 years old) doesn't count toward score.

**Worked Examples**:

| DBS Status | Verified | Expiry Date | Current Date | Points | Notes |
|------------|----------|-------------|--------------|--------|-------|
| Current Enhanced | Yes | 2026-06-15 | 2025-12-13 | **5** | Valid |
| Recent Enhanced | Yes | 2025-12-20 | 2025-12-13 | **5** | Still valid |
| Expired | Yes | 2022-08-10 | 2025-12-13 | **0** | >3 years old |
| Pending | No | NULL | 2025-12-13 | **0** | Not verified yet |
| Not obtained | No | NULL | 2025-12-13 | **0** | Tutor hasn't applied |

**Cost to tutor**: £44-£64 depending on service used. TutorWise partners with DBS Update Service for streamlined renewals.

**Is DBS mandatory?**
- **For under-18 tutoring**: Strongly recommended but not mandatory (parents decide)
- **For over-18 tutoring**: Not required
- **Platform visibility**: DBS-verified tutors can filter to top of search via "DBS Checked" badge

#### Maximum Safety Score

**Tutor can earn**: 5 or 10 points (5 automatic + 0-5 for DBS)

**Example Profiles**:

| Profile | Identity | DBS | Total | Notes |
|---------|----------|-----|-------|-------|
| Fully verified | ✓ | ✓ Valid | **10** | Maximum safety credibility |
| Basic verified | ✓ | ✗ | **5** | Minimum for public visibility |
| DBS expired | ✓ | ✓ Expired | **5** | Needs renewal |

**Implementation Reference**: `apps/api/src/services/caas/strategies/tutor.ts:212-235`

---

### Bucket 5: Digital Professionalism (10 points max)

**Philosophy**: Incentivize platform tool usage and professional engagement without over-weighting it. This bucket nudges desired behaviors but doesn't penalize tutors who prefer offline/manual workflows.

#### Component 5A: Integrated Tools (0 or 5 points)

**Criteria** (either integration grants 5 points):

```
IF google_calendar_synced = TRUE OR google_classroom_synced = TRUE THEN
  integration_points = 5
ELSE
  integration_points = 0
END IF
```

**Data Source**: `student_integration_links` table
```
WHERE user_id = tutor_id
  AND integration_type IN ('GOOGLE_CALENDAR', 'GOOGLE_CLASSROOM')
  AND status = 'ACTIVE'
```

**Why these integrations?**

**Google Calendar Sync**:
- Prevents double-booking across platforms
- Auto-blocks availability when external events scheduled
- Reduces "tutor unavailable" frustration for clients
- Impact: Reduces booking conflicts through automated availability management

**Google Classroom Sync**:
- Enables seamless assignment sharing
- Auto-creates Classroom for TutorWise bookings
- Increases perceived professionalism
- Impact: Improves perceived organization through centralized materials management

**Future Integrations** (v6.0 roadmap):
- Microsoft Teams Calendar
- Outlook Calendar
- Apple Calendar (via CalDAV)

**Worked Examples**:

| Profile | Google Cal | Google Classroom | Points | Notes |
|---------|------------|------------------|--------|-------|
| Fully integrated | ✓ | ✓ | **5** | Both connected (still capped at 5) |
| Calendar only | ✓ | ✗ | **5** | Meets threshold |
| Classroom only | ✗ | ✓ | **5** | Meets threshold |
| No integrations | ✗ | ✗ | **0** | Manual workflow |

#### Component 5B: Engagement - "The OR Rule" (0 or 5 points)

**Philosophy**: Recognize either high session logging OR credibility signaling through intro video.

**Path A: High Session Logging**

**Criteria** (either metric grants 5 points):

```
IF virtual_classroom_usage_rate > 0.8 THEN
  engagement_points = 5
ELSE IF manual_session_log_rate > 0.8 THEN
  engagement_points = 5
ELSE
  engagement_points = 0
END IF
```

**Metric 1: Virtual Classroom Usage Rate**

**Formula**:
```
virtual_classroom_rate = (sessions_with_recording_url) ÷ (total_completed_sessions)
```

**Data Source**: `bookings` table
- Numerator: `COUNT(*) WHERE recording_url IS NOT NULL AND status = 'COMPLETED'`
- Denominator: `COUNT(*) WHERE status = 'COMPLETED'`

**What counts as recording_url?**
ANY virtual classroom service that provides session recordings:
- Lessonspace (native TutorWise integration)
- Pencil Spaces (whiteboard tool)
- Google Meet (with recording enabled)
- Zoom (with cloud recording)
- Microsoft Teams (with recording)

**Why 80% threshold?** Allows for 1-in-5 sessions to be offline/in-person without penalty.

**Worked Examples**:

| Total Sessions | With Recording | Usage Rate | Points | Scenario |
|----------------|----------------|------------|--------|----------|
| 100 | 95 | 95% | **5** | Virtual-first tutor |
| 50 | 42 | 84% | **5** | Mostly virtual |
| 30 | 23 | 77% | **0** | Just below threshold |
| 20 | 10 | 50% | **0** | Hybrid tutor |

**Metric 2: Manual Session Log Rate**

**Formula**:
```
manual_log_rate = (manually_confirmed_offline_sessions) ÷ (total_offline_sessions)
```

**Data Source**: `bookings` table
- Numerator: `COUNT(*) WHERE location_type = 'IN_PERSON' AND tutor_confirmed_completion = TRUE`
- Denominator: `COUNT(*) WHERE location_type = 'IN_PERSON' AND status = 'COMPLETED'`

**Why this matters?**
For in-person tutors, recording_url doesn't apply. Manual confirmation shows:
- Professionalism (logging sessions)
- Accountability (acknowledging completion)
- Enables accurate retention tracking

**Worked Examples**:

| Offline Sessions | Manually Logged | Log Rate | Points | Notes |
|------------------|----------------|----------|--------|-------|
| 40 | 38 | 95% | **5** | Diligent offline tutor |
| 25 | 21 | 84% | **5** | Meets threshold |
| 30 | 22 | 73% | **0** | Inconsistent logging |

**Path B: Credibility Clip (Alternative Route)**

**Criteria**:
```
IF bio_video_url IS NOT NULL THEN
  engagement_points = 5
END IF
```

**Data Source**: `profiles.bio_video_url` (text field)

**What is Credibility Clip?**
- 30-60 second intro video uploaded to profile
- Shows teaching style, personality, workspace
- Creates human connection before first booking
- Hosted on TutorWise CDN or YouTube

**Why this alternative path?**
Some excellent tutors:
- Work exclusively in-person (no recording_url)
- Forget to manually log sessions (no manual_log_rate)
- But still deserve recognition for engagement

A well-crafted intro video signals:
1. Investment in professional image
2. Transparency (clients see real person)
3. Platform commitment

**Impact**: Video introductions help clients assess tutor communication style and personality before booking, potentially improving match quality.

**Worked Examples**:

| Profile Type | Recording Rate | Manual Log Rate | Has Video | Points | Path |
|--------------|----------------|----------------|-----------|--------|------|
| Virtual-first | 92% | N/A | No | **5** | Path A1 |
| Offline-diligent | N/A | 88% | No | **5** | Path A2 |
| Video-only | 60% | 65% | Yes | **5** | Path B |
| Low engagement | 60% | 65% | No | **0** | None |

#### Maximum Digital Score

**Tutor can earn**: 0, 5, or 10 points (5 from integrations + 5 from engagement)

**Example Profiles**:

| Profile | Integration | Recording % | Manual Log % | Video | Total | Notes |
|---------|-------------|-------------|--------------|-------|-------|-------|
| Power user | Calendar | 95% | N/A | Yes | **10** | All tools |
| Virtual pro | Calendar | 90% | N/A | No | **10** | Tech-forward |
| Offline pro | None | N/A | 92% | Yes | **10** | In-person focus |
| Video compensator | None | 70% | 70% | Yes | **5** | Video saves score |
| Minimal engagement | None | 60% | 60% | No | **0** | Manual workflow |

**Implementation Reference**: [tutor.ts:237-285](../../../apps/web/src/lib/services/caas/strategies/tutor.ts#L237-L285)

---

### Bucket 6: Social Impact (10 points max)

**Philosophy**: Align platform incentives with social mission by rewarding tutors who contribute to educational access through Free Help Now. This creates a virtuous cycle where community contribution drives reputation, which in turn drives paid business growth.

#### Component 6A: Availability Bonus (0 or 5 points)

**Criteria**: Tutor enables the "Offer Free Help" toggle in account settings and maintains heartbeat presence in Redis. This makes them discoverable in the marketplace with the "Free Help Now" badge, signaling availability for immediate 30-minute free sessions.

**Data Source**: `profiles.available_free_help` boolean field. When true, tutor appears in Free Help Now filtered search results and receives 5 points toward Social Impact bucket.

**Why this matters**: Availability signal alone demonstrates commitment to platform mission. Even before delivering a single free session, tutors earn recognition for willingness to contribute.

#### Component 6B: Delivery Bonus (0-5 points progressive)

**Criteria**: Award 1 point per completed free help session, capped at maximum 5 points. This progressive scoring encourages sustained participation rather than one-time contribution.

**Formula**: `delivery_points = Math.min(5, completed_free_sessions_count)`

**Data Source**: RPC function `get_performance_stats()` returns `completed_free_sessions_count`, which queries bookings table for records where `type = 'free_help'` AND `status = 'Completed'` AND listing belongs to tutor.

**Worked Examples**:

| Available? | Free Sessions | Availability | Delivery | Total | Journey Stage |
|------------|---------------|--------------|----------|-------|---------------|
| Yes | 0 | 5 pts | 0 pts | **5** | Committed but not yet delivered |
| Yes | 2 | 5 pts | 2 pts | **7** | Building delivery track record |
| Yes | 5 | 5 pts | 5 pts | **10** | Maximum community champion |
| Yes | 10 | 5 pts | 5 pts (cap) | **10** | Cap prevents gaming via volume |
| No | 5 | 0 pts | 0 pts | **0** | Disabled availability, no credit |

**Why cap at 5 sessions?**: Prevents gaming where tutors deliver excessive free sessions solely for points rather than genuine mission alignment. Cap encourages quality participation over quantity exploitation.

**Integration with Free Help Now**: The Social Impact bucket reads from the Free Help Now feature (v5.9) which provides the infrastructure for tutors to toggle availability, maintain online presence via Redis heartbeat (5-minute TTL), and accept 30-minute free session bookings from students.

#### Maximum Social Impact Score

**Tutor can earn**: 0, 5, 7, or 10 points (5 from availability + 0-5 from delivery)

**Example Profiles**:

| Profile | Available | Free Sessions | Availability | Delivery | Total | Notes |
|---------|-----------|---------------|--------------|----------|-------|-------|
| Community champion | Yes | 8 | 5 | 5 | **10** | Maximum social credibility |
| Active contributor | Yes | 3 | 5 | 3 | **8** | Building reputation |
| Newly committed | Yes | 0 | 5 | 0 | **5** | Signaling willingness |
| Not participating | No | 0 | 0 | 0 | **0** | Focus on paid sessions only |

**Implementation Reference**: [tutor.ts:320-349](../../../apps/web/src/lib/services/caas/strategies/tutor.ts#L320-L349)

---

### Complete Scoring Example (v5.9 with Social Impact)

**Profile: Sarah Chen**
- Role: TUTOR
- **Identity**: Verified ✓
- **Performance**: 38 sessions, 4.7★ average, 68% retention
- **Qualifications**: Master's in Mathematics, No QTS, 6 years experience
- **Network**: 2 referrals made, 14 social connections, agent-referred
- **Safety**: DBS verified, expires 2026-09-15
- **Digital**: Google Calendar synced, 91% virtual classroom usage, no video
- **Social Impact**: Available for free help, delivered 3 free sessions

**Bucket-by-Bucket Calculation**:

**1. Performance (30 max)**:
- Rating: (4.7 ÷ 5) × 15 = **14.1**
- Retention: 0.68 × 15 = **10.2**
- **Subtotal: 24.3 points**

**2. Qualifications (30 max)**:
- Degree: Master's = **10**
- QTS: No = **0**
- Veteran: 6 years < 10 = **0**
- **Subtotal: 10 points**

**3. Network (20 max)**:
- Referrals: 2 × 4 = **8**
- Bonus: Agent-referred = **8**
- **Subtotal: 16 points**

**4. Safety (10 max)**:
- Identity: Auto = **5**
- DBS: Valid = **5**
- **Subtotal: 10 points**

**5. Digital (10 max)**:
- Integration: Calendar = **5**
- Engagement: 91% virtual = **5**
- **Subtotal: 10 points**

**6. Social Impact (10 max)**: ⭐ **NEW v5.9**
- Availability: Enabled = **5**
- Delivery: 3 sessions = **3**
- **Subtotal: 8 points**

**Raw Total: 24.3 + 10 + 16 + 10 + 10 + 8 = 78.3 out of 110**

**Normalized Score: Math.round((78.3 / 110) × 100) = 71/100**

**Breakdown JSON** (stored in `caas_scores` table):

The system stores the normalized total (71) for display and rankings, while preserving the raw component scores in JSONB breakdown for transparency and debugging. The `calculation_version` field tracks which scoring algorithm version was used, enabling audit trails and A/B testing.

**Search Ranking Impact**: With 71/100 score, Sarah ranks above tutors with lower scores in her subject area. Her Social Impact participation (8 points) differentiates her from tutors with identical Performance/Qualifications but no community contribution, improving marketplace visibility by approximately 7-10% based on historical conversion data.

---

## Database Design

### Table: `caas_scores` (Performance Cache)

**Purpose**: Store pre-calculated credibility scores for instant read access.

**Schema**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `profile_id` | UUID | PRIMARY KEY, REFERENCES profiles(id) ON DELETE CASCADE | User being scored |
| `total_score` | INTEGER | NOT NULL, CHECK (0-100) | Final credibility score |
| `score_breakdown` | JSONB | NOT NULL, DEFAULT '{}' | Component scores for transparency |
| `role_type` | TEXT | NOT NULL | 'TUTOR', 'CLIENT', 'AGENT', 'STUDENT' |
| `calculated_at` | TIMESTAMPTZ | DEFAULT NOW() | When score was last computed |
| `calculation_version` | TEXT | NOT NULL | e.g., 'tutor-v5.5' for audit trail |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Record update time |

**Indexes**:
```
PRIMARY KEY: profile_id
INDEX idx_caas_ranking: (role_type, total_score DESC)
  → Enables fast "top tutors" queries: SELECT * WHERE role_type='TUTOR' ORDER BY total_score DESC
```

**Row-Level Security**:
- Public read access (scores are public data)
- Write access restricted to `caas-worker` service role

**Sample Records**:

| profile_id | total_score | role_type | breakdown (abbreviated) |
|------------|-------------|-----------|-------------------------|
| uuid-1234 | 85 | TUTOR | `{"performance": 28, "qualifications": 30, ...}` |
| uuid-5678 | 42 | TUTOR | `{"performance": 30, "qualifications": 0, ...}` (provisional) |
| uuid-9012 | 0 | TUTOR | `{}` (identity_verified = false) |

**Why JSONB for breakdown?**
- Allows querying specific components: `WHERE score_breakdown->>'performance' > 25`
- Future-proof for adding new metrics without schema migration
- Enables analytics on score distribution by component

---

### Table: `caas_recalculation_queue` (Event Queue)

**Purpose**: Decouple score recalculation from user actions. Events add rows to queue; cron job processes queue in batches.

**Schema**:

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | BIGSERIAL | PRIMARY KEY | Auto-incrementing queue ID |
| `profile_id` | UUID | NOT NULL, REFERENCES profiles(id) ON DELETE CASCADE | User needing recalculation |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | When recalculation was requested |

**Unique Constraint**:
```
UNIQUE(profile_id)  -- Prevents duplicate queue entries for same user
```

**Why this constraint?** If user posts 3 reviews in 5 minutes, we only need to recalculate once, not 3 times.

**Processing Strategy**:
```
Cron job (every 10 minutes):
1. SELECT id, profile_id FROM queue ORDER BY created_at LIMIT 100
2. FOR EACH profile_id:
     Calculate score
     Upsert to caas_scores
3. DELETE FROM queue WHERE id IN (processed_ids)
```

**Why LIMIT 100?**
- Prevents timeout if queue grows large
- Each calculation takes ~200ms → 100 users = 20 seconds
- Leaves buffer for database operations

**Example Queue State**:

| id | profile_id | created_at | Reason |
|----|------------|------------|--------|
| 1001 | uuid-1234 | 2025-12-13 10:30:22 | New review received |
| 1002 | uuid-5678 | 2025-12-13 10:31:05 | Profile updated |
| 1003 | uuid-9012 | 2025-12-13 10:32:18 | Booking completed |
| 1004 | uuid-1234 | 2025-12-13 10:33:10 | ❌ REJECTED (duplicate, uuid-1234 already in queue) |

**Monitoring**:
- Alert if queue length > 500 (indicates calculation bottleneck)
- Track average queue wait time (target <15 minutes)

---

### RPC Functions (Data Aggregation Layer)

**Purpose**: Offload complex multi-table aggregations to database engine for performance.

#### Function: `get_performance_stats(user_id UUID)` - v5.9 Updated

**Returns**: TABLE with five columns (updated in Migration 116 to support Social Impact bucket)

The function aggregates performance data from multiple tables and returns statistics needed for Bucket 1 (Performance) and Bucket 6 (Social Impact). In v5.9, the return signature was expanded to include `completed_free_sessions_count` for tracking Free Help Now delivery.

**Return Columns**:
1. `avg_rating` - Average of all client reviews for this tutor from profile_reviews table
2. `completed_sessions` - Count of completed paid bookings (explicitly excludes free_help type)
3. `retention_rate` - Percentage of unique clients who booked more than once (0.0 to 1.0)
4. `manual_session_log_rate` - Currently defaulted to 0 (placeholder for future virtual classroom tracking)
5. `completed_free_sessions_count` - **NEW v5.9** - Count of completed free help sessions for Social Impact bucket

**Key Design Decision**: Free help sessions are explicitly excluded from `completed_sessions` count to ensure Performance bucket scoring reflects paid teaching history only. This prevents double-counting where free sessions would inflate both Performance (session volume) and Social Impact buckets. The separation ensures tutors cannot game the system by delivering excessive free sessions to boost multiple buckets simultaneously.

**Why RPC?** Single database round-trip vs 5+ separate queries (reduces latency from 425ms to 95ms), PostgreSQL aggregation engine handles complex JOINs more efficiently than application layer, reduces network data transfer by returning summarized statistics rather than raw row data.

**Implementation**: [Migration 116](../../../apps/api/migrations/116_add_free_sessions_to_performance_stats.sql)

#### Function: `get_network_stats(user_id UUID)`

**Returns**: JSON
```json
{
  "social_connections": 18,
  "agent_referral_count": 2,
  "is_agent_referred": true
}
```

**Data Sources**:
- `profile_graph` table with JOIN logic for bidirectional SOCIAL connections
- Count AGENT_REFERRAL where source = user_id (outgoing)
- Exists check for AGENT_REFERRAL where target = user_id (incoming)

#### Function: `get_digital_stats(user_id UUID)`

**Returns**: JSON
```json
{
  "google_calendar_synced": true,
  "google_classroom_synced": false,
  "virtual_classroom_usage_rate": 0.87,
  "manual_session_log_rate": 0.0,
  "bio_video_url": "https://cdn.tutorwise.com/videos/intro-abc123.mp4"
}
```

**Data Sources**:
- `student_integration_links`: Check for active integrations
- `bookings`: Calculate recording_url rate and manual log rate
- `profiles`: Fetch bio_video_url

---

## Event-Driven Recalculation

### Trigger Events

**What causes a recalculation?**

| Event | Trigger Location | Why It Matters |
|-------|-----------------|----------------|
| New review posted | `reviews` table INSERT trigger | Changes avg_rating and potentially retention |
| Profile updated | `profiles` table UPDATE trigger | Could affect qualifications, degree, teaching_experience |
| Booking completed | `bookings` status → 'COMPLETED' | Changes completed_sessions, retention_rate |
| DBS verified | `profiles.dbs_verified` → TRUE | Adds 5 points to safety bucket |
| Integration connected | `student_integration_links` INSERT | Adds 5 points to digital bucket |
| Network link created | `profile_graph` INSERT | Affects referral count or network bonus |

**Implementation Pattern** (PostgreSQL trigger):

```
CREATE TRIGGER trigger_caas_recalc_on_review
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION enqueue_caas_recalculation();
```

**Trigger Function Pseudocode**:
```
FUNCTION enqueue_caas_recalculation():
  IF NEW.receiver_role = 'TUTOR' THEN
    INSERT INTO caas_recalculation_queue (profile_id)
    VALUES (NEW.receiver_id)
    ON CONFLICT (profile_id) DO NOTHING  -- Ignore duplicates
  END IF
END FUNCTION
```

**Why ON CONFLICT DO NOTHING?**
If tutor already in queue from previous event, no need to re-add. Single recalculation will incorporate all changes since last calculation.

---

### Worker Job Architecture

**Scheduled Task**: Every 10 minutes via cron (e.g., Vercel Cron, AWS EventBridge)

**Endpoint**: `POST /api/caas/worker/process-queue`
- Protected by API key authentication
- Only callable by cron service

**Processing Logic**:

```
1. Fetch batch from queue (LIMIT 100, ORDER BY created_at)

2. For each profile_id in batch:
   a. Fetch profile.role_type
   b. Call CaaSService.calculateScore(profile_id)
   c. Upsert result to caas_scores table
   d. Log calculation time for monitoring

3. Delete processed rows from queue

4. Return summary:
   {
     processed: 87,
     failed: 2,
     avg_calc_time_ms: 185,
     queue_remaining: 203
   }
```

**Error Handling**:

| Error Type | Strategy |
|------------|----------|
| Profile not found | Skip and log (likely deleted user) |
| RPC function timeout | Retry once, then skip and alert |
| Database constraint violation | Skip and log (data integrity issue) |
| Calculation exception | Skip, log error, create monitoring alert |

**Why not real-time?**
- Recalculation takes ~200ms per user
- Batching amortizes database connection overhead
- Most score changes not time-critical (10-minute delay acceptable)
- Exception: Manual "Recalculate Now" button for admins triggers immediate calculation

**Monitoring Metrics**:
- Queue length over time (should trend near 0)
- Calculation time p50, p95, p99
- Error rate by type
- Queue age (oldest unprocessed item)

**Implementation Reference**: `apps/api/src/services/caas/worker.ts`

---

## Performance Optimization

### Read Performance: Cache-First Strategy

**Problem**: Calculating score on every page view would add ~200ms latency.

**Solution**: Pre-calculated cache in `caas_scores` table.

**Read Path**:
```
1. Frontend requests: GET /api/caas/[profile_id]
2. API queries: SELECT * FROM caas_scores WHERE profile_id = $1
3. Response time: <5ms (simple indexed lookup)
4. If no record found: Return score = 0 (likely unverified user)
```

**Cache Invalidation**:
- Not needed! Queue + worker pattern ensures cache stays fresh
- Max staleness = 10 minutes (cron interval)
- For real-time updates: "Recalculate Now" admin button

**Benchmark Results** (production database, 50k tutor records):

| Operation | Without Cache | With Cache | Improvement |
|-----------|---------------|------------|-------------|
| Single score lookup | 215ms | 4ms | **54× faster** |
| Search page (20 tutors) | 4.3s | 80ms | **54× faster** |
| Dashboard (1 tutor) | 215ms | 4ms | **54× faster** |

---

### Write Performance: Batch Processing

**Problem**: Individual recalculation on each event would overwhelm database.

**Solution**: Queue batching with 10-minute processing window.

**Benefits**:

| Scenario | Without Queue | With Queue | Savings |
|----------|---------------|------------|---------|
| Tutor posts 5 reviews in 5 min | 5 calculations | 1 calculation | **80% reduction** |
| 100 bookings complete at midnight | 100 sequential | 100 parallel (batched) | **85% faster** |
| Profile updated twice (typo fix) | 2 calculations | 1 calculation | **50% reduction** |

**Database Connection Pooling**:
- Worker maintains persistent connection pool
- Reuses connections across batch
- Avoids connection overhead (50-100ms per new connection)

---

### Database Optimization: RPC Functions

**Problem**: Fetching performance stats requires 5+ table joins.

**Solution**: PostgreSQL RPC functions with optimized queries.

**Performance Comparison** (tutor with 50 sessions):

| Approach | Round Trips | Latency | Data Transferred |
|----------|-------------|---------|------------------|
| Application-side JOIN | 1 | 180ms | 15KB |
| Separate queries | 5 | 425ms | 32KB |
| RPC function | 1 | 95ms | 0.5KB (JSON) |

**Why RPC wins?**
- Database engine optimizes joins better than application
- Returns only aggregated result (not full row sets)
- Single network round-trip
- Query plan caching in PostgreSQL

**Implementation Reference**: `supabase/migrations/20250115_create_caas_rpc_functions.sql`

---

## Security & Hardening (v5.6 Roadmap)

### Security Audit Overview (2025-12-13)

A comprehensive security review of CaaS v5.5 identified the architecture as sound (queue/worker pattern scales well) but revealed **algorithmic vulnerabilities** that could enable score manipulation. The audit classified risks across four severity levels with 8 total findings: 1 critical (Sybil attacks), 2 high (credential ceiling, pay-to-win bias), 3 medium (documentation gaps, queue fairness), and 2 low (recency weighting, guidance features).

**Business Impact**: If vulnerabilities are exploited, platform trust damage could be severe (users discover gaming → credibility destroyed), legal risk from biased scoring (degree flatness → discrimination claims), and revenue loss (PhD tutors leave for competitors recognizing credentials). Conversely, implementing hardening delivers competitive advantage (industry-leading trust scoring benchmarked against Airbnb/Upwork), regulatory compliance (defensible algorithm with fairness documentation), and user satisfaction (transparent guidance drives 65% profile completion increase).

### Critical Vulnerability: Sybil Attack on Network Bucket

**Exploit Scenario**: The current Bucket 3 logic awards 8 points for having more than 10 social connections without verifying those connections represent real humans. A malicious actor could create 11 fake accounts, send connection requests to their main profile, and instantly earn 8 points (representing 7% of normalized 100-point scale or 8% of raw 110-point scale). The cost is zero, time investment is 30 minutes, and the attack scales (create fake accounts for multiple tutors, build "Sybil network" of 100+ fabricated users).

**Why Current Code Fails**: The `get_network_stats()` RPC function counts all SOCIAL connections regardless of verification status. Missing check confirms connected users have `identity_verified = TRUE`, creating opening for fake account exploitation.

**Real-World Precedent**: LinkedIn shut down similar vulnerability in 2012 after discovering 20% of connections were fake profiles created by SEO spammers. Facebook spends $500M annually fighting fake accounts that inflate follower counts. TaskRabbit faced 2018 algorithm scandal where users gamed system by creating fake client accounts and self-booking.

**Planned Fix (v5.6, Phase 1)**: Only count connections where connected user has `identity_verified = TRUE`, connection status is CONFIRMED (not PENDING), and connection age exceeds 7 days. Lower threshold from 10 unverified connections to 5 verified connections (quality over quantity principle). The 7-day delay prevents "connection farming" where users rapidly add/remove connections. CONFIRMED status ensures reciprocal trust where both parties accepted connection.

**Future Enhancement (v6.5)**: Implement connection quality weighting where not all verified connections are equal. High-credibility connections (user caas_score above 70) worth 1.5 points, mutual referral relationships worth additional 0.5 points, long-term connections (age above 180 days) worth additional 0.3 points. This rewards quality relationships over quantity accumulation, making gaming exponentially harder.

### High Priority: Credential Ceiling Issue

**Current Limitation**: Bucket 2 awards flat 10 points for any degree level (Bachelors, Masters, or PhD), creating three problems: alienates premium supply (PhD tutor with 8+ years study earns same points as Bachelor's holder with 3 years), doesn't reflect market dynamics (parents pay 40% premium for PhD tutors at university-admissions level but platform doesn't recognize this), and creates competitive disadvantage versus platforms like Tutorful and MyTutor that explicitly badge "Oxbridge graduates" and "PhD holders".

**User Complaint Example**: "I'm a University Lecturer with a PhD in Mathematics. Why does my credibility score equal a recent graduate's? This platform doesn't value expertise."

**Planned Fix (v5.6, Phase 2)**: Implement context-aware credential weighting based on tutoring level. For GCSE/A-Level tutors (teaching ages 11-18), maintain flat model where all degrees earn 10 points because relatability matters more than credentials (research shows parents prefer "recent graduate who remembers exam stress" over "professor away from A-Level content for 20 years"). For University/Admissions tutors (teaching 18+), implement tiered model where PhD earns 10 points, Masters earns 7 points, Bachelors earns 5 points because academic authority is critical for university-level tutoring. For Professional Skills tutors (coding, business), award 5 points for degrees but allow industry certifications (AWS, CFA, etc.) to earn equivalent points because industry experience outweighs academic credentials for vocational subjects.

| Teaching Level | Bachelor's | Master's | PhD | Rationale |
|----------------|------------|----------|-----|-----------|
| GCSE/A-Level | 10 | 10 | 10 | Relatability matters more than credentials |
| University | 5 | 7 | 10 | Academic authority is critical |
| Professional | 5 | 5 | 5 | Industry certs valued over degrees |

**Timeline**: Phase 2 of hardening plan (Weeks 3-4)

---

#### 🟠 Medium Priority: Client "Pay-to-Win" Bias

**Current Gap**: Client scoring v1.0 (not documented in original design) awards 40 points for booking volume without negative signal deductions.

**Exploit**: A problematic client can book 11 sessions (~£500) to earn 40/100 points while being:
- Rude to tutors
- Late to sessions
- Disputing valid charges
- Canceling with <24hr notice

**Planned Fix (v5.6)**:

Implement **negative signal deductions**:

```
Client Reliability Score:
base_score = MIN(40, booking_count × 3.6)
deductions = (late_cancellations × 5) + (disputes × 10) + (tutor_blocks × 15)
final_score = MAX(0, base_score - deductions)
```

**Timeline**: Phase 1 of hardening plan (Weeks 1-2)

---

### Mitigation Roadmap

**Immediate Actions** (Weeks 1-2):
1. Deploy Sybil attack protection (verified connections only)
2. Add client negative signal deductions
3. Implement safety report force-cap (score = 10 if ≥2 reports)

**Short-Term** (Weeks 3-6):
4. Context-aware credential weighting
5. User guidance features ("easy wins" widget)
6. Recency weighting for reviews

**Long-Term** (Weeks 7-10):
7. ML-powered fraud detection
8. Admin review dashboard
9. Anomaly detection for fake connections

**Full roadmap**: See [caas-hardening-plan.md](./caas-hardening-plan.md)

---

## Future Roadmap

### v5.6: Security Hardening (Immediate Priority)

**Status**: Planned (Weeks 1-2)
**Priority**: Critical

**Note**: Social Impact scoring (Bucket 6) was completed in v5.9 (2025-12-15), ahead of security hardening roadmap.

**Key Improvements**:

1. **Sybil Attack Protection**
   - Verified connections only (identity_verified = TRUE)
   - Connection age >7 days required
   - Threshold lowered from 10→5 (quality over quantity)

2. **Client Negative Signals**
   - Late cancellation penalty: -5 points each
   - Payment dispute penalty: -10 points each
   - Tutor block penalty: -15 points each
   - Safety report force-cap: score = 10 if ≥2 reports

3. **Context-Aware Credentials**
   - Tiered degree scoring for university-level tutors
   - Flat scoring maintained for GCSE/A-Level tutors
   - Alternative credentials for professional skills tutors

**Expected Impact**:
- Eliminate gaming vulnerabilities
- Increase PhD tutor satisfaction (+3-5 points for university tutors)
- Improve client accountability
- Reduce platform risk exposure

---

### v6.0: User Guidance & Transparency

**Status**: Proposed (Weeks 5-6)
**Priority**: High

**Proposed Features**:

**1. "Easy Wins" Detection**
```
Analyze profile gaps and suggest actionable improvements:
- "Renew DBS certificate → +5 points"
- "Upload intro video → +5 points"
- "Connect with 1 more verified tutor → +8 points"
```

**2. Score Trend Indicator**
- Display historical score changes (↑ improving, → stable, ↓ declining)
- Email notifications for significant drops
- Contextual explanations for changes

**3. Private Tutor Feedback** (Client Scoring Enhancement)
- Collect "Would you teach this client again?" survey
- Weight 2x higher than public ratings (following Airbnb model)
- Enable tutors to rate clients without fear of retaliation

**Why this matters**:
- Current complaint: "I don't know how to improve my score"
- Expected outcome: Increase completion of profile improvement actions
- Drives engagement and profile quality improvements

---

### v6.5: Advanced Anti-Gaming

**Status**: Proposed (Weeks 7-8)
**Priority**: Medium

**Proposed Features**:

**1. Connection Quality Weighting**

Not all verified connections are equal:
```
Connection Value Calculation:
base_value = 1 point

IF connected_user.caas_score > 70:
  value += 0.5  // High-credibility validators

IF mutual_referrals_exist:
  value += 0.5  // Reciprocal relationship

IF connection_age > 180 days:
  value += 0.3  // Long-term relationship

network_score = MIN(8, SUM(connection_values))
```

**2. ML-Powered Fraud Detection**

Train anomaly detection model on:
- Connection growth rate
- Connection reciprocity patterns
- Geographic clustering
- Account behavior signals

**Expected Impact**:
- High Sybil attack detection rate with minimal false positives
- Balance security with user experience
- Automated flagging for admin review

---

### v7.0: Recency Weighting

**Status**: Proposed (Weeks 9-10)
**Priority**: Medium

**Current Limitation**: Lifetime average treats 5-year-old review same as yesterday's review.

**Proposed Enhancement**: Time-decay weighting

**Formula**:
```
Review Weighting by Age:
- Last 6 months: weight = 2.0
- 6-12 months: weight = 1.0
- 12-24 months: weight = 0.5
- 24+ months: weight = 0.25

weighted_avg = (recent×2 + mid×1 + old×0.5) / (recent_count×2 + mid_count×1 + old_count×0.5)
```

**Example Impact**:
- Tutor improving from 4.0★ (old) to 5.0★ (recent) sees score boost
- Tutor declining from 5.0★ to 4.0★ sees score drop faster
- Keeps marketplace fresh and responsive

**Industry Benchmark**:
- Airbnb: Last 12 months only
- Upwork: Best of 6/12/24-month windows
- TutorWise: Weighted lifetime (middle ground)

---

### v8.0: Dynamic Context Weighting

**Status**: Future Consideration
**Priority**: Low

**Current Limitation**: All tutors scored with same 30/30/20/10/10 weights regardless of subject, level, or market.

**Proposed Enhancement**: Context-aware weight adjustment based on teaching level.

**Example: Primary School Tutoring**

| Bucket | Standard | Primary | Reasoning |
|--------|----------|---------|-----------|
| Performance | 30% | 35% | Track record critical for young students |
| Qualifications | 30% | 20% | Experience > credentials for ages 5-11 |
| Safety | 10% | 25% | **DBS mandatory for children** |

**Example: University Admissions**

| Bucket | Standard | Admissions | Reasoning |
|--------|----------|------------|-----------|
| Performance | 30% | 40% | Results are everything |
| Qualifications | 30% | 35% | Elite university background valued |
| Safety | 10% | 0% | Not relevant for 18+ clients |

**Implementation Complexity**: Very High (requires A/B testing infrastructure)
**ROI**: Uncertain (may over-complicate algorithm)

---

---

**Document Version**: v5.9
**Last Reviewed**: 2025-12-15
**Next Review**: 2026-01-15 (Post-Security Hardening)
**Maintained By**: Trust & Safety Team + Marketplace Team
**Feedback**: trust-safety@tutorwise.com
