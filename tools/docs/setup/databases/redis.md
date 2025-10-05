# Redis Cache Setup & Configuration Guide

## Overview

This guide explains Redis in-memory data store setup, authentication, connection management, and best practices for TutorWise's caching, session storage, and real-time features.

## What is Redis?

Redis (Remote Dictionary Server) is an in-memory key-value data store used for:
- **Caching**: Fast data retrieval (API responses, database queries)
- **Session Storage**: User sessions and authentication tokens
- **Pub/Sub**: Real-time messaging and notifications
- **Rate Limiting**: API throttling and request limiting
- **Queue Management**: Background job processing
- **Leaderboards**: Sorted sets for rankings and scores

## Installation Methods

### Method 1: Docker (Recommended for Development)

**Pros:**
- ✅ Quick setup
- ✅ Isolated environment
- ✅ Easy to reset
- ✅ Version control

**Setup:**
```bash
# Using docker-compose (included in project)
docker-compose up redis -d

# Or standalone Docker
docker run \
  --name redis-tutorwise \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7-alpine redis-server --requirepass your-password
```

### Method 2: Upstash (Cloud - Serverless)

**Pros:**
- ✅ Serverless (pay per request)
- ✅ Global edge caching
- ✅ Built-in Redis commands
- ✅ REST API included

**Setup:**
1. Go to https://console.upstash.com/
2. Create free account
3. Create database (select region)
4. Copy connection details
5. Add to `.env.local`

### Method 3: Redis Cloud (Production)

**Pros:**
- ✅ Fully managed
- ✅ High availability
- ✅ Auto-scaling
- ✅ Built-in backups

**Setup:**
1. Go to https://redis.com/try-free/
2. Create account
3. Create subscription (free tier available)
4. Create database
5. Download credentials

### Method 4: Local Installation (macOS/Linux)

**macOS:**
```bash
# Using Homebrew
brew install redis

# Start Redis
brew services start redis

# Or run in foreground
redis-server

# Test
redis-cli ping
# Should return: PONG
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install redis-server

# Start service
sudo systemctl start redis
sudo systemctl enable redis

# Test
redis-cli ping
```

## Authentication & Connection

### Connection URI Formats

```bash
# Local development (no password)
REDIS_URL=redis://localhost:6379

# Local development (with password)
REDIS_URL=redis://:password@localhost:6379

# Local development (with database selection)
REDIS_URL=redis://:password@localhost:6379/0

# Cloud (Redis Cloud, Upstash)
REDIS_URL=redis://default:password@redis-12345.cloud.redislabs.com:12345

# TLS/SSL (Production)
REDIS_URL=rediss://default:password@redis-12345.cloud.redislabs.com:12345

# With username (Redis 6+)
REDIS_URL=redis://username:password@localhost:6379
```

### Protocol Types

| Protocol | Encryption | Use Case |
|----------|-----------|----------|
| `redis://` | None | Local dev only |
| `rediss://` | TLS/SSL | Production |

**Key Rule:** Use `redis://` for local, `rediss://` for production

### Authentication Methods

#### 1. No Authentication (Development Only)

**⚠️ WARNING:** Only for local development!

```bash
# .env.local
REDIS_URL=redis://localhost:6379
```

```javascript
// JavaScript
import { createClient } from 'redis'

const client = createClient({
  url: 'redis://localhost:6379'
})
```

```python
# Python
import redis

client = redis.Redis(
    host='localhost',
    port=6379,
    decode_responses=True
)
```

#### 2. Password Authentication (requirepass)

**What it is:**
- Simple password-based auth
- Default for most Redis setups
- Set via `requirepass` config

**Setup:**
```bash
# .env.local
REDIS_URL=redis://:your-password@localhost:6379

# Or separate variables
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

**How to use:**
```javascript
// JavaScript
const client = createClient({
  url: process.env.REDIS_URL
  // or
  // socket: {
  //   host: process.env.REDIS_HOST,
  //   port: process.env.REDIS_PORT
  // },
  // password: process.env.REDIS_PASSWORD
})

await client.connect()
```

```python
# Python
import redis

client = redis.from_url(
    os.getenv('REDIS_URL'),
    decode_responses=True
)

# Or
client = redis.Redis(
    host=os.getenv('REDIS_HOST'),
    port=int(os.getenv('REDIS_PORT')),
    password=os.getenv('REDIS_PASSWORD'),
    decode_responses=True
)
```

#### 3. ACL Authentication (Redis 6+)

**What it is:**
- Access Control Lists with users and permissions
- Fine-grained access control
- Different users for different operations

**Setup:**
```bash
# In redis.conf or via command
ACL SETUSER alice on >password123 ~cached:* +get +set
ACL SETUSER bob on >secret456 allkeys +@all

