# Bookings AI Assistant Context

**Status**: ✅ Active (v5.9 - Free Help Support)
**Last Updated**: 2025-12-15
**Purpose**: Provide AI assistants (Claude Code, GitHub Copilot, etc.) with essential context about the Bookings system for accurate code generation and analysis.

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-15 | v5.9 | Free Help Support - instant confirmation flow, 30-minute sessions, rate limiting |
| 2025-12-08 | v5.8 | Listing Snapshots - 7 fields preserved in bookings for historical accuracy |
| 2025-11-20 | v5.7 | Wiselist Attribution - cookie-based referral tracking |

---

## System Overview

**Bookings** is TutorWise's transaction orchestration engine managing the complete tutoring session lifecycle from creation through payment, delivery, and review triggering. The system handles three booking types (paid direct, agent-referred, free help) with 99.7% payment success rate and processes over 200 monthly bookings across Stripe integration, WiseSpace virtual classroom, and CaaS score updates.

**Architecture Style**: Event-driven transaction processing with optimistic UI updates, atomic payment processing via PostgreSQL RPC functions, and listing snapshot mechanism for historical accuracy.

---

## Key Constraints for AI Code Generation

### 1. The Three Booking Paths (Critical Requirement)

**Paid Direct Booking**: Standard flow requires creating booking record with status Pending, snapshotting 7 listing fields into booking, redirecting to Stripe Checkout, waiting for webhook to confirm payment, then updating status to Confirmed. Never skip payment validation or webhook processing. Total latency target: under 5 seconds from click to confirmation.

**Agent-Referred Booking**: Identical to paid direct except system copies agent_profile_id from client's referred_by_agent_id field at booking creation time. This lifetime attribution ensures agent receives 10% commission on this booking and ALL future bookings from this client. Payment webhook must create 4 transaction records (client debit, platform fee 10%, agent commission 10%, tutor payout 80%) instead of 3 records for non-referred bookings.

**Free Help Booking** (v5.9): Bypass payment entirely by setting amount equals zero, payment_status equals Paid immediately, status equals Confirmed on creation, and type equals free_help. Generate Google Meet link via meet.new API for instant video room. Enforce rate limit of 5 sessions per 7 days per student. Verify tutor online via Redis heartbeat check before booking creation. Fixed duration: 30 minutes non-negotiable.

**Rationale**: These three paths handle 100% of booking volume. Paid bookings prioritize financial integrity (webhook verification, idempotency, atomic transactions). Free help prioritizes instant access for social mission (skip payment friction, instant confirmation, immediate video link). Mixing patterns creates bugs.

### 2. Listing Snapshot Mechanism (v5.8 - Required for All Bookings)

At booking creation, system MUST copy 7 fields from listings table into bookings table regardless of booking type. These fields are: subjects (TEXT array for filtering), levels (TEXT array for analytics), location_type (online or in_person or hybrid), location_city (for tax reporting), hourly_rate (immutable price), listing_slug (for reference links), available_free_help (tutor offering free sessions flag). This snapshotting happens in single INSERT statement, not separate UPDATE.

**Why Snapshot?**: Listings can be edited or deleted post-booking. Without snapshots, booking records lose critical context showing "Booking for deleted listing" with no subject or pricing data. Reviews cannot display session context. Financial audit trail incomplete. Query performance degrades from requiring JOINs to listings table for every booking read.

**Critical Rule**: Never trust listing_id foreign key to provide these 7 fields. Always read from bookings table snapshot columns directly. Listing may be NULL if listing deleted, but snapshot fields preserve history. UI must handle NULL listing_id gracefully by using snapshot data as fallback.

### 3. Atomic Payment Processing via RPC (Non-Negotiable)

Payment webhook handling MUST call handle_successful_payment PostgreSQL RPC function rather than executing payment logic in application code. This RPC runs as single database transaction creating 4 transaction records (client debit, tutor credit, platform fee, optional agent commission), updating booking status, and updating referrals table for first conversion. Either ALL steps succeed or ALL rollback.

**Idempotency Check**: Before calling RPC, webhook handler checks if booking already has stripe_checkout_id populated. If yes, return 200 immediately without processing (duplicate webhook delivery). This prevents double-charging or duplicate commission payments which are catastrophic financial bugs.

