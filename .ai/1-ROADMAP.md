# Tutorwise Development Roadmap

**Document Version**: 3.0
**Last Updated**: 2026-03-11
**Project Status**: Platform Live + AI Operations Layer Complete
**Development Velocity**: 1,800+ commits (Oct 2025 - Mar 2026)

---

## Current Status Overview

### Platform Completion: 97%

**See [SYSTEM-NAVIGATION.md](3 - SYSTEM-NAVIGATION.md#platform-metrics-single-source-of-truth) for complete codebase metrics.**

**Key Metrics**:
- **500+ pages** implemented (200+ UI pages + 300+ API endpoints + dynamic routes)
- **250K+ lines of code** (TypeScript/TSX)
- **386+ database migrations** (380+ numbered + supporting files)
- **400+ components** in unified design system
- **200+ RLS policies** enforcing data security
- **42+ major features** completed (23 core systems + 14 platform hubs + EduPay + VirtualSpace + Lexi AI + Sage AI + Growth Agent + Conductor)
- **90+ feature enhancements** implemented
- **160+ bug fixes** implemented
- **70+ refactors** completed

### AI Provider Chain (6-Tier Fallback)
1. **xAI Grok 4 Fast** (primary)
2. **Google Gemini Flash** (fallback 1)
3. **DeepSeek R1** (fallback 2)
4. **Anthropic Claude Sonnet 4.6** (fallback 3)
5. **OpenAI GPT-4o** (fallback 4)
6. **Rules-based** (zero-cost fallback)

Shared AI service: `apps/web/src/lib/ai/` — `getAIService()` singleton with `generate()`, `generateJSON<T>()`, `stream()` methods.

### Launch Status
**Beta Launch**: Completed March 1, 2026
**Current Focus**: AI Operations Layer (Conductor), Growth Agent, External Publishing

---

## Completed Core Systems (96%)

### 1. Authentication & Authorization
**Status**: Production-ready
**Completion**: 100%

- Supabase Auth with Google OAuth
- Multi-role system (Tutor, Client, Agent, Organisation Owner)
- Role-based access control (RBAC)
- Protected route middleware
- Session management and refresh
- Email verification flows
- Password reset functionality

### 2. Admin Dashboard
**Status**: Production-ready
**Completion**: 100% (12+ hubs)

**Hubs Implemented**:
1. **Accounts Hub** - User management with soft/hard delete, GDPR compliance, and role-based admin user management
2. **Bookings Hub** - Booking oversight and management
3. **Configurations Hub** - System configuration and shared fields management
4. **Financials Hub** - Payment tracking and reconciliation
5. **Listings Hub** - Service listing moderation
6. **Organisations Hub** - Organisation management
7. **Referrals Hub** - Referral tracking and analytics
8. **Resources Hub** - Article management, SEO settings, performance analytics
9. **Reviews Hub** - Review moderation
10. **SEO Hub** - SEO management and optimization
11. **Settings Hub** - Platform configuration
12. **Signal Hub** - Revenue Signal for tracking the economic value from articles to bookings

**Features**:
- HubComplexModal pattern (standardized detail modals)
- Soft delete with PII anonymization
- Hard delete with Stripe cleanup (GDPR-compliant)
- Advanced filtering and search
- Bulk operations
- Export functionality

### 3. Shared Fields System
**Status**: Production-ready
**Completion**: 100%

**Architecture**: 23 Global Fields -> 106 Context Mappings -> 9 Contexts
- 23 shared fields (Professional Info, Preferences, Qualifications, etc.)
- 106 context mappings (3 roles x 3 form types)
- 9 form contexts (Onboarding/Account/Organisation x Tutor/Client/Agent)
- UnifiedSelect/UnifiedMultiSelect components
- Dynamic option management
- Context-specific field customization
- Migration from hardcoded options

### 4. Onboarding System
**Status**: Production-ready
**Completion**: 100%

- Page-based onboarding (migrated from wizard)
- Zero data loss migration
- Role-specific flows (5 steps per role)
- Tutor: Personal > Professional > Services > Availability > Review
- Client: Personal > Preferences > Requirements > Budget > Review
- Agent: Personal > Professional > Services > Commission > Review
- Real-time validation
- Draft saving
- Progress tracking

### 5. Forms Management
**Status**: Production-ready
**Completion**: 100%

**9 Forms x 3 Roles = 27 Form Contexts**:
1. Personal Information Form
2. Professional Details Form
3. Tutor Services Form
4. Preferences Form
5. Qualifications Form
6. Availability Form
7. Communication Form
8. Emergency Contact Form
9. Organisation Settings Form

**Features**:
- Dynamic field rendering
- Shared Fields integration
- Admin configuration UI
- Field-level customization per context
- Validation rules engine
- Conditional field display

### 6. Tutoring and Educational Service Marketplace
**Status**: Production-ready
**Completion**: 100%

- Tutor, agent and organisation profile and service listing system (public listings)
- Service listing creation (subjects, rates, availability)
- Advanced search and filtering
- Geographic location services
- Tutor, agent, client and organisation profile and verification system
- Rating and review system
- Favorites/saved tutors, agents, organisations and service listings
- Social proof (reviews, ratings, bookings)
- `marketplace_search_events` logging for supply/demand gap analysis

### 7. Booking System
**Status**: Production-ready
**Completion**: 100%
**Last Updated**: 2026-02-07 (v7.0 - Advanced Scheduling & Automation)

**Core Booking System**:
- 5-stage booking workflow (discover > book > schedule > pay > review)
- Calendar integration (react-day-picker)
- Lesson scheduling interface
- Automated booking confirmations
- Cancellation and rescheduling
- Payment integration (Stripe)
- Booking state management
- Email notifications
- Booking history

**Advanced Scheduling & Automation (v7.0 - 2026-02-07)**:
- Enhanced Conflict Detection - Time range overlap + availability exceptions
- Timezone-Aware Scheduling - User timezone preferences with auto-conversion
- Availability Exceptions - Holiday/vacation blocking (all-day or partial)
- Multi-Interval Reminders - 3 reminders per session (24h, 1h, 15min) via pg_cron
- No-Show Auto-Detection - Detects 30min+ overdue sessions, creates reports
- Recurring Bookings - Weekly/biweekly/monthly series with conflict checking
- Cancellation Penalties - Repeat offender tracking (3+ in 30 days)
- Quick Session Ratings - Immediate 1-5 star capture (pre-fills review form)
- 7 new database tables (migrations 237-243)
- 5 new API routes + 2 cron jobs
- 7 utility libraries for scheduling logic

### 8. Payment Processing
**Status**: Production-ready
**Completion**: 100%

- Stripe Connect integration
- Payment scheduling for lessons
- Subscription management
- Payment history and invoices
- Refund processing
- Commission tracking
- Payout management
- Webhook handling

### 9. Referral System
**Status**: Production-ready (100% Core Complete)
**Completion**: 100% (Phases 1-3 + Automated Payouts)
**Last Updated**: 2026-02-05
- Simplified 4-stage automatic pipeline (Referred > Signed Up > Converted > Expired)
- 10% lifetime commission on all future bookings from converted referrals
- Integrate with booking and payment workflow (refer > book > pay > commission)

**Phase 1: Foundation**:
- Referral code generation (7-char alphanumeric)
- Referral tracking with hierarchical attribution (URL > Cookie > Manual)
- Basic analytics and conversion tracking

**Phase 2: Rewards**:
- 10% lifetime commission system
- 7-day clearing period (Pending > Available via hourly pg_cron)
- Automated weekly batch payouts (Fridays 10am UTC via pg_cron)
- GBP25 minimum payout threshold
- Email notifications (commission available, payout processed, payout failed)

**Phase 3: Advanced**:
- Multi-tier commission infrastructure (1-tier active, 3-tier roadmap)
- Commission delegation (partners can redirect commissions)
- 90-day auto-expiry for unconverted referrals (daily pg_cron)
- Fraud detection with automated triggers
- Analytics dashboard with conversion funnels

**Future Enhancements** (Q2-Q3 2026):
- Multi-tier commission activation (Tier 2: 3%, Tier 3: 1.5%) - pending legal review
- Client referral monetization (5% commission on ANY tutor bookings)
- Advanced fraud detection with ML scoring
- QR code generation API for physical marketing
- Partnership onboarding system with custom commission structures

### 10. Reviews System
**Status**: Production-ready
**Completion**: 100%

- Review submission (clients <> tutors, agents <> tutors, tutors <> clients, agents <> clients, tutors <> agents, clients <> agents)
- Rating system (1-5 stars)
- Review moderation (admin)
- Review responses (tutors, agents, clients)
- Review aggregation
- Helpful votes
- Review filtering

### 11. Help Centre
**Status**: Production-ready
**Completion**: 100%
**Updated**: 2026-01-18 - React Query migration, skeleton UI, complete alignment with Resources

**Core Features**:
- FAQ system with categories
- Article search and filtering
- Jira Service Desk integration
- Ticket submission and tracking
- Problem ticket management (bug reporting) phase 1
- Support ticket management (help request) phase 1

**Technical Architecture**:
- React Query data fetching (5min cache, automatic refetch)
- Skeleton loading UI (professional pulse animations)
- placeholderData (keepPreviousData) prevents flickering
- Search functionality with real-time results
- 4 featured articles on landing page
- Friendly, welcoming language and tone
- Complete SEO metadata (metadataBase, Twitter cards, OpenGraph)
- Mobile-responsive design with proper breakpoints

### 12. Messaging System (Messages)
**Status**: Production-ready
**Completion**: 100%

- Real-time messaging (Ably real-time platform)
- WhatsApp-style interface (2-pane split layout)
- Conversation threads with connections from Network
- Message persistence (Supabase `chat_messages` table)
- Unread message indicators and counters
- Typing indicators (Ably Chat SDK)
- Presence tracking (online/offline status)
- Message search and filtering
- File attachments support
- Message delivery status tracking
- Real-time synchronization across devices

### 13. Role-Based Dashboards
**Status**: Production-ready
**Completion**: 100%

**Dashboards Implemented**:
- Tutor Dashboard (bookings, earnings, reviews, availability)
- Client Dashboard (bookings, favorites, messages, payment history)
- Agent Dashboard (referrals, commissions, clients, analytics)
- Organisation Dashboard (team, members, clients, organisation-info, billing)

**Features**:
- Role-specific widgets and metrics
- Real-time data updates
- Customizable layouts
- Quick actions and shortcuts
- Activity feeds
- Performance analytics

### 14. Accounts & Profile Management
**Status**: Production-ready
**Completion**: 100%

**Features**:
- Multi-role profile management (Tutor, Client, Agent, Organisation)
- Profile editing with Shared Fields integration
- Avatar and media management
- Hard delete with GDPR compliance
- PII anonymization on soft delete
- Referral delegation
- Account settings and preferences
- Privacy controls
- Email and notification preferences
- `profiles.status` column: pending | under_review | active | rejected | suspended

**User Interfaces**:
- Tutor Account Hub
- Client Account Hub
- Agent Account Hub
- Organisation Account Hub
- Admin Accounts Hub (user management)

### 15. Bookings Management
**Status**: Production-ready
**Completion**: 100%

**Features**:
- 5-stage booking workflow (discover > book > schedule > pay > review)
- Calendar integration (react-day-picker)
- Booking creation and management
- Cancellation and rescheduling
- Automated confirmations
- Booking history
- Status tracking
- Payment integration

**User Interfaces**:
- Tutor Bookings Hub
- Client Bookings Hub
- Admin Bookings Hub (oversight)

### 16. Developer Tools
**Status**: Production-ready
**Completion**: 100%

**API Platform**:
- RESTful API endpoints (141+ endpoints)
- Authentication and authorization
- Rate limiting (Upstash Redis)
- API documentation
- Webhook support
- Public API versioning (`/api/v1/`)

**Features**:
- CaaS API (`/api/v1/caas/[profile_id]`)
- Booking API endpoints
- User management API
- Organisation API
- Payment webhooks
- Real-time subscriptions

**Developer Hub**:
- API key management
- Usage analytics
- Request logs
- Integration testing tools

### 17. Financials
**Status**: Production-ready
**Completion**: 100%

**Features**:
- Transaction tracking
- Payment reconciliation
- Commission calculations
- Payout management
- Refund processing
- Revenue analytics
- Financial reporting
- Stripe integration

**User Interfaces**:
- Tutor Financials Hub (earnings, payouts)
- Agent Financials Hub (commissions)
- Organisation Financials Hub (billing, invoices)
- Admin Financials Hub (platform financial oversight)
- EduPay Hub (EP wallet, ledger, loan projections -- see #33)

### 18. Help Centre (Public)
**Status**: Production-ready
**Completion**: 100%

**Features**:
- FAQ system with categories
- Article search and filtering
- Jira Service Desk integration
- Ticket submission
- Ticket tracking
- Support documentation
- Contact forms

**User Interfaces**:
- Public Help Centre (all users)
- Tutor Help Hub
- Client Help Hub
- Agent Help Hub
- Admin Help Hub (ticket management)

### 19. Listings Management
**Status**: Production-ready
**Completion**: 100%

**Features**:
- Service listing creation (unified service_type architecture)
- Service types: one-to-one, group-session, workshop, study-package
- Subjects, rates, and availability
- Advanced search and filtering
- Geographic location services
- Listing moderation (admin)
- Listing status management
- Public listing pages
- SEO optimization

**User Interfaces**:
- Tutor Listings Hub (manage services)
- Agent Listings Hub (manage client services)
- Public Marketplace (discovery)
- Admin Listings Hub (moderation)

### 20. Messages (Real-Time Messaging)
**Status**: Production-ready
**Completion**: 100%

**Features**:
- Real-time messaging (Ably platform)
- WhatsApp-style 2-pane interface
- Conversation threads
- Message persistence (Supabase)
- Unread indicators and counters
- Typing indicators
- Presence tracking (online/offline)
- Message search
- File attachments
- Delivery status
- Cross-device synchronization

**User Interfaces**:
- Tutor Messages Hub
- Client Messages Hub
- Agent Messages Hub
- Organisation Messages Hub

### 21. Network & Connections
**Status**: Production-ready
**Completion**: 100%

**Features**:
- Connection management (social graph)
- Connection groups (organisations, teams)
- Trust graph relationships
- Network analytics
- Connection requests
- Group membership
- Network discovery
- Social proof indicators

**User Interfaces**:
- Tutor Network Hub
- Client Network Hub
- Agent Network Hub
- Organisation Network Hub

### 22. Organisations
**Status**: Production-ready
**Completion**: 100%

**Features**:
- Organisation types: individuals, agencies, companies, schools
- Organisation profiles
- Team and member management
- Client management
- Organisation settings
- Billing and subscriptions
- Organisation CaaS scoring
- Task management (Kanban pipeline)
- Recruitment workflows

**User Interfaces**:
- Organisation Dashboard (owners)
- Organisation Hub (team view)
- Admin Organisations Hub (oversight)

### 23. Payments
**Status**: Production-ready
**Completion**: 100%

**Features**:
- Stripe Connect integration
- Bank card management
- Stripe account setup
- Payment methods (cards, bank accounts)
- Payment scheduling
- Subscription management
- Payment history
- Invoices and receipts
- Refund processing
- Payout management
- Webhook handling

**User Interfaces**:
- Tutor Payments Hub (payout setup)
- Client Payments Hub (payment methods)
- Agent Payments Hub (commission payouts)
- Organisation Payments Hub (billing)

### 24. Referrals
**Status**: Production-ready
**Completion**: 100% (Phases 1-3)

**User Interfaces**:
- Tutor Referrals Hub
- Client Referrals Hub
- Agent Referrals Hub (recruitment tracking)
- Admin Referrals Hub (platform oversight)

### 25. Reviews & Ratings
**Status**: Production-ready
**Completion**: 100%

**User Interfaces**:
- Tutor Reviews Hub
- Client Reviews Hub
- Agent Reviews Hub
- Public Profile Reviews
- Admin Reviews Hub (moderation)

### 26. Student Management
**Status**: 75% complete
**Completion**: 75%

**Features**:
- Student profiles
- Student-tutor relationships
- Learning progress tracking
- Academic records (in progress)
- Attendance tracking (in progress)
- Performance analytics (planned)
- Parent/guardian access (planned)

**Note**: Basic student management is production-ready; advanced features planned for Q2 2026.

### 27. Wiselists (Saved Lists)
**Status**: Production-ready
**Completion**: 100%

**User Interfaces**:
- Tutor Wiselists Hub (saved clients)
- Client Wiselists Hub (saved tutors, listings)
- Agent Wiselists Hub (saved tutors, clients)

### 28. Database Architecture
**Status**: Production-ready
**Completion**: 100%

- 386+ migrations (380+ numbered + supporting files)
- Comprehensive schema (100+ tables)
- Row-Level Security (200+ policies)
- pgvector HNSW indexes (listings, profiles, connection_groups, sage_knowledge_chunks, platform_knowledge_chunks, memory_episodes)
- Hybrid search RPCs (search_listings_hybrid, search_profiles_hybrid, search_organisations_hybrid, match_platform_knowledge_chunks, match_memory_episodes, match_memory_facts)
- Indexes and performance optimization
- Foreign key relationships
- Triggers and stored procedures
- Audit tables
- pg_cron scheduled jobs (20+ cron jobs for intelligence pipeline, nudges, reconciliation, autonomy calibration)

### 29. CaaS (Credibility as a Service) - Multi-Role System
**Status**: Production-ready (4 roles complete)
**Completion**: 100% for Tutor/Client/Agent/Organisation

**System Overview**:
CaaS provides credibility scoring across all platform roles with role-specific algorithms, safety gates, and public visibility controls. Scores are cached in the database and recalculated based on profile changes.

#### 29.1. Tutor CaaS (v5.9 - Most Mature)
**Scoring Model**: 6-Bucket System (110 raw points -> normalized to /100)

**Buckets**:
- **Bucket 1: Performance & Quality** (30 points) - Average rating, completion rate, provisional scoring
- **Bucket 2: Qualifications & Authority** (30 points) - Degree, QTS, onboarding bridging
- **Bucket 3: Network & Referrals** (20 points) - Agent referrals, social connections
- **Bucket 4: Verification & Safety** (10 points) - Identity, DBS check
- **Bucket 5: Digital Professionalism** (10 points) - Calendar sync, session logging
- **Bucket 6: Social Impact** (10 points) - Free help availability, completed free sessions

#### 29.2. Client CaaS (v1.0)
**Scoring Model**: 3-Bucket System (100 points total) - Identity, Booking History, Profile Completeness

#### 29.3. Agent CaaS (v1.0)
**Scoring Model**: 4-Bucket System with Subscription Bonuses (70-100 points)

#### 29.4. Organisation CaaS (v1.0)
**Type**: Entity-based (stored on `connection_groups.caas_score`)
**Algorithm**: Activity-Weighted Team Average + Verification Bonuses

### 30. Recruitment System
**Status**: Production-ready
**Completion**: 100%
**Completed**: 2026-01-14

### 31. Blog-to-Marketplace Demand Engine
**Status**: Phase 1-3 Complete (Phase 4-7 Frozen)
**Completion**: Phase 3 (Observation Layer)
**Completed**: 2026-01-16

**Core Philosophy**: SEO builds demand > Blog educates > Marketplace converts > Wiselists retain > Referrals multiply

**Phase 1-2: Foundation**:
- Event-based attribution infrastructure (immutable event stream)
- Dual-write pattern (events + cache fields)
- Session tracking (30-day cookie-based)
- MDX embed components (TutorEmbed, ListingGrid, TutorCarousel)

**Phase 3: Unified Dashboard**:
- Four analytics RPCs with explicit attribution window parameters
- Article performance summary (views, interactions, saves, bookings, revenue)
- Conversion funnel analysis (4-stage: View > Interact > Save > Book)
- Dashboard live at `/admin/signal`

**Phase 4-7: Optimization Roadmap** (Frozen):
- Phase 4: Referral integration
- Phase 5: Cross-linking & SEO amplification
- Phase 6: Attribution model selection
- Phase 7: A/B testing & optimization

### 32. Resources (Educational Content Hub)
**Status**: Production-ready
**Completion**: 100%
**Completed**: 2026-01-18

### 33. EduPay (Phase 3 Complete)
**Status**: Phase 3 -- Conversion Complete (stub mode), Gold Standard UI Applied
**Completion**: Phase 1-3 complete, Phase 4 (affiliate onboarding) pending
**Last Updated**: 2026-02-12
**Design**: `docs/feature/edupay/edupay-solution-design.md`

EduPay converts tutoring activity into real financial progress against a student loan. Points-based rewards system -- not a bank. GBP1 earned = 100 EP -> 100 EP = GBP1 loan impact.

**Phase 1 -- UI Layer**: Complete
**Phase 2 -- API & Data**: Complete (migrations 253-260)
**Phase 3 -- Conversion**: Complete (TrueLayer stub mode)

### 34. VirtualSpace (Hybrid Virtual Classroom)
**Status**: Production-ready
**Completion**: 100%
**Last Updated**: 2026-02-15

VirtualSpace is a cost-optimized, zero-marginal-cost virtual learning environment featuring a hybrid model with collaborative whiteboard (tldraw + Ably real-time sync) alongside external video conferencing (Google Meet integration).

### 35. Lexi AI (Platform Help Bot)
**Status**: Production-ready (v2.0.0)
**Completion**: 100%
**Last Updated**: 2026-02-21

Lexi is TutorWise's AI-powered platform assistant providing instant support, task automation, and context-aware guidance across all user roles. Features guest mode with zero API cost and 20+ function tools for platform actions.

### 36. Sage AI (GCSE AI Tutor)
**Status**: Production-ready (v2.0.0)
**Completion**: 85% (110/500 topics)
**Last Updated**: 2026-02-21

Sage is an AI-powered GCSE tutor providing personalized educational support with curriculum-specific knowledge, mathematical problem solving, and continuous improvement through feedback analysis.

---

## Conductor — AI Operations Platform

The Conductor is the AI operations control plane for TutorWise. It manages the platform's Digital Workforce — autonomous AI agents, teams, and workflows that handle business processes.

### Conductor Naming Conventions
- **Agent**: Single specialist AI agent (`specialist_agents` table)
- **Team**: Multi-agent collaboration (`agent_teams` table, 3 patterns: Supervisor/Pipeline/Swarm)
- **Space**: Program/domain container (`agent_spaces` table) — 4 built-in: go-to-market, engineering, operations, analytics
- **Workflow**: Business process (`workflow_processes` table)
- **Conductor**: The control plane (`/admin/conductor`)

### Conductor Hierarchy
Space > Team > Agent (multi-tenant ready — RLS + `created_by` on `agent_spaces`; `agent_teams.space_id` FK)

### Conductor Tab Structure (11 tabs, 4 stages)
| Stage | Tabs |
|-------|------|
| **Design** | Workflows, Discovery |
| **Build** | Build, Agents, Teams, Spaces, Knowledge |
| **Execute** | Execution |
| **Observe** | Monitoring, Intelligence, Mining |

### Phase 1: Process Execution Engine (COMPLETE -- 2026-03-03)
**Design doc**: `ipom/process-execution-solution-design.md` (v3.2)

**Runtime**: `PlatformWorkflowRuntime` at `apps/web/src/lib/process-studio/runtime/`
- LangGraph StateGraph with `PostgresSaver.fromConnString()` (port 5432 session mode)
- Separate from CAS `LangGraphRuntime` (purpose-built for business processes)

**5 Seeded Workflow Processes** (migrations 338+339):
1. **Tutor Approval** (live) -- triggered by profiles UPDATE webhook
2. **Commission Payout** (live) -- delegated from `process-batch-payouts` pg_cron
3. **Booking Lifecycle -- Human Tutor** (shadow)
4. **Booking Lifecycle -- AI Tutor** (shadow)
5. **Referral Attribution** (design -- subprocess only)

**Execution Modes**: design | shadow | live
- Shadow mode runs processes in parallel without affecting production
- Admin toggles via `PATCH /api/admin/process-studio/processes/[id]/execution-mode`

**API Routes** (under `/api/admin/process-studio/`):
- `execute/start` POST, `execute/[executionId]` GET/DELETE, `execute/[executionId]/resume` POST
- `execute/task/[taskId]/complete` POST
- `processes/[id]/execution-mode` PATCH

**Webhook Triggers** (migration 343):
- `process_studio_booking_insert` (bookings INSERT)
- `process_studio_profile_under_review` (profiles UPDATE -> under_review)

**Database**: `workflow_executions` + `workflow_tasks` tables (migration 338); `profiles.status` column (migration 343)

### Phase 2: Conductor -- Agents + Teams (COMPLETE -- 2026-03-09)

**Tables**: `specialist_agents`, `agent_run_outputs`, `analyst_tools` (migration 348); `agent_subscriptions` (349); `agent_teams`, `agent_team_run_outputs` (352); `platform_notifications` (353)

**8 Built-in Specialist Agents**: developer, tester, qa, engineer, security, marketer, analyst, planner
- All seeded with `built_in=true` in `specialist_agents` table
- ReAct loop execution via `SpecialistAgentRunner` at `apps/web/src/lib/agent-studio/SpecialistAgentRunner.ts`
- TOOL_CALL regex parsing, writes to `agent_run_outputs`

**10 Built-in Analyst Tools** in `analyst_tools` table
- Tool executor: `apps/web/src/lib/agent-studio/tools/executor.ts`

**TeamRuntime** at `apps/web/src/lib/workflow/team-runtime/TeamRuntime.ts`:
- 3 collaboration patterns: **Supervisor** (parallel + synthesis), **Pipeline** (topological sort + sequential), **Swarm** (dynamic NEXT_AGENT routing)
- Rewritten as LangGraph StateGraph + PostgresSaver in Phase 6

**Nudge Scheduler**: `apps/web/src/lib/workflow/nudge-scheduler.ts`
- 4 conditions, 7d cooldown via `workflow_entity_cooldowns`
- Cron at `/api/cron/process-nudges` (x-cron-secret auth)

**Platform Notifications**: `platform_notifications` table (NOT `notifications`)
- Used by `send_notification` tool and nudge scheduler

**UI**:
- AgentManagementPanel at `/admin/conductor` Agents tab
- Agent chat at `/admin/conductor/agents/[slug]`
- Tools registry at `/admin/conductor/agents/tools`

### Phase 3: Conductor Intelligence Layer (COMPLETE -- 2026-03-09)

**3 New Specialist Agents** (pg_cron scheduled):
- `market-intelligence` (Mon 09:00 UTC)
- `retention-monitor` (daily 08:00 UTC)
- `operations-monitor` (daily 07:00 UTC)

**14 Analyst Tools** added to executor.ts:
query_caas_health, query_resources_health, query_editorial_opportunities, query_seo_health, query_keyword_opportunities, query_content_attribution, query_marketplace_health, query_supply_demand_gap, query_booking_health, query_listing_health, query_pricing_intelligence, query_financial_health, query_virtualspace_health, query_referral_funnel

**Intelligence Daily Tables** (pg_cron pipeline, 10 tables):
- caas(05:30) > resources(04:30) > article_intelligence_scores(04:45) > seo(05:00) > marketplace(06:00) > bookings(06:30) > listings(07:00) > financials(07:30) > virtualspace(08:00) > referral(09:00)

**10 Intelligence API Routes** under `/api/admin/`:
caas/intelligence, resources/intelligence, seo/intelligence, signal/intelligence, signal/marketplace, listings/intelligence, bookings/intelligence, financials/intelligence, virtualspace/intelligence, referrals/intelligence

**IntelligencePanel**: Conductor 'intelligence' tab with 10 sub-tabs, auto-fetches on first activation

**Shadow Monitoring**:
- GoLiveReadiness component: progress bar toward 50 clean shadow runs, divergence count, ExecutionModeToggle
- `GET /api/admin/workflow/processes/[id]/shadow-stats`

### Phase 4: Knowledge, Intent, Context & Learning (COMPLETE -- 2026-03-10)

**4A -- Knowledge Base** (migration 376):
- `platform_knowledge_chunks` table (768-dim vector, 18 categories covering all 14 Phase 3 intel domains)
- `match_platform_knowledge_chunks()` RPC for RAG retrieval
- KnowledgePanel at Conductor 'knowledge' tab (CRUD + RAG preview)
- RAG augmentation in SpecialistAgentRunner (AGENT_KNOWLEDGE_CATEGORY map)

**4B -- IntentDetector** at `apps/web/src/lib/conductor/IntentDetector.ts`:
- ExecutionCommandBar routes to agent/workflow/tab via classify-intent API

**4C -- PlatformUserContext** at `apps/web/src/lib/platform/user-context.ts`:
- Enriched with growth_scores, referrals, marketplace, signals
- Redis cache: `apps/web/src/lib/platform/context-cache.ts`
- Cross-agent handoff: `apps/web/src/lib/platform/agent-handoff.ts`
- Injected into Sage/Lexi/Growth session routes

**4C-ii -- Network Intelligence**:
- `/admin/network/` page (3 tabs)
- `/api/admin/network/intelligence` API
- Network Intelligence link in AdminSidebar

**4D -- Learning Loop** (migration 377):
- `decision_rationale` JSONB on `workflow_executions`
- `decision_outcomes` table with outcome measurement
- `process_autonomy_config` table
- 3 pg_cron outcome measurement jobs
- TierCalibrationPanel in IntelligencePanel 'Autonomy' sub-tab
- `/api/admin/conductor/autonomy/*` routes

**Autonomy Calibrator Agent** (migration 378):
- Weekly Mon 10:00 UTC via pg_cron
- `query_network_intelligence` + `query_autonomy_calibration` tools

### Phase 5: Process Mining Enhancement (COMPLETE -- 2026-03-10)

**Migration 379**: `conformance_deviations` + `process_patterns` tables + performance indexes + `query_process_patterns` analyst tool

**ConformanceChecker** at `apps/web/src/lib/process-studio/conformance/ConformanceChecker.ts`:
- Checks execution paths against process graph
- Detects: skipped steps, unexpected paths, stuck executions

**4 API Routes** under `/api/admin/conductor/workflows/[id]/`:
- `analytics` -- paths, cycle time per node (bottleneck detection), AI patterns
- `conformance` (GET + PATCH) -- conformance rate, deviation list, mark-as-expected
- `shadow` -- enhanced live vs shadow dashboard + go-live checklist (5 items)
- `promote` -- enforces all checklist items, then flips execution_mode='live'

**MiningPanel**: New 'mining' tab in Conductor Stage 4 (Observe) with Analytics/Conformance/Shadow sub-tabs + Promote button

**Shadow-Reconcile Cron**: Batch-checks newly completed executions for conformance, inserts `conformance_deviations` rows

### Phase 6: DevOps Team & LangGraph Migration (COMPLETE -- 2026-03-11)

**6A -- TeamRuntime Rewrite** (migration 383):
- TeamRuntime.ts rewritten as LangGraph StateGraph + PostgresSaver
- `cas-team` slug renamed to `devops-team` (DevOps Team), assigned to `engineering` space

**6B -- Agent Configs** (migration 384):
- 9 DevOps Team agent configs enriched with production system prompts

**6C -- HITL (Human-in-the-Loop)**:
- `interrupt()` / `resume()` in supervisor pattern
- `teamRuntime.run(slug, task, trigger, { hitl: true })` pauses after specialists, status='awaiting_approval'
- Resume via `teamRuntime.resume(runId, approved)` or `POST /api/admin/teams/{id}/runs/{runId}/resume`
- 12 unit tests

**6D -- Legacy CAS Deprecation** (migration 385):
- `/admin/cas/workflow-fullscreen` redirects to Conductor
- Legacy CAS API routes stubbed out
- `cas_*` tables soft-deprecated (hard delete eligible 2026-06-11)

**6E -- Decision Outcome Stubs**:
- `decision_outcomes` stubs written after each team run completion (7d + 30d lag measurement)

### Phase 7: Agent Episodic Memory (COMPLETE -- 2026-03-11)

**Migration 386**: `memory_episodes` + `memory_facts` tables

**memory_episodes**: One row per agent run, vector(768) with HNSW index
- `match_memory_episodes(query_embedding, p_agent_slug, threshold=0.72, count=5)` RPC

**memory_facts**: Subject/relation/object triples with `valid_from`/`valid_until` temporal bounds
- `match_memory_facts(query_embedding, p_agent_slug, count=5)` RPC

**AgentMemoryService** at `apps/web/src/lib/agent-studio/AgentMemoryService.ts`:
- `fetchMemoryBlock()` -- retrieves relevant past episodes + facts for a given query
- `recordEpisode()` -- stores run summary with embedding
- `extractAndStoreFacts()` -- uses `ai.generateJSON<ExtractedFact[]>()` for outputs >200 chars (max 4 facts per run)
- `invalidateFact()` -- sets `valid_until` on superseded facts

**Integration**: `SpecialistAgentRunner.run()` fetches memory block in parallel with knowledge block; injects as `PAST EXPERIENCE` section; records episode + extracts facts post-run (both fire-and-forget, fail-silently)

---

## Growth Agent (COMPLETE -- 2026-03-04)

**Location**: `apps/web/src/lib/growth-agent/`
**Pricing**: GBP10/month subscription (free tier: Revenue Audit only)

Role-adaptive AI advisor for ALL users (tutor, client, agent, organisation). Provides personalized growth strategies, revenue intelligence, and business guidance.

**5 Skill Files** (knowledge base, DSPy-style, UK/international):
1. `skills/profile-listing-audit.ts` -- pricing benchmarks, listing quality, qualifications, education policy
2. `skills/referral-strategy.ts` -- channels, outreach templates, seasonal calendar, pipeline benchmarks
3. `skills/revenue-intelligence.ts` -- income patterns, seasonal demand, full-time jump, UK business/tax
4. `skills/income-stream-discovery.ts` -- 4 income streams, unlock sequencing, combinations
5. `skills/business-setup-compliance.ts` -- career decisions, registration steps, T&Cs, compliance

**8 Tools**: Defined in `tools/definitions.ts`, executed via `tools/executor.ts`

**Orchestrator** (`index.ts`): `GrowthAgentOrchestrator` -- `buildSystemPrompt()`, `stream()`, `runRevenueAudit()`

**API Routes**:
- `GET/POST /api/growth-agent/session` -- session management
- `POST /api/growth-agent/stream` -- streaming chat
- `GET /api/growth-agent/audit` -- free Revenue Audit (no subscription required)

**Metrics Hydration**: Parallel Supabase queries (profiles, bookings last 30d, referrals, ai_agents)

---

## External Publishing (IN PROGRESS -- 2026-03-11)

**Goal**: Enterprise credibility + investor narrative
**Location**: `conductor/publish/`

**3 Documents**:
1. `00-publishing-plan.md` -- master plan, remaining work checklist, venues, messaging anchors
2. `01-technical-white-paper.md` -- enterprise/CTO audience; container-to-agent isomorphism, shadow/live model
3. `02-investor-thesis.md` -- VC/investor audience; insight > moat > flywheel > ask (Ask section placeholder)

**Key Vocabulary**: Agent Registry (trio of Agents+Teams+Spaces), Digital Workforce (operational), Digital Force (brand/external), Conductor (control plane)

**Remaining**: Diagrams (Excalidraw/Figma), verify Gartner stat, complete Ask section, add traction metrics, legal/IP review

---

## In Progress

### 1. Student Management Enhancement
**Priority**: P2
**Completion**: 75%
- Basic student management is production-ready
- Academic records and attendance tracking in progress
- Performance analytics and parent/guardian access planned for Q2 2026

### 2. Sage Curriculum Expansion
**Priority**: P2
**Completion**: 85% (110/500 topics)
- 110 GCSE Maths chunks ingested across 22 topics
- Target: 500+ topics (Maths, English, Science) by Q2 2026
- Multimodal input endpoints ready (OCR, Speech-to-Text awaiting Google APIs)

### 3. EduPay Phase 4 -- Affiliate Onboarding
**Priority**: P3
- Awin + CJ affiliate account setup (requires external partner onboarding)
- Tillo integration (gift rewards)
- TrueLayer production credentials needed for live conversion

---

## Success Metrics

### Beta Release (Completed Mar 2026)
- **Beta Users**: 50-100 invited testers
- **Test Coverage**: 80%+ backend, 75%+ frontend
- **Platform Uptime**: 99%+ availability
- **Performance**: <2s page load times
- **Bug Resolution**: <24h for critical, <48h for high

### Production Launch Targets
- **User Acquisition**: 500+ registered users in first month
- **Booking Conversion**: 15%+ visitor-to-booking rate
- **Platform Uptime**: 99.9%+ availability
- **Customer Satisfaction**: 4.5+ stars average
- **Response Time**: <1s for 95% of requests

---

## Technology Stack

### Frontend
- Next.js 16 with App Router
- TypeScript 5.x (strict mode)
- React 19 with Server Components
- React Query (TanStack Query) for server state
- React Context API for client state

### Backend & Data
- Supabase PostgreSQL (auth, profiles, business data)
- pgvector for semantic search (768-dim embeddings via gemini-embedding-001)
- Supabase Auth with Google OAuth
- Supabase Storage for file uploads
- Ably real-time platform (messaging, presence, typing indicators)
- Redis (Upstash) for rate limiting and context caching

### AI & Intelligence
- 6-tier AI provider chain (xAI Grok 4 Fast > Gemini Flash > DeepSeek R1 > Claude Sonnet 4.6 > GPT-4o > Rules)
- LangGraph StateGraph for workflow and team runtime
- PostgresSaver for LangGraph checkpointing
- pgvector HNSW for RAG and memory retrieval
- Gemini embedding-001 (768 dimensions) for all vector embeddings

### Payments & External Services
- Stripe Connect for payments
- Ably (real-time messaging and presence)
- Jira Service Desk for help centre
- Google OAuth for authentication

### DevOps & Testing
- Vercel for deployment
- GitHub Actions for CI/CD
- Playwright for E2E testing
- Jest for unit/integration testing
- Husky pre-commit hooks (tests, lint, full build)

### Monitoring & Analytics
- Vercel Analytics
- Supabase Logs
- Custom audit logging
- Intelligence daily tables (10 domain-specific pg_cron pipelines)

---

## Security & Compliance

### Implemented
- Row-Level Security (200+ policies)
- `is_admin()` function for admin authorization in RLS policies
- GDPR compliance (data deletion, PII anonymization)
- Input validation and sanitization
- Rate limiting (Upstash Redis)
- Audit logging (all admin actions)
- Secure session management
- Environment variable protection
- Cron job authentication (x-cron-secret headers)

### Pre-Launch
- Penetration testing
- Security audit (third-party)
- OWASP Top 10 compliance verification
- Data backup and disaster recovery testing

---

## Development Velocity

### Activity Summary (Oct 2025 - Mar 2026)
- **Total Commits**: 1,800+
- **Features**: 95+
- **Bug Fixes**: 160+
- **Refactors**: 70+
- **Lines of Code**: 250,000+
- **Test Coverage**: 78% overall

### Recent Highlights (Feb-Mar 2026)
- **Process Execution Engine** (Phase 1): LangGraph-powered workflow runtime with shadow/live modes
- **Growth Agent**: Role-adaptive AI advisor with 5 skill files, 8 tools, streaming chat
- **Conductor Phases 2-7**: Complete AI operations layer (agents, teams, intelligence, mining, memory)
- **External Publishing**: Technical white paper + investor thesis drafts

---

## Known Technical Debt

### High Priority
- Optimize some large Admin Hub queries (pagination improvements)
- `growth_agent_messages` table needs migration before logging is active
- `hydrateUserMetrics` deduped across 3 Growth Agent route files (candidate for shared lib)

### Medium Priority
- Consolidate duplicate utility functions
- Improve TypeScript types (reduce `any` usage)
- Enhanced logging and monitoring

### Low Priority
- Code splitting optimization for smaller bundles
- Component library documentation (Storybook)
- Automated accessibility testing

---

## Future Enhancements (Post-Launch)

### Q2 2026
- Conductor Phase 5 shadow monitoring -> go-live for remaining processes
- Sage curriculum expansion (English, Science)
- Student Management advanced features (performance analytics, parent/guardian access)
- EduPay affiliate onboarding (Awin, CJ, Tillo)
- Multi-tier referral commission activation (pending legal review)

### Q3 2026
- Multi-language support (i18n)
- Advanced business intelligence
- Third-party integrations (LMS, calendars)
- Progressive Web App (PWA) features
- Mobile app (React Native)

### Q4 2026
- White-label solutions for organisations
- International expansion
- Advanced ML/AI features (fraud detection, tutor matching)
- Demand Engine Phases 4-7 (attribution models, A/B testing)