# Connection
REDIS_URL=redis://alice:password123@localhost:6379
```

**How to use:**
```javascript
const client = createClient({
  url: 'redis://alice:password123@localhost:6379'
})
```

#### 4. TLS/SSL (Production)

**What it is:**
- Encrypted connection
- Required for production
- Supported by most cloud providers

**Setup:**
```bash
# .env.local
REDIS_URL=rediss://default:password@your-redis.cloud:12345

# Optional: TLS options
REDIS_TLS_CERT_PATH=/path/to/cert.pem
REDIS_TLS_KEY_PATH=/path/to/key.pem
REDIS_TLS_CA_PATH=/path/to/ca.pem
```

**How to use:**
```javascript
const client = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: true  // Verify cert
  }
})
```

## Environment Variables

### For Local Development (Docker)

```bash
# .env.local
REDIS_URL=redis://:tutorwise-dev-password@localhost:6379

# Or separate variables
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=tutorwise-dev-password
REDIS_DB=0

# Optional: Connection settings
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=10000
```

### For Production (Cloud)

```bash
# .env.local (git-ignored!)
REDIS_URL=rediss://default:prod-password@redis-12345.cloud.redislabs.com:12345

# Or for Upstash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token

# Optional: TLS verification
REDIS_TLS=true
REDIS_TLS_REJECT_UNAUTHORIZED=true
```

### For CI/CD

```bash
# GitHub Secrets / Vercel Environment Variables
REDIS_URL=${{ secrets.REDIS_URL }}

# For testing (use different DB or instance)
REDIS_TEST_URL=redis://localhost:6379/15  # Use DB 15 for tests
```

## Docker Compose Configuration

### Current Setup (docker-compose.yml)

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: tutorwise-redis
    ports:
      - "6379:6379"
    command: redis-server --requirepass tutorwise123  # ⚠️ Change this!
    volumes:
      - redis_data:/data
    networks:
      - tutorwise-network

volumes:
  redis_data:
```

### Recommended Security Improvements

```yaml
services:
  redis:
    image: redis:7-alpine
    container_name: tutorwise-redis
    ports:
      - "6379:6379"
    command: >
      redis-server
      --requirepass ${REDIS_PASSWORD}
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
      --appendonly yes
      --appendfsync everysec
    volumes:
      - redis_data:/data
      - ./tools/configs/redis.conf:/usr/local/etc/redis/redis.conf
    networks:
      - tutorwise-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

volumes:
  redis_data:
```

### Custom Configuration File (redis.conf)

```conf
# tools/configs/redis.conf

# Security
requirepass ${REDIS_PASSWORD}
protected-mode yes

# Network
bind 0.0.0.0
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Memory Management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1      # Save if 1 key changed in 900s
save 300 10     # Save if 10 keys changed in 300s
save 60 10000   # Save if 10000 keys changed in 60s
appendonly yes
appendfsync everysec

# Logging
loglevel notice
logfile /var/log/redis/redis.log

# Performance
databases 16
```

## Finding Your Credentials

### Method 1: Check .env.local

```bash
cat .env.local | grep REDIS
```

### Method 2: Docker Configuration

```bash
# Check command args
docker inspect tutorwise-redis | grep -A 5 Cmd

# Or docker-compose
docker-compose config | grep -A 5 redis
```

### Method 3: Cloud Provider Console

**Upstash:**
1. Go to https://console.upstash.com/
2. Select database
3. View connection details (REST URL & Token)

**Redis Cloud:**
1. Go to https://app.redislabs.com/
2. Select database
3. Click "Configuration"
4. Copy endpoint and password

### Method 4: Test Connection

```bash
# Local Redis
redis-cli ping
# Should return: PONG

# With password
redis-cli -a your-password ping

# Remote Redis
redis-cli -h your-redis.cloud -p 12345 -a your-password ping
```

## Common Issues & Solutions

### Issue 1: "Connection refused" or "ECONNREFUSED"

