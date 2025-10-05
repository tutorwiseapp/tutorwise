# Cloud Services Setup - Complete Guide

## Overview

This guide provides a consolidated setup reference for all TutorWise cloud services. Each service has detailed authentication documentation linked below.

## Quick Setup Checklist

### ✅ Neo4j (Graph Database - Local/Docker)
- [ ] Start with Docker: `docker-compose up neo4j -d`
- [ ] Access Neo4j Browser: http://localhost:7474
- [ ] Change default password from `password123`
- [ ] Add to `.env.local`:
  ```bash
  NEO4J_URI=bolt://localhost:7687
  NEO4J_USER=neo4j
  NEO4J_PASSWORD=your-secure-password
  ```
- [ ] Test connection: `docker exec -it tutorwise-neo4j cypher-shell -u neo4j -p your-password`

📖 [Full Neo4j Setup Guide](./NEO4J-SETUP-README.md)

### ✅ Redis (Cache - Local/Docker)
- [ ] Start with Docker: `docker-compose up redis -d`
- [ ] Update password in docker-compose.yml
- [ ] Add to `.env.local`:
  ```bash
  REDIS_URL=redis://:your-password@localhost:6379
  REDIS_PASSWORD=your-password
  ```
- [ ] Test connection: `docker exec -it tutorwise-redis redis-cli -a your-password ping`

📖 [Full Redis Setup Guide](./REDIS-SETUP-README.md)

### ✅ Railway (Backend Deployment)
- [ ] Create Account Token at https://railway.app/account/tokens
- [ ] **Important:** Do NOT select a project when creating
- [ ] Add to `.env.local`: `RAILWAY_API_TOKEN=your-token`
- [ ] Test: `railway whoami`
- [ ] Deploy: `npm run deploy:railway`

📖 [Full Railway Auth Guide](./RAILWAY-AUTH-README.md)

### ✅ Vercel (Frontend Deployment)
- [ ] Create User Access Token at https://vercel.com/account/tokens
- [ ] Add to `.env.local`: `VERCEL_TOKEN=your-token`
- [ ] Link project: `vercel link`
- [ ] Test: `vercel whoami`
- [ ] Deploy (preview): `npm run deploy:vercel`
- [ ] Deploy (production): `npm run deploy:vercel:prod`

📖 [Full Vercel Auth Guide](./VERCEL-AUTH-README.md)

### ✅ Supabase (Database & Auth)
- [ ] Get Project URL from https://app.supabase.com/project/[ID]/settings/api
- [ ] Copy Anon/Public key (safe for frontend)
- [ ] Copy Service Role key (keep secret!)
- [ ] Add to `.env.local`:
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...  # SECRET - backend only!
  ```
- [ ] Enable Row Level Security on tables
- [ ] Create RLS policies
- [ ] Test connection

📖 [Full Supabase Auth Guide](./SUPABASE-AUTH-README.md)

### ✅ Stripe (Payment Processing)
- [ ] Get test keys from https://dashboard.stripe.com/apikeys (Test mode)
- [ ] Add to `.env.local`:
  ```bash
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_SECRET_KEY=sk_test_...  # SECRET - backend only!
  ```
- [ ] Set up webhooks: https://dashboard.stripe.com/webhooks
- [ ] Copy webhook signing secret
- [ ] Add to `.env.local`: `STRIPE_WEBHOOK_SECRET=whsec_...`
- [ ] Test with test cards (4242 4242 4242 4242)
- [ ] For production: Switch to Live mode, get new keys

📖 [Full Stripe Auth Guide](./STRIPE-AUTH-README.md)

## Token Types Quick Reference

### Railway
| Type | Prefix | Use Case | Can Expose? |
|------|--------|----------|-------------|
| Account Token | N/A | CLI operations | ❌ No |
| Project Token | N/A | CI/CD only | ❌ No |

**Key Rule:** Use Account Token for CLI (don't scope to project!)

### Vercel
| Type | Prefix | Use Case | Can Expose? |
|------|--------|----------|-------------|
| User Access Token | N/A | Local dev, CLI | ❌ No |
| Project Token | N/A | CI/CD | ❌ No |
| Deploy Hook | URL | Webhook triggers | ⚠️ URL only |

**Key Rule:** User Token for CLI, Project Token for CI/CD

### Supabase
| Type | Prefix | Use Case | Can Expose? |
|------|--------|----------|-------------|
| Anon/Public Key | `eyJhbGci...` | Frontend | ✅ Yes (with RLS) |
| Service Role Key | `eyJhbGci...` | Backend only | ❌ No (bypasses RLS) |

**Key Rule:** Anon for frontend, Service Role for backend ONLY

### Stripe
| Type | Prefix | Use Case | Can Expose? |
|------|--------|----------|-------------|
| Publishable Key (Test) | `pk_test_` | Frontend (dev) | ✅ Yes |
| Publishable Key (Live) | `pk_live_` | Frontend (prod) | ✅ Yes |
| Secret Key (Test) | `sk_test_` | Backend (dev) | ❌ No |
| Secret Key (Live) | `sk_live_` | Backend (prod) | ❌ No |
| Webhook Secret | `whsec_` | Verify webhooks | ❌ No |

**Key Rule:** Publishable for frontend, Secret for backend ONLY

## Environment Variables Template

Copy this to your `.env.local`:

```bash
##############################################################################
# TutorWise Environment Variables
# NEVER commit this file to git!
##############################################################################

