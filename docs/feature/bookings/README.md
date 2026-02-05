# Bookings

**Status**: ✅ Active (v6.0 - 5-Stage Scheduling Workflow)
**Last Updated**: 2026-02-05
**Last Code Update**: 2026-02-05
**Priority**: Critical (Tier 1 - Core Transaction Infrastructure)
**Architecture**: Gold Standard Hub + Event-Driven Transactions + Listing Snapshots + Scheduling State Machine
**Business Model**: Commission-based (10% platform fee, 10-20% commission splits based on referral/agent type)

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2026-02-05 | v6.0 | **5-Stage Scheduling Workflow**: Discover > Book > Schedule > Pay > Review. New scheduling_status enum, propose/confirm/reschedule APIs, 15-min slot reservation, pg_cron cleanup |
| 2025-12-15 | v5.9 docs | **Documentation v2**: Created solution-design-v2, prompt-v2 following CaaS pattern |
| 2025-12-12 | v5.9 | **Free Help Support**: Added free_help booking type, instant confirmation flow, 30-minute sessions |
| 2025-12-08 | v5.8 | **Listing Snapshots**: Preserved 7 critical listing fields in bookings for historical accuracy |
| 2025-11-20 | v5.7 | **Wiselist Attribution**: Cookie-based referral tracking for in-network conversions |
| 2025-11-01 | v5.0 | **3-Party Bookings**: Guardian/student/tutor support via student_id field |
| 2025-10-15 | v4.9 | **Payment Webhook v4**: Commission split logic (90/10, 80/10/10 referral, or 70/20/10 agent-led) |

---

## Quick Links

- [Solution Design v2](./bookings-solution-design-v2.md) - Architecture, business context, critical design decisions
- [AI Prompt Context v2](./bookings-prompt-v2.md) - AI assistant constraints, patterns, gotchas
- [Implementation Guide v2](./bookings-implementation-v2.md) - Developer guide with code examples *(coming soon)*

---

## Overview

The **Bookings** system is TutorWise's core transaction orchestration engine managing the complete tutoring session lifecycle through a **5-stage workflow**: Discover > Book > Schedule > Pay > Review. The system processes 200+ monthly bookings across three booking types (paid direct, agent-referred, free help) with 99.7% payment success rate and sub-5-second booking creation.

### 5-Stage Booking Workflow (v6.0)

| Stage | Description | Status |
|-------|-------------|--------|
| **1. Discover** | Client browses marketplace, finds tutor listing | Pre-booking |
| **2. Book** | Client creates booking (status: Pending, scheduling_status: unscheduled) | Booking created |
| **3. Schedule** | Tutor/client propose and confirm session time (15-min slot reservation) | Time confirmed |
| **4. Pay** | Client pays via Stripe checkout (combined with schedule confirmation) | Payment complete |
| **5. Review** | Session occurs, both parties submit reviews | Booking complete |

**Key Innovation (v6.0)**: Payment is combined with scheduling confirmation. When one party proposes a time and the other confirms, Stripe checkout is triggered immediately. For free sessions, confirmation is instant with no payment step.

### Why Bookings Matter

**For Clients** (Students/Parents):
- Transparent pricing with upfront total cost calculation
- Secure payment via Stripe with buyer protection
- Complete booking history with session artifacts
- Free help access via instant 30-minute sessions

**For Tutors**:
- Automated payout calculation with 7-day clearing period
- Commission transparency showing exact take-home amount
- WiseSpace integration for seamless session delivery
- CaaS score boost from completed sessions and free help delivery

**For Agents** (Tutor Networks):
- Lifetime attribution to referred clients (10% referral commission on all their bookings)
- Active matching commission (20% on agent-led bookings where agent explicitly assigns tutor)
- Dashboard showing referral pipeline and conversion rates

**For Platform**:
- 10% platform fee on all paid transactions
- Drives marketplace liquidity (bookings → reviews → better search)
- Free help sessions support social mission while building tutor reputation

---

## Key Features

### Core Capabilities

