# TutorWise Developer Environment Setup Guide

**Complete setup guide for new and existing developers**

Last Updated: 2026-03-11
Version: 3.0

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
- **Frontend**: Next.js 16 (App Router), React, TypeScript
- **Database**: PostgreSQL (Supabase + pgvector)
- **Deployment**: Vercel
- **Real-time**: Ably
- **Email**: Resend
- **Payments**: Stripe
- **AI**: 6-tier fallback chain — xAI Grok 4 Fast → Gemini Flash → DeepSeek R1 → Claude Sonnet 4.6 → GPT-4o → Rules-based
- **AI Dev Tools**: Claude Code
- **Orchestration**: Conductor (admin canvas at `/admin/conductor`)

### Platform Scale

| Metric | Count |
|--------|-------|
| **Pages** | 450+ |
| **Components** | 400+ |
| **Commits** | 1,800+ |
| **Database Migrations** | 386+ |

This guide covers everything from initial setup to daily development workflows.

### Key Directory Structure

```
tutorwise/
├── apps/web/                          # Next.js 16 application
│   └── src/
│       ├── app/admin/conductor/       # Conductor UI pages
│       └── lib/
│           ├── ai/                    # Shared AI service (getAIService singleton)
│           ├── agent-studio/          # SpecialistAgentRunner, AgentMemoryService, tools/
│           ├── conductor/             # IntentDetector, knowledge
│           ├── growth-agent/          # Growth Agent orchestrator + skills + tools
│           ├── platform/              # PlatformUserContext, context-cache, agent-handoff
│           ├── process-studio/        # PlatformWorkflowRuntime, ConformanceChecker
│           └── workflow/team-runtime/ # TeamRuntime, AgentTeamState
├── sage/                              # AI tutor
├── lexi/                              # Help bot
├── cas/                               # Agent SDK (legacy — migrated to Conductor)
├── conductor/                         # Conductor solution designs + publish docs
├── ipom/                              # Process execution solution designs
└── tools/database/migrations/         # SQL migrations (386+, sequential numbering)
```

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
```

**That's it!** For full setup with all services, continue reading below.

---

## Prerequisites

### System Requirements

| Tool | Minimum Version | Purpose | Installation |
|------|----------------|---------|--------------|
| **Node.js** | 22.0+ | JavaScript runtime | [nodejs.org](https://nodejs.org/) |
| **npm** | 10.0+ | Package manager | Comes with Node.js |
| **Git** | 2.30+ | Version control | [git-scm.com](https://git-scm.com/) |

> **macOS (Homebrew):** `brew install node@22` — ensure `/opt/homebrew/opt/node@22/bin` is on your PATH.

### Verify Installation

```bash
node --version    # Should show v22.x.x or higher
npm --version     # Should show 10.x.x or higher
git --version     # Should show 2.30.x or higher
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
   # Pooler (transaction mode) — for normal app queries
   DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true

   # Non-pooling (session mode, port 5432) — required for DDL, migrations, LangGraph checkpointer
   POSTGRES_URL_NON_POOLING=postgresql://postgres.xxxxx:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:5432/postgres
   ```

> **Important:** Use `POSTGRES_URL_NON_POOLING` for migrations and LangGraph's `PostgresSaver`. Use the pooler URL for all runtime queries.

**Key Database Features:**
- **pgvector** with HNSW indexes on: `listings`, `profiles`, `connection_groups`, `sage_knowledge_chunks`, `platform_knowledge_chunks`, `memory_episodes`
- **Hybrid search RPCs:** `search_listings_hybrid`, `search_profiles_hybrid`, `search_organisations_hybrid`, `match_platform_knowledge_chunks`, `match_memory_episodes`, `match_memory_facts`
- **Admin authorization:** Use `is_admin()` SQL function for RLS policies (not an admin_users table)
- **Embedding model:** `gemini-embedding-001` with `outputDimensionality: 768`

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

TutorWise uses a **6-tier AI fallback chain** — all powered through a single shared service at `apps/web/src/lib/ai/`. You only need keys for the providers you want to use; the service auto-falls-back down the chain.

### AI Provider Chain

| Priority | Provider | Model | Env Var |
|----------|----------|-------|---------|
| 1 (primary) | **xAI** | Grok 4 Fast | `XAI_AI_API_KEY` |
| 2 | **Google** | Gemini Flash | `GOOGLE_AI_API_KEY` |
| 3 | **DeepSeek** | R1 | `DEEPSEEK_AI_API_KEY` |
| 4 | **Anthropic** | Claude Sonnet 4.6 | `ANTHROPIC_AI_API_KEY` |
| 5 | **OpenAI** | GPT-4o | `OPENAI_AI_API_KEY` |
| 6 | Rules-based | — | (always available) |

> **Naming convention:** All AI keys use the `_AI_` infix (e.g. `GOOGLE_AI_API_KEY`, not `GOOGLE_API_KEY`). The service checks both `*_AI_API_KEY || *_API_KEY` for backwards compatibility.

**Add whichever keys you have to `.env.local`:**
```bash
# xAI (primary) — get at console.x.ai
XAI_AI_API_KEY=xai-xxxxx

# Google Gemini — get at ai.google.dev
GOOGLE_AI_API_KEY=AIzaSyxxxxx

# DeepSeek — get at platform.deepseek.com
DEEPSEEK_AI_API_KEY=sk-xxxxx

# Anthropic — get at console.anthropic.com
ANTHROPIC_AI_API_KEY=sk-ant-xxxxx

