# CaaS Universal Model v6.1 - Quick Reference

**Last Updated:** 2026-01-22
**Status:** ✅ Production (Tier 1 - Immediate Triggers)

---

## What Changed

### v5.9 → v6.0 (Universal Model)
- ❌ 3 separate strategies → ✅ 1 universal strategy
- ❌ Different bucket counts per role → ✅ Same 6 buckets for all
- ❌ Hard bucket ceilings → ✅ Weighted normalization
- ❌ Clients/agents at 0/100 → ✅ Provisional scoring (70% baseline)

### v6.0 → v6.1 (Immediate Triggers)
- ❌ Queue-based (10 min delay) → ✅ Event-driven (< 1 sec)
- ❌ Worker + cron job → ✅ Database triggers only
- ❌ `caas_recalculation_queue` → ✅ `caas_calculation_events`
- ❌ Polling every 10 min → ✅ Immediate on user action

---

## Architecture: Tier 1 (Immediate)

**Event-Driven Immediate Calculation:**
```
User Action (verify identity, publish listing, complete booking)
    ↓
Database Trigger Fires (< 10ms)
    ↓
Insert into caas_calculation_events
    ↓
Next.js processes event (<500ms)
    ↓
Score saved to caas_scores
    ↓
User refreshes dashboard
    ↓
Sees updated score (< 1 sec total)
```

**No Queue. No Worker. No Cron.**

---

## Universal 6-Bucket Model

| Bucket | Weight | All Roles |
|--------|--------|-----------|
| **Delivery** | 40% | Core value delivery (sessions, bookings, ratings) |
| **Credentials** | 20% | Qualifications, expertise, profile quality |
| **Network** | 15% | Connections + referrals made + referrals received |
| **Trust** | 10% | Verification status (onboarding, identity, proof of address, DBS, business) |
| **Digital** | 10% | Platform integration (Google Calendar, Classroom, recordings) |
| **Impact** | 5% | Community contribution (free help given/taken) |

**Formula:** `(Σ weighted_buckets) × verification_multiplier = final_score`

---

## Verification Multipliers

| Status | Multiplier | Conditions | Example |
|--------|------------|------------|---------|
| **Provisional** | 0.70 | Onboarding complete, not verified | 70 → 49/100 |
| **Identity** | 0.85 | Identity verified | 70 → 60/100 (+21%) |
| **Full** | 1.00 | All verifications complete | 70 → 70/100 (+18%) |

**Total boost:** +43% from provisional to full verification

---

## Immediate Triggers (v6.1)

**14 triggers covering all CaaS-affecting events:**

| Event | Trigger | Latency |
|-------|---------|---------|
| Profile verification | `trigger_caas_immediate_on_profile_update` | < 1 sec |
| Listing publish | `trigger_caas_immediate_on_listing_publish` | < 1 sec |
| Booking complete + paid | `trigger_caas_immediate_on_booking_complete` | < 1 sec |
| Referral created | `trigger_caas_immediate_on_referral_created` | < 1 sec |
| Referral converted | `trigger_caas_immediate_on_referral_conversion` | < 1 sec |
| Review submission | `trigger_caas_immediate_on_new_review` | < 1 sec |
| Social connections | `trigger_caas_immediate_on_connection_change` | < 1 sec |
| Integration links | `trigger_caas_immediate_on_integration_change` | < 1 sec |
| Recording URLs | `trigger_caas_immediate_on_recording_url_added` | < 1 sec |
| Free help sessions | `trigger_caas_immediate_on_free_help_complete` | < 1 sec |

**Migrations:** 203 (RPC functions), 204 (attach triggers), 205 (drop queue)

---

## Key Insights

**Agents = Tutors:**
- Agents use same delivery/credentials as tutors
- Network bucket tracks recruitment (referrals made)
- NOT a separate business entity

**Universal Network:**
- Everyone can make AND receive referrals
- Bidirectional referrals for all roles
- Agents get bonus points for referrals made (recruitment)

**No More Hard Gates:**
- Clients no longer stuck at 0/100 after onboarding
- Agents no longer stuck at 0/100 after onboarding
- Everyone gets provisional score (70% multiplier)

**Instant Feedback:**
- User verifies identity → Score updates in < 1 sec
- User publishes listing → Score increases immediately
- User completes booking → All parties' scores update

---

## File Locations

