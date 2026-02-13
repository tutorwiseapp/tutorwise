# TutorWise Quick Start Guide

**Get running in 5 minutes**

---

## Prerequisites

✅ Node.js 18+ installed
✅ Git installed
✅ Code editor (VSCode recommended)

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
- ✅ Install dependencies (`npm install`)
- ✅ Create `.env.local` from template
- ✅ Set up git hooks
- ✅ Run health check

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
3. Get credentials from Project Settings → API

---

## 3. Start Development (1 minute)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

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

- 📖 **[DEVELOPER-SETUP.md](DEVELOPER-SETUP.md)** - Complete setup guide
- 🔧 **[environment-setup.md](../docs/development/environment-setup.md)** - Daily workflow
- 🗺️ **[ROADMAP.md](1 - ROADMAP.md)** - Product roadmap
- 🏗️ **[PLATFORM-SPECIFICATION.md](2 - PLATFORM-SPECIFICATION.md)** - Architecture

### Optional Services (Enable Features)

| Service | Feature Enabled | Setup Guide |
|---------|----------------|-------------|
| **Stripe** | Payments & bookings | [DEVELOPER-SETUP.md#stripe](DEVELOPER-SETUP.md#1-stripe-payment-processing) |
| **Resend** | Email notifications | [DEVELOPER-SETUP.md#resend](DEVELOPER-SETUP.md#2-resend-email-service) |
| **Ably** | Real-time chat | [DEVELOPER-SETUP.md#ably](DEVELOPER-SETUP.md#3-ably-real-time-messaging) |
| **Neo4j** | Recommendations | [DEVELOPER-SETUP.md#neo4j](DEVELOPER-SETUP.md#2-neo4j-graph-database) |
| **Claude Code** | AI development | [DEVELOPER-SETUP.md#claude-code](DEVELOPER-SETUP.md#2-claude-code-cli) |
| **Gemini AI** | AI features | [DEVELOPER-SETUP.md#gemini](DEVELOPER-SETUP.md#1-google-gemini-api) |

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
cat .env.local | grep SUPABASE_URL

# Check Supabase project is running at app.supabase.com
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

**Happy coding! 🚀**

For complete setup with all tools and services, see [DEVELOPER-SETUP.md](DEVELOPER-SETUP.md)
