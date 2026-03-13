# TutorWise Quick Start Guide

**Get running in 5 minutes** | Last updated: 2026-03-11

---

## Prerequisites

- Node.js 22+ (`/opt/homebrew/opt/node@22/bin`)
- Git installed
- Code editor (VSCode recommended)
- PostgreSQL 17 client (`/opt/homebrew/opt/postgresql@17/bin/psql`)

Not installed? See [DEVELOPER-SETUP.md](DEVELOPER-SETUP.md#prerequisites)

---

## 1. Clone & Install (2 minutes)

```bash
# Clone repository
git clone https://github.com/tutorwiseapp/tutorwise.git
cd tutorwise

# Run automated setup
./tools/scripts/setup/setup-dev-env.sh
```

This script will:
- Install dependencies (`npm install`)
- Create `.env.local` from template
- Set up git hooks (pre-commit runs tests, lint, full build)
- Run health check

---

## 2. Configure Environment (2 minutes)

Open `.env.local` and add **minimum required values**:

```bash
# Supabase (Database & Auth) - REQUIRED
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Application - REQUIRED
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Don't have Supabase credentials?**
1. Go to [app.supabase.com](https://app.supabase.com/)
2. Create new project (takes ~2 minutes)
3. Get credentials from Project Settings > API

---

## 3. Start Development (1 minute)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture Overview

| Component | Location | Description |
|-----------|----------|-------------|
| **Web app** | `apps/web/` | Next.js 16 |
| **Sage** | `sage/` | AI tutor |
| **Lexi** | `lexi/` | Help bot |
| **CAS SDK** | `cas/` | Agent SDK (legacy — migrated to Conductor) |
| **Database** | Supabase | PostgreSQL + pgvector (HNSW indexes) |
| **Migrations** | `tools/database/migrations/` | Sequential numbers, currently at 386+ |

### AI Providers (6-tier fallback chain)

1. xAI Grok 4 Fast (primary)
2. Google Gemini Flash
3. DeepSeek R1
4. Anthropic Claude Sonnet 4.6
5. OpenAI GPT-4o
6. Rules-based fallback

Shared AI service at `apps/web/src/lib/ai/` — `getAIService()` singleton with `generate()`, `generateJSON<T>()`, `stream()`.

Env var naming uses `_AI_` infix: `XAI_AI_API_KEY`, `GOOGLE_AI_API_KEY`, `DEEPSEEK_AI_API_KEY`, `ANTHROPIC_AI_API_KEY`, `OPENAI_AI_API_KEY` (providers check both `*_AI_API_KEY` and `*_API_KEY`).

### Conductor (Admin Control Plane)

The **Conductor** at `/admin/conductor` is the admin canvas for managing the platform's digital workforce:

- **Agents** — specialist agents (`specialist_agents` table)
- **Teams** — multi-agent teams (`agent_teams` table) with Supervisor/Pipeline/Swarm patterns
- **Spaces** — program/domain containers (`agent_spaces` table)
- **Workflows** — process execution engine with shadow/live modes

Key design docs:
- Conductor solution design: `conductor/conductor-solution-design.md` (v4.2)
- Process execution design: `ipom/process-execution-solution-design.md` (v3.2)

---

## Daily Workflow

### Start Working
```bash
npm run dev
```

### Before Committing
```bash
npm run workflow:full
```

### Need Help?
```bash
npm run workflow:check  # Health check
```

---

## Next Steps

### Essential Documentation

- [DEVELOPER-SETUP.md](DEVELOPER-SETUP.md) — Complete setup guide
- [environment-setup.md](../docs/development/environment-setup.md) — Daily workflow
- [ROADMAP.md](1%20-%20ROADMAP.md) — Product roadmap
- [PLATFORM-SPECIFICATION.md](2%20-%20PLATFORM-SPECIFICATION.md) — Architecture

### Optional Services (Enable Features)

| Service | Feature Enabled | Setup Guide |
|---------|----------------|-------------|
| **Stripe** | Payments & bookings | [DEVELOPER-SETUP.md#stripe](DEVELOPER-SETUP.md#1-stripe-payment-processing) |
| **Resend** | Email notifications | [DEVELOPER-SETUP.md#resend](DEVELOPER-SETUP.md#2-resend-email-service) |
| **Ably** | Real-time chat | [DEVELOPER-SETUP.md#ably](DEVELOPER-SETUP.md#3-ably-real-time-messaging) |
| **Claude Code** | AI development | [DEVELOPER-SETUP.md#claude-code](DEVELOPER-SETUP.md#2-claude-code-cli) |

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run dev:web          # Frontend only
npm run dev:api          # Backend only

# Quality Checks
npm run workflow:check   # Quick health check
npm run workflow:test    # Run all tests
npm run workflow:full    # Complete validation (use before commit!)

# Fixes
npm run lint:fix         # Auto-fix linting errors
npm run workflow:clean   # Clean & reinstall dependencies

# Environment
npm run sync:env         # Sync new env variables from .env.example
```

---

## Troubleshooting

### Port 3000 Already in Use
```bash
kill -9 $(lsof -ti:3000)
npm run dev
```

### Missing Dependencies
```bash
npm run workflow:clean
```

### Environment Variables Not Loading
```bash
# Restart dev server after changing .env.local
# Ctrl+C then npm run dev
```

### Database Connection Error
```bash
# Verify Supabase URL is correct
grep SUPABASE_URL .env.local

# Use pooler connection (aws-1-eu-west-2) for queries
# Use non-pooling port 5432 for DDL/migrations
```

### Stale Build Cache
```bash
rm -rf apps/web/.next
npm run dev
```

---

## Helpful Aliases

```bash
# Load shortcuts (run once per terminal session)
source .dev-aliases.sh

# Then use:
tw-dev       # npm run dev
tw-check     # npm run workflow:check
tw-full      # npm run workflow:full
tw-clean     # npm run workflow:clean
```

---

## Getting Help

1. **Read full setup guide**: [DEVELOPER-SETUP.md](DEVELOPER-SETUP.md)
2. **Check troubleshooting**: [DEVELOPER-SETUP.md#troubleshooting](DEVELOPER-SETUP.md#troubleshooting)
3. **Run diagnostics**: `npm run workflow:check`
4. **Ask the team**: Create GitHub issue or ask in Slack

---

For complete setup with all tools and services, see [DEVELOPER-SETUP.md](DEVELOPER-SETUP.md)
