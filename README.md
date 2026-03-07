# TutorWise

**Tutoring Marketplace and CRM Platform**

**Version**: 1.1.0
**Status**: Beta (Launched 1 Mar 2026)
**Last Updated**: 2026-03-06

---

## Project Overview
TutorWise is a production-grade, full-stack EdTech marketplace and CRM ecosystem designed to unify the fragmented tutoring economy. Built with Next.js 16 and Supabase, it features a unique "Single Account, Multi-Role" identity system that allows users to seamlessly switch between Client, Tutor, and Agent personas.

Unlike standard marketplaces, TutorWise integrates a sophisticated "Growth Engine" directly into its core, leveraging a proprietary Profile Graph to power viral referrals, network building, and commission tracking.

Key Pillars & Capabilities
1. AI-Powered Credibility (CaaS)
The platform features a built-in Credibility as a Service (CaaS) engine. This system automatically scores tutor reliability and professionalism based on verified "Proof of Work" data points—such as completed sessions and saved artifacts—rather than just subjective reviews.

2. VirtualSpace (Hybrid Virtual Classroom)
A cost-optimized, zero-marginal-cost virtual learning environment. It employs a "Hybrid Model" that embeds a collaborative whiteboard (powered by tldraw and Ably real-time sync) alongside external video conferencing (Google Meet integration), ensuring a robust classroom experience without heavy infrastructure costs.

3. Collaborative Wiselists (Planning & Growth)
An "Airbnb-style" planning tool that serves as a dual-purpose growth engine. Users can curate and share lists of tutors (e.g., "GCSE Maths Prep"), which drives both viral user acquisition (via external invites) and in-network sales attribution (via tracking cookies and Stripe webhooks).

4. Smart Marketplace & CRM
Listings: Granular service listings with "Free Help" options and dynamic availability.

Bookings & Payments: Integrated Stripe Connect flow handling complex commission splitting, payouts, and dispute management.

Network: A LinkedIn-style connection graph allowing Agents to manage tutor rosters and students to build educational networks.

5. Contextual Autonomous System (CAS)
The platform is developed and maintained by CAS, an AI-driven "Product Team" framework. This system utilizes specialized AI agents (Planner, Analyst, Developer, Tester) to auto-maintain project plans, execute code, and enforce "Production-Ready" quality standards through automated auditing. CAS is also exposed as an admin platform at `/admin/cas`.

6. Growth Agent (£10/month AI Advisor)
A role-adaptive AI advisor for all users (Tutor, Client, Agent, Organisation). Powered by a DSPy-style knowledge base (5 skill files covering pricing benchmarks, referral strategy, UK business/tax, income discovery, and compliance). Includes a free Revenue Audit tier.

7. iPOM Studio (Intelligent Process & Operations Management)
A unified admin canvas at `/admin/studio` for automating business processes. Phase 1 (Process Execution Engine) is complete with 5 live/shadow workflows (Tutor Approval, Commission Payout, Booking Lifecycle, Referral Attribution). Phase 2 adds AI Agents and multi-agent Teams.

8. Sage AI GCSE Tutor (**[Documentation](sage/README.md)**)
An AI-powered GCSE tutor providing personalized educational support with comprehensive curriculum coverage. Features:
- **100+ curriculum topics** across 6 subjects (Maths, Biology, Chemistry, Physics, History, Geography)
- **Multimodal input**: OCR (handwriting/textbook recognition) + Speech-to-Text via Gemini Vision & Audio
- **Hybrid RAG system** with semantic + keyword search across all subjects
- **Mathematical solver** combining SymPy, Algebrite, and LLM reasoning
- **Feedback loop** with automated gap detection and content regeneration
- **Safety & Ethics Framework**: Age gates, parental controls, content monitoring, usage limits (COPPA/GDPR compliant)
- **4 personas**: Student, Tutor, Parent, Agent with adaptive tone and capabilities

**Version**: 2.0.0 | **Status**: Active Production | **Latest**: Science & Humanities curriculum (Feb 2026)

9. Lexi AI Help Bot (**[Documentation](lexi/README.md)**)
An AI-powered platform assistant providing instant support and task automation across all user roles. Features:
- **20+ function tools** for booking management, tutor search, progress tracking, payments
- **5 primary personas** + 4 specialized sub-personas (earnings expert, matching helper, etc.)
- **Guest mode** with Rules-only provider (zero API cost for unauthenticated users)
- **Multi-provider** architecture (Gemini, Claude, DeepSeek, Rules-based fallback)
- **Deep links** for seamless platform navigation

**Version**: 2.0.0 | **Status**: Active Production

Short Description: TutorWise is an AI-enhanced tutoring ecosystem that merges a professional marketplace with powerful CRM tools. Featuring the VirtualSpace hybrid classroom, CaaS credibility scoring, Lexi AI assistant, Sage analytics, and Collaborative Wiselists, it empowers Tutors, Students, and Agents to connect, plan, and learn within a single, trust-based network.

---

## Quick Start

**New developers**: See **[.ai/QUICK-START.md](.ai/QUICK-START.md)** for complete 5-minute setup guide.

```bash
# Automated setup (recommended for first-time setup)
./tools/scripts/setup/setup-dev-env.sh

# Or manual setup:
npm install                       # Install dependencies
npm run sync:env                  # Sync environment variables
npm run dev                       # Start Next.js dev server

# Frontend: http://localhost:3000
# Backend: Supabase (cloud-hosted PostgreSQL + Auth + Storage)
```

**Complete setup guide**: [.ai/DEVELOPER-SETUP.md](.ai/DEVELOPER-SETUP.md)

---

## Project Structure

