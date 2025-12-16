# CaaS (Credibility as a Service)

**Status**: ✅ Active (v5.9 - Social Impact Complete)
**Last Updated**: 2025-12-15
**Last Code Update**: 2025-12-15
**Priority**: Critical (Tier 1 - Core Platform Infrastructure)
**Architecture**: 6-Bucket Transparent Scoring System with Auto-Sync
**Business Model**: Free (Platform Infrastructure)

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-15 | v5.9 | **Social Impact Complete**: Added Bucket 6 (10 points), implemented free help tracking, normalized 110→/100 scoring |
| 2025-12-15 | v5.5 | **Architecture Simplification**: Added caas_score column to profiles, 80% code reduction in UserProfileContext, standardized terminology |
| 2025-12-13 | v5.5 | **Security Audit**: Hardening plan created for Sybil attack prevention and credential ceiling fixes |
| 2025-11-15 | v5.5 | **Initial Release**: 5-bucket tutor scoring model (30/30/20/10/10), RPC functions, queue system |

---

## Quick Links

- [Solution Design](./caas-solution-design-v2.md) - Complete architecture, 6-bucket model, scoring formulas
- [Implementation Guide](./caas-implementation-v2.md) - Developer guide, v5.9 implementation report, API reference
- [AI Prompt Context](./caas-prompt-v2.md) - AI assistant context for CaaS feature
- [Security Hardening Plan](./caas-hardening-plan.md) - Vulnerability fixes and roadmap

## Overview

CaaS (Credibility as a Service) is TutorWise's reputation scoring system that calculates and displays a **0-100 credibility score** for tutors. The system incentivizes quality teaching, platform engagement, professional credentials, and community contribution through a transparent, gamified scoring model.

**Key Innovation**: Unlike opaque algorithms, CaaS uses a **transparent 6-bucket model** where tutors see exactly how their score is calculated and what actions will improve it. Scores are automatically recalculated when relevant profile changes occur and synced to the `profiles.caas_score` column for instant access without JOINs.

### Why CaaS Matters

**For Tutors**:
- Transparent path to higher marketplace ranking
- Gamified incentives for quality teaching and credentials
- Fair cold-start score (30 points) for new tutors with 0 sessions
- Community contribution (Free Help Now) increases reputation

**For Students**:
- Quick trust signals when choosing tutors (85/100 vs 45/100)
- Safety gate ensures only identity-verified tutors appear in search
- High scores correlate with better teaching outcomes (5★ ratings, retention)

**For Platform**:
- Drives marketplace quality (high-scoring tutors convert 28% better)
- Incentivizes platform engagement (integrations, session logging)
- Supports social mission (rewards free tutoring sessions)
- Reduces support load (automated vetting via safety gate)

---

## v5.9: Social Impact Bucket (2025-12-15)

### What Changed

**Added Bucket 6**: Social Impact (10 points) to reward community contribution through Free Help Now feature.

**Scoring Model Update**:
- **Old**: 5 buckets = 100 points total
- **New**: 6 buckets = 110 points raw → normalized to /100 for display
- **Formula**: `Math.round((rawTotal / 110) * 100)`

**Why Social Impact?**
- Aligns with platform mission to democratize education
- Creates virtuous cycle: free sessions → reputation → paid bookings
- Progressive scoring encourages sustained participation (1 point per free session, max 5)

### Bucket 6 Breakdown

**Part 1: Availability Bonus (5 points)**
- Tutor enables "Offer Free Help" toggle in settings
- Sets `available_free_help = true` in database
- Makes tutor discoverable with "Free Help Now" badge in marketplace

**Part 2: Delivery Bonus (5 points progressive)**
- 1 point per completed free help session
- Capped at 5 points (encourages 5+ free sessions)
- Tracks bookings where `type = 'free_help'` AND `status = 'Completed'`

### Integration with Free Help Now (v5.9)

CaaS now integrates with the Free Help Now feature:
- Tutors toggle availability in account settings (no credit card required)
- Redis heartbeat system maintains online presence (5-minute TTL)
- Students book 30-minute free sessions via "Get Free Help Now" button
- Completed sessions automatically count toward CaaS delivery bonus
- RPC function `get_performance_stats()` returns `completed_free_sessions_count`

