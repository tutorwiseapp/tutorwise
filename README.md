# TutorWise

**Full-stack tutoring marketplace platform**

**Version**: 1.0.0-beta
**Status**: Pre-Launch (Beta Release: 1 Feb 2026)
**Last Updated**: 2026-01-13

---

## <� **Project Overview**
TutorWise is a production-grade, full-stack EdTech marketplace and CRM ecosystem designed to unify the fragmented tutoring economy. Built on a modern Next.js (Frontend) + FastAPI (Backend) architecture, it features a unique "Single Account, Multi-Role" identity system that allows users to seamlessly switch between Student, Tutor, and Agent personas.

Unlike standard marketplaces, TutorWise integrates a sophisticated "Growth Engine" directly into its core, leveraging a proprietary Profile Graph to power viral referrals, network building, and commission tracking.

Key Pillars & Capabilities
1. AI-Powered Credibility (CaaS)
The platform features a built-in Credibility as a Service (CaaS) engine. This system automatically scores tutor reliability and professionalism based on verified "Proof of Work" data points—such as completed sessions and saved artifacts—rather than just subjective reviews.

2. WiseSpace (Hybrid Virtual Classroom)
A cost-optimized, zero-marginal-cost virtual learning environment. It employs a "Hybrid Model" that embeds a collaborative whiteboard (powered by tldraw and Ably real-time sync) alongside external video conferencing (Google Meet integration), ensuring a robust classroom experience without heavy infrastructure costs.

3. Collaborative Wiselists (Planning & Growth)
An "Airbnb-style" planning tool that serves as a dual-purpose growth engine. Users can curate and share lists of tutors (e.g., "GCSE Maths Prep"), which drives both viral user acquisition (via external invites) and in-network sales attribution (via tracking cookies and Stripe webhooks).

4. Smart Marketplace & CRM
Listings: Granular service listings with "Free Help" options and dynamic availability.

Bookings & Payments: Integrated Stripe Connect flow handling complex commission splitting, payouts, and dispute management.

Network: A LinkedIn-style connection graph allowing Agents to manage tutor rosters and students to build educational networks.

5. Contextual Autonomous System (CAS)
The platform is developed and maintained by CAS, an AI-driven "Product Team" framework. This system utilizes specialized AI agents (Planner, Analyst, Developer, Tester) to auto-maintain project plans, execute code, and enforce "Production-Ready" quality standards through automated auditing.

Short Description: TutorWise is an AI-enhanced tutoring ecosystem that merges a professional marketplace with powerful CRM tools. Featuring the WiseSpace hybrid classroom, CaaS credibility scoring, and Collaborative Wiselists, it empowers Tutors, Students, and Agents to connect, plan, and learn within a single, trust-based network.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development servers
cd apps/web && npm run dev        # Frontend (Next.js)
cd apps/api && npm run dev:api    # Backend (FastAPI)

