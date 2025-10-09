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

### 3-Tier Monorepo Architecture

```
tutorwise/
├── apps/                 # 📱 Applications
│   ├── web/              # Next.js 14 frontend (TypeScript, Tailwind)
│   │   ├── src/app/      # App Router pages & API routes
│   │   ├── src/lib/      # Utilities and helpers
│   │   └── tests/        # Unit tests (Jest + RTL)
│   └── api/              # FastAPI backend (Python, PostgreSQL, Redis)
│       ├── app/          # FastAPI application
│       └── tests/        # Backend tests (pytest)
│
├── cas/                  # 🤖 AI Tooling & Workflows
│   ├── agents/           # 8 specialized AI agents
│   │   ├── planner/      # Project Manager
│   │   ├── analyst/      # Business Analyst
│   │   ├── developer/    # Software Developer
│   │   ├── tester/       # QA Tester
│   │   ├── qa/           # QA Engineer
│   │   ├── security/     # Security Engineer
│   │   ├── engineer/     # System Engineer
│   │   └── marketer/     # Marketing Manager
│   ├── tools/            # CAS utilities
│   │   ├── testing/      # Test automation scripts
│   │   ├── automation/   # Workflow automation
│   │   ├── monitoring/   # Health monitoring
│   │   ├── security/     # Security tooling
│   │   └── utilities/    # General utilities
│   ├── process/          # QA & development workflows
│   └── docs/             # CAS documentation
│
├── packages/             # 📦 Shared Packages
│   ├── shared-types/     # TypeScript definitions
│   └── shared/           # Utilities (config, stripe, supabase)
│
├── tests/                # 🧪 Cross-App Testing
│   ├── e2e/              # Playwright E2E tests
│   ├── integration/      # Integration tests
│   ├── helpers/          # Shared test utilities
│   └── playwright.config.ts
│
├── tools/                # 🔧 Shared Dev Infrastructure
│   ├── scripts/          # Deployment, setup scripts
│   ├── configs/          # Shared configurations
│   ├── database/         # DB utilities
│   ├── rbac/             # AI permission system
│   └── docs/             # Tool documentation
│
└── docs/                 # 📚 Documentation
    ├── development/      # Dev guides
    ├── testing/          # Test strategies
    ├── deployment/       # Deployment procedures
    ├── integration/      # Third-party integrations
    └── archive/          # Historical docs & sessions
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

### Enhanced CAS 2.0 - AI Product Team with Strategic Feedback Loop

**Delivery Model:** Continuous Flow with Weekly Milestones (not traditional 2-week sprints)
**Philosophy:** AI operates 24/7 in continuous delivery mode; "weeks" are measurement windows for human stakeholders

```
┌───────────────────────────────────────────────────────────────┐
│    PLANNER PDM (Product Delivery Manager)                      │
│    • Product Vision & Roadmap                                  │
│    • Strategic Prioritization                                  │
│    • Continuous Delivery Orchestration                         │
└─────────────────────┬──────────────────────────────────────────┘
                      ↓
         ┌────────────┴─────────────┐
         ↓                          ↓
┌─────────────────┐        ┌────────────────────┐
│  ANALYST        │────→   │   DEVELOPER        │
│  Product Analyst│        │   Feature Dev      │
│  • Market Intel │        │   Implementation   │
└────────┬────────┘        └─────────┬──────────┘
         ↑                           ↓
         │                  ┌────────────────┐
         │                  │    TESTER      │
         │                  │   Validation   │
         │                  └────────┬───────┘
         │                           ↓
         │             ┌─────────────┴────────────┐
         │             ↓                          ↓
         │   ┌──────────────────┐     ┌──────────────────┐
         │   │       QA         │     │   SECURITY       │
         │   │  Quality Check   │     │  Scan & Audit    │
         │   └────────┬─────────┘     └────────┬─────────┘
         │            │                        │
         │            └──────────┬─────────────┘
         │                       ↓
         │           ┌───────────────────────┐
         │           │     ENGINEER          │
         │           │  AI-DevOps            │
         │           │  Deploy & Monitor     │
         │           └───────────┬───────────┘
         │                       ↓
         │           ┌───────────────────────┐
         │           │     MARKETER          │
         │           │  Growth & Analytics   │
         │           │  • Usage Data         │
         │           │  • User Feedback      │
         │           └───────────┬───────────┘
         │                       ↓
         └───────────────────────┘
              Strategic Feedback Loop ♻️
```

**Key Innovation:**
- **Strategic Loop:** Marketer → Analyst → Planner → Development → Measure
- **Continuous Delivery:** No sprint boundaries, ship when ready
- **Weekly Milestones:** For measurement and stakeholder communication only

### 8 Specialized AI Agents

| Agent | Role | Focus | Week 2 Status |
|-------|------|-------|---------------|
| **Planner** | Strategic PDM (Product Delivery Manager) | **Product vision, roadmap, prioritization** + execution | ✅ 8/8 todos (100%) |
| **Analyst** | Product Analyst | **Market research, competitive analysis** + requirements | ✅ Requirements delivered |
| **Developer** | Software Developer | Feature development (forms, components, logic) | ✅ 2 forms \| 751 LOC \| 89.71% |
| **Tester** | QA Tester | Test automation, validation | ✅ 48 tests \| 100% passing |
| **QA** | QA Engineer | Quality assurance, visual testing | ✅ 29 Storybook stories |
| **Security** | Security Engineer | Security audits, vulnerability scanning | 🟡 Week 3 activation |
| **Engineer** | AI-DevOps Engineer | System engineering (APIs, deploy, monitor, support) | ✅ API operational |
| **Marketer** | Growth & Analytics Manager | **Usage analytics, feedback collection** → feeds Analyst | 🔴 Week 3+ activation |

**Strategic Feedback Loop:** Marketer (data) → Analyst (insights) → Planner (decisions) → Development → Marketer (measure) ♻️

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
├── development/         # Dev guides & processes
├── testing/             # Test strategies (Storybook, Percy, E2E)
├── deployment/          # Deployment procedures
├── integration/         # Third-party integrations (Vinite, etc)
├── ai/                  # AI integration documentation
├── security/            # Security policies
├── infrastructure/      # Infrastructure setup
├── project-management/  # Project strategy & roadmaps
└── archive/             # Historical docs
    ├── sessions/        # Development session summaries
    ├── reports/         # Completion reports
    └── guard-tests/     # Legacy GUARD test infrastructure

cas/docs/
├── guides/              # CAS implementation guides
├── context-engineering/ # Context engineering docs
└── *.md                 # Architecture & quick-start guides
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