```
tutorwise/
├── apps/
│   └── web/              # Next.js 16 frontend + API routes
├── sage/                 # Sage AI GCSE Tutor (standalone package)
├── lexi/                 # Lexi AI Help Bot (standalone package)
├── cas/                  # CAS AI development framework
├── ipom/                 # iPOM Studio solution designs & docs
├── tools/                # Development tools & DB migration scripts
├── tests/                # Test suites (Jest, Playwright, Percy)
└── docs/                 # Feature & architecture documentation
```

---

## Tech Stack

### Frontend (ACTIVE)
- **Next.js 16.x** - React framework with App Router
- **TypeScript 5.x** - Type safety and developer experience
- **React 19** - UI library with Server Components
- **Tailwind CSS** - Utility-first styling with 70+ CSS variables
- **React Query (TanStack Query)** - Data fetching and server state management
- **Zustand** - Lightweight client state management

### Backend & Database (ACTIVE)
- **Next.js API Routes** - Primary API (serverless functions)
- **Supabase** - PostgreSQL database with Row-Level Security (200+ RLS policies)
- **Supabase Auth** - Authentication with OAuth (Google)
- **Supabase Storage** - CDN-backed file storage for avatars and documents
- **Supabase Functions** - Edge functions for server-side logic

### AI Providers (6-Tier Fallback Chain)
- **xAI Grok 4 Fast** - Primary LLM (env: `XAI_AI_API_KEY`)
- **Google Gemini Flash** - Tier 2 + embedding model (`gemini-embedding-001`, 768-dim) (`GOOGLE_AI_API_KEY`)
- **DeepSeek R1** - Tier 3 cost-efficient reasoning (`DEEPSEEK_AI_API_KEY`)
- **Anthropic Claude Sonnet 4.6** - Tier 4 complex reasoning (`ANTHROPIC_AI_API_KEY`)
- **OpenAI GPT-4o** - Tier 5 (`OPENAI_AI_API_KEY`)
- **Rules-based** - Tier 6, always-on fallback (zero API cost)

All AI access is via the shared service at `apps/web/src/lib/ai/` — `getAIService()` singleton with `generate()`, `generateJSON<T>()`, and `stream()`.

### Third-Party Services & Integrations (ACTIVE)
- **Stripe Connect** - Payment processing and marketplace commissions
- **Ably** - Real-time messaging, presence, typing indicators
- **Resend** - Transactional email delivery
- **Google Calendar API** - Calendar integration for scheduling
- **Sentry** - Error tracking and monitoring
- **Google Analytics** - User analytics and tracking

### Database Extensions (ACTIVE)
- **pgvector** - Semantic search with 768-dim embeddings (Gemini embedding model)
- **PostgreSQL Full-Text Search** - Hybrid search with keyword + semantic ranking
- **HNSW indexes** - Fast approximate nearest neighbor search for RAG

### Admin & Management
- **Custom Admin Dashboard** - Built with Next.js App Router
- **RBAC System** - Role-based access control (Super Admin, Admin, System Admin, Support Admin)
- **Audit Logging** - Complete action tracking and compliance
- **Soft Delete System** - GDPR-compliant data anonymization
- **Hard Delete System** - Complete data purge with Stripe cleanup

### UI Components
- **Custom Design System** - Consistent, accessible component library
- **Hub Components** - Reusable admin/dashboard components
- **Form System** - Dynamic form generation with shared fields
- **Modal System** - Accessible, portal-based modals
- **Data Tables** - Feature-rich tables with sorting, filtering, pagination

### Testing
- **Jest** - Unit testing
- **Playwright** - E2E testing
- **React Testing Library** - Component testing
- **Percy** - Visual regression testing

---

## Development Workflow

### CAS Framework

TutorWise uses **CAS (Contextual Autonomous System)** as a development framework that models an 8-agent product team to ensure quality and consistency.

**Getting Started with CAS**:
```bash
# View CAS user guide
cd cas && npm run cas:help

# Request CAS assistance
cd cas && npm run cas:request
```

**CAS Documentation**:
- **[cas/README.md](cas/README.md)** - Complete CAS overview and architecture (v2.0.0)
- **[cas/agents/marketer/README.md](cas/agents/marketer/README.md)** - Marketer agent (analytics collection)
- **[cas/agents/planner/README.md](cas/agents/planner/README.md)** - Planner agent (strategic planning)
- **[cas/agents/developer/README.md](cas/agents/developer/README.md)** - Developer agent (feature implementation)
- **[cas/agents/analyst/README.md](cas/agents/analyst/README.md)** - Analyst agent (requirements & feedback analysis)

**Quick CAS Usage**:
```
In Claude Code, type:

CAS: Create a new notification badge component

CAS will apply 8 agent perspectives:
  Planner   → What's the priority?
  Analyst   → What are requirements?
  Developer → How to implement?
  Tester    → How to test?
  QA        → Quality checks?
  Security  → Security concerns?
  Engineer  → Infrastructure needs?
  Marketer  → User value?
```

**CAS Benefits**:
- ✅ Systematic quality approach
- ✅ Proven patterns library
- ✅ Consistent code quality
- ✅ Reduced bugs
- ✅ Better test coverage

---

## AI Ecosystem (v3.0.0 - March 2026)

TutorWise features a complete AI ecosystem. All AI is routed through the **6-tier fallback chain** (xAI → Gemini → DeepSeek → Claude → GPT-4o → Rules-based) at `apps/web/src/lib/ai/`.

### 1. **Sage AI GCSE Tutor** ([Documentation](sage/README.md))
- ✅ **110 knowledge chunks** across 22 GCSE Maths topics; Hybrid RAG (pgvector + tsvector)
- ✅ **Mathematical solver** (SymPy + Algebrite + LLM reasoning)
- ✅ **Feedback loop** with automated gap detection (< 60% satisfaction threshold)
- ✅ **Multimodal input** endpoints (OCR, Speech-to-Text)
- 🎯 **Target:** 500+ topics (Maths, English, Science) by Q2 2026

