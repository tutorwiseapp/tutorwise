# Tutorwise System Navigation Guide

**Purpose**: Complete navigation map for developers and stakeholders to understand where everything lives in the codebase and how users flow through the platform.

---

## Version History

1.0 2026-01-14 - Initial creation - comprehensive system navigation 
1.1 2026-02-04 - Update - Last update

---

## Platform Metrics (Single Source of Truth)

### Codebase Scale
- **267 pages** (111 UI pages + 144 API routes + 12 dynamic route patterns)
- **148,000 lines of code** (TypeScript/TSX across app, components, lib)
- **180,000 lines of documentation** (16K AI context + 164K feature/technical docs)
- **29,000 lines of SQL** (196 migration files, 60+ tables)
- **353 components** (22 feature component directories + UI library)
- **31 major features** (22 core systems + 14 platform hubs - 5 overlap)

### Total User-Facing Views Including Modals
- 155 total UI views that users can see and interact with:

#### 111 Route-based Pages (with URLs)
- 44 Admin pages
- 4 Auth pages
- 13 Public pages
- 5 Public profile pages
- 16 Onboarding pages
- 30 Authenticated user pages

#### 36 Interactive Modals (overlay views)
- 7 Admin detail modals
- 3 Admin user management modals
- 6 Organisation modals
- 3 Financial modals
- 1 Booking modal
- 2 Student modals
- 3 Wiselist modals
- 4 Referral modals
- 2 Network/connection modals
- 5 Other feature modals (video, share, first login, reviews, snapshot)

#### 7 Dialogs & Drawers
- 1 Confirmation dialog (reusable)
- 6 Advanced filter drawers (admin hubs)

#### Summary:
- Original documentation: 260 pages = 107 UI pages + 141 API routes + 12 dynamic patterns
- Including all interactive views: 150 UI views = 107 pages + 36 modals + 7 dialogs/drawers
- Pure user interaction surfaces: 143 views (if excluding filter drawers, which are utility overlays)
- The 107 UI pages metric counts only route-based pages with distinct URLs. Modals are separate interactive components that overlay existing pages and are not included in that count.

### API & Database
- **144 API endpoints** (REST + webhooks + RPC functions)
- **196 database migrations** (190 numbered: 000-182 + 6 supporting files)
- **200+ Row-Level Security policies** with granular RBAC
- **60+ database tables** with comprehensive relationships

### Advanced Technical Systems
- **Neo4j graph database** with PageRank trust propagation for SEO
- **ML-powered fraud detection** with automated triggers and pattern recognition
- **AI semantic search** using pgvector (1,536-dimensional embeddings)
- **Real-time infrastructure** (Ably) for messaging, presence, typing indicators
- **Automated CI/CD pipeline** with comprehensive testing suite

### Development Activity (Oct 2025 - Jan 2026)
- **1,400 commits** across 3.5 months of development
- **82 features** implemented
- **151 bug fixes** resolved
- **63 refactors** for code quality and maintainability

### Quality & Testing
- **106 passing unit tests** (Jest)
- **E2E testing suite** (Playwright)
- **Visual regression testing** (Percy)
- **Test coverage**: 78% overall