**Implementation:**
- Strategy: `apps/web/src/lib/services/caas/strategies/universal.ts`
- Service: `apps/web/src/lib/services/caas/index.ts`
- Types: `apps/web/src/lib/services/caas/types.ts`

**Documentation:**
- Quick Reference: `.ai/CAAS-V6-UPDATE.md` (this file)
- Full Specification: `docs/feature/caas/caas-model.md`
- Implementation Summary: `docs/feature/caas/IMPLEMENTATION_SUMMARY.md`
- Trigger Optimization: `docs/feature/caas/CAAS_TRIGGER_OPTIMIZATION_2026.md`

**Database:**
- Migrations: 203, 204, 205 (immediate triggers)
- ~~Worker: Deleted~~ (no longer needed)
- ~~Queue: Deleted~~ (replaced by caas_calculation_events)
- Events: `caas_calculation_events` table (notification only)

---

## API Changes

**Removed:**
- ❌ `POST /api/caas-worker` - Worker endpoint deleted
- ❌ `CaaSService.queueRecalculation()` - Method removed
- ❌ `caas_recalculation_queue` table - Dropped

**Unchanged:**
- ✅ `CaaSService.calculateProfileCaaS()` - Called by triggers
- ✅ `CaaSService.getScore()` - Fetch cached score
- ✅ `caas_scores` table - Stores calculated scores

**New breakdown structure:**
```typescript
{
  total: 64,
  breakdown: {
    role: 'tutor',
    verification_status: 'identity',
    multiplier: 0.85,
    raw_buckets: {
      delivery: 85,
      credentials: 90,
      network: 36,
      trust: 70,
      digital: 80,
      impact: 50
    },
    weighted_buckets: {
      delivery: 34.0,  // 85 × 0.40
      credentials: 18.0, // 90 × 0.20
      network: 5.4,    // 36 × 0.15
      trust: 7.0,      // 70 × 0.10
      digital: 8.0,    // 80 × 0.10
      impact: 2.5      // 50 × 0.05
    },
    weighted_score: 74.9,
    final_score: 64 // 74.9 × 0.85 = 63.7 → 64
  }
}
```

---

## Database Schema

**Tables:**
- `caas_scores` - Cached scores (unchanged)
- `caas_calculation_events` - Event notifications (new in v6.1)
- ~~`caas_recalculation_queue`~~ - Deleted in v6.1

**Source Data Tables:**
- `profiles` - User data, verification status
- `bookings` - Delivery metrics (sessions, ratings)
- `referrals` - Network metrics (referrals made/received)
- `profile_graph` - Network metrics (social connections)
- `profile_reviews` - Delivery metrics (ratings)
- `student_integration_links` - Digital metrics (Calendar, Classroom)

**Calculation Version:** `'universal-v6.0'`

---

## Deployment Status

✅ **Production Deployed**
- v6.0 (Universal Model): Committed and deployed
- v6.1 (Immediate Triggers): Migrations applied, code deployed
- No environment variables needed
- No feature flags
- No cron job required

**Migration Status:**
- Database migrations 203-205: ✅ Applied
- Old queue infrastructure: ✅ Dropped
- Immediate triggers: ✅ Active (14 triggers)
- Backfill: ✅ 10 users queued in caas_calculation_events

---

## Quick Comparison

| Aspect | v6.0 (Queue) | v6.1 (Immediate) |
|--------|--------------|------------------|
| **Latency** | 0-10 minutes | < 1 second |
| **Architecture** | Worker + Cron | Database triggers |
| **User Experience** | Delayed feedback | Instant feedback |
| **Complexity** | Queue management | Simple triggers |
| **Resource Usage** | 144 cron runs/day | Event-driven only |
| **Failure Mode** | Queue backup | Auto-retry (PostgreSQL) |
| **Monitoring** | Queue depth | Trigger success rate |

---

## Quick Links

- **This File:** `.ai/CAAS-V6-UPDATE.md`
- **Full Spec:** `docs/feature/caas/caas-model.md`
- **Implementation:** `docs/feature/caas/IMPLEMENTATION_SUMMARY.md`
- **Triggers:** `docs/feature/caas/CAAS_TRIGGER_OPTIMIZATION_2026.md`
- **Code:** `apps/web/src/lib/services/caas/strategies/universal.ts`
- **Migrations:** `tools/database/migrations/203-205`

---

**TL;DR:** Universal 6-bucket model for all roles + Immediate event-driven triggers (< 1 sec latency). No queue, no worker, no cron.