### 2. **Lexi AI Help Bot** ([Documentation](lexi/README.md))
- ✅ **20+ function tools** for bookings, search, payments, navigation
- ✅ **Guest mode** — Rules-only provider (zero API cost for unauthenticated users)
- ✅ **5 personas** (Student, Tutor, Client, Agent, Organisation) + 4 sub-personas
- ✅ **Deep links** for seamless platform navigation

### 3. **Growth Agent** (`apps/web/src/lib/growth-agent/`)
- ✅ Role-adaptive AI advisor for ALL users (Tutor, Client, Agent, Organisation) — **£10/month**
- ✅ **Free tier**: Revenue Audit at `GET /api/growth-agent/audit` (no subscription required)
- ✅ **5 DSPy-style skill files**: pricing benchmarks, referral strategy, UK business/tax, income discovery, compliance
- ✅ **8 tool functions**: tutor profile audit, listing analysis, referral channel review, etc.
- ✅ **API**: `GET/POST /api/growth-agent/session`, `POST /api/growth-agent/stream`

### 4. **CAS AI Product Team** ([Documentation](cas/README.md))
- ✅ **8 specialized agents**: Planner, Analyst, Developer, Tester, QA, Security, Engineer, Marketer
- ✅ **Strategic feedback loop**: Marketer → Planner → Analyst → Developer
- ✅ **Admin dashboard** at `/admin/cas`
- ✅ **Analytics collection** from Sage & Lexi (daily automated jobs)

**Documentation:**
- [Sage README](sage/README.md) - AI tutor documentation
- [Lexi README](lexi/README.md) - Help bot documentation
- [CAS README](cas/README.md) - AI product team documentation
- [iPOM Solution Design](ipom/ipom-solution-design-v3.md) - Process + Agent + Team automation

---

## Key Features

### User Roles
- **Tutors** - Offer tutoring services
- **Clients** - Find and book tutors
- **Agents** - Manage tutors and clients

### Core Functionality
- **User authentication** (Supabase Auth)
- **Profile management** (all 3 roles: Tutor, Client, Agent)
- **Professional info templates** with dynamic field configuration
- **Listing creation and management** with shared field system
- **Search and discovery** with advanced filtering
- **Admin dashboard** with comprehensive user management
- **Payment processing** (Stripe Connect integration)
- **Advanced booking system** (v7.0 - production-ready with scheduling automation)

### Booking System (v7.0 - Advanced Scheduling & Automation - Feb 2026)
- **5-Stage Workflow**: Discover → Book → Schedule → Pay → Review
- **Enhanced Conflict Detection**: Time range overlap + availability exception checking
- **Timezone-Aware Scheduling**: User timezone preferences with auto-conversion
- **Availability Exceptions**: Holiday/vacation blocking (all-day or time-specific)
- **Multi-Interval Reminders**: Automated reminders at 24h, 1h, and 15min before sessions
- **No-Show Auto-Detection**: Automatic detection 30min after session start
- **Recurring Bookings**: Weekly/biweekly/monthly series with conflict checking
- **Cancellation Penalties**: Repeat offender tracking (3+ late cancels in 30 days)
- **Quick Session Ratings**: Immediate 1-5 star capture post-session
- **Production-Ready**: 7 new tables, 5 API routes, 2 cron jobs, 7 utility libraries
- **Documentation**: [Booking Enhancements v7.0 Complete](docs/feature/bookings/BOOKING_ENHANCEMENTS_V7_COMPLETE.md)

### EduPay — Tutoring Rewards → Loan Payments (Phases 1, 1.5 & 3 Complete - Feb 2026)
- **Points Model**: £1 earned = 100 EP → 100 EP = £1 financial impact on student loan
- **EP Wallet**: Track available, pending, and converted EP in real time
- **EP Ledger**: Full activity feed (tutoring income, referrals, affiliate spend, CaaS rewards)
- **Loan Impact Projection**: Years earlier debt-free and projected interest saved (via RPC)
- **Loan Profile Setup**: Plan 1/2/5/Postgraduate + balance + salary + graduation year
- **5 Sidebar Widgets**: Stats, Projection, Loan Profile, Help, Video
- **React Query Gold Standard**: gcTime, retryDelay, placeholderData, retry across all 4 queries
- **API & Data Complete**: 7 API routes, 6 DB tables (migrations 253–257), 4 RPC functions (258), pg_cron (259)
- **Stripe Integration**: Fire-and-forget EP award on every successful payment
- **Phase 3 (PISP Conversion)**: Implemented in stub mode — goes live on TrueLayer partnership (real credentials + SLC sort code)
- **Phase 2 Next**: Affiliate (Awin/CJ) + gift card (Tillo) — blocked on partner onboarding
- **Documentation**: [EduPay Solution Design](docs/feature/edupay/edupay-solution-design.md)

### Referral System (100% Core Complete - Feb 2026)
- **Simplified 4-Stage Pipeline**: Referred → Signed Up → Converted → Expired (automatic transitions)
- **Lifetime 10% Commission**: Earned on ALL future bookings from converted referrals
- **Automated Payouts**: Weekly batch payouts (Fridays 10am UTC) via Stripe Connect
- **7-Day Clearing Period**: Commission clears automatically via hourly pg_cron job
- **90-Day Auto-Expiry**: Unconverted referrals expire automatically via daily pg_cron job
- **Hierarchical Attribution**: URL → Cookie (HMAC-signed) → Manual entry
- **Commission Delegation**: Partners can redirect commissions (coffee shops, schools)
- **Multi-Tier Commissions**: Configurable 1-7 tier system (1-tier active, 3-tier roadmap pending legal review)
- **Fraud Detection**: Automated anomaly detection with admin investigation workflow
- **Email Notifications**: Commission available, payout processed, payout failed
- **£25 Minimum Payout**: Automated threshold prevents micro-transactions

