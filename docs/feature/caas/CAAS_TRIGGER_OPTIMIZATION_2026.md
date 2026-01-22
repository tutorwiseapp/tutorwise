# CaaS Trigger Optimization - 2026-01-22

## Executive Summary

This document outlines the **optimum solution** for CaaS (Credibility as a Service) recalculation triggers across Listings, Bookings, and Referrals integrations.

**Key Principle:** Leverage existing trigger infrastructure (migrations 075, 078, 088) and add minimal new triggers to fill gaps.

## Existing Infrastructure ✅

### Queue System (Migration 075)
- `caas_recalculation_queue` table with UNIQUE constraint on `profile_id`
- Idempotent inserts: `ON CONFLICT (profile_id) DO NOTHING`
- Processed by `/api/caas-worker` every 10 minutes (batch size: 100)
- FIFO ordering via `created_at` timestamp

### Automatic Triggers (Migration 078)
Already covers:
- Profile updates (qualifications, verifications, bio)
- New reviews (tutor queued)
- Booking completion (status='completed')
- Recording URL additions (Lessonspace usage)
- Profile graph changes (SOCIAL, AGENT_REFERRAL)
- Integration links (Google Calendar/Classroom)

### Special Triggers (Migration 088)
- Free help sessions (high priority queue)

## Requirements Analysis

### User Requirements
| Integration | Trigger Events | Priority |
|-------------|---------------|----------|
| **Listings** | 1. Published<br>2. Booked | High |
| **Bookings** | Scheduled + Payment completed | Critical |
| **Referrals** | 1. Referral made<br>2. Payment completed (conversion) | High |

### Gap Analysis
| Requirement | Existing Coverage | Gap | Action |
|-------------|-------------------|-----|--------|
| Listings Published | ❌ None | Need trigger on `status='published'` | **NEW** Migration 200 |
| Listings Booked | ✅ **COVERED** | `trigger_queue_on_booking_completion` already handles this | None |
| Booking Payment | ⚠️ Partial | Only checks `status`, not `payment_status` | **ENHANCE** Migration 201 |
| Referral Created | ⚠️ Partial | Only via `profile_graph` | **NEW** Migration 202 |
| Referral Converted | ❌ None | Need trigger on `status='Converted'` | **NEW** Migration 202 |

## Optimum Solution: 3 New Migrations

### Migration 200: Listing Publish Trigger

**File:** `tools/database/migrations/200_add_listing_publish_caas_trigger.sql`

**Purpose:** Queue tutor for CaaS recalculation when they publish a listing

**Trigger:**
```sql
CREATE TRIGGER trigger_queue_on_listing_publish
AFTER UPDATE OF status
ON public.listings
FOR EACH ROW
WHEN (NEW.status = 'published' AND OLD.status != 'published')
EXECUTE FUNCTION queue_caas_for_listing_owner();
```

**Who Gets Queued:**
- ✅ Listing owner (tutor/agent) - `NEW.profile_id`

**When:**
- Status changes from any state to `'published'`

**Why:**
- Rewards content creation and marketplace contribution
- Signals active platform engagement

---

### Migration 201: Enhanced Booking Payment Trigger

**File:** `tools/database/migrations/201_enhance_booking_payment_caas_trigger.sql`

**Purpose:** Queue all booking parties when BOTH booking AND payment complete

**Replaces:** `trigger_queue_on_booking_completion` from migration 078

**Trigger:**
```sql
CREATE TRIGGER trigger_queue_on_booking_payment
AFTER UPDATE OF status, payment_status
ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION queue_caas_for_booking_payment();
```

**Who Gets Queued:**
- ✅ Tutor (service delivery credibility)
- ✅ Client (platform engagement credibility)
- ✅ Agent (referral conversion credibility, if `agent_id IS NOT NULL`)

**When:**
- BOTH `status='Completed'` AND `payment_status='Completed'`
- Ensures financial transaction has been processed

**Enhancements over old trigger:**
1. ✅ Checks payment status in addition to booking status
2. ✅ Queues client (not just tutor)
3. ✅ Queues agent for referred bookings
4. ✅ Handles both listing-based and direct profile bookings

---

### Migration 202: Referral Lifecycle Triggers

**File:** `tools/database/migrations/202_add_referral_caas_triggers.sql`