**Symptoms:**
```bash
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Causes:**
1. Redis is not running
2. Wrong port
3. Firewall blocking connection
4. Binding to wrong interface

**Solutions:**
1. **Check if Redis is running:**
   ```bash
   # Docker
   docker ps | grep redis
   docker-compose up redis -d

   # Local install
   redis-cli ping
   brew services list | grep redis
   ```

2. **Verify port:**
   ```bash
   # Check port 6379 is open
   lsof -i :6379

   # Or use netstat
   netstat -an | grep 6379
   ```

3. **Check Redis is listening:**
   ```bash
   # In redis-cli
   redis-cli
   CONFIG GET bind
   # Should show: 0.0.0.0 or 127.0.0.1
   ```

### Issue 2: "NOAUTH Authentication required"

**Symptoms:**
```bash
Error: NOAUTH Authentication required
```

**Causes:**
1. Password required but not provided
2. Wrong password
3. Password in wrong format

**Solutions:**
1. **Provide password in connection:**
   ```bash
   # CLI
   redis-cli -a your-password

   # In code
   REDIS_URL=redis://:your-password@localhost:6379
   ```

2. **Check password is set:**
   ```bash
   # In docker-compose or redis.conf
   requirepass your-password
   ```

3. **Disable auth (dev only!):**
   ```bash
   # In redis.conf
   # requirepass your-password  # Comment out
   ```

### Issue 3: "OOM command not allowed"

**Symptoms:**
```bash
Error: OOM command not allowed when used memory > 'maxmemory'
```

**Causes:**
1. Redis reached max memory limit
2. No eviction policy set
3. Memory leak in application

**Solutions:**
1. **Check memory usage:**
   ```bash
   redis-cli INFO memory
   ```

2. **Increase maxmemory:**
   ```conf
   # redis.conf or docker-compose
   maxmemory 512mb  # Increase from 256mb
   ```

3. **Set eviction policy:**
   ```conf
   # Remove least recently used keys
   maxmemory-policy allkeys-lru

   # Other options:
   # allkeys-lfu - Least frequently used
   # volatile-lru - LRU among keys with expiry
   # allkeys-random - Random eviction
   ```

4. **Clear old data:**
   ```bash
   # Flush specific DB
   redis-cli -n 0 FLUSHDB

   # Or flush all (⚠️ DANGER!)
   redis-cli FLUSHALL
   ```

### Issue 4: "Connection timeout"

**Symptoms:**
```bash
Error: Connection timeout
Error: Socket timeout
```

**Causes:**
1. Network latency
2. Redis is overloaded
3. Slow commands blocking
4. Wrong timeout settings

**Solutions:**
1. **Increase timeout:**
   ```javascript
   const client = createClient({
     url: process.env.REDIS_URL,
     socket: {
       connectTimeout: 10000,    // 10 seconds
       commandTimeout: 5000      // 5 seconds
     }
   })
   ```

2. **Check slow commands:**
   ```bash
   # Monitor slow queries
   redis-cli SLOWLOG GET 10

   # Set slow log threshold (microseconds)
   redis-cli CONFIG SET slowlog-log-slower-than 10000
   ```

3. **Avoid blocking commands:**
   ```bash
   # ❌ Don't use KEYS in production
   KEYS user:*

   # ✅ Use SCAN instead
   SCAN 0 MATCH user:* COUNT 100
   ```

## Setup Guide

### Step-by-Step: Local Development Setup

1. **Start Redis with Docker:**
   ```bash
   # Navigate to project root
   cd /Users/michaelquan/projects/tutorwise

   # Start Redis
   docker-compose up redis -d

   # Check logs
   docker-compose logs redis
   ```

2. **Test Connection:**
   ```bash
   # Test ping
   docker exec -it tutorwise-redis redis-cli -a tutorwise123 ping
   # Should return: PONG

   # Set and get a value
   docker exec -it tutorwise-redis redis-cli -a tutorwise123 SET test "Hello Redis"
   docker exec -it tutorwise-redis redis-cli -a tutorwise123 GET test
   ```

3. **Update .env.local:**
   ```bash
   # Edit .env.local
   REDIS_URL=redis://:tutorwise123@localhost:6379

   # Or use separate variables
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=tutorwise123
   ```

4. **Install Redis Client:**
   ```bash
   # For JavaScript/Node.js
   npm install redis

   # For Python/FastAPI
   pip install redis
   ```

5. **Test in Code:**

   **JavaScript:**
   ```javascript
   // test-redis.js
   import { createClient } from 'redis'

   const client = createClient({
     url: process.env.REDIS_URL
   })

   await client.connect()

   // Test operations
   await client.set('greeting', 'Hello Redis!')
   const value = await client.get('greeting')
   console.log(value)  // Hello Redis!

   // Set with expiry (TTL)
   await client.setEx('temp', 60, 'Expires in 60s')

   await client.disconnect()
   ```

   **Python:**
   ```python
   # test_redis.py
   import redis
   import os

   client = redis.from_url(
       os.getenv('REDIS_URL'),
       decode_responses=True
   )

   # Test operations
   client.set('greeting', 'Hello Redis!')
   value = client.get('greeting')
   print(value)  # Hello Redis!

   # Set with expiry (TTL)
   client.setex('temp', 60, 'Expires in 60s')

   client.close()
   ```

### Step-by-Step: Production Setup (Cloud)

**Option 1: Upstash (Serverless)**

1. **Create Upstash Database:**
   - Go to https://console.upstash.com/
   - Click "Create Database"
   - Choose region (closest to users)
   - Select free tier
   - Click "Create"

2. **Get Connection Details:**
   - Copy REST URL
   - Copy REST Token
   - Or copy Redis URL (for standard client)

3. **Add to Environment:**
   ```bash
   # For REST API
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token

   # For standard Redis client
   REDIS_URL=rediss://default:your-password@your-redis.upstash.io:6379
   ```

4. **Use REST API (Serverless-friendly):**
   ```javascript
   import { Redis } from '@upstash/redis'

   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL,
     token: process.env.UPSTASH_REDIS_REST_TOKEN
   })

   await redis.set('key', 'value')
   const value = await redis.get('key')
   ```

**Option 2: Redis Cloud**

1. **Create Redis Cloud Instance:**
   - Go to https://redis.com/try-free/
   - Create account
   - Create subscription
   - Create database

2. **Get Connection String:**
   - Go to database configuration
   - Copy endpoint (host:port)
   - Copy password

3. **Add to Environment:**
   ```bash
   REDIS_URL=rediss://default:password@redis-12345.cloud.redislabs.com:12345
   ```

### Step-by-Step: Caching Strategy

1. **Cache API Responses:**
   ```javascript
   // Cache GET requests for 5 minutes
   async function getCachedData(key, fetchFn, ttl = 300) {
     const cached = await redis.get(key)
     if (cached) return JSON.parse(cached)

     const fresh = await fetchFn()
     await redis.setEx(key, ttl, JSON.stringify(fresh))
     return fresh
   }

   // Usage
   const courses = await getCachedData(
     'courses:all',
     () => fetch('/api/courses').then(r => r.json()),
     300  // 5 minutes
   )
   ```

2. **Session Storage:**
   ```javascript
   // Store user session
   async function createSession(userId, sessionData) {
     const sessionId = crypto.randomUUID()
     const key = `session:${sessionId}`

     await redis.setEx(
       key,
       3600,  // 1 hour expiry
       JSON.stringify({ userId, ...sessionData })
     )

     return sessionId
   }

   // Retrieve session
   async function getSession(sessionId) {
     const data = await redis.get(`session:${sessionId}`)
     return data ? JSON.parse(data) : null
   }
   ```

3. **Rate Limiting:**
   ```javascript
   // Limit API requests (10 per minute)
   async function checkRateLimit(userId) {
     const key = `ratelimit:${userId}`
     const count = await redis.incr(key)

     if (count === 1) {
       await redis.expire(key, 60)  // Set 60s expiry on first request
     }

     return count <= 10  // Allow if under limit
   }
   ```

4. **Pub/Sub Messaging:**
   ```javascript
   // Publisher
   await redis.publish('notifications', JSON.stringify({
     type: 'new_message',
     userId: '123',
     message: 'Hello!'
   }))

   // Subscriber
   const subscriber = redis.duplicate()
   await subscriber.connect()

   await subscriber.subscribe('notifications', (message) => {
     const data = JSON.parse(message)
     console.log('Received:', data)
   })
   ```

## Security Best Practices

### ✅ Do's

- ✅ Always use password authentication
- ✅ Use TLS/SSL in production (`rediss://`)
- ✅ Store credentials in `.env.local` (git-ignored)
- ✅ Use different passwords for dev/prod
- ✅ Set maxmemory limits
- ✅ Configure eviction policy
- ✅ Enable persistence (RDB/AOF)
- ✅ Set key expiration (TTL) where appropriate
- ✅ Use connection pooling
- ✅ Close connections properly
- ✅ Monitor memory usage
- ✅ Use SCAN instead of KEYS
- ✅ Implement rate limiting
- ✅ Back up production data