# OpenAI — get at platform.openai.com
OPENAI_AI_API_KEY=sk-xxxxx
```

**The AI service is available as a singleton:**
```typescript
import { getAIService } from '@/lib/ai'
const ai = getAIService()
await ai.generate({ prompt: 'Hello' })           // streaming-capable
await ai.generateJSON<MyType>({ prompt: '...' }) // typed JSON
```

### 1. Claude Code CLI

**Installation:**
```bash
npm install -g @anthropic-ai/claude-code

# Verify installation
claude --version
```

**Authentication:**
```bash
claude login
```

**Usage:**
```bash
# Start Claude Code interactive session (from project root)
claude
```

### 2. Google Gemini Embedding

TutorWise uses `gemini-embedding-001` (768 dimensions) for vector search. The Gemini key (`GOOGLE_AI_API_KEY`) also powers embeddings — no separate setup needed beyond setting the env var above.

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
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email (for notifications)
RESEND_API_KEY=re_xxxxx

# Real-time (for chat)
ABLY_API_KEY=xxxxx.xxxxx:xxxxx

# AI providers (6-tier fallback — add whichever you have)
XAI_AI_API_KEY=xai-xxxxx           # primary
GOOGLE_AI_API_KEY=AIzaSyxxxxx      # tier 2 (also powers embeddings)
DEEPSEEK_AI_API_KEY=sk-xxxxx       # tier 3
ANTHROPIC_AI_API_KEY=sk-ant-xxxxx  # tier 4
OPENAI_AI_API_KEY=sk-xxxxx         # tier 5

# Process Studio webhook (for process execution engine)
PROCESS_STUDIO_WEBHOOK_SECRET=xxxxx

# Cron authentication (for pg_cron and scheduled jobs)
CRON_SECRET=xxxxx

# Session-mode Postgres (port 5432 — for DDL, migrations, LangGraph checkpointer)
POSTGRES_URL_NON_POOLING=postgresql://postgres.xxxxx:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:5432/postgres

# Redis / Upstash (for PlatformUserContext caching)
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxx
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

# Or directly via psql (macOS Homebrew)
/opt/homebrew/opt/postgresql@17/bin/psql "$POSTGRES_URL_NON_POOLING" -c "SELECT version();"
```

### 3. Test API Integrations

```bash
# Test Stripe integration
npm run test:stripe

# Test Resend email
npm run test:email
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
npm run dev
```

**Verify:**
- App: [http://localhost:3000](http://localhost:3000)
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

#### 6. Claude Code Authentication Issues

```bash
# Re-login
npm run claude:login

# Or manually
claude logout
claude login

# Verify
claude --version
```

#### 7. Stale `.next` Cache / `pages-manifest.json` ENOENT

```bash
# The .next cache can get corrupted if multiple builds run concurrently
rm -rf apps/web/.next
npm run dev
```

#### 8. AI Provider Errors

The AI service auto-falls back through the 6-tier chain. If you see AI-related errors:
```bash
# Check which keys are set
grep "_AI_API_KEY" .env.local

# The service logs which provider it used — check server console output
# Add at least one key (GOOGLE_AI_API_KEY is easiest to get)
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

The pre-commit hook (Husky) runs automatically on `git commit` and enforces:
- **Tests** (Jest)
- **Lint** (ESLint — warnings allowed, errors block)
- **Build** (full Next.js build — takes ~5 minutes)

```bash
# Run manually before committing
npm run workflow:full

# macOS: if the hook fails with "node not found", ensure PATH includes node@22:
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
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
- **Database Migrations**: `tools/database/migrations/` (386+ migrations, sequential numbering)
- **Conductor Solution Design**: `conductor/conductor-solution-design.md` (v4.2)
- **Process Execution Design**: `ipom/process-execution-solution-design.md` (v3.2)
- **Design System**: `.ai/6 - DESIGN-SYSTEM.md`
- **Coding Patterns**: `.ai/4 - PATTERNS.md`

### Conductor (Admin Canvas)

The Conductor is the operational control plane at `/admin/conductor`. Key subsystems:

- **Agent Registry**: Agents (single-agent) + Teams (multi-agent) + Spaces (domain containers)
- **Process Studio**: Workflow execution engine with shadow/live modes
- **Intelligence Layer**: 14 specialist analyst tools, daily metrics pipeline via pg_cron
- **Agent Memory**: Episodic memory (vector) + fact triples per agent run
- **HITL**: Human-in-the-loop interrupt/resume in supervisor team pattern

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
npm run dev              # Start frontend

# Testing
npm run test             # All tests
npm run test:unit        # Unit tests
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests

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
npm run deploy:vercel       # Deploy to Vercel (preview)
npm run deploy:vercel:prod  # Deploy to production

# Environment
npm run sync:env            # Sync .env.example → .env.local

# Setup
npm run setup:direnv        # Setup direnv
npm run setup:cas           # Setup Conductor agent system (legacy CAS alias)
npm run setup-aliases       # Create helpful aliases
```

### Tool Versions

```bash
# Check all tool versions
node --version
npm --version
git --version
vercel --version
supabase --version
claude --version
```

### Useful Links

- **Supabase Dashboard**: [app.supabase.com](https://app.supabase.com/)
- **Vercel Dashboard**: [vercel.com/dashboard](https://vercel.com/dashboard)
- **Stripe Dashboard**: [dashboard.stripe.com](https://dashboard.stripe.com/)
- **Resend Dashboard**: [resend.com/overview](https://resend.com/overview)
- **Ably Dashboard**: [ably.com/accounts](https://ably.com/accounts)
- **xAI Console**: [console.x.ai](https://console.x.ai/)
- **Google AI Studio**: [aistudio.google.com](https://aistudio.google.com/)
- **Anthropic Console**: [console.anthropic.com](https://console.anthropic.com/)

---

**Welcome to TutorWise! Happy coding! 🚀**