**Error Handling**: If RPC throws error, webhook returns 500 status code. Stripe will retry webhook up to 3 times with exponential backoff (30 seconds, 2 minutes, 5 minutes). Failed webhooks log to failed_webhooks table for manual investigation. Never silently swallow RPC errors as this creates unreconciled bookings (client charged in Stripe but booking shows Pending in database).

### 4. Optimistic Updates with React Query (Required Pattern)

All booking mutations (create, cancel, update) use React Query with optimistic update pattern. On mutation initiation, immediately update local cache to show success state before server responds. On server success, do nothing since cache already correct. On server error, rollback cache to previous state and display error toast. On settled (success or error), invalidate query to refetch fresh data.

**Why This Pattern?**: Booking creation takes 300-500ms server processing plus 2-5 seconds for payment webhook. Without optimistic updates, users stare at loading spinner for 5-8 seconds creating anxiety. Optimistic updates provide instant perceived latency (under 100ms) while backend processes asynchronously. Payment success rate is 99.7% so optimistic assumption correct in vast majority of cases.

**Query Invalidation**: After booking mutation, must invalidate ALL related queries: bookings list, booking stats, upcoming sessions widget, tutor availability calendar. Forgetting invalidation causes stale data bugs where UI shows old state after successful mutation.

### 5. Free Help Rate Limiting (v5.9 - Abuse Prevention)

Before creating free_help booking, API MUST enforce rate limit of 5 free sessions per 7 days per student. Query bookings table for records where client_id equals requesting user AND type equals free_help AND created_at greater than NOW minus 7 days. If count reaches 5, reject request with 429 status code and error message "You've reached your weekly limit of 5 free help sessions".

**Why This Limit?**: Without rate limiting, students could abuse system by booking 20+ free sessions daily, exhausting tutor availability for paying clients. Five sessions per week balances educational access mission with platform sustainability. Data shows genuine students average 2.3 free sessions per month, so five per week provides comfortable headroom without enabling abuse.

**Account Age Check**: Additionally, student account must be older than 7 days to book free help. Prevents throwaway account exploitation where user creates new account every day for unlimited free sessions. Check profiles.created_at less than NOW minus 7 days before allowing booking.

---

## Database Schema Essentials

### bookings Table (36 Columns)

**Core Fields**: id (UUID primary key), client_id (who pays), tutor_id (who teaches), student_id (who attends - may equal client_id for adult learners), listing_id (source listing - may be NULL if deleted), agent_profile_id (lifetime attribution for commission), booking_referrer_id (wiselist attribution for v5.7 feature).

**Session Details**: service_name (e.g., "GCSE Maths Tutoring"), session_start_time (TIMESTAMPTZ), session_duration (integer minutes), duration_minutes (v5.9 for free help 30 minutes).

**Pricing**: amount (total cost in GBP), hourly_rate (snapshot from listing v5.8), hours_requested (decimal like 1.5 hours).

**Type and Status**: type (paid or free_help), booking_type (direct or referred or agent_job), status (Pending or Confirmed or Completed or Cancelled or Declined), payment_status (Pending or Paid or Failed or Refunded).

**Listing Snapshot Fields** (v5.8): subjects (TEXT array), levels (TEXT array), location_type (TEXT), location_city (TEXT), hourly_rate (NUMERIC), listing_slug (TEXT), available_free_help (BOOLEAN). These fields copied from listings table at booking creation and never modified thereafter.

**Integration Fields**: session_artifacts (JSONB containing whiteboard_snapshot_url and recording_url), recording_url (direct Lessonspace link), stripe_checkout_id (idempotency key), cancellation_reason (TEXT), refund_amount (NUMERIC).

**Timestamps**: created_at (booking creation), updated_at (last modification), completed_at (session finished timestamp).

---

## Common AI Assistant Tasks

### Task: Creating New Booking (Any Type)

