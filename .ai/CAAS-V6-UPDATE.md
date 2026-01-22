# CaaS Universal Model v6.0 - Quick Reference

**Last Updated:** 2026-01-22
**Status:** ✅ Production

---

## What Changed

**Old (v5.9):**
- 3 separate strategies: TutorCaaSStrategy, ClientCaaSStrategy, AgentCaaSStrategy
- Different bucket counts per role (5/3/4 buckets)
- Hard bucket ceilings (50 bookings = 500 bookings)
- Clients/agents stuck at 0/100 after onboarding

**New (v6.0):**
- 1 universal strategy: UniversalCaaSStrategy
- Same 6 buckets for all roles
- No hard ceilings (weighted normalization)
- Provisional scoring for everyone (70% multiplier)

---

## Universal 6-Bucket Model

| Bucket | Weight | All Roles |
|--------|--------|-----------|
| Delivery | 40% | Core value delivery (sessions, bookings, ratings) |
| Credentials | 20% | Qualifications, expertise, profile quality |
| Network | 15% | Connections + referrals made + referrals received |
| Trust | 10% | Verification status (onboarding, identity, email, phone, background) |
| Digital | 10% | Platform integration (Google Calendar, Classroom, recordings) |
| Impact | 5% | Community contribution (free help given/taken) |

---

## Verification Multipliers

| Status | Multiplier | Conditions |
|--------|------------|------------|
| Provisional | 0.70 | Onboarding complete, not verified |
| Identity | 0.85 | Identity verified (+21% boost) |
| Full | 1.00 | All verifications complete (+18% boost) |

**Total boost:** +43% from provisional to full

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

---

## File Locations

**Implementation:**
- Strategy: `apps/web/src/lib/services/caas/strategies/universal.ts`
- Service: `apps/web/src/lib/services/caas/index.ts`
- Types: `apps/web/src/lib/services/caas/types.ts`

**Documentation:**
- Specification: `docs/feature/caas/caas-model.md` (71 pages)
- Summary: `docs/feature/caas/IMPLEMENTATION_SUMMARY.md`
- Triggers: `docs/feature/caas/CAAS_TRIGGER_OPTIMIZATION_2026.md`

**Database:**
- Migrations: 200, 201, 202 (trigger enhancements)
- Worker: `apps/web/src/app/api/caas-worker/route.ts`
- Queue: `caas_recalculation_queue` table

---

## API Changes

**No breaking changes** - same endpoints:
- `POST /api/caas/calculate` - Manual calculation
- `POST /api/caas-worker` - Automatic queue processing (every 10 min)
- `GET /api/caas/score/:profileId` - Fetch cached score

**New breakdown structure:**
```typescript
{
  total: 75,
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
      delivery: 34,
      credentials: 18,
      network: 5.4,
      trust: 7,
      digital: 8,
      impact: 2.5
    },
    weighted_score: 74.9,
    final_score: 64 // (74.9 × 0.85 = 63.7, rounded to 64)
  }
}
```

---

## Database Schema

**No schema changes** - uses existing tables:
- `caas_scores` - cached scores
- `caas_recalculation_queue` - event-driven updates
- `profiles` - source data
- `bookings` - delivery metrics
- `referrals` - network metrics
- `profile_graph` - network metrics
- `reviews` - delivery/credentials metrics

**New calculation_version:** `'universal-v6.0'`

---

## Deployment Status

✅ **Production Ready**
- No environment variables needed
- No feature flags
- Works out of the box
- Zero downtime deployment

**Migration:** Queue-based recalculation (8 hours for 5,000 users)

---

## Quick Links

- **Full Specification:** `docs/feature/caas/caas-model.md`
- **Implementation Summary:** `docs/feature/caas/IMPLEMENTATION_SUMMARY.md`
- **Trigger Documentation:** `docs/feature/caas/CAAS_TRIGGER_OPTIMIZATION_2026.md`
- **Code:** `apps/web/src/lib/services/caas/strategies/universal.ts`