# ============================================================================
# RAILWAY (Backend Deployment)
# ============================================================================
# Create Account Token at: https://railway.app/account/tokens
# DO NOT select a project when creating the token
RAILWAY_API_TOKEN=your-account-token-here

# ============================================================================
# VERCEL (Frontend Deployment)
# ============================================================================
# Create User Access Token at: https://vercel.com/account/tokens
VERCEL_TOKEN=your-user-access-token-here

# Optional: For specific project deployment
VERCEL_ORG_ID=team_xxxxx
VERCEL_PROJECT_ID=prj_xxxxx

# ============================================================================
# SUPABASE (Database & Authentication)
# ============================================================================
# Get from: https://app.supabase.com/project/[PROJECT_ID]/settings/api

# Frontend (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend (SECRET - never expose!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database Connection (optional)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
DATABASE_POOLING_URL=postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:6543/postgres?pgbouncer=true

# ============================================================================
# STRIPE (Payment Processing)
# ============================================================================
# Get from: https://dashboard.stripe.com/apikeys

# Test Mode (Development)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxx
STRIPE_SECRET_KEY_TEST=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxxxx

# Live Mode (Production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_xxxxx
STRIPE_SECRET_KEY_LIVE=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET_LIVE=whsec_xxxxx

# Current Environment (switch based on dev/prod)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY_TEST
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET_TEST

# ============================================================================
# LOCAL SERVICES
# ============================================================================
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-neo4j-password

REDIS_URL=redis://localhost:6379

# ============================================================================
# INTEGRATIONS
# ============================================================================
# Jira
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token

# Google AI
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Figma
FIGMA_ACCESS_TOKEN=your-figma-token

# Confluence
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
CONFLUENCE_EMAIL=your-email@example.com
CONFLUENCE_API_TOKEN=your-confluence-token