**Purpose:** Track complete referral lifecycle for CaaS scoring

#### Trigger 1: Referral Created
```sql
CREATE TRIGGER trigger_queue_on_referral_created
AFTER INSERT ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION queue_caas_for_referral_created();
```

**Who Gets Queued:**
- ✅ Agent (referrer) - `NEW.agent_id`

**When:**
- New referral record inserted

**Why:**
- Immediate reward for proactive networking
- Encourages platform growth behavior

#### Trigger 2: Referral Converted
```sql
CREATE TRIGGER trigger_queue_on_referral_conversion
AFTER UPDATE OF status
ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION queue_caas_for_referral_conversion();
```

**Who Gets Queued:**
- ✅ Agent (referrer) - Major CaaS boost
- ✅ Referred user - Initial CaaS score establishment

**When:**
- Referral status changes to `'Converted'`
- Typically triggered when referred user completes first paid booking

**Why:**
- Rewards successful conversion (quality over quantity)
- Establishes credibility for new active users

---

## Architecture: Database-First Approach

### Why Database Triggers (Not Application Code)?

✅ **Advantages:**
1. **Reliability:** Can't be bypassed by buggy application code
2. **Consistency:** Same logic regardless of entry point (UI, API, background job)
3. **Performance:** No round-trip to application server
4. **Atomicity:** Queue insertion happens in same transaction as data change
5. **Simplicity:** Centralized logic, no code duplication

❌ **When NOT to use triggers:**
- Complex business logic requiring external API calls
- User-facing operations requiring immediate feedback
- Operations that should be optional/conditional based on user input

### Queue-Based Pattern

All triggers use **queue-based, not immediate** calculation:

```
User Action → Database Change → Trigger Fires → Queue Insert
                                                      ↓
                                                 [10 min later]
                                                      ↓
                                            CaaS Worker Processes Queue
```

**Why queued instead of immediate?**
- ✅ Decouples user action from heavy calculation
- ✅ Prevents user-facing latency
- ✅ Allows batching for efficiency (100 profiles per worker run)
- ✅ Naturally handles duplicate events (UNIQUE constraint)
- ✅ Survives calculation failures (retry on next worker run)

**Exception:** Only onboarding uses immediate calculation (POST `/api/caas/calculate`) because:
- Critical user journey requiring instant gratification
- One-time operation (not repeated)
- User expects to see their score immediately on dashboard

---

## Complete Trigger Map

### All CaaS Triggers (After Migrations 200-202)

| Table | Event | Trigger Name | Who Gets Queued | Migration |
|-------|-------|--------------|-----------------|-----------|
| `profiles` | UPDATE (qualifications, verifications) | `trigger_queue_on_profile_update` | Profile owner | 078 |
| `reviews` | INSERT | `trigger_queue_on_new_review` | Tutor (receiver) | 078 |
| `bookings` | UPDATE (status + payment_status) | `trigger_queue_on_booking_payment` | Tutor, Client, Agent | **201** ✨ |
| `bookings` | UPDATE (recording_url) | `trigger_queue_on_recording_url_update` | Tutor | 078 |
| `bookings` | UPDATE (free_help completed) | `trigger_queue_caas_for_free_help` | Tutor | 088 |
| `profile_graph` | INSERT/UPDATE (SOCIAL, AGENT_REFERRAL) | `trigger_queue_on_profile_graph_change` | Both source & target | 078 |
| `student_integration_links` | INSERT/UPDATE (Google integrations) | `trigger_queue_on_integration_link_change` | Profile owner | 078 |
| `listings` | UPDATE (status='published') | `trigger_queue_on_listing_publish` | Listing owner | **200** ✨ |
| `referrals` | INSERT | `trigger_queue_on_referral_created` | Agent | **202** ✨ |
| `referrals` | UPDATE (status='Converted') | `trigger_queue_on_referral_conversion` | Agent, Referred user | **202** ✨ |

**Total:** 10 triggers covering all CaaS-affecting events

---

## Testing Plan

### Test Cases

#### Test 1: Listing Published
```sql
-- Setup: Create draft listing
INSERT INTO listings (profile_id, title, status) VALUES ('user-uuid', 'Test Listing', 'draft');

-- Action: Publish listing
UPDATE listings SET status = 'published' WHERE id = 'listing-uuid';

-- Expected: user-uuid in caas_recalculation_queue
SELECT * FROM caas_recalculation_queue WHERE profile_id = 'user-uuid';
```