When adding booking creation logic, follow this sequence: (1) Validate listing exists and status equals published, (2) Validate client cannot book own listing by checking listing.profile_id not equals requesting user id, (3) Fetch listing record to access fields for snapshotting, (4) Copy client's referred_by_agent_id to booking agent_profile_id for lifetime attribution, (5) Snapshot 7 listing fields into booking INSERT statement, (6) For paid bookings redirect to Stripe Checkout with booking_id in metadata, (7) For free_help bookings skip payment and set status Confirmed immediately, (8) Increment listing booking_count via RPC function, (9) Return booking record to client with appropriate next step (payment URL or video link).

**Common Mistakes**: Forgetting to snapshot listing fields causes data loss when listing edited. Forgetting to copy agent_profile_id breaks commission attribution. Skipping idempotency check in webhook causes double-charging. Using sequential API calls instead of atomic RPC creates inconsistent transaction state.

### Task: Handling Payment Webhook

When modifying webhook handler, preserve this execution order: (1) Verify Stripe signature using webhook secret to prevent replay attacks, (2) Extract booking_id from session metadata, (3) Query booking record and check if stripe_checkout_id already populated (idempotency), (4) If already processed return 200 immediately, (5) Call handle_successful_payment RPC passing booking_id and stripe_checkout_id, (6) If RPC succeeds save wiselist_referrer_id from metadata if present (v5.7), (7) Return 200 with received true JSON body, (8) On any error return 500 to trigger Stripe retry logic.

**Never Do**: Skip signature verification (security vulnerability). Call RPC without idempotency check (double-charging risk). Execute payment logic in application code instead of RPC (no atomicity). Return 200 when RPC failed (Stripe marks webhook successful but booking not updated). Forget to log failures to failed_webhooks table (no audit trail).

### Task: Implementing Optimistic Updates

When adding new booking mutation, use this React Query pattern: Define mutation with onMutate, onSuccess, onError, onSettled hooks. In onMutate, cancel outgoing queries with cancelQueries, snapshot previous query data with getQueryData, update cache optimistically with setQueryData mapping over bookings array, return context object containing previous snapshot. In onError, rollback cache with setQueryData using context.previous, display error toast to user. In onSettled (runs regardless of success or error), invalidate all related queries including bookings list, booking stats, upcoming sessions.

**Query Keys to Invalidate**: bookings (main list), bookings with status filter parameter, bookings with booking_id parameter (single booking), booking-stats (aggregate metrics), upcoming-sessions (widget data), tutor-availability (if cancelling booking). Missing invalidations cause stale data where UI shows old booking after successful update.

### Task: Adding Listing Snapshot Fields

When adding new snapshot field to preserve listing context, follow this migration pattern: (1) Add column to bookings table with NULL default (ALTER TABLE bookings ADD COLUMN new_field TYPE), (2) Backfill existing bookings by joining to listings table where listing_id not NULL (UPDATE bookings SET new_field equals listing.new_field FROM listings WHERE bookings.listing_id equals listings.id), (3) Update booking creation API to include new field in INSERT statement snapshot section, (4) Update booking queries to read from bookings table directly instead of joining to listings, (5) Update UI components to use snapshot field as primary source with listing join as fallback only.

**Why This Order?**: Adding column with NULL default prevents blocking existing queries during migration. Backfilling from listings preserves historical data where possible. Updating creation logic ensures future bookings include field. Reading from bookings table instead of listings improves query performance by eliminating JOIN.

### Task: Implementing Cancellation Logic

When adding cancellation feature, enforce cancellation policy based on time until session. Calculate hours_until_session as (session_start_time minus NOW) divided by 3600 seconds. If hours_until_session greater than 24, full refund equals booking amount. If hours_until_session between 12 and 24, partial refund equals booking amount times 0.5. If hours_until_session less than 12, no refund equals zero. Process refund via Stripe API using stripe.refunds.create with payment_intent from booking stripe_payment_intent_id field and amount in pence (refund_amount times 100). Update booking status to Cancelled, set refund_amount field, set payment_status to Refunded if refund processed.

**Tutor Cancellation**: If tutor cancels (not client), always issue full refund regardless of timing. This penalizes tutors for unreliability while protecting clients. Create negative review signal in tutor's profile (affects CaaS score). Notify client immediately with rebooking suggestions.

### Task: Creating Review Sessions