# ============================================================================
# APPLICATION
# ============================================================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_URL=http://localhost:8000
```

## Common Issues & Solutions

### Railway: "Unauthorized" Error
**Problem:** Using Project Token instead of Account Token

**Solution:**
1. Go to https://railway.app/account/tokens
2. Create new token
3. **DO NOT select a project**
4. Update `.env.local`

📖 [Full troubleshooting](./RAILWAY-AUTH-README.md#common-issues--solutions)

### Vercel: "Forbidden" Error
**Problem:** Token doesn't have access to project/team

**Solution:**
1. Check token scope at https://vercel.com/account/tokens
2. Ensure "Full Account" or correct project selected
3. For teams: Switch context with `vercel switch`

📖 [Full troubleshooting](./VERCEL-AUTH-README.md#common-issues--solutions)

### Supabase: "Row Level Security" Error
**Problem:** RLS enabled but no policies, or using wrong key

**Solution:**
1. For admin operations: Use Service Role key server-side
2. For user operations: Create RLS policies
3. Ensure user is authenticated for user-scoped queries

📖 [Full troubleshooting](./SUPABASE-AUTH-README.md#common-issues--solutions)

### Stripe: "Webhook signature failed"
**Problem:** Request body was parsed before verification

**Solution:**
1. Use raw body (text, not JSON) for verification
2. Verify webhook secret matches environment
3. Test locally with Stripe CLI: `stripe listen`

📖 [Full troubleshooting](./STRIPE-AUTH-README.md#common-issues--solutions)

## Security Best Practices

### ✅ Do's
- ✅ Use environment variables for all secrets
- ✅ Keep `.env.local` in `.gitignore`
- ✅ Use different tokens for dev/staging/prod
- ✅ Use public/anon keys for frontend
- ✅ Use secret/service keys ONLY server-side
- ✅ Enable RLS on all Supabase tables
- ✅ Test with test mode before going live
- ✅ Rotate tokens periodically
- ✅ Revoke unused tokens immediately
- ✅ Use webhook secrets to verify webhooks
- ✅ Implement proper error handling
- ✅ Monitor API usage and logs

### ❌ Don'ts
- ❌ Never commit secrets to git
- ❌ Never expose secret keys in frontend
- ❌ Never use production keys in development
- ❌ Never share tokens between team members
- ❌ Never use same token across all services
- ❌ Never disable RLS in production
- ❌ Never skip webhook verification
- ❌ Never hardcode API keys in code
- ❌ Never use live Stripe keys for testing
- ❌ Never bypass authentication checks

## Testing Checklist

Before deploying to production:

### Railway
- [ ] `railway whoami` works
- [ ] Can view project: `railway status`
- [ ] Can deploy: `railway up`
- [ ] Backend is accessible at Railway URL

### Vercel
- [ ] `vercel whoami` works
- [ ] Project is linked: `vercel ls`
- [ ] Preview deployment works
- [ ] Production deployment works
- [ ] Environment variables are set

### Supabase
- [ ] Can connect with anon key (frontend)
- [ ] Can connect with service role (backend)
- [ ] RLS policies are configured
- [ ] Authentication works
- [ ] Database queries work

### Stripe
- [ ] Test payment with test card (4242 4242 4242 4242)
- [ ] Webhook receives events
- [ ] Webhook signature verifies
- [ ] Can create customers/charges
- [ ] 3D Secure flow works

## Deployment Commands

### Development
```bash
# Start local services
npm run cas-startup

# Check status
npm run cas-startup:status

# Start dev servers
npm run dev:web    # Frontend
npm run dev:api    # Backend
```

### Deployment
```bash
# Deploy backend (Railway)
npm run deploy:railway

# Deploy frontend preview (Vercel)
npm run deploy:vercel

# Deploy frontend production (Vercel)
npm run deploy:vercel:prod

# Deploy both to production
npm run deploy:railway && npm run deploy:vercel:prod
```

## Quick Links

### Documentation
- [Railway Auth Guide](./RAILWAY-AUTH-README.md)
- [Vercel Auth Guide](./VERCEL-AUTH-README.md)
- [Supabase Auth Guide](./SUPABASE-AUTH-README.md)
- [Stripe Auth Guide](./STRIPE-AUTH-README.md)
- [CAS Startup Utility](./STARTUP-UTILITY-README.md)
- [Shell Aliases Setup](./ALIAS-SETUP-README.md)
- [Command Reference](./COMMAND-REFERENCE.md)

### Service Dashboards
- [Railway Dashboard](https://railway.app)
- [Vercel Dashboard](https://vercel.com)
- [Supabase Dashboard](https://app.supabase.com)
- [Stripe Dashboard](https://dashboard.stripe.com)

### Token Creation URLs
- [Railway Account Tokens](https://railway.app/account/tokens)
- [Vercel Account Tokens](https://vercel.com/account/tokens)
- [Supabase API Settings](https://app.supabase.com)
- [Stripe API Keys](https://dashboard.stripe.com/apikeys)

## Getting Help

1. **Check service-specific guide** - Each service has detailed troubleshooting
2. **Review environment variables** - Ensure all required vars are set
3. **Check service logs** - Railway, Vercel, Supabase all have log viewers
4. **Test locally first** - Reproduce issues in development
5. **Verify token permissions** - Ensure tokens have correct scope/access

## Summary

**The Golden Rules:**
1. **Railway**: Use Account Token (not Project Token) for CLI
2. **Vercel**: Use User Access Token for local, Project Token for CI/CD
3. **Supabase**: Anon key for frontend, Service Role for backend ONLY
4. **Stripe**: Publishable for frontend, Secret for backend ONLY
5. **Never commit secrets to git** - Always use `.env.local`
6. **Test mode first** - Always test before using production keys

---

For detailed setup instructions, authentication flows, and advanced configurations, see the individual service guides linked above.