### Admin Features (13 Admin Hubs)
- **Accounts Hub**: Soft/hard delete, GDPR-compliant PII anonymization, admin role hierarchy
- **Bookings Hub**: Session and calendar management, no-show detection
- **Configurations Hub**: Shared fields system (23 fields, 106 mappings, 9 contexts), dynamic form generation
- **Financials Hub**: Transactions, payouts, commission splits, Stripe Connect
- **Listings Hub**: Tutor listing administration
- **Organisations Hub**: Team management, subscriptions, verification
- **Referrals Hub**: Commission tracking, QR codes, fraud detection
- **Reviews Hub**: Moderation and dispute handling
- **SEO Hub**: Hub management, trust graph, eligibility tracking
- **Settings Hub**: Payments, subscriptions, security, integrations, email
- **Users Hub**: User administration and permissions
- **CAS Hub** (`/admin/cas`): CAS AI agent team dashboard, run history, metrics
- **iPOM Studio** (`/admin/studio`): Workflow automation, AI Agents, multi-agent Teams (see below)

### iPOM Studio — Intelligent Process & Operations Management

**Solution Design**: [ipom/ipom-solution-design-v3.md](ipom/ipom-solution-design-v3.md) (v3.4)

#### Phase 1 — Process Execution Engine (COMPLETE)
- **Runtime**: `PlatformWorkflowRuntime` in `apps/web/src/lib/process-studio/runtime/`
- **LangGraph checkpointer**: `PostgresSaver` (session-mode port 5432)
- **5 seeded workflows**: Tutor Approval (live), Commission Payout (live), Booking Lifecycle Human/AI Tutor (shadow), Referral Attribution (design)
- **Shadow mode**: `execution_mode` (`design` | `shadow` | `live`) toggled per workflow via admin
- **Webhook trigger**: Supabase DB webhook on `profiles UPDATE → under_review` → starts Tutor Approval process
- **Cron delegation**: Commission Payout delegated from existing batch cron on Fridays 10am UTC
- **API**: `POST /api/admin/process-studio/execute/start`, `GET/DELETE /api/admin/process-studio/execute/[id]`, `POST /api/admin/process-studio/execute/[id]/resume`, `POST /api/admin/process-studio/execute/task/[taskId]/complete`

#### Phase 2 — Agents + Teams (PLANNED, ~140h)
- **Agent** (single-agent AI specialist) — DB-defined in `analyst_agents` table, schedule + chat driven
- **Team** (multi-agent) — DB-defined in `agent_teams` table; three patterns: Supervisor, Pipeline, Swarm
- **TeamRuntime**: dynamically compiles LangGraph `StateGraph` from DB topology (no code deploy to rewire)
- **CAS Team**: existing 9-agent CAS pipeline exposed as read-only Supervisor Team in registry
- **Migrations planned**: 344–352 (GDPR, growth scores, versioning, analyst agents, agent subscriptions, intelligence, learning, agent teams)

### Help Centre & Support
- **Custom Report Modal**: In-app bug reporting with screenshot capture
- **Jira Service Desk Integration**: Automatic ticket creation
- **Context Capture**: Auto-captures page URL, user role, user agent
- **Screenshot System**: Automatic visual bug documentation
- **Support Snapshots**: Database tracking with sync status
- **Progressive Capture Levels**: Minimal/standard/diagnostic data collection

### Core Features by Module (23 Features)
- **Authentication**: Supabase Auth with OAuth and multi-role support
- **Onboarding**: Page-based routing for all 3 roles (Tutor, Client, Agent) with zero data loss
- **Profiles**: Dynamic profile management with public/private views
- **Marketplace**: Search with 141 API endpoints, smart matching, recommendations
- **Listings**: Dynamic listing creation with shared fields system (23 global fields)
- **Bookings**: Session scheduling, calendar management, assignments
- **Payments**: Stripe Connect with commission splitting and payouts
- **Messages**: WhatsApp-style messaging with Ably real-time platform (typing indicators, presence, delivery status)
- **Network**: Connection management, groups, trust graph
- **Students**: Student (child) relationship to the Client (parent) and the Tutor
- **Wiselists**: Collaborative lists ("My Saves" feature) with sharing
- **VirtualSpace**: Hybrid virtual classroom with tldraw whiteboard + Google Meet (3 modes: standalone, booking, free help)
- **Reviews**: Mutual review system with moderation
- **CaaS**: Credibility scoring (Tutor complete, Agent/Org designed)
- **Referrals**: Multi-tier attribution system with QR codes and gamification
- **Financials**: Earnings tracking, transaction history, payout management
- **EduPay**: Points-based rewards converting tutoring activity into student loan payments (Phases 1, 1.5 & 3 complete — PISP conversion in stub mode)
- **Lexi AI**: Context-aware conversational AI assistant with 5 personas (Student, Tutor, Client, Agent, Organisation)
- **Sage AI**: AI-powered analytics and insights engine with role-specific recommendations
- **Organisations**: Team management, subscriptions, tasks, recruitment
- **Developer Tools**: API key management, webhooks, integrations
- **Help Centre**: In-app bug reporting with Jira Service Desk integration
- **Resources**: Articles for marketing purposes

---

## Documentation

