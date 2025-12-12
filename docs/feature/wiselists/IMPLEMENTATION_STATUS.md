# Wiselists v5.7 - Implementation Status

**Version:** 5.7.0
**Status:** Database & Types Complete (30%) - In Progress
**Date:** 2025-11-15
**Implemented By:** Claude Code (Sonnet 4.5)

## Overview

Wiselists is Tutorwise's "Save & Share" growth engine - an Airbnb-style planning tool that drives viral acquisition and in-network sales attribution.

## Progress Summary

### ✅ Phase 1 - Database Layer (100% Complete)

All database migrations have been created and executed successfully.

| Migration | Status | Purpose |
|-----------|--------|---------|
| 081_create_wiselists_table.sql | ✅ Complete | Main wiselists table with RLS |
| 082_create_wiselist_items_table.sql | ✅ Complete | Polymorphic items (profiles/listings) |
| 083_create_wiselist_collaborators_table.sql | ✅ Complete | Collaboration & sharing |
| 084_add_booking_referrer_id.sql | ✅ Complete | Sales attribution tracking |

**Total:** 4 migrations, 19 RLS policies, 19 indexes

### ✅ Phase 2 - TypeScript Types (100% Complete)

All TypeScript interfaces have been added to `apps/web/src/types/index.ts`:

- `Wiselist` - Main wiselist interface
- `WiselistItem` - Polymorphic item (profile or listing)
- `WiselistCollaborator` - Collaboration tracking
- `WiselistWithDetails` - Extended interface with joins
- `WiselistVisibility` - 'private' | 'public'
- `WiselistRole` - 'OWNER' | 'EDITOR' | 'VIEWER'

### ✅ Phase 3 - API Service Layer (100% Complete)

Created `apps/web/src/lib/api/wiselists.ts` with full CRUD operations:

**Functions:**
- `getMyWiselists()` - Get all owned + collaborated lists
- `getWiselist(id)` - Get single list with items & collaborators
- `getWiselistBySlug(slug)` - Get public list by slug (/w/[slug])
- `createWiselist(data)` - Create new list
- `updateWiselist(id, updates)` - Update list
- `deleteWiselist(id)` - Delete list
- `addWiselistItem(data)` - Add profile/listing to list
- `removeWiselistItem(itemId)` - Remove item
- `addCollaborator(data)` - Add collaborator
- `removeCollaborator(id)` - Remove collaborator
- `generateSlug(name)` - Generate URL-safe slug

### 🚧 Phase 4 - REST API Endpoints (0% - Pending)

Need to create Pattern 1 API endpoints:

**Required Endpoints:**
1. `GET /api/wiselists` - List user's wiselists
2. `POST /api/wiselists` - Create wiselist
3. `GET /api/wiselists/[id]` - Get wiselist details
4. `PATCH /api/wiselists/[id]` - Update wiselist
5. `DELETE /api/wiselists/[id]` - Delete wiselist
6. `POST /api/wiselists/[id]/items` - Add item
7. `DELETE /api/wiselists/[id]/items/[itemId]` - Remove item
8. `POST /api/wiselists/[id]/collaborators` - Add collaborator (v4.3 integration)
9. `DELETE /api/wiselists/[id]/collaborators/[collabId]` - Remove collaborator
10. `GET /w/[slug]` - Public wiselist page

### 🚧 Phase 5 - UI Components (0% - Pending)

Need to create React components:

**Hub Page (`/wiselists`):**
- `WiselistCard.tsx` - Avatar-left card pattern
- `CreateWiselistWidget.tsx` - Sidebar widget
- `WiselistStatsWidget.tsx` - Stats sidebar

**Detail Page (`/wiselists/[id]`):**
- `WiselistItemCard.tsx` - Polymorphic item card
- `ShareCollaborateWidget.tsx` - Invite & link sharing

**Modified Components:**
- `ListingCard.tsx` - Add "Save" button
- `ProfileHeroSection.tsx` - Add "Save" button (already has it!)
- `DashboardPage.tsx` - Add SavedWiselistsWidget

### 🚧 Phase 6 - System Integrations (0% - Pending)

**Critical Integration Points:**

1. **Referral System (v4.3) Integration:**
   - File: `POST /api/wiselists/[id]/collaborators`
   - Logic: When inviting new user, generate referral link
   - Flow: Check email exists → Generate referral code → Send invite email

2. **Profile Graph (v4.6) Integration:**
   - File: Migration trigger or post-signup hook
   - Logic: Create SOCIAL link when new user joins from Wiselist invite

