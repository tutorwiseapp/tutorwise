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
│   └── api/              # FastAPI backend (Python, PostgreSQL, Redis)
├── packages/
│   ├── shared-types/     # Shared TypeScript definitions
│   └── ui/               # Reusable component library (future)
├── tools/
│   ├── cas/              # Contextual Autonomous System
│   ├── scripts/          # Build automation
│   ├── playwright/       # E2E testing
│   └── percy/            # Visual regression
├── tests/                # Centralized testing
└── docs/                 # Comprehensive documentation
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

**CAS** is our AI-powered autonomous infrastructure that manages development workflows without human intervention.

### What CAS Does

- **Self-Monitoring**: Daily project audits and protection reports (24/7 via GitHub Actions)
- **Self-Documenting**: Auto-generated audit PDFs, markdown reports, and snapshots
- **Self-Healing**: Error detection, retry logic, and automatic recovery
- **Self-Improving**: Pattern recognition, metric analysis, and optimization recommendations

### CAS Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 CONTEXTUAL INPUTS                        │
│  Jira • GitHub • Google Docs • Calendar • Figma         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              CAS INTELLIGENCE LAYER                      │
│  Context Analysis • Pattern Learning • Decision Making   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│            AUTONOMOUS EXECUTION LAYER                    │
│  Task Automation • Code Generation • Quality Gates      │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│            SELF-MANAGED PRODUCTION                       │
│  Monitoring • Healing • Documentation • Optimization     │
└─────────────────────────────────────────────────────────┘
```

CAS aggregates context from 6+ sources (Jira, GitHub, Google Workspace, Figma, Confluence), analyzes patterns, makes autonomous decisions, and executes workflows—all while continuously monitoring, healing, and improving itself.

**AI Velocity**: ~40-60 hours/month of automated work with 0 human hours invested.

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

**Location**: `tools/cas/` | **Full Documentation**: `docs/CAS-OVERVIEW.md`

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
- **[CAS Overview](docs/CAS-OVERVIEW.md)** - Contextual Autonomous System
- **[Testing Plan](docs/testing/tutorwise-test-plan.md)** - Comprehensive test strategy
- **[CCDP Process](docs/development/CCDP-TUTORWISE.md)** - Development workflow
- **[Migration Report](docs/development/monorepo-migration-report.md)** - Monorepo migration details

### Documentation Structure
```
docs/
├── requirements/         # Business requirements
├── design/              # UI/UX and system design
├── development/         # Development processes
├── testing/             # Test strategies
├── deployment/          # Deployment guides
├── integration/         # Third-party integrations
├── infrastructure/      # Infrastructure setup
└── reference/           # API references
```

### Documentation Philosophy

All documentation is **AI-generated and maintained** to ensure:
- **Consistency**: Uniform structure across all docs
- **Currency**: Regular updates aligned with code changes
- **Completeness**: Comprehensive feature coverage
- **Accuracy**: Synchronized with actual implementation

---

## Migration History

Successfully migrated from single-repo to monorepo on **September 27, 2024**:

- ✅ **100% Success Rate** - Zero breaking changes
- ✅ **189 Files Migrated** - Git history preserved
- ✅ **197 Imports Updated** - Automatic path resolution
- ✅ **All Deployments Working** - Vercel + Railway operational

See `docs/development/monorepo-migration-report.md` for details.

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