### 📋 Core Documentation (.ai/)
- **[1-ROADMAP.md](.ai/1-ROADMAP.md)** - Development roadmap (98% complete, 20 features, beta Feb 1 2026)
- **[2-PLATFORM-SPECIFICATION.md](.ai/2-PLATFORM-SPECIFICATION.md)** - Complete technical + strategic specification (3,194 lines)
- **[3-SYSTEM-NAVIGATION.md](.ai/3-STEM-NAVIGATION.md)** - Complete codebase navigation & user flows (NEW)
- **[4-PATTERNS.md](.ai/4-PATTERNS.md)** - Development patterns and code conventions
- **[5-CONTEXT-MAP.md](.ai/5-CONTEXT-MAP.md)** - How all context files interconnect
- **[6-DESIGN-SYSTEM.md](.ai/6-DESIGN-SYSTEM.md)** - UI/UX component library & design tokens
- **[7-PROMPT.md](.ai/7-PROMPT.md)** - Tutorwise AI Development Context
- **[8-USER-JOURNEY-MAP.md](.ai/8-USER-JOURNEY-MAP.md)**
- **[ADMIN-DASHBOARD.md](.ai/ADMIN-DASHBOARD.md)** - Admin dashboard architecture (11 hubs)
- **[SHARED-FIELDS.md](.ai/SHARED-FIELDS.md)** - Shared fields system (23 fields, 106 mappings, 9 contexts)
- **[ONBOARDING.md](.ai/ONBOARDING.md)** - Onboarding system (page-based, 3 roles × 5 steps)
- **[TUTORWISE.md](.ai/TUTORWISE.md)** - STRATEGIC PURPOSE AND CORE VALUES / PRINCIPLES FOR RESOLVING CHALLENGES AND ISSUES WE ENCOUNTER IN THE FUTURE

### 🚀 Getting Started
- **[QUICK-START.md](.ai/QUICK-START.md)** - ⚡ Get running in 5 minutes (NEW)
- **[DEVELOPER-SETUP.md](.ai/DEVELOPER-SETUP.md)** - 📖 Complete setup guide with all tools (NEW)
- **[Environment Setup](docs/development/environment-setup.md)** - Daily workflow reference
- **[Development Workflow](docs/development/DEVELOPMENT-WORKFLOW.md)** - Coding patterns and best practices

### 🏗️ Architecture & Design
- **[System Navigation](.ai/SYSTEM-NAVIGATION.md)** - Find where everything lives in the codebase
- **[Platform Specification](.ai/PLATFORM-SPECIFICATION.md)** - Full technical architecture
- **[Design System](.ai/DESIGN-SYSTEM.md)** - UI/UX component library (353 components)
- **[Role-Based Dashboard Design](docs/features/dashboard/role-based-dashboard-design.md)** - Dashboard architecture
- **[User Journey Map](.ai/8-USER-JOURNEY-MAP.md)** - End-to-end user flows for all roles

### 🔧 Feature Documentation
- **[Admin Dashboard](docs/admin/)** - Admin hub architecture and features
- **[CaaS System](docs/features/caas/)** - Credibility as a Service
  - [Agent CaaS Model](docs/features/caas/agent-caas-subscription-incentive-model.md)
  - [Organisation CaaS](docs/features/caas/agent-org-caas-implementation-summary.md)
  - [Dual-Path Architecture](docs/feature/caas/caas-dual-path-architecture.md)
- **[EduPay System](docs/feature/edupay/)** - Tutoring rewards → student loan payments
  - [Solution Design](docs/feature/edupay/edupay-solution-design.md)
- **[Referrals System](docs/feature/referrals/)** - Multi-tier referral system (Phases 1-3)
  - [Solution Design](docs/feature/referrals/referrals-solution-design-v2.md)
  - [Deployment Guide](docs/feature/referrals/DEPLOYMENT-GUIDE.md)
  - [Multi-Tier Decision Rationale](docs/feature/referrals/MULTI_TIER_DECISION_RATIONALE.md)
- **[Help Centre](docs/feature/help-centre/)** - Jira Service Desk integration
  - [Implementation Complete](docs/feature/help-centre/IMPLEMENTATION-COMPLETE.md)
  - [Service Desk Integration](docs/feature/help-centre/service-desk-integration.md)
- **[SEO System](docs/seo/)** - SEO hub implementation and strategy
  - [Implementation Complete](docs/seo-implementation-complete.md)
  - [Top 5 Implementation Plan](docs/seo-top5-implementation-plan.md)
- **[Forms System](docs/FORMS_ADMIN_GUIDE.md)** - Admin forms and shared fields guide

### 💾 Database
- **[Migration Notes](docs/database/migration-notes.md)** - Database migration guide (192 migrations)
- **[Database Docs](docs/database/)** - Schema and migration documentation

### 🔐 Security
- **[Credential Backup Guide](docs/security/credential-backup-guide.md)** - Security credentials management
- **[Security Docs](docs/security/)** - Security policies and guidelines

### 🧪 Testing
- **[Testing Docs](docs/testing/)** - Testing strategies and guides
- **Jest**: Unit testing (106 passing tests)
- **Playwright**: E2E testing
- **Percy**: Visual regression testing

### 📦 Deployment
- **[Deployment Docs](docs/deployment/)** - Deployment guides and processes
- **[Infrastructure](docs/infrastructure/)** - Infrastructure setup and configuration

### 📚 Additional Resources
- **[Help Centre - For Tutors](docs/help-centre/getting-started/for-tutors.md)** - Tutor onboarding guide
- **[Project Management](docs/project-management/)** - Sprint planning and tracking
- **[Development Guide](docs/development/)** - Development best practices
- **[CAS Framework](cas/)** - Optional: AI-assisted development framework

### Quality Standards
- **Feature Checklist**: [cas/docs/feature-development-checklist.md](cas/docs/feature-development-checklist.md)
- **Testing Guide**: [cas/agents/tester/README.md](cas/agents/tester/README.md)
- **QA Standards**: [cas/agents/qa/README.md](cas/agents/qa/README.md)

### Agent Documentation
- **Planner** (PM): [cas/agents/planner/README.md](cas/agents/planner/README.md)
- **Analyst** (BA): [cas/agents/analyst/README.md](cas/agents/analyst/README.md)
- **Developer** (SWE): [cas/agents/developer/README.md](cas/agents/developer/README.md)
- **Tester** (QA Eng): [cas/agents/tester/README.md](cas/agents/tester/README.md)
- **QA** (QA Lead): [cas/agents/qa/README.md](cas/agents/qa/README.md)
- **Security** (SecEng): [cas/agents/security/README.md](cas/agents/security/README.md)
- **Engineer** (SysEng): [cas/agents/engineer/README.md](cas/agents/engineer/README.md)
- **Marketer** (PMM): [cas/agents/marketer/README.md](cas/agents/marketer/README.md)