### Platform Status
- **98% complete** - production-ready
- **Beta launch**: February 1, 2026
- **Production launch**: March 1, 2026

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Documentation Map](#documentation-map)
3. [Visual Page Sitemap](#visual-page-sitemap)
4. [Feature → File Location Map](#feature--file-location-map)
5. [User Journey Flows](#user-journey-flows)
6. [Codebase Structure](#codebase-structure)
7. ["I Want To..." Quick Reference](#i-want-to-quick-reference)
8. [Architecture References](#architecture-references)

---

## Quick Start

### For New Developers

**Start here in order:**

1. [ROADMAP.md](.ai/ROADMAP.md) - Understand what's built (90% complete)
2. [PLATFORM-SPECIFICATION.md](.ai/PLATFORM-SPECIFICATION.md) - Complete technical architecture
3. [SYSTEM-NAVIGATION.md] - This file navigates the codebase
4. [PATTERNS.md](.ai/PATTERNS.md) - Learn code conventions
5. [CONTEXT-MAP.md](.ai/CONTEXT-MAP.md) - Understand how context files interconnect

### For AI Assistants

**Decision tree:**
- Need to understand **WHAT** the platform does? → [PLATFORM-SPECIFICATION.md](.ai/PLATFORM-SPECIFICATION.md)
- Need to find **WHERE** code lives? → **This file**
- Need to know **HOW** to code? → [PATTERNS.md](.ai/PATTERNS.md)
- Need to understand **WHY** decisions were made? → [CONTEXT-MAP.md](.ai/CONTEXT-MAP.md)

---

## Documentation Map

### Core Context Files (`.ai/`)

| File | Purpose | When to Use |
|------|---------|-------------|
| [ROADMAP.md](.ai/ROADMAP.md) | Development status, 98% complete, 31 features | Check what's implemented vs planned |
| [PLATFORM-SPECIFICATION.md](.ai/PLATFORM-SPECIFICATION.md) | Complete technical + strategic spec (3,194 lines) | Understand business logic, architecture, APIs |
| [SYSTEM-NAVIGATION.md](.ai/SYSTEM-NAVIGATION.md) | This file - where everything lives | Find code locations, user flows |
| [PATTERNS.md](.ai/PATTERNS.md) | Code conventions, standards | Write consistent code |
| [CONTEXT-MAP.md](.ai/CONTEXT-MAP.md) | How context files interconnect | Understand documentation structure |
| [DESIGN-SYSTEM.md](.ai/DESIGN-SYSTEM.md) | UI/UX component library, design tokens | Build UI components |
| [ADMIN-DASHBOARD.md](.ai/ADMIN-DASHBOARD.md) | 11 admin hubs architecture | Work on admin features |
| [SHARED-FIELDS.md](.ai/SHARED-FIELDS.md) | 23 global fields, 106 mappings, 9 contexts | Work with form system |
| [ONBOARDING.md](.ai/ONBOARDING.md) | Page-based onboarding (3 roles × 5 steps) | Work on onboarding flows |
| [RESOURCES-REVENUE-SIGNAL.md](.ai/RESOURCES-REVENUE-SIGNAL.md) | Resources attribution system (Phases 1-3 complete, Blog→Resources migration complete 2026-01-18) | Work on resources-to-marketplace demand engine |
| [PROMPT.md](.ai/PROMPT.md) | AI assistant configuration | Configure AI behavior |

### Development Docs (`docs/development/`)

| File | Purpose |
|------|---------|
| [environment-setup.md](../docs/development/environment-setup.md) | Local dev environment setup |
| [DEVELOPMENT-WORKFLOW.md](../docs/development/DEVELOPMENT-WORKFLOW.md) | Daily development process |
| [quick-start-guide.md](../docs/development/quick-start-guide.md) | New developer onboarding |

### Feature Documentation (`docs/features/` & `docs/feature/`)

| Feature | Location |
|---------|----------|
| **CaaS System** | `docs/features/caas/` |
| - Agent CaaS Model | [agent-caas-subscription-incentive-model.md](../docs/features/caas/agent-caas-subscription-incentive-model.md) |
| - Organisation CaaS | [agent-org-caas-implementation-summary.md](../docs/features/caas/agent-org-caas-implementation-summary.md) |
| - Dual-Path Architecture | [caas-dual-path-architecture.md](../docs/feature/caas/caas-dual-path-architecture.md) |
| **Dashboard** | `docs/features/dashboard/` |
| - Role-Based Design | [role-based-dashboard-design.md](../docs/features/dashboard/role-based-dashboard-design.md) |
| **Referrals** | `docs/feature/referrals/` |
| - Solution Design v2 | [referrals-solution-design-v2.md](../docs/feature/referrals/referrals-solution-design-v2.md) |
| - Deployment Guide | [DEPLOYMENT-GUIDE.md](../docs/feature/referrals/DEPLOYMENT-GUIDE.md) |
| - Multi-Tier Rationale | [MULTI_TIER_DECISION_RATIONALE.md](../docs/feature/referrals/MULTI_TIER_DECISION_RATIONALE.md) |
| **Help Centre** | `docs/feature/help-centre/` |
| - Implementation Complete | [IMPLEMENTATION-COMPLETE.md](../docs/feature/help-centre/IMPLEMENTATION-COMPLETE.md) |
| - Jira Integration | [service-desk-integration.md](../docs/feature/help-centre/service-desk-integration.md) |
| **SEO System** | `docs/seo/` |
| - Implementation Complete | [seo-implementation-complete.md](../docs/seo-implementation-complete.md) |
| - Top 5 Plan | [seo-top5-implementation-plan.md](../docs/seo-top5-implementation-plan.md) |

### Database (`tools/database/migrations/`)

- **192 migrations** (191 numbered + 1 supporting)
- Naming: `NNN_descriptive_name.sql`
- Key migrations:
  - `001-074`: Core platform (profiles, listings, bookings)
  - `075-098`: Features (referrals, payments, reviews)
  - `099-142`: Advanced features (organisations, CaaS, messages)
  - `143-173`: Enhancements (metrics, soft delete, Agent/Org CaaS)

---

## Visual Page Sitemap

**All 260+ Platform Pages** - Complete route hierarchy showing every page and API endpoint in the Tutorwise platform.

### Summary

| Category | Count | Description |
|----------|-------|-------------|
| **Public Pages** | 13 | Landing, marketplace, help, policies |
| **Auth & Redirects** | 4 | Login, OAuth callbacks, referral links |
| **Public Profiles** | 5 | Listings, profiles, organisations (dynamic) |
| **Marketplace Pages** | 5 | Directories (orgs, schools, agencies, companies, docs) |
| **Resources Pages** | 3 | Resources index, article detail, category pages |
| **Onboarding Flows** | 16 | 3 roles × 5 steps (Tutor, Client, Agent) + hub |
| **Dashboard Pages** | 30 | Account, bookings, financials, network, org management |
| **Admin Pages** | 35 | 13 admin hubs + SEO management + Signal Analytics + settings |
| **Total UI Pages** | **111** | |
| **API Endpoints** | **144** | REST APIs + webhooks |
| **Dynamic Routes** | **~12** | [id], [slug], etc. (counted in category totals) |
| **GRAND TOTAL** | **267+** | All pages including dynamic variations |

---

### Public Pages (13 pages)

```
/                                    # Landing page (home)
/about-tutorwise                     # About Tutorwise
/resources                           # Resources hub
/saved                               # Saved items/listings
/contact                             # Contact us
/terms-of-service                    # Terms of service
/privacy-policy                      # Privacy policy
/login                               # Login page
/signup                              # Sign up page
/forgot-password                     # Forgot password recovery
/delete-account                      # Delete account
/help-centre                         # Help centre hub
  /help-centre/[category]            # Help by category (dynamic)
    /help-centre/[category]/[slug]   # Help article (dynamic)
```

---

### Resources Pages (3 pages)

```
/resources                           # Resources index (article list)
/resources/[slug]                    # Article detail page (dynamic)
/resources/category/[category]       # Category pages (dynamic)
```

---

### Auth & Redirect Pages (4 pages)

```
/auth/callback                       # OAuth callback handler
/a/[referral_id]                     # Referral link redirect (dynamic)
/ref/[code]                          # Referral code handler (dynamic)
/w/[slug]                            # Wisespot link - organisation/resource (dynamic)
```

---

### Marketplace & Public Profiles (5 pages)

```
/listings/[id]/[[...slug]]           # Public listing detail page (dynamic)
/public-profile/[id]/[[...slug]]     # Public tutor/professional profile (dynamic)
/public-organisation-profile/[slug]  # Public organisation profile (dynamic)
/join/[slug]                         # Join organisation flow (dynamic)
/edit-listing/[id]                   # Edit listing page (dynamic)
```

---

### Marketplace Organization Pages (5 pages)

```
/organisations                       # Organisations directory
/schools                             # Schools directory
/agencies                            # Agencies directory
/companies                           # Companies directory
/developer/docs                      # API documentation
```

---

### Onboarding Flows (16 pages)

```
/onboarding                          # Onboarding hub/start

# Tutor Onboarding (5 pages)
/onboarding/tutor                    # Tutor onboarding start
/onboarding/tutor/personal-info      # Personal information
/onboarding/tutor/professional-details  # Professional details
/onboarding/tutor/availability       # Availability/schedule
/onboarding/tutor/verification       # Verification step

# Client Onboarding (5 pages)
/onboarding/client                   # Client onboarding start
/onboarding/client/personal-info     # Personal information
/onboarding/client/professional-details # Professional details
/onboarding/client/availability      # Availability/schedule
/onboarding/client/verification      # Verification step

# Agent Onboarding (5 pages)
/onboarding/agent                    # Agent onboarding start
/onboarding/agent/personal-info      # Personal information
/onboarding/agent/professional-details  # Professional details
/onboarding/agent/availability       # Availability/schedule
/onboarding/agent/verification       # Verification step
```

---

### Authenticated Dashboard & Core Pages (30 pages)

```
# Dashboard
/dashboard                           # Main dashboard hub (role-specific)
/wisespace/[bookingId]               # Tutoring session space (dynamic)

# Account Management (6 pages)
/account                             # Account overview
/account/personal-info               # Personal information
/account/professional-info           # Professional information
/account/settings                    # Account settings
/account/referral-preferences        # Referral preferences
/account/referrals/settings          # Referral settings

# Core Features (9 pages)
/bookings                            # Bookings/sessions hub
/messages                            # Messaging/communications
/listings                            # User listings
/network                             # Professional network
/wiselists                           # Wiselists (wishlist/collections)
/reviews                             # Reviews/ratings hub
/my-students                         # My students (for tutors)
/payments                            # Payment methods
/referrals                           # Referral program

# Financials (3 pages)
/financials                          # Financials overview
/financials/payouts                  # Payout history
/financials/disputes                 # Disputes

# Developer (1 page)
/developer/api-keys                  # API keys management

# Organisation Management (5 pages)
/organisation                        # Organisation hub
/organisation/tasks                  # Organisation tasks
/organisation/referrals              # Organisation referrals
/organisation/[id]/tasks             # Specific org tasks (dynamic)
/organisation/[id]/referrals         # Specific org referrals (dynamic)

# Organisation Settings (4 pages)
/organisation/settings               # Settings hub
/organisation/settings/billing       # Billing
/organisation/settings/integrations  # Integrations
/organisation/settings/team-permissions # Team permissions
```

---

### Admin Panel (35 pages)

```
# Admin Home
/admin                               # Admin dashboard

# Core Admin Hubs (11 pages)
/admin/accounts                      # Accounts management hub
  /admin/accounts/admins             # Admin accounts
  /admin/accounts/users              # User accounts
/admin/bookings                      # Bookings management
/admin/listings                      # Listings management
/admin/organisations                 # Organisations management
/admin/reviews                       # Reviews management
/admin/referrals                     # Referrals management
/admin/configurations                # System configurations

# Financials Management (3 pages)
/admin/financials                    # Financials hub
/admin/financials/payouts            # Payout management
/admin/financials/disputes           # Dispute management

# SEO Management (11 pages)
/admin/seo                           # SEO hub
  /admin/seo/hubs                    # Location hubs
    /admin/seo/hubs/[id]/edit        # Edit hub (dynamic)
  /admin/seo/spokes                  # Location spokes
  /admin/seo/keywords                # Keyword management
  /admin/seo/citations               # Citations management
  /admin/seo/backlinks               # Backlinks tracking
  /admin/seo/templates               # SEO templates
  /admin/seo/config                  # SEO configuration
  /admin/seo/eligibility             # SEO eligibility
  /admin/seo/settings                # SEO settings

# Settings Management (6 pages)
/admin/settings                      # Settings hub
  /admin/settings/email              # Email configuration
  /admin/settings/payments           # Payment settings
  /admin/settings/integrations       # Integrations
  /admin/settings/security           # Security settings
  /admin/settings/subscriptions      # Subscription management

# Signal Analytics (1 page - live)
/admin/signal                        # Revenue Signal Analytics dashboard (migrated from /admin/blog/orchestrator)
```

---

### API Endpoints (144 routes)

#### Resources Attribution (3 endpoints)
```
POST /api/resources/attribution/events    # Record resource interaction events
POST /api/resources/attribution           # Record conversion attribution (dual-write)
POST /api/resources/saves                 # Save article to wiselist (dual-write)
```

#### Activity & System (4 endpoints)
```
POST /api/activity                   # Log activity
GET  /api/visual-testing             # Visual testing utility
GET  /api/health                     # Health check
GET  /api/health/supabase            # Supabase health check
```

#### Authentication (1 endpoint)
```
POST /api/auth/logout                # Logout
```

#### Admin Operations (23 endpoints)
```
# User Management
GET  /api/admin/users                # Get all users
POST /api/admin/users/manage         # Manage users
POST /api/admin/users/delete         # Delete user

# Account Management
GET  /api/admin/accounts/users       # Get account users

# Configuration
GET  /api/admin/platform-config      # Platform config
GET  /api/admin/email-config         # Email config
GET  /api/admin/security-config      # Security config
GET  /api/admin/stripe-config        # Stripe config
GET  /api/admin/integrations-config  # Integrations config

# Notifications
POST /api/admin/notifications/process # Process notifications

# Organizations
POST /api/admin/organisations/[id]/subscription          # Set subscription
POST /api/admin/organisations/[id]/force-activate        # Force activate
POST /api/admin/organisations/[id]/reset-trial           # Reset trial

# SEO Management
GET  /api/admin/seo/stats            # SEO stats
GET  /api/admin/seo/config           # SEO config
GET  /api/admin/seo/check-ranks      # Check rankings
GET  /api/admin/seo/sync-gsc         # Sync Google Search Console
GET  /api/admin/seo/hubs/stats       # Hub stats
GET  /api/admin/seo/spokes/stats     # Spoke stats
GET  /api/admin/seo/citations/stats  # Citation stats

# Revenue
GET  /api/admin/revenue-stats        # Revenue statistics

# Webhooks
GET  /api/admin/webhooks             # Webhook management
```

#### Listings & Marketplace (17 endpoints)
```
# Marketplace Search & Discovery
GET  /api/marketplace/search         # Search listings/tutors
GET  /api/marketplace/autocomplete   # Search autocomplete
GET  /api/marketplace/profiles       # Get profiles
GET  /api/marketplace/organisations  # Get organisations
GET  /api/marketplace/recommendations # Get recommendations
GET  /api/marketplace/insights       # Marketplace insights
GET  /api/marketplace/match-score    # Calculate match score

# Saved Searches
GET  /api/marketplace/saved-searches # Get saved searches
POST /api/marketplace/saved-searches # Create saved search
POST /api/marketplace/saved-searches/execute # Execute saved search

# Listings
GET  /api/listings/[id]/[[...slug]]  # Get listing detail
GET  /api/seo/eligible-listings      # Get SEO-eligible listings

# Profiles
GET  /api/profiles/search            # Search profiles
GET  /api/profiles/search-by-referral-code # Search by referral
GET  /api/profiles/[id]              # Get profile detail
GET  /api/profiles/[id]/stats        # Get profile stats
GET  /api/profiles/[id]/track-view   # Track profile view
```

#### Bookings & Sessions (4 endpoints)
```
GET  /api/bookings                   # Get bookings
POST /api/bookings                   # Create booking
POST /api/bookings/assign            # Assign booking
POST /api/sessions/create-free-help-session # Create free help session
```

#### Reviews & Ratings (5 endpoints)
```
GET  /api/reviews/given              # Reviews given by user
GET  /api/reviews/received           # Reviews received
GET  /api/reviews/pending-tasks      # Pending review tasks
POST /api/reviews/submit             # Submit review
GET  /api/reviews/session/[session_id] # Get session reviews
```

#### Referrals System (8 endpoints)
```
GET  /api/referrals                  # Get referrals
POST /api/referrals                  # Create referral
GET  /api/referrals/create           # Create referral (v1)
GET  /api/referrals/stats            # Referral stats
POST /api/referrals/attribute        # Attribute referral
POST /api/referrals/qr               # Generate QR code
POST /api/referrals/remind           # Send reminder
POST /api/referrals/process-email-queue # Process email queue
```

#### Network & Social (13 endpoints)
```
# Connection Management
POST /api/network/request            # Send connection request
POST /api/network/accept             # Accept connection
POST /api/network/reject             # Reject connection
POST /api/network/remove             # Remove connection
POST /api/network/invite-by-email    # Invite by email

# Messaging
GET  /api/messages/conversations       # Get conversations
POST /api/messages/send                # Send message
POST /api/messages/mark-read           # Mark message as read
POST /api/messages/mark-conversation-read # Mark conversation read
GET  /api/messages/[userId]            # Get conversation with user

# Groups
GET  /api/network/groups             # Get groups
POST /api/network/groups             # Create group
GET  /api/network/groups/[groupId]   # Get group detail
POST /api/network/groups/[groupId]   # Update group
```

#### Financial Operations (5 endpoints)
```
GET  /api/financials                 # Get financial summary
POST /api/financials/withdraw        # Request withdrawal
POST /api/stripe/create-charge-and-transfer # Create charge and transfer
POST /api/stripe/create-booking-checkout # Booking checkout
```

#### Stripe Integration (14 endpoints)
```
# Account Setup
GET  /api/stripe/get-connect-account # Get connected account
POST /api/stripe/connect-account     # Connect Stripe account
POST /api/stripe/disconnect-account  # Disconnect account

# Payment Methods
GET  /api/stripe/get-cards-by-customer # Get customer cards
POST /api/stripe/verify-and-get-cards # Verify and get cards
POST /api/stripe/remove-card         # Remove card
POST /api/stripe/set-default-card    # Set default card

# Checkout
POST /api/stripe/create-checkout-session # Create checkout session
POST /api/stripe/customer-portal      # Open customer portal
POST /api/stripe/checkout/trial       # Trial checkout

# Organization Billing
GET  /api/stripe/organisation/get-cards        # Get org cards
POST /api/stripe/organisation/add-card-checkout # Add card for org
POST /api/stripe/organisation/remove-card      # Remove org card
POST /api/stripe/organisation/set-default-card # Set org default card

# Webhooks
POST /api/webhooks/stripe            # Stripe webhook handler
```

#### Organisation Features (9 endpoints)
```
# Invitation & Recruitment
POST /api/organisation/invite-users          # Invite users
POST /api/organisation/invite-by-email       # Invite by email
POST /api/organisation/recruitment/apply     # Apply for position

# Analytics & Insights
GET  /api/organisation/[id]/analytics/kpis              # KPI metrics
GET  /api/organisation/[id]/analytics/booking-heatmap   # Booking heatmap
GET  /api/organisation/[id]/analytics/revenue-trend     # Revenue trend
GET  /api/organisation/[id]/analytics/student-breakdown # Student breakdown
GET  /api/organisation/[id]/analytics/team-performance  # Team performance

# Tracking
GET  /api/organisations/[id]/track-view  # Track view
```

#### Dashboard Analytics (7 endpoints)
```
GET  /api/dashboard/summary              # Dashboard summary
GET  /api/dashboard/kpis                 # KPI metrics
GET  /api/dashboard/booking-heatmap      # Booking heatmap
GET  /api/dashboard/earnings-trend       # Earnings trend
GET  /api/dashboard/profile-views-trend  # Profile views trend
GET  /api/dashboard/referrer-sources     # Referrer sources
GET  /api/dashboard/student-breakdown    # Student breakdown
```

#### Developer & API Management (3 endpoints)
```
GET  /api/developer/api-keys             # Get API keys
POST /api/developer/api-keys             # Create API key
POST /api/developer/api-keys/[key_id]    # Manage API key
```

#### CaaS & Profiles (6 endpoints)
```
GET  /api/v1/profiles/[id]               # Get profile (v1)
GET  /api/v1/tutors/search               # Search tutors (v1)
GET  /api/caas/[profile_id]              # Get CAAS profile
POST /api/caas/calculate                 # Calculate CAAS
GET  /api/caas-worker                    # CAAS worker
GET  /api/v1/caas/[profile_id]           # Get CAAS (v1 public API)
```

#### Wiselist Management (10 endpoints)
```
GET  /api/wiselists                      # Get wiselists
POST /api/wiselists                      # Create wiselist
GET  /api/wiselists/[id]                 # Get wiselist detail
POST /api/wiselists/[id]                 # Update wiselist
GET  /api/wiselists/[id]/items           # Get wiselist items
POST /api/wiselists/[id]/items           # Add item
POST /api/wiselists/[id]/items/[itemId]  # Update item
GET  /api/wiselists/[id]/collaborators   # Get collaborators
POST /api/wiselists/[id]/collaborators   # Add collaborator
POST /api/wiselists/[id]/collaborators/[collabId] # Update collaborator
```

#### WiseSpace Session Management (2 endpoints)
```
POST /api/wisespace/[bookingId]/snapshot # Snapshot session
POST /api/wisespace/[bookingId]/complete # Complete session
```

#### Help Centre (1 endpoint)
```
GET  /api/help-centre/support/snapshot   # Get help centre snapshot
```

#### Integrations (2 endpoints)
```
POST /api/integrations/connect/[platform] # Connect integration
POST /api/integrations/callback/[platform] # Integration callback
```

#### Student Connections (4 endpoints)
```
GET  /api/links                          # Get links
POST /api/links                          # Create link
GET  /api/links/client-student           # Get client-student links
POST /api/links/client-student           # Create client-student link
GET  /api/links/client-student/[id]      # Get specific link
```

#### Presence & Availability (3 endpoints)
```
POST /api/presence/free-help/online      # Mark online
POST /api/presence/free-help/offline     # Mark offline
POST /api/presence/free-help/heartbeat   # Send heartbeat
```

#### Media & Files (2 endpoints)
```
POST /api/avatar/upload                  # Upload avatar
POST /api/embeddings/generate            # Generate embeddings
```

#### Onboarding (2 endpoints)
```
POST /api/save-onboarding-progress       # Save progress
GET  /api/onboarding/progress/[roleType] # Get progress
```

#### SEO Features (3 endpoints)
```
GET  /api/seo/stats                      # SEO statistics
GET  /api/seo/eligible-profiles          # Eligible profiles
GET  /api/seo/eligible-listings          # Eligible listings
```

#### Stats & Tracking (1 endpoint)
```
GET  /api/stats/free-sessions-count      # Free sessions count
```

#### AI Features (1 endpoint)
```
POST /api/ai/parse-query                 # Parse search query with AI
```

#### Cron Jobs (1 endpoint)
```
POST /api/cron/seo-sync                  # SEO sync cron job
```

#### External & Public APIs (6 endpoints)
```
POST /api/v1/bookings                    # Create booking (v1)
POST /api/v1/referrals/create            # Create referral (v1)
GET  /api/v1/referrals/stats             # Referral stats (v1)
GET  /api/user/delete                    # Delete user account
```

---

### Route Group Structure

The platform uses Next.js route groups to organize pages:

1. **(admin)** - Protected admin section (34 pages)
2. **(auth)** - Authentication pages (4 pages)
3. **Root level** - Public pages (13 pages) + special routes
4. **Public profiles** - Dynamic profile/listing pages (5 pages)
5. **/onboarding** - Onboarding flows (16 pages)
6. **Authenticated** - Protected user section (30 pages)
7. **/api** - Backend API endpoints (141 routes)

**Total: 248 distinct routes** (107 UI pages + 141 API endpoints). The 260 pages metric includes dynamic route variations (e.g., `/listings/[id]` counted per listing).

---

## Feature → File Location Map

### 1. Authentication & User Management

**Description**: Supabase Auth with OAuth, multi-role support (Tutor, Client, Agent)

**User Flow**:
- `/signup` → Create account
- `/login` → Sign in
- Email verification via Supabase

**File Locations**:
```
apps/web/src/app/
├── (auth)/
│   ├── login/page.tsx                    # Login page
│   ├── signup/page.tsx                   # Signup page
│   └── auth/callback/route.ts            # OAuth callback
├── proxy.ts                              # Next.js proxy - URL redirects/rewrites (Next.js 16)
└── components/auth/
    ├── LoginForm.tsx
    ├── SignupForm.tsx
    └── AuthProvider.tsx

Database:
- tools/database/migrations/001_create_profiles_table.sql
- tools/database/migrations/049_add_auth_metadata.sql
```

**Related Docs**:
- User flows: [USER-JOURNEY-MAP.md](../docs/USER-JOURNEY-MAP.md)
- API: [PLATFORM-SPECIFICATION.md](.ai/PLATFORM-SPECIFICATION.md#authentication-api)

---

### 2. Onboarding System

**Description**: Page-based routing for all 3 roles (Tutor, Client, Agent) with zero data loss across 5 steps each

**User Flow**:
- `/onboarding` → Role selection
- `/onboarding/{role}` → 5-step flow:
  1. Role Selection
  2. Subject/Interest Selection
  3. Professional Details
  4. Availability
  5. Review & Complete

**File Locations**:
```
apps/web/src/app/(admin)/
└── onboarding/
    ├── page.tsx                          # Role selection
    ├── tutor/
    │   ├── page.tsx                      # Tutor flow orchestrator
    │   └── [step]/page.tsx               # Dynamic step routing
    ├── client/
    │   ├── page.tsx                      # Client flow orchestrator
    │   └── [step]/page.tsx               # Dynamic step routing
    └── agent/
        ├── page.tsx                      # Agent flow orchestrator
        └── [step]/page.tsx               # Dynamic step routing

Components:
apps/web/src/app/components/feature/onboarding/
├── tutor/
│   ├── TutorOnboardingWizard.tsx         # Main wizard
│   └── steps/
│       ├── TutorRoleSelectionStep.tsx
│       ├── TutorSubjectSelectionStep.tsx
│       ├── TutorProfessionalDetailStep.tsx
│       ├── TutorAvailabilityStep.tsx
│       └── TutorReviewStep.tsx
├── client/
│   └── steps/
│       ├── ClientRoleSelectionStep.tsx
│       ├── ClientSubjectInterestStep.tsx
│       ├── ClientProfessionalDetailStep.tsx
│       ├── ClientAvailabilityStep.tsx
│       └── ClientReviewStep.tsx
└── agent/
    └── steps/
        ├── AgentRoleSelectionStep.tsx
        ├── AgentAgencyInfoStep.tsx
        ├── AgentServiceAreasStep.tsx
        ├── AgentCommissionStep.tsx
        └── AgentReviewStep.tsx

State Management:
apps/web/src/lib/services/onboarding.ts  # Zero data loss state

Database:
- tools/database/migrations/004_create_onboarding_progress_table.sql
- tools/database/migrations/135_add_onboarding_zero_data_loss.sql
```

**Related Docs**:
- [ONBOARDING.md](.ai/ONBOARDING.md) - Complete onboarding architecture
- [USER-JOURNEY-MAP.md](../docs/USER-JOURNEY-MAP.md) - User flows

---

### 3. Profiles & Professional Info

**Description**: Dynamic profile management with public/private views, professional templates

**User Flow**:
- `/profile` → Own profile (private view)
- `/profile/[id]` → Public profile view
- `/account/personal-info` → Edit personal details
- `/account/professional-info` → Edit professional template

**File Locations**:
```
apps/web/src/app/(admin)/
├── profile/
│   ├── page.tsx                          # Own profile view
│   └── [id]/page.tsx                     # Public profile view
└── account/
    ├── personal-info/page.tsx            # Personal details editor
    └── professional-info/page.tsx        # Professional template editor

Components:
apps/web/src/app/components/feature/
├── profile/
│   ├── ProfileHeader.tsx
│   ├── ProfileStats.tsx
│   ├── ProfileBio.tsx
│   └── VerificationBadges.tsx
└── professional-info/
    ├── ProfessionalInfoForm.tsx
    └── TemplateSelector.tsx

Database:
- tools/database/migrations/001_create_profiles_table.sql
- tools/database/migrations/062_create_professional_info_table.sql
- tools/database/migrations/127_add_profile_visibility.sql
```

---

### 4. Marketplace & Search

**Description**: Search with 141 API endpoints, smart matching, recommendations

**User Flow**:
- `/marketplace` → Browse all listings
- `/marketplace?subject=math` → Filtered search
- `/marketplace/[id]` → Listing detail page

**File Locations**:
```
apps/web/src/app/(admin)/
└── marketplace/
    ├── page.tsx                          # Marketplace grid + filters
    └── [id]/page.tsx                     # Listing detail page

Components:
apps/web/src/app/components/feature/marketplace/
├── MarketplaceGrid.tsx
├── ListingCard.tsx
├── SearchBar.tsx
├── AdvancedFilters.tsx
├── SortOptions.tsx
└── RecommendedListings.tsx

Services:
apps/web/src/lib/services/
├── marketplace.ts                        # Search & filter logic
├── matchScoring.ts                       # Smart matching algorithm
└── recommendations.ts                    # Recommendation engine

Database:
- tools/database/migrations/002_create_listings_table_simplified.sql
- tools/database/migrations/098_create_saved_listings_table.sql
- tools/database/migrations/122_add_marketplace_search_indexes.sql
```

---

### 5. Listings Management

**Description**: Dynamic listing creation with shared fields system (23 global fields → 106 mappings → 9 contexts)

**User Flow**:
- `/listings` → View all your listings
- `/listings/create` → Create new listing
- `/listings/[id]/edit` → Edit existing listing

**File Locations**:
```
apps/web/src/app/(admin)/
└── listings/
    ├── page.tsx                          # Listings dashboard
    ├── create/page.tsx                   # Create listing wizard
    └── [id]/
        └── edit/page.tsx                 # Edit listing

Components:
apps/web/src/app/components/feature/listings/
├── wizard-steps/
│   ├── CreateListings.tsx                # Main wizard orchestrator
│   ├── BasicInfoStep.tsx
│   ├── TeachingDetailsStep.tsx
│   ├── PricingStep.tsx
│   ├── AvailabilityStep.tsx
│   └── ReviewStep.tsx
└── management/
    ├── ListingsDashboard.tsx
    ├── ListingCard.tsx
    └── StatusBadge.tsx

Services:
apps/web/src/lib/
├── api/sharedFields.ts                   # Shared fields API
├── api/formConfig.ts                     # Form configuration
└── services/listings.ts                  # Listings CRUD

Database:
- tools/database/migrations/002_create_listings_table_simplified.sql
- tools/database/migrations/170_create_shared_fields_tables.sql
- tools/database/migrations/171_migrate_form_config_to_shared_fields.sql
```

**Related Docs**:
- [SHARED-FIELDS.md](.ai/SHARED-FIELDS.md) - Shared fields architecture

---

### 6. Bookings & Calendar

**Description**: Session scheduling, calendar management, assignments

**User Flow**:
- `/bookings` → View upcoming sessions
- `/bookings/[id]` → Session details
- `/calendar` → Calendar view

**File Locations**:
```
apps/web/src/app/(admin)/
├── bookings/
│   ├── page.tsx                          # Bookings list
│   └── [id]/page.tsx                     # Booking detail
└── calendar/
    └── page.tsx                          # Calendar view

Components:
apps/web/src/app/components/feature/bookings/
├── BookingCard.tsx
├── BookingCalendar.tsx
├── SessionDetails.tsx
└── AssignmentUpload.tsx

Database:
- tools/database/migrations/014_create_bookings_table.sql
- tools/database/migrations/141_add_bookings_metrics.sql
```

---

### 7. Payments & Financials

**Description**: Stripe Connect with commission splitting, payouts, earnings tracking

**User Flow**:
- `/payments` → Payment methods
- `/financials` → Earnings dashboard
- `/transaction-history` → All transactions

**File Locations**:
```
apps/web/src/app/(admin)/
├── payments/
│   └── page.tsx                          # Payment methods (Stripe)
├── financials/
│   └── page.tsx                          # Earnings dashboard
└── transaction-history/
    └── page.tsx                          # Transaction list

API Routes:
apps/web/src/app/api/
├── stripe/
│   ├── create-account/route.ts           # Create Stripe Connect account
│   ├── create-payment-intent/route.ts    # Create payment
│   └── webhook/route.ts                  # Stripe webhook handler
└── payments/
    └── commission-split/route.ts         # Commission calculation

Database:
- tools/database/migrations/016_create_payments_table.sql
- tools/database/migrations/118_add_commission_splits.sql
```

---

### 8. Messages (WhatsApp-style)

**Description**: WhatsApp-style messaging with Ably real-time platform (typing indicators, presence, delivery status)

**User Flow**:
- `/messages` → Inbox
- `/messages/[conversationId]` → Chat thread

**File Locations**:
```
apps/web/src/app/(admin)/
└── messages/
    ├── page.tsx                          # Inbox list
    └── [conversationId]/page.tsx         # Chat thread

Components:
apps/web/src/app/components/feature/messages/
├── MessageInbox.tsx
├── ConversationList.tsx
├── ChatThread.tsx
├── MessageInput.tsx
├── TypingIndicator.tsx
├── DeliveryStatus.tsx
└── FileAttachment.tsx

Real-time:
apps/web/src/lib/ably/
├── useAblyChannel.ts                     # Ably React hook
├── usePresence.ts                        # Online/offline status
└── useTypingIndicator.ts                 # Typing detection

Database:
- tools/database/migrations/103_create_chat_messages_table.sql
- tools/database/migrations/156_add_message_delivery_status.sql
```

**Integration**: Uses Ably for real-time features, Supabase for message persistence

---

### 9. Network & Connections

**Description**: Connection management with trust graph, network building tools

**User Flow**:
- `/network` → My connections
- `/network/groups` → Connection groups
- `/network/trust-graph` → Trust visualization

**File Locations**:
```
apps/web/src/app/(admin)/
└── network/
    ├── page.tsx                          # Connections list
    ├── groups/page.tsx                   # Connection groups
    └── trust-graph/page.tsx              # Trust graph viz

Components:
apps/web/src/app/components/feature/network/
├── ConnectionCard.tsx
├── ConnectionGroups.tsx
├── TrustGraphViz.tsx
└── PresenceIndicator.tsx                 # Online/offline (via Ably)

Database:
- tools/database/migrations/088_create_connections_table.sql
- tools/database/migrations/140_add_trust_graph_scoring.sql
```

---

### 10. Wiselists (My Saves)

**Description**: Collaborative lists with sharing functionality

**User Flow**:
- `/wiselists` → My saved lists
- `/wiselists/[id]` → List details

**File Locations**:
```
apps/web/src/app/(admin)/
└── wiselists/
    ├── page.tsx                          # Lists dashboard
    └── [id]/page.tsx                     # List details

Components:
apps/web/src/app/components/feature/wiselists/
├── WiselistCard.tsx
├── SaveButton.tsx
└── ShareModal.tsx

Database:
- tools/database/migrations/098_create_saved_listings_table.sql
- tools/database/migrations/099_create_wiselists_table.sql
```

---

### 11. WiseSpace (Virtual Classroom)

**Description**: Hybrid virtual classroom with tldraw whiteboard + Google Meet

**User Flow**:
- `/wisespace/[sessionId]` → Join virtual classroom

**File Locations**:
```
apps/web/src/app/(admin)/
└── wisespace/
    └── [sessionId]/page.tsx              # Virtual classroom

Components:
apps/web/src/app/components/feature/wisespace/
├── WhiteboardCanvas.tsx                  # tldraw integration
├── VideoCall.tsx                         # Google Meet embed
├── FileShare.tsx
└── SessionRecording.tsx

Database:
- tools/database/migrations/145_create_wisespace_sessions_table.sql
```

---

### 12. Reviews & Ratings

**Description**: Mutual review system with moderation

**User Flow**:
- `/reviews` → My reviews (given & received)
- `/reviews/write/[bookingId]` → Write review

**File Locations**:
```
apps/web/src/app/(admin)/
└── reviews/
    ├── page.tsx                          # Reviews dashboard
    └── write/[bookingId]/page.tsx        # Write review form

Components:
apps/web/src/app/components/feature/reviews/
├── ReviewCard.tsx
├── StarRating.tsx
├── ReviewForm.tsx
└── ModerationFlag.tsx

Database:
- tools/database/migrations/091_create_reviews_table.sql
- tools/database/migrations/141_add_reviews_metrics.sql
```

---

### 13. CaaS (Credibility as a Service)

**Description**: Multi-role credibility scoring (Tutor v5.9, Client v1.0, Agent v1.0, Organisation v1.0)

**User Flow**:
- `/dashboard` → View your CaaS score card
- `/caas/breakdown` → Detailed score breakdown

**File Locations**:
```
apps/web/src/app/(admin)/
└── caas/
    └── breakdown/page.tsx                # Score breakdown

Components:
apps/web/src/app/components/feature/caas/
├── CaaSScoreCard.tsx
├── ScoreBreakdown.tsx
├── ProgressBar.tsx
└── CredibilityBadge.tsx

Services (Dual-Path Architecture):
apps/web/src/lib/services/caas/
├── CaaSService.ts                        # Main service (dual-path router)
├── strategies/
│   ├── profile/                          # Profile-based scoring
│   │   ├── TutorCaaSStrategy.ts          # Tutor scoring (v5.9)
│   │   ├── ClientCaaSStrategy.ts         # Client scoring (v1.0)
│   │   └── AgentCaaSStrategy.ts          # Agent scoring (v1.0)
│   └── entity/                           # Entity-based scoring
│       └── OrganisationCaaSStrategy.ts   # Organisation scoring (v1.0)
└── interfaces/
    ├── IBaseCaaSStrategy.ts
    ├── IProfileCaaSStrategy.ts
    └── IEntityCaaSStrategy.ts

Database:
- tools/database/migrations/074_create_caas_scores_table.sql
- tools/database/migrations/155_create_agent_caas_tables.sql
- tools/database/migrations/158_create_organisation_caas_tables.sql
- tools/database/migrations/173_add_public_agent_caas_policy.sql

Help Centre Content:
- apps/web/src/content/help-centre/features/caas.mdx
```

**Related Docs**:
- Architecture: [caas-dual-path-architecture.md](../docs/feature/caas/caas-dual-path-architecture.md)
- Agent Model: [agent-caas-subscription-incentive-model.md](../docs/features/caas/agent-caas-subscription-incentive-model.md)
- Organisation: [agent-org-caas-implementation-summary.md](../docs/features/caas/agent-org-caas-implementation-summary.md)

**Key Concepts**:
- **Profile-based**: Tutor, Client, Agent (scores stored in `caas_scores` table)
- **Entity-based**: Organisation, Team, Group (scores stored in entity's own table)

---

### 14. Referrals System

**Description**: Multi-tier attribution system with QR codes, gamification, commission delegation (patent-protected)

**User Flow**:
- `/referral-activities` → Track referral links
- `/referrals/qr` → Generate QR codes

**File Locations**:
```
apps/web/src/app/(admin)/
└── referral-activities/
    └── page.tsx                          # Referral dashboard

Components:
apps/web/src/app/components/feature/referrals/
├── ReferralStats.tsx
├── QRCodeGenerator.tsx
├── CommissionTracker.tsx
└── FraudDetection.tsx

API Routes:
apps/web/src/app/api/referrals/
├── create-link/route.ts                  # Create referral link
├── track-click/route.ts                  # HMAC cookie signing
└── generate-qr/route.ts                  # QR code generation

Database:
- tools/database/migrations/069_create_referral_system_tables.sql
- tools/database/migrations/150_add_multi_tier_referral_infrastructure.sql
- tools/database/migrations/152_add_referral_fraud_detection.sql
```

**Related Docs**:
- [referrals-solution-design-v2.md](../docs/feature/referrals/referrals-solution-design-v2.md)
- [DEPLOYMENT-GUIDE.md](../docs/feature/referrals/DEPLOYMENT-GUIDE.md)
- [MULTI_TIER_DECISION_RATIONALE.md](../docs/feature/referrals/MULTI_TIER_DECISION_RATIONALE.md)

---

### 15. Organisations & Teams

**Description**: Team management, subscriptions (Starter £49/mo, Pro £99/mo), task management, recruitment

**User Flow**:
- `/organisations` → My organisations
- `/organisations/[id]` → Organisation dashboard
- `/organisations/[id]/team` → Team members
- `/organisations/[id]/tasks` → Task Kanban board
- `/organisations/[id]/recruitment` → Recruitment pipeline

**File Locations**:
```
apps/web/src/app/(admin)/
└── organisations/
    ├── page.tsx                          # Organisations list
    └── [id]/
        ├── page.tsx                      # Organisation dashboard
        ├── team/page.tsx                 # Team members
        ├── tasks/page.tsx                # Task Kanban (5 stages)
        ├── recruitment/page.tsx          # Recruitment pipeline
        └── settings/page.tsx             # Subscription & settings

Components:
apps/web/src/app/components/feature/organisations/
├── OrganisationCard.tsx
├── TeamMemberList.tsx
├── TaskKanban.tsx                        # 5-stage pipeline
├── RecruitmentPipeline.tsx
├── SubscriptionCard.tsx
└── BillingManagement.tsx                 # Stripe integration

Database:
- tools/database/migrations/095_create_connection_groups_table.sql
- tools/database/migrations/146_add_organisation_subscriptions.sql
- tools/database/migrations/147_add_organisation_tasks.sql
- tools/database/migrations/158_create_organisation_caas_tables.sql
```

---

### 16. Developer Tools

**Description**: API key management, webhooks, integrations

**User Flow**:
- `/developer/api-keys` → Manage API keys
- `/developer/webhooks` → Configure webhooks

**File Locations**:
```
apps/web/src/app/(admin)/
└── developer/
    ├── api-keys/page.tsx                 # API key management
    └── webhooks/page.tsx                 # Webhook configuration

Database:
- tools/database/migrations/164_create_api_keys_table.sql
```

---

### 17. Help Centre

**Description**: In-app bug reporting with Jira Service Desk integration

**User Flow**:
- `/help-centre` → Browse help articles
- `/help-centre/contact` → Submit bug report

**File Locations**:
```
apps/web/src/app/(admin)/
└── help-centre/
    ├── page.tsx                          # Help centre home
    ├── [category]/[article]/page.tsx     # Article viewer
    └── contact/page.tsx                  # Bug report form

Content (MDX):
apps/web/src/content/help-centre/
├── getting-started/
│   ├── for-tutors.mdx
│   ├── for-clients.mdx
│   └── for-agents.mdx
└── features/
    ├── caas.mdx
    ├── listings.mdx
    ├── bookings.mdx
    └── organisations.mdx

API Routes:
apps/web/src/app/api/jira/
└── create-ticket/route.ts                # Jira Service Desk integration

Database:
- tools/database/migrations/165_create_help_tickets_table.sql
```

**Related Docs**:
- [IMPLEMENTATION-COMPLETE.md](../docs/feature/help-centre/IMPLEMENTATION-COMPLETE.md)
- [service-desk-integration.md](../docs/feature/help-centre/service-desk-integration.md)

---

### 18. Resources-to-Marketplace Demand Engine

**Description**: Event-based attribution system tracking resources → marketplace conversions (Phase 1-3 complete, Blog→Resources migration complete 2026-01-18)

**User Flow**:
- `/resources` → Browse articles
- `/resources/[slug]` → Read article with embedded marketplace content
- Click embed → Track attribution → Book/Save → Record conversion
- `/admin/signal` → View Revenue Signal Analytics (Phase 3 - live)

**File Locations**:
```
apps/web/src/app/
├── resources/
│   ├── page.tsx                          # Resources index (live)
│   ├── [slug]/page.tsx                   # Article detail (live)
│   ├── category/[category]/page.tsx      # Category pages (live)
│   └── layout.tsx                        # Resources layout with sidebars
├── (admin)/admin/resources/
│   ├── page.tsx                          # All articles management
│   ├── new/page.tsx                      # Create new article
│   ├── seo/page.tsx                      # SEO performance dashboard
│   ├── categories/page.tsx               # Category management
│   └── settings/page.tsx                 # Settings
└── api/resources/
    ├── attribution/
    │   ├── route.ts                      # Dual-write conversions
    │   └── events/route.ts               # Event recording
    ├── articles/route.ts                 # Article CRUD
    └── saves/route.ts                    # Article saves

Components:
apps/web/src/app/components/resources/
├── embeds/
│   ├── TutorEmbed.tsx                    # Embed tutor profiles in MDX
│   ├── ListingGrid.tsx                   # Embed marketplace listings
│   ├── TutorCarousel.tsx                 # Swipeable tutor carousel
│   └── useBlogAttribution.ts             # Attribution tracking hook
└── SaveArticleButton.tsx                 # Save articles to wiselists

Utilities:
apps/web/src/lib/utils/
├── sessionTracking.ts                    # 30-day cookie-based sessions
└── embedInstanceId.ts                    # Stable hash-based embed IDs

Database:
- tools/database/migrations/179-181_create_signal_events_infrastructure.sql
- tools/database/migrations/182_create_blog_orchestrator_rpcs.sql (now references resource_* tables)
- tools/database/migrations/191_rename_blog_to_resources.sql (Blog→Resources migration, applied 2026-01-18)
- tools/database/migrations/192_update_rbac_permissions_for_resources.sql (RBAC alignment)
- tools/database/migrations/187_update_rpcs_for_signal_events.sql
- tools/database/migrations/189_add_blog_orchestrator_permissions.sql
- tools/database/migrations/190_add_signal_rbac_permissions.sql
```

**Related Docs**:
- [docs/feature/revenue-signal/REVENUE-SIGNAL.md](../docs/feature/revenue-signal/REVENUE-SIGNAL.md) - Complete specification
- [docs/feature/revenue-signal/SIGNAL-ROUTE-MIGRATION.md](../docs/feature/revenue-signal/SIGNAL-ROUTE-MIGRATION.md) - Route migration details

**Key Concepts**:
- **Event-based attribution**: Immutable event stream as source of truth
- **Dual-write pattern**: Events (truth) + cache fields (performance)
- **Session tracking**: 30-day cookie persistence across login/logout
- **Privacy-first**: Article saves private by default (opt-in sharing)
- **Multi-touch attribution**: Query-time, descriptive (Phase 3 observation only)

---

### 19. Admin Dashboard (11 Hubs)

**Description**: Complete admin system with RBAC (Super Admin, Admin, System Admin, Support Admin), audit logging, soft/hard delete

**User Flow**: `/admin` → Select hub → Manage resources

**File Locations**:
```
apps/web/src/app/(admin)/admin/
├── page.tsx                              # Admin home (hub grid)
├── accounts/                             # Accounts Hub
│   ├── page.tsx                          # Account management
│   └── [id]/
│       ├── soft-delete/route.ts
│       └── hard-delete/route.ts
├── bookings/                             # Bookings Hub
├── configurations/                        # Configurations Hub
│   └── shared-fields/page.tsx            # Shared fields management
├── financials/                           # Financials Hub
├── listings/                             # Listings Hub
├── organisations/                        # Organisations Hub
├── referrals/                            # Referrals Hub
├── reviews/                              # Reviews Hub
├── seo/                                  # SEO Hub
│   ├── hub-management/page.tsx
│   ├── trust-graph/page.tsx
│   └── eligibility/page.tsx
├── settings/                             # Settings Hub
│   ├── payments/page.tsx
│   ├── subscriptions/page.tsx
│   ├── security/page.tsx
│   └── integrations/page.tsx
└── users/                                # Users Hub

Components:
apps/web/src/app/components/admin/
├── sidebar/AdminSidebar.tsx              # Admin navigation
├── HubComplexModal.tsx                   # Reusable modal pattern
└── hubs/
    ├── AccountsHub.tsx
    ├── BookingsHub.tsx
    ├── ConfigurationsHub.tsx
    ├── FinancialsHub.tsx
    ├── ListingsHub.tsx
    ├── OrganisationsHub.tsx
    ├── ReferralsHub.tsx
    ├── ReviewsHub.tsx
    ├── SeoHub.tsx
    ├── SettingsHub.tsx
    └── UsersHub.tsx

Database:
- tools/database/migrations/124_create_admin_roles_table.sql
- tools/database/migrations/125_create_admin_action_logs_table.sql
- tools/database/migrations/126_add_soft_delete_system.sql
- tools/database/migrations/149_add_hard_delete_system.sql
```

**Related Docs**:
- [ADMIN-DASHBOARD.md](.ai/ADMIN-DASHBOARD.md) - Complete admin architecture

---

## User Journey Flows

### 🎓 Tutor Journey (Provider)

```
1. SIGNUP & AUTH
   /signup → Create account
   /login → Sign in

2. ONBOARDING (5 steps)
   /onboarding → Select "Tutor"
   /onboarding/tutor → Complete profile
   - Role Selection
   - Subject Selection
   - Professional Details
   - Availability
   - Review & Complete

3. DASHBOARD (First Visit)
   /dashboard → Welcome banner "🎉 Onboarding Complete!"
   Recommended Actions:
   - ⭐ Create First Listing (primary CTA)
   - 📋 My Listings
   - 🔍 Browse Marketplace
   - 👤 My Profile

4. CREATE FIRST LISTING
   /listings/create → Full listing wizard
   - Basic Info (title, description)
   - Teaching Details (subjects, levels, languages)
   - Specializations & Methods
   - Experience & Qualifications
   - Pricing (hourly rate, packages, free trial)
   - Location & Availability
   - Media (images, video)
   - Publish

5. MANAGE LISTINGS
   /listings → View all listings
   - Status indicators (draft/published/paused)
   - Performance metrics (views, inquiries, bookings)
   - Quick actions (edit, pause, delete)

6. RECEIVE BOOKINGS
   /bookings → View upcoming sessions
   /messages → Communicate with students
   /wisespace/[sessionId] → Virtual classroom

7. TRACK EARNINGS
   /financials → Earnings dashboard
   /transaction-history → View payments
```

**Key Files**:
- Onboarding: `apps/web/src/app/(admin)/onboarding/tutor/`
- Listings: `apps/web/src/app/(admin)/listings/`
- Dashboard: `apps/web/src/app/(admin)/dashboard/page.tsx`

---

### 📚 Client Journey (Student)

```
1. SIGNUP & AUTH
   /signup → Create account
   /login → Sign in

2. ONBOARDING (5 steps)
   /onboarding → Select "Client"
   /onboarding/client → Complete profile
   - Role Selection
   - Subject Interests
   - Learning Goals
   - Budget & Availability
   - Review & Complete

3. DASHBOARD (First Visit)
   /dashboard → "Find the perfect tutor!"
   Recommended Actions:
   - ⭐ Find Tutors (primary CTA)
   - 📅 My Bookings
   - 👤 My Profile

4. BROWSE MARKETPLACE
   /marketplace → Search & filter tutors
   - Subject filters
   - Level filters
   - Location type (online/in-person)
   - Price range
   - Sort by (newest, price, rating)

5. VIEW TUTOR DETAILS
   /marketplace/[id] → Full tutor profile
   - About section
   - Subjects & levels taught
   - Pricing & packages
   - Availability
   - Reviews & ratings
   - CTAs: "Book a Lesson" or "Send Message"

6. BOOK & COMMUNICATE
   /bookings → Manage sessions
   /messages → Chat with tutor
   /wisespace/[sessionId] → Join virtual classroom

7. LEAVE REVIEWS
   /reviews/write/[bookingId] → Write review
```

**Key Files**:
- Onboarding: `apps/web/src/app/(admin)/onboarding/client/`
- Marketplace: `apps/web/src/app/(admin)/marketplace/`
- Bookings: `apps/web/src/app/(admin)/bookings/`

---

### 🏠 Agent Journey (Recruiter)

```
1. SIGNUP & AUTH
   /signup → Create account
   /login → Sign in

2. ONBOARDING (5 steps)
   /onboarding → Select "Agent"
   /onboarding/agent → Complete profile
   - Role Selection
   - Agency Information
   - Service Areas
   - Commission Structure
   - Review & Complete

3. DASHBOARD
   /dashboard → Agent dashboard
   - 📊 Referral Stats
   - 💰 Earnings Tracker
   - 👥 Recruited Tutors
   - 🏢 My Organisations (if any)

4. CREATE ORGANISATION (Optional)
   /organisations/create → Create team
   - Organisation details
   - Subscription selection (Starter £49/mo, Pro £99/mo)
   - Stripe payment setup

5. RECRUIT TUTORS
   /referral-activities → Generate referral links
   /referrals/qr → Generate QR codes
   /organisations/[id]/recruitment → Manage recruitment pipeline

6. MANAGE TEAM
   /organisations/[id]/team → Team members
   /organisations/[id]/tasks → Task Kanban board
   /messages → Communicate with team

7. TRACK EARNINGS
   /financials → Commission earnings
   /transaction-history → View payouts
```

**Key Files**:
- Onboarding: `apps/web/src/app/(admin)/onboarding/agent/`
- Organisations: `apps/web/src/app/(admin)/organisations/`
- Referrals: `apps/web/src/app/(admin)/referral-activities/`

---

## Codebase Structure

### Platform Metrics Summary

```
📊 Codebase Statistics:
├── 148,000 lines of TypeScript/TSX code
├── 180,000 lines of documentation (16K AI context + 164K features)
├── 29,000 lines of SQL (196 migrations)
├── 267 pages (111 UI + 144 API + dynamic routes)
├── 353 components (22 feature components + UI library)
├── 144 API endpoints
└── 31 major features
```

### Complete Directory Tree

```
tutorwise/
├── .ai/                                   # AI context files (START HERE)
│   │                                      # 16,310 lines of documentation
│   ├── 1 - ROADMAP.md                     # 670 lines - 98% complete, 31 features
│   ├── 2 - PLATFORM-SPECIFICATION.md      # 3,194 lines - Complete tech spec
│   ├── 3 - SYSTEM-NAVIGATION.md           # This file - Complete navigation
│   ├── 4 - PATTERNS.md                    # Code conventions & standards
│   ├── 5 - CONTEXT-MAP.md                 # Context interconnections
│   ├── 6 - DESIGN-SYSTEM.md               # UI/UX component library
│   ├── 7 - PROMPT.md                      # AI configuration
│   ├── ADMIN-DASHBOARD.md                 # 11 admin hubs architecture
│   ├── SHARED-FIELDS.md                   # 23 global fields, 106 mappings
│   ├── ONBOARDING.md                      # Page-based onboarding (3 roles)
│   └── RESOURCES-REVENUE-SIGNAL.md                        # Resources attribution system (Phases 1-3, Blog→Resources migration complete 2026-01-18)
│
├── apps/
│   └── web/                               # Next.js 14.x frontend (148K lines)
│       ├── src/
│       │   ├── app/                       # App Router (118K lines)
│       │   │   │                          # 107 UI pages + 141 API endpoints
│       │   │   ├── (auth)/                # Authentication routes (4 pages)
│       │   │   │   ├── login/
│       │   │   │   ├── signup/
│       │   │   │   └── auth/callback/
│       │   │   ├── (dashboard)/           # Protected routes (30 pages)
│       │   │   │   ├── dashboard/         # Main dashboard (role-specific)
│       │   │   │   ├── onboarding/        # 3 role flows (16 pages)
│       │   │   │   ├── account/           # Account settings (6 pages)
│       │   │   │   ├── bookings/          # Session management
│       │   │   │   ├── messages/          # WhatsApp-style chat
│       │   │   │   ├── network/           # Connections
│       │   │   │   ├── wiselists/         # Saved lists
│       │   │   │   ├── wisespace/         # Virtual classroom
│       │   │   │   ├── reviews/           # Reviews system
│       │   │   │   ├── financials/        # Earnings (3 pages)
│       │   │   │   ├── payments/          # Stripe
│       │   │   │   ├── organisations/     # Team management (5 pages)
│       │   │   │   ├── developer/         # API keys
│       │   │   │   └── help-centre/       # Help articles
│       │   │   ├── (admin)/               # Admin panel (34 pages)
│       │   │   │   ├── admin/             # 13 admin hubs
│       │   │   │   │   ├── accounts/      # Accounts hub
│       │   │   │   │   ├── bookings/      # Bookings hub
│       │   │   │   │   ├── listings/      # Listings hub
│       │   │   │   │   ├── organisations/ # Orgs hub
│       │   │   │   │   ├── reviews/       # Reviews hub
│       │   │   │   │   ├── referrals/     # Referrals hub
│       │   │   │   │   ├── configurations/# Config hub
│       │   │   │   │   ├── financials/    # Financials hub (3 pages)
│       │   │   │   │   ├── seo/           # SEO hub (11 pages)
│       │   │   │   │   └── settings/      # Settings hub (6 pages)
│       │   │   ├── api/                   # API routes (141 endpoints)
│       │   │   │   ├── admin/             # Admin APIs (23)
│       │   │   │   ├── marketplace/       # Marketplace APIs (17)
│       │   │   │   ├── bookings/          # Booking APIs (4)
│       │   │   │   ├── reviews/           # Review APIs (5)
│       │   │   │   ├── referrals/         # Referral APIs (8)
│       │   │   │   ├── network/           # Network APIs (13)
│       │   │   │   ├── stripe/            # Stripe APIs (14)
│       │   │   │   ├── organisation/      # Org APIs (9)
│       │   │   │   ├── dashboard/         # Dashboard APIs (7)
│       │   │   │   ├── caas/              # CaaS APIs (6)
│       │   │   │   ├── wiselists/         # Wiselist APIs (10)
│       │   │   │   ├── wisespace/         # WiseSpace APIs (2)
│       │   │   │   ├── financials/        # Financial APIs (5)
│       │   │   │   └── [other APIs]       # Remaining endpoints
│       │   │   ├── proxy.ts               # Next.js proxy - redirects/rewrites (Next.js 16)
│       │   │   └── layout.tsx             # Root layout
│       │   ├── components/                # 353 components (5.4K lines)
│       │   │   └── feature/               # 22 feature component directories
│       │   │       ├── onboarding/        # Onboarding components
│       │   │       ├── listings/          # Listing components
│       │   │       ├── marketplace/       # Marketplace components
│       │   │       ├── bookings/          # Booking components
│       │   │       ├── messages/          # Message components
│       │   │       ├── network/           # Network components
│       │   │       ├── wiselists/         # Wiselist components
│       │   │       ├── wisespace/         # WiseSpace components
│       │   │       ├── reviews/           # Review components
│       │   │       ├── caas/              # CaaS components
│       │   │       ├── referrals/         # Referral components
│       │   │       ├── organisations/     # Organisation components
│       │   │       └── public-organisation-profile/ # Public org profile
│       │   │   # Note: Components organized by feature, not admin/ui split
│       │   ├── lib/                       # Core utilities (75 files, ~15K lines)
│       │   │   ├── services/              # Business logic services
│       │   │   │   ├── onboarding.ts      # Onboarding state management
│       │   │   │   ├── listings.ts        # Listing operations
│       │   │   │   ├── marketplace.ts     # Search & discovery
│       │   │   │   ├── matchScoring.ts    # Match algorithm
│       │   │   │   ├── recommendations.ts # AI recommendations
│       │   │   │   ├── savedSearches.ts   # Saved search logic
│       │   │   │   └── caas/              # CaaS dual-path architecture
│       │   │   │       ├── CaaSService.ts # Main CaaS service
│       │   │   │       ├── strategies/    # Strategy pattern
│       │   │   │       │   ├── profile/   # Profile-based CaaS
│       │   │   │       │   └── entity/    # Entity-based CaaS
│       │   │   │       └── interfaces/    # TypeScript interfaces
│       │   │   ├── api/                   # API client functions
│       │   │   │   ├── sharedFields.ts    # Shared fields API
│       │   │   │   ├── formConfig.ts      # Form configuration API
│       │   │   │   └── [other APIs]       # Additional API clients
│       │   │   ├── hooks/                 # React custom hooks
│       │   │   │   ├── useProfile.ts      # Profile management
│       │   │   │   ├── useBookings.ts     # Booking operations
│       │   │   │   └── [other hooks]      # Additional hooks
│       │   │   ├── ably/                  # Real-time messaging (Ably)
│       │   │   │   ├── useAblyChannel.ts  # Channel subscriptions
│       │   │   │   ├── usePresence.ts     # Presence tracking
│       │   │   │   └── useTypingIndicator.ts # Typing indicators
│       │   │   ├── supabase/              # Supabase client
│       │   │   │   ├── client.ts          # Client-side Supabase
│       │   │   │   └── server.ts          # Server-side Supabase
│       │   │   └── utils/                 # Utility functions
│       │   ├── types/                     # TypeScript type definitions
│       │   │   ├── listing-v4.1.ts        # Listing types (unified)
│       │   │   ├── shared-fields.ts       # Shared fields types
│       │   │   ├── profile.ts             # Profile types
│       │   │   └── [other types]          # Additional type definitions
│       │   └── content/                   # MDX content files
│       │       └── help-centre/           # Help centre articles (MDX)
│       │           ├── getting-started/
│       │           └── features/
│       └── public/                        # Static assets
│
├── packages/
│   └── shared-types/                      # Shared TypeScript types
│       └── src/
│           ├── listing.ts
│           ├── profile.ts
│           └── caas.ts
│
├── tools/
│   └── database/
│       └── migrations/                    # 192 SQL migrations
│           ├── 001_create_profiles_table.sql
│           ├── 002_create_listings_table_simplified.sql
│           ├── 074_create_caas_scores_table.sql
│           ├── 155_create_agent_caas_tables.sql
│           ├── 158_create_organisation_caas_tables.sql
│           ├── 170_create_shared_fields_tables.sql
│           └── ...
│
├── docs/                                  # Documentation
│   ├── development/                       # Dev guides
│   │   ├── environment-setup.md
│   │   ├── DEVELOPMENT-WORKFLOW.md
│   │   └── quick-start-guide.md
│   ├── features/                          # Feature docs
│   │   ├── caas/                          # CaaS documentation
│   │   │   ├── agent-caas-subscription-incentive-model.md
│   │   │   └── agent-org-caas-implementation-summary.md
│   │   └── dashboard/                     # Dashboard docs
│   │       └── role-based-dashboard-design.md
│   ├── feature/                           # Legacy feature docs
│   │   ├── caas/
│   │   │   └── caas-dual-path-architecture.md
│   │   ├── referrals/
│   │   │   ├── referrals-solution-design-v2.md
│   │   │   ├── DEPLOYMENT-GUIDE.md
│   │   │   └── MULTI_TIER_DECISION_RATIONALE.md
│   │   └── help-centre/
│   │       ├── IMPLEMENTATION-COMPLETE.md
│   │       └── service-desk-integration.md
│   ├── seo/                               # SEO documentation
│   │   ├── seo-implementation-complete.md
│   │   └── seo-top5-implementation-plan.md
│   ├── admin/                             # Admin hub docs
│   ├── database/                          # Database docs
│   │   └── migration-notes.md
│   ├── security/                          # Security docs
│   │   └── credential-backup-guide.md
│   ├── testing/                           # Testing docs
│   ├── deployment/                        # Deployment docs
│   ├── infrastructure/                    # Infrastructure docs
│   ├── project-management/                # PM docs
│   ├── design/                            # Design docs
│   │   ├── system-map.md                  # (Outdated - use .ai/SYSTEM-NAVIGATION.md)
│   │   └── README.md
│   ├── USER-JOURNEY-MAP.md                # User flows
│   └── FORMS_ADMIN_GUIDE.md               # Forms system guide
│
├── cas/                                   # CAS Framework (optional)
│   ├── agents/                            # Agent documentation
│   │   ├── planner/
│   │   ├── analyst/
│   │   ├── tester/
│   │   └── qa/
│   └── docs/
│       └── feature-development-checklist.md
│
├── package.json                           # Monorepo root
├── tsconfig.json                          # TypeScript config
├── README.md                              # Project README
└── vercel.json                            # Deployment config
```

---

## "I Want To..." Quick Reference

### Development Tasks

| I want to... | Go to... |
|-------------|----------|
| Understand what's built | [ROADMAP.md](.ai/ROADMAP.md) |
| See complete architecture | [PLATFORM-SPECIFICATION.md](.ai/PLATFORM-SPECIFICATION.md) |
| Find where code lives | This file |
| Learn code patterns | [PATTERNS.md](.ai/PATTERNS.md) |
| Set up local environment | [environment-setup.md](../docs/development/environment-setup.md) |
| Run the project | `npm run dev` (see [README.md](../README.md#quick-start)) |
| Run database migrations | `tools/database/migrations/` + Supabase dashboard |
| Add a new feature | [feature-development-checklist.md](../cas/docs/feature-development-checklist.md) |
| Write tests | [Testing Docs](../docs/testing/) |
| Deploy | [Deployment Docs](../docs/deployment/) |

### Feature Development

| I want to... | Go to... |
|-------------|----------|
| Add authentication | `apps/web/src/app/(auth)/` |
| Modify onboarding | `apps/web/src/app/(admin)/onboarding/` + [ONBOARDING.md](.ai/ONBOARDING.md) |
| Work on listings | `apps/web/src/app/(admin)/listings/` + [SHARED-FIELDS.md](.ai/SHARED-FIELDS.md) |
| Update marketplace | `apps/web/src/app/(admin)/marketplace/` |
| Add messaging features | `apps/web/src/app/(admin)/messages/` + `apps/web/src/lib/ably/` |
| Modify CaaS scoring | `apps/web/src/lib/services/caas/` + [caas-dual-path-architecture.md](../docs/feature/caas/caas-dual-path-architecture.md) |
| Work on resources attribution | `apps/web/src/app/components/resources/` + [RESOURCES-REVENUE-SIGNAL.md](.ai/RESOURCES-REVENUE-SIGNAL.md) |
| Work on admin dashboard | `apps/web/src/app/(admin)/admin/` + [ADMIN-DASHBOARD.md](.ai/ADMIN-DASHBOARD.md) |
| Update referrals | `apps/web/src/app/(admin)/referral-activities/` + [referrals docs](../docs/feature/referrals/) |
| Modify organisations | `apps/web/src/app/(admin)/organisations/` |
| Add help articles | `apps/web/src/content/help-centre/` (MDX files) |

### UI/UX Development

| I want to... | Go to... |
|-------------|----------|
| Use design system | [DESIGN-SYSTEM.md](.ai/DESIGN-SYSTEM.md) |
| Find UI components | `apps/web/src/app/components/` |
| See component library | Run Storybook: `npm run storybook` |
| Update styles | Tailwind CSS + CSS Modules (`.module.css` files) |
| Add new page | `apps/web/src/app/(admin)/[feature]/page.tsx` |
| Create modal | Use `HubComplexModal.tsx` pattern |

### Database

| I want to... | Go to... |
|-------------|----------|
| See database schema | `tools/database/migrations/` (192 migrations) |
| Add new table | Create new migration: `NNN_create_[table]_table.sql` |
| Modify table | Create new migration: `NNN_alter_[table]_[change].sql` |
| Query data | Supabase client: `apps/web/src/lib/supabase/` |
| View data | Supabase Dashboard (cloud) |

### Integrations

| I want to... | Go to... |
|-------------|----------|
| Work with Stripe | `apps/web/src/app/api/stripe/` |
| Modify Ably real-time | `apps/web/src/lib/ably/` |
| Update Jira integration | `apps/web/src/app/api/jira/` |
| Add webhook | `apps/web/src/app/api/[service]/webhook/route.ts` |

---

## Architecture References

### Key Architectural Documents

| Document | Purpose | Location |
|----------|---------|----------|
| **Dual-Path CaaS** | Profile vs Entity scoring | [caas-dual-path-architecture.md](../docs/feature/caas/caas-dual-path-architecture.md) |
| **Role-Based Dashboard** | Dashboard design patterns | [role-based-dashboard-design.md](../docs/features/dashboard/role-based-dashboard-design.md) |
| **Shared Fields System** | 23 global fields architecture | [SHARED-FIELDS.md](.ai/SHARED-FIELDS.md) |
| **Admin Dashboard** | 11 hubs with HubComplexModal | [ADMIN-DASHBOARD.md](.ai/ADMIN-DASHBOARD.md) |
| **Onboarding System** | Page-based routing | [ONBOARDING.md](.ai/ONBOARDING.md) |
| **Referrals System** | Multi-tier attribution | [referrals-solution-design-v2.md](../docs/feature/referrals/referrals-solution-design-v2.md) |
| **Resources Attribution** | Event-based demand engine | [RESOURCES-REVENUE-SIGNAL.md](.ai/RESOURCES-REVENUE-SIGNAL.md) |
| **Design System** | UI component library | [DESIGN-SYSTEM.md](.ai/DESIGN-SYSTEM.md) |

### Tech Stack Summary

**Frontend**:
- Next.js 14.x with App Router
- TypeScript 5.x (strict mode)
- React 18 with Server Components
- Tailwind CSS + CSS Modules
- React Query (TanStack Query)

**Backend & Data**:
- Supabase PostgreSQL (192 migrations)
- Supabase Auth (multi-role)
- Ably (real-time messaging, presence, typing)
- Stripe Connect (payments, commissions)

**Admin**:
- Custom dashboard (11 hubs)
- RBAC (4 admin roles)
- Audit logging
- Soft/hard delete with GDPR compliance

### Integration Points

```
Frontend (Next.js)
    ↓ API Routes
    ├→ Supabase (PostgreSQL, Auth, Storage)
    ├→ Ably (Real-time messaging, presence)
    ├→ Stripe (Payments, Connect, webhooks)
    └→ Jira (Service Desk tickets)
```

---

## Related Documentation

### Essential Reading Order

1. **[ROADMAP.md](.ai/ROADMAP.md)** - Start here (98% complete, 18 features)
2. **[PLATFORM-SPECIFICATION.md](.ai/PLATFORM-SPECIFICATION.md)** - Complete tech spec
3. **This file** - Navigate the codebase
4. **[PATTERNS.md](.ai/PATTERNS.md)** - Code conventions
5. **[DESIGN-SYSTEM.md](.ai/DESIGN-SYSTEM.md)** - UI components

### User Flows

- **[USER-JOURNEY-MAP.md](../docs/USER-JOURNEY-MAP.md)** - Complete user flows by role

### Developer Resources

- **[environment-setup.md](../docs/development/environment-setup.md)** - Local setup
- **[DEVELOPMENT-WORKFLOW.md](../docs/development/DEVELOPMENT-WORKFLOW.md)** - Daily workflow
- **[quick-start-guide.md](../docs/development/quick-start-guide.md)** - New dev onboarding

### Admin Resources

- **[ADMIN-DASHBOARD.md](.ai/ADMIN-DASHBOARD.md)** - 11 hubs architecture
- **[FORMS_ADMIN_GUIDE.md](../docs/FORMS_ADMIN_GUIDE.md)** - Forms & shared fields

---

**Need help?**
- Check [CONTEXT-MAP.md](.ai/CONTEXT-MAP.md) for documentation structure
- See [README.md](../README.md) for quick commands
- Read [PLATFORM-SPECIFICATION.md](.ai/PLATFORM-SPECIFICATION.md) for detailed architecture