### ❌ Don'ts

- ❌ Never disable authentication in production
- ❌ Don't commit passwords to git
- ❌ Don't use KEYS command in production
- ❌ Don't ignore maxmemory warnings
- ❌ Don't store sensitive data unencrypted
- ❌ Don't use blocking commands (BLPOP) without timeout
- ❌ Don't forget to close connections
- ❌ Don't use same instance for cache and critical data
- ❌ Don't skip setting TTL on temporary data
- ❌ Don't expose Redis port publicly
- ❌ Don't use FLUSHALL in production
- ❌ Don't ignore slow query logs

## Connection Best Practices

### JavaScript/Node.js

```javascript
// Good: Singleton pattern with error handling
class RedisService {
  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error('Max retries reached')
          return Math.min(retries * 100, 3000)
        }
      }
    })

    this.client.on('error', (err) => console.error('Redis error:', err))
    this.client.on('connect', () => console.log('Redis connected'))
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect()
    }
  }

  async disconnect() {
    if (this.client.isOpen) {
      await this.client.disconnect()
    }
  }

  async get(key) {
    await this.connect()
    return await this.client.get(key)
  }

  async set(key, value, ttl = null) {
    await this.connect()
    if (ttl) {
      return await this.client.setEx(key, ttl, value)
    }
    return await this.client.set(key, value)
  }
}

export const redis = new RedisService()
```