**5-Stage Scheduling Workflow** (v6.0):
- **Propose/Confirm Flow**: Either party can propose a time, other party confirms
- **15-Minute Slot Reservation**: Prevents double-booking while awaiting confirmation
- **Pay at Confirmation**: Stripe checkout triggered when scheduling confirmed (not after)
- **Reschedule Support**: Maximum 4 reschedules (2 per party) with audit logging
- **Automatic Cleanup**: Supabase pg_cron job expires stale reservations every 5 minutes

**Three Booking Paths**:
1. **Paid Direct** - Standard flow with Stripe checkout and webhook confirmation (90/10 tutor/platform split)
2. **Agent-Referred** - Client has referring agent, receives 10% lifetime commission (80/10/10 tutor/referral/platform split)
3. **Agent-Led** - Agent actively assigns tutor to client, receives 20% commission (70/20/10 tutor/agent/platform split)
4. **Free Help** (v5.9) - Instant confirmation, zero payment, 30-minute sessions

**Transaction Integrity**:
- Atomic payment processing via PostgreSQL RPC functions
- Idempotency guarantees preventing double-charging
- Dynamic commission splits: 90/10 (direct), 80/10/10 (referral), or 70/20/10 (agent-led)
- 7-day payout clearing period for dispute protection

**Listing Snapshot Mechanism** (v5.8):
- Preserves 7 critical fields at booking creation
- Maintains historical accuracy if listing edited/deleted
- Eliminates expensive JOINs (3x query performance improvement)
- Fields: subjects, levels, location_type, hourly_rate, listing_slug, available_free_help, location_city

**Optimistic UI Updates**:
- React Query optimistic mutations
- Instant perceived latency (<100ms)
- Graceful rollback on errors
- 99.7% payment success rate validates optimistic approach

**Event-Driven Integrations**:
- Reviews: Auto-creates review sessions on completion
- CaaS: Triggers score recalculation for tutor performance
- WiseSpace: Verifies session completion before marking complete
- Referrals: Tracks first conversion for referred clients

---

## Implementation Status

### ✅ Completed (v6.0)

**Phase 1: 5-Stage Scheduling Workflow (2026-02-05)**
- ✅ Migration 219: Added scheduling_status enum ('unscheduled' | 'proposed' | 'scheduled')
- ✅ Migration 219: Added 7 scheduling columns (proposed_by, proposed_at, slot_reserved_until, etc.)
- ✅ Migration 219: Made session_start_time nullable for unscheduled bookings
- ✅ Migration 220: Supabase pg_cron job for expired slot cleanup (runs every 5 minutes)
- ✅ API: POST /api/bookings/[id]/schedule/propose - Propose session time
- ✅ API: POST /api/bookings/[id]/schedule/confirm - Confirm proposed time (triggers Stripe for paid)
- ✅ API: POST /api/bookings/[id]/schedule/reschedule - Reschedule confirmed booking
- ✅ UI: SchedulingModal component with date/time picker
- ✅ UI: BookingCard updated with scheduling status and Messages button
- ✅ Stripe webhook updated to handle scheduling_confirmed metadata
- ✅ Scheduling rules engine (24h minimum notice, 30-day max advance, 15-min slot hold)

**Phase 2: Free Help Support (2025-12-12)**
- ✅ Migration 108: Added `type` column (paid | free_help)
- ✅ Instant confirmation flow bypassing payment
- ✅ Rate limiting (5 sessions per 7 days per student)
- ✅ Account age check (7+ days required)
- ✅ 30-minute fixed duration
- ✅ Google Meet link generation

**Phase 3: Listing Snapshots (2025-12-08)**
- ✅ Migration 104: Added 7 snapshot columns
- ✅ Booking creation snapshots listing fields
- ✅ UI handles NULL listing_id gracefully
- ✅ Query performance improved 3x

**Previous Releases**:
- ✅ v5.9 docs (2025-12-15): Documentation v2 following CaaS pattern
- ✅ v5.7 (2025-11-20): Wiselist attribution via cookies
- ✅ v5.0 (2025-11-01): 3-party bookings (guardian/student/tutor)
- ✅ v4.9 (2025-10-15): Atomic payment webhook with commission splits
- ✅ v4.0 (2025-09-20): Initial release with Stripe + WiseSpace

