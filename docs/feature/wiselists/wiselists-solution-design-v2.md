# Wiselists Solution Design v1.0
**Save & Share Growth Engine - Airbnb for Tutors**

**Version**: 1.0
**Status**: Active Production (~80-90% Complete)
**Last Updated**: 2025-12-14
**Owner**: Growth Team + Marketplace Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Context](#business-context)
3. [Three Growth Loops](#three-growth-loops)
4. [Architecture Overview](#architecture-overview)
5. [Database Design](#database-design)
6. [Polymorphic Items Pattern](#polymorphic-items-pattern)
7. [Collaboration Model](#collaboration-model)
8. [Public Sharing & Attribution](#public-sharing--attribution)
9. [Integration Points](#integration-points)
10. [Security & Privacy](#security--privacy)
11. [Future Enhancements](#future-enhancements)

---

## Executive Summary

**Wiselists** is TutorWise's "Save & Share" growth engine - an **Airbnb-style collections feature** that transforms passive browsing into active viral loops. Users create curated lists of tutors and listings, then share them publicly to earn referral credits and commissions.

### Business Impact

| Metric | Target | Impact |
|--------|--------|--------|
| **Viral Coefficient** | 1.2x | Each shared wiselist brings 1.2 new users |
| **Referral Revenue** | 15% of GMV | Commission from bookings via shared lists |
| **Search Quality** | +20% CTR | "Total Saves" boosts tutor ranking (CaaS integration) |
| **User Retention** | +30% | List creators return to update/share collections |

### Three Growth Loops

**Loop 1: External Growth** (Referral Invites)
- User shares wiselist → Friend clicks `/w/tutoring-for-kids`
- Friend must sign up to view full list → Referral credit to creator
- **Growth mechanic**: Social proof + FOMO (hidden items until signup)

**Loop 2: In-Network Sales** (Commission Attribution)
- User shares wiselist → Viewer books tutor from list
- System tracks `booking_referrer_id` → Creator earns 5% commission
- **Growth mechanic**: Financial incentive to curate quality lists

**Loop 3: CaaS Data** (Search Ranking Boost)
- User saves tutor to wiselist → Increments `total_saves` on profile
- CaaS engine includes "Total Saves" in credibility score
- **Growth mechanic**: Tutors promote "Add me to your list" for visibility

---

## Business Context

### The Discovery Problem

**Before Wiselists**:
- Users browse 100+ tutors but can't save favorites
- No way to compare shortlisted tutors side-by-side
- Research progress lost when closing browser
- No financial incentive to recommend tutors to friends

**Real-World Scenario**:
> Sarah finds 8 great tutors for her son's math help. She screenshots profiles to compare later. Her friend Emma asks for recommendations - Sarah sends screenshots via WhatsApp. Emma books a tutor but Sarah gets no referral credit. The tutor gains a student but doesn't know Sarah drove the booking.

### The Wiselist Solution

**After Wiselists**:
- Users save tutors to persistent collections (works without login via localStorage)
- Create themed lists: "Math Tutors for Kids", "GCSE Exam Prep", "Learn Spanish Online"
- Share via `/w/math-tutors-for-kids` → Emma clicks, signs up to view full list, books tutor
- Sarah earns 5% commission (~£20 on £400 booking) + Emma becomes new user (referral credit)

**Success Scenario**:
> Sarah creates wiselist "Best Math Tutors London" with 5 carefully researched tutors. She shares the link in her parent WhatsApp group (30 moms). 12 moms click the link, 8 sign up to view full list (referral credits), 3 book tutors (£60 commission for Sarah). The 5 tutors each gain +1 save, boosting their CaaS score and search ranking.

### Why Now?

**Business Drivers**:
1. **CAC Rising**: Paid acquisition costs increased 40% YoY → Need organic growth
2. **Network Effects**: Platform has critical mass (10K+ tutors) → Collections create value
3. **Attribution Gap**: 30% of bookings come from word-of-mouth but we can't track them

**Dependencies Resolved**:
- Referrals v4.3 complete (invite tracking infrastructure)
- Profile Graph v4.6 live (social connection data)
- Payments v4.9 deployed (commission payout system)
- CaaS v5.5 active (can consume "Total Saves" signal)

---

## Three Growth Loops

### Loop 1: External Growth (Viral Acquisition)

**How It Works**:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Loop 1: External Growth - Referral-Driven User Acquisition           │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Step 1: Creator Shares Public Link                                  │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ User (logged in) creates wiselist "GCSE Math Tutors"       │     │
│  │ → Sets visibility = PUBLIC                                 │     │
│  │ → System generates slug: /w/gcse-math-tutors               │     │
│  │ → User shares link on Twitter/WhatsApp/Email               │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Step 2: Friend Clicks Link (Not Logged In)                          │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ Friend visits /w/gcse-math-tutors                          │     │
│  │ → Sees wiselist preview (title, description, item count)   │     │
│  │ → Items shown as blurred cards: "Sign up to view 8 tutors" │     │
│  │ → CTA: "Create free account to unlock this list"          │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Step 3: Friend Signs Up (Attribution Tracked)                       │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ Friend clicks "Sign up" → Middleware captures referrer:    │     │
│  │   ?ref=wiselist-[slug]                                     │     │
│  │ → After signup, redirect back to /w/gcse-math-tutors       │     │
│  │ → Now can see full list of 8 tutors                        │     │
│  │ → System creates referral record:                          │     │
│  │   referrer_id = creator_id, referred_id = friend_id        │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Step 4: Creator Earns Referral Credit                               │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ Referrals system awards creator:                           │     │
│  │ • £10 credit when friend completes first booking           │     │
│  │ • Friend gets £5 welcome credit                            │     │
│  │ → Win-win incentive loop                                   │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Growth Mechanic: Social proof + FOMO + Financial incentive          │
│  Viral Coefficient: 1.2x (each list brings 1.2 new users on average) │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions**:

- **Why blur items?**: Creates FOMO ("What am I missing?") → Higher signup conversion
- **Why require signup?**: Prevents anonymous viewing → Forces attribution tracking
- **Why referral credit?**: Aligns creator incentives with platform growth

---

### Loop 2: In-Network Sales (Commission Engine)

**How It Works**:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Loop 2: In-Network Sales - Booking Attribution & Commission          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Step 1: Viewer Books Tutor from Wiselist                            │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ User views /w/gcse-math-tutors → Clicks tutor profile      │     │
│  │ → Middleware sets cookie: wiselist_referrer=[wiselist_id]  │     │
│  │ → User clicks "Book Now" → Proceeds to checkout            │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Step 2: Booking Created with Referrer Tracking                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ System creates booking record:                             │     │
│  │   booking_id: uuid-abc123                                  │     │
│  │   tutor_id: tutor-xyz                                      │     │
│  │   client_id: client-123                                    │     │
│  │   booking_referrer_id: wiselist-456  ← CRITICAL FIELD      │     │
│  │   total_amount: £400                                       │     │
│  │ → Booking referrer links back to wiselist                  │     │
│  │ → Can trace creator_id from wiselist table                 │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Step 3: Commission Payout                                           │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ After session completes (7 days later):                    │     │
│  │ • Platform fee: £400 × 15% = £60                           │     │
│  │ • Creator commission: £60 × 33% = £20                      │     │
│  │ → Creator earns £20 for curating quality list              │     │
│  │ → Payout via Stripe Connect after 30-day dispute window    │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Growth Mechanic: Financial incentive to curate & share lists        │
│  Revenue Impact: 15% of GMV now attributable to wiselist referrers   │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions**:

- **Why 5% commission?**: High enough to motivate sharing, low enough to maintain margin
- **Why 7-day delay?**: Ensures session completed before payout (anti-fraud)
- **Why cookie tracking?**: Persists attribution even if user browses other pages before booking

---

### Loop 3: CaaS Data (Search Ranking Boost)

**How It Works**:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Loop 3: CaaS Data - "Save Count" Improves Tutor Ranking              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Step 1: User Saves Tutor to Wiselist                                │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ User clicks "Save to Wiselist" on tutor profile            │     │
│  │ → System creates wiselist_item record:                     │     │
│  │   wiselist_id: list-123                                    │     │
│  │   item_type: PROFILE                                       │     │
│  │   profile_id: tutor-xyz                                    │     │
│  │ → Triggers database function: increment_profile_save_count │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Step 2: Profile Save Count Updated                                  │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ Database trigger updates profiles table:                   │     │
│  │   total_saves = total_saves + 1  (now 47)                  │     │
│  │ → Enqueues CaaS recalculation:                             │     │
│  │   INSERT INTO caas_recalculation_queue (profile_id)        │     │
│  │ → CaaS worker picks up event (runs every 10 minutes)       │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Step 3: CaaS Score Recalculated                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ CaaS engine recalculates tutor credibility score:          │     │
│  │                                                             │     │
│  │ Old Score: 72/100                                          │     │
│  │ • Reviews: 30 pts                                          │     │
│  │ • Credentials: 28 pts                                      │     │
│  │ • Network Trust: 14 pts (includes total_saves = 46)        │     │
│  │                                                             │     │
│  │ New Score: 73/100  ← +1 point from save                    │     │
│  │ • Reviews: 30 pts                                          │     │
│  │ • Credentials: 28 pts                                      │     │
│  │ • Network Trust: 15 pts (total_saves = 47)  ← UPDATED      │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Step 4: Search Ranking Improves                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │ Search query: "Math tutor in London"                       │     │
│  │ → Results sorted by CaaS score (DESC)                      │     │
│  │ → Tutor moves from position #8 to #6 in results            │     │
│  │ → 2 positions higher = +15% impression increase            │     │
│  │ → More visibility = More bookings = More reviews...        │     │
│  │ → Flywheel effect                                          │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                       │
│  Growth Mechanic: Tutors incentivized to ask "Save me to your list!" │
│  Quality Signal: Popular tutors rise in rankings organically         │
└──────────────────────────────────────────────────────────────────────┘
```

**Key Design Decisions**:

- **Why count saves?**: Social proof signal (like "favorite" count on Airbnb)
- **Why integrate with CaaS?**: Existing infrastructure for score recalculation
- **Why async queue?**: Prevents save action from being slow due to score calc

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Wiselists Architecture v1.0                      │
│                  (Service Layer + Polymorphic Data)                  │
└─────────────────────────────────────────────────────────────────────┘

User Interface Layer
  ↓
  ├── /wiselists (Hub Page)
  ├── /w/[slug] (Public Shared List)
  └── Modals (Create, Add, Collaborate)

API Layer (Next.js Routes)
  ↓
  ├── GET /api/wiselists → List user's wiselists
  ├── POST /api/wiselists → Create wiselist
  ├── GET /api/wiselists/[id] → Get single wiselist
  ├── PATCH /api/wiselists/[id] → Update wiselist
  ├── DELETE /api/wiselists/[id] → Delete wiselist
  ├── POST /api/wiselists/[id]/items → Add item to list
  ├── DELETE /api/wiselists/[id]/items/[itemId] → Remove item
  ├── POST /api/wiselists/[id]/collaborators → Invite collaborator
  └── DELETE /api/wiselists/[id]/collaborators/[collabId] → Remove collaborator

Service Layer (Business Logic)
  ↓
  File: apps/web/src/lib/api/wiselists.ts (523 lines)
  Functions:
  ├── getWiselists(userId) → Fetch user's lists
  ├── getWiselistBySlug(slug) → Fetch public list
  ├── createWiselist(data) → Create new list
  ├── addItemToWiselist(wiselistId, item) → Add tutor/listing
  ├── removeItemFromWiselist(wiselistId, itemId) → Remove item
  ├── addCollaborator(wiselistId, email, role) → Invite user
  └── getWiselistsFromLocalStorage() → Anonymous user fallback

Database Layer (PostgreSQL + RLS)
  ↓
  Tables:
  ├── wiselists (id, user_id, title, slug, visibility, created_at)
  ├── wiselist_items (id, wiselist_id, item_type, profile_id, listing_id)
  ├── wiselist_collaborators (id, wiselist_id, user_id, role, status)
  └── bookings (booking_referrer_id ← FK to wiselists)
```

**Key Design Principle**:
> "Service layer encapsulates all business logic. API routes are thin adapters. Database enforces constraints."

---

## Database Design

### Table 1: `wiselists`

**Purpose**: Main table storing user-created collections

**Schema**:
```sql
CREATE TABLE wiselists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  slug VARCHAR(150) UNIQUE NOT NULL, -- URL-friendly: "best-math-tutors-london"
  description TEXT,
  visibility VARCHAR(20) DEFAULT 'PRIVATE', -- PRIVATE | PUBLIC
  total_items INTEGER DEFAULT 0, -- Denormalized count for performance
  total_saves INTEGER DEFAULT 0, -- How many users saved this wiselist
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wiselists_user_id ON wiselists(user_id);
CREATE INDEX idx_wiselists_slug ON wiselists(slug);
CREATE INDEX idx_wiselists_visibility ON wiselists(visibility) WHERE visibility = 'PUBLIC';
```

**Design Decisions**:

**Q: Why `slug` instead of just using `id`?**
A: Human-readable URLs are shareable and SEO-friendly
- `/w/best-math-tutors` is more viral than `/w/uuid-abc123`
- Slug generation: `title.toLowerCase().replace(/\s+/g, '-').slice(0, 50) + '-' + randomString(8)`

**Q: Why denormalize `total_items`?**
A: Avoids COUNT(*) query on wiselist_items table for list previews
- Updated via database trigger on INSERT/DELETE to wiselist_items
- Trade-off: Slight write overhead for massive read performance gain

**Q: Why `visibility` enum?**
A: Simple access control (may expand to SHARED_LINK, UNLISTED in future)

**Migration**: `apps/api/migrations/081_create_wiselists_table.sql`

---

### Table 2: `wiselist_items`

**Purpose**: Junction table storing items (tutors or listings) in wiselists

**Schema**:
```sql
CREATE TABLE wiselist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wiselist_id UUID NOT NULL REFERENCES wiselists(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL, -- PROFILE | LISTING
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  position INTEGER, -- For manual ordering (0, 1, 2, ...)
  note TEXT, -- User's private note about this item
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- CRITICAL CONSTRAINT: Exactly one of profile_id OR listing_id must be set
  CONSTRAINT wiselist_items_polymorphic_check
    CHECK (
      (item_type = 'PROFILE' AND profile_id IS NOT NULL AND listing_id IS NULL) OR
      (item_type = 'LISTING' AND profile_id IS NULL AND listing_id IS NOT NULL)
    ),

  -- Prevent duplicates: same item can't be added twice to same list
  CONSTRAINT wiselist_items_unique_item
    UNIQUE (wiselist_id, item_type, profile_id, listing_id)
);

CREATE INDEX idx_wiselist_items_wiselist_id ON wiselist_items(wiselist_id);
CREATE INDEX idx_wiselist_items_profile_id ON wiselist_items(profile_id) WHERE profile_id IS NOT NULL;
CREATE INDEX idx_wiselist_items_listing_id ON wiselist_items(listing_id) WHERE listing_id IS NOT NULL;
```

**Design Decisions**:

**Q: Why polymorphic (PROFILE or LISTING)?**
A: Users want to save both tutors and their service listings
- Example: Save "John Smith" (profile) AND his "GCSE Math Tutoring" listing
- Enables flexible collections: "Math Tutors" (profiles) vs "Affordable Lessons" (listings)

**Q: Why constraint `wiselist_items_polymorphic_check`?**
A: Enforces data integrity at database level
- Prevents invalid state: both profile_id AND listing_id set
- Better than application-level validation (can't bypass via raw SQL)

**Q: Why `position` field?**
A: Allows manual reordering (drag-and-drop in UI)
- Future feature: "Pin favorite tutor to top of list"

**Migration**: `apps/api/migrations/082_create_wiselist_items_table.sql`

---

### Table 3: `wiselist_collaborators`

**Purpose**: Multi-user editing with role-based permissions

**Schema**:
```sql
CREATE TABLE wiselist_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wiselist_id UUID NOT NULL REFERENCES wiselists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- OWNER | EDITOR | VIEWER
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING | ACCEPTED | DECLINED
  invited_by UUID REFERENCES profiles(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  UNIQUE (wiselist_id, user_id)
);

CREATE INDEX idx_wiselist_collaborators_wiselist_id ON wiselist_collaborators(wiselist_id);
CREATE INDEX idx_wiselist_collaborators_user_id ON wiselist_collaborators(user_id);
```

**Design Decisions**:

**Q: Why 3 roles (OWNER, EDITOR, VIEWER)?**
A: Enables collaborative list curation (like Google Docs sharing)
- OWNER: Created the list, can delete, change visibility, manage collaborators
- EDITOR: Can add/remove items, edit notes (but not delete list)
- VIEWER: Read-only access to private lists

**Q: Why `status` field (PENDING, ACCEPTED)?**
A: Invitation workflow
- User invites friend via email → Record created with status=PENDING
- Friend receives email → Clicks "Accept" → status=ACCEPTED
- Prevents spam: Can't force-add someone to your list

**Q: Why separate from wiselists table?**
A: One-to-many relationship (one list, many collaborators)
- Allows efficient querying: "Show me all lists where I'm a collaborator"

**Migration**: `apps/api/migrations/083_create_wiselist_collaborators_table.sql`

---

### Table 4: `bookings.booking_referrer_id`

**Purpose**: Track which wiselist drove a booking (for commission attribution)

**Schema Change**:
```sql
ALTER TABLE bookings
  ADD COLUMN booking_referrer_id UUID REFERENCES wiselists(id) ON DELETE SET NULL;

CREATE INDEX idx_bookings_referrer_id ON bookings(booking_referrer_id)
  WHERE booking_referrer_id IS NOT NULL;
```

**Design Decisions**:

**Q: Why add to `bookings` table instead of new junction table?**
A: One booking can only come from one wiselist referrer
- Simpler schema, faster queries
- Nullable: Most bookings don't come from wiselists (yet)

**Q: Why ON DELETE SET NULL?**
A: If wiselist is deleted, preserve booking record
- Historical data integrity
- Commission payouts already processed, don't need FK

**Q: Why partial index WHERE ... IS NOT NULL?**
A: Only 10-20% of bookings have referrer_id
- Smaller index = faster queries for attributed bookings
- Doesn't waste space indexing NULL values

**Migration**: `apps/api/migrations/084_add_booking_referrer_to_bookings.sql`

---

## Polymorphic Items Pattern

### The Pattern Explained

**Problem**: Users want to save two types of content:
1. **Profiles** (tutors themselves): "Sarah Johnson - Math Expert"
2. **Listings** (specific services): "GCSE Math Tutoring - £40/hour"

**Naive Solution** (Rejected):
Create two separate tables:
- `wiselist_profile_items`
- `wiselist_listing_items`

❌ **Why this fails**:
- Can't get unified list of all items (requires UNION query)
- Can't maintain item ordering across types
- Duplicated code for similar operations

**Smart Solution** (Implemented):
Single `wiselist_items` table with polymorphic references

### How It Works (Worked Example)

**Scenario**: User creates "Best GCSE Tutors" list

**Step 1**: Add Sarah (Profile)
```sql
INSERT INTO wiselist_items (
  wiselist_id,
  item_type,
  profile_id,
  listing_id
) VALUES (
  'list-123',
  'PROFILE',      -- Item type
  'sarah-uuid',   -- Profile reference
  NULL            -- Listing is null
);
```
✅ Constraint passes: `item_type = PROFILE AND profile_id NOT NULL AND listing_id IS NULL`

**Step 2**: Add Sarah's "GCSE Math" Listing
```sql
INSERT INTO wiselist_items (
  wiselist_id,
  item_type,
  profile_id,
  listing_id
) VALUES (
  'list-123',
  'LISTING',      -- Item type
  NULL,           -- Profile is null
  'listing-456'   -- Listing reference
);
```
✅ Constraint passes: `item_type = LISTING AND profile_id IS NULL AND listing_id NOT NULL`

**Step 3**: Try to add both (FAILS)
```sql
INSERT INTO wiselist_items (
  wiselist_id,
  item_type,
  profile_id,
  listing_id
) VALUES (
  'list-123',
  'PROFILE',
  'sarah-uuid',
  'listing-456'  -- BOTH SET
);
```
❌ **Constraint violation**: `wiselist_items_polymorphic_check`
> ERROR: CHECK constraint failed - must have exactly one of profile_id OR listing_id

### Query Patterns

**Fetch all items in a wiselist** (with polymorphic join):
```sql
SELECT
  wi.id,
  wi.item_type,
  wi.position,
  wi.note,
  -- Conditional joins based on item_type
  CASE
    WHEN wi.item_type = 'PROFILE' THEN p.name
    WHEN wi.item_type = 'LISTING' THEN l.title
  END AS item_name,
  CASE
    WHEN wi.item_type = 'PROFILE' THEN p.avatar_url
    WHEN wi.item_type = 'LISTING' THEN l.image_url
  END AS item_image
FROM wiselist_items wi
LEFT JOIN profiles p ON wi.profile_id = p.id
LEFT JOIN listings l ON wi.listing_id = l.id
WHERE wi.wiselist_id = 'list-123'
ORDER BY wi.position ASC;
```

**Trade-offs**:

✅ **Pros**:
- Unified item list (single query)
- Maintains ordering across types
- Database-enforced integrity (can't have invalid references)
- Extensible (can add COURSE type later)

❌ **Cons**:
- Slightly complex queries (CASE statements)
- Two sparse columns (profile_id, listing_id - only one populated)
- Developers must understand polymorphic pattern

**Verdict**: Pros outweigh cons for this use case (similar to Stripe's polymorphic `charges.source` pattern)

---

## Collaboration Model

### Three Roles Explained

| Role | Permissions | Use Case |
|------|-------------|----------|
| **OWNER** | • Delete wiselist<br>• Change visibility (PRIVATE ↔ PUBLIC)<br>• Add/remove collaborators<br>• Add/remove items<br>• Edit title/description | Original creator of list |
| **EDITOR** | • Add/remove items<br>• Edit item notes<br>• Reorder items<br>❌ Can't delete list<br>❌ Can't change visibility | Trusted friend co-curating list |
| **VIEWER** | • View private wiselist<br>❌ Can't modify anything | Friends given read-only access |

### Invitation Flow (Worked Example)

**Scenario**: Alice invites Bob to collaborate on "London Math Tutors"

**Step 1**: Alice sends invitation
```typescript
// Frontend calls service layer
await addCollaborator('list-123', 'bob@example.com', 'EDITOR');

// Service layer:
1. Check if bob@example.com is registered user
   ├─ YES: Create collaborator record with user_id
   └─ NO: Create pending invitation, send email with signup link

2. Insert into wiselist_collaborators:
   {
     wiselist_id: 'list-123',
     user_id: 'bob-uuid' (if registered) OR NULL,
     role: 'EDITOR',
     status: 'PENDING',
     invited_by: 'alice-uuid',
     invited_at: '2025-12-14T10:00:00Z'
   }

3. Send email to bob@example.com:
   Subject: "Alice invited you to collaborate on 'London Math Tutors'"
   Body: "Click here to accept: /wiselists/invite/[token]"
```

**Step 2**: Bob receives email, clicks link

**Case A: Bob is existing user**
```typescript
// Bob clicks link → /wiselists/invite/[token]
→ System validates token, finds collaborator record
→ Shows acceptance page: "Alice wants you to edit 'London Math Tutors'"
→ Bob clicks "Accept"
→ UPDATE wiselist_collaborators SET status = 'ACCEPTED', accepted_at = NOW()
→ Redirect Bob to /wiselists/list-123 (can now edit)
```

**Case B: Bob is new user**
```typescript
// Bob clicks link → /wiselists/invite/[token]
→ System detects no account exists
→ Redirect to /signup?ref=wiselist-invite&token=[token]
→ After signup completes:
   1. Create user record (user_id = 'bob-uuid')
   2. UPDATE wiselist_collaborators SET user_id = 'bob-uuid', status = 'ACCEPTED'
   3. Award referral credit to Alice (brought new user)
   4. Redirect Bob to /wiselists/list-123
```

**Step 3**: Alice and Bob both edit list

```typescript
// RLS policies enforce permissions:

POLICY "owners_full_access"
  USING (user_id = auth.uid() OR
         EXISTS (
           SELECT 1 FROM wiselist_collaborators
           WHERE wiselist_id = wiselists.id
           AND user_id = auth.uid()
           AND role = 'OWNER'
           AND status = 'ACCEPTED'
         )
  );

POLICY "editors_can_modify_items"
  USING (
    EXISTS (
      SELECT 1 FROM wiselist_collaborators
      WHERE wiselist_id = wiselist_items.wiselist_id
      AND user_id = auth.uid()
      AND role IN ('OWNER', 'EDITOR')  -- Both can edit items
      AND status = 'ACCEPTED'
    )
  );

POLICY "viewers_read_only"
  USING (
    EXISTS (
      SELECT 1 FROM wiselist_collaborators
      WHERE wiselist_id = wiselists.id
      AND user_id = auth.uid()
      AND status = 'ACCEPTED'  -- Any role can view
    )
  );
```

### Permission Matrix

| Action | OWNER | EDITOR | VIEWER | Unauthenticated |
|--------|-------|--------|--------|-----------------|
| View private wiselist | ✅ | ✅ | ✅ | ❌ |
| View public wiselist | ✅ | ✅ | ✅ | ✅ (preview only) |
| Add items | ✅ | ✅ | ❌ | ❌ |
| Remove items | ✅ | ✅ | ❌ | ❌ |
| Reorder items | ✅ | ✅ | ❌ | ❌ |
| Edit title/description | ✅ | ❌ | ❌ | ❌ |
| Change visibility | ✅ | ❌ | ❌ | ❌ |
| Add collaborators | ✅ | ❌ | ❌ | ❌ |
| Delete wiselist | ✅ | ❌ | ❌ | ❌ |

---

## Public Sharing & Attribution

### URL Slugs

**Pattern**: `/w/[slug]`

**Example URLs**:
- `/w/best-gcse-math-tutors-london`
- `/w/affordable-spanish-lessons-online`
- `/w/kid-friendly-science-tutors`

**Slug Generation Algorithm**:
```typescript
function generateSlug(title: string): string {
  // 1. Lowercase and replace spaces with hyphens
  let slug = title.toLowerCase().replace(/\s+/g, '-');

  // 2. Remove special characters (keep letters, numbers, hyphens)
  slug = slug.replace(/[^a-z0-9-]/g, '');

  // 3. Truncate to 50 chars (SEO sweet spot)
  slug = slug.slice(0, 50);

  // 4. Add 8-char random suffix to ensure uniqueness
  const randomSuffix = generateRandomString(8); // e.g., "a7x9k2m1"
  slug = `${slug}-${randomSuffix}`;

  // 5. Check database for collisions (rare, but handle it)
  const exists = await checkSlugExists(slug);
  if (exists) {
    return generateSlug(title); // Recursive retry
  }

  return slug;
}
```

**Why random suffix?**
- Two users create "Math Tutors" → Both get unique URLs
- Prevents slug squatting (can't claim premium names)

---

### Middleware Attribution Tracking

**The Challenge**: When user clicks `/w/math-tutors` → Views tutor profile → Books tutor (3 page navigation), how do we track the wiselist referrer?

**Solution**: Middleware sets persistent cookie

```typescript
// middleware.ts (runs on every request)

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Detect wiselist public page
  if (url.pathname.startsWith('/w/')) {
    const slug = url.pathname.replace('/w/', '');

    // Fetch wiselist from database
    const wiselist = await getWiselistBySlug(slug);

    if (wiselist) {
      // Set cookie that persists for 7 days
      const response = NextResponse.next();
      response.cookies.set('wiselist_referrer', wiselist.id, {
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
        httpOnly: true, // Prevent JS access (security)
        sameSite: 'lax'
      });

      return response;
    }
  }

  // Check if user is booking a tutor
  if (url.pathname.startsWith('/book/')) {
    // Cookie is automatically sent in request
    const wiselistReferrer = request.cookies.get('wiselist_referrer');

    if (wiselistReferrer) {
      // Pass to booking creation API
      request.headers.set('X-Wiselist-Referrer', wiselistReferrer.value);
    }
  }

  return NextResponse.next();
}
```

**Booking Creation** (with attribution):
```typescript
// apps/web/src/app/api/bookings/route.ts

export async function POST(request: Request) {
  const wiselistReferrer = request.headers.get('X-Wiselist-Referrer');

  const booking = await createBooking({
    tutor_id: tutorId,
    client_id: clientId,
    total_amount: 400,
    booking_referrer_id: wiselistReferrer || null, // TRACKED!
  });

  // Later: Calculate commission for wiselist creator
  if (wiselistReferrer) {
    await queueCommissionPayout(wiselistReferrer, booking.id);
  }
}
```

**Why 7-day cookie expiry?**
- Balances attribution accuracy with user privacy
- Longer than typical booking journey (user researches for 1-3 days)
- Prevents stale attribution (if user found tutor elsewhere)

---

## Integration Points

### Integration 1: Referrals v4.3

**Purpose**: Track new user signups from wiselist sharing

**Data Flow**:
```
Wiselist Share → Friend Clicks /w/[slug] → Friend Signs Up → Referral Created
```

**Implementation**:
```typescript
// When friend signs up via wiselist invite link
const referralData = {
  referrer_id: wiselist.user_id,        // Wiselist creator
  referred_id: newUser.id,               // Friend who signed up
  referral_source: 'WISELIST_SHARE',     // Track source
  metadata: {
    wiselist_id: wiselist.id,
    wiselist_slug: wiselist.slug,
    wiselist_title: wiselist.title
  }
};

await createReferral(referralData);

// Award credits
await awardReferralCredit(wiselist.user_id, 10); // £10 to creator
await awardWelcomeCredit(newUser.id, 5);         // £5 to new user
```

**Business Logic**:
- Creator earns £10 credit when referred friend completes first booking
- Friend gets £5 welcome credit immediately
- Referral system handles credit expiry, T&Cs, fraud detection

**File Reference**: `apps/web/src/lib/api/referrals.ts:createReferral()`

---

### Integration 2: CaaS v5.5

**Purpose**: "Total Saves" increases tutor search ranking

**Data Flow**:
```
User Saves Tutor → Increment total_saves → Enqueue CaaS Recalc → Score Updated
```

**Implementation**:
```sql
-- Database trigger on wiselist_items INSERT
CREATE OR REPLACE FUNCTION increment_profile_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.item_type = 'PROFILE' THEN
    UPDATE profiles
    SET total_saves = total_saves + 1
    WHERE id = NEW.profile_id;

    -- Enqueue CaaS recalculation
    INSERT INTO caas_recalculation_queue (profile_id)
    VALUES (NEW.profile_id)
    ON CONFLICT (profile_id) DO NOTHING; -- Dedupe
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wiselist_items_save_count
AFTER INSERT ON wiselist_items
FOR EACH ROW
EXECUTE FUNCTION increment_profile_save_count();
```

**CaaS Score Calculation**:
```typescript
// In TutorCaaSStrategy.calculateNetworkTrust()

const saveScore = Math.min(
  profile.total_saves * 0.5, // 0.5 points per save
  10                         // Max 10 points from saves
);

// Example:
// 5 saves → 2.5 points
// 20 saves → 10 points (capped)
// 100 saves → still 10 points
```

**Why cap at 10 points?**
- Prevents gaming (can't inflate score by creating fake saves)
- Balances with other signals (reviews, credentials)
- 20 saves is already high social proof

**File Reference**: `apps/api/caas/strategies/TutorCaaSStrategy.ts:calculateNetworkTrust()`

---

### Integration 3: Profile Graph v4.6

**Purpose**: Show mutual connections in shared wiselists

**Data Flow**:
```
Wiselist Owner → Has 50 connections → Friend Views List → See "3 mutual connections"
```

**Implementation** (Future):
```typescript
// When displaying public wiselist
const mutualConnections = await getProfileGraphMutualConnections(
  wiselist.user_id,  // List creator
  viewer.id          // Current viewer
);

// UI shows:
// "Created by Sarah Johnson (3 mutual connections)"
// → Click to see: "Alice, Bob, Carol also connected to Sarah"
```

**Why this matters**:
- Social proof: "My friend's friend recommends these tutors"
- Trust signal: Increases wiselist credibility
- Discovery: Introduces users to creator's network

**Status**: ✅ Profile Graph API ready, wiselist UI integration pending

---

### Integration 4: Payments v4.9

**Purpose**: Commission payouts for wiselist creators

**Data Flow**:
```
Booking Completed → Detect booking_referrer_id → Calculate 5% → Queue Payout
```

**Implementation**:
```typescript
// After booking session completes (7 days later)
async function processBookingCompletion(booking: Booking) {
  if (booking.booking_referrer_id) {
    const wiselist = await getWiselist(booking.booking_referrer_id);
    const creator = wiselist.user_id;

    // Platform fee: 15% of £400 = £60
    const platformFee = booking.total_amount * 0.15;

    // Creator commission: 33% of platform fee = £20
    const commission = platformFee * 0.33;

    // Queue payout (processed after 30-day dispute window)
    await queueStripeConnectPayout(creator, commission, {
      booking_id: booking.id,
      wiselist_id: wiselist.id,
      reason: 'Wiselist referral commission'
    });
  }
}
```

**Why 30-day delay?**
- Protects against chargebacks/refunds
- Standard industry practice (Airbnb, Uber)
- Creator sees "Pending payout: £20 (available Jan 15)" immediately

**File Reference**: `apps/api/payments/processBookingCompletion.ts`

---

## Security & Privacy

### Row Level Security (RLS) Policies

**Philosophy**: "Users own their wiselists. Collaborators have role-based access. Public lists are readable by all."

**Policy 1: Users can create wiselists**
```sql
CREATE POLICY "users_can_create_wiselists"
ON wiselists FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Policy 2: Users can read their own wiselists**
```sql
CREATE POLICY "users_can_read_own_wiselists"
ON wiselists FOR SELECT
USING (
  user_id = auth.uid() OR
  visibility = 'PUBLIC' OR
  EXISTS (
    SELECT 1 FROM wiselist_collaborators
    WHERE wiselist_id = wiselists.id
    AND user_id = auth.uid()
    AND status = 'ACCEPTED'
  )
);
```

**Policy 3: Only owners can delete**
```sql
CREATE POLICY "only_owners_can_delete"
ON wiselists FOR DELETE
USING (user_id = auth.uid());
```

**Policy 4: Owners and editors can add items**
```sql
CREATE POLICY "collaborators_can_add_items"
ON wiselist_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM wiselist_collaborators
    WHERE wiselist_id = wiselist_items.wiselist_id
    AND user_id = auth.uid()
    AND role IN ('OWNER', 'EDITOR')
    AND status = 'ACCEPTED'
  )
);
```

**Total RLS Policies**: 19 (across 3 tables)

---

### Data Privacy

**Personal Data Handled**:
- Wiselist titles/descriptions (user-generated content)
- Collaborator emails (for invitations)
- Booking referrer data (attribution tracking)

**GDPR Compliance**:

✅ **Data Export**:
```typescript
// User requests data export → Include wiselists
const exportData = {
  wiselists: await getWiselists(userId),
  items: await getWiselistItems(userId),
  collaborations: await getCollaboratorships(userId)
};
```

✅ **Data Deletion**:
```sql
-- ON DELETE CASCADE ensures cleanup
DELETE FROM profiles WHERE id = 'user-uuid';
→ Automatically deletes:
  - All wiselists (user_id FK)
  - All wiselist_items (via wiselist FK)
  - All wiselist_collaborators (via user_id FK)
```

✅ **Consent Tracking**:
- Public wiselist sharing requires user to toggle visibility
- Collaborator invitations require explicit acceptance
- Attribution cookie disclosed in privacy policy

---

### Security Checklist

- [x] Input validation (title max 100 chars, description max 500 chars)
- [x] SQL injection prevention (parameterized queries via Supabase)
- [x] XSS prevention (React escaping + DOMPurify on user content)
- [x] RLS policies on all tables (19 policies)
- [x] CSRF protection (Next.js built-in)
- [x] Rate limiting on wiselist creation (max 50 wiselists per user)
- [x] Slug uniqueness constraint (prevents URL collisions)
- [x] Cookie security (httpOnly, sameSite=lax)
- [ ] Audit logging for wiselist deletions (TODO)
- [ ] Report/flag abusive public wiselists (TODO)

---

## Future Enhancements

### Phase 1: Core Features (✅ Complete)

- ✅ Create/read/update/delete wiselists
- ✅ Add/remove items (profiles and listings)
- ✅ Public sharing with URL slugs
- ✅ Collaborator invitations (OWNER, EDITOR, VIEWER roles)
- ✅ Booking referrer tracking (attribution via cookies)
- ✅ CaaS integration ("total_saves" scoring)

**Completion Date**: 2025-12-13 (~80-90% complete)

---

### Phase 2: Growth Enhancements (🚧 In Progress)

**A. Wiselist Analytics Dashboard**
- Show creator: "Your list has 47 views, 12 signups, 3 bookings"
- Revenue tracking: "You've earned £65 in commissions"
- Top performing items: "Sarah Johnson was booked 8 times from your list"

**Estimated Effort**: 2 weeks
**Business Value**: Motivates creators to share more, optimize lists

---

**B. Social Sharing Integrations**
- One-click share to Twitter: "Check out my curated list of top math tutors"
- WhatsApp share button (mobile-optimized)
- Email preview cards (OpenGraph metadata)

**Estimated Effort**: 1 week
**Business Value**: Reduces sharing friction, increases viral coefficient

---

**C. Embedded Wiselist Widgets**
- Generate `<iframe>` embed code
- Creator embeds list on personal blog/website
- Drives external traffic to TutorWise

**Estimated Effort**: 3 weeks
**Business Value**: New acquisition channel (bloggers, influencers)

---

### Phase 3: Advanced Features (📋 Planned)

**A. AI-Powered List Suggestions**
- "Based on your bookings, we suggest adding these 3 tutors to 'GCSE Math'"
- Uses collaborative filtering (what similar users saved)

**Dependencies**: ML model training (6 months)

---

**B. Wiselist Templates**
- Pre-built starter lists: "Best Tutors for Dyslexic Students"
- User clicks "Use Template" → Clone list with 15 curated tutors
- Reduces cold start problem for new users

**Estimated Effort**: 2 weeks

---

**C. Wiselist Following**
- User "follows" a public wiselist → Notified when creator adds new items
- Social mechanic: "142 people follow this list"

**Estimated Effort**: 3 weeks

---

### Known Limitations

| Limitation | Impact | Workaround | Planned Fix |
|------------|--------|------------|-------------|
| Max 50 wiselists per user | Power users hit limit | Increase to 100 | v1.1 (Jan 2026) |
| No bulk item import | Can't import 50 tutors at once | Add items one-by-one | Import CSV feature (v1.2) |
| Public lists visible to all | Can't share with specific group | Use collaborators | "Shared Link" visibility (v1.3) |
| No list categories/tags | Hard to organize 50 lists | Manual naming convention | Tags/folders (v2.0) |

---

## References

### Related Documentation

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Feature overview & navigation |
| [wiselists-implementation-v2.md](./wiselists-implementation-v2.md) | Developer patterns guide |
| [wiselists-prompt-v2.md](./wiselists-prompt-v2.md) | AI assistant quick reference |
| [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | Legacy status doc (outdated) |

---

### Code Files & Locations

**Database**:
- `apps/api/migrations/081_create_wiselists_table.sql`
- `apps/api/migrations/082_create_wiselist_items_table.sql`
- `apps/api/migrations/083_create_wiselist_collaborators_table.sql`
- `apps/api/migrations/084_add_booking_referrer_to_bookings.sql`

**Service Layer**:
- `apps/web/src/lib/api/wiselists.ts` (523 lines, 11 functions)

**API Routes** (6 files):
- `apps/web/src/app/api/wiselists/route.ts`
- `apps/web/src/app/api/wiselists/[id]/route.ts`
- `apps/web/src/app/api/wiselists/[id]/items/route.ts`
- `apps/web/src/app/api/wiselists/[id]/items/[itemId]/route.ts`
- `apps/web/src/app/api/wiselists/[id]/collaborators/route.ts`
- `apps/web/src/app/api/wiselists/[id]/collaborators/[collabId]/route.ts`

**UI Components** (10 files):
- `apps/web/src/app/components/feature/wiselists/WiselistCard.tsx`
- `apps/web/src/app/components/feature/wiselists/CreateWiselistModal.tsx`
- `apps/web/src/app/components/feature/wiselists/AddToWiselistModal.tsx`
- `apps/web/src/app/components/feature/wiselists/WiselistStatsWidget.tsx`
- (6 more components)

**Pages**:
- `apps/web/src/app/(authenticated)/wiselists/page.tsx` (Hub page)
- `apps/web/src/app/w/[slug]/page.tsx` (Public wiselist page - TBD)

**TypeScript Types**:
- `apps/web/src/types/index.ts` (Wiselist, WiselistItem, WiselistCollaborator interfaces)

---

### External References

**Design Inspiration**:
- [Airbnb Wishlists](https://www.airbnb.com/wishlists) - UI/UX patterns
- [Pinterest Boards](https://www.pinterest.com/) - Collection mechanics
- [Stripe Polymorphic Sources](https://stripe.com/docs/api/sources) - Database pattern

**Research**:
- [Viral Loops in Product Design](https://www.nfx.com/post/viral-loops) - Growth theory
- [Attribution Modeling Best Practices](https://www.reforge.com/brief/attribution-modeling) - Tracking methods

---

## Appendix

### Changelog

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| v1.0 | 2025-12-14 | Initial v2 documentation (documenting existing 80-90% complete implementation) | Documentation Team |

---

### Frequently Asked Questions

**Q: Can users create wiselists without signing up?**
A: Yes! Anonymous users can create wiselists stored in localStorage. When they sign up, lists are migrated to database. This reduces friction for first-time users.

**Q: What happens if a tutor is deleted from platform?**
A: ON DELETE CASCADE removes them from all wiselists automatically. Users see "Tutor no longer available" placeholder.

**Q: Can I make money from sharing wiselists?**
A: Yes! Earn 5% commission (£20 on £400 booking) when someone books a tutor from your shared list.

**Q: How do I prevent spam collaborator invitations?**
A: Rate limit: Max 10 invitations per wiselist per day. Invited users can decline invitations.

---

**Document Status**: ✅ Active
**Next Review**: 2025-03-14
**Maintainer**: Growth Team

---

**End of Solution Design**
