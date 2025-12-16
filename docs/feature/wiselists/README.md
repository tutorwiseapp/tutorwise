# Wiselists - Save & Share Growth Engine

**Status**: ✅ Production (~80-90% Complete)
**Version**: 1.0
**Owner**: Growth Team
**Last Updated**: 2025-12-14

---

## Quick Links

- [Solution Design v2](./wiselists-solution-design-v2.md) - Complete architecture & business context
- [Implementation Guide v2](./wiselists-implementation-v2.md) - Developer patterns & how-tos
- [AI Prompt v2](./wiselists-prompt-v2.md) - Quick reference for AI assistants
- [~~IMPLEMENTATION_STATUS.md~~](./IMPLEMENTATION_STATUS.md) - ⚠️ **DEPRECATED** (outdated, see status below)

---

## What is Wiselists?

**Wiselists** is TutorWise's viral growth engine - an **Airbnb-style collections feature** that enables users to:

1. **Save & Organize**: Curate lists of tutors and listings ("Best Math Tutors London")
2. **Share Publicly**: Create sharable URLs (`/w/best-math-tutors`) that drive viral growth
3. **Earn Commissions**: Get 5% commission when someone books from your shared list
4. **Collaborate**: Invite friends to co-edit lists (Google Docs-style permissions)

### Three Growth Loops

**Loop 1: External Growth** (Viral Acquisition)
- User shares list → Friend clicks `/w/slug` → Friend must sign up to view → Referral credit awarded
- **Impact**: Creates viral acquisition loop through social sharing

**Loop 2: In-Network Sales** (Commission Engine)
- User shares list → Viewer books tutor → System tracks attribution → Creator earns £20 commission (example)
- **Impact**: Enables commission-based revenue sharing for list creators

**Loop 3: CaaS Data** (Search Ranking Boost)
- User saves tutor → Increments `total_saves` → CaaS recalculates score → Tutor ranks higher in search
- **Impact**: Improves search ranking for popular tutors based on save signals

---

## How to Navigate This Documentation

### 📖 For Product Managers (20-30 min read)

**Read in this order**:
1. This README (overview)
2. [Solution Design v2](./wiselists-solution-design-v2.md) sections:
   - Executive Summary
   - Business Context
   - Three Growth Loops (detailed)
   - Future Enhancements

**You'll learn**:
- Why we built wiselists (viral acquisition + attribution)
- Business impact (viral coefficient, commission revenue, search quality)
- Roadmap (analytics dashboard, social sharing, embedded widgets)

---

### 💻 For Backend Engineers (1-2 hour read)

**Read in this order**:
1. This README (overview)
2. [Solution Design v2](./wiselists-solution-design-v2.md) sections:
   - Architecture Overview
   - Database Design (all 4 tables)
   - Polymorphic Items Pattern (CRITICAL - understand this!)
   - Collaboration Model (OWNER/EDITOR/VIEWER roles)
   - RLS Policies
3. [Implementation Guide v2](./wiselists-implementation-v2.md) sections:
   - Architecture Patterns
   - How to Add a New Item Type
   - Common Pitfalls & Solutions

**You'll learn**:
- Database schema (3 tables + 1 FK column, 19 RLS policies)
- Service layer patterns (523 lines, 11 functions)
- API endpoints (6 REST routes)
- Integration points (Referrals, CaaS, Payments, Profile Graph)

---

### 🎨 For Frontend Engineers (45 min read)

**Read in this order**:
1. This README (overview)
2. [Implementation Guide v2](./wiselists-implementation-v2.md) sections:
   - Common Usage Patterns
   - UI Component Structure
   - localStorage Fallback (anonymous users)
3. [AI Prompt v2](./wiselists-prompt-v2.md) sections:
   - Quick Reference
   - DO's and DON'Ts

**You'll learn**:
- 10 UI components (WiselistCard, CreateModal, AddToWiselistModal, etc.)
- How to use service layer functions
- Anonymous user flow (localStorage → database migration on signup)

---

### 🤖 For AI Assistants (10-15 min read)

**Read**:
1. [AI Prompt v2](./wiselists-prompt-v2.md) - Complete quick reference

**You'll learn**:
- Service layer API (11 functions with input/output types)
- Database schema summary
- DO/DON'T code patterns
- File locations for all code