---

## Commands

### Development
```bash
npm run dev                        # Start Next.js dev server (port 3000)
cd apps/web && npm run build       # Build for production
cd apps/web && npm run lint        # Lint code
```

### Testing
```bash
# Unit tests
npm test                           # All unit tests
npm run test:unit                  # Unit tests only
npm run test:coverage              # With coverage report

# E2E tests
npm run test:e2e                   # Playwright tests
npm run test:e2e -- --headed       # With browser visible
npm run test:e2e -- --debug        # Debug mode

# Visual regression
npm run test:visual                # Percy snapshots
```

### CAS Commands
```bash
cd cas

# Documentation
npm run cas:help                   # View CAS user guide
npm run cas:request                # How to request CAS tasks
npm run cas:view-plan              # View current development plan
npm run cas:status                 # Check agent plan status

# Plan management
npm run cas:update-plan            # Update plan timestamp
```

---

## Environment Setup

### Required Environment Variables

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=postgresql://postgres.xxxxx:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgresql://postgres.xxxxx:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:5432/postgres

# AI providers (6-tier fallback — add whichever you have)
XAI_AI_API_KEY=xai-xxxxx           # tier 1 primary
GOOGLE_AI_API_KEY=AIzaSyxxxxx      # tier 2 + embeddings
DEEPSEEK_AI_API_KEY=sk-xxxxx       # tier 3
ANTHROPIC_AI_API_KEY=sk-ant-xxxxx  # tier 4
OPENAI_AI_API_KEY=sk-xxxxx         # tier 5

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_xxxxx
STRIPE_SECRET_KEY_TEST=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET_TEST=whsec_xxxxx

# Ably, Resend, Calendar
NEXT_PUBLIC_ABLY_PUBLISHABLE_KEY=your_ably_key
ABLY_SECRET_KEY=your_ably_secret
RESEND_API_KEY=re_xxxxx
GOOGLE_CALENDAR_CLIENT_ID=your_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=generate-secure-random-string
PROCESS_STUDIO_WEBHOOK_SECRET=generate-secure-random-string

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

See `.env.example` for the complete list and [.ai/12-DEVELOPER-SETUP.md](.ai/12-DEVELOPER-SETUP.md) for setup instructions.

---

## Database

**Provider**: Supabase (PostgreSQL with Row-Level Security)

**Migrations**: Located in `tools/database/migrations/`

**Run migrations**:
```bash
# Migrations managed via Supabase CLI
supabase db push

# Or via migration scripts
cd tools/database
./apply-migrations.sh
```

**Key tables** (345+ migrations applied):
- `profiles` - User profiles (all roles) with soft delete and PII anonymization
- `listings` - Tutor listings with dynamic field configuration
- `shared_fields` - 23 centralized field definitions across 9 contexts
- `form_context_fields` - 106 context-specific field mappings
- `onboarding_progress` - Zero data loss state tracking across all steps
- `professional_info` - Professional templates with field metadata
- `admin_action_logs` - Complete audit trail of all admin actions
- `referral_links` - Multi-tier attribution with HMAC signing
- `referral_activities` - Commission delegation and conversion tracking
- `organisation_subscriptions` - Stripe billing (Starter £49/mo, Pro £99/mo)
- `org_tasks` - Task management with comments and attachments
- `bookings` - Session scheduling with availability tracking
- `reviews` - Mutual review system with moderation
- `help_support_snapshots` - Bug reports with Jira sync status
- `network_trust_graph` - Network trust and SEO eligibility
- `seo_hubs` - Location-based SEO with automated cron jobs
- `workflow_executions` + `workflow_tasks` - iPOM process execution engine state
- `analyst_agents` - AI Agent definitions (iPOM Phase 2)
- `agent_teams` + `agent_team_run_outputs` - Multi-agent Team definitions (iPOM Phase 2, migration 352)
- `cas_agent_status`, `cas_agent_events`, `cas_metrics_timeseries` - CAS monitoring
- `profiles.status` - Tutor approval workflow state (`pending`|`under_review`|`active`|`rejected`|`suspended`)

---

## Testing Strategy

Following **CAS quality standards** with comprehensive test coverage:

### Unit Tests (Jest + React Testing Library)
- Target: >80% coverage
- Component rendering
- Form validation
- User interactions
- State management

### E2E Tests (Playwright)
- User flows
- Authentication
- Onboarding
- Profile management
- Listing creation

### Visual Regression (Percy)
- Component snapshots
- Responsive layouts
- Cross-browser consistency

**Example**:
```bash
# Run full test suite
npm test                    # Unit tests
npm run test:e2e           # E2E tests
npm run test:visual        # Visual regression

# View coverage
npm run test:coverage
open coverage/index.html
```

---

## Code Quality

### Standards
- **TypeScript** for type safety
- **ESLint** for code quality
- **Prettier** for formatting (via ESLint)
- **Proven Patterns** from CAS framework

### Pre-Commit Checks
- TypeScript compilation
- ESLint checks
- Test execution (unit tests)

### Code Review
Following **CAS Developer Agent** checklist:
- [ ] Clean, type-safe TypeScript
- [ ] Unit tests (>80% coverage target)
- [ ] Storybook stories for UI components
- [ ] No console.log statements
- [ ] Follows proven patterns
- [ ] Design system compliance

---

## Deployment

### Frontend - Vercel (ACTIVE)
```bash
# Production deployment
cd apps/web
npm run build
vercel deploy --prod

# Preview deployment
vercel deploy
```

**Status**: Live at production URL
**CI/CD**: Automated via GitHub Actions (build-check.yml)
**Environment**: Managed via Vercel dashboard