### Python/FastAPI

```python
# Good: Context manager with connection pool
import redis.asyncio as redis
from contextlib import asynccontextmanager

class RedisService:
    def __init__(self):
        self.pool = redis.ConnectionPool.from_url(
            os.getenv('REDIS_URL'),
            max_connections=10,
            decode_responses=True
        )

    @asynccontextmanager
    async def client(self):
        client = redis.Redis(connection_pool=self.pool)
        try:
            yield client
        finally:
            await client.close()

    async def get(self, key: str):
        async with self.client() as client:
            return await client.get(key)

    async def set(self, key: str, value: str, ttl: int = None):
        async with self.client() as client:
            if ttl:
                return await client.setex(key, ttl, value)
            return await client.set(key, value)

    async def close(self):
        await self.pool.disconnect()

# Use dependency injection
redis_service = RedisService()
```

## Useful Redis Commands

### Monitoring
```bash
# Monitor all commands in real-time
redis-cli MONITOR

# Get server info
redis-cli INFO

# Check memory usage
redis-cli INFO memory

# Get slow queries
redis-cli SLOWLOG GET 10

# Check connected clients
redis-cli CLIENT LIST
```

### Debugging
```bash
# Search for keys (⚠️ use SCAN in production)
redis-cli KEYS "user:*"

# Better: Use SCAN
redis-cli --scan --pattern "user:*"

# Get key type
redis-cli TYPE mykey

# Get TTL (time to live)
redis-cli TTL mykey

# Delete keys
redis-cli DEL key1 key2 key3
```

### Maintenance
```bash
# Save database to disk
redis-cli SAVE

# Background save
redis-cli BGSAVE

# Get last save time
redis-cli LASTSAVE

# Flush specific DB
redis-cli -n 0 FLUSHDB

# Flush all databases (⚠️ DANGER!)
redis-cli FLUSHALL
```

## Troubleshooting Checklist

When encountering Redis issues:

- [ ] Verify Redis is running: `docker ps | grep redis`
- [ ] Test connection: `redis-cli ping`
- [ ] Check password: `redis-cli -a password ping`
- [ ] Confirm URL format in `.env.local`
- [ ] Check Docker logs: `docker logs tutorwise-redis`
- [ ] Verify port 6379 is not blocked
- [ ] Check memory usage: `redis-cli INFO memory`
- [ ] Review slow queries: `redis-cli SLOWLOG GET 10`
- [ ] Ensure maxmemory is set appropriately
- [ ] Check eviction policy is configured
- [ ] Verify connection pool size
- [ ] Test with redis-cli directly

## Related Documentation

- [Neo4j Setup Guide](./NEO4J-SETUP-README.md)
- [Cloud Services Setup](./CLOUD-SERVICES-SETUP.md)
- [Docker Compose Reference](../../docker-compose.yml)
- [Redis Official Docs](https://redis.io/docs/)
- [Redis Commands Reference](https://redis.io/commands/)

## Summary

**The Golden Rules:**

1. **Always use password authentication** - Even in development
2. **Use TLS in production** - `rediss://` protocol
3. **Set maxmemory and eviction policy** - Prevent OOM errors
4. **Use TTL on temporary data** - Automatic cleanup
5. **Close connections properly** - Prevent leaks
6. **Never use KEYS in production** - Use SCAN instead

**Quick Setup:**
```bash
# 1. Start Redis
docker-compose up redis -d

# 2. Test connection
docker exec -it tutorwise-redis redis-cli -a tutorwise123 ping

# 3. Add to .env.local
REDIS_URL=redis://:your-password@localhost:6379

# 4. Test in code
npm install redis
# or
pip install redis
```
