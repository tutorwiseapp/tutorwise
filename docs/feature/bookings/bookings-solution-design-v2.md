# Bookings Solution Design

**Status**: ✅ Active (v6.0 - 5-Stage Scheduling Workflow)
**Last Updated**: 2026-02-05
**Last Code Update**: 2026-02-05
**Priority**: Critical (Tier 1 - Core Transaction Infrastructure)
**Architecture**: Gold Standard Hub + Event-Driven Transactions + Listing Snapshots + Scheduling State Machine
**Business Model**: Commission-based (10% platform fee, 10-20% commission splits based on referral/agent type)

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-02-08 | v6.1 | **⚠️ Deprecation**: Removed wiselist attribution tracking - referral system (v4.3) removed from platform |
| 2026-02-05 | v6.0 | **5-Stage Scheduling Workflow**: Discover > Book > Schedule > Pay > Review. New scheduling_status enum, propose/confirm/reschedule APIs, 15-min slot reservation, pg_cron cleanup |
| 2025-12-12 | v5.9 | **Free Help Support**: Added free_help booking type, instant confirmation flow, 30-minute session format |
| 2025-12-08 | v5.8 | **Listing Snapshots**: Preserved 7 critical listing fields in bookings for historical accuracy |
| 2025-11-20 | v5.7 | **~~Wiselist Attribution~~**: ❌ REMOVED (2026-02-08) - Cookie-based referral tracking for in-network conversions |
| 2025-11-01 | v5.0 | **3-Party Bookings**: Guardian/student/tutor support via student_id field |
| 2025-10-15 | v4.9 | **Payment Webhook v4**: Commission split logic (90/10, 80/10/10 referral, or 70/20/10 agent-led) |
| 2025-09-20 | v4.0 | **Initial Release**: Direct bookings, Stripe integration, WiseSpace completion |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Context](#business-context)
3. [Architecture Overview](#architecture-overview)
4. [Booking Lifecycle](#booking-lifecycle)
5. [Critical Design Decisions](#critical-design-decisions)
6. [System Integrations](#system-integrations)
7. [Security & Performance](#security--performance)
8. [Future Roadmap](#future-roadmap)

---

## Executive Summary

**Bookings** is TutorWise's core transaction management system that orchestrates the complete tutoring session lifecycle from listing discovery through payment, delivery, and review triggering. The system processes over 200 monthly bookings across three booking types (direct, agent-referred, free help) with 99.7% payment success rate and sub-5-second booking creation.

The architecture implements four critical innovations:

1. **5-Stage Scheduling Workflow (v6.0)** - Discover > Book > Schedule > Pay > Review. Separates booking creation from scheduling, allowing flexible time negotiation with 15-minute slot reservations
2. **Listing Snapshot Mechanism (v5.8)** - Preserves booking context even if listings are modified or deleted, ensuring historical accuracy and audit compliance
3. **Atomic Payment Processing (v4.9)** - Single database transaction creates 4-way commission splits (client, tutor, agent, platform) with idempotency guarantees
4. **Free Help Integration (v5.9)** - Zero-friction instant booking flow for 30-minute free sessions, bypassing payment entirely while maintaining full lifecycle tracking

### Key Design Goals

| Goal | Target Outcome |
|------|----------------|
| **Transaction Integrity** | Zero financial discrepancies through atomic RPC functions |
| **Historical Accuracy** | Complete booking records preserved regardless of listing changes |
| **Payment Success Rate** | >99% Stripe checkout completion via webhook retry logic |
| **Booking Creation Speed** | <5 seconds from click to confirmation (paid) or instant (free) |
| **Commission Accuracy** | Correct 3-way or 4-way splits for all referred bookings |
| **Review Completion** | >60% review submission rate via automatic triggering |
| **Scheduling Flexibility** | Either party can propose times, 15-min slot hold, max 4 reschedules |
| **Slot Conflict Prevention** | Automatic cleanup of expired reservations via pg_cron every 5 minutes |

---

## Business Context

### Why Bookings Matter

**For Clients** (Students/Parents):
- Transparent pricing with upfront total cost calculation
- Secure payment via Stripe with buyer protection
- Complete booking history with session artifacts (whiteboards, notes)
- Automatic review prompts after session completion
- Free help access via instant 30-minute sessions (v5.9)

**For Tutors**:
- Automated payout calculation with 7-day clearing period
- Commission transparency showing exact take-home amount
- WiseSpace integration for seamless session delivery
- Protection against late cancellations (refund policy)
- CaaS score boost from completed sessions and free help delivery

**For Agents** (Tutor Networks):
- Lifetime attribution to referred clients via `referred_by_agent_id`
- 10% commission on all client bookings (perpetual)
- Dashboard showing referral pipeline and conversion rates
- Ability to assign specific tutors to agent-sourced jobs

**For Platform**:
- 10% platform fee on all paid transactions
- Drives marketplace liquidity (more bookings → more reviews → better search)
- Revenue scales with tutor supply (commission model)
- Free help sessions drive social mission while building tutor reputation

### Market Context

**Competitive Landscape**:
- **Tutorful**: Charges 15% commission but no agent referral program
- **MyTutor**: Subscription model (£20/month) instead of per-booking fee
- **Superprof**: 25% commission on first lesson, free thereafter (anti-retention)
- **TutorWise Edge**: Lower commission (10%) + agent network incentives + free help mission

**Business Model Innovation**: TutorWise implements flexible commission splits based on booking type:
- **Direct bookings**: 90/10 split (tutor/platform)
- **Referred clients**: 80/10/10 split (tutor/referral commission/platform)
- **Agent-led bookings**: 70/20/10 split (tutor/agent/platform)

Traditional platforms view agents as competitors, but TutorWise recognizes tutor networks as supply partners. This creates viral growth loop where agents recruit tutors who generate bookings which fund agent commissions which fund more tutor recruitment.

---

## Architecture Overview

### High-Level System Design

The bookings system operates as an event-driven transaction orchestrator connecting six major platform subsystems. When a client initiates a booking, the system executes a coordinated workflow across listings (fetch and snapshot), payments (Stripe checkout and webhook), financials (commission splits), reviews (automatic session creation), CaaS (score recalculation), and WiseSpace (virtual classroom) to ensure atomic transaction integrity while maintaining sub-5-second perceived latency through asynchronous processing.

**Core Philosophy**: "Optimistic UI, Pessimistic Backend"

The frontend immediately shows success feedback using React Query optimistic updates, while the backend performs rigorous validation and uses database transactions to guarantee financial accuracy. If backend validation fails, optimistic updates roll back gracefully with user-friendly error messages.

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Bookings System v5.9                              │
│                  (Event-Driven Transaction Orchestrator)                 │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ CLIENT TIER (Frontend)                                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────┐         ┌──────────────────┐                      │
│  │ Marketplace      │         │ Listing Detail   │                      │
│  │ (Browse Tutors)  │────────→│ (Book Session)   │                      │
│  └──────────────────┘         └──────────────────┘                      │
│                                         │                                 │
│                                         ↓                                 │
│                             ┌──────────────────────┐                     │
│                             │ React Query          │                     │
│                             │ (Optimistic Updates) │                     │
│                             └──────────────────────┘                     │
│                                         │                                 │
└─────────────────────────────────────────┼─────────────────────────────────┘
                                          │
                                          ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ API TIER (Next.js Route Handlers)                                        │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  POST /api/bookings                  POST /api/webhooks/stripe           │
│  ┌─────────────────────┐            ┌───────────────────────┐           │
│  │ 1. Validate listing │            │ 1. Verify signature   │           │
│  │ 2. Snapshot fields  │            │ 2. Idempotency check  │           │
│  │ 3. Create booking   │            │ 3. Call RPC function  │           │
│  │ 4. Return checkout  │            │ 4. Update booking     │           │
│  └─────────────────────┘            └───────────────────────┘           │
│            │                                    ↑                         │
│            ↓                                    │                         │
│  ┌──────────────────────┐                      │                         │
│  │ Stripe Checkout      │──────────────────────┘                         │
│  │ (External Payment)   │    Webhook callback                            │
│  └──────────────────────┘                                                │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ↓
┌──────────────────────────────────────────────────────────────────────────┐
│ DATABASE TIER (PostgreSQL + Supabase)                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  Tables:                         RPC Functions:                          │
│  ┌──────────────────┐            ┌───────────────────────────────┐      │
│  │ bookings         │            │ handle_successful_payment()   │      │
│  │ transactions     │◄───────────│ (Atomic 4-way commission)     │      │
│  │ listings         │            └───────────────────────────────┘      │
│  │ profiles         │                                                    │
│  │ referrals        │            Triggers:                              │
│  └──────────────────┘            ┌───────────────────────────────┐      │
│           │                      │ • booking_completed           │      │
│           │                      │   → caas_recalculation_queue  │      │
│           │                      │ • status_changed              │      │
│           ↓                      │   → review_sessions           │      │
│  ┌──────────────────┐            └───────────────────────────────┘      │
│  │ Event Queue      │                                                    │
│  │ • Reviews        │────────→ Async workers                            │
│  │ • CaaS           │────────→ Process later                            │
│  └──────────────────┘                                                    │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘

KEY INTEGRATIONS:
├─ Stripe: Payment processing + webhook delivery
├─ WiseSpace: Virtual classroom session delivery
├─ CaaS: Tutor credibility score recalculation
├─ Reviews: Automatic review session creation
└─ Referrals: Agent commission attribution
```

### 5-Stage Booking Workflow (v6.0)

The booking system now implements a clear 5-stage workflow that separates concerns:

| Stage | Actions | Status Changes |
|-------|---------|----------------|
| **1. Discover** | Client browses marketplace, views listings | Pre-booking |
| **2. Book** | Client creates booking request | status=Pending, scheduling_status=unscheduled |
| **3. Schedule** | Propose → Confirm time negotiation | scheduling_status=proposed → scheduled |
| **4. Pay** | Stripe checkout (triggered on schedule confirm) | payment_status=Paid, status=Confirmed |
| **5. Review** | Session delivery, review submission | status=Completed |

**Key Design Decision**: Payment is combined with scheduling confirmation. When one party confirms the proposed time, Stripe checkout is triggered immediately. This prevents "scheduled but unpaid" states and reduces booking abandonment.

### Booking Flow Architecture

**Three Booking Paths**:

**Path 1: Paid Direct Booking with Scheduling** (v6.0 Standard)
1. Client selects listing, clicks "Book Now" (no date/time selection yet)
2. System creates booking record (status: Pending, scheduling_status: unscheduled, session_start_time: NULL)
3. Snapshot 7 listing fields into booking (subjects, levels, hourly_rate, etc.)
4. Either party proposes a time via SchedulingModal
5. System validates time (24h minimum notice, 30-day max advance)
6. System sets scheduling_status=proposed, slot_reserved_until=NOW()+15min
7. Other party receives notification and confirms
8. On confirmation: Stripe Checkout created with booking_id + scheduling_confirmed metadata
9. Client completes payment on Stripe
10. Stripe webhook fires `checkout.session.completed`
11. System calls `handle_successful_payment()` RPC (atomic transaction)
12. RPC creates 4 transaction records, updates booking (status: Confirmed, scheduling_status: scheduled)
13. Client and tutor receive email confirmations

**Path 2: Agent-Referred Booking** (With Referral Commission)
- Same as Path 1, but client has `referred_by_agent_id` set
- Payment webhook creates 3-way split: 80% tutor, 10% referral commission, 10% platform
- Referral commission applies to ALL client bookings (lifetime attribution)
- Commission clearing period: 7 days after session completion

**Path 2b: Agent-Led Booking** (With Agent Commission)
- Booking created via agent dashboard with `agent_profile_id` explicitly set
- Payment webhook creates different 3-way split: 70% tutor, 20% agent commission, 10% platform
- Agent commission recognizes active involvement in matching tutor to client
- Commission clearing period: 7 days after session completion

**Path 3: Free Help Booking** (Instant Confirmation - v5.9)
1. Student clicks "Get Free Help Now" on tutor with `available_free_help = true`
2. System validates tutor online via Redis heartbeat check
3. System enforces rate limit (5 free sessions per 7 days per student)
4. System creates booking (type: free_help, amount: 0, duration: 30 minutes)
5. Skip payment entirely (status: Confirmed, payment_status: Paid immediately)
6. Generate Google Meet link via meet.new API
7. Return instant confirmation with video link
8. Student and tutor join session immediately

**Why This Design?**: Paid bookings require financial validation (inventory check, payment processing, fraud prevention), justifying the multi-step flow. Free help sessions prioritize instant access over validation, accepting slightly higher abuse risk (mitigated by rate limiting) to maximize educational reach.

### Sequence Diagrams

#### Paid Booking Flow (Direct or Agent-Referred)

```
Client          Frontend       API             Stripe          Database        Email
  │                │             │                │               │              │
  │ Click "Book"   │             │                │               │              │
  ├───────────────→│             │                │               │              │
  │                │             │                │               │              │
  │                │ POST        │                │               │              │
  │                │ /bookings   │                │               │              │
  │                ├────────────→│                │               │              │
  │                │             │ Validate       │               │              │
  │                │             │ listing        │               │              │
  │                │             ├───────────────────────────────→│              │
  │                │             │                │   Listing OK  │              │
  │                │             │◄───────────────────────────────┤              │
  │                │             │                │               │              │
  │                │             │ INSERT booking │               │              │
  │                │             │ (status: Pending)              │              │
  │                │             │ + snapshot 7 listing fields    │              │
  │                │             ├───────────────────────────────→│              │
  │                │             │                │   Booking ID  │              │
  │                │             │◄───────────────────────────────┤              │
  │                │             │                │               │              │
  │                │  Checkout   │                │               │              │
  │                │  URL        │                │               │              │
  │                │◄────────────┤                │               │              │
  │                │             │                │               │              │
  │  Redirect      │             │                │               │              │
  ├───────────────→│             │                │               │              │
  │                │             │                │               │              │
  │                │             │                │               │              │
  │  ──────────── Stripe Checkout Page ────────────              │              │
  │                │             │                │               │              │
  │ Enter payment  │             │                │               │              │
  │ details        │             │                │               │              │
  ├────────────────────────────────────────────→  │               │              │
  │                │             │   Payment OK   │               │              │
  │                │             │                │               │              │
  │                │             │                │  Webhook:     │              │
  │                │             │                │  checkout.    │              │
  │                │             │                │  completed    │              │
  │                │             │                ├──────────────→│              │
  │                │             │                │               │              │
  │                │             │  Verify        │               │              │
  │                │             │  signature     │               │              │
  │                │             │◄───────────────┤               │              │
  │                │             │                │               │              │
  │                │             │  Idempotency   │               │              │
  │                │             │  check         │               │              │
  │                │             ├───────────────────────────────→│              │
  │                │             │                │  Not processed│              │
  │                │             │◄───────────────────────────────┤              │
  │                │             │                │               │              │
  │                │             │  RPC: handle_  │               │              │
  │                │             │  successful_   │               │              │
  │                │             │  payment()     │               │              │
  │                │             ├───────────────────────────────→│              │
  │                │             │                │  BEGIN TRANSACTION          │
  │                │             │                │  • INSERT 4 transactions    │
  │                │             │                │  • UPDATE booking           │
  │                │             │                │    status=Confirmed         │
  │                │             │                │  • UPDATE referrals         │
  │                │             │                │  COMMIT                     │
  │                │             │                │               │              │
  │                │             │  Success       │               │              │
  │                │             │◄───────────────────────────────┤              │
  │                │             │                │               │              │
  │                │             │  Send emails   │               │              │
  │                │             ├──────────────────────────────────────────────→│
  │                │             │                │               │  Confirmation│
  │◄───────────────────────────────────────────────────────────────────────────┤
  │                │             │                │               │              │

TIMING: ~3-5 seconds total (optimistic UI shows instant success)
CRITICAL: Idempotency prevents double-charging on webhook retry
```

#### Free Help Booking Flow (v5.9)

```
Student         Frontend       API           Redis          Database      Google Meet
  │                │             │              │               │              │
  │ Click "Get     │             │              │               │              │
  │ Free Help Now" │             │              │               │              │
  ├───────────────→│             │              │               │              │
  │                │             │              │               │              │
  │                │ POST        │              │               │              │
  │                │ /bookings/  │              │               │              │
  │                │ free-help   │              │               │              │
  │                ├────────────→│              │               │              │
  │                │             │ Check tutor  │               │              │
  │                │             │ online       │               │              │
  │                │             ├────────────→ │               │              │
  │                │             │   Online ✓   │               │              │
  │                │             │◄─────────────┤               │              │
  │                │             │              │               │              │
  │                │             │ Rate limit   │               │              │
  │                │             │ check        │               │              │
  │                │             ├──────────────────────────────→│              │
  │                │             │              │  Count < 5    │              │
  │                │             │◄──────────────────────────────┤              │
  │                │             │              │               │              │
  │                │             │ INSERT       │               │              │
  │                │             │ booking      │               │              │
  │                │             │ (type:       │               │              │
  │                │             │  free_help,  │               │              │
  │                │             │  status:     │               │              │
  │                │             │  Confirmed,  │               │              │
  │                │             │  amount: 0)  │               │              │
  │                │             ├──────────────────────────────→│              │
  │                │             │              │  Booking ID   │              │
  │                │             │◄──────────────────────────────┤              │
  │                │             │              │               │              │
  │                │             │  Generate    │               │              │
  │                │             │  Meet link   │               │              │
  │                │             ├──────────────────────────────────────────────→│
  │                │             │              │               │   meet.new   │
  │                │             │              │               │◄─────────────┤
  │                │             │              │               │              │
  │                │  Booking +  │              │               │              │
  │                │  Meet link  │              │               │              │
  │                │◄────────────┤              │               │              │
  │                │             │              │               │              │
  │  Join session  │             │              │               │              │
  │  immediately   │             │              │               │              │
  ├───────────────────────────────────────────────────────────────────────────→│
  │                │             │              │               │              │

TIMING: ~1-2 seconds total (instant confirmation, no payment)
CRITICAL: Rate limiting prevents abuse (5 per 7 days per student)
```

#### Booking Completion Flow (WiseSpace Integration)

```
WiseSpace      API           Database         Reviews       CaaS
  │             │               │                │            │
  │ Session     │               │                │            │
  │ ends        │               │                │            │
  │             │               │                │            │
  │ POST        │               │                │            │
  │ /wisespace/ │               │                │            │
  │ [id]/       │               │                │            │
  │ complete    │               │                │            │
  ├────────────→│               │                │            │
  │             │               │                │            │
  │             │ Verify        │                │            │
  │             │ session       │                │            │
  │             │ occurred      │                │            │
  │             ├──────────────→│                │            │
  │             │   Session OK  │                │            │
  │             │◄──────────────┤                │            │
  │             │               │                │            │
  │             │ UPDATE        │                │            │
  │             │ booking       │                │            │
  │             │ status=       │                │            │
  │             │ Completed     │                │            │
  │             ├──────────────→│                │            │
  │             │               │                │            │
  │             │               │ TRIGGER        │            │
  │             │               │ booking_       │            │
  │             │               │ completed      │            │
  │             │               ├───────────────→│            │
  │             │               │   INSERT       │            │
  │             │               │   review_      │            │
  │             │               │   session      │            │
  │             │               │                │            │
  │             │               │ TRIGGER        │            │
  │             │               │ caas_          │            │
  │             │               │ recalc         │            │
  │             │               ├────────────────────────────→│
  │             │               │                │   INSERT   │
  │             │               │                │   queue    │
  │             │               │                │            │
  │   Success   │               │                │            │
  │◄────────────┤               │                │            │
  │             │               │                │            │

TIMING: <500ms (async triggers for reviews and CaaS)
CRITICAL: Verification prevents fraudulent completion claims
```

### Database Schema Essentials

**Table: `bookings`** (43 columns across 7 functional groups)

**Identity & Relationships** (7 fields):
- `id` (UUID primary key)
- `client_id` (who pays)
- `tutor_id` (who teaches)
- `student_id` (who attends - may equal client_id for adult learners)
- `agent_profile_id` (who referred - lifetime attribution)
- `booking_referrer_id` (wiselist referral attribution - v5.7)
- `listing_id` (source listing - may become NULL if listing deleted)

**Session Details** (4 fields):
- `service_name` (e.g., "GCSE Maths Tutoring")
- `session_start_time` (TIMESTAMPTZ, **nullable** for unscheduled bookings - v6.0)
- `session_duration` (integer minutes)
- `duration_minutes` (v5.9 free help - 30 minutes)

**Pricing** (3 fields):
- `amount` (total cost in GBP)
- `hourly_rate` (snapshot from listing at booking time - v5.8)
- `hours_requested` (decimal, e.g., 1.5 hours)

**Type & Status** (4 fields):
- `type` (paid | free_help - v5.9)
- `booking_type` (direct | referred | agent_job)
- `status` (Pending | Confirmed | Completed | Cancelled | Declined)
- `payment_status` (Pending | Paid | Failed | Refunded)

**Scheduling Fields** (7 fields - v6.0 Migration 219):
- `scheduling_status` (ENUM: unscheduled | proposed | scheduled)
- `proposed_by` (UUID FK to profiles - who proposed current time)
- `proposed_at` (TIMESTAMPTZ - when time was proposed)
- `schedule_confirmed_by` (UUID FK to profiles - who confirmed)
- `schedule_confirmed_at` (TIMESTAMPTZ - when confirmed)
- `slot_reserved_until` (TIMESTAMPTZ - 15-minute reservation expiry)
- `reschedule_count` (INTEGER - max 4, 2 per party)

**Listing Snapshot** (7 fields - v5.8 Migration 104):
- `subjects` (TEXT[] - preserved for filtering/analytics)
- `levels` (TEXT[] - e.g., ["GCSE", "A-Level"])
- `location_type` (online | in_person | hybrid)
- `location_city` (for in-person sessions)
- `free_trial` (boolean flag)
- `listing_slug` (for constructing reference links)
- `available_free_help` (v5.9 - was tutor offering free help?)

**Integration Fields** (5 fields):
- `session_artifacts` (JSONB - whiteboard snapshots, recording URLs)
- `recording_url` (direct Lessonspace recording link)
- `stripe_checkout_id` (idempotency key - v4.9)
- `cancellation_reason` (text)
- `refund_amount` (decimal - partial refund support)

**Timestamps** (3 fields):
- `created_at`
- `updated_at`
- `completed_at`

**Total Columns**: 43 (intentionally denormalized for performance)

---

## Booking Lifecycle

### Scheduling State Machine (v6.0)

The scheduling workflow operates independently of the booking status, tracking the time negotiation process:

```
┌─────────────────────────────────────────────────────────────────┐
│             SCHEDULING STATE MACHINE (v6.0)                      │
│                 (scheduling_status field)                        │
└─────────────────────────────────────────────────────────────────┘

     ┌───────────────┐
     │  unscheduled  │ ← Initial state (booking created without time)
     └───────┬───────┘
             │
             │ Either party proposes time via SchedulingModal
             │ → slot_reserved_until = NOW() + 15 minutes
             ↓
     ┌───────────────┐
     │   proposed    │ ← Time proposed, awaiting confirmation
     └───────┬───────┘
             │
     ┌───────┴────────────────────────┐
     │                                │
     │ Slot expires (15 min)          │ Other party confirms
     │ pg_cron cleanup                │ → Stripe checkout (paid)
     │                                │ → Instant confirm (free)
     ↓                                ↓
┌───────────────┐            ┌───────────────┐
│  unscheduled  │            │   scheduled   │ ← Time confirmed
│   (reset)     │            │               │
└───────────────┘            └───────┬───────┘
                                     │
                                     │ Reschedule requested
                                     │ (if reschedule_count < 4)
                                     ↓
                             ┌───────────────┐
                             │   proposed    │ ← New time proposed
                             │  (reschedule) │
                             └───────────────┘

KEY TRANSITIONS:
  unscheduled → proposed (Time proposed, 15-min slot hold)
  proposed → scheduled (Confirmed + paid/free)
  proposed → unscheduled (Slot expired, pg_cron cleanup)
  scheduled → proposed (Reschedule initiated)

BUSINESS RULES:
  • Minimum 24 hours notice for proposed times
  • Maximum 30 days in advance
  • 15-minute slot reservation expires automatically
  • Maximum 4 reschedules total (2 per party)
  • Platform timezone: Europe/London (UK time)
```

### Booking Status State Machine

**Valid State Transitions**:

```
                         ┌──────────────────────────────┐
                         │   BOOKING LIFECYCLE          │
                         │   State Machine (v6.0)       │
                         └──────────────────────────────┘

                                ┌──────────┐
                                │ Created  │ (Initial state)
                                └─────┬────┘
                                      │
                        ┌─────────────┼─────────────┐
                        │             │             │
                        ↓             ↓             ↓
                  ┌──────────┐  ┌──────────┐  ┌──────────┐
     Paid         │ Pending  │  │Confirmed │  │Confirmed │  Free Help
     Booking ────→│ (Awaiting│  │ (Direct  │←─│(Instant) │←── (v5.9)
     (v6.0:       │ Schedule │  │ via      │  │  No      │
     unscheduled) │+ Payment)│  │ Webhook) │  │ Payment) │
                  └────┬─────┘  └─────┬────┘  └────┬─────┘
                       │              │            │
           ┌───────────┼──────┬───────┘            │
           │           │      │                    │
           ↓           ↓      ↓                    ↓
      ┌─────────┐ ┌─────────┐└───────────┬────────┘
      │Declined │ │Cancelled│            │
      │(Tutor   │ │(Client  │            │
      │ Rejects)│ │ Cancels)│            │
      └─────────┘ └─────────┘            ↓
           │            │           ┌──────────┐
           │            │           │Confirmed │
           │            │           │ (Active) │
           │            │           └────┬─────┘
           │            │                │
           │            │     ┌──────────┼──────────┐
           │            │     │          │          │
           │            ↓     ↓          ↓          ↓
           │      ┌──────────────┐ ┌──────────┐ ┌──────────┐
           │      │  Cancelled   │ │Completed │ │ Declined │
           │      │(After Confirm│ │(Session  │ │ (Tutor)  │
           │      │ with refund) │ │ Occurred)│ └──────────┘
           │      └──────────────┘ └────┬─────┘      │
           │            │               │            │
           ↓            ↓               ↓            ↓
      ┌─────────────────────────────────────────────────┐
      │          TERMINAL STATES                        │
      │  • Completed: Triggers reviews + CaaS           │
      │  • Cancelled: May include refund                │
      │  • Declined:  Full refund processed             │
      └─────────────────────────────────────────────────┘

KEY TRANSITIONS:
  Created → Pending (Paid booking initiated, scheduling_status=unscheduled)
  Created → Confirmed (Free help instant confirmation, scheduling_status=scheduled)
  Pending → Confirmed (Stripe webhook after schedule confirm: payment_status=Paid)
  Pending → Cancelled (Client cancels before paying)
  Pending → Declined (Tutor rejects within 24h)
  Confirmed → Completed (WiseSpace marks session done)
  Confirmed → Cancelled (Late cancellation with refund policy)

PAYMENT STATUS PARALLEL TRACKING:
  Pending → Paid (Webhook confirms)
  Paid → Refunded (Cancellation triggers refund)
```

**Business Rules**:

**Pending State**:
- Booking created but payment not yet confirmed
- Client can cancel without penalty
- Tutor cannot see booking yet (not in their dashboard)
- Listing slot NOT blocked (other clients can book same time)
- Timeout: If payment not received within 24 hours, auto-cancel

**Confirmed State**:
- Payment successfully processed via Stripe webhook
- Both client and tutor see booking in dashboard
- Email confirmations sent to both parties
- Listing slot now blocked (double-booking prevention)
- Cancellation policy enforced (24 hours = full refund, 12 hours = 50%, <12 = no refund)

**Completed State**:
- Session occurred and marked complete via WiseSpace API
- Automatic review session created (trigger fires on status change)
- Payout clearing period begins (7 days)
- Transaction status changes: Tutor "clearing" → "available" after 7 days
- CaaS recalculation queued for tutor (performance bucket updated)

**Cancelled State**:
- Either party cancelled before session occurred
- Refund processed based on cancellation policy
- Transaction records created showing refund amount
- Does NOT trigger review creation
- Does NOT count toward tutor's completed sessions

### Payment Webhook Processing (Critical Path)

**Stripe Event: `checkout.session.completed`**

The webhook handler is the most critical code path in the entire bookings system, processing over $10,000 monthly transaction volume. It must be idempotent (handle duplicate webhook deliveries), atomic (all-or-nothing transaction integrity), and fast (Stripe requires response within 30 seconds or marks webhook failed).

**Processing Steps**:

**Step 1: Signature Verification**
- Verify webhook signature using `STRIPE_WEBHOOK_SECRET`
- Reject if signature invalid (prevents replay attacks)
- Log rejection to `failed_webhooks` table for investigation

**Step 2: Idempotency Check**
- Extract `stripe_checkout_id` from event metadata
- Query bookings table for existing record with this checkout ID
- If found, return 200 immediately (already processed)
- This prevents double-charging or duplicate commission payments

**Step 3: Extract Metadata**
- Booking ID (primary identifier)
- Client ID (for transaction record)
- Tutor ID (for transaction record)
- Agent ID (optional - for commission calculation)
- Wiselist Referrer ID (optional - v5.7 attribution)

**Step 4: Call Atomic RPC**
- Execute `handle_successful_payment(booking_id, stripe_checkout_id)`
- RPC runs in single database transaction (all-or-nothing)
- If RPC fails, webhook returns 500 (Stripe will retry up to 3 times)

**Step 5: Wiselist Attribution** (v5.7)
- If `wiselist_referrer_id` present in metadata, update booking record
- This enables commission calculation for shared wiselist conversions
- Executed outside main RPC to avoid blocking transaction on attribution

**Step 6: Response**
- Return 200 status with `{received: true}` JSON body
- Stripe marks webhook as successfully delivered
- If any step fails, return 500 and webhook enters retry queue

**Why This Design?**: Separating validation (Steps 1-3) from processing (Step 4) allows early exits for invalid requests without blocking database connections. Using RPC for core transaction logic pushes complexity to database layer where ACID guarantees are strongest. Running wiselist attribution outside main transaction accepts eventual consistency for non-critical feature rather than risking main payment flow.

### RPC Function: `handle_successful_payment()` (Migration 030, 048, 060, 109)

This PostgreSQL function is the financial brain of the bookings system, calculating commission splits and creating transaction records in a single atomic operation. It has evolved through 4 major versions as business logic expanded.

**Function Signature**:
```
handle_successful_payment(
  p_booking_id UUID,
  p_stripe_checkout_id TEXT
) RETURNS VOID
```

**Internal Logic Flow**:

**Phase 1: Idempotency Guard**
- Check if booking already has `stripe_checkout_id` set
- If yes, RETURN immediately (duplicate webhook delivery)
- This is critical safety valve preventing double-charging

**Phase 2: Context Fetching**
- SELECT booking record with client, tutor, agent details
- Calculate clearing timestamp: `session_start_time + 7 days`
- This 7-day hold protects platform against disputes and refunds

**Phase 3: Commission Calculation**
- IF agent exists: Platform 10%, Agent 10%, Tutor 80%
- IF no agent: Platform 10%, Tutor 90%
- Formula: `tutor_payout = amount * (agent ? 0.80 : 0.90)`

**Phase 4: Transaction Creation** (4 records)

**Transaction 1 - Client Debit**:
- Amount: Negative total cost (e.g., -£50.00)
- Status: "paid_out" (money left client's account)
- Available: NOW (already debited)

**Transaction 2 - Platform Fee**:
- Amount: 10% of total (e.g., £5.00)
- Profile ID: NULL (platform revenue)
- Status: "paid_out" (collected immediately)
- Available: NOW (immediate revenue recognition)

**Transaction 3 - Agent Commission** (conditional):
- Amount: 10% of total (e.g., £5.00)
- Status: "clearing" (pending dispute window)
- Available: session_start + 7 days
- Only created if `agent_profile_id IS NOT NULL`

**Transaction 4 - Tutor Payout**:
- Amount: 80% or 90% of total (e.g., £40 or £45)
- Status: "clearing" (pending dispute window)
- Available: session_start + 7 days
- Tutor can see but cannot withdraw until clearing period ends

**Phase 5: Booking Update**
- Set `payment_status = 'Paid'`
- Set `status = 'Confirmed'`
- Set `stripe_checkout_id = p_stripe_checkout_id` (idempotency marker)

**Phase 6: Referral Conversion** (first booking only)
- IF this is client's first booking, update referrals table
- Set `status = 'Converted'`, `booking_id`, `converted_at = NOW()`
- This powers agent referral dashboard metrics

**Error Handling**: If ANY step fails, entire transaction rolls back. No partial updates possible. Client's payment will succeed in Stripe but booking remains in "Pending" state, allowing manual recovery via admin dashboard.

---

## Critical Design Decisions

### Decision 1: Listing Snapshot Mechanism (v5.8)

**Problem**: When listings are edited or deleted after booking creation, booking records lost critical context. Client sees "Booking for [deleted listing]" with no subject, level, or pricing information. Reviews couldn't display session context. Analytics queries required expensive JOINs to listings table. Audit trail incomplete if tutor changes hourly rate retroactively.

**Solution**: Snapshot 7 critical listing fields directly into bookings table at creation time. These fields become immutable booking properties, decoupled from listing lifecycle.

**Snapshotted Fields**:
1. `subjects` (TEXT[]) - For subject-based filtering and avatar colors
2. `levels` (TEXT[]) - For analytics and review context
3. `location_type` - Historical record of delivery method
4. `location_city` - Required for in-person session records
5. `hourly_rate` - Pricing at booking time (prevents retroactive changes)
6. `listing_slug` - Reference link construction
7. `free_trial` - Business logic flag (was this a trial session?)

**Why These 7?**: Analyzed 6 months of booking queries and identified fields accessed in >80% of reads. Subject and level needed for UI rendering (no joins). Hourly rate required for financial audit. Location fields legally required for tax reporting. Slug enables "View Original Listing" links even if listing unpublished.

**Trade-offs**:
- **Pro**: Query performance improved 3x (no JOIN needed)
- **Pro**: Complete historical accuracy guaranteed
- **Pro**: Listing deletion doesn't break booking records
- **Con**: Database storage increased 15% (acceptable for reliability)
- **Con**: Schema migration risk (backfilled 800+ existing bookings)

**Implementation**: Migration 104 added columns with NULL default, then backfilled from listings table where listing_id still valid. For orphaned bookings (listing deleted pre-migration), fields remain NULL with fallback UI messaging.

### Decision 2: Free Help Instant Confirmation (v5.9)

**Problem**: Traditional booking flow requires 7 steps (listing select → date pick → payment → webhook → confirmation), taking 45-90 seconds average. For free educational access mission, this friction was unacceptable. Students needing urgent help abandoned flow at 40% rate during payment screen despite no payment required.

**Solution**: Create dedicated "free_help" booking type that bypasses payment entirely, confirming booking instantly and generating video link in single API call.

**Key Simplifications**:
- Set `amount = 0` and `payment_status = 'Paid'` immediately (skip Stripe)
- Set `status = 'Confirmed'` on creation (no webhook wait)
- Generate Google Meet link via meet.new API (instant video room)
- Fixed duration: 30 minutes (no user choice needed)
- Rate limit: 5 sessions per 7 days per student (abuse prevention)

**Why Not Separate Feature?**: Initially considered building parallel "instant tutoring" system, but realized 95% of booking logic (status tracking, review triggering, CaaS updates, completion flow) should be identical. Adding `type` field and conditional payment logic kept codebase DRY while enabling mission-critical feature.

**Business Impact**: Free help completion rate improved from 60% (old flow) to 92% (instant flow). Average time-to-session dropped from 45 seconds to 3 seconds. Tutor participation increased 35% due to simpler workflow. Students requesting free help converted to paid bookings at 18% rate within 30 days (acquisition funnel).

**Trade-offs**:
- **Pro**: Massive UX improvement for free help use case
- **Pro**: Code reuse (shared status tracking, completion, reviews)
- **Con**: Payment logic now has conditionals (if type === 'free_help')
- **Con**: Webhook handler must skip free help bookings
- **Con**: Financial queries must exclude free help (WHERE amount > 0)

### Decision 3: 7-Day Payout Clearing Period

**Problem**: Instant payouts create three business risks: (1) Client disputes/refunds after tutor already withdrawn funds → platform covers cost, (2) Fraudulent tutors could create fake bookings and withdraw immediately, (3) Session quality issues discovered post-session (client marks incomplete) but tutor already paid.

**Solution**: Hold tutor and agent commissions in "clearing" status for 7 days after session start time. During clearing, funds visible in dashboard but not withdrawable. After 7 days, status changes to "available" and payout can be requested.

**Why 7 Days?**: Benchmarked against industry standards: Stripe holds 2 days, Airbnb holds 24 hours after check-in, Upwork holds 10 days. Chose 7 days as balance between platform risk protection and tutor cash flow expectations. Analysis showed 95% of disputes filed within 72 hours, so 7 days provides comfortable buffer.

**Exception**: Platform fee (10%) is NOT held in clearing. Platform collects fee immediately as "paid_out" status since platform takes risk of refunds. This is standard marketplace economics.

**Client Experience**: Client charged immediately at booking confirmation. This is optimal for clients (pay upfront, no surprises) and protects platform from payment failures mid-session.

### Decision 4: Atomic RPC for Payment Processing

**Problem**: Early versions (v3.x) handled payment webhook with sequential API calls: (1) update booking status, (2) create client transaction, (3) create tutor transaction, (4) create agent transaction, (5) update referrals. If step 3 failed due to network error, database showed inconsistent state (client charged but tutor not paid). Manual reconciliation required.

**Solution**: Move all payment logic into single PostgreSQL function executed as atomic transaction. Either all steps succeed (booking updated, all transactions created, referrals updated) or all steps fail (complete rollback).

**Why RPC Instead of Application Code?**: PostgreSQL guarantees ACID properties. If function throws error mid-execution, database automatically rolls back ALL changes. This is impossible to achieve with sequential API calls where network failures or crashes leave partial state. Additionally, RPC executes 10x faster by eliminating network round-trips between application and database.

**Trade-offs**:
- **Pro**: Financial integrity guaranteed (no partial states)
- **Pro**: Performance improved (single database round-trip)
- **Con**: Business logic in SQL harder to test than TypeScript
- **Con**: Deployment requires migration (can't hotfix without database change)
- **Mitigation**: Comprehensive SQL unit tests in migration files

### Decision 5: Optimistic UI Updates with React Query

**Problem**: Traditional booking confirmation requires waiting for server response (300-500ms), then waiting for payment webhook (2-5 seconds), then polling for status update. Total perceived latency: 5-8 seconds of loading spinner, creating anxiety.

**Solution**: React Query optimistic updates immediately show booking as "Confirmed" in UI while backend processes payment asynchronously. If backend fails, optimistic update rolls back with error message.

**Implementation Pattern**:
```
onMutate: Update cache immediately (booking shows as Confirmed)
onSuccess: Backend confirms → do nothing (already showing correct state)
onError: Backend failed → rollback cache, show error toast
onSettled: Invalidate query (refetch fresh data regardless of success/error)
```

**Why This Works**: Payment success rate is 99.7%, so optimistic assumption is correct >99% of time. For rare failures, rollback provides clear error explanation ("Payment declined - please try different card"). User experience is instant feedback with graceful error handling rather than universal slow loading.

**Trade-offs**:
- **Pro**: Perceived latency reduced from 5-8s to instant (<100ms)
- **Pro**: Users can navigate away immediately (no spinner blocking)
- **Con**: Rare failure case requires "undo" rollback in UI
- **Con**: Complex query invalidation logic (must invalidate related queries)

---

## System Integrations

### Integration 1: Listings (Source Data + Snapshots)

**Direction**: Bookings reads from Listings
**Coupling**: Strong (cannot create booking without valid listing)

**How It Works**: At booking creation, system fetches listing record to validate availability and extract pricing. Instead of storing only `listing_id` foreign key, system snapshots 7 critical fields into booking record itself. This denormalization trades storage space for query performance and historical accuracy.

**Critical Fields Read**:
- `title` → `service_name` (displayed in booking card)
- `hourly_rate` → `hourly_rate` (immutable price)
- `subjects` → `subjects` (for filtering and avatars)
- `levels` → `levels` (for analytics)
- `location_type` → `location_type` (online/in-person/hybrid)
- `slug` → `listing_slug` (reference links)
- `available_free_help` → `available_free_help` (v5.9 flag)

**Validation Rules**:
- Listing `status` must equal "published" (reject drafts)
- Listing `profile_id` must NOT equal requesting client_id (cannot book own listing)
- If `available_free_help = false`, reject free_help booking type

**RPC Trigger**: After booking creation, call `increment_listing_booking_count(listing_id)` to update listing analytics. This powers "X bookings completed" badge on marketplace cards.

### Integration 2: Payments (Stripe Checkout + Webhooks)

**Direction**: Bidirectional (Bookings → Stripe → Bookings)
**Coupling**: Critical (paid bookings impossible without Stripe)

**Outbound: Checkout Session Creation**
- Bookings API creates Stripe Checkout session with booking metadata
- Line item shows: `"Tutoring Session - {service_name}"`
- Unit amount: `Math.round(total_cost * 100)` (convert GBP to pence)
- Success URL: `/bookings?payment=success`
- Cancel URL: `/bookings?payment=cancel`

**Inbound: Webhook Processing**
- Stripe fires `checkout.session.completed` event
- Webhook extracts `booking_id` from session metadata
- Calls `handle_successful_payment()` RPC function
- On success: Booking status → Confirmed
- On failure: Log to `failed_webhooks` table for manual retry

**Idempotency**: `stripe_checkout_id` field prevents duplicate processing. Webhook handler checks if booking already has this ID before calling RPC. Critical for handling webhook retries (Stripe retries failed webhooks up to 3 times with exponential backoff).

### Integration 3: Reviews (Automatic Session Creation)

**Direction**: Bookings triggers Reviews
**Coupling**: Medium (trigger-based, async)

**How It Works**: Database trigger `on_booking_completed_create_review` fires when booking status changes to "Completed". Trigger function inserts record into `booking_review_sessions` table with 7-day deadline for review submission.

**Trigger Logic**:
```
WHEN (NEW.status = 'Completed' AND NEW.payment_status = 'Confirmed')
```

**Review Session Fields**:
- `booking_id` (foreign key)
- `participant_ids` (array: [client, tutor, agent if exists])
- `deadline` (NOW + 7 days)
- `publish_at` (NOW + 7 days - auto-publish if not submitted)
- `status` (pending)

**Snapshot Fields** (v5.8 Migration 105):
Reviews also snapshot booking context to avoid JOIN dependencies:
- `service_name` (displayed in review form)
- `subjects` (for subject-specific feedback)
- `levels` (for level-specific feedback)
- `session_date` (timestamp reference)
- `location_type` (online vs in-person context)

**Why Automatic?**: Manual review requests had 25% completion rate. Automatic triggering increased completion to 62% by reducing friction and setting clear deadline expectations.

### Integration 4: CaaS (Score Recalculation Queue)

**Direction**: Bookings triggers CaaS
**Coupling**: Low (async queue, eventual consistency)

**How It Works**: Three database triggers insert tutor_id into `caas_recalculation_queue` table when booking events affect credibility scoring:

**Trigger 1: Booking Completion**
```
WHEN (OLD.status != 'Completed' AND NEW.status = 'Completed')
INSERT INTO caas_queue (profile_id, priority, triggered_by)
VALUES (NEW.tutor_id, 'normal', 'booking_completion')
```

**Impact on CaaS**:
- **Bucket 1 (Performance)**: `completed_sessions` count increases
- **Bucket 1 (Performance)**: `retention_rate` recalculated if repeat client

**Trigger 2: Recording URL Added**
```
WHEN (OLD.recording_url IS NULL AND NEW.recording_url IS NOT NULL)
INSERT INTO caas_queue (profile_id, priority, triggered_by)
VALUES (NEW.tutor_id, 'normal', 'recording_added')
```

**Impact on CaaS**:
- **Bucket 5 (Digital Professionalism)**: Virtual classroom usage rate updated

**Trigger 3: Free Help Completion** (v5.9)
```
WHEN (NEW.type = 'free_help' AND NEW.status = 'Completed')
INSERT INTO caas_queue (profile_id, priority, triggered_by)
VALUES (NEW.tutor_id, 'high', 'free_help_completion')
```

**Impact on CaaS**:
- **Bucket 6 (Social Impact)**: Delivery bonus increases (1 point per session, max 5)
- **Priority**: "high" (processes within 10 minutes vs 30 minutes for normal)

**Why Queue Instead of Synchronous?**: CaaS calculation involves 3 RPC calls and takes 300-800ms. Running synchronously would block booking completion endpoint. Queue decouples systems and allows CaaS to process scores in batches during off-peak hours.

### Integration 5: WiseSpace (Virtual Classroom)

**Direction**: Bidirectional (Bookings → WiseSpace → Bookings)
**Coupling**: Medium (session delivery requires WiseSpace, but booking creation doesn't)

**Outbound: Session Creation**
- When booking confirmed, system calls WiseSpace API to create virtual classroom
- WiseSpace returns `room_url` for session join link
- URL stored in booking record or transmitted via email

**Inbound: Session Completion**
- WiseSpace calls `/api/wisespace/[bookingId]/complete` when session ends
- Endpoint verifies WiseSpace session actually occurred (anti-fraud)
- Updates booking: `status = 'Completed'`, `completed_at = NOW()`

**Inbound: Whiteboard Snapshots**
- During session, WiseSpace calls `/api/wisespace/[bookingId]/snapshot`
- Endpoint uploads whiteboard PNG to Supabase Storage
- Stores public URL in `session_artifacts` JSONB field
- Format: `{whiteboard_snapshot_url: "https://...", recording_url: "https://..."}`

**Why Verification?**: Early versions trusted client-side "Mark Complete" button, leading to fraud where fake sessions marked complete to trigger payouts. Now requires server-side verification that WiseSpace room actually existed and had activity.

### Integration 6: Referrals (Attribution + Conversion)

**Direction**: Bookings reads Referrals (at creation) and writes Referrals (at payment)
**Coupling**: Medium (referrals optional feature)

**At Booking Creation**:
- Fetch client profile's `referred_by_agent_id` field
- Copy value to booking's `agent_profile_id` (lifetime attribution)
- This ensures agent gets credit even if client later removes agent relationship

**At Payment Success**:
- RPC `handle_successful_payment()` checks if client has referral record
- Query: `SELECT * FROM referrals WHERE referred_profile_id = client_id AND status = 'Signed Up'`
- If found, update: `status = 'Converted', booking_id = booking_id, converted_at = NOW()`
- This marks referral's first conversion (agent dashboard KPI)

**Why Lifetime Attribution?**: Agents invest in recruiting clients (outreach, vetting, onboarding). Platform guarantees agents receive commission on ALL future bookings from referred clients, not just first booking. This creates sustainable agent business model rather than one-time bounty.

**Commission Calculation**: Referring agent receives 10% of every booking from referred client (perpetual lifetime attribution). Tutor receives 80% instead of 90%. Platform still receives 10%. Math: Client pays £100 → Platform £10, Referral Agent £10, Tutor £80.

Note: This is different from agent-led bookings where `agent_profile_id` is explicitly set (20% agent commission, 70% tutor, 10% platform). Referral commission rewards passive client recruitment, while agent commission rewards active tutor-client matching.

### Integration 7: Wiselist (In-Network Attribution - v5.7)

**Direction**: Bookings reads Wiselist (via cookie)
**Coupling**: Low (optional attribution feature)

**How It Works**:
1. User visits shared wiselist: `/w/{slug}`
2. Middleware sets cookie: `wiselist_referrer_id` (30-day expiry)
3. User browses marketplace, books tutor
4. Checkout session includes cookie value in metadata
5. Payment webhook saves to booking: `booking_referrer_id = wiselist_referrer_id`

**Current Use**: Attribution tracking for analytics purposes. This data helps measure the effectiveness of wiselist sharing and understand which marketing channels drive conversions.

**Why Cookie vs Database?**: Attribution must persist across anonymous browsing before user creates account. Cookie allows tracking pre-signup, then associates with booking post-signup. 30-day window matches industry standard (Amazon, Booking.com).

---

## Security & Performance

### Security Considerations

**Payment Webhook Security**:
- Verify Stripe signature using webhook secret (prevents replay attacks)
- Idempotency check via `stripe_checkout_id` (prevents double-charging)
- Rate limiting on webhook endpoint (10 requests/second max)
- Log all failures to `failed_webhooks` table (audit trail)

**Booking Permission Checks**:
- RLS policy: Users can only view bookings where they are client, tutor, student, or agent
- Create policy: Only authenticated users can create bookings as client
- Update policy: Only client or tutor can cancel their own bookings
- Admin override: Service role can view/modify all bookings (support)

**Free Help Abuse Prevention** (v5.9):
- Rate limit: 5 free sessions per 7 days per student (enforced in API)
- Online verification: Tutor must have Redis heartbeat <5 minutes old
- Session cap: 30 minutes fixed (cannot request longer)
- Account age: Student account must be >7 days old (prevents throwaway accounts)

**Cancellation Policy Enforcement**:
- 24+ hours notice: Full refund (100%)
- 12-24 hours notice: Partial refund (50%)
- <12 hours notice: No refund (0%)
- Tutor cancellation: Always full refund (penalize tutor, not client)

### Performance Optimizations

**Database Indexes**:
- `idx_bookings_client_id` (B-tree) - Client dashboard queries
- `idx_bookings_tutor_id` (B-tree) - Tutor dashboard queries
- `idx_bookings_status` (B-tree) - Status filtering
- `idx_bookings_payment_status` (B-tree) - Financial queries
- `idx_bookings_session_start_time` (B-tree) - Date range filtering
- `idx_bookings_type` (B-tree) - Free help filtering (v5.9)

**Query Performance**:
- Listing snapshot eliminates JOIN (3x faster queries)
- React Query caching (5-minute stale time, reduces API calls 80%)
- Optimistic updates (instant perceived latency)
- Database connection pooling (Supabase Pooler, 100 concurrent)

**Webhook Processing**:
- Async processing (RPC runs in background, webhook returns 200 immediately)
- Batch transaction inserts (single INSERT for 4 transactions vs 4 separate)
- Prepared statement caching (PostgreSQL query plan reuse)
- Average webhook processing: 150-300ms (well under Stripe's 30s timeout)

**Monitoring Metrics**:
- Booking creation latency: p50 800ms, p95 2.1s, p99 4.8s
- Webhook processing latency: p50 180ms, p95 450ms, p99 1.2s
- Payment success rate: 99.7% (failures due to declined cards, not system errors)
- Review completion rate: 62% (vs 25% industry average)

---

## Future Roadmap

### v6.1: Recurring Bookings (Q2 2026)

**Problem**: Clients booking weekly tutoring sessions must manually rebook each week. 40% churn rate between session 3 and 4 due to rebooking friction.

**Solution**: Allow "Subscribe to Weekly Sessions" with single upfront payment for 4-week block. System auto-creates 4 bookings with sequential dates.

**Schema Changes**:
- Add `is_recurring` boolean
- Add `recurrence_pattern` (weekly | biweekly | monthly)
- Add `parent_booking_id` (links child bookings to parent)
- Add `recurrence_end_date` (subscription end)

**Payment Model**: Charge upfront for entire block (e.g., £200 for 4 weekly sessions). If client cancels mid-block, refund unattended sessions prorated.

### v6.2: Multi-Student Group Bookings

**Problem**: Tutors offering group sessions (1 tutor, 3 students) cannot model this in current booking schema. Each student must book separately, creating 3 separate bookings for same session.

**Solution**: Allow "primary" booking with `group_booking_id` field. Additional students join via "Add to Group Booking" flow. All students charged, but single session delivered.

**Schema Changes**:
- Add `group_booking_id` (foreign key to primary booking)
- Add `group_size` (max students allowed)
- Add `group_members` (JSONB array of student_ids)

### v6.3: Installment Payments (High-Value Bookings)

**Problem**: Intensive tutoring packages (20+ hours, £500+) require large upfront payment. Blocks 35% of potential high-value bookings due to cash flow constraints.

**Solution**: Stripe installment support. Client pays 30% upfront, 70% split across 3 monthly installments. Bookings only confirmed when each installment paid.

**Business Risk**: Must hold tutor payout until final installment received (prevents scenario where client pays 30%, receives 10 hours tutoring, then defaults on remaining 70%).

### v6.4: Calendar Sync Integration

**Problem**: Tutors manage availability across multiple platforms (Google Calendar, Outlook, iCal). Double-booking risk when tutor accepts session on TutorWise but has conflicting event in personal calendar.

**Solution**: Two-way calendar sync that reads tutor's external calendar to block conflicting slots and writes confirmed TutorWise bookings to external calendar.

**Implementation**:
- Google Calendar API integration for availability checking
- Outlook/Microsoft 365 support via Microsoft Graph API
- iCal feed subscription for read-only availability import
- Automatic event creation on booking confirmation

### v6.5: Cancellation & Refund Policy Implementation (Q2 2026)

**Problem**: Current system allows cancellations but lacks formal refund policy enforcement. No clear rules for when clients/tutors can cancel and what refund they receive.

**Solution**: Implement time-based cancellation policy with automated refund processing:
- **24+ hours before session**: Full refund (100%) - no penalty
- **12-24 hours before session**: Partial refund (50%) - shared penalty
- **<12 hours before session**: No refund (0%) - tutor protected
- **No-show**: No refund, session marked completed, tutor paid in full

**Schema Changes**:
- Add `cancellation_reason` (text field for audit trail)
- Add `cancellation_policy_applied` (which policy tier was used)
- Add `refund_amount` (calculated refund based on policy)
- Add `refund_processed_at` (timestamp of Stripe refund)

**Implementation**:
- Automatic refund calculation based on time_until_session
- Stripe refund API integration
- Email notifications to both parties with policy explanation
- Admin override capability for exceptional circumstances

### v6.6: No-Show Handling System (Q2 2026)

**Problem**: When either party doesn't attend a confirmed session, there's no formal process to report no-shows, resolve disputes, or apply penalties.

**Solution**: Add no-show reporting workflow with dispute resolution:

**Features**:
- Either party can report no-show within 24 hours of session time
- Counter-party has 48 hours to respond/dispute
- If undisputed: automatic penalty application
  - **Tutor no-show**: Full refund to client + CaaS score penalty
  - **Client no-show**: Full payment to tutor + warning to client
- If disputed: Flag for admin review with evidence submission

**Schema Changes**:
- Add `no_show_reported_by` (client_id | tutor_id)
- Add `no_show_reported_at` (timestamp)
- Add `no_show_disputed` (boolean)
- Add `no_show_resolution` (confirmed | disputed | admin_override)
- Store in `session_artifacts` JSONB field

**Implementation**:
- New API endpoint: `POST /api/bookings/[id]/no-show`
- 24-hour reporting window enforced
- Email notifications with evidence upload capability
- Admin dashboard for dispute review

### v6.7: Event History Tracking (Q2 2026)

**Problem**: No audit trail of booking state changes. Cannot answer "Why was this booking cancelled?" or "Who rescheduled this session?"

**Solution**: Comprehensive event sourcing for all booking lifecycle events.

**Events to Track**:
- `booking.created` - Initial booking creation
- `booking.time_proposed` - Either party proposes session time
- `booking.time_confirmed` - Other party confirms proposed time
- `booking.rescheduled` - Session time changed (with who initiated)
- `booking.payment_completed` - Stripe payment succeeded
- `booking.payment_failed` - Stripe payment failed (with reason)
- `booking.confirmed` - Booking fully confirmed (paid + scheduled)
- `booking.cancelled` - Cancellation (with who initiated + reason)
- `booking.completed` - Session marked complete
- `booking.reviewed` - Review submitted (by client or tutor)
- `booking.no_show_reported` - No-show claim filed

**Schema Changes**:
- New table: `booking_events`
  - `id` (PK)
  - `booking_id` (FK)
  - `event_type` (enum of events above)
  - `actor_id` (who triggered this event)
  - `metadata` (JSONB - event-specific data)
  - `created_at` (timestamp)

**Implementation**:
- Event emitter function in all booking mutation endpoints
- Chronological event timeline in booking detail modals
- Queryable for analytics and reporting

### v6.8: Booking Analytics & Reporting Views (Q2 2026)

**Problem**: No visibility into booking performance metrics. Cannot answer business questions like "What's our conversion rate?" or "Which tutors have highest no-show rates?"

**Solution**: Build comprehensive analytics views and dashboards.

**Key Metrics to Track**:

**Conversion Funnel**:
- Listing views → Booking requests → Payment completed → Session delivered
- Conversion rate by listing type, subject, price point
- Drop-off points in booking flow

**Operational Metrics**:
- Average time from booking to session delivery
- Cancellation rate (by timing: <12h, 12-24h, 24h+)
- No-show rate (client vs tutor)
- Reschedule frequency (by booking)

**Financial Metrics**:
- Revenue by booking type (direct, referred, agent-led)
- Average booking value by subject, level, tutor
- Commission splits (platform, agent, tutor)
- Refund volume and reasons

**User Behavior**:
- Repeat booking rate (client retention)
- Tutor utilization rate (sessions delivered / capacity)
- Popular booking times (day of week, time of day)

**Implementation**:
- New table: `booking_analytics` (materialized view, refreshed daily)
- Admin dashboard with filterable charts (D3.js or Chart.js)
- CSV export for detailed analysis
- Real-time metrics for platform health monitoring

---

---

**Document Version**: v6.0
**Last Reviewed**: 2026-02-05
**Next Review**: 2026-03-05 (Post-Scheduling Launch)
**Maintained By**: Backend Team + Payments Team
**Feedback**: backend@tutorwise.com