### Backend - Supabase (ACTIVE)
- **Database**: Hosted PostgreSQL with automatic backups
- **Auth**: Managed authentication service
- **Storage**: CDN-backed file storage
- **Functions**: Edge functions deployment


---

## Contributing

### Workflow
1. Review [CAS-USER-GUIDE.md](cas/CAS-USER-GUIDE.md) for development approach
2. Check [proven-patterns.md](cas/docs/proven-patterns.md) before coding
3. Follow [feature-development-checklist.md](cas/docs/feature-development-checklist.md)
4. Request CAS assistance: `CAS: [your task]` in Claude Code
5. Run tests before committing
6. Create PR following CAS quality standards

### Commit Messages
```
feat: Add notification badge component
fix: Resolve listing search filter bug
test: Add unit tests for ProfileCard
docs: Update CAS user guide
refactor: Extract validation to shared util
```

**CAS-enhanced commits** (when using CAS framework):
```
feat: Add notification badge component

🤖 Generated with CAS (https://github.com/tutorwise/tutorwise/tree/main/cas)

Co-Authored-By: CAS <cas@tutorwise.com>
```

---

## Support

### Documentation
1. **User Guide**: [cas/CAS-USER-GUIDE.md](cas/CAS-USER-GUIDE.md)
2. **Architecture**: [cas/CAS-DESIGN-AND-IMPLEMENTATION.md](cas/CAS-DESIGN-AND-IMPLEMENTATION.md)
3. **Detailed Reference**: [cas/docs/cas-architecture-detailed.md](cas/docs/cas-architecture-detailed.md)
4. **Proven Patterns**: [cas/docs/proven-patterns.md](cas/docs/proven-patterns.md)