3. **Payments (v4.9) Integration:**
   - File: `apps/web/src/middleware.ts`
   - Logic: Detect `/w/[slug]` route → Store wiselist owner in session
   - File: `POST /api/stripe/create-booking-checkout`
   - Logic: Read session → Set `booking_referrer_id`
   - File: `POST /api/webhooks/stripe`
   - Logic: Check `booking_referrer_id` → Pay commission

4. **CaaS (v5.5) Integration:**
   - File: Database trigger on `wiselist_items` INSERT
   - Logic: Queue tutor CaaS recalculation when saved to list
   - Metric: "Total Saves" = Platform Trust score

### 🚧 Phase 7 - Middleware Update (0% - Pending)

**File:** `apps/web/src/middleware.ts`

**Required Changes:**
```typescript
// Detect /w/[slug] route
if (pathname.startsWith('/w/')) {
  const slug = pathname.split('/')[2];

  // Fetch wiselist owner
  const wiselist = await getWiselistBySlug(slug);

  if (wiselist && user) {
    // Store in session for attribution
    sessionStorage.setItem('wiselist_referrer_id', wiselist.profile_id);
  }
}
```

## Database Schema

### Tables Created

#### `wiselists`
- Primary wiselist collection
- 5 RLS policies (owner + public visibility)
- Supports private/public visibility
- Unique slugs for public lists

#### `wiselist_items`
- Polymorphic items (profile_id OR listing_id)
- 7 RLS policies (owner, collaborator, public)
- Tracks who added each item
- Notes field for user comments

#### `wiselist_collaborators`
- Multi-user collaboration
- 7 RLS policies (owner management)
- Role-based permissions (OWNER/EDITOR/VIEWER)
- Referral tracking (invited_by_profile_id)

#### `bookings` (modified)
- Added `booking_referrer_id` column
- Enables in-network sales attribution
- Used by Stripe webhook for commissions

## Integration Architecture

### Loop 1: External Growth (v4.3 Referral)
```
User A creates Wiselist → Invites email (new user)
→ API generates referral link (.../a/[code]?redirect=/wiselists/[id])
→ New user signs up → profile_graph SOCIAL link created
→ User B added as collaborator
```

### Loop 2: In-Network Sales (v4.9 Payments)
```
Tutor A creates public Wiselist (/w/tutor-a-recs)
→ Client clicks link → Middleware stores wiselist_referrer_id
→ Client books Tutor B → booking_referrer_id = Tutor A
→ Stripe webhook → Commission paid to Tutor A
```

### Loop 3: CaaS Data (v5.5 Engine)
```
Client saves Tutor to Wiselist
→ Trigger queues tutor CaaS recalculation
→ "Total Saves" increases "Platform Trust" score
→ Tutor ranks higher in marketplace search
```

## Files Created

### Database
- `apps/api/migrations/081_create_wiselists_table.sql`
- `apps/api/migrations/082_create_wiselist_items_table.sql`
- `apps/api/migrations/083_create_wiselist_collaborators_table.sql`
- `apps/api/migrations/084_add_booking_referrer_id.sql`

### Backend
- `apps/web/src/lib/api/wiselists.ts` (API service layer)

### Types
- `apps/web/src/types/index.ts` (Wiselist interfaces added)

### Documentation
- `docs/features/wiselists/IMPLEMENTATION_STATUS.md` (this file)

## Next Steps

### Immediate (Phase 4-5)
1. Create REST API endpoints (Pattern 1)
2. Create UI components (Hub + Detail pages)
3. Add "Save" button to ListingCard
4. Create SavedWiselistsWidget for dashboard

### Integration (Phase 6-7)
5. Implement collaborator invite endpoint (v4.3 integration)
6. Update middleware for /w/[slug] attribution
7. Update Stripe checkout API for booking_referrer_id
8. Update Stripe webhook for commission logic

### Testing (Phase 8)
9. Test wiselist CRUD operations
10. Test public link sharing (/w/[slug])
11. Test collaborator invites (new vs existing users)
12. Test in-network sales attribution
13. Test commission payouts

## Estimated Completion

- **Phase 4-5 (APIs + UI):** 4-6 hours
- **Phase 6-7 (Integrations):** 3-4 hours
- **Phase 8 (Testing):** 2-3 hours
- **Total Remaining:** 10-13 hours

## Current Status

**Completed:** 30% (Database, Types, Service Layer)
**Remaining:** 70% (APIs, UI, Integrations)

**Ready for:** Continuing with Phase 4 (REST API endpoints)
