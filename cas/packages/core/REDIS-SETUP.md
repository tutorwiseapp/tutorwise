# Redis Message Bus Setup Guide

## Overview

The CAS platform now supports **two message bus implementations**:

1. **InMemoryMessageBus** (default) - No external dependencies, production-ready for single-process
2. **RedisMessageBus** (new) - For distributed deployments with task persistence

## When to Use Redis

✅ **Use Redis when:**
- Running multiple CAS instances across servers
- Need task persistence (survive process restarts)
- High-volume task queuing with load balancing
- Distributed deployment

❌ **Stay with InMemory when:**
- Single-process deployment
- Low to medium task volume
- Simpler deployment without external dependencies

---

## Setup Instructions

### Option 1: Upstash Redis (Recommended)

**Why Upstash:**
- ✅ No expiration - databases don't auto-delete
- ✅ No inactivity deletion
- ✅ Serverless pricing - pay only for usage
- ✅ 10,000 commands/day free tier
- ✅ Built into Vercel

#### Step 1: Create Upstash Database

**Via Vercel (Easiest):**
```
1. Go to Vercel Dashboard
2. Select your project (tutorwise)
3. Go to Storage tab
4. Click "Create Database"
5. Select "Upstash Redis"
6. Click "Continue"
7. Name it "tutorwise-redis"
8. Click "Create"
```

**Or via Upstash directly:**
```
1. Go to https://upstash.com
2. Sign up / Log in
3. Click "Create database"
4. Name: tutorwise-redis
5. Region: Choose closest to your app
6. Click "Create"
7. Copy REST URL and REST Token
```

#### Step 2: Add Credentials to `.env.local`

```bash
# Upstash Redis (for CAS Message Bus)
UPSTASH_REDIS_REST_URL="https://your-db-name.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXXXabc...your-token-here"

# Choose message bus type (optional, defaults to 'memory')
CAS_MESSAGE_BUS="redis"  # or "memory"
```

#### Step 3: Restart Your Application

```bash
npm run dev
```

---

### Option 2: Redis Cloud (Free Tier)

**⚠️ Warning:** Redis Cloud free tier has limitations:
- Expires after 30-90 days
- May delete inactive databases
- Not recommended for production

If you still want to use it:

```bash
# Redis Cloud
REDIS_URL="redis://default:password@host:port"

# Use Redis
CAS_MESSAGE_BUS="redis"
```

---

## Usage

### Default (In-Memory)

```typescript
// No configuration needed - uses InMemoryMessageBus by default
const runtime = new CustomAgentRuntime();
await runtime.initialize();
```

### With Redis

```typescript
// Method 1: Via environment variable
// Set CAS_MESSAGE_BUS="redis" in .env.local
const runtime = new CustomAgentRuntime();
await runtime.initialize();

// Method 2: Via config
const runtime = new CustomAgentRuntime({
  messageBus: 'redis',
  redisUrl: 'https://your-db.upstash.io',
  redisToken: 'your-token'
});
await runtime.initialize();

// Method 3: Pass existing Redis instance
import { Redis } from '@upstash/redis';
import { RedisMessageBus } from '@cas/core/messaging';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
});

const messageBus = new RedisMessageBus({ redis });
// ... use messageBus
```

---

## Testing

### Test InMemory Message Bus

```bash
# Already tested in Phase 3 & 4
npm run test:phase3-4
```

### Test Redis Message Bus

```bash
# Set credentials first
export UPSTASH_REDIS_REST_URL="https://..."
export UPSTASH_REDIS_REST_TOKEN="..."

# Run Redis-specific tests
npx tsx src/messaging/test-redis-bus.ts
```

---

## Features Comparison

| Feature | InMemoryMessageBus | RedisMessageBus |
|---------|-------------------|-----------------|
| **Setup** | None needed ✅ | Requires Upstash account |
| **External Deps** | None ✅ | Redis (Upstash) |
| **Latency** | Very low (in-process) ✅ | Low (network hop) |
| **Scalability** | Single process | Multi-process ✅ |
| **Task Persistence** | No (in-memory) | Yes (Redis) ✅ |
| **Cost** | Free ✅ | Free tier available |
| **Deployment** | Simpler ✅ | Slightly more complex |
| **Use Case** | Single server | Distributed ✅ |

---

## Redis Message Bus Implementation Details

### Task Queuing
- Uses Redis Lists (LPUSH/RPUSH for priority)
- Queue key format: `cas:queue:{agentId}`
- Auto-expires after 7 days

### Results Pub/Sub
- Uses Redis Lists with polling (Upstash REST doesn't support blocking pub/sub)
- Result key format: `cas:results:{agentId}`
- Auto-expires after 1 hour

### Streaming
- Uses Redis Lists for progress updates
- Stream key format: `cas:stream:{taskId}`
- Polls every 50ms for fast updates
- Auto-expires after 10 minutes

### Cancellation
- Uses Redis key/value
- Cancel key format: `cas:cancel:{taskId}`
- Auto-expires after 1 hour

---

## Troubleshooting

### Redis connection fails

```
Error: Failed to connect to Redis: ...
```

**Solution:**
1. Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
2. Verify credentials are correct
3. Test connection manually:
   ```bash
   curl https://your-db.upstash.io/ping \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

### Tasks not being received

**Solution:**
1. Check queue size: `await redis.getQueueSize('agentId')`
2. Verify agent ID matches
3. Check Redis subscription is active

### Performance issues

**Solution:**
1. Use priority queuing for important tasks
2. Increase polling interval if needed
3. Consider connection pooling for high load
4. Monitor Upstash dashboard for limits

---

## Migration Path

### From InMemory to Redis

```bash
# 1. Set up Upstash Redis (see setup instructions)

# 2. Add credentials to .env.local
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# 3. Switch to Redis
CAS_MESSAGE_BUS="redis"

# 4. Restart application
npm run dev

# That's it! No code changes needed.
```

### From Redis back to InMemory

```bash
# Just remove or change the environment variable
CAS_MESSAGE_BUS="memory"  # or remove this line entirely

# Restart
npm run dev
```

---

## Production Recommendations

1. **Use Upstash Redis** (not Redis Cloud free tier)
2. **Enable monitoring** in Upstash dashboard
3. **Set up alerts** for usage limits
4. **Test failover** scenarios
5. **Monitor queue sizes** to prevent buildup
6. **Set appropriate expiration times** for your use case

---

## Next Steps

1. Set up Upstash Redis account
2. Add credentials to `.env.local`
3. Run test: `npx tsx src/messaging/test-redis-bus.ts`
4. Switch to Redis: `CAS_MESSAGE_BUS="redis"`
5. Monitor performance in production

---

## Support

- Upstash Docs: https://docs.upstash.com/redis
- CAS Documentation: See `PHASE3-4-COMPLETE.md`
- Issues: https://github.com/anthropics/claude-code/issues