---

## Current Implementation Status

**Last Verified**: 2025-12-14 (via code analysis)
**Overall Completion**: **80-90%**

---

### ✅ Phase 1: Database Layer (100% Complete)

**Migrations** (4 files):
- `081_create_wiselists_table.sql` - Main wiselists table
- `082_create_wiselist_items_table.sql` - Polymorphic items (profiles + listings)
- `083_create_wiselist_collaborators_table.sql` - Multi-user editing
- `084_add_booking_referrer_to_bookings.sql` - Attribution tracking

**Database Objects**:
- 3 tables + 1 column addition (`bookings.booking_referrer_id`)
- 19 RLS policies (security + permissions)
- 19 indexes (performance optimization)
- 2 database triggers (save count, item count)

---

### ✅ Phase 2: TypeScript Types (100% Complete)

**File**: `apps/web/src/types/index.ts`

**Interfaces**:
- `Wiselist` - Main list entity
- `WiselistItem` - Polymorphic item (profile or listing)
- `WiselistCollaborator` - Role-based access
- `CreateWiselistInput` - Input validation
- `UpdateWiselistInput` - Partial updates
- `WiselistVisibility` - Enum (PRIVATE | PUBLIC)

---

### ✅ Phase 3: API Service Layer (100% Complete)

**File**: `apps/web/src/lib/api/wiselists.ts` (523 lines)

**Functions** (11 total):
- `getWiselists(userId)` - Fetch user's wiselists
- `getWiselistBySlug(slug)` - Fetch public wiselist
- `createWiselist(data)` - Create new wiselist
- `updateWiselist(id, data)` - Update wiselist
- `deleteWiselist(id)` - Delete wiselist
- `addItemToWiselist(wiselistId, item)` - Add tutor/listing
- `removeItemFromWiselist(wiselistId, itemId)` - Remove item
- `addCollaborator(wiselistId, email, role)` - Invite collaborator
- `removeCollaborator(wiselistId, collabId)` - Remove collaborator
- `getWiselistsFromLocalStorage()` - Anonymous user fallback
- `syncLocalStorageToDatabase(userId)` - Migrate on signup

**Key Features**:
- localStorage fallback for anonymous users (no login required)
- Polymorphic item handling (profiles AND listings)
- Collaboration invitation flow (pending → accepted)

---

### ✅ Phase 4: REST API Endpoints (100% Complete)

**Discovered via code analysis** (not documented in old status file):

**Files** (6 route handlers):
1. `apps/web/src/app/api/wiselists/route.ts`
   - GET: List user's wiselists
   - POST: Create new wiselist

2. `apps/web/src/app/api/wiselists/[id]/route.ts`
   - GET: Get single wiselist by ID
   - PATCH: Update wiselist
   - DELETE: Delete wiselist

3. `apps/web/src/app/api/wiselists/[id]/items/route.ts`
   - POST: Add item to wiselist

4. `apps/web/src/app/api/wiselists/[id]/items/[itemId]/route.ts`
   - DELETE: Remove item from wiselist

5. `apps/web/src/app/api/wiselists/[id]/collaborators/route.ts`
   - POST: Add collaborator (send invitation)

6. `apps/web/src/app/api/wiselists/[id]/collaborators/[collabId]/route.ts`
   - DELETE: Remove collaborator

**All endpoints follow RESTful conventions**

---

### ✅ Phase 5: UI Components (90% Complete)

**Discovered via code analysis** (not documented in old status file):

**Components** (10 files in `apps/web/src/app/components/feature/wiselists/`):

**Core Components**:
- `WiselistCard.tsx` - Display wiselist preview card
- `CreateWiselistModal.tsx` - Create new wiselist modal
- `AddToWiselistModal.tsx` - Add item to wiselist modal
- `WiselistSelectionModal.tsx` - Select wiselist for item

**Widgets** (Sidebar/Dashboard):
- `WiselistStatsWidget.tsx` - Show stats (views, bookings, commissions)
- `WiselistHelpWidget.tsx` - Onboarding help
- `WiselistTipWidget.tsx` - Growth tips ("Share your list to earn!")
- `WiselistVideoWidget.tsx` - Tutorial videos

**Action Components**:
- `WiselistShareButton.tsx` - Copy link, social sharing
- `WiselistCollaboratorList.tsx` - Manage collaborators

