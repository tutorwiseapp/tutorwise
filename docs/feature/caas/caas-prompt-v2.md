# CaaS AI Assistant Context

**Status**: ✅ Active (v5.9 - Social Impact Complete)
**Last Updated**: 2025-12-15
**Purpose**: Provide AI assistants (Claude Code, GitHub Copilot, etc.) with essential context about the Credibility as a Service system for accurate code generation and analysis.

## Change Log

| Date | Version | Description |
|------|---------|-------------|
| 2025-12-15 | v5.9 | Social Impact bucket added (10 points), 6-bucket model with 110→100 normalization |
| 2025-12-15 | v5.5 | Architecture simplification with caas_score column, 80% code reduction |
| 2025-11-15 | v5.5 | Initial release with 5-bucket tutor scoring model |

---

## System Overview

**CaaS** (Credibility as a Service) is TutorWise's algorithmic scoring engine that calculates trust scores ranging from 0 to 100 for all platform users. The system serves three primary purposes: ranking tutors in marketplace search results based on credibility, gating unverified users from public visibility through identity verification requirements, and gamifying profile improvements to encourage quality and completeness.

**Architecture Style**: Event-driven cached scoring with polymorphic role-based strategies and denormalized score storage for sub-5ms query performance.

---

## Key Constraints for AI Code Generation

### 1. The Safety Gate (Critical Requirement)

**Identity Verification Gate**: Every scoring strategy MUST check identity verification status FIRST before any calculations. If `profiles.identity_verified` equals FALSE, immediately return `total_score = 0` without processing further buckets. Unverified users are hidden from marketplace search results entirely.

**Rationale**: The "Don't find a stranger" principle prevents unverified users from appearing publicly, protecting platform safety and trust. This is non-negotiable across all role types (tutor, client, agent).

### 2. Score Range and Normalization (v5.9)

**Display Range**: Scores displayed to users range from 0 to 100 (integer values only, round all decimal calculations).

**Internal Calculation**: The tutor scoring model uses 6 buckets totaling 110 raw points, then normalizes to 100-point display scale using formula: `Math.round((rawTotal / 110) * 100)`.

**Storage**: Normalized score stored in `profiles.caas_score` (INTEGER column with CHECK constraint 0-100) and `caas_scores.total_score` (audit trail table). Raw component scores preserved in `score_breakdown` JSONB field for transparency.

**Why Normalize?**: Allows adding future buckets without breaking 0-100 user expectation. Maintains historical score comparability across versions.

### 3. Cold Start Handling for New Tutors

New tutors with `completed_sessions = 0` receive **provisional performance score** of 30 out of 30 points (full bucket allocation) to prevent unfair penalization of qualified tutors without reviews yet. This provisional flag is stored in `score_breakdown` JSONB for transparency. Once tutor completes first session, scoring switches to calculated performance metrics (rating + retention).

**Rationale**: Prevents new tutors with strong qualifications from becoming invisible in search due to zero review count, solving the marketplace cold-start problem.

### 4. Event-Driven Updates (Never Synchronous)

**Pattern**: User actions (posting review, completing booking, verifying DBS) trigger database INSERT/UPDATE which fires trigger inserting `profile_id` into `caas_recalculation_queue` table. Cron job running every 10 minutes processes queue in batches of 100 profiles, calculates scores via strategy pattern, and upserts results to `caas_scores` cache table. Auto-sync trigger copies `total_score` to `profiles.caas_score` column.

**Reading Scores**: Always query `profiles.caas_score` column directly (not `caas_scores` JOIN, not real-time calculation). This provides sub-5ms read performance versus 200ms+ calculation latency.

**Critical Rule**: Never calculate scores synchronously in user-facing API requests. Queue-based recalculation decouples expensive calculations from user experience.

---

## Tutor Scoring Model (v5.9 - 6 Buckets)

**Total**: 110 raw points across 6 buckets, normalized to 100-point display scale.

### Bucket 1: Performance & Quality (30 raw points)

**Components**:

**Rating Score** (0-15 points): Average client rating divided by 5, multiplied by 15. Data source is `profile_reviews` table where `reviewee_id` equals tutor_id and `reviewer_role` equals CLIENT. Formula: `(avg_rating / 5) * 15`.