### Troubleshooting
- **Build errors**: Check TypeScript compilation with `npm run build`
- **Test failures**: Run with verbose: `npm test -- --verbose`
- **Database issues**: Check migration status: `npm run migrate`
- **CAS questions**: See [cas/CAS-USER-GUIDE.md](cas/CAS-USER-GUIDE.md#troubleshooting)

### Getting Help
- Review agent READMEs in `cas/agents/*/README.md`
- Check CAS documentation in `cas/` directory
- Review implementation summaries in project root (*.md files)

### Referral System Documentation
- **Solution Design**: [docs/feature/referrals/referrals-solution-design-v2.md](docs/feature/referrals/referrals-solution-design-v2.md)
- **Multi-Tier Decision Rationale**: [docs/feature/referrals/MULTI_TIER_DECISION_RATIONALE.md](docs/feature/referrals/MULTI_TIER_DECISION_RATIONALE.md)
- **Deployment Guide**: [docs/feature/referrals/DEPLOYMENT-GUIDE.md](docs/feature/referrals/DEPLOYMENT-GUIDE.md)
- **Environment Setup**: [docs/feature/referrals/ENVIRONMENT-SETUP.md](docs/feature/referrals/ENVIRONMENT-SETUP.md)

---

## Project Status

**Current Phase**: Beta (Launched 1 Mar 2026) — Active development
**Next Phase**: iPOM Studio Phase 2 (AI Agents + Teams), Growth Agent subscriptions
**Target GA**: Q2 2026

### Development Activity (Oct 2025 - Mar 2026)
- **1,500+ commits** across 5 months
- **90+ features** implemented
- **345+ database migrations** applied
- **400+ pages** (174 UI + 226+ API endpoints)
- **382 components** in library

**Recent Completions**:
- ✅ **Onboarding System** (Jan 2026):
  - ✅ Migrated from wizard to page-based routing for reliability
  - ✅ Zero data loss implementation across all steps
  - ✅ Role-specific flows: Tutor, Agent, Client (5 steps each)
  - ✅ CaaS calculation bridge for immediate scoring
  - ✅ Trust & Verification step integration
  - ✅ UnifiedSelect/UnifiedMultiSelect standardization (63 refactors)
- ✅ **Authentication & Profiles**:
  - ✅ Supabase Auth with Google OAuth
  - ✅ Multi-role support (Tutor, Agent, Client, Organisation Owner)
  - ✅ Public/private profile views
  - ✅ Professional info templates with metadata
- ✅ **Testing Infrastructure**:
  - ✅ Jest unit tests (106 passing)
  - ✅ Playwright E2E tests
  - ✅ Percy visual regression
  - ✅ Storybook component library
- ✅ **CAS Development Framework**: Hybrid mode
- ✅ **Admin Dashboard** (11 admin hubs):
  - ✅ **Accounts Hub**: Soft/hard delete with Stripe cleanup
  - ✅ **Bookings Hub**: Session and calendar management
  - ✅ **Configurations Hub**: Platform-wide settings and shared fields management
  - ✅ **Financials Hub**: Transactions, payouts, commission splits
  - ✅ **Listings Hub**: Service listing administration
  - ✅ **Organisations Hub**: Team management, subscriptions, verification
  - ✅ **Referrals Hub**: Commission tracking, QR codes, fraud detection
  - ✅ **Reviews Hub**: Moderation and dispute handling
  - ✅ **SEO Hub**: Hub management, trust graph, eligibility tracking, cron jobs
  - ✅ **Settings Hub**: Payments, subscriptions, security, integrations, email
  - ✅ **Users Hub**: User administration and permissions
- ✅ **Complete referral system** (100% Core Complete - Feb 2026):
  - ✅ Simplified 4-stage automatic pipeline (Referred → Signed Up → Converted → Expired)
  - ✅ Hierarchical attribution with HMAC cookie signing
  - ✅ Commission delegation mechanism (patent-protected)
  - ✅ 10% lifetime commission on all future bookings from converted referrals
  - ✅ Automated weekly batch payouts (Fridays 10am UTC via pg_cron)
  - ✅ 7-day clearing period with hourly processing cron
  - ✅ 90-day auto-expiry for unconverted referrals (daily cron)
  - ✅ Email notifications (commission available, payout processed, payout failed)
  - ✅ Multi-tier commission infrastructure (1-tier active, 3-tier pending legal)
  - ✅ Fraud detection with automated triggers
  - ✅ £25 minimum payout threshold
- ✅ **Shared Fields System** (Jan 2026):
  - ✅ 23 global field definitions (single source of truth)
  - ✅ 106 field mappings across 9 contexts
  - ✅ Admin UI with drag-and-drop reordering
  - ✅ Dynamic form generation with metadata management
  - ✅ Edit once → updates all 9 contexts automatically
  - ✅ Onboarding, Account, Organisation × Tutor, Agent, Client roles
- ✅ **Help Centre & Support**:
  - ✅ Custom in-app bug reporting modal
  - ✅ Jira Service Desk integration
  - ✅ Automatic screenshot capture
  - ✅ Context-aware ticket creation
  - ✅ Support snapshot database tracking
- ✅ **Marketplace & Listings** (141 API endpoints):
  - ✅ Smart matching with similarity scores
  - ✅ Advanced search with autocomplete
  - ✅ Recommendations engine
  - ✅ Listing creation with shared fields (23 global fields)
  - ✅ Service type configuration with Free Help badge
  - ✅ Listing widgets in contextual sidebar
  - ✅ Mobile/tablet/desktop optimization
  - ✅ Organisation listings support
- ✅ **Payment Processing**:
  - ✅ Stripe Connect integration
  - ✅ Commission calculation and splitting
  - ✅ Payout management
- ✅ **User Profiles**:
  - ✅ Multi-role support (Tutor, Client, Agent)
  - ✅ Professional info templates
  - ✅ Profile verification system
- ✅ **Network & Connections**:
  - ✅ Connection management with trust graph
  - ✅ Network building tools and groups
  - ✅ Presence tracking (online/offline status via Ably)
  - ✅ Messages - WhatsApp-style messaging with Ably real-time platform
  - ✅ Network trust scoring for SEO eligibility
- ✅ **Organisations & Teams** (Jan 2026):
  - ✅ Team management with member roles
  - ✅ Subscription system (Starter £49/mo, Pro £99/mo)
  - ✅ Stripe billing integration with card management
  - ✅ Task management with comments and attachments (5-stage Kanban pipeline)
  - ✅ Recruitment system (Phases 1 & 2 complete - leverages Messages + task management)
  - ✅ Organisation CaaS scoring (100% complete - activity-weighted team average model)
  - ✅ Test/Live mode configuration for admins
- ✅ **Agent CaaS** (Jan 2026):
  - ✅ 4-bucket scoring model (100 points max: 70 base + 30 org bonus)
  - ✅ Recruitment tracking (tutors recruited, quality, retention)
  - ✅ Organisation business metrics (bookings, clients, growth)
  - ✅ Subscription-gated bonuses (active org required)
  - ✅ Verification credentials (business, insurance, association)
- ✅ **Messages System** (Jan 2026):
  - ✅ WhatsApp-style interface with Ably real-time platform
  - ✅ Typing indicators and presence tracking
  - ✅ Message persistence via Supabase chat_messages table
  - ✅ File attachments and delivery status
  - ✅ Integration with Network connections
- ✅ **VirtualSpace** (Feb 2026 - renamed from WiseSpace):
  - ✅ Hybrid virtual classroom (tldraw whiteboard + Google Meet)
  - ✅ Three session modes: standalone, booking-linked, free help
  - ✅ Real-time collaboration via Ably channels
  - ✅ Session list hub with Gold Standard patterns
  - ✅ Invite link generation with secure tokens
- ✅ **Lexi AI** (Feb 2026):
  - ✅ Context-aware conversational AI assistant
  - ✅ 5 personas: Student, Tutor, Client, Agent, Organisation
  - ✅ Anthropic Claude API with Gemini fallback
  - ✅ Lazy session start for instant UI responsiveness
  - ✅ Feedback collection for AI improvement
- ✅ **Sage AI** (Feb 2026):
  - ✅ AI-powered analytics and insights engine
  - ✅ Role-specific performance insights and forecasts
  - ✅ Booking pattern recognition and recommendations
  - ✅ CaaS score improvement suggestions

**Completed Since Beta Launch (Mar 2026)**:
- ✅ **iPOM Process Execution Engine** (Phase 1): 5 workflows, webhook triggers, shadow/live mode toggle
- ✅ **Growth Agent**: 5-skill knowledge base, 8 tools, free Revenue Audit, £10/month subscription tier
- ✅ **Tutor Approval Workflow**: `profiles.status` column, DB webhook, LangGraph execution
- ✅ **Commission Payout Process**: cron delegation to process engine
- ✅ **CAS Admin Dashboard** (`/admin/cas`): agent status, run history, metrics

**In Progress**:
- 🔄 iPOM Phase 5 — shadow run monitoring, divergence detection, go-live checklist
- 🔄 Growth Agent subscriptions (Stripe billing integration)
- 🔄 Mobile responsiveness polish

**Planned (Post-Beta)**:
- iPOM Phase 2: AI Agents + multi-agent Teams in iPOM Studio (~140h)
- Migrations 344–352 (GDPR retention, growth scores, analyst agents, agent teams)
- Sage AI curriculum expansion (500+ topics)
- Multi-tier commission expansion (Tier 2-3 — pending legal review)
- Mobile app (React Native)

---

## License

MIT License - See LICENSE file for details

---

## Team

**Development Framework**: CAS (Contextual Autonomous System)
- **Planner**: Sprint planning and coordination
- **Analyst**: Requirements and user research
- **Developer**: Feature implementation
- **Tester**: Test implementation
- **QA**: Quality assurance and accessibility
- **Security**: Security validation
- **Engineer**: Infrastructure and deployment
- **Marketer**: Analytics and user engagement

**Human Team**: Michael Quan (Lead Developer)