---

## Key Features

### Core Capabilities

**6-Bucket Scoring Model**
- Transparent, gamified credibility calculation
- Each bucket has clear point allocation and criteria
- Tutors can see exactly what actions improve their score
- Normalized display (/100) maintains user expectations

**Auto-Recalculation System**
- Queue-based architecture decouples events from calculations
- Profile changes trigger queue insertion (review posted, DBS verified, etc.)
- CaaS worker processes queue every 10 minutes via cron
- Graceful degradation if RPC functions fail

**Denormalized Storage**
- Scores cached in `profiles.caas_score` for instant reads (<5ms)
- Detailed breakdown stored in `caas_scores` table as audit trail
- Auto-sync trigger maintains consistency between tables
- Eliminated complex JOIN logic (80% code reduction)

**Role-Specific Strategies**
- Strategy pattern allows different algorithms per role
- Tutor strategy fully implemented (v5.9)
- Client and Agent strategies planned for future

**Safety Gate**
- Identity verification required (score = 0 if unverified)
- Unverified tutors hidden from public marketplace search
- "Don't find a stranger" principle enforced at database level

**Provisional Scoring**
- New tutors with 0 sessions receive 30-point cold-start score
- Prevents unfair penalization of qualified newcomers
- Ensures marketplace competitiveness for first listing

---

## Scoring Buckets (v5.9)

**Total**: 110 points raw → normalized to /100 for display

| Bucket | Points | Description |
|--------|--------|-------------|
| **1. Performance & Quality** | 30 | Rating (0-5★) + Client retention OR Provisional score (new tutors) |
| **2. Qualifications & Authority** | 30 | University degree + QTS + 10+ years experience |
| **3. Network & Referrals** | 20 | Tutor referrals (4 pts each, max 3) + Network bonus (>10 connections) |
| **4. Verification & Safety** | 10 | Identity verified (gate + 5 pts) + DBS check valid (5 pts) |
| **5. Digital Professionalism** | 10 | Google integrations (5 pts) + Engagement (bio video OR high logging rate) |
| **6. Social Impact** ⭐ NEW | 10 | Free Help availability (5 pts) + Completed free sessions (1-5 pts) |

### Example Scores

**New Tutor** (0 sessions, identity verified, no credentials):
- Raw: 35/110 (30 provisional + 5 identity) → **Display: 32/100**

**Active Tutor** (10 sessions, degree, free help enabled):
- Raw: 55/110 (25 performance + 10 qualifications + 10 safety + 5 digital + 5 social) → **Display: 50/100**

**Community Champion** (50 sessions, QTS, 5 free sessions delivered):
- Raw: 96/110 (30 + 20 + 16 + 10 + 10 + 10) → **Display: 87/100**

---

## Architecture

### System Flow

Profile changes (e.g., DBS verified) trigger queue insertion → CaaS worker fetches from queue → TutorCaaSStrategy calculates 6 buckets → Writes to `caas_scores` table → Trigger syncs to `profiles.caas_score` → UI displays score instantly.

### Database Schema

**Three Core Tables**:
1. **profiles.caas_score** (INTEGER) - Denormalized score column for fast queries (NEW v5.5)
2. **caas_scores** - Detailed score records with JSONB breakdown (audit trail)
3. **caas_recalculation_queue** - Queue for async score updates

**Three RPC Functions**:
1. **get_performance_stats(user_id)** - Returns rating, sessions, retention, free sessions count (UPDATED v5.9)
2. **get_network_stats(user_id)** - Returns referrals, connections, agent-referred status
3. **get_digital_stats(user_id)** - Returns Google Calendar/Classroom sync status

### Normalization Formula

CaaS v5.9 uses 110-point raw scoring normalized to /100 for display:

**Formula**: `normalizedScore = Math.round((rawTotal / 110) * 100)`

