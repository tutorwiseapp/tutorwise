# 🚀 TutorWise Quick Start Guide

## When Starting a Claude Code Session

### Step 1: Initialize Environment

```bash
npm run claude:login
```

This will:
- ✅ Load all environment variables
- ✅ Validate configurations
- ✅ Show service status
- ✅ Offer to start services

### Step 2: Choose Your Option

**Option 1: Start All Services Automatically** ⭐ Recommended
- Starts Neo4j, Redis, Backend API, Frontend Web
- Everything ready in ~30 seconds

**Option 2: Interactive Service Manager**
- Fine-grained control over each service
- Start/stop individual services
- Monitor status in real-time

**Option 3: Core Services Only**
- Just databases and main services
- Skip background tasks

**Option 4: Skip**
- Manual service management

## 📊 Quick Commands

### Service Management
```bash
# Interactive manager
npm run startup

# View status
npm run startup:status

# Start everything
npm run startup:start-all

# Stop everything
npm run startup:stop-all

# Restart all
npm run startup:restart-all
```

### Development
```bash
# Frontend only
npm run dev:web

# Backend only
npm run dev:api

# Run tests
npm run test:e2e
npm run test:unit

# Visual tests
npm run visual-test
```

### Integrations
```bash
# Sync Confluence
npm run sync:confluence

# Sync Google Docs
npm run sync:google-docs

# Test Jira
npm run jira:test-tasks

# Test Calendar
npm run calendar:test-tasks
```

### CAS (Contextual Autonomous System)
```bash
# Generate context
npm run cas:generate

# Setup CAS
npm run cas:setup

# Update context
npm run cas:update
```

### Deployment
```bash
# Deploy backend to Railway
npm run deploy:railway

# Deploy frontend to Vercel (preview)
npm run deploy:vercel

# Deploy frontend to Vercel (production)
npm run deploy:vercel:prod
```

> 📖 **Setup Guides:**
> - [Railway Auth Setup](tools/docs/setup/cloud-services/railway.md) - Account Token required
> - [Vercel Auth Setup](tools/docs/setup/cloud-services/vercel.md) - User Access Token
> - [Supabase Auth Setup](tools/docs/setup/cloud-services/supabase.md) - Anon vs Service Role
> - [Stripe Auth Setup](tools/docs/setup/cloud-services/stripe.md) - Publishable vs Secret Keys

## 🔧 Service Status Table

When you run `npm run startup:status`, you'll see:

| Service | Port | Description | Status |
|---------|------|-------------|--------|
| Neo4j | 7687 | Graph Database | ● / ○ |
| Redis | 6379 | Cache Server | ● / ○ |
| Backend | 8000 | FastAPI | ● / ○ |
| Frontend | 3000 | Next.js | ● / ○ |

## 🌐 Access URLs

### Local Development
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Neo4j Browser**: http://localhost:7474

### Production
- **Frontend**: https://tutorwise.vercel.app
- **Backend**: https://tutorwise-production.up.railway.app
- **Railway Dashboard**: https://railway.app

## 🔑 Environment Variables Reference

Critical variables that must be set in `.env.local`:

### Railway (Backend Deployment)
- ✅ `RAILWAY_API_TOKEN` - **Account Token** (not Project Token)
  - Create at: https://railway.app/account/tokens
  - **Must NOT be scoped to a project**

### Vercel (Frontend Deployment)
- ✅ `VERCEL_TOKEN` - User Access Token
  - Create at: https://vercel.com/account/tokens
  - Full account or project-specific access

### Supabase (Database & Auth)
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Project URL
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon/Public key (safe for frontend)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Service role key (backend only, SECRET!)

### Stripe (Payments)
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Publishable key (safe for frontend)
- ✅ `STRIPE_SECRET_KEY` - Secret key (backend only, SECRET!)
- ✅ `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

### Services
- ✅ `NEO4J_URI` - Neo4j connection string
- ✅ `REDIS_URL` - Redis connection string

### Integrations
- ✅ `JIRA_BASE_URL` - Jira instance URL
- ✅ `JIRA_EMAIL` - Jira user email
- ✅ `JIRA_API_TOKEN` - Jira API token
- ✅ `GOOGLE_AI_API_KEY` - Google AI/Gemini API key
- ✅ `FIGMA_ACCESS_TOKEN` - Figma personal access token

## 🆘 Troubleshooting

### Services won't start
```bash
# Check logs
cat logs/<service-name>.log

# Clean PIDs
rm -rf /tmp/tutorwise-services/*.pid

# Restart
npm run startup:restart-all
```

### Port conflicts
```bash
# Check what's using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Environment issues
```bash
# Verify .env.local exists
cat .env.local | grep RAILWAY_API_TOKEN

# Reload environment
npm run claude:login
```

## 📚 Full Documentation

### 📖 Main Documentation Hub
- **[Complete Documentation Index](tools/docs/README.md)** - Full documentation navigation

### Service Management
- [CAS Startup Utility](tools/docs/usage/cas-startup.md) - Service orchestration
- [Shell Aliases Setup](tools/docs/usage/aliases.md) - Command shortcuts
- [Command Reference](tools/docs/usage/commands.md) - All command methods

### Cloud Services Setup
- [Cloud Services Overview](tools/docs/setup/cloud-services/overview.md) - Complete setup guide
- [Railway Authentication](tools/docs/setup/cloud-services/railway.md) - Account vs Project Tokens
- [Vercel Authentication](tools/docs/setup/cloud-services/vercel.md) - User vs Project Tokens
- [Supabase Authentication](tools/docs/setup/cloud-services/supabase.md) - Anon vs Service Role Keys
- [Stripe Authentication](tools/docs/setup/cloud-services/stripe.md) - Publishable vs Secret Keys

### Database Setup
- [Neo4j Setup](tools/docs/setup/databases/neo4j.md) - Graph database configuration
- [Redis Setup](tools/docs/setup/databases/redis.md) - Cache & session storage

### Architecture & Integration
- [CAS Documentation](.ai/ARCHITECTURE.md) - Contextual Autonomous System
- [Integration Guide](tools/integrations/README.md) - Third-party integrations

## 🎯 Common Workflows

### Daily Development Start
```bash
npm run claude:login
# Choose option 1 (Start all)
# Wait 30 seconds
# Go to http://localhost:3000
```

### Testing Changes
```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Visual regression
npm run visual-test
```

### Deploying to Production
```bash
# Backend to Railway
npm run deploy:railway

# Frontend to Vercel (production)
npm run deploy:vercel:prod

# Or deploy both
npm run deploy:railway && npm run deploy:vercel:prod
```

### First-Time Cloud Service Setup

**Railway (Backend):**
1. Create Account Token: https://railway.app/account/tokens
2. **Do NOT select a project** when creating
3. Add to `.env.local`: `RAILWAY_API_TOKEN=your-token`
4. Run: `npm run deploy:railway`

**Vercel (Frontend):**
1. Create User Token: https://vercel.com/account/tokens
2. Add to `.env.local`: `VERCEL_TOKEN=your-token`
3. Run: `npm run deploy:vercel`

**Supabase (Database):**
1. Get credentials: https://app.supabase.com/project/[ID]/settings/api
2. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # Keep secret!
   ```

**Stripe (Payments):**
1. Get test keys: https://dashboard.stripe.com/apikeys (Test mode)
2. Add to `.env.local`:
   ```bash
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...  # Keep secret!
   ```
3. For production, switch to Live mode keys

---

**Happy Coding! 🚀**