### 🔄 In Progress

- 🔄 Email notification templates for scheduling events
- 🔄 Messages integration for booking chat
- 🔄 Admin dashboard scheduling filters
- 🔄 Booking analytics and reporting

### 📋 Future Enhancements (Post v6.0)

- Recurring bookings (subscribe to weekly sessions)
- Multi-student group bookings (1 tutor, 3+ students)
- Installment payments for high-value packages (£500+)
- Calendar sync (Google Calendar, Outlook integration)

---

## Architecture Highlights

### Database Schema

**Table: `bookings`** (43 columns across 7 functional groups)

**Core Fields**: id, client_id, tutor_id, student_id, listing_id, agent_profile_id, booking_referrer_id

**Session Details**: service_name, session_start_time (nullable), session_duration, duration_minutes

**Pricing**: amount, hourly_rate (snapshot), hours_requested

**Type & Status**: type (paid | free_help), booking_type (direct | referred | agent_job), status (Pending | Confirmed | Completed | Cancelled | Declined), payment_status (Pending | Paid | Failed | Refunded)

**Scheduling Fields** (v6.0 - Migration 219):
- `scheduling_status` (unscheduled | proposed | scheduled) - Current scheduling state
- `proposed_by` (UUID) - Who proposed the current time
- `proposed_at` (TIMESTAMPTZ) - When the time was proposed
- `schedule_confirmed_by` (UUID) - Who confirmed the schedule
- `schedule_confirmed_at` (TIMESTAMPTZ) - When the schedule was confirmed
- `slot_reserved_until` (TIMESTAMPTZ) - 15-minute reservation expiry
- `reschedule_count` (INTEGER) - Number of reschedules (max 4)

**Listing Snapshots** (v5.8): subjects, levels, location_type, location_city, hourly_rate, listing_slug, available_free_help

**Integration Fields**: session_artifacts (JSONB), recording_url, stripe_checkout_id (idempotency), cancellation_reason, refund_amount

**Timestamps**: created_at, updated_at, completed_at

### API Endpoints

**Main Routes**:
- `GET /api/bookings` - Fetch user bookings with role-based filtering
- `POST /api/bookings` - Create new booking with listing snapshot
- `POST /api/bookings/stripe-checkout` - Create Stripe checkout session
- `POST /api/webhooks/stripe` - Handle payment confirmation webhooks
- `POST /api/bookings/assign` - Agent assigns tutor to job
- `POST /api/wisespace/[bookingId]/complete` - Mark session complete with verification

**Scheduling Routes** (v6.0):
- `POST /api/bookings/[id]/schedule/propose` - Propose a session time (creates 15-min slot reservation)
- `POST /api/bookings/[id]/schedule/confirm` - Confirm proposed time (triggers Stripe for paid, instant for free)
- `POST /api/bookings/[id]/schedule/reschedule` - Reschedule a confirmed booking (max 4 times)

### Key Workflows

**5-Stage Paid Booking Flow** (v6.0):
1. **Discover**: Client finds tutor listing in marketplace
2. **Book**: Client creates booking → status=Pending, scheduling_status=unscheduled, session_start_time=NULL
3. **Schedule**: Tutor/client propose time → scheduling_status=proposed, slot_reserved_until=NOW()+15min → Other party confirms
4. **Pay**: On confirmation → Stripe checkout created → Client pays → Webhook fires → status=Confirmed, scheduling_status=scheduled
5. **Review**: Session occurs → Completed → Reviews triggered → Payout clearing begins

**Free Help Booking Creation** (Instant):
Student clicks "Get Free Help Now" → Validates rate limit and tutor online status → Creates booking (Confirmed, scheduled immediately) → Generates Google Meet link → Returns instant confirmation (total 3 seconds)

**Scheduling Propose/Confirm Flow**:
Either party proposes time → slot_reserved_until set to NOW()+15min → Other party receives notification → Confirming party clicks Confirm → For paid: Stripe checkout triggers → For free: Instantly confirmed → scheduling_status=scheduled

