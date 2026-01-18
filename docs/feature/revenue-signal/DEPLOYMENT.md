# Revenue Signal - Deployment Guide

**Feature:** Blog Attribution & Demand Orchestrator (Phase 1-3)
**Migration:** Migration 187 (Signal Events & Multi-Touch Attribution)
**Last Updated:** 2026-01-18
**Status:** ✅ Deployed to Production

---

## Table of Contents

1. [Overview](#overview)
2. [Deployment Checklist](#deployment-checklist)
3. [Database Migrations](#database-migrations)
4. [Environment Variables](#environment-variables)
5. [Known Issues & Resolutions](#known-issues--resolutions)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedure](#rollback-procedure)

---

## Overview

The Revenue Signal system tracks how blog content drives marketplace conversions through:
- Event-based attribution tracking (`signal_events` table)
- Multi-touch attribution models (First-Touch, Last-Touch, Linear)
- Signal journey tracking with `signal_id` (distribution vs. organic traffic)
- Admin dashboard at `/admin/blog/orchestrator`

**Key Dependencies:**
- ✅ PostgreSQL (Supabase) - **Required**
- ⚠️ Redis (Upstash) - **Optional** (Free Help Now feature only)
- ✅ Next.js 14 (App Router)
- ✅ React Query (TanStack)

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Review Migration 187** (`tools/database/migrations/187_update_rpcs_for_signal_events.sql`)
- [ ] **Verify database credentials** (`.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] **Check admin role configuration** (profiles table uses `roles` text[] array, not `admin_role` boolean)
- [ ] **Confirm existing tables** (Verify Week 1 tables: `signal_events`, `signal_metrics`, `signal_distributions`, `signal_experiments`)
- [ ] **Run pre-migration verification** (see Database Migrations section below)

### Deployment

- [ ] **Apply Migration 187 to production database** (updates 4 RPCs + adds 2 new RPCs)
- [ ] **Deploy frontend code** (commits up to `8bd808a5` or later)
- [ ] **Verify Vercel build succeeds** (should pass even without Redis)
- [ ] **Check API routes are accessible** (`/api/admin/blog/orchestrator/*`)

### Post-Deployment

- [ ] **Verify dashboard loads** (`https://[your-domain]/admin/blog/orchestrator`)
- [ ] **Test each tab** (Overview, Top Articles, Conversion Funnel, Listing Visibility, Signal Journeys, Attribution Models)
- [ ] **Check API responses** (stats, top-articles, listings, journey, attribution)
- [ ] **Monitor error logs** (Vercel/Supabase for any RPC errors)
- [ ] **(Optional) Configure Redis** (see Known Issues section for options)

---

## Database Migrations

### Migration 187: Update RPCs for Signal Events

**Purpose:** Updates existing RPCs to use `signal_events` table + adds journey tracking RPCs

**File:** `tools/database/migrations/187_update_rpcs_for_signal_events.sql`

**What it does:**
1. **Updates 4 existing RPCs:**
   - `get_article_performance_summary` - Adds `signal_count` (journey tracking)
   - `get_conversion_funnel` - Uses `signal_events` instead of `blog_attribution_events`
   - `get_blog_assisted_listings` - Uses `signal_events` for attribution
   - `get_time_to_conversion_distribution` - Uses `signal_events` for time tracking

2. **Creates 2 new RPCs:**
   - `get_signal_journey(p_signal_id TEXT)` - Traces complete user journey by signal_id
   - `get_attribution_comparison(p_days INT)` - Compares First-Touch, Last-Touch, and Linear attribution models

**Pre-Migration Verification:**

```sql
-- 1. Verify Week 1 tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('signal_events', 'signal_metrics', 'signal_distributions', 'signal_experiments');

-- Expected: All 4 tables exist

-- 2. Verify existing RPCs exist
SELECT proname FROM pg_proc
WHERE proname IN (
  'get_article_performance_summary',
  'get_conversion_funnel',
  'get_blog_assisted_listings',
  'get_time_to_conversion_distribution'
);

-- Expected: All 4 functions exist

-- 3. Check signal_events count
SELECT COUNT(*) FROM signal_events;

-- Expected: 0 or more (depends on if events have been tracked yet)
```

**Running the Migration:**

```bash
# Connect to production database
psql "postgresql://[user]:[password]@[host]:5432/[database]?sslmode=require"

# Run migration file
\i tools/database/migrations/187_update_rpcs_for_signal_events.sql

# Verify new RPCs were created
SELECT proname FROM pg_proc WHERE proname IN ('get_signal_journey', 'get_attribution_comparison');

# Expected: Both functions exist
```

**Critical Fix Applied:**

⚠️ **Bug in original migration:** Used `b.total_amount` instead of `b.amount` (5 occurrences)

✅ **Fixed in commit `2135939c`:** Replaced all instances with correct column name

**Post-Migration Verification:**

```sql
-- Test updated RPC (should not error)
SELECT * FROM get_article_performance_summary(30, 7);

-- Test new RPC (should return empty if no journeys yet)
SELECT * FROM get_signal_journey('test_signal_id');

-- Test attribution comparison (should return 3 rows: first_touch, last_touch, linear)
SELECT * FROM get_attribution_comparison(30);
```

---

## Environment Variables

### Required Variables (Vercel)

⚠️ **CRITICAL:** These must be set in **Vercel Dashboard** → **Project Settings** → **Environment Variables**

```bash
# Supabase (Required for Signal Migration)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site URL (CRITICAL - Fixed on 2026-01-18, commit 887c82cc)
NEXT_PUBLIC_SITE_URL=https://tutorwise.vercel.app
# IMPORTANT: Must be a static value, NOT shell syntax
# Previous value: "${VERCEL_URL:-http://localhost:3000}\n" (caused build failure)
# Set for: Production, Preview
# Used by: Blog Open Graph meta tags, sitemaps, email links, OAuth (23 files)

# Redis Cloud (Required for Free Help Now feature)
REDIS_URL=redis://default:vLkOAsjTC2jQz6Ysld4Op47nJkV2Wqu5@redis-17620.c338.eu-west-2-1.ec2.redns.redis-cloud.com:17620
# Set for: Production, Preview, Development
# Used by: Tutor online presence tracking
# Note: Migrated from Upstash on 2026-01-18 (commit bd6ba34c)

# Google Analytics (Optional but recommended)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Optional Variables

```bash
# Upstash Redis (DEPRECATED - NOT USED)
# UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
# UPSTASH_REDIS_REST_TOKEN=your-token
# NOTE: Migrated to ioredis with Redis Cloud on 2026-01-18
# Build warnings about missing Upstash credentials are expected and harmless
```

### Local Development (.env.local)

⚠️ **IMPORTANT:** The `.env.local` file is in `.gitignore` (contains secrets). Each developer must update manually.

**Required fix for line 7 (applied 2026-01-18):**

```bash
# BEFORE (broken - caused TypeError after Jan 15 SEO integration):
# NEXT_PUBLIC_SITE_URL=${VERCEL_URL:-http://localhost:3000}

# AFTER (fixed):
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Redis Cloud (for local dev)
REDIS_URL=redis://default:vLkOAsjTC2jQz6Ysld4Op47nJkV2Wqu5@redis-17620.c338.eu-west-2-1.ec2.redns.redis-cloud.com:17620

# Upstash (deprecated - leave empty)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

**Why this change was required:**

**Timeline:**
- **109 days ago:** Shell syntax added to Vercel: `"${VERCEL_URL:-http://localhost:3000}\n"`
- **Jan 14 (commit `0d05440`):** Build working, no issues
- **Jan 15 (commit `e49cb7b9`):** SEO integration added `new URL(process.env.NEXT_PUBLIC_SITE_URL)`
- **Jan 15-18:** Builds fail with `TypeError: Invalid URL`
- **Jan 18 (commit `887c82cc`):** Fixed Vercel env var to static value

**Root cause:**
1. Next.js doesn't support shell-style variable interpolation (`${VAR:-default}`)
2. Vercel stored the shell syntax as a literal string: `"${VERCEL_URL:-http://localhost:3000}\n"`
3. Before Jan 15, code just used the string (didn't parse it as URL)
4. Jan 15 SEO integration added `new URL()` which failed to parse the literal shell syntax
5. Static URL values work correctly and are clearer

**See also:** `1-Michael-ToDo/infrastructure-tasks.md` for complete rollback plan

---

## Known Issues & Resolutions

### Issue 1: Vercel Build Failure - Invalid NEXT_PUBLIC_SITE_URL

**Symptoms:**
```
TypeError: Invalid URL
input: '${VERCEL_URL:-http://localhost:3000}\n'
Error occurred prerendering page "/blog/[slug]"
```

**Root Cause:**
- `.env.local` line 7 uses shell-style variable interpolation: `NEXT_PUBLIC_SITE_URL=${VERCEL_URL:-http://localhost:3000}`
- Next.js doesn't support this syntax - it reads the value literally as a string
- Pages using `process.env.NEXT_PUBLIC_SITE_URL` fail during build's "Collecting page data" phase

**Resolution:**
✅ **Fixed on 2026-01-18** - Two-part fix required:

**Part 1: Local Development**
- Update `.env.local` line 7 to use static value:
  ```bash
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```
- Note: This change is NOT committed to git (`.env.local` is in `.gitignore`)

**Part 2: Vercel Production**
- Add environment variable in **Vercel Dashboard**:
  - Key: `NEXT_PUBLIC_SITE_URL`
  - Value: `https://tutorwise.vercel.app` (or actual domain)
  - Environments: Production, Preview

**Impact:**
- ✅ Build succeeds without "Invalid URL" error
- ✅ Blog pages generate correct Open Graph meta tags
- ✅ All features work correctly

---

### Issue 2: Vercel Build Failure - Redis Configuration

**Symptoms:**
```
[Upstash Redis] The 'url' property is missing or undefined
TypeError: Cannot read properties of undefined
```

**Root Cause:**
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are empty in `.env.local`
- Build fails when trying to initialize Upstash Redis client
- Redis is only used for Free Help Now feature (tutor online presence), NOT for Signal Migration

**Resolution:**
✅ **Fixed in commit `bd6ba34c`** - "feat: Switch from Upstash to ioredis for Redis Cloud compatibility"

**Changes made:**
1. **Temporary fix (commit `8bd808a5`):**
   - Made Redis client initialization optional
   - Returns `null` if credentials missing
   - Build succeeds but Free Help Now disabled

2. **Permanent fix (commit `bd6ba34c`):**
   - Replaced `@upstash/redis` with `ioredis` package
   - Updated Redis client to use traditional protocol (Redis Cloud)
   - Added connection pooling with retry strategy
   - Updated all Redis functions to use ioredis API

**Implementation:**
```typescript
// apps/web/src/lib/redis.ts
import Redis from 'ioredis';

export const redis = hasRedisCredentials
  ? new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true,
    })
  : null;
```

**Next Steps:**
1. ✅ Code deployed (commit `bd6ba34c`)
2. ⏭️ **Add `REDIS_URL` to Vercel environment variables** (see Environment Variables section)
3. ⏭️ Verify build succeeds in production
4. ⏭️ Test Free Help Now feature (tutor online status)

**Impact:**
- ✅ Uses existing Redis Cloud infrastructure (no new service needed)
- ✅ Free Help Now feature functional after adding `REDIS_URL` to Vercel
- ✅ All other features unaffected

**Trade-offs:**
- ⚠️ Not ideal for serverless (connection pooling overhead)
- ⚠️ May hit connection limits under high traffic
- ✅ Works immediately with existing infrastructure
- ✅ No additional service to manage

---

### Issue 2: Admin API 403 Errors

**Symptoms:**
```json
{
  "error": "Forbidden - Admin access required"
}
```

**Root Cause:**
- API routes were checking `admin_role` boolean column
- Actual schema uses `roles` text[] array

**Resolution:**
✅ **Fixed in commits prior to `8bd808a5`**

**Changes made:**
- Updated 5 API routes:
  - `/api/admin/blog/orchestrator/stats/route.ts`
  - `/api/admin/blog/orchestrator/top-articles/route.ts`
  - `/api/admin/blog/orchestrator/listings/route.ts`
  - `/api/admin/blog/orchestrator/journey/route.ts`
  - `/api/admin/blog/orchestrator/attribution/route.ts`

**Correct pattern:**
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('roles')
  .eq('id', user.id)
  .single();

if (!profile?.roles || !profile.roles.includes('admin')) {
  return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
}
```

---

### Issue 3: TypeScript Compilation Errors

**Symptoms:**
- Generic type errors in `ArticlesTable.tsx`
- StatusBadge invalid props
- BulkAction interface mismatch

**Resolution:**
✅ **Fixed in multiple commits before deployment**

**Files updated:**
- `apps/web/src/app/(admin)/admin/blog/components/ArticlesTable.tsx`
- `apps/web/src/app/components/blog/embeds/ListingGrid.tsx`
- `apps/web/src/app/components/blog/embeds/index.ts`
- `apps/web/src/app/components/blog/layout/BlogLeftSidebar.tsx`
- `apps/web/src/types/index.ts`

---

## Post-Deployment Verification

### 1. Dashboard Accessibility

```bash
# Test dashboard loads
curl -I https://[your-domain]/admin/blog/orchestrator

# Expected: 200 OK (or 401/403 if not logged in as admin)
```

### 2. API Endpoints

```bash
# Test stats endpoint
curl -X GET "https://[your-domain]/api/admin/blog/orchestrator/stats?days=30&attributionWindow=7" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: JSON response with performance and funnel data

# Test journey endpoint
curl -X GET "https://[your-domain]/api/admin/blog/orchestrator/journey?signal_id=test" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: JSON response (empty events array if no journey exists)

# Test attribution endpoint
curl -X GET "https://[your-domain]/api/admin/blog/orchestrator/attribution?days=30" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: JSON response with 3 models (first_touch, last_touch, linear)
```

### 3. Database RPCs

```sql
-- Test article performance summary
SELECT COUNT(*) FROM get_article_performance_summary(30, 7);

-- Test signal journey (should handle non-existent IDs gracefully)
SELECT * FROM get_signal_journey('nonexistent_id');

-- Test attribution comparison
SELECT model_type, attributed_articles, attributed_bookings
FROM get_attribution_comparison(30);
```

### 4. Frontend Functionality

**Manual testing:**
1. Navigate to `/admin/blog/orchestrator`
2. Verify all 6 tabs load:
   - Overview
   - Top Articles
   - Conversion Funnel
   - Listing Visibility
   - Signal Journeys
   - Attribution Models
3. Test date range selector (30/60/90 days)
4. Test attribution window selector (7/14/30 days)
5. Search for a signal journey (should show "No events found" if empty)
6. Check KPI cards show reasonable values (may be 0 if no events yet)

---

## Rollback Procedure

### If Migration 187 Fails

```sql
-- Rollback Migration 187 (restore old RPCs)

-- 1. Drop new RPCs
DROP FUNCTION IF EXISTS get_signal_journey(TEXT);
DROP FUNCTION IF EXISTS get_attribution_comparison(INT);

-- 2. Restore old RPC versions from Migration 182
-- (Run the original Migration 182 file again)
\i tools/database/migrations/182_create_blog_orchestrator_rpcs.sql
```

### If Frontend Build Fails

1. **Identify last known good commit:**
   ```bash
   git log --oneline -10
   ```

2. **Revert to previous commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Wait for Vercel redeployment**

### If API Routes Fail

1. **Check Vercel function logs:**
   - Go to Vercel Dashboard → Your Project → Functions
   - Look for 500 errors in API routes

2. **Common fixes:**
   - Verify environment variables are set in Vercel
   - Check Supabase RPC exists: `SELECT proname FROM pg_proc WHERE proname = 'get_article_performance_summary';`
   - Test RPC manually in Supabase SQL editor

---

## Monitoring After Deployment

### First 24 Hours

- [ ] Monitor Vercel function errors (should be 0)
- [ ] Check Supabase query performance (RPCs should return < 1s)
- [ ] Verify admin dashboard loads for all admin users
- [ ] Test signal event tracking (if blog posts are embedded)

### First Week

- [ ] Review signal event count: `SELECT COUNT(*) FROM signal_events;`
- [ ] Check attribution data accuracy (compare with Google Analytics)
- [ ] Monitor API response times (Vercel Analytics)
- [ ] Verify no Redis-related warnings in logs (unless intentionally disabled)

### First Month

- [ ] Analyze attribution model differences (First-Touch vs Last-Touch)
- [ ] Identify top performing articles
- [ ] Review conversion funnel drop-off points
- [ ] Decide on permanent Redis solution (if Free Help Now is needed)

---

## Support & Troubleshooting

### Common Questions

**Q: Why is the dashboard showing all zeros?**
A: No signal events have been tracked yet. Events are created when users interact with embedded components (TutorEmbed, ListingGrid) in blog articles.

**Q: Why am I getting 403 errors on API routes?**
A: Ensure your user profile has `'admin'` in the `roles` array (text[]). Check: `SELECT roles FROM profiles WHERE id = 'YOUR_USER_ID';`

**Q: Can I use the dashboard without Redis?**
A: Yes! Redis is only for Free Help Now (tutor online presence). All Signal Migration features (attribution, journeys, analytics) use PostgreSQL.

**Q: How do I test signal tracking locally?**
A: Create a blog article with embedded components, view it, click on components, and check `signal_events` table for new rows.

---

## Related Documentation

- **Main Spec:** `REVENUE-SIGNAL.md` - Complete feature specification
- **Migration Plan:** `SIGNAL-MIGRATION-PLAN.md` - Database migration strategy
- **Signal ID Spec:** `SIGNAL_ID_IMPLEMENTATION_PLAN.md` - Journey tracking details
- **Infrastructure Tasks:** `1-Michael-ToDo/infrastructure-tasks.md` - Redis configuration options

---

## Deployment History

| Date | Version | Migrations | Status | Notes |
|------|---------|------------|--------|-------|
| 2026-01-17 | v1.0 | Migration 187 | ✅ Success | Initial deployment with bug fix (b.amount) |
| 2026-01-18 | v1.1 | None | ✅ Success | Redis made optional (commit 8bd808a5) |

---

**End of Deployment Guide**