# Run tests
npm test                          # All tests
npm run test:unit                 # Unit tests
npm run test:e2e                  # E2E tests (Playwright)
```

---

## Project Structure

```
tutorwise/
├── apps/
│   ├── web/              # Next.js 14 frontend
│   └── api/              # FastAPI backend
├── packages/
│   └── shared-types/     # Shared TypeScript types
├── cas/                  # CAS development framework
├── tools/                # Development tools
├── tests/                # Test suites
└── docs/                 # Documentation
```

---

## Tech Stack

### Frontend
- **Next.js 15.x** - React framework with App Router
- **TypeScript 5.x** - Type safety and developer experience
- **React 18** - UI library with Server Components
- **Tailwind CSS** - Utility-first styling
- **Supabase Auth** - Authentication and user management
- **React Query (TanStack Query)** - Data fetching and state management
- **Zustand** - Lightweight state management

### Backend & Database
- **Supabase** - PostgreSQL database with real-time capabilities
- **Supabase Auth** - Authentication backend
- **Supabase Storage** - File storage for avatars and documents
- **Stripe Connect** - Payment processing and marketplace commissions

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
- **[cas/CAS-USER-GUIDE.md](cas/CAS-USER-GUIDE.md)** - Daily workflow and commands
- **[cas/CAS-DESIGN-AND-IMPLEMENTATION.md](cas/CAS-DESIGN-AND-IMPLEMENTATION.md)** - Architecture and design
- **[cas/docs/cas-architecture-detailed.md](cas/docs/cas-architecture-detailed.md)** - Detailed technical reference

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
- **Booking system** (in progress)

### Referral System
- **Hierarchical Attribution**: URL → Cookie (HMAC-signed) → Manual entry
- **Commission Delegation**: Partners can redirect commissions (coffee shops, schools)
- **Multi-Tier Commissions**: Configurable 1-7 tier system (1-tier launch, 3-tier roadmap)
- **Fraud Detection**: Automated anomaly detection with admin investigation workflow
- **Partnership Onboarding**: Offline partner applications with QR code generation
- **Client Referrals**: Two-sided marketplace monetization (tutor + client referrals)
- **QR Code API**: Generate scannable referral links for physical marketing

### Admin Features
- **User Management**: Comprehensive admin dashboard with user CRUD operations
  - Soft Delete: Account deactivation with PII anonymization
  - Hard Delete: GDPR-compliant complete data purge with Stripe cleanup
  - Advanced Filtering: Multi-criteria user filtering and search
  - Data Export: CSV export functionality
- **Forms Configuration**: Dynamic form field management system
  - Shared Fields: Centralized field definitions across contexts
  - Drag-and-drop reordering
  - Context-specific configurations (Account, Organisation, Listings)
  - Option management with active/inactive states
- **Accounts Management**: Complete account oversight
  - User accounts with role management
  - Admin role hierarchy (Super Admin, Admin, System Admin, Support Admin)
- **Listings Management**: Tutor listing administration
- **Organisations Management**: Organisation account oversight
- **Referrals Management**: Commission tracking and fraud detection
- **Bookings Management**: Booking and session oversight
- **Reviews Management**: Review moderation
- **Financials Management**: Payment and commission tracking
- **Action Logging**: Complete audit trail of all admin actions

### Help Centre & Support
- **Custom Report Modal**: In-app bug reporting with screenshot capture
- **Jira Service Desk Integration**: Automatic ticket creation
- **Context Capture**: Auto-captures page URL, user role, user agent
- **Screenshot System**: Automatic visual bug documentation
- **Support Snapshots**: Database tracking with sync status
- **Progressive Capture Levels**: Minimal/standard/diagnostic data collection

### Core Features by Module (18 Features)
- **Authentication**: Supabase Auth with OAuth and multi-role support
- **Onboarding**: Page-based routing for all 3 roles (Tutor, Client, Agent) with zero data loss
- **Profiles**: Dynamic profile management with public/private views
- **Marketplace**: Search with 141 API endpoints, smart matching, recommendations
- **Listings**: Dynamic listing creation with shared fields system (23 global fields)
- **Bookings**: Session scheduling, calendar management, assignments
- **Payments**: Stripe Connect with commission splitting and payouts
- **Messages**: WiseChat - WhatsApp-style messaging interface with real-time updates
- **Network**: Connection management, groups, trust graph
- **Wiselists**: Collaborative lists ("My Saves" feature) with sharing
- **WiseSpace**: Hybrid virtual classroom with tldraw whiteboard + Google Meet
- **Reviews**: Mutual review system with moderation
- **CaaS**: Credibility scoring (Tutor complete, Agent/Org designed)
- **Referrals**: Multi-tier attribution system with QR codes and gamification
- **Financials**: Earnings tracking, transaction history, payout management
- **Organisations**: Team management, subscriptions, tasks, recruitment
- **Developer Tools**: API key management, webhooks, integrations
- **Help Centre**: In-app bug reporting with Jira Service Desk integration

---

## Documentation

### Getting Started
- **Project Setup**: See "Quick Start" above
- **CAS Framework**: [cas/CAS-USER-GUIDE.md](cas/CAS-USER-GUIDE.md)
- **Development Standards**: [cas/docs/proven-patterns.md](cas/docs/proven-patterns.md)
- **Design System**: [cas/docs/design-system.md](cas/docs/design-system.md)

### Architecture
- **CAS Architecture**: [cas/CAS-DESIGN-AND-IMPLEMENTATION.md](cas/CAS-DESIGN-AND-IMPLEMENTATION.md)
- **Detailed Architecture**: [cas/docs/cas-architecture-detailed.md](cas/docs/cas-architecture-detailed.md)
- **System Overview**: [cas/docs/guides/cas-overview.md](cas/docs/guides/cas-overview.md)

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
# Frontend
cd apps/web && npm run dev         # Start Next.js dev server (port 3000)
cd apps/web && npm run build       # Build for production
cd apps/web && npm run lint        # Lint code

# Backend
cd apps/api && npm run dev:api     # Start FastAPI dev server (port 8000)
cd apps/api && npm run migrate     # Run database migrations
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

**Frontend (.env.local)**:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Backend (.env)**:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
DATABASE_URL=your_database_url
```