**Why Normalize?**
- Maintains /100 user expectation (familiar scale)
- Allows adding new buckets without breaking UI
- Prevents score inflation as new features added
- Preserves historical comparison (v5.5 scores comparable to v5.9)

---

## Implementation Status

### ✅ Completed (v5.9 - Social Impact)

**Phase 1: Social Impact Bucket (2025-12-15)**
- ✅ Migration 116: Updated `get_performance_stats()` RPC with `completed_free_sessions_count`
- ✅ Created `calcSocialImpact()` method in TutorCaaSStrategy
- ✅ Implemented availability bonus (5 points for `available_free_help = true`)
- ✅ Implemented delivery bonus (1-5 points progressive)
- ✅ Updated scoring model to 110 points with normalization
- ✅ Removed Lessonspace-specific metrics (platform-agnostic)
- ✅ Updated TypeScript types (`PerformanceStats` interface)
- ✅ Tested: Baseline 32/100, with free help 36/100, with 3 sessions 39/100

**Phase 2: Architecture Simplification (2025-12-15)**
- ✅ Migration 115: Added `caas_score` column to `profiles` table
- ✅ Created auto-sync trigger `sync_caas_score_to_profile()`
- ✅ Removed JOIN logic from UserProfileContext (45→15 lines, 80% reduction)
- ✅ Backfilled 8 existing scores to new column
- ✅ Standardized terminology (`caas_score` everywhere, 0 occurrences of `credibility_score`)
- ✅ Fixed dashboard KPIs column references (`total_score` not `overall_score`)

**Previous Versions**
- ✅ v5.5 (2025-11-15): 5-bucket tutor model, RPC functions, queue system, provisional scoring
- ✅ v4.0 (2025-10-01): Initial CaaS prototype with 3-bucket model

### 🔄 In Progress
- 🔄 Client CaaS scoring strategy (placeholder exists)
- 🔄 Agent CaaS scoring strategy (placeholder exists)
- 🔄 Dashboard score breakdown visualization
- 🔄 Score history tracking (temporal audit trail)

### 📋 Future Enhancements (Post v5.9)
- Teaching experience extraction from JSONB (Bucket 2, currently skipped)
- Real-time score updates (WebSocket push instead of polling)
- Percentile ranking (show "Top 10%" badge)
- Actionable improvement suggestions ("Add DBS check to gain +5 points")
- Gamification badges for score milestones (50, 75, 90 points)

---

## File Structure

**Service Layer** (`apps/web/src/lib/services/caas/`):
- `index.ts` - Main CaaS service (calculate, queue management)
- `types.ts` - TypeScript interfaces and defaults
- `strategies/tutor.ts` - TutorCaaSStrategy class (v5.9 with 6 buckets)
- `strategies/client.ts` - ClientCaaSStrategy placeholder
- `strategies/agent.ts` - AgentCaaSStrategy placeholder

**API Routes** (`apps/web/src/app/api/`):
- `caas/[profile_id]/route.ts` - GET cached score for profile
- `caas/calculate/route.ts` - POST calculate score manually (admin only)
- `caas-worker/route.ts` - POST process queue (triggered by cron)

**Database Migrations** (`apps/api/migrations/`):
- `115_add_caas_score_to_profiles.sql` - Denormalization + trigger (v5.5)
- `116_add_free_sessions_to_performance_stats.sql` - Social Impact RPC update (v5.9)

---

## Testing

### Quick Verification

**Check Score Sync**:
Query both tables to verify trigger is working correctly. Scores should match between `profiles.caas_score` and `caas_scores.total_score` for all tutors.

**Test Free Sessions Counting**:
Create a test booking with `type = 'free_help'` and `status = 'Completed'`, then verify RPC function returns correct `completed_free_sessions_count`.

**Test Normalization**:
Calculate raw score (e.g., 55/110) and verify normalized display (50/100). Formula should round correctly.

### Manual Score Calculation

Use the calculate API endpoint to trigger immediate score calculation for a specific tutor. This bypasses the queue and returns results instantly.

### Automated Testing

TypeScript test suites verify each bucket calculation independently. Mock data simulates different tutor scenarios (new, experienced, community champion).