**Status**: Most components complete, missing public wiselist page UI

---

### 🔨 Phase 6: Pages (60% Complete)

**Completed**:
- ✅ Hub Page: `apps/web/src/app/(authenticated)/wiselists/page.tsx`
  - Lists all user's wiselists
  - "Create New Wiselist" button
  - Search/filter functionality

**In Progress**:
- 🚧 Public Wiselist Page: `apps/web/src/app/w/[slug]/page.tsx`
  - Displays wiselist items for viewers
  - Attribution tracking (middleware sets cookie)
  - Anonymous user teaser (blur items until signup)
  - **Status**: Page structure exists, needs UI polish

**Missing**:
- ❌ Wiselist Detail Page (authenticated): `/wiselists/[id]`
  - Full management UI for owners/editors
  - Collaborator management panel
  - Analytics dashboard integration

---

### 🚧 Phase 7: Integrations (70% Complete)

**Integration 1: Referrals v4.3** (✅ Complete)
- When user signs up via `/w/[slug]`, referral record created
- Creator earns £10 credit, new user gets £5 welcome credit
- **File**: `apps/web/src/lib/api/referrals.ts:createReferral()`

**Integration 2: CaaS v5.5** (✅ Complete)
- Database trigger increments `profiles.total_saves` on item add
- CaaS recalculation queued automatically
- "Total Saves" contributes to Network Trust score (max 10 points)
- **File**: `apps/api/caas/strategies/TutorCaaSStrategy.ts`

**Integration 3: Payments v4.9** (🚧 Partial)
- `bookings.booking_referrer_id` column added (✅)
- Attribution cookie tracking via middleware (✅)
- Commission calculation logic (🚧 needs testing)
- Payout queue integration (❌ not implemented)
- **Status**: Database ready, payout logic incomplete

**Integration 4: Profile Graph v4.6** (❌ Not Started)
- Goal: Show mutual connections on shared wiselists
- Example: "Created by Sarah (3 mutual connections)"
- **Status**: Profile Graph API available, wiselist UI integration pending

---

### ⏳ Phase 8: Testing & QA (40% Complete)

**Completed**:
- ✅ Database migration tests (all 4 migrations run successfully)
- ✅ RLS policy manual testing (verified in Supabase Studio)
- ✅ Service layer unit tests (partial - 7/11 functions)

**Missing**:
- ❌ E2E tests (wiselist creation → sharing → booking attribution flow)
- ❌ Integration tests for API endpoints
- ❌ Performance testing (load test with 1000+ wiselists)
- ❌ Commission payout testing (end-to-end with Stripe sandbox)

---

### 📊 Summary by Layer

| Layer | Completion | Notes |
|-------|------------|-------|
| **Database** | 100% | 4 migrations, 19 RLS policies, 19 indexes |
| **Types** | 100% | 6 TypeScript interfaces |
| **Service Layer** | 100% | 11 functions, 523 lines |
| **API Routes** | 100% | 6 REST endpoints |
| **UI Components** | 90% | 10 components, missing public page UI |
| **Pages** | 60% | Hub done, public page WIP, detail page missing |
| **Integrations** | 70% | Referrals ✅, CaaS ✅, Payments 🚧, Profile Graph ❌ |
| **Testing** | 40% | DB tests ✅, unit tests partial, E2E missing |

**Overall**: **80-90% Complete**

---

## What's Left to Build

### High Priority (Blocks GA Launch)

1. **Public Wiselist Page UI** (3 days)
   - Polish `/w/[slug]` layout
   - Anonymous user teaser UI (blur items)
   - "Sign up to view" CTA
   - Social share preview cards (OpenGraph meta tags)

2. **Commission Payout Integration** (5 days)
   - Connect booking completion → commission calculation
   - Queue payouts in Stripe Connect
   - Creator dashboard: "You've earned £65"

3. **E2E Testing** (3 days)
   - Test complete flow: create list → share → signup → book → payout
   - Verify attribution tracking
   - Test edge cases (deleted items, wiselist owner changes)

---

### Medium Priority (Post-Launch Improvements)

4. **Wiselist Analytics** (1 week)
   - Dashboard: "47 views, 12 signups, 3 bookings"
   - Revenue tracking per list
   - Top performing items