**Retention Score** (0-15 points): Retention rate multiplied by 15. Retention rate defined as percentage of unique clients who booked more than once. Formula: `(clients_with_≥2_bookings / total_unique_clients) * 15`. Data source is `bookings` table grouped by `client_id`.

**Cold Start Provisional**: If `completed_sessions = 0`, return full 30 points (skip rating and retention calculations). Set `provisional_flag = TRUE` in breakdown JSON.

**RPC Function**: `get_performance_stats(user_id UUID)` returns TABLE with five columns including `avg_rating`, `completed_sessions`, `retention_rate`, `manual_session_log_rate`, and `completed_free_sessions_count`.

### Bucket 2: Qualifications & Authority (30 raw points)

**Binary Components** (0 or 10 points each):

**Degree Points**: Award 10 points if `degree_level` field contains BACHELORS, MASTERS, or PHD. Extracted from `qualifications.education` JSONB field in `role_details` table.

**QTS Points**: Award 10 points if `qualifications.certifications` array includes 'qts' value. QTS is Qualified Teacher Status, UK government certification for state school teaching.

**Veteran Experience**: Award 10 points if `teaching_experience` in JSONB indicates 10 or more years. Currently not implemented (TODO for future extraction from JSONB structure).

**Data Source**: `profiles` table joined with `role_details` table where `role_type = 'tutor'`.

**No RPC Function**: Direct profile and role_details field access within strategy calculate method.

### Bucket 3: Network & Referrals (20 raw points)

**Component 1 - Referral Count** (0-12 points): Award 4 points per tutor referral, capped at 12 points maximum (3 referrals). Formula: `Math.min(referral_count * 4, 12)`. Counts outgoing AGENT_REFERRAL links in `profile_graph` table where `source_profile_id = tutor_id`.

**Component 2 - Network Bonus** (0 or 8 points): Award 8 points if EITHER condition met: social connection count exceeds 10 (counts bidirectional SOCIAL links in profile_graph) OR tutor has incoming AGENT_REFERRAL link indicating agent-referred status. This is OR logic, not additive (maximum 8 points even if both conditions true).

**RPC Function**: `get_network_stats(user_id UUID)` returns TABLE with `social_connections`, `agent_referral_count`, and `is_agent_referred` boolean.

### Bucket 4: Verification & Safety (10 raw points)

**Component 1 - Identity Gate Bonus** (5 points): If identity verified equals TRUE, automatically award 5 points. This is always true if code reaches bucket calculations (unverified users fail safety gate before bucket processing).

**Component 2 - DBS Check** (0 or 5 points): Award 5 points if `dbs_verified = TRUE` AND `dbs_expiry_date > NOW()`. DBS is Disclosure and Barring Service UK background check for working with children. No grace period, must be currently valid.

**Data Source**: Direct `profiles` table field access for `identity_verified`, `dbs_verified`, and `dbs_expiry_date`.

### Bucket 5: Digital Professionalism (10 raw points)

**Component 1 - Integrated Tools** (0 or 5 points): Award 5 points if EITHER Google Calendar synced OR Google Classroom synced (OR logic, not additive). Checks `student_integration_links` table for ACTIVE status integrations of type GOOGLE_CALENDAR or GOOGLE_CLASSROOM.

**Component 2 - Engagement ("The OR Rule")** (0 or 5 points): Award 5 points if EITHER manual session log rate exceeds 0.8 (currently defaulted to 0 as placeholder) OR `bio_video_url` field is not null/empty (tutor uploaded "Credibility Clip" intro video).

**Rationale**: Lessonspace-specific metric removed to remain platform-agnostic. Rewards tutors for either diligent session logging OR profile video engagement.

**RPC Function**: `get_digital_stats(user_id UUID)` returns TABLE with Google integration booleans and engagement metrics.

### Bucket 6: Social Impact (10 raw points) - NEW v5.9

**Component 1 - Availability Bonus** (0 or 5 points): Award 5 points if `profiles.available_free_help = TRUE`. This indicates tutor enabled "Offer Free Help" toggle in account settings and maintains Redis heartbeat presence for Free Help Now feature discoverability.