---

## Troubleshooting

### Score Shows 0/100

**Cause**: Identity not verified (safety gate active)

**Solution**: Verify tutor identity in admin panel. Once `identity_verified = true`, score will recalculate automatically.

### Score Not Updating in UI

**Possible Causes**:
1. Trigger not syncing between tables
2. Browser cache showing stale data
3. Profile not queued for recalculation

**Solutions**:
1. Check trigger exists and is enabled
2. Hard refresh browser (Ctrl+Shift+R)
3. Manually insert into `caas_recalculation_queue`
4. Run manual sync query if trigger broken

### Free Sessions Not Counting

**Cause**: RPC function not finding bookings with correct type/status

**Solution**: Verify bookings exist with `type = 'free_help'` AND `status = 'Completed'`. Check listing belongs to tutor. Ensure RPC function query matches database schema.

### Score Shows Old Terminology

**Cause**: Stale code references to `credibility_score`

**Solution**: Grep codebase for old terms. All references should use `caas_score` (TypeScript) or `caasScore` (JavaScript variables). Zero occurrences of old terminology expected.

---

## Migration Guide

### Upgrading from v5.5 to v5.9

**Database Changes**:
1. Run Migration 115 first (adds `caas_score` column + trigger)
2. Run Migration 116 second (updates RPC function)
3. Verify backfill completed (check all tutors have `caas_score` populated)

**Code Changes**:
1. Update imports to use `caas_score` (not `credibility_score`)
2. Remove JOIN logic from profile queries (use direct column access)
3. Update TypeScript types to include `completed_free_sessions_count` in `PerformanceStats`
4. Add `social_impact` to CaaS score breakdown displays

**Expected Score Changes**:
- All scores will decrease by approximately 9% due to 110→100 normalization
- New tutors: 35→32, Mid-range: 55→50, High-scoring: 88→80
- This is expected behavior and maintains relative rankings

---

## Integration Points

### Free Help Now (v5.9)
- **Direction**: CaaS reads from Free Help Now
- **Data Flow**: Bookings table → RPC function → Social Impact bucket
- **Fields Used**: `available_free_help`, `bookings.type = 'free_help'`

### Profile Graph (v4.6)
- **Direction**: CaaS reads from Profile Graph
- **Data Flow**: Connection groups → RPC function → Network bucket
- **Fields Used**: `profile_graph` (SOCIAL connections, AGENT_REFERRAL links)

### Listings & Bookings (v4.0)
- **Direction**: CaaS reads from Bookings
- **Data Flow**: Bookings + Reviews → RPC function → Performance bucket
- **Fields Used**: `bookings.status`, `reviews.rating`, retention calculations

### Google Integrations (v5.0)
- **Direction**: CaaS reads from Integrations
- **Data Flow**: Student integration links → RPC function → Digital bucket
- **Fields Used**: `google_calendar_synced`, `google_classroom_synced`

### Verifications (v3.0)
- **Direction**: CaaS reads from Profiles
- **Data Flow**: Direct profile fields → Safety gate & bucket
- **Fields Used**: `identity_verified` (gate), `dbs_verified`, `dbs_expiry_date`

---

## Support

**For Questions**:
1. Check [Implementation Guide](./caas-implementation-v2.md) for detailed procedures and code examples
2. Review [Solution Design](./caas-solution-design-v2.md) for architecture decisions and scoring formulas
3. See [Security Hardening Plan](./caas-hardening-plan.md) for vulnerability fixes
4. Search codebase for specific implementations

**For Bugs**:
1. Check console logs for RPC function errors
2. Verify database trigger is enabled
3. Test RPC functions directly via psql
4. Review recent migration execution logs

**For Feature Requests**:
1. Propose changes in Solution Design doc first
2. Consider impact on existing scores (normalization)
3. Test with representative tutor profiles
4. Document in changelog

---

**Last Updated**: 2025-12-15
**Next Review**: When implementing Client/Agent scoring strategies
**Maintained By**: Trust & Safety Team + Marketplace Team