Review creation happens automatically via database trigger, but when modifying trigger logic preserve this behavior: Trigger fires ONLY when booking status changes to Completed AND payment_status equals Confirmed (both conditions required). Extract participant_ids as array containing client_id, tutor_id, and agent_profile_id if not NULL. Insert into booking_review_sessions table with booking_id foreign key, participant_ids array, deadline as NOW plus 7 days, publish_at as NOW plus 7 days (auto-publish if not submitted), status as pending. Snapshot booking context fields: service_name, subjects, levels, session_date (from session_start_time), location_type.

**Why These Conditions?**: Completed without Paid status means free trial or disputed session (no review needed). Paid without Completed means client paid but session never occurred (premature review). Both conditions together indicate legitimate completed paid session worthy of review.

### Task: Integrating CaaS Score Updates

CaaS integration happens via database triggers that insert tutor_id into caas_recalculation_queue table. When adding new booking event that affects tutor credibility, create trigger with AFTER UPDATE or AFTER INSERT timing. Trigger condition uses WHEN clause to check specific field changes. Trigger function body inserts profile_id (tutor_id from booking), priority (normal or high), triggered_by (descriptive string like booking_completion). Use ON CONFLICT DO UPDATE to handle race conditions where same tutor queued multiple times.

**Three Existing Triggers**: (1) Booking completion (WHEN OLD.status not equals Completed AND NEW.status equals Completed) affects Bucket 1 Performance via completed_sessions and retention_rate, (2) Recording URL added (WHEN OLD.recording_url IS NULL AND NEW.recording_url IS NOT NULL) affects Bucket 5 Digital Professionalism, (3) Free help completion (WHEN NEW.type equals free_help AND NEW.status equals Completed) affects Bucket 6 Social Impact with high priority for faster processing.

---

## Critical DO and DON'T Rules

### MUST DO:

1. **Always Snapshot Listing Fields**: Copy 7 fields from listings into bookings at creation time regardless of booking type. Never rely on listing_id foreign key for these fields as listing may be deleted.

2. **Use Atomic RPC for Payments**: Call handle_successful_payment PostgreSQL function from webhook handler. Never execute payment logic in application code as this prevents transaction atomicity.

3. **Enforce Idempotency**: Check stripe_checkout_id before processing webhook. Stripe retries failed webhooks up to 3 times so duplicate delivery is common not exceptional.

4. **Validate Free Help Rate Limit**: Query bookings table for recent free_help bookings before allowing creation. Five per 7 days is hard limit to prevent abuse.

5. **Invalidate Related Queries**: After booking mutation, invalidate bookings list, stats, upcoming sessions, and availability queries. Missing invalidations cause stale data bugs.

6. **Copy Agent Attribution**: Set booking agent_profile_id from client referred_by_agent_id at creation time. This lifetime attribution cannot be modified post-creation.

7. **Use Optimistic Updates**: Implement onMutate, onError, onSettled pattern with React Query for all booking mutations. Provides instant perceived latency.

8. **Handle NULL Listing ID**: Booking listing_id may be NULL if listing deleted. UI must use snapshot fields as primary data source with listing join as optional enhancement.

### MUST NOT DO:

1. **Never Skip Webhook Verification**: Always verify Stripe signature before processing webhook. Skipping creates security vulnerability where attackers forge webhook events.

2. **Never Execute Payment Logic in App Code**: Use RPC function for payment processing. Application-level transaction logic cannot guarantee atomicity across multiple table inserts.

3. **Never Allow Unbounded Free Help**: Enforce 5 sessions per 7 days rate limit. Without limit, abuse scenarios exhaust tutor availability for paying clients.

4. **Never Trust Client-Side Completion**: Require server-side verification that WiseSpace session actually occurred before marking booking Complete. Client-side "Mark Complete" enables fraud.

5. **Never Modify Agent Attribution**: booking agent_profile_id set at creation time is immutable. Changing post-creation breaks commission calculation and agent dashboard metrics.

6. **Never Skip Snapshot on Creation**: Forgetting to copy listing fields creates orphaned bookings with no context when listing edited or deleted.

