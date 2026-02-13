# TutorWise Developer Environment Setup Guide

**Complete setup guide for new and existing developers**

Last Updated: 2026-01-16
Version: 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start (5 Minutes)](#quick-start-5-minutes)
3. [Prerequisites](#prerequisites)
4. [Core Development Tools](#core-development-tools)
5. [Database Setup](#database-setup)
6. [Cloud Services Configuration](#cloud-services-configuration)
7. [AI Development Tools](#ai-development-tools)
8. [Integration Tools (Optional)](#integration-tools-optional)
9. [Environment Variables Guide](#environment-variables-guide)
10. [Verification & Testing](#verification--testing)
11. [Troubleshooting](#troubleshooting)
12. [Daily Development Workflow](#daily-development-workflow)

---

## Overview

TutorWise is a full-stack tutoring marketplace platform built with:
- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Python FastAPI
- **Databases**: PostgreSQL (Supabase), Neo4j (Graph), Redis (Cache)
- **Deployment**: Vercel (Frontend), Railway (Backend)
- **Real-time**: Ably
- **Email**: Resend
- **Payments**: Stripe
- **AI Tools**: Claude Code, Google Gemini

This guide covers everything from initial setup to daily development workflows.

---

## Quick Start (5 Minutes)

**For experienced developers who want to get running immediately:**

```bash
# 1. Clone the repository
git clone https://github.com/tutorwiseapp/tutorwise.git
cd tutorwise

# 2. Run automated setup
./tools/scripts/setup/setup-dev-env.sh

# 3. Configure minimum environment variables
# Edit .env.local with AT LEAST these values:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - DATABASE_URL (from Supabase)

# 4. Start development server
npm run dev

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

**That's it!** For full setup with all services, continue reading below.

---

## Prerequisites

### System Requirements

| Tool | Minimum Version | Purpose | Installation |
|------|----------------|---------|--------------|
| **Node.js** | 18.0+ | JavaScript runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.0+ | Package manager | Comes with Node.js |
| **Git** | 2.30+ | Version control | [git-scm.com](https://git-scm.com/) |
| **Python** | 3.10+ | Backend API & AI tools | [python.org](https://www.python.org/) |
| **Docker** | 20.0+ | Local databases (optional) | [docker.com](https://www.docker.com/) |

### Verify Installation

```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
git --version     # Should show 2.30.x or higher
python3 --version # Should show 3.10.x or higher
docker --version  # Should show 20.x.x or higher (optional)
```

---

## Core Development Tools

### 1. IDE Setup (VSCode Recommended)

**Install VSCode:**
- Download from [code.visualstudio.com](https://code.visualstudio.com/)

**Recommended Extensions:**
```bash
# Install via VSCode Extensions panel or command line:
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-python.python
code --install-extension ms-python.vscode-pylance
code --install-extension GraphQL.vscode-graphql
code --install-extension Neo4j.neo4j
code --install-extension redhat.vscode-yaml
```

**VSCode Settings (`.vscode/settings.json`):**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ]
}
```

### 2. Claude Code CLI

**Installation:**
```bash
# macOS/Linux
curl -fsSL https://claude.ai/install.sh | sh

# Or via npm
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

**Authentication:**
```bash
# Login to Claude Code
npm run claude:login

# Or manually
claude login
```

**Usage:**
```bash
# Start Claude Code interactive session
claude

# Use with project context
claude --context .ai/
```

### 3. Vercel CLI

**Installation:**
```bash
npm install -g vercel

# Verify
vercel --version
```

**Authentication & Project Linking:**
```bash
# Login to Vercel
vercel login

# Link project (run from project root)
vercel link

# Set environment variables
vercel env pull .env.vercel
```

**Deployment:**
```bash
# Preview deployment
npm run deploy:vercel

# Production deployment
npm run deploy:vercel:prod
```

### 4. Supabase CLI

**Installation:**
```bash
# macOS
brew install supabase/tap/supabase

# Linux/WSL
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Verify
supabase --version
```

**Project Setup:**
```bash
# Initialize Supabase locally (optional for local development)
supabase init

# Link to remote project
supabase link --project-ref YOUR_PROJECT_REF

# Pull remote schema
supabase db pull

# Generate TypeScript types
supabase gen types typescript --project-id YOUR_PROJECT_ID > apps/web/src/types/supabase.ts
```

### 5. Railway CLI

**Installation:**
```bash
# macOS/Linux
curl -fsSL https://railway.app/install.sh | sh

# Or via npm
npm install -g @railway/cli

# Verify
railway --version
```

**Authentication:**
```bash
# Login to Railway
railway login

# Link project
railway link

# View environment variables
railway variables
```

**Deployment:**
```bash
# Deploy backend to Railway
npm run deploy:railway
```

---

## Database Setup

### 1. Supabase (PostgreSQL)

**Create Supabase Project:**
1. Go to [app.supabase.com](https://app.supabase.com/)
2. Click "New Project"
3. Choose organization and region
4. Set database password (save this!)
5. Wait for project to initialize (~2 minutes)

**Get Credentials:**
1. Go to Project Settings → API
2. Copy these values to `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
3. Go to Project Settings → Database
4. Copy connection strings:
   ```bash
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   DATABASE_POOLING_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true
   ```

**Run Database Migrations:**
```bash
# Apply all migrations
./tools/database/apply-migration.sh 001_initial_schema.sql
./tools/database/apply-migration.sh 002_add_profiles.sql
# ... continue for all migrations

# Or use Supabase CLI
supabase db push
```

**Configure Email Templates (Authentication):**

The authentication flow uses **token_hash** verification for email confirmation. This works across any browser/device (unlike PKCE which requires localStorage).

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Update each template to use the `token_hash` format:

**Confirm signup:**
```html
<a href="{{ .SiteURL }}/confirm-email?token_hash={{ .TokenHash }}&type=signup">
  Confirm your email
</a>
```

**Magic link:**
```html
<a href="{{ .SiteURL }}/confirm-email?token_hash={{ .TokenHash }}&type=magiclink">
  Log in to Tutorwise
</a>
```

**Invite user:**
```html
<a href="{{ .SiteURL }}/confirm-email?token_hash={{ .TokenHash }}&type=invite">
  Accept invitation
</a>
```

**Reset password:**
```html
<a href="{{ .SiteURL }}/confirm-email?token_hash={{ .TokenHash }}&type=recovery">
  Reset your password
</a>
```

**Change email address:**
```html
<a href="{{ .SiteURL }}/confirm-email?token_hash={{ .TokenHash }}&type=email_change">
  Confirm email change
</a>
```

**Configure Redirect URLs:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add these to "Redirect URLs":
   - `https://www.tutorwise.io/*` (production)
   - `http://localhost:3000/*` (development)

**Important:** The `{{ .SiteURL }}` variable is set in Supabase Dashboard → Authentication → URL Configuration → Site URL.

### 2. Neo4j (Graph Database)

**Option A: Neo4j Aura (Cloud - Recommended for Production)**
1. Go to [neo4j.com/cloud/aura](https://neo4j.com/cloud/aura/)
2. Create free account
3. Create new AuraDB instance
4. Download credentials file
5. Add to `.env.local`:
   ```bash
   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-password-here
   ```

**Option B: Docker (Local Development)**
```bash
# Start Neo4j container
docker run -d \
  --name tutorwise-neo4j \
  -p 7474:7474 \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/change-this-password \
  neo4j:latest

# Add to .env.local
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=change-this-password
```

**Verify Connection:**
```bash
npm run neo4j-test-connection
```

### 3. Redis (Cache & Rate Limiting)

**Option A: Upstash Redis (Cloud - Recommended)**
1. Go to [console.upstash.com](https://console.upstash.com/)
2. Create new Redis database
3. Copy credentials to `.env.local`:
   ```bash
   UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxxxx
   ```

**Option B: Docker (Local Development)**
```bash
# Start Redis container
docker run -d \
  --name tutorwise-redis \
  -p 6379:6379 \
  redis:alpine \
  redis-server --requirepass change-this-password

# Add to .env.local
REDIS_URL=redis://:change-this-password@localhost:6379
REDIS_PASSWORD=change-this-password
```

**Verify Connection:**
```bash
npm run redis-test-connection
```

---

## Cloud Services Configuration

### 1. Stripe (Payment Processing)

**Create Stripe Account:**
1. Go to [dashboard.stripe.com](https://dashboard.stripe.com/)
2. Create account or login
3. Toggle to "Test mode" in top right

**Get API Keys:**
1. Go to Developers → API keys
2. Copy to `.env.local`:
   ```bash
   # Test mode keys
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxx
   STRIPE_SECRET_KEY_TEST=sk_test_xxxxx

   # Active keys (use test for development)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST}
   STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY_TEST}
   ```

**Set Up Webhooks:**
1. Go to Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `payment_intent.succeeded`
4. Copy webhook signing secret:
   ```bash
   STRIPE_WEBHOOK_SECRET_TEST=whsec_xxxxx
   STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET_TEST}
   ```

### 2. Resend (Email Service)

**Create Resend Account:**
1. Go to [resend.com](https://resend.com/)
2. Sign up and verify email
3. Go to API Keys
4. Create new API key
5. Add to `.env.local`:
   ```bash
   RESEND_API_KEY=re_xxxxx
   RESEND_FROM_EMAIL=TutorWise <noreply@yourdomain.com>
   ```

**Verify Domain (for production):**
1. Go to Domains in Resend dashboard
2. Add your domain
3. Add DNS records to your domain provider
4. Wait for verification

### 3. Ably (Real-time Messaging)

**Create Ably Account:**
1. Go to [ably.com](https://ably.com/)
2. Sign up for free account
3. Create new app
4. Go to API Keys tab
5. Copy to `.env.local`:
   ```bash
   ABLY_API_KEY=xxxxx.xxxxx:xxxxx
   ```

**Note:** Ably is used for real-time chat and notifications. Optional for initial development.

---

## AI Development Tools

### 1. Google Gemini API

**Get API Key:**
1. Go to [ai.google.dev](https://ai.google.dev/)
2. Click "Get API key in Google AI Studio"
3. Create new project or select existing
4. Create API key
5. Add to `.env.local`:
   ```bash
   GOOGLE_AI_API_KEY=AIzaSyxxxxx
   ```

**Install Python Dependencies:**
```bash
# Install Gemini SDK
pip3 install google-generativeai

# Verify installation
python3 -c "import google.generativeai as genai; print('Gemini SDK installed')"
```

**Test Gemini Integration:**
```bash
# Check available models
npm run gemini:models

# Start interactive Gemini CLI
npm run gemini

# Or advanced CLI
npm run gemini:advanced
```

### 2. Claude Code Configuration

**Project Context Setup:**
```bash
# Generate context for Claude Code
npm run cas:generate

# Start Claude Code with project context
npm run ai:claude
```

**Claude Code Settings (`.claude/settings.json`):**
```json
{
  "contextPaths": [
    ".ai/",
    "docs/",
    "apps/web/src/"
  ],
  "ignorePatterns": [
    "node_modules/",
    ".next/",
    "dist/",
    "build/"
  ],
  "maxTokens": 8000
}
```

### 3. Python Environment for AI Tools

**Create Virtual Environment:**
```bash
# Create venv
python3 -m venv .venv

# Activate venv
source .venv/bin/activate  # macOS/Linux
# or
.venv\Scripts\activate     # Windows

# Install dependencies
pip3 install -r requirements-ai.txt
```

**AI Tools Dependencies:**
```bash
# Key packages for AI integration
pip3 install google-generativeai
pip3 install anthropic
pip3 install python-dotenv
pip3 install requests
```

---

## Integration Tools (Optional)

### 1. Jira Integration

**Get API Token:**
1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Create API token
3. Add to `.env.local`:
   ```bash
   JIRA_BASE_URL=https://your-domain.atlassian.net
   JIRA_EMAIL=your-email@example.com
   JIRA_API_TOKEN=your-jira-token
   ```

**Test Connection:**
```bash
npm run test:jira-fields
```

**Use Cases:**
- Automated task tracking
- Sprint synchronization
- Remote task execution via Jira tickets

### 2. Confluence Integration

**Get API Token:**
1. Same token as Jira (Atlassian uses unified tokens)
2. Add to `.env.local`:
   ```bash
   CONFLUENCE_BASE_URL=https://your-domain.atlassian.net/wiki
   CONFLUENCE_EMAIL=your-email@example.com
   CONFLUENCE_API_TOKEN=your-confluence-token
   ```

**Sync Documentation:**
```bash
npm run sync:confluence
```

### 3. Google Calendar Integration

**Create OAuth Credentials:**
1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google Calendar API
4. Go to Credentials → Create Credentials → OAuth client ID
5. Select "Web application"
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Add to `.env.local`:
   ```bash
   GOOGLE_CALENDAR_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CALENDAR_CLIENT_SECRET=xxxxx
   GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
   ```

**Test Calendar Sync:**
```bash
npm run test:calendar
npm run sync:calendar
```

### 4. GitHub Integration

**Create Personal Access Token:**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `read:org`, `read:user`
4. Add to `.env.local`:
   ```bash
   GITHUB_TOKEN=ghp_xxxxx
   ```

**Use Cases:**
- Automated issue tracking
- PR analysis
- Repository statistics

### 5. Figma Integration

**Get Access Token:**
1. Go to Figma → Settings → Account
2. Scroll to Personal Access Tokens
3. Generate new token
4. Add to `.env.local`:
   ```bash
   FIGMA_ACCESS_TOKEN=figd_xxxxx
   ```

**Use Cases:**
- Design synchronization
- Component documentation
- Asset export

---

## Environment Variables Guide

### Understanding .env Files

| File | Purpose | Git Status | When to Use |
|------|---------|------------|-------------|
| `.env.example` | Template with all variables | ✅ Committed | Reference for new developers |
| `.env.local` | Your actual secrets | ❌ Gitignored | Development environment |
| `.env.test` | Test environment values | ✅ Committed (safe values) | Running tests |
| `.env.production` | Production secrets | ❌ Never in repo | Production deployment |

### Initial Setup (New Developer)

```bash
# Automated setup (recommended)
./tools/scripts/setup/setup-dev-env.sh

# This will:
# 1. Copy .env.example to .env.local
# 2. Prompt you to fill in actual values
# 3. Verify required variables are set
```

### Keeping .env.local Updated (Existing Developer)

```bash
# When .env.example is updated with new variables
npm run sync:env

# This will:
# 1. Find new variables in .env.example
# 2. Add them to your .env.local
# 3. Preserve your existing values
# 4. Create a backup (.env.local.backup.TIMESTAMP)
```

### Required Variables (Minimum to Run)

```bash
# Database (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# Application (REQUIRED)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Optional Variables (Enable Features)

```bash
# Payments (for booking features)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx

# Email (for notifications)
RESEND_API_KEY=re_xxxxx

# Real-time (for chat)
ABLY_API_KEY=xxxxx.xxxxx:xxxxx

# AI Development
GOOGLE_AI_API_KEY=AIzaSyxxxxx

# Graph Database (for recommendations)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=change-this-password
```

### Environment Variable Precedence

Next.js loads environment variables in this order:
1. `.env.production.local` (production builds only)
2. `.env.local` (always loaded except in test)
3. `.env.production` / `.env.development` / `.env.test`
4. `.env`

**Best Practice:** Only use `.env.local` for secrets, everything else in `.env.example`

---

## Verification & Testing

### 1. Verify Core Setup

```bash
# Run health check
npm run workflow:check

# This checks:
# - Dependencies installed
# - TypeScript compiles
# - ESLint passes
# - Environment variables set
```

### 2. Test Database Connections

```bash
# Test Supabase connection
npm run test:supabase

# Test Neo4j connection
./tools/scripts/neo4j-test-connection.sh

# Test Redis connection
./tools/scripts/redis-test-connection.sh
```

### 3. Test API Integrations

```bash
# Test Stripe integration
npm run test:stripe

# Test Resend email
npm run test:email

# Test Gemini API
npm run gemini:models
```

### 4. Test Full Development Workflow

```bash
# Run complete workflow validation
npm run workflow:full

# This runs:
# 1. Health check
# 2. Linting
# 3. Type checking
# 4. Unit tests
# 5. Build verification
```

### 5. Start Development Server

```bash
# Start both frontend and backend
npm run dev

# Or start individually:
npm run dev:web    # Frontend only (port 3000)
npm run dev:api    # Backend only (port 8000)
```

**Verify:**
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:8000/docs](http://localhost:8000/docs)
- Supabase Studio: [http://localhost:54323](http://localhost:54323) (if running locally)

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" Errors

```bash
# Clean install
npm run workflow:clean

# Or manually:
rm -rf node_modules package-lock.json
npm install
```

#### 2. TypeScript Errors

```bash
# Check types
npm run typecheck

# Generate Supabase types
supabase gen types typescript --project-id YOUR_PROJECT_ID > apps/web/src/types/supabase.ts
```

#### 3. Environment Variables Not Loading

```bash
# Check .env.local exists
ls -la .env.local

# Verify variables are set
cat .env.local | grep SUPABASE_URL

# Restart dev server (required after .env changes)
npm run dev
```

#### 4. Database Connection Errors

```bash
# Check Supabase project is running
# Go to app.supabase.com and verify project status

# Test connection
npm run test:supabase

# Check DATABASE_URL format:
# Should be: postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

#### 5. Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or use different port
PORT=3001 npm run dev
```

#### 6. Python Backend Issues

```bash
# Activate virtual environment
cd apps/api
source venv/bin/activate

# Install dependencies
pip3 install -r requirements.txt

# Test API
python3 -m uvicorn app.main:app --reload
```

#### 7. Claude Code Authentication Issues

```bash
# Re-login
npm run claude:login

# Or manually
claude logout
claude login

# Verify
claude --version
```

#### 8. Gemini API Errors

```bash
# Check API key is valid
npm run gemini:models

# If error, regenerate key at ai.google.dev
# Update GOOGLE_AI_API_KEY in .env.local
```

### Getting Help

1. **Check Documentation:**
   - This file: `.ai/DEVELOPER-SETUP.md`
   - Quick reference: `.ai/QUICK-START.md`
   - Daily workflow: `docs/development/environment-setup.md`

2. **Check Logs:**
   ```bash
   # View application logs
   npm run tw-logs

   # Or manually
   tail -f logs/*.log
   ```

3. **Run Diagnostics:**
   ```bash
   # Project health check
   npm run workflow:check

   # Dependency audit
   npm audit

   # Check outdated packages
   npm outdated
   ```

4. **Reset Everything:**
   ```bash
   # Nuclear option - clean everything
   npm run workflow:clean
   rm -rf .env.local
   ./tools/scripts/setup/setup-dev-env.sh
   ```

---

## Daily Development Workflow

### Morning Routine

```bash
# 1. Pull latest changes
git pull origin main

# 2. Update dependencies (if package.json changed)
npm install

# 3. Sync environment variables (if .env.example changed)
npm run sync:env

# 4. Run health check
npm run workflow:check

# 5. Start development
npm run dev
```

### Before Committing

```bash
# Run full workflow validation
npm run workflow:full

# This runs:
# - Linting (with auto-fix)
# - Type checking
# - Unit tests with coverage
# - Build verification
# - Security audit
```

### Making Changes

```bash
# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes and test frequently
npm run workflow:test

# 3. Before commit
npm run workflow:full

# 4. Commit and push
git add .
git commit -m "feat: your feature description"
git push origin feature/your-feature
```

### Useful Aliases

```bash
# Load aliases (run once per terminal session)
source .dev-aliases.sh

# Then use shortcuts:
tw-dev      # npm run dev
tw-check    # npm run workflow:check
tw-test     # npm run workflow:test
tw-full     # npm run workflow:full
tw-fix      # npm run workflow:fix-tests
tw-clean    # npm run workflow:clean
```

### Remote Task Execution (Advanced)

**Via Jira:**
```bash
# Start Jira task polling
npm run jira:poll:continuous

# Create Jira ticket with:
# Summary: [Claude Code] Your task
# Description: Claude Code: Detailed task instruction
# Start time: When to execute
```

**Via Google Calendar:**
```bash
# Start calendar task polling
npm run calendar:poll:continuous

# Create calendar event with:
# Title: Claude Code task
# Description: Claude Code: Detailed instruction
# Time: When to execute
```

**Hybrid Approach:**
```bash
# Calendar event auto-creates Jira ticket
npm run sync:calendar-to-jira:continuous

# Then Jira system executes the task
npm run jira:poll:continuous
```

---

## Next Steps

### Essential Reading

1. **[QUICK-START.md](.ai/QUICK-START.md)** - 5-minute quick reference
2. **[environment-setup.md](docs/development/environment-setup.md)** - Daily workflow guide
3. **[ROADMAP.md](.ai/1 - ROADMAP.md)** - Product roadmap and features
4. **[PLATFORM-SPECIFICATION.md](.ai/2 - PLATFORM-SPECIFICATION.md)** - Technical architecture

### Development Resources

- **Component Library**: Storybook at `npm run storybook`
- **API Documentation**: Backend docs at `http://localhost:8000/docs`
- **Database Migrations**: `tools/database/migrations/`
- **Design System**: `.ai/6 - DESIGN-SYSTEM.md`
- **Coding Patterns**: `.ai/4 - PATTERNS.md`

### Team Collaboration

- **Pull Request Guidelines**: Follow conventional commits
- **Code Review**: All changes require review
- **Testing**: Maintain test coverage above 80%
- **Documentation**: Update docs with code changes

---

## Appendix

### Complete Command Reference

```bash
# Development
npm run dev              # Start both frontend & backend
npm run dev:web          # Frontend only
npm run dev:api          # Backend only

# Testing
npm run test             # All tests
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests
npm run test:visual      # Visual regression tests

# Quality
npm run lint             # Run linter
npm run lint:fix         # Auto-fix linting issues
npm run typecheck        # TypeScript type checking

# Workflow
npm run workflow:check   # Quick health check
npm run workflow:test    # Run all tests
npm run workflow:build   # Build verification
npm run workflow:full    # Complete validation
npm run workflow:clean   # Clean & reinstall

# Database
./tools/database/apply-migration.sh <file>  # Apply migration
./tools/database/db-connect.sh              # Connect to database

# Deployment
npm run deploy:vercel       # Deploy frontend to Vercel
npm run deploy:vercel:prod  # Deploy to production
npm run deploy:railway      # Deploy backend to Railway

# AI Tools
npm run gemini              # Start Gemini CLI
npm run ai:gemini          # Gemini with context sync
npm run claude:login        # Authenticate Claude Code

# Environment
npm run sync:env            # Sync .env.example → .env.local

# Setup
npm run setup:direnv        # Setup direnv
npm run setup:cas           # Setup CAS system
npm run setup-aliases       # Create helpful aliases
```

### Tool Versions

```bash
# Check all tool versions
node --version
npm --version
git --version
python3 --version
docker --version
vercel --version
supabase --version
railway --version
claude --version
```

### Useful Links

- **Supabase Dashboard**: [app.supabase.com](https://app.supabase.com/)
- **Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
- **Railway Dashboard**: [railway.app/dashboard](https://railway.app/dashboard)
- **Stripe Dashboard**: [dashboard.stripe.com](https://dashboard.stripe.com/)
- **Resend Dashboard**: [resend.com/overview](https://resend.com/overview)
- **Ably Dashboard**: [ably.com/accounts](https://ably.com/accounts)
- **Neo4j Aura Console**: [console.neo4j.io](https://console.neo4j.io/)
- **Upstash Console**: [console.upstash.com](https://console.upstash.com/)

---

**Welcome to TutorWise! Happy coding! 🚀**