#### Test 2: Booking Payment Completed
```sql
-- Setup: Create pending booking
INSERT INTO bookings (client_id, tutor_id, agent_id, status, payment_status)
VALUES ('client-uuid', 'tutor-uuid', 'agent-uuid', 'Pending', 'Pending');

-- Action: Complete booking AND payment
UPDATE bookings
SET status = 'Completed', payment_status = 'Completed'
WHERE id = 'booking-uuid';

-- Expected: All three parties in queue
SELECT * FROM caas_recalculation_queue
WHERE profile_id IN ('client-uuid', 'tutor-uuid', 'agent-uuid');
```

#### Test 3: Referral Created
```sql
-- Action: Create referral
INSERT INTO referrals (agent_id, referred_email, status)
VALUES ('agent-uuid', 'newuser@example.com', 'Referred');

-- Expected: agent-uuid in queue
SELECT * FROM caas_recalculation_queue WHERE profile_id = 'agent-uuid';
```

#### Test 4: Referral Converted
```sql
-- Setup: Create referred user
UPDATE referrals
SET referred_profile_id = 'newuser-uuid'
WHERE id = 'referral-uuid';

-- Action: Mark as converted
UPDATE referrals SET status = 'Converted' WHERE id = 'referral-uuid';

-- Expected: Both agent and new user in queue
SELECT * FROM caas_recalculation_queue
WHERE profile_id IN ('agent-uuid', 'newuser-uuid');
```

#### Test 5: Idempotency (No Duplicates)
```sql
-- Action: Multiple events for same user
UPDATE profiles SET identity_verified = true WHERE id = 'user-uuid';
UPDATE listings SET status = 'published' WHERE profile_id = 'user-uuid';
INSERT INTO referrals (agent_id, referred_email) VALUES ('user-uuid', 'test@test.com');

-- Expected: Only ONE queue entry (UNIQUE constraint)
SELECT COUNT(*) FROM caas_recalculation_queue WHERE profile_id = 'user-uuid';
-- Result should be 1, not 3
```

### Integration Tests

**E2E Test Flow:**
1. User creates account (onboarding)
2. Publishes listing → Queue trigger
3. Receives booking → Queue trigger
4. Completes booking with payment → Queue trigger (all parties)
5. Creates referral → Queue trigger
6. Referred user converts → Queue trigger (both parties)
7. Worker runs → All profiles processed
8. Verify CaaS scores updated for all affected profiles

---

## Deployment Checklist

### Pre-Deployment
- [ ] Review migrations 200, 201, 202 for syntax errors
- [ ] Test on staging database
- [ ] Verify no conflicts with existing triggers
- [ ] Check RLS policies allow trigger functions

### Deployment
- [ ] Run migration 200 (listing publish trigger)
- [ ] Run migration 201 (enhanced booking trigger)
- [ ] Run migration 202 (referral lifecycle triggers)
- [ ] Verify all triggers created successfully

### Post-Deployment
- [ ] Monitor CaaS queue growth rate
- [ ] Check worker processing times
- [ ] Verify no duplicate queue entries
- [ ] Test manual actions (publish listing, complete booking, etc.)
- [ ] Monitor for trigger errors in database logs

### Rollback Plan
```sql
-- Rollback Migration 202
DROP TRIGGER IF EXISTS trigger_queue_on_referral_conversion ON public.referrals;
DROP TRIGGER IF EXISTS trigger_queue_on_referral_created ON public.referrals;
DROP FUNCTION IF EXISTS public.queue_caas_for_referral_conversion();
DROP FUNCTION IF EXISTS public.queue_caas_for_referral_created();

-- Rollback Migration 201
DROP TRIGGER IF EXISTS trigger_queue_on_booking_payment ON public.bookings;
DROP FUNCTION IF EXISTS public.queue_caas_for_booking_payment();
-- Restore old trigger from migration 078 if needed

-- Rollback Migration 200
DROP TRIGGER IF EXISTS trigger_queue_on_listing_publish ON public.listings;
DROP FUNCTION IF EXISTS public.queue_caas_for_listing_owner();
```

---

