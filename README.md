# Tutorwise - AI-Powered Tutoring Marketplace

> A paradigm shift in education technology: Multi-role marketplace meets autonomous AI infrastructure

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-green)](https://fastapi.tiangolo.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-Deployed-black)](https://vercel.com)

## Overview

Tutorwise transforms the traditional tutoring marketplace (like Superprof, MyTutor) into a **comprehensive user-centric ecosystem** powered by autonomous AI. Built with modern tech stack and the **Contextual Autonomous System (CAS)**, Tutorwise demonstrates how AI can autonomously manage software development, monitoring, and continuous evolution.

### What Makes Tutorwise Different

**🎭 Multi-Role Innovation**
- Single account serves Client, Tutor, and Agent roles with seamless switching
- Dynamic dashboards adapt to user context (Learning Hub, Teaching Studio, Agency)
- Seven revenue streams on one unified platform

**🤖 Autonomous AI Infrastructure**
- **CAS (Contextual Autonomous System)** handles tactical execution while humans focus on strategy
- Self-monitoring, self-healing, self-documenting infrastructure
- 24/7 automated operations via GitHub Actions

**🔗 Enterprise Integration**
- Jira/Confluence, Google Workspace, HubSpot, Zoom, Pencil Spaces
- Stripe Connect for multi-party payments
- Neo4j for complex relationship mapping

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev              # Frontend (port 3002)
npm run dev:api          # Backend (port 8000)

# Run tests
npm run test:all         # All tests (frontend + backend + E2E)
npm run quality:check    # Linting + tests + build verification
```

---

## Core Features

### Business Capabilities
1. **Tutor Marketplace** - Service listings and discovery
2. **Client Requests** - Reverse marketplace for lesson requests
3. **Group Sessions** - Agent-led collaborative learning
4. **Job Board** - Tutoring opportunities
5. **Course Sales** - Digital content marketplace
6. **AI Tutors** - Automated tutoring services
7. **RATA (Refer Anything To Anyone)** - Universal referral system

### Platform Features
- **Role Management**: Seamless switching between Client, Tutor, Agent
- **Smart Matching**: Neo4j-powered relationship recommendations
- **Payment Processing**: Stripe Connect for complex transactions
- **Real-time Updates**: Live notifications and messaging
- **Network Building**: Organized connections (e.g., "Maths Tutors", "Year 10 Students")
- **Responsive Design**: Mobile-first with Tailwind CSS

---

## Architecture

### Monorepo Structure

```
tutorwise/
├── apps/
│   ├── web/              # Next.js 14 frontend (TypeScript, Tailwind)
│   │   └── src/
│   │       ├── app/      # Next.js App Router pages & API routes
│   │       ├── lib/      # Utilities and helpers
│   │       └── middleware.ts  # Auth & route protection
│   └── api/              # FastAPI backend (Python, PostgreSQL, Redis)
├── packages/
│   ├── shared-types/     # Shared TypeScript definitions
│   ├── shared/           # Shared utilities (config, stripe, supabase, etc.)
│   └── ui/               # Reusable component library (future)
├── cas/                  # Contextual Autonomous System
│   ├── packages/         # CAS core, agent, SADD
│   ├── apps/             # CAS CLI tools
│   ├── docs/             # CAS documentation
│   └── config/           # Application & service registry
├── tools/
│   ├── scripts/          # Build automation, deployment, monitoring
│   │   ├── deployment/   # Railway & Vercel deploy scripts
│   │   ├── security/     # Credential backup & protection
│   │   ├── monitoring/   # Health checks & audits
│   │   └── setup/        # Environment setup utilities
│   ├── rbac/             # AI permission system
│   ├── playwright/       # E2E testing config
│   └── integrations/     # Third-party service configs
├── tests/                # Centralized testing
│   ├── unit/             # Jest unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # Playwright E2E tests
├── docs/                 # Comprehensive documentation
│   ├── development/      # Dev guides & processes
│   ├── deployment/       # Deployment procedures
│   ├── features/         # Feature specifications
│   ├── ai/               # Gemini AI integration docs
│   └── security/         # Security policies & guides
├── human/                # Product engineer notes & artifacts
└── process/              # Process-related documentation
```

### Tech Stack

**Frontend**
- Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI
- Deployed on Vercel

**Backend**
- FastAPI, Python, PostgreSQL, Redis
- Deployed on Railway with Docker

**Database & Services**
- Supabase (PostgreSQL + Auth)
- Neo4j Aura (Graph relationships)
- Stripe Connect (Payments)
- Railway Redis (Caching)

**Development & Testing**
- Jest (unit), Playwright (E2E), Percy (visual)
- GitHub Actions (CI/CD)
- CAS (autonomous monitoring)

---

## Contextual Autonomous System (CAS)

**CAS 2.0** is our **Enhanced AI Product Team** - a complete autonomous software development team with 8 specialized AI agents that coordinate to deliver production-ready features.

### What Makes CAS 2.0 Different

- **AI Product Team**: Models a complete enterprise team (PM, developers, testers, QA, security, infrastructure)
- **Autonomous Coordination**: Agents work together with zero human intervention (Analyst → Developer → Tester → QA → Engineer)
- **Auto-Maintained Plans**: Documentation updates itself from todos and reports
- **Production-Ready Output**: Week 2 delivered 2 forms with 48 tests (100% passing) and 89.71% coverage

### Week 2 Achievements (2025-10-08)

✅ **2 Production Forms Delivered**
- ClientProfessionalInfoForm (327 lines)
- AgentProfessionalInfoForm (424 lines)

✅ **48/48 Unit Tests Passing** (100%)
- Average coverage: 89.71%
- Zero flaky tests

✅ **29 Storybook Stories Created**
- All interaction patterns covered
- Responsive viewports tested

✅ **Zero Blockers** - Smooth autonomous execution

### Enhanced CAS 2.0 - AI Product Team Architecture

```
┌──────────────────────────────────────────────────────────┐
│         PLANNER AGENT (Project Manager)                   │
│  Sprint Planning • Coordination • Blocker Resolution      │
└────────────────────┬─────────────────────────────────────┘
                     ↓
        ┌────────────┴────────────┐
        ↓                         ↓
┌───────────────┐        ┌───────────────────┐
│  ANALYST      │────→   │    DEVELOPER      │
│ Requirements  │        │  Implementation   │
└───────────────┘        └─────────┬─────────┘
                                   ↓
                         ┌─────────────────┐
                         │     TESTER      │
                         │   Validation    │
                         └─────────┬───────┘
                                   ↓
                      ┌────────────┴──────────┐
                      ↓                       ↓
            ┌─────────────────┐     ┌────────────────┐
            │       QA        │     │   SECURITY     │
            │   Quality Check │     │  Scan & Audit  │
            └─────────┬───────┘     └────────┬───────┘
                      │                      │
                      └──────────┬───────────┘
                                 ↓
                     ┌───────────────────────┐
                     │     ENGINEER          │
                     │  Deploy & Monitor     │
                     └───────────┬───────────┘
                                 ↓
                     ┌───────────────────────┐
                     │     MARKETER          │
                     │   Analytics & Growth  │
                     └───────────────────────┘
```

### 8 Specialized AI Agents

| Agent | Role | Week 2 Status |
|-------|------|---------------|
| **Planner** | Project Manager | ✅ 8/8 todos completed (100%) |
| **Analyst** | Business Analyst | ✅ Requirements delivered |
| **Developer** | Software Developer | ✅ 2 forms | 751 LOC | 89.71% coverage |
| **Tester** | QA Tester | ✅ 48 tests | 100% passing |
| **QA** | QA Engineer | ✅ 29 Storybook stories |
| **Security** | Security Engineer | 🟡 Week 3 activation |
| **Engineer** | System Engineer | ✅ API operational |
| **Marketer** | Marketing Manager | 🔴 Week 3+ activation |

**AI Velocity**: Week 2 delivered in 1 day what traditionally takes 5 days (400% faster)

### CAS Commands

```bash
# Generate contextual intelligence from 6+ sources
npm run cas:generate

# Update CAS knowledge base
npm run cas:update

# Initialize CAS infrastructure
npm run cas:setup

# Backward compatible (still work)
npm run context:generate
npm run context:update
npm run context:setup
```

**Location**: `cas/`

**Full Documentation**:
- [Enhanced CAS Architecture](cas/docs/ENHANCED-CAS-AI-PRODUCT-TEAM.md)
- [Week 2 Summary](cas/docs/WEEK-2-SUMMARY.md)
- [CAS README](cas/README.md)
- Agent READMEs: [Planner](cas/agents/planner/README.md) | [Analyst](cas/agents/analyst/README.md) | [Developer](cas/agents/developer/README.md) | [Tester](cas/agents/tester/README.md) | [QA](cas/agents/qa/README.md) | [Security](cas/agents/security/README.md) | [Engineer](cas/agents/engineer/README.md) | [Marketer](cas/agents/marketer/README.md)

---

## Available Scripts

### Development
```bash
npm run dev              # Start frontend (port 3002)
npm run dev:api          # Start backend (port 8000)
npm run build            # Production build
```

### Testing
```bash
npm run test             # Frontend unit tests
npm run test:backend     # Backend tests (pytest)
npm run test:e2e         # E2E tests (Playwright)
npm run test:visual      # Visual regression (Percy)
npm run test:all         # All tests
npm run quality:check    # Full quality pipeline
```

### Code Quality
```bash
npm run lint             # Lint frontend
npm run lint:backend     # Lint backend (ruff)
```

### CAS Operations
```bash
npm run cas:generate     # Generate contextual intelligence
npm run cas:update       # Update knowledge base
npm run cas:setup        # Initialize infrastructure
```

---

## Environment Setup

### Frontend (`apps/web/.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

### Backend (`apps/api/.env`)
```bash
DATABASE_URL=your_database_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret
NEO4J_URI=your_neo4j_uri
REDIS_URL=your_redis_url
```

---

## Testing Infrastructure

### Frontend Testing
- **Unit Tests**: Jest + React Testing Library
- **Component Tests**: Isolated component testing
- **Integration Tests**: API route testing with mocks

### Backend Testing
- **FastAPI Test Client**: Comprehensive fixtures in `apps/api/tests/conftest.py`
- **Database Mocking**: Redis and Neo4j mock fixtures
- **Authentication**: JWT token generation and validation
- **Async Testing**: AsyncClient and async test runners

### End-to-End Testing
- **Playwright**: Browser automation
- **Percy**: Visual regression testing
- **Results**: Centralized in `tests/test-results/`

---

## Deployment

### Frontend (Vercel)
- **Build**: `cd apps/web && npm run build`
- **Output**: `apps/web/.next`
- **Auto-Deploy**: GitHub main branch → Vercel production

### Backend (Railway)
- **Build**: Docker from `apps/api/Dockerfile`
- **Health Check**: `/health` endpoint
- **Environment**: Production database, Redis

---

## Documentation

### Core Documentation
- **[CAS Overview](cas/docs/guides/CAS-OVERVIEW.md)** - Contextual Autonomous System architecture
- **[CAS Quick Start](cas/docs/quick-start.md)** - Getting started with CAS
- **[SADD Overview](cas/docs/sadd/SADD-SOFTWARE-APPLICATION-DISCOVERY-AND-DEVELOPMENT.md)** - Software Application Discovery & Development
- **[Development Quick Start](docs/development/quick-start-guide.md)** - Quick start for developers
- **[Deployment Guide](docs/deployment/pre-deployment-review.md)** - Pre-deployment checklist
- **[Testing Plan](docs/testing/tutorwise-test-plan.md)** - Comprehensive test strategy
- **[Security Guide](docs/security/credential-backup-guide.md)** - Credential management & backup

### Documentation Structure
```
docs/
├── development/         # Development processes & guides
├── deployment/          # Deployment procedures & notes
├── features/            # Feature specifications & roadmaps
├── ai/                  # Gemini AI integration documentation
├── security/            # Security policies & credential management
├── requirements/        # Business requirements
├── design/              # UI/UX and system design (Figma exports)
├── testing/             # Test strategies & plans
├── integration/         # Third-party integrations
├── infrastructure/      # Infrastructure setup
├── tools/               # Tool configurations & status
└── project-audit/       # Automated audit reports

cas/docs/
├── guides/              # CAS implementation guides
├── sadd/                # SADD (Software Application Discovery) docs
└── *.md                 # Architecture, consolidation, quick-start guides
```

### Documentation Philosophy

All documentation is **AI-generated and maintained** to ensure:
- **Consistency**: Uniform structure across all docs
- **Currency**: Regular updates aligned with code changes
- **Completeness**: Comprehensive feature coverage
- **Accuracy**: Synchronized with actual implementation

---

## Recent Updates

### October 2024 - Major Infrastructure Improvements

**Project Organization** ✅
- Cleaned up root directory - moved all documentation to organized subdirectories
- Migrated middleware.ts to `apps/web/src/` for better Next.js conventions
- Reorganized 150+ files into proper locations (docs/, cas/, tools/)
- Enhanced file naming with clear prefixes (DEV-, DEPLOY-, AI-, SECURITY-, CAS-, SADD-)

**CAS Infrastructure** ✅
- Complete CAS consolidation from `tools/cas/` → `cas/` directory
- Added SADD (Software Application Discovery & Development) packages
- Implemented comprehensive CAS documentation and guides
- Created application registry for multi-project support

**Security & Monitoring** ✅
- Implemented AI RBAC (Role-Based Access Control) system
- Added critical files protection with automated monitoring
- Created comprehensive backup and rollback procedures
- Daily/weekly automated audit reports with email notifications

**Deployment Pipeline** ✅
- Fixed Vercel account configuration (migrated from personal to business account)
- Established GitHub → Vercel auto-deployment
- Configured all production environment variables
- Enhanced deployment scripts with health checks and monitoring

### September 2024 - Monorepo Migration

Successfully migrated from single-repo to monorepo on **September 27, 2024**:

- ✅ **100% Success Rate** - Zero breaking changes
- ✅ **189 Files Migrated** - Git history preserved
- ✅ **197 Imports Updated** - Automatic path resolution
- ✅ **All Deployments Working** - Vercel + Railway operational

---

## Contributing

1. Follow established patterns in each application
2. Update shared types (`packages/shared-types/`) when adding data structures
3. Run `npm run quality:check` before committing
4. Use CCDP process documented in `docs/development/CCDP-TUTORWISE.md`
5. Generate fresh context: `npm run cas:generate` after significant changes

### Pre-commit Checks (Automated)
- ✅ Critical files protection
- ✅ Unit tests (Jest)
- ✅ Linting (ESLint)
- ✅ Build verification

---

## Support & Resources

- **Documentation**: Comprehensive guides in `docs/` directory
- **AI Context**: `npm run cas:generate` for AI-assisted development
- **Issues**: GitHub Issues for bug reports and feature requests
- **Testing**: See `docs/testing/` for testing procedures

---

## License

Proprietary - All rights reserved

---

**Built with ❤️ using Claude Code (AI) + Human Strategic Vision**

*Demonstrating that autonomous AI infrastructure is not just possible—it's operational.*