**Component 2 - Delivery Bonus** (0-5 points progressive): Award 1 point per completed free help session, capped at 5 points maximum. Formula: `Math.min(completed_free_sessions_count, 5)`. Counts bookings where `type = 'free_help'` AND `status = 'Completed'` AND listing belongs to tutor.

**Rationale**: Aligns platform incentives with social mission to democratize education. Creates virtuous cycle where community contribution drives reputation which drives paid business growth. Cap at 5 sessions prevents gaming via excessive free session volume.

**Integration**: Reads from Free Help Now feature (v5.9) which provides Redis heartbeat system (5-minute TTL), marketplace badge display, and 30-minute free session booking infrastructure.

**RPC Function**: `get_performance_stats(user_id UUID)` includes `completed_free_sessions_count` column (added in Migration 116). Free sessions explicitly excluded from `completed_sessions` count to prevent double-counting across Performance and Social Impact buckets.

---

## Database Schema Essentials

### Core Tables

**profiles.caas_score** (INTEGER): Denormalized score column added in v5.5 for instant read access without JOINs. Auto-synced via `sync_caas_score_to_profile()` trigger when `caas_scores` table updates. Indexed for marketplace ranking queries.

**caas_scores** (audit trail): Stores detailed score records with `total_score` INTEGER, `score_breakdown` JSONB, `role_type` TEXT, `calculated_at` TIMESTAMPTZ, and `calculation_version` TEXT. Primary key on `profile_id`. JSONB allows querying specific bucket scores for analytics.

**caas_recalculation_queue** (event queue): Stores `profile_id` UUID needing recalculation with UNIQUE constraint preventing duplicate entries. Cron worker processes oldest 100 rows every 10 minutes, calculates scores, then deletes processed rows.

### RPC Functions (PostgreSQL)

Three RPC functions aggregate data for tutor scoring: `get_performance_stats(user_id UUID)` for Buckets 1 and 6, `get_network_stats(user_id UUID)` for Bucket 3, and `get_digital_stats(user_id UUID)` for Bucket 5. All functions return TABLE types (arrays) requiring extraction of first element in TypeScript: `networkResult.value.data[0]`. Use Promise.allSettled for graceful degradation if RPC fails, falling back to default stats objects defined in types.ts.

**Performance Benefit**: RPC functions reduce latency from 425ms (separate queries) to 95ms (single aggregated call) by offloading complex JOINs to PostgreSQL aggregation engine.

---

## Strategy Pattern Implementation

### File Structure

Service layer located at `apps/web/src/lib/services/caas/` contains `index.ts` (main CaaS service with calculate and queue management), `types.ts` (TypeScript interfaces and defaults), and `strategies/` subdirectory with `tutor.ts` (TutorCaaSStrategy class), `client.ts` (ClientCaaSStrategy placeholder), and `agent.ts` (AgentCaaSStrategy placeholder).

### ICaaSStrategy Interface

All strategies implement `calculate(userId: string, supabase: SupabaseClient): Promise<CaaSScoreData>` method. Return type includes `total` (normalized score), `breakdown` (object with bucket names and raw scores), and optional `gate` field for rejection reasons.

### TutorCaaSStrategy v5.9

**Step 1 - Safety Gate**: Fetch profile with role_details INNER JOIN, check `identity_verified` boolean, return score 0 if false.

**Step 2 - Fetch Metrics**: Use Promise.allSettled to call three RPC functions in parallel (get_network_stats, get_performance_stats, get_digital_stats), extract first array element from each result, fall back to default stats if RPC fails.

**Step 3 - Calculate Buckets**: Call six private methods (calcPerformance, calcQualifications, calcNetwork, calcSafety, calcDigital, calcSocialImpact), each returns 0 to max points for that bucket.

**Step 4 - Normalize**: Sum raw bucket scores (0-110 range), apply normalization formula `Math.round((rawTotal / 110) * 100)` to convert to 0-100 display range.

**Step 5 - Return**: Return object with normalized `total` and `breakdown` containing raw bucket scores and calculation version identifier.

---

## API Routes

**GET /api/caas/[profile_id]**: Returns cached score for profile from `profiles.caas_score` column. Public access allowed (scores are public data). Response format includes `score` integer and `breakdown` object with bucket details.