**Reschedule Flow**:
Either party initiates reschedule → Check reschedule_count < 4 → Reset to proposed state with new time → Other party confirms → reschedule_count incremented → Logged to audit_logs

**Expired Slot Cleanup** (pg_cron):
Every 5 minutes → cleanup_expired_slot_reservations() runs → Bookings with slot_reserved_until < NOW() reset to unscheduled → Proposed time cleared

**Booking Completion**:
Session occurs in WiseSpace → WiseSpace verifies completion → Updates booking status to Completed → Trigger creates review session → CaaS queues tutor for score recalculation → Payout clearing period begins (7 days)

---

## System Integrations

**Strong Dependencies** (Cannot function without):
- **Stripe**: Payment processing and webhook handling
- **Listings**: Source data for booking creation (with snapshot preservation)

**Medium Coupling** (Trigger-based, async):
- **Reviews**: Auto-creates review sessions on booking completion
- **CaaS**: Triggers score updates for Performance, Digital, Social Impact buckets
- **Referrals**: Tracks first conversion and lifetime attribution
- **WiseSpace**: Virtual classroom for session delivery and completion verification

**Low Coupling** (Optional features):
- **Wiselist**: In-network referral attribution via cookies (v5.7)
- **Profile Graph**: Guardian/student relationship validation for 3-party bookings

---

## File Structure

**Main Hub Page**:
- [page.tsx](../../apps/web/src/app/(authenticated)/bookings/page.tsx) - Gold Standard Hub with 3x3 widget grid

**Core Components** (11 total):
- [BookingCard.tsx](../../apps/web/src/app/components/feature/bookings/BookingCard.tsx) - Individual booking display with scheduling status
- [BookingDetailModal.tsx](../../apps/web/src/app/components/feature/bookings/BookingDetailModal.tsx) - Full detail view with scheduling fields
- [SchedulingModal.tsx](../../apps/web/src/app/components/feature/bookings/SchedulingModal.tsx) - Date/time picker for propose/confirm flow (v6.0)
- [SchedulingModal.module.css](../../apps/web/src/app/components/feature/bookings/SchedulingModal.module.css) - Scheduling modal styles
- [BookingStatsWidget.tsx](../../apps/web/src/app/components/feature/bookings/BookingStatsWidget.tsx) - Statistics overview
- [UpcomingSessionWidget.tsx](../../apps/web/src/app/components/feature/bookings/UpcomingSessionWidget.tsx) - Next session preview
- Plus 5 more widgets (help, tip, video, skeleton, error)

**Scheduling Library** (v6.0):
- [apps/web/src/lib/scheduling/rules.ts](../../apps/web/src/lib/scheduling/rules.ts) - Scheduling rules engine and validation

**API Routes**:
- [apps/web/src/app/api/bookings/route.ts](../../apps/web/src/app/api/bookings/route.ts) - Main endpoints
- [apps/web/src/app/api/webhooks/stripe/route.ts](../../apps/web/src/app/api/webhooks/stripe/route.ts) - Payment webhooks
- [apps/web/src/app/api/wisespace/[bookingId]/complete/route.ts](../../apps/web/src/app/api/wisespace/[bookingId]/complete/route.ts) - Completion

**Database Migrations** (Key):
- Migration 049: Create bookings table
- Migration 056: Add stripe_checkout_id for idempotency
- Migration 063: Add student_id for 3-party bookings
- Migration 084: Add booking_referrer_id for wiselist attribution
- Migration 104: Add listing snapshot fields (v5.8 - 7 columns)
- Migration 108: Add type column for free_help support (v5.9)
- Migration 219: Add scheduling fields (v6.0 - scheduling_status enum, 7 columns)
- Migration 220: Add pg_cron job for expired slot cleanup (v6.0)

**RPC Functions**:
- Migration 030: `handle_successful_payment()` - Atomic payment processing
- Migration 060: Updated commission splits (3-way and 4-way)
- Migration 109: Added transaction context snapshotting

---

## Testing

### Quick Verification