5. **Social Sharing Enhancements** (3 days)
   - Twitter/WhatsApp one-click share buttons
   - Email preview cards with wiselist thumbnail
   - Copy link with success toast

6. **Profile Graph Integration** (2 days)
   - Show mutual connections on public wiselists
   - "3 friends also follow this list"

---

### Low Priority (Future Enhancements)

7. **Wiselist Templates** (1 week)
   - Pre-built starter lists ("Best Tutors for Dyslexic Students")
   - One-click clone with 15 curated tutors

8. **Bulk Import** (3 days)
   - Upload CSV of tutor IDs
   - Import 50 tutors at once

9. **Wiselist Following** (1 week)
   - Users can "follow" public wiselists
   - Get notified when creator adds new items

---

## Document Index

| # | Document | Lines | Purpose | Status |
|---|----------|-------|---------|--------|
| 1 | **README.md** (this file) | ~400 | Navigation hub + implementation status | ✅ Active |
| 2 | [wiselists-solution-design-v2.md](./wiselists-solution-design-v2.md) | ~1,500 | Complete architecture & business context | ✅ Active |
| 3 | [wiselists-implementation-v2.md](./wiselists-implementation-v2.md) | ~700 | Developer patterns & how-tos | 🚧 In Progress |
| 4 | [wiselists-prompt-v2.md](./wiselists-prompt-v2.md) | ~500 | AI assistant quick reference | 🚧 In Progress |
| 5 | [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | 239 | Legacy status doc | ⚠️ **DEPRECATED** |

---

## Key Files Reference

### Database
- `apps/api/migrations/081_create_wiselists_table.sql`
- `apps/api/migrations/082_create_wiselist_items_table.sql`
- `apps/api/migrations/083_create_wiselist_collaborators_table.sql`
- `apps/api/migrations/084_add_booking_referrer_to_bookings.sql`

### Service Layer
- `apps/web/src/lib/api/wiselists.ts` (523 lines, 11 functions)

### API Routes
- `apps/web/src/app/api/wiselists/**` (6 route files)

### Components
- `apps/web/src/app/components/feature/wiselists/**` (10 components)

### Pages
- `apps/web/src/app/(authenticated)/wiselists/page.tsx` (Hub)
- `apps/web/src/app/w/[slug]/page.tsx` (Public wiselist)

### Types
- `apps/web/src/types/index.ts` (Wiselist interfaces)

---

## Getting Started (For Developers)

### 1. Run Migrations

```bash
# From project root
cd apps/api
npm run migrate:up

# Verify tables created
psql $DATABASE_URL -c "\dt wiselist*"
# Should show: wiselists, wiselist_items, wiselist_collaborators
```

### 2. Seed Test Data

```bash
# Create test wiselist
psql $DATABASE_URL <<EOF
INSERT INTO wiselists (user_id, title, slug, visibility)
VALUES (
  (SELECT id FROM profiles LIMIT 1),
  'Test Wiselist',
  'test-wiselist-abc123',
  'PUBLIC'
);
EOF
```

### 3. Start Dev Server

```bash
cd apps/web
npm run dev

# Visit http://localhost:3000/wiselists
```

### 4. Test API Endpoints

```bash
# Create wiselist
curl -X POST http://localhost:3000/api/wiselists \
  -H "Content-Type: application/json" \
  -d '{"title": "My Math Tutors", "visibility": "PRIVATE"}'

# Add item to wiselist
curl -X POST http://localhost:3000/api/wiselists/[id]/items \
  -H "Content-Type: application/json" \
  -d '{"item_type": "PROFILE", "profile_id": "tutor-uuid"}'
```

---

## Questions?

- **For product questions**: Check [Solution Design v2](./wiselists-solution-design-v2.md) - Business Context section
- **For technical questions**: Check [Implementation Guide v2](./wiselists-implementation-v2.md) - Common Pitfalls section
- **For API usage**: Check [AI Prompt v2](./wiselists-prompt-v2.md) - Quick Reference section
- **For status updates**: This README (updated weekly)

---

**Last Updated**: 2025-12-14
**Next Review**: 2026-01-14
**Owner**: Growth Team

---

**Status**: 🚀 **80-90% Complete** - Ready for polish & GA launch