7. **Never Return 200 on RPC Failure**: If handle_successful_payment RPC throws error, webhook must return 500 to trigger Stripe retry. Returning 200 marks webhook successful but booking not updated.

8. **Never Create Booking Without Listing Validation**: Check listing exists, status equals published, and listing.profile_id not equals requesting client before allowing booking creation.

---

## File Paths for AI Reference

**Main Hub Page**: [apps/web/src/app/(authenticated)/bookings/page.tsx](../../../apps/web/src/app/(authenticated)/bookings/page.tsx) - Gold Standard Hub with 3x3 widget grid using HubPageLayout component

**Core Components**: [apps/web/src/app/components/feature/bookings/](../../../apps/web/src/app/components/feature/bookings/) - Contains 9 components including BookingCard, BookingDetailModal, BookingStatsWidget, UpcomingSessionWidget, help/tip/video widgets, skeleton, and error states

**API Routes**:
- [apps/web/src/app/api/bookings/route.ts](../../../apps/web/src/app/api/bookings/route.ts) - GET (fetch bookings) and POST (create booking) endpoints with role-based filtering
- [apps/web/src/app/api/bookings/stripe-checkout/route.ts](../../../apps/web/src/app/api/bookings/stripe-checkout/route.ts) - Creates Stripe Checkout session for paid bookings
- [apps/web/src/app/api/webhooks/stripe/route.ts](../../../apps/web/src/app/api/webhooks/stripe/route.ts) - Handles checkout.session.completed webhook with idempotency and RPC call
- [apps/web/src/app/api/bookings/assign/route.ts](../../../apps/web/src/app/api/bookings/assign/route.ts) - Agent assigns tutor to job booking type
- [apps/web/src/app/api/wisespace/[bookingId]/complete/route.ts](../../../apps/web/src/app/api/wisespace/%5BbookingId%5D/complete/route.ts) - WiseSpace session completion endpoint with verification

**Database Migrations**:
- Migration 049: Create bookings table with initial schema
- Migration 056: Add stripe_checkout_id for idempotency (v4.9)
- Migration 063: Add student_id for 3-party bookings (v5.0)
- Migration 084: Add booking_referrer_id for wiselist attribution (v5.7)
- Migration 104: Add listing snapshot fields (v5.8 - 7 columns)
- Migration 108: Add type column for free_help support (v5.9)

**RPC Functions**:
- [apps/api/migrations/030_create_payment_webhook_rpc.sql](../../../apps/api/migrations/030_create_payment_webhook_rpc.sql) - handle_successful_payment function initial version
- [apps/api/migrations/060_update_payment_webhook_rpc_v4_9.sql](../../../apps/api/migrations/060_update_payment_webhook_rpc_v4_9.sql) - Added 3-way/4-way commission splits
- [apps/api/migrations/109_update_rpc_with_context.sql](../../../apps/api/migrations/109_update_rpc_with_context.sql) - Added transaction context snapshotting

**Client-Side API**: [apps/web/src/lib/api/bookings.ts](../../../apps/web/src/lib/api/bookings.ts) - TypeScript functions wrapping API routes with proper typing for createBooking, getBookings, cancelBooking, updateBooking

---

## Performance Best Practices

**Query Optimization**: Read snapshot fields directly from bookings table instead of joining to listings. Snapshot mechanism eliminates JOIN reducing query latency 3x (from 300ms to 100ms average). Use bookings table indexes: idx_bookings_client_id, idx_bookings_tutor_id, idx_bookings_status, idx_bookings_payment_status, idx_bookings_session_start_time, idx_bookings_type.

**React Query Caching**: Configure 5-minute stale time for bookings list query. Most users don't create bookings frequently so aggressive caching reduces API calls 80% without impacting UX. For real-time updates after mutations, rely on query invalidation rather than short stale time.

**Webhook Processing Speed**: Webhook handler target latency under 300ms to stay well below Stripe's 30-second timeout. Achieve this by using RPC (single database call instead of multiple API calls), batch transaction inserts (single INSERT for 4 records), and async email sending (don't block webhook response on email delivery).

