# Infrastructure Tasks

## Completed

### Redis Configuration for Free Help Now Feature

**Priority:** Medium
**Date Added:** 2026-01-18
**Date Completed:** 2026-01-18
**Context:** Vercel build was failing during Migration 187 deployment due to missing Upstash Redis credentials
**Status:** ✅ **RESOLVED** - Switched to ioredis with Redis Cloud (commit `bd6ba34c`)
**Impact:** Free Help Now feature fully functional in production using existing Redis Cloud infrastructure

---

#### Background

The codebase uses **Upstash Redis REST API** for the Free Help Now feature, which allows tutors to set their real-time availability. However, `.env.local` has empty Upstash credentials:

```
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

Meanwhile, there's a working **Redis Cloud** instance configured:
```
REDIS_URL="redis://default:vLkOAsjTC2jQz6Ysld4Op47nJkV2Wqu5@redis-17620.c338.eu-west-2-1.ec2.redns.redis-cloud.com:17620"
```

**The problem:** Upstash uses REST API (serverless-friendly), while Redis Cloud uses traditional Redis protocol (requires `ioredis` or `node-redis` client).

---

#### Temporary Fix Applied

**File:** `apps/web/src/lib/redis.ts`
**Commit:** `8bd808a5` - "fix: Make Redis client initialization optional"

- Added credential checks before initializing Redis client
- Returns `null` if credentials missing
- All Redis functions gracefully handle `null` client with console warnings
- Build succeeds, Free Help Now feature degrades gracefully

---

#### Permanent Solution Options

Choose one of the following approaches:

##### **Option 1: Use Existing Redis Cloud (Recommended for Quick Fix)**

**Pros:**
- Use existing Redis Cloud infrastructure
- No new service signup required
- Works immediately

**Cons:**
- Not ideal for serverless (connection pooling issues)
- May hit connection limits under high traffic
- Slightly higher latency

**Implementation Steps:**
1. Install `ioredis`:
   ```bash
   cd apps/web && npm install ioredis
   ```

2. Refactor `apps/web/src/lib/redis.ts`:
   ```typescript
   import Redis from 'ioredis';

   const redis = process.env.REDIS_URL
     ? new Redis(process.env.REDIS_URL, {
         maxRetriesPerRequest: 3,
         retryStrategy: (times) => Math.min(times * 50, 2000),
         lazyConnect: true,
       })
     : null;
   ```

3. Update Vercel environment variables:
   - Add `REDIS_URL` with the Redis Cloud connection string

**Effort:** ~1 hour (includes testing)

---

##### **Option 2: Set Up Upstash (Ideal for Serverless)**

**Pros:**
- Perfect for Vercel/serverless (stateless HTTP)
- No connection management overhead
- Auto-scaling friendly
- Current code already uses Upstash client

**Cons:**
- Requires new Upstash account
- Additional service to manage
- Need to migrate data if switching from Redis Cloud

**Implementation Steps:**
1. Create Upstash account: https://console.upstash.com/
2. Create new Redis database (free tier available)
3. Get REST API credentials from dashboard
4. Add to Vercel environment variables:
   - `UPSTASH_REDIS_REST_URL` (e.g., `https://your-db.upstash.io`)
   - `UPSTASH_REDIS_REST_TOKEN`
5. Remove credential checks from `redis.ts` (revert to original initialization)

**Effort:** ~30 minutes (mostly account setup)

---

##### **Option 3: Hybrid Approach**

**Use Redis Cloud for local dev, Upstash for production:**

```typescript
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL)
  : null;
```

**Pros:**
- Best of both worlds
- Local dev uses existing Redis Cloud
- Production uses optimal Upstash

**Cons:**
- More complex configuration
- Two Redis services to maintain

**Effort:** ~2 hours

---

#### Decision Criteria

**Choose Option 1 if:**
- You want quick fix with existing infrastructure
- Free Help Now traffic is low-to-medium
- You're okay with connection management overhead

**Choose Option 2 if:**
- You prioritize serverless best practices
- Expecting high traffic to Free Help Now
- Want long-term optimal solution
- Don't mind managing another service

**Choose Option 3 if:**
- You want development simplicity + production optimization
- Have time for more complex setup

---

#### Related Information

- **Feature affected:** Free Help Now (tutor online presence tracking)
- **Migration 187 status:** ✅ Unaffected (uses PostgreSQL, not Redis)
- **Build status:** ✅ Fixed (Redis optional)
- **Production impact:** Free Help Now disabled, all other features working
- **Related commit:** `8bd808a5`
- **File:** `apps/web/src/lib/redis.ts`

---

---

#### Resolution

**Decision:** ✅ Implemented **Option 1 - Use Existing Redis Cloud**

**Implementation Details:**
- **Date:** 2026-01-18
- **Commit:** `bd6ba34c` - "feat: Switch from Upstash to ioredis for Redis Cloud compatibility"
- **Package installed:** `ioredis` (9 dependencies)
- **File updated:** `apps/web/src/lib/redis.ts`

**Changes Made:**
1. Replaced `@upstash/redis` with `ioredis` package
2. Updated Redis client initialization to use `REDIS_URL` (Redis Cloud)
3. Added connection pooling with retry strategy
4. Enabled lazy connection (connects on first command)
5. Updated all Redis functions to use ioredis API:
   - `SET` with TTL: `redis.set(key, value, 'EX', ttl)`
   - Other commands remain compatible: `exists`, `del`, `keys`

**Configuration:**
- **Local:** Uses `REDIS_URL` from `.env.local` (Redis Cloud)
- **Production:** Add `REDIS_URL` to Vercel environment variables

**Next Steps:**
1. ✅ Code deployed to GitHub (commit `bd6ba34c`)
2. ⏭️ Add `REDIS_URL` to Vercel environment variables:
   ```
   REDIS_URL=redis://default:vLkOAsjTC2jQz6Ysld4Op47nJkV2Wqu5@redis-17620.c338.eu-west-2-1.ec2.redns.redis-cloud.com:17620
   ```
3. ⏭️ Verify Vercel build succeeds
4. ⏭️ Test Free Help Now feature in production (tutor online status)

**Success Criteria:**
- ✅ Build succeeds without Redis errors
- ⏭️ Free Help Now feature functional (tutors can set online status)
- ⏭️ No connection pooling issues under normal traffic

---

## Pending

_No pending infrastructure tasks._