**POST /api/caas/calculate**: Calculates score manually for specific profile (admin only). Bypasses queue for immediate recalculation. Useful for testing or admin "Recalculate Now" button.

**POST /api/caas-worker**: Processes recalculation queue in batches of 100 profiles. Protected by API key authentication, only callable by Vercel Cron or equivalent scheduler. Returns summary with processed count, failed count, average calculation time, and remaining queue length.

---

## Common AI Assistant Tasks

### Adding a New Bucket Component

When adding new component to existing bucket, update private calculation method in TutorCaaSStrategy (e.g., `calcSocialImpact()`), fetch required data via existing RPC function or add new RPC if needed, ensure logic matches design documentation formulas, update `calculation_version` string to track algorithm changes, and test with representative tutor profiles covering edge cases.

### Modifying RPC Function Return Type

When changing RPC function signature, update TypeScript interface in `types.ts` (e.g., `PerformanceStats`), update default fallback object matching new interface, modify PostgreSQL function in migrations directory using DROP FUNCTION and CREATE OR REPLACE pattern, update TutorCaaSStrategy to use new fields, and increment `calculation_version` to identify scores using new formula.

### Creating Queue Trigger

When adding new event that should trigger recalculation, create PostgreSQL trigger on relevant table (reviews, bookings, profiles, etc.), trigger should call `enqueue_caas_recalculation()` function which inserts `profile_id` into queue with ON CONFLICT DO NOTHING to prevent duplicates, and trigger should only fire for role types using CaaS (check `role_type` field where applicable).

### Debugging Score Discrepancies

When investigating unexpected scores, query `caas_scores.score_breakdown` JSONB to see raw bucket values, check `calculation_version` field to verify algorithm version, compare against manual calculation using RPC functions directly via psql, verify trigger fired by checking `caas_recalculation_queue` for profile_id insertion, and check cron worker logs for calculation errors or RPC function failures.

---

## Code Examples Location

For detailed code examples, SQL migrations, and implementation snippets, refer to the Implementation document at [caas-implementation-v2.md](./caas-implementation-v2.md). The prompt document intentionally avoids code blocks to maintain focus on conceptual understanding and AI assistant guidance.

---

## Security Considerations

**Known Vulnerabilities**: v5.5 security audit identified Sybil attack risk in Network bucket (unverified connections counted), credential ceiling issue (flat degree scoring alienates PhD tutors), and client pay-to-win bias (booking volume without negative signal deductions). Hardening roadmap planned for v5.6 includes verified connection filtering, context-aware credential weighting, and negative signal deductions for client scoring.

**AI Assistant Warning**: When generating code for Network bucket, DO NOT trust connection counts without verification checks. Future versions will require `identity_verified = TRUE` for connected users and `CONFIRMED` status with 7-day age minimum. When modifying credential scoring, consider teaching level context (GCSE flat vs University tiered). When implementing client scoring, include negative signal deductions (late cancellations, disputes, blocks).

---

## Version History and Migration Notes

**v5.5 → v5.9 Migration**: Added `profiles.caas_score` INTEGER column with INDEX for marketplace ranking, created `sync_caas_score_to_profile()` trigger function for auto-sync, added `available_free_help` BOOLEAN to profiles table, updated `get_performance_stats()` RPC to return `completed_free_sessions_count` INTEGER, implemented `calcSocialImpact()` method in TutorCaaSStrategy, changed total from 100 to 110 raw points with normalization formula, updated TypeScript types to include `social_impact` in breakdown, removed Lessonspace-specific metrics from Digital bucket, backfilled existing 8 scores to new column, and standardized all terminology to `caas_score` (zero occurrences of deprecated `credibility_score`).

**Breaking Changes**: Scores decreased approximately 9% due to normalization (55/100 old → 50/100 new), but relative rankings preserved. JOIN logic removal in UserProfileContext reduced code from 45 to 15 lines (80% reduction). All queries now read directly from `profiles.caas_score` column instead of LEFT JOIN to `caas_scores` table.

---

**Document Version**: v5.9
**Last Reviewed**: 2025-12-15
**Next Review**: 2026-01-15
**Maintained By**: Trust & Safety Team + Backend Engineering
**Feedback**: trust-safety@tutorwise.com
