# Wiselists - AI Prompt Context v1.0

**Version**: 1.0
**Purpose**: Quick reference for AI assistants (Claude Code, etc.)
**Last Updated**: 2025-12-14
**Estimated Read Time**: 10-15 minutes

---

## Table of Contents
1. [Quick Reference](#quick-reference)
2. [System Architecture](#system-architecture)
3. [Common Usage Patterns](#common-usage-patterns)
4. [Integration Points](#integration-points)
5. [DO's and DON'Ts](#dos-and-donts)
6. [Performance Best Practices](#performance-best-practices)
7. [File References](#file-references)

---

## Quick Reference

### One-Sentence Summary

Wiselists is TutorWise's viral growth engine - an Airbnb-style collections feature that enables users to save, curate, and share lists of tutors/listings to earn referral credits and commissions.

---

### Key Concepts Table

| Concept | Definition | Example |
|---------|------------|---------|
| **Wiselist** | User-created collection of tutors/listings | "Best GCSE Math Tutors London" |
| **Polymorphic Items** | Items can be PROFILE (tutor) or LISTING (service) | Save "John Smith" OR "GCSE Math Tutoring" |
| **Public Sharing** | Shareable URL (`/w/[slug]`) for viral growth | `/w/best-math-tutors-abc123` |
| **Collaboration** | Multi-user editing with roles (OWNER/EDITOR/VIEWER) | Alice invites Bob to co-edit her list |
| **Attribution Tracking** | Cookie-based tracking for commission payouts | User books from shared list → Creator earns 5% |
| **localStorage Fallback** | Anonymous users can create lists without signup | Data migrates to DB on signup |

---

### Core Service Methods

| Method | Purpose | Input | Output |
|--------|---------|-------|--------|
| `getWiselists(userId)` | Fetch user's wiselists | `userId: string` | `Wiselist[]` |
| `getWiselistBySlug(slug)` | Fetch public wiselist | `slug: string` | `Wiselist \| null` |
| `createWiselist(userId, data)` | Create new wiselist | `userId, CreateWiselistInput` | `Wiselist` |
| `updateWiselist(id, data)` | Update wiselist | `id, UpdateWiselistInput` | `Wiselist` |
| `deleteWiselist(id)` | Delete wiselist | `id: string` | `void` |
| `addItemToWiselist(wiselistId, item)` | Add tutor/listing to list | `wiselistId, AddItemInput` | `WiselistItem` |
| `removeItemFromWiselist(wiselistId, itemId)` | Remove item from list | `wiselistId, itemId` | `void` |
| `addCollaborator(wiselistId, email, role)` | Invite collaborator | `wiselistId, email, role` | `WiselistCollaborator` |
| `removeCollaborator(wiselistId, collabId)` | Remove collaborator | `wiselistId, collabId` | `void` |
| `getWiselistsFromLocalStorage()` | Fetch anonymous user's lists | (none) | `Wiselist[]` |
| `syncLocalStorageToDatabase(userId)` | Migrate lists on signup | `userId: string` | `number` (migrated count) |

**Service File**: `apps/web/src/lib/api/wiselists.ts` (523 lines)

---

### API Endpoints Quick Map

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/wiselists` | GET | List user's wiselists | Yes |
| `/api/wiselists` | POST | Create wiselist | Yes |
| `/api/wiselists/[id]` | GET | Get single wiselist | Yes |
| `/api/wiselists/[id]` | PATCH | Update wiselist | Yes |
| `/api/wiselists/[id]` | DELETE | Delete wiselist | Yes |
| `/api/wiselists/[id]/items` | POST | Add item | Yes |
| `/api/wiselists/[id]/items/[itemId]` | DELETE | Remove item | Yes |
| `/api/wiselists/[id]/collaborators` | POST | Add collaborator | Yes |
| `/api/wiselists/[id]/collaborators/[collabId]` | DELETE | Remove collaborator | Yes |

---

## System Architecture

### Database Tables

**Table 1: `wiselists`** (Main collection table)

**Key Fields**:
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to profiles (creator)
- `title` (VARCHAR 100) - Wiselist title
- `slug` (VARCHAR 150, UNIQUE) - URL-friendly slug (`/w/[slug]`)
- `description` (TEXT) - Optional description
- `visibility` (VARCHAR 20) - PRIVATE | PUBLIC
- `total_items` (INTEGER) - Denormalized count (updated by trigger)
- `total_saves` (INTEGER) - How many users saved this wiselist
- `created_at`, `updated_at` (TIMESTAMPTZ)

**RLS Policies**: 6 policies
- Users can read own wiselists
- Users can read PUBLIC wiselists
- Collaborators can read shared wiselists
- Only owners can delete
- Owners and EDITORS can update

**Migration**: `apps/api/migrations/081_create_wiselists_table.sql`

---

**Table 2: `wiselist_items`** (Polymorphic items)

**Key Fields**:
- `id` (UUID) - Primary key
- `wiselist_id` (UUID) - Foreign key to wiselists
- `item_type` (VARCHAR 20) - PROFILE | LISTING
- `profile_id` (UUID) - FK to profiles (NULL if item_type=LISTING)
- `listing_id` (UUID) - FK to listings (NULL if item_type=PROFILE)
- `position` (INTEGER) - For manual ordering
- `note` (TEXT) - User's private note
- `created_at` (TIMESTAMPTZ)

**CRITICAL CONSTRAINT**:
```sql
CHECK (
  (item_type = 'PROFILE' AND profile_id IS NOT NULL AND listing_id IS NULL) OR
  (item_type = 'LISTING' AND profile_id IS NULL AND listing_id IS NOT NULL)
)
```

**RLS Policies**: 7 policies
- Collaborators (OWNER/EDITOR) can add/remove items
- All roles can view items

**Migration**: `apps/api/migrations/082_create_wiselist_items_table.sql`

---

**Table 3: `wiselist_collaborators`** (Multi-user editing)

**Key Fields**:
- `id` (UUID) - Primary key
- `wiselist_id` (UUID) - FK to wiselists
- `user_id` (UUID) - FK to profiles (collaborator)
- `role` (VARCHAR 20) - OWNER | EDITOR | VIEWER
- `status` (VARCHAR 20) - PENDING | ACCEPTED | DECLINED
- `invited_by` (UUID) - FK to profiles (who sent invitation)
- `invited_at`, `accepted_at` (TIMESTAMPTZ)

**Roles Explained**:
- **OWNER**: Full control (delete, change visibility, manage collaborators)
- **EDITOR**: Can add/remove items, edit notes
- **VIEWER**: Read-only access to private wiselists

**RLS Policies**: 6 policies
- Only OWNER can manage collaborators
- Collaborators can view based on role
- Invitation workflow enforced

**Migration**: `apps/api/migrations/083_create_wiselist_collaborators_table.sql`

---

**Table 4: `bookings` (Attribution column added)**

**New Column**:
- `booking_referrer_id` (UUID) - FK to wiselists (nullable)

**Purpose**: Track which wiselist drove a booking for commission payout

**How it works**:
1. User clicks `/w/[slug]` → Middleware sets cookie `wiselist_referrer=[wiselist_id]`
2. User books tutor → Booking created with `booking_referrer_id` from cookie
3. After session completes → Calculate 5% commission for wiselist creator

**Migration**: `apps/api/migrations/084_add_booking_referrer_to_bookings.sql`

---

### TypeScript Types

**Core Interfaces** (in `apps/web/src/types/index.ts`):

```typescript
interface Wiselist {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description?: string;
  visibility: 'PRIVATE' | 'PUBLIC';
  total_items: number;
  total_saves: number;
  created_at: string;
  updated_at: string;
}

interface WiselistItem {
  id: string;
  wiselist_id: string;
  item_type: 'PROFILE' | 'LISTING';
  profile_id?: string;
  listing_id?: string;
  position: number;
  note?: string;
  created_at: string;
}

interface WiselistCollaborator {
  id: string;
  wiselist_id: string;
  user_id: string;
  role: 'OWNER' | 'EDITOR' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  invited_by: string;
  invited_at: string;
  accepted_at?: string;
}

interface CreateWiselistInput {
  title: string;
  description?: string;
  visibility?: 'PRIVATE' | 'PUBLIC';
}

interface UpdateWiselistInput {
  title?: string;
  description?: string;
  visibility?: 'PRIVATE' | 'PUBLIC';
}

interface AddItemInput {
  item_type: 'PROFILE' | 'LISTING';
  profile_id?: string;
  listing_id?: string;
  note?: string;
}
```

---

### Architecture Pattern

**Service Layer Pattern**:
```
UI Component
     (calls)
Service Layer (apps/web/src/lib/api/wiselists.ts)
     (uses)
Supabase Client
     (queries)
Database (with RLS)
```

**Key Principle**: All business logic lives in service layer, NOT in components or API routes.

---

## Common Usage Patterns

### Pattern 1: Create Wiselist and Add Items

**Use Case**: User creates wiselist and immediately adds 3 tutors

**Service Call**:
```typescript
// 1. Create wiselist
const wiselist = await createWiselist(userId, {
  title: 'Best Math Tutors',
  visibility: 'PUBLIC'
});

// 2. Add items
await addItemToWiselist(wiselist.id, {
  item_type: 'PROFILE',
  profile_id: 'tutor-uuid-1'
});

await addItemToWiselist(wiselist.id, {
  item_type: 'PROFILE',
  profile_id: 'tutor-uuid-2'
});

await addItemToWiselist(wiselist.id, {
  item_type: 'LISTING',
  listing_id: 'listing-uuid-1'
});
```

**Component Pattern**:
- Use React Query for caching (`useQuery(['wiselists', userId], () => getWiselists(userId))`)
- Show loading state while fetching
- Handle empty state ("No wiselists yet")
- Handle errors gracefully

**Common Gotcha**: Remember to invalidate React Query cache after mutations

---

### Pattern 2: Share Public Wiselist

**Use Case**: User shares wiselist via public link for viral growth

**Service Call**:
```typescript
// 1. Update visibility
await updateWiselist(wiselistId, { visibility: 'PUBLIC' });

// 2. Get shareable URL
const shareUrl = `${window.location.origin}/w/${wiselist.slug}`;

// 3. Copy to clipboard
navigator.clipboard.writeText(shareUrl);
```

**Middleware Attribution Flow**:
1. Viewer clicks `/w/[slug]`
2. Middleware sets cookie: `wiselist_referrer=[wiselist_id]` (expires in 7 days)
3. Viewer browses tutors, then books one
4. Booking created with `booking_referrer_id` from cookie
5. Creator earns 5% commission

**Common Gotcha**: Cookie must have correct domain (`.tutorwise.com`) to work on all subdomains

---

### Pattern 3: Invite Collaborators

**Use Case**: User invites friends to co-edit wiselist

**Service Call**:
```typescript
// Invite as EDITOR (can add/remove items)
await addCollaborator(wiselistId, 'alice@example.com', 'EDITOR');

// Invite as VIEWER (read-only)
await addCollaborator(wiselistId, 'bob@example.com', 'VIEWER');
```

**Invitation Flow**:
1. System checks if email is registered user
2. If YES: Create collaborator record with `user_id`, send email notification
3. If NO: Create pending invitation, send signup link with invitation token
4. Recipient clicks "Accept" → Status changes to ACCEPTED
5. Recipient can now access wiselist based on role

**Error Handling**:
- Catch duplicate invitations (UNIQUE constraint on `wiselist_id, user_id`)
- Show user-friendly error: "Alice is already a collaborator"

---

### Pattern 4: Migrate Anonymous User's Wiselists

**Use Case**: User creates lists while anonymous, then signs up

**Service Call**:
```typescript
// In signup completion handler
const migratedCount = await syncLocalStorageToDatabase(user.id);

if (migratedCount > 0) {
  toast.success(`Migrated ${migratedCount} wiselist(s) to your account!`);
}
```

**localStorage Pattern**:
```typescript
// Before signup: Store in localStorage
const localWiselists = getWiselistsFromLocalStorage();
// Returns: Array of wiselists stored in browser

// After signup: Migrate to database
await syncLocalStorageToDatabase(userId);
// Creates wiselists in DB, clears localStorage
```

**Common Gotcha**: localStorage wiselists don't have `id` or `user_id` - generate on migration

---

## Integration Points

### Integration 1: Referrals v4.3

**What it does**: Track new user signups from wiselist sharing

**When it triggers**: When user signs up via wiselist share link

**Data flow**:
```
Wiselist Share → Friend Clicks /w/[slug] → Friend Signs Up → Referral Created
```

**Code location**: `apps/web/src/lib/api/referrals.ts:createReferral()`

**Common pattern**:
```typescript
// After creating user account
const referralData = {
  referrer_id: wiselist.user_id,  // Wiselist creator
  referred_id: newUser.id,         // Friend who signed up
  referral_source: 'WISELIST_SHARE',
  metadata: {
    wiselist_id: wiselist.id,
    wiselist_slug: wiselist.slug
  }
};

await createReferral(referralData);

// Award credits
await awardReferralCredit(wiselist.user_id, 10);  // £10 to creator
await awardWelcomeCredit(newUser.id, 5);          // £5 to new user
```

---

### Integration 2: CaaS v5.5

**What it does**: "Total Saves" increases tutor search ranking

**When it triggers**: When user adds PROFILE item to wiselist

**Data flow**:
```
User Saves Tutor → DB Trigger Increments total_saves → CaaS Recalc Queued → Score Updated
```

**Database Trigger** (automatic):
```sql
CREATE TRIGGER wiselist_items_save_count
AFTER INSERT ON wiselist_items
FOR EACH ROW
WHEN (NEW.item_type = 'PROFILE')
EXECUTE FUNCTION increment_profile_save_count();
```

**CaaS Scoring**:
- 0.5 points per save
- Max 10 points from saves (capped at 20 saves)

**File location**: `apps/api/caas/strategies/TutorCaaSStrategy.ts:calculateNetworkTrust()`

---

### Integration 3: Payments v4.9

**What it does**: Commission payouts for wiselist creators

**When it triggers**: After booking session completes (7 days later)

**Data flow**:
```
Booking Completed → Detect booking_referrer_id → Calculate 5% → Queue Payout
```

**Commission Calculation**:
```typescript
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
```

**Error handling**: If wiselist deleted, booking referrer stays (historical data)

---

### Integration 4: Profile Graph v4.6 (Future)

**What it does**: Show mutual connections on shared wiselists

**When it triggers**: When viewing public wiselist

**Status**: Profile Graph API ready, wiselist UI integration pending

---

## DO's and DON'Ts

### ✅ DO

**1. Use service layer functions for all wiselist operations**

```typescript
// ✅ GOOD: Use service layer
import { createWiselist } from '@/lib/api/wiselists';
const wiselist = await createWiselist(userId, { title: 'Math Tutors' });

// ❌ BAD: Direct Supabase query in component
const { data } = await supabase.from('wiselists').insert({...});
```

**Rationale**: Service layer encapsulates business logic (slug generation, validation, triggers)

---

**2. Always validate polymorphic item type before adding**

```typescript
// ✅ GOOD: Validate first
if (itemType === 'PROFILE' && !profileId) {
  throw new Error('profile_id required for PROFILE items');
}
await addItemToWiselist(wiselistId, { item_type: 'PROFILE', profile_id: profileId });

// ❌ BAD: Trust user input blindly
await addItemToWiselist(wiselistId, data);  // Database constraint fails
```

**Rationale**: Database constraint will reject invalid data, but validation gives clear error message

---

**3. Handle anonymous users with localStorage fallback**

```typescript
// ✅ GOOD: Check if user is authenticated
const wiselists = userId
  ? await getWiselists(userId)
  : getWiselistsFromLocalStorage();

// ❌ BAD: Require login before creating wiselists
if (!userId) {
  return redirect('/signin');  // High drop-off rate
}
```

**Rationale**: Reduces friction for first-time users, increases conversion

---

**4. Invalidate React Query cache after mutations**

```typescript
// ✅ GOOD: Invalidate cache
await addItemToWiselist(wiselistId, item);
queryClient.invalidateQueries(['wiselists', userId]);
queryClient.invalidateQueries(['wiselist', wiselistId]);

// ❌ BAD: Don't invalidate
await addItemToWiselist(wiselistId, item);
// UI still shows old data until manual refresh
```

**Rationale**: Keeps UI in sync with database state

---

**5. Set cookie with correct domain for attribution**

```typescript
// ✅ GOOD: Set domain for all subdomains
response.cookies.set('wiselist_referrer', wiselistId, {
  maxAge: 60 * 60 * 24 * 7,
  path: '/',
  domain: '.tutorwise.com',  // Works on www and apex
  httpOnly: true,
  sameSite: 'lax'
});

// ❌ BAD: No domain (only works on current subdomain)
response.cookies.set('wiselist_referrer', wiselistId, {
  maxAge: 60 * 60 * 24 * 7
});
```

**Rationale**: Attribution tracking breaks if user navigates between `www.` and apex domain

---

### ❌ DON'T

**1. Don't bypass the service layer**

```typescript
// ❌ BAD: Direct database access from component
const { data } = await supabase.from('wiselists').select('*');

// ✅ GOOD: Use service layer
const wiselists = await getWiselists(userId);
```

**Rationale**: Service layer ensures consistent business logic application

---

**2. Don't forget to check collaboration permissions**

```typescript
// ❌ BAD: Assume user can edit
await addItemToWiselist(wiselistId, item);  // RLS will reject if no permission

// ✅ GOOD: Check permission first
const collaborator = await getCollaborator(wiselistId, userId);
if (!collaborator || collaborator.role === 'VIEWER') {
  throw new Error('You don not have permission to edit this wiselist');
}
await addItemToWiselist(wiselistId, item);
```

**Rationale**: RLS enforces security, but checking first gives better UX

---

**3. Don't hardcode magic numbers**

```typescript
// ❌ BAD: Magic number
if (wiselists.length > 50) { ... }

// ✅ GOOD: Named constant
const MAX_WISELISTS_PER_USER = 50;
if (wiselists.length > MAX_WISELISTS_PER_USER) { ... }
```

**Rationale**: Makes code self-documenting and easier to maintain

---

**4. Don't ignore polymorphic constraint errors**

```typescript
// ❌ BAD: Silent failure
try {
  await addItemToWiselist(wiselistId, item);
} catch (error) {
  // Nothing happens, user doesn't know it failed
}

// ✅ GOOD: Handle error
try {
  await addItemToWiselist(wiselistId, item);
} catch (error) {
  if (error.message.includes('CHECK constraint')) {
    toast.error('Invalid item type - must be PROFILE or LISTING');
  } else {
    toast.error('Failed to add item: ' + error.message);
  }
  console.error(error);
}
```

**Rationale**: Users need feedback, developers need error visibility

---

**5. Don't make unnecessary API calls**

```typescript
// ❌ BAD: Fetch on every render
function Component() {
  const wiselists = await getWiselists(userId);  // Runs every render!

// ✅ GOOD: Use React Query caching
function Component() {
  const { data: wiselists } = useQuery(['wiselists', userId], () => getWiselists(userId));
```

**Rationale**: Reduces server load, improves performance, better UX

---

**6. Don't forget to update denormalized counts**

```typescript
// ❌ BAD: Manual count update (easy to forget)
await addItemToWiselist(wiselistId, item);
await supabase.from('wiselists').update({ total_items: count + 1 });

// ✅ GOOD: Use database trigger (automatic)
await addItemToWiselist(wiselistId, item);
// Trigger handles count update automatically
```

**Rationale**: Database triggers ensure consistency, prevent bugs

---

## Performance Best Practices

### Database Queries

**1. Use selective field retrieval**
- ✅ `select('id, title, slug, total_items')` - Only needed fields
- ❌ `select('*')` - Everything (wasteful)

**2. Add pagination for large wiselists**
- Default: 20 items per page
- Use `.range(offset, offset + limit - 1)` for pagination
- Prevents slow queries on wiselists with 100+ items

**3. Leverage indexes**
- Queries on `user_id`, `slug`, `visibility` are indexed
- Partial index on `visibility WHERE visibility = 'PUBLIC'`
- Don't filter on unindexed fields

---

### Caching Strategy

**React Query defaults**:
- `staleTime`: 5 minutes (data considered fresh)
- `cacheTime`: 10 minutes (cache retained)

**When to invalidate cache**:
- After creating: `queryClient.invalidateQueries(['wiselists', userId])`
- After updating: `queryClient.invalidateQueries(['wiselist', wiselistId])`
- After deleting: `queryClient.invalidateQueries(['wiselists'])`

---

### Component Optimization

**1. Memoize expensive computations**
```typescript
const sortedItems = useMemo(
  () => items.sort((a, b) => a.position - b.position),
  [items]
);
```

**2. Avoid inline function definitions in renders**
```typescript
// ❌ Creates new function every render
<Button onClick={() => handleDelete(id)} />

// ✅ Stable callback reference
const handleButtonClick = useCallback(() => handleDelete(id), [id]);
<Button onClick={handleButtonClick} />
```

---

## File References

### Quick Navigation

| File Type | Path | Purpose |
|-----------|------|---------|
| **Service Layer** | `apps/web/src/lib/api/wiselists.ts` | Core business logic (523 lines, 11 functions) |
| **API Routes** | `apps/web/src/app/api/wiselists/` | 6 REST endpoint files |
| **Types** | `apps/web/src/types/index.ts` | TypeScript interfaces (Wiselist, WiselistItem, etc.) |
| **Components** | `apps/web/src/app/components/feature/wiselists/` | 10 UI components |
| **Database** | `apps/api/migrations/081-084_*.sql` | 4 migration files |
| **Pages** | `apps/web/src/app/(authenticated)/wiselists/page.tsx` | Hub page |
| **Public Page** | `apps/web/src/app/w/[slug]/page.tsx` | Public wiselist page (WIP) |

---

### Detailed File Map

**For full file references**, see:
- [Solution Design v2](./wiselists-solution-design-v2.md) - Architecture details
- [Implementation Guide v2](./wiselists-implementation-v2.md) - How-to patterns
- [README.md](./README.md) - Complete file listing

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Title required, max 100 chars" | Invalid title input | Check title length before calling `createWiselist()` |
| "profile_id required for PROFILE item type" | Missing profile_id when item_type=PROFILE | Validate item type matches ID field |
| "CHECK constraint wiselist_items_polymorphic_check" | Both profile_id AND listing_id set (or both null) | Ensure exactly one ID is set based on item_type |
| "UNIQUE constraint wiselist_items_unique_item" | Duplicate item in wiselist | Check if item exists before adding |
| "Only owner can invite collaborators" | Non-owner trying to add collaborator | Check user is wiselist.user_id before calling `addCollaborator()` |

---

## Metadata Schemas

### Wiselist Attribution Metadata (JSONB field)

**Purpose**: Store UTM parameters and social share data

**Schema** (TypeScript):
```typescript
interface AttributionMetadata {
  utm_source?: string;       // 'twitter', 'whatsapp', 'email'
  utm_medium?: string;        // 'social', 'email', 'direct'
  utm_campaign?: string;      // Custom campaign name
  referrer_url?: string;      // HTTP referer
  user_agent?: string;        // Browser/device info
}
```

**Common uses**:
- Track which social platform drives most bookings
- Measure campaign effectiveness
- Analyze device/browser trends

**Gotcha**: Don't use for PII (personal identifiable information)

---

## Related Features

| Feature | Relationship | Integration Point |
|---------|--------------|-------------------|
| **Referrals v4.3** | Referral tracking | Wiselist shares create referrals |
| **CaaS v5.5** | Search ranking | total_saves boosts tutor credibility score |
| **Payments v4.9** | Commission payouts | booking_referrer_id tracks attribution |
| **Profile Graph v4.6** | Social connections | Shows mutual connections (future) |

**For details**, see [Integration Points](#integration-points) section above.

---

## Quick Checklist for AI Code Generation

When generating code for wiselists:

- [ ] Use service layer functions, not direct Supabase queries
- [ ] Include proper TypeScript types from `@/types`
- [ ] Add loading/error/empty states in UI
- [ ] Use React Query for server state
- [ ] Validate polymorphic item type before database operations
- [ ] Check user permissions (even though RLS will enforce)
- [ ] Handle errors gracefully with user-friendly messages
- [ ] Follow existing component patterns (see Components file)
- [ ] Invalidate React Query cache after mutations
- [ ] Set cookies with correct domain for attribution tracking

---

**Document Version**: v1.0
**Last Updated**: 2025-12-14
**Maintainer**: Growth Team

---

**For Deeper Understanding**:
- Read: [Solution Design v2](./wiselists-solution-design-v2.md) for architecture
- Read: [Implementation Guide v2](./wiselists-implementation-v2.md) for patterns
- Browse: Code files listed in [File References](#file-references)

---

**End of AI Prompt Context**