See `.env.example` files for complete lists.

---

## Database

**Provider**: Supabase (PostgreSQL)

**Migrations**: Located in `apps/api/migrations/`

**Run migrations**:
```bash
cd apps/api
npm run migrate
```

**Key tables** (237 migrations, 172 numbered):
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

### Frontend (Vercel)
```bash
cd apps/web
npm run build
vercel deploy
```

### Backend (TBD)
Backend deployment strategy to be determined.

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

**Current Phase**: Final Implementation (95% Complete)
**Beta Release Target**: 1 Feb 2026
**Target Launch**: Q1 2026

### Development Activity (Oct 2025 - Jan 2026)
- **1,400 commits** across 3.5 months
- **82 new features** implemented
- **151 bug fixes** resolved
- **63 refactors** for code quality
- **55 documentation** updates
- **260 pages** implemented
- **141 API endpoints** created
- **237 database migrations** executed
- **353 components** in library

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
- ✅ **Admin Dashboard** (12 admin sections):
  - ✅ **Accounts Management**: Soft/hard delete with Stripe cleanup
  - ✅ **Forms Admin**: Drag-and-drop UI for shared fields (23 fields, 106 mappings)
  - ✅ **Organisations**: Team management, subscriptions, verification
  - ✅ **Listings**: Service listing administration
  - ✅ **Bookings**: Session and calendar management
  - ✅ **Referrals**: Commission tracking, QR codes, fraud detection
  - ✅ **Reviews**: Moderation and dispute handling
  - ✅ **Financials**: Transactions, payouts, commission splits
  - ✅ **SEO**: Hub management, trust graph, eligibility tracking, cron jobs
  - ✅ **Settings**: Payments, subscriptions, security, integrations, email
  - ✅ **Configurations**: Platform-wide settings
  - ✅ **Action Logging**: Complete GDPR-compliant audit trail
- ✅ **Complete referral system** (Phases 1-3):
  - ✅ Hierarchical attribution with HMAC cookie signing
  - ✅ Commission delegation mechanism (patent-protected)
  - ✅ Multi-tier commission infrastructure (1-tier active, 3-tier roadmap)
  - ✅ Fraud detection with automated triggers
  - ✅ Partnership onboarding system
  - ✅ Client referral monetization
  - ✅ QR code generation API
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
  - ✅ Presence tracking (online/offline status)
  - ✅ WiseChat - WhatsApp-style messaging with real-time updates
  - ✅ Network trust scoring for SEO eligibility
- ✅ **Organisations & Teams** (Jan 2026):
  - ✅ Team management with member roles
  - ✅ Subscription system (Starter £49/mo, Pro £99/mo)
  - ✅ Stripe billing integration with card management
  - ✅ Task management with comments and attachments
  - ✅ Recruitment system (Phase 1 complete)
  - ✅ Organisation CaaS scoring (designed, ready for implementation)
  - ✅ Test/Live mode configuration for admins

**In Progress (Final 5%)**:
- 🔄 Agent CaaS implementation (designed, architecture complete)
- 🔄 Organisation CaaS implementation (designed, 4-bucket scoring ready)
- 🔄 Recruitment system Phase 2 (Phase 1 complete Jan 2026)
- 🔄 Final mobile responsiveness polish (80% complete)
- 🔄 Performance optimization and caching
- 🔄 Beta testing preparation
- 🔄 Production environment hardening

**Beta Release Scope (Jan 2026)**:
- ✅ All core marketplace features
- ✅ Complete admin dashboard
- ✅ Referral system (Tier 1)
- ✅ Payment processing
- ✅ Help centre & support
- ✅ User onboarding flows
- 🎯 Initial user acquisition
- 🎯 Early adopter feedback collection

**Planned (Post-Beta)**:
- Messaging system with real-time chat
- Review and ratings system expansion
- Advanced analytics dashboard
- Multi-tier commission expansion (Tier 2-3)
- WiseSpace virtual classroom v2
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

---

**Last Updated**: 2026-01-13
**CAS Version**: 2.0 (Hybrid Framework Mode)
**Next.js Version**: 15.x
**Node Version**: 18.x+
**TypeScript Version**: 5.x
**Database**: Supabase (PostgreSQL)
**Authentication**: Supabase Auth
**Payment Processing**: Stripe Connect
**Referral System**: v7.0 (Complete with Multi-Tier Infrastructure)
**Admin System**: v2.0 (Full CRUD + GDPR Compliance)