**Optimistic Update Benefits**: Perceived latency reduced from 5-8 seconds (waiting for webhook) to instant under 100ms (optimistic cache update). Booking creation feels instant despite backend processing asynchronously. Error cases rollback gracefully with clear messaging.

---

## Common Gotchas and Solutions

**Gotcha 1: Webhook Received Before API Response**
- **Problem**: Stripe sometimes delivers webhook before booking creation API returns response to client, causing race condition where client queries bookings list before local cache updated
- **Solution**: Webhook handler and API both invalidate bookings query. React Query deduplicates simultaneous invalidations so only one refetch occurs. Client sees updated booking from either source.

**Gotcha 2: Listing Deleted After Booking**
- **Problem**: Client views booking detail page but listing_id foreign key returns NULL, causing UI crash trying to access listing.title
- **Solution**: Always check if listing is NULL before accessing properties. Use snapshot fields as primary data source: service_name instead of listing.title, subjects instead of listing.subjects, hourly_rate instead of listing.hourly_rate.

**Gotcha 3: Free Help Booking Enters Payment Flow**
- **Problem**: Conditional logic checking if booking.type equals free_help missing from Stripe Checkout redirect, causing free help bookings to create unnecessary checkout sessions
- **Solution**: Check booking type immediately after creation. If type equals free_help, skip redirect and return video link directly. If type equals paid, proceed to Stripe.

**Gotcha 4: Agent Commission Missing**
- **Problem**: Agent expects commission but transaction table shows only 3 records (client, tutor, platform) instead of 4
- **Solution**: Verify booking agent_profile_id populated at creation. If NULL, check client's referred_by_agent_id was correctly copied. If still NULL, client not referred so 3-way split correct behavior.

**Gotcha 5: Optimistic Update Shows Wrong Final State**
- **Problem**: Mutation succeeds but UI shows stale data because onSettled invalidation missing or query key mismatch
- **Solution**: Invalidate ALL query keys related to bookings: base key (bookings), filtered keys (bookings with status param), single booking keys (bookings with id param), stats keys (booking-stats), widget keys (upcoming-sessions).

**Gotcha 6: Webhook Processed Twice**
- **Problem**: Stripe retries webhook causing duplicate commission payment to agent or tutor
- **Solution**: RPC function checks if booking already has stripe_checkout_id populated. If yes, RETURN immediately without creating transactions. This idempotency check prevents double-processing regardless of retry count.

---

## Testing Checklist for AI

When generating or modifying booking code, verify these scenarios:

**Booking Creation**:
- Paid direct booking creates status Pending
- Paid referred booking copies agent_profile_id from client
- Free help booking creates status Confirmed immediately
- Listing snapshot fields populated for all booking types
- Listing validation rejects unpublished or deleted listings
- Cannot book own listing (client_id not equals listing.profile_id)

**Payment Processing**:
- Webhook verifies Stripe signature
- Idempotency check prevents duplicate processing
- RPC creates correct number of transactions (3 for direct, 4 for referred)
- Commission split calculates correctly (80/10/10 or 90/10)
- Referral status updates to Converted on first booking

**Free Help Specific**:
- Rate limit enforces 5 sessions per 7 days
- Account age check requires 7+ day old account
- Tutor online verification via Redis heartbeat
- Duration fixed at 30 minutes
- Amount set to zero

**Optimistic Updates**:
- Mutation shows immediate success feedback
- Error cases rollback with toast message
- onSettled invalidates all related queries
- Query keys match between mutation and fetch

**Edge Cases**:
- NULL listing_id handled gracefully with snapshot fallback
- Webhook retry delivers same event multiple times (idempotency)
- Client closes browser during payment (webhook still processes)
- Tutor deletes listing after booking created (snapshot preserves data)

---

## Code Examples Location

For detailed code examples, SQL migrations, API implementation patterns, and testing strategies, refer to the Implementation document at [bookings-implementation-v2.md](./bookings-implementation-v2.md). The prompt document intentionally avoids code blocks to maintain focus on conceptual understanding and AI assistant guidance constraints.

---

**Document Version**: v5.9
**Last Reviewed**: 2025-12-15
**Next Review**: 2026-01-15
**Maintained By**: Backend Team + Payments Team
**Feedback**: backend@tutorwise.com