## Performance Considerations

### Queue Growth Rate

**Expected Queue Inserts Per Day:**
- Listings published: ~50/day
- Bookings completed: ~200/day × 3 parties = 600/day
- Referrals created: ~30/day
- Referrals converted: ~10/day × 2 parties = 20/day
- **Total new triggers:** ~700 inserts/day

**Existing triggers:** ~500 inserts/day (reviews, profile updates, etc.)

**Combined total:** ~1,200 queue inserts/day

### Worker Capacity

**Current:** Worker runs every 10 minutes, processes 100 profiles/batch
- Capacity: 100 profiles × 6 batches/hour × 24 hours = 14,400 profiles/day
- Utilization: 1,200 / 14,400 = **8.3%**

**Conclusion:** System has **10x headroom** for growth ✅

### Database Load

**Trigger overhead per INSERT/UPDATE:**
- Queue insert: ~1ms (indexed UNIQUE constraint check + insert)
- Idempotent (ON CONFLICT DO NOTHING): No-op for duplicates

**Impact:** Negligible (<1% overhead on booking/listing operations)

---

## Future Enhancements

### Priority Queuing (Optional)
Add priority levels to queue table:

```sql
ALTER TABLE caas_recalculation_queue ADD COLUMN priority TEXT DEFAULT 'normal';
CREATE INDEX idx_caas_queue_priority ON caas_recalculation_queue(priority, created_at);

-- High priority: Referral conversions, first listings
-- Normal: Profile updates, reviews
-- Low: Minor changes
```

### Reason Tracking (Optional)
Track why recalculation was queued:

```sql
ALTER TABLE caas_recalculation_queue ADD COLUMN reason TEXT;
-- Useful for debugging and analytics
```

### Batched Updates (Optional)
Instead of queueing on every event, batch updates for frequently-changing data:

```sql
-- Only queue once per hour per profile for high-frequency events
-- Reduces queue churn for very active users
```

---

## Summary

### What Was Built

✅ **3 new migrations** filling CaaS trigger gaps:
- Migration 200: Listing publish trigger
- Migration 201: Enhanced booking payment trigger (all parties)
- Migration 202: Complete referral lifecycle triggers

✅ **Database-first architecture** for reliability and consistency

✅ **Queue-based pattern** for performance and fault tolerance

✅ **10x capacity headroom** for future growth

### What Makes This Optimum

1. **Minimal Changes:** Leverages existing infrastructure (migrations 075, 078, 088)
2. **Consistent Pattern:** All new triggers follow established conventions
3. **Complete Coverage:** All user-requested trigger points implemented
4. **Reliable:** Database triggers can't be bypassed
5. **Performant:** Queue-based with massive headroom
6. **Testable:** Clear test cases and verification steps
7. **Maintainable:** Well-documented with rollback plan

### Alternatives Considered (and Rejected)

❌ **Application-level triggers:** Less reliable, can be bypassed
❌ **Immediate calculation:** Would add latency to user operations
❌ **Event bus (Kafka, etc.):** Over-engineering for current scale
❌ **Polling database:** Inefficient, misses real-time updates

### Conclusion

The optimum solution is **database triggers + queue-based processing**. This approach is:
- Battle-tested (already used in migrations 078, 088)
- Scalable (14,400 profiles/day capacity)
- Reliable (atomic with data changes)
- Maintainable (centralized trigger logic)

**No application code changes needed** - everything handled at database level ✅

---

## References

- Migration 075: `tools/database/migrations/075_create_caas_event_queue.sql`
- Migration 078: `tools/database/migrations/078_create_caas_auto_queue_triggers.sql`
- Migration 088: `tools/database/migrations/088_update_booking_triggers_for_caas_v5_9.sql`
- Migration 200: `tools/database/migrations/200_add_listing_publish_caas_trigger.sql`
- Migration 201: `tools/database/migrations/201_enhance_booking_payment_caas_trigger.sql`
- Migration 202: `tools/database/migrations/202_add_referral_caas_triggers.sql`
- CaaS Worker: `apps/web/src/app/api/caas-worker/route.ts`
- CaaS Service: `apps/web/src/lib/services/caas/index.ts`

---

**Document Version:** 1.0
**Created:** 2026-01-22
**Author:** System Architect
**Status:** Ready for Implementation