**Check Booking Creation**:
Create paid booking and verify status Pending, then check Stripe Checkout URL generated correctly.

**Check Free Help Creation**:
Create free_help booking and verify status Confirmed immediately, no payment flow triggered.

**Check Listing Snapshot**:
Create booking, then delete listing. Verify booking still displays all 7 snapshot fields correctly.

**Check Payment Webhook**:
Use Stripe CLI to trigger test webhook. Verify booking status updates to Confirmed and 4 transactions created.

**Check Optimistic Updates**:
Create booking and verify UI shows immediate success before server responds. Simulate error and verify rollback.

---

## Troubleshooting

### Booking Creation Fails

**Possible Causes**:
1. Listing not published or deleted
2. Client trying to book own listing
3. Listing snapshot fields missing

**Solutions**:
1. Validate listing exists and status equals published
2. Check listing.profile_id not equals requesting client_id
3. Verify booking INSERT includes all 7 snapshot fields

### Payment Webhook Not Firing

**Possible Causes**:
1. Webhook endpoint not configured in Stripe dashboard
2. Webhook secret mismatch
3. Network/firewall blocking Stripe IPs

**Solutions**:
1. Configure webhook endpoint: `/api/webhooks/stripe`
2. Verify `STRIPE_WEBHOOK_SECRET` environment variable
3. Test locally with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Free Help Rate Limit Exceeded

**Cause**: Student already booked 5 free sessions in past 7 days

**Solution**: Inform student of limit. They must wait until oldest session ages past 7 days before booking another.

### Score Not Updating After Booking

**Cause**: CaaS recalculation queue not processing or trigger not firing

**Solution**: Check `caas_recalculation_queue` table for tutor_id. If missing, manually INSERT. Verify cron job running every 10 minutes.

### Slot Reservation Not Expiring (v6.0)

**Cause**: pg_cron job not running or not enabled

**Solution**:
1. Verify pg_cron extension enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_cron'`
2. Check job exists: `SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-slot-reservations'`
3. View recent runs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10`
4. Manual cleanup: `SELECT cleanup_expired_slot_reservations()`

### Scheduling Confirmation Fails (v6.0)

**Possible Causes**:
1. Slot reservation expired (15-min limit)
2. Proposed time doesn't meet 24-hour minimum notice
3. Reschedule limit exceeded (max 4)

**Solutions**:
1. Check `slot_reserved_until` > NOW() before confirming
2. Verify proposed time is at least 24 hours in future
3. Check `reschedule_count` < 4 for the booking

---

## Migration Guide

### Upgrading Existing Bookings to v5.9

**Database Changes**:
1. Run Migration 108: Adds `type` column with default 'paid'
2. All existing bookings automatically set to type 'paid'
3. No data migration required for existing records

**Code Changes**:
1. Update booking creation logic to handle `type` parameter
2. Add conditional: if `type === 'free_help'` skip Stripe redirect
3. Update queries filtering paid bookings: `WHERE type = 'paid' OR type IS NULL`
4. Update webhook handler to skip free_help bookings

**Expected Behavior**:
- All existing bookings continue working unchanged (type defaults to 'paid')
- New paid bookings behave identically to v5.8
- New free_help bookings skip payment flow entirely

---

## Support

**For Questions**:
1. Check [Solution Design v2](./bookings-solution-design-v2.md) for architecture and design decisions
2. Review [AI Prompt Context v2](./bookings-prompt-v2.md) for AI assistant guidance
3. See Implementation Guide v2 for code examples (coming soon)
4. Search codebase for specific implementations

**For Bugs**:
1. Check webhook logs for payment processing errors
2. Verify Stripe signature validation passing
3. Test RPC functions directly via psql
4. Review React Query DevTools for cache issues

**For Feature Requests**:
1. Propose changes in Solution Design doc first
2. Consider impact on payment integrity (idempotency, atomicity)
3. Test with representative booking scenarios
4. Document in changelog

---

**Last Updated**: 2026-02-05
**Next Review**: When implementing recurring bookings (v6.1)
**Maintained By**: Backend Team + Payments Team
