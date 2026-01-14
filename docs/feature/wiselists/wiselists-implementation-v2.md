# Wiselists Implementation Guide v1.0
**Developer Guide: Building and Extending the Wiselists Feature**

**Version**: 1.0
**Audience**: Backend Engineers, Frontend Engineers
**Last Updated**: 2025-12-14

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Patterns](#architecture-patterns)
3. [How to Add a New Item Type](#how-to-add-a-new-item-type)
4. [How to Add a New Collaboration Role](#how-to-add-a-new-collaboration-role)
5. [How to Extend Attribution Tracking](#how-to-extend-attribution-tracking)
6. [Common Usage Patterns](#common-usage-patterns)
7. [Testing Strategies](#testing-strategies)
8. [Deployment Checklist](#deployment-checklist)
9. [Common Pitfalls & Solutions](#common-pitfalls--solutions)

---

## Quick Start

### Prerequisites

**Required Environment Variables**:

```bash
# Database connection
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Attribution tracking
WISELIST_COOKIE_MAX_AGE=604800  # 7 days in seconds

# Feature flags (optional)
ENABLE_WISELIST_ANALYTICS=true
ENABLE_SOCIAL_SHARING=false  # Coming in Phase 2
```

**Database Setup**:

Run migrations in order:
```bash
# From project root
cd apps/api

# 1. Create wiselists table
npm run migrate -- 081

# 2. Create wiselist_items table (polymorphic)
npm run migrate -- 082

# 3. Create wiselist_collaborators table
npm run migrate -- 083

# 4. Add booking_referrer_id to bookings
npm run migrate -- 084
```

**Verify Installation**:

```bash
# Check tables exist
psql $DATABASE_URL -c "\dt wiselist*"

# Expected output:
#  public | wiselists
#  public | wiselist_items
#  public | wiselist_collaborators

# Check RLS policies
psql $DATABASE_URL -c "SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'wiselist%';"

# Expected: 19 policies across 3 tables
```

---

## Architecture Patterns

### Pattern 1: Service Layer with Domain Helpers

**Problem**: Wiselists need complex business logic (polymorphic items, collaborator invitations, attribution tracking) that shouldn't live in API routes or UI components.

**Solution**: Encapsulate all business logic in service layer (`apps/web/src/lib/api/wiselists.ts`)

**Structure**:

```
API Route (Thin Adapter)
    ↓
Service Layer (Business Logic)
    ├─→ getWiselists()
    ├─→ createWiselist()
    ├─→ addItemToWiselist()
    ├─→ addCollaborator()
    └─→ Domain Helpers
           ├─→ generateSlug()
           ├─→ validateItemType()
           └─→ sendCollaboratorInvite()
    ↓
Supabase Client (Database Access)
```

**Example**:

```typescript
// API Route: apps/web/src/app/api/wiselists/route.ts
export async function POST(request: Request) {
  const session = await getSession();
  const data = await request.json();

  // Thin adapter - just call service layer
  const wiselist = await createWiselist(session.user.id, data);

  return NextResponse.json(wiselist);
}

// Service Layer: apps/web/src/lib/api/wiselists.ts
export async function createWiselist(
  userId: string,
  data: CreateWiselistInput
): Promise<Wiselist> {
  // 1. Validate input
  if (!data.title || data.title.length > 100) {
    throw new Error('Title required, max 100 chars');
  }

  // 2. Generate unique slug
  const slug = await generateSlug(data.title);

  // 3. Create wiselist in database
  const { data: wiselist, error } = await supabase
    .from('wiselists')
    .insert({
      user_id: userId,
      title: data.title,
      slug,
      visibility: data.visibility || 'PRIVATE'
    })
    .select()
    .single();

  if (error) throw error;

  // 4. Return created wiselist
  return wiselist;
}
```

**Why this pattern?**
- ✅ **Testability**: Pure functions easy to unit test
- ✅ **Reusability**: Same logic for API routes AND Server Actions
- ✅ **Maintainability**: Single source of truth for business logic

---

### Pattern 2: Polymorphic Data Model

**Problem**: Users want to save two types of content to wiselists:
1. **Profiles** (tutors)
2. **Listings** (specific services)

**Solution**: Single `wiselist_items` table with polymorphic foreign keys

**Database Constraint**:

```sql
ALTER TABLE wiselist_items
  ADD CONSTRAINT wiselist_items_polymorphic_check
  CHECK (
    (item_type = 'PROFILE' AND profile_id IS NOT NULL AND listing_id IS NULL) OR
    (item_type = 'LISTING' AND profile_id IS NULL AND listing_id IS NOT NULL)
  );
```

**Service Layer Pattern**:

```typescript
export async function addItemToWiselist(
  wiselistId: string,
  item: AddItemInput
): Promise<WiselistItem> {
  // 1. Validate item type
  if (item.item_type === 'PROFILE' && !item.profile_id) {
    throw new Error('profile_id required for PROFILE item type');
  }
  if (item.item_type === 'LISTING' && !item.listing_id) {
    throw new Error('listing_id required for LISTING item type');
  }

  // 2. Insert with correct nulls
  const { data, error } = await supabase
    .from('wiselist_items')
    .insert({
      wiselist_id: wiselistId,
      item_type: item.item_type,
      profile_id: item.item_type === 'PROFILE' ? item.profile_id : null,
      listing_id: item.item_type === 'LISTING' ? item.listing_id : null,
      note: item.note || null
    })
    .select()
    .single();

  if (error) throw error;

  // 3. Update denormalized count
  await incrementItemCount(wiselistId);

  return data;
}
```

**Query Pattern** (Fetch items with polymorphic join):

```typescript
export async function getWiselistItems(wiselistId: string): Promise<WiselistItem[]> {
  const { data, error } = await supabase
    .from('wiselist_items')
    .select(`
      id,
      item_type,
      position,
      note,
      created_at,
      profile:profiles!wiselist_items_profile_id_fkey (
        id,
        name,
        avatar_url,
        total_saves
      ),
      listing:listings!wiselist_items_listing_id_fkey (
        id,
        title,
        image_url,
        price
      )
    `)
    .eq('wiselist_id', wiselistId)
    .order('position', { ascending: true });

  if (error) throw error;

  // Transform into unified format
  return data.map(item => ({
    ...item,
    content: item.item_type === 'PROFILE' ? item.profile : item.listing
  }));
}
```

---

### Pattern 3: localStorage Fallback for Anonymous Users

**Problem**: Requiring signup before creating wiselists creates friction (user loses research progress)

**Solution**: Store wiselists in localStorage for anonymous users, migrate to database on signup

**Implementation**:

```typescript
// Check if user is authenticated
export async function getWiselists(userId?: string): Promise<Wiselist[]> {
  if (!userId) {
    // Anonymous user - fetch from localStorage
    return getWiselistsFromLocalStorage();
  }

  // Authenticated user - fetch from database
  const { data, error } = await supabase
    .from('wiselists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// localStorage utilities
function getWiselistsFromLocalStorage(): Wiselist[] {
  const stored = localStorage.getItem('wiselists');
  if (!stored) return [];

  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveWiselistsToLocalStorage(wiselists: Wiselist[]) {
  localStorage.setItem('wiselists', JSON.stringify(wiselists));
}

// Migration on signup
export async function syncLocalStorageToDatabase(userId: string): Promise<void> {
  const localWiselists = getWiselistsFromLocalStorage();

  if (localWiselists.length === 0) return;

  // Bulk insert into database
  const { error } = await supabase
    .from('wiselists')
    .insert(
      localWiselists.map(wl => ({
        user_id: userId,
        title: wl.title,
        description: wl.description,
        visibility: 'PRIVATE', // Default to private on migration
        slug: wl.slug || generateSlug(wl.title)
      }))
    );

  if (error) {
    console.error('Failed to migrate wiselists:', error);
    return;
  }

  // Clear localStorage after successful migration
  localStorage.removeItem('wiselists');
}
```

**When to call migration**:

```typescript
// In signup completion handler
async function handleSignupComplete(user: User) {
  // ... other signup logic

  // Migrate localStorage wiselists to database
  await syncLocalStorageToDatabase(user.id);

  // Redirect to wiselists hub
  router.push('/wiselists');
}
```

---

## How to Add a New Item Type

**Scenario**: You want to allow users to save "COURSE" items (in addition to PROFILE and LISTING)

**Estimated Effort**: 2 hours

---

### Step 1: Update Database Constraint (15 minutes)

**File**: Create new migration `apps/api/migrations/XXX_add_course_item_type.sql`

```sql
-- 1. Add course_id column
ALTER TABLE wiselist_items
  ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- 2. Add index for course lookups
CREATE INDEX idx_wiselist_items_course_id
  ON wiselist_items(course_id)
  WHERE course_id IS NOT NULL;

-- 3. Update polymorphic constraint
ALTER TABLE wiselist_items
  DROP CONSTRAINT wiselist_items_polymorphic_check;

ALTER TABLE wiselist_items
  ADD CONSTRAINT wiselist_items_polymorphic_check
  CHECK (
    (item_type = 'PROFILE' AND profile_id IS NOT NULL AND listing_id IS NULL AND course_id IS NULL) OR
    (item_type = 'LISTING' AND profile_id IS NULL AND listing_id IS NOT NULL AND course_id IS NULL) OR
    (item_type = 'COURSE' AND profile_id IS NULL AND listing_id IS NULL AND course_id IS NOT NULL)
  );
```

**Run migration**:
```bash
npm run migrate:up
```

---

### Step 2: Update TypeScript Types (10 minutes)

**File**: `apps/web/src/types/index.ts`

```typescript
// Before:
export type WiselistItemType = 'PROFILE' | 'LISTING';

// After:
export type WiselistItemType = 'PROFILE' | 'LISTING' | 'COURSE';

// Update interface
export interface WiselistItem {
  id: string;
  wiselist_id: string;
  item_type: WiselistItemType;
  profile_id?: string;
  listing_id?: string;
  course_id?: string;  // NEW
  position: number;
  note?: string;
  created_at: string;
}

// Update input type
export interface AddItemInput {
  item_type: WiselistItemType;
  profile_id?: string;
  listing_id?: string;
  course_id?: string;  // NEW
  note?: string;
}
```

---

### Step 3: Update Service Layer (30 minutes)

**File**: `apps/web/src/lib/api/wiselists.ts`

```typescript
export async function addItemToWiselist(
  wiselistId: string,
  item: AddItemInput
): Promise<WiselistItem> {
  // 1. Validate item type (add COURSE case)
  if (item.item_type === 'PROFILE' && !item.profile_id) {
    throw new Error('profile_id required for PROFILE item type');
  }
  if (item.item_type === 'LISTING' && !item.listing_id) {
    throw new Error('listing_id required for LISTING item type');
  }
  // NEW: Validate COURSE
  if (item.item_type === 'COURSE' && !item.course_id) {
    throw new Error('course_id required for COURSE item type');
  }

  // 2. Insert with correct nulls
  const { data, error } = await supabase
    .from('wiselist_items')
    .insert({
      wiselist_id: wiselistId,
      item_type: item.item_type,
      profile_id: item.item_type === 'PROFILE' ? item.profile_id : null,
      listing_id: item.item_type === 'LISTING' ? item.listing_id : null,
      course_id: item.item_type === 'COURSE' ? item.course_id : null,  // NEW
      note: item.note || null
    })
    .select()
    .single();

  if (error) throw error;

  // 3. Update denormalized count
  await incrementItemCount(wiselistId);

  // 4. Trigger save count (if applicable for courses)
  if (item.item_type === 'COURSE') {
    await incrementCourseSaveCount(item.course_id);
  }

  return data;
}

// Update query to include courses
export async function getWiselistItems(wiselistId: string): Promise<WiselistItem[]> {
  const { data, error } = await supabase
    .from('wiselist_items')
    .select(`
      *,
      profile:profiles!wiselist_items_profile_id_fkey (*),
      listing:listings!wiselist_items_listing_id_fkey (*),
      course:courses!wiselist_items_course_id_fkey (*)  -- NEW
    `)
    .eq('wiselist_id', wiselistId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data;
}
```

---

### Step 4: Update UI Components (45 minutes)

**File**: `apps/web/src/app/components/feature/wiselists/AddToWiselistModal.tsx`

```typescript
export function AddToWiselistModal({ item }: Props) {
  // Detect item type from props
  const itemType: WiselistItemType = item.profile_id
    ? 'PROFILE'
    : item.listing_id
    ? 'LISTING'
    : item.course_id
    ? 'COURSE'  // NEW
    : null;

  const handleAddItem = async (wiselistId: string) => {
    await addItemToWiselist(wiselistId, {
      item_type: itemType,
      profile_id: item.profile_id,
      listing_id: item.listing_id,
      course_id: item.course_id,  // NEW
    });

    toast.success('Added to wiselist!');
  };

  // ... rest of component
}
```

**File**: `apps/web/src/app/components/feature/wiselists/WiselistItemCard.tsx`

```typescript
export function WiselistItemCard({ item }: Props) {
  const displayData = item.item_type === 'PROFILE'
    ? item.profile
    : item.item_type === 'LISTING'
    ? item.listing
    : item.course;  // NEW

  const imageUrl = item.item_type === 'PROFILE'
    ? displayData?.avatar_url
    : item.item_type === 'LISTING'
    ? displayData?.image_url
    : displayData?.thumbnail_url;  // NEW

  // ... rest of component
}
```

---

### Step 5: Testing (20 minutes)

**Tests to Write**:

```typescript
// __tests__/wiselists.test.ts

describe('addItemToWiselist with COURSE type', () => {
  it('should add course to wiselist', async () => {
    const wiselist = await createWiselist(userId, { title: 'Test' });
    const course = await createCourse({ title: 'Test Course' });

    const item = await addItemToWiselist(wiselist.id, {
      item_type: 'COURSE',
      course_id: course.id
    });

    expect(item.item_type).toBe('COURSE');
    expect(item.course_id).toBe(course.id);
    expect(item.profile_id).toBeNull();
    expect(item.listing_id).toBeNull();
  });

  it('should reject COURSE without course_id', async () => {
    await expect(
      addItemToWiselist(wiselistId, { item_type: 'COURSE' })
    ).rejects.toThrow('course_id required');
  });

  it('should reject COURSE with multiple IDs', async () => {
    await expect(
      addItemToWiselist(wiselistId, {
        item_type: 'COURSE',
        course_id: 'uuid-1',
        profile_id: 'uuid-2'  // Invalid - both set
      })
    ).rejects.toThrow('CHECK constraint');
  });
});
```

**Manual Testing Checklist**:
- [ ] Create wiselist
- [ ] Add COURSE item to wiselist
- [ ] View wiselist items (course displays correctly)
- [ ] Remove COURSE item
- [ ] Verify course save count incremented
- [ ] Test polymorphic query (fetch PROFILE, LISTING, COURSE items together)

---

## How to Add a New Collaboration Role

**Scenario**: You want to add "MODERATOR" role (between EDITOR and OWNER)

**Estimated Effort**: 1 hour

---

### Step 1: Update Database Enum (10 minutes)

```sql
-- Migration: XXX_add_moderator_role.sql
ALTER TABLE wiselist_collaborators
  DROP CONSTRAINT IF EXISTS wiselist_collaborators_role_check;

ALTER TABLE wiselist_collaborators
  ADD CONSTRAINT wiselist_collaborators_role_check
  CHECK (role IN ('OWNER', 'MODERATOR', 'EDITOR', 'VIEWER'));
```

---

### Step 2: Update Types (5 minutes)

```typescript
// apps/web/src/types/index.ts

export type CollaboratorRole = 'OWNER' | 'MODERATOR' | 'EDITOR' | 'VIEWER';
```

---

### Step 3: Update RLS Policies (20 minutes)

```sql
-- Grant MODERATOR permission to manage collaborators (but not delete wiselist)

CREATE POLICY "moderators_can_manage_collaborators"
ON wiselist_collaborators FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM wiselist_collaborators
    WHERE wiselist_id = wiselist_collaborators.wiselist_id
    AND user_id = auth.uid()
    AND role IN ('OWNER', 'MODERATOR')  -- NEW: Include MODERATOR
    AND status = 'ACCEPTED'
  )
);

-- MODERATOR can change visibility (EDITOR cannot)
CREATE POLICY "moderators_can_update_visibility"
ON wiselists FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM wiselist_collaborators
    WHERE wiselist_id = wiselists.id
    AND user_id = auth.uid()
    AND role IN ('OWNER', 'MODERATOR')  -- NEW
    AND status = 'ACCEPTED'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM wiselist_collaborators
    WHERE wiselist_id = wiselists.id
    AND user_id = auth.uid()
    AND role IN ('OWNER', 'MODERATOR')
    AND status = 'ACCEPTED'
  )
);
```

---

### Step 4: Update Permission Matrix (15 minutes)

**File**: `apps/web/src/lib/permissions/wiselists.ts`

```typescript
export function canDeleteWiselist(
  wiselist: Wiselist,
  userId: string,
  role?: CollaboratorRole
): boolean {
  // Only OWNER can delete
  return wiselist.user_id === userId || role === 'OWNER';
}

export function canManageCollaborators(
  wiselist: Wiselist,
  userId: string,
  role?: CollaboratorRole
): boolean {
  // OWNER and MODERATOR can manage collaborators
  return (
    wiselist.user_id === userId ||
    role === 'OWNER' ||
    role === 'MODERATOR'  // NEW
  );
}

export function canChangeVisibility(
  wiselist: Wiselist,
  userId: string,
  role?: CollaboratorRole
): boolean {
  // OWNER and MODERATOR can change visibility
  return (
    wiselist.user_id === userId ||
    role === 'OWNER' ||
    role === 'MODERATOR'  // NEW
  );
}

export function canEditItems(
  wiselist: Wiselist,
  userId: string,
  role?: CollaboratorRole
): boolean {
  // OWNER, MODERATOR, and EDITOR can edit items
  return (
    wiselist.user_id === userId ||
    role === 'OWNER' ||
    role === 'MODERATOR' ||  // NEW
    role === 'EDITOR'
  );
}

export function canViewWiselist(
  wiselist: Wiselist,
  userId: string,
  role?: CollaboratorRole
): boolean {
  // All roles can view
  return (
    wiselist.visibility === 'PUBLIC' ||
    wiselist.user_id === userId ||
    role !== undefined
  );
}
```

---

### Step 5: Update UI (10 minutes)

**File**: `apps/web/src/app/components/feature/wiselists/CollaboratorRoleSelector.tsx`

```typescript
export function CollaboratorRoleSelector({ onChange }: Props) {
  return (
    <select onChange={e => onChange(e.target.value as CollaboratorRole)}>
      <option value="VIEWER">Viewer (Read only)</option>
      <option value="EDITOR">Editor (Can add/remove items)</option>
      <option value="MODERATOR">Moderator (Can manage collaborators)</option>  {/* NEW */}
      <option value="OWNER">Owner (Full control)</option>
    </select>
  );
}
```

---

## How to Extend Attribution Tracking

**Scenario**: You want to track attribution from social media shares (in addition to direct link clicks)

**Estimated Effort**: 3 hours

---

### Step 1: Update Database Schema (15 minutes)

```sql
-- Migration: XXX_add_attribution_source.sql

ALTER TABLE bookings
  ADD COLUMN attribution_source VARCHAR(50),  -- 'DIRECT_LINK' | 'TWITTER' | 'WHATSAPP' | 'EMAIL'
  ADD COLUMN attribution_metadata JSONB;       -- Store UTM params, social share ID, etc.

CREATE INDEX idx_bookings_attribution_source
  ON bookings(attribution_source)
  WHERE attribution_source IS NOT NULL;
```

---

### Step 2: Update Middleware (1 hour)

**File**: `apps/web/middleware.ts`

```typescript
export async function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Detect wiselist public page
  if (url.pathname.startsWith('/w/')) {
    const slug = url.pathname.replace('/w/', '');

    // Parse UTM parameters
    const utmSource = url.searchParams.get('utm_source');      // 'twitter', 'whatsapp', 'email'
    const utmMedium = url.searchParams.get('utm_medium');      // 'social', 'email', 'direct'
    const utmCampaign = url.searchParams.get('utm_campaign');  // Custom campaign name

    // Detect attribution source
    const attributionSource = utmSource === 'twitter'
      ? 'TWITTER'
      : utmSource === 'whatsapp'
      ? 'WHATSAPP'
      : utmSource === 'email'
      ? 'EMAIL'
      : 'DIRECT_LINK';

    const wiselist = await getWiselistBySlug(slug);

    if (wiselist) {
      const response = NextResponse.next();

      // Set wiselist referrer cookie (same as before)
      response.cookies.set('wiselist_referrer', wiselist.id, {
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        httpOnly: true,
        sameSite: 'lax'
      });

      // NEW: Set attribution source cookie
      response.cookies.set('wiselist_attribution_source', attributionSource, {
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
        httpOnly: true,
        sameSite: 'lax'
      });

      // NEW: Set attribution metadata cookie
      if (utmSource || utmMedium || utmCampaign) {
        const metadata = {
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          referrer_url: request.headers.get('referer') || null,
          user_agent: request.headers.get('user-agent') || null
        };

        response.cookies.set('wiselist_attribution_metadata', JSON.stringify(metadata), {
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
          httpOnly: true,
          sameSite: 'lax'
        });
      }

      return response;
    }
  }

  return NextResponse.next();
}
```

---

### Step 3: Update Booking Creation (30 minutes)

**File**: `apps/web/src/app/api/bookings/route.ts`

```typescript
export async function POST(request: Request) {
  const wiselistReferrer = request.cookies.get('wiselist_referrer')?.value;
  const attributionSource = request.cookies.get('wiselist_attribution_source')?.value;
  const attributionMetadata = request.cookies.get('wiselist_attribution_metadata')?.value;

  const booking = await createBooking({
    tutor_id: tutorId,
    client_id: clientId,
    total_amount: 400,
    booking_referrer_id: wiselistReferrer || null,
    attribution_source: attributionSource || 'DIRECT',  // NEW
    attribution_metadata: attributionMetadata ? JSON.parse(attributionMetadata) : null,  // NEW
  });

  return NextResponse.json(booking);
}
```

---

### Step 4: Add Social Share Buttons (1 hour)

**File**: `apps/web/src/app/components/feature/wiselists/WiselistShareButton.tsx`

```typescript
export function WiselistShareButton({ wiselist }: Props) {
  const baseUrl = `${window.location.origin}/w/${wiselist.slug}`;

  const shareUrls = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(wiselist.title)}&url=${encodeURIComponent(baseUrl + '?utm_source=twitter&utm_medium=social&utm_campaign=wiselist_share')}`,

    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(wiselist.title + ' ' + baseUrl + '?utm_source=whatsapp&utm_medium=social&utm_campaign=wiselist_share')}`,

    email: `mailto:?subject=${encodeURIComponent(wiselist.title)}&body=${encodeURIComponent('Check out this list: ' + baseUrl + '?utm_source=email&utm_medium=email&utm_campaign=wiselist_share')}`
  };

  return (
    <div className="share-buttons">
      <Button onClick={() => window.open(shareUrls.twitter, '_blank')}>
        Share on Twitter
      </Button>
      <Button onClick={() => window.open(shareUrls.whatsapp, '_blank')}>
        Share on WhatsApp
      </Button>
      <Button onClick={() => window.open(shareUrls.email)}>
        Share via Email
      </Button>
      <Button onClick={() => {
        navigator.clipboard.writeText(baseUrl + '?utm_source=copy&utm_medium=direct&utm_campaign=wiselist_share');
        toast.success('Link copied!');
      }}>
        Copy Link
      </Button>
    </div>
  );
}
```

---

### Step 5: Analytics Dashboard (30 minutes)

**File**: `apps/web/src/lib/api/analytics.ts`

```typescript
export async function getWiselistAttribution(wiselistId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('attribution_source, total_amount')
    .eq('booking_referrer_id', wiselistId)
    .not('attribution_source', 'is', null);

  if (error) throw error;

  // Aggregate by source
  const bySource = data.reduce((acc, booking) => {
    const source = booking.attribution_source;
    if (!acc[source]) {
      acc[source] = { count: 0, revenue: 0 };
    }
    acc[source].count++;
    acc[source].revenue += booking.total_amount;
    return acc;
  }, {} as Record<string, { count: number; revenue: number }>);

  return {
    total_bookings: data.length,
    total_revenue: data.reduce((sum, b) => sum + b.total_amount, 0),
    by_source: bySource
  };
}
```

**Display in UI**:

```typescript
// Component
export function WiselistAnalytics({ wiselistId }: Props) {
  const { data } = useQuery(['wiselist-attribution', wiselistId], () =>
    getWiselistAttribution(wiselistId)
  );

  return (
    <div>
      <h3>Attribution Sources</h3>
      <ul>
        <li>Twitter: {data?.by_source.TWITTER?.count || 0} bookings (£{data?.by_source.TWITTER?.revenue || 0})</li>
        <li>WhatsApp: {data?.by_source.WHATSAPP?.count || 0} bookings (£{data?.by_source.WHATSAPP?.revenue || 0})</li>
        <li>Email: {data?.by_source.EMAIL?.count || 0} bookings (£{data?.by_source.EMAIL?.revenue || 0})</li>
        <li>Direct Link: {data?.by_source.DIRECT_LINK?.count || 0} bookings (£{data?.by_source.DIRECT_LINK?.revenue || 0})</li>
      </ul>
    </div>
  );
}
```

---

## Common Usage Patterns

### Pattern 1: Create Wiselist + Add Items

**Use Case**: User creates new wiselist and immediately adds 3 tutors

**Service Layer Pattern**:

```typescript
export async function createWiselistWithItems(
  userId: string,
  wiselistData: CreateWiselistInput,
  items: AddItemInput[]
): Promise<Wiselist> {
  // 1. Create wiselist
  const wiselist = await createWiselist(userId, wiselistData);

  // 2. Add items in parallel
  await Promise.all(
    items.map(item => addItemToWiselist(wiselist.id, item))
  );

  return wiselist;
}
```

**Usage**:

```typescript
const wiselist = await createWiselistWithItems(userId, {
  title: 'Best Math Tutors',
  visibility: 'PUBLIC'
}, [
  { item_type: 'PROFILE', profile_id: 'tutor-1' },
  { item_type: 'PROFILE', profile_id: 'tutor-2' },
  { item_type: 'LISTING', listing_id: 'listing-1' }
]);
```

---

### Pattern 2: Share Wiselist with Collaborators

**Use Case**: User invites 3 friends to co-edit a wiselist

**Service Layer Pattern**:

```typescript
export async function inviteCollaborators(
  wiselistId: string,
  invitations: Array<{ email: string; role: CollaboratorRole }>
): Promise<void> {
  // Check if inviter has permission (must be OWNER)
  const wiselist = await getWiselist(wiselistId);
  const session = await getSession();

  if (wiselist.user_id !== session.user.id) {
    throw new Error('Only owner can invite collaborators');
  }

  // Send invitations in parallel
  await Promise.all(
    invitations.map(inv => addCollaborator(wiselistId, inv.email, inv.role))
  );
}
```

**Usage**:

```typescript
await inviteCollaborators('wiselist-123', [
  { email: 'alice@example.com', role: 'EDITOR' },
  { email: 'bob@example.com', role: 'EDITOR' },
  { email: 'carol@example.com', role: 'VIEWER' }
]);
```

---

### Pattern 3: Migrate Anonymous User's Wiselists on Signup

**Use Case**: User creates 3 wiselists while anonymous, then signs up

**Service Layer Pattern**:

```typescript
// Called in signup completion handler
export async function syncLocalStorageToDatabase(userId: string): Promise<number> {
  const localWiselists = getWiselistsFromLocalStorage();

  if (localWiselists.length === 0) return 0;

  let migratedCount = 0;

  for (const localWiselist of localWiselists) {
    try {
      // Create wiselist in database
      const wiselist = await createWiselist(userId, {
        title: localWiselist.title,
        description: localWiselist.description,
        visibility: 'PRIVATE'
      });

      // Add items
      if (localWiselist.items && localWiselist.items.length > 0) {
        await Promise.all(
          localWiselist.items.map(item => addItemToWiselist(wiselist.id, item))
        );
      }

      migratedCount++;
    } catch (error) {
      console.error('Failed to migrate wiselist:', error);
      // Continue with next wiselist
    }
  }

  // Clear localStorage after successful migration
  localStorage.removeItem('wiselists');

  return migratedCount;
}
```

**Usage**:

```typescript
// In signup flow
const migratedCount = await syncLocalStorageToDatabase(user.id);

if (migratedCount > 0) {
  toast.success(`Migrated ${migratedCount} wiselist(s) to your account!`);
}
```

---

## Testing Strategies

### Unit Tests (Service Layer)

**Test Coverage Targets**: > 80% for service layer

**Example Tests**:

```typescript
// __tests__/wiselists.test.ts

describe('Wiselists Service Layer', () => {
  describe('createWiselist', () => {
    it('should create wiselist with unique slug', async () => {
      const wiselist = await createWiselist(userId, {
        title: 'Math Tutors'
      });

      expect(wiselist.slug).toMatch(/^math-tutors-[a-z0-9]{8}$/);
    });

    it('should default to PRIVATE visibility', async () => {
      const wiselist = await createWiselist(userId, {
        title: 'Test'
      });

      expect(wiselist.visibility).toBe('PRIVATE');
    });

    it('should reject title > 100 chars', async () => {
      await expect(
        createWiselist(userId, { title: 'a'.repeat(101) })
      ).rejects.toThrow('max 100 chars');
    });
  });

  describe('addItemToWiselist', () => {
    it('should add PROFILE item', async () => {
      const item = await addItemToWiselist(wiselistId, {
        item_type: 'PROFILE',
        profile_id: 'tutor-uuid'
      });

      expect(item.item_type).toBe('PROFILE');
      expect(item.profile_id).toBe('tutor-uuid');
      expect(item.listing_id).toBeNull();
    });

    it('should increment total_items count', async () => {
      const before = await getWiselist(wiselistId);
      await addItemToWiselist(wiselistId, { item_type: 'PROFILE', profile_id: 'uuid' });
      const after = await getWiselist(wiselistId);

      expect(after.total_items).toBe(before.total_items + 1);
    });

    it('should reject duplicate items', async () => {
      await addItemToWiselist(wiselistId, { item_type: 'PROFILE', profile_id: 'uuid-1' });

      await expect(
        addItemToWiselist(wiselistId, { item_type: 'PROFILE', profile_id: 'uuid-1' })
      ).rejects.toThrow('UNIQUE constraint');
    });
  });
});
```

---

### Integration Tests (API Endpoints)

**Test Coverage Targets**: All 6 API endpoints

**Example Tests**:

```typescript
// __tests__/api/wiselists.test.ts

describe('POST /api/wiselists', () => {
  it('should create wiselist for authenticated user', async () => {
    const response = await fetch('/api/wiselists', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${authToken}`
      },
      body: JSON.stringify({ title: 'Test List' })
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.title).toBe('Test List');
    expect(data.slug).toBeDefined();
  });

  it('should reject unauthenticated requests', async () => {
    const response = await fetch('/api/wiselists', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test' })
    });

    expect(response.status).toBe(401);
  });
});
```

---

### E2E Tests (Full User Flows)

**Critical Flows to Test**:

```typescript
// e2e/wiselists.spec.ts

test('Create wiselist → Share → Signup → Book → Commission', async ({ page }) => {
  // 1. User A creates wiselist
  await page.goto('/wiselists');
  await page.click('button:text("Create Wiselist")');
  await page.fill('input[name="title"]', 'Best Math Tutors');
  await page.click('button:text("Create")');

  // 2. User A adds 3 tutors
  await page.click('button:text("Add Item")');
  // ... add items

  // 3. User A changes visibility to PUBLIC
  await page.click('button:text("Settings")');
  await page.selectOption('select[name="visibility"]', 'PUBLIC');
  await page.click('button:text("Save")');

  // 4. User A copies share link
  const slug = await page.getAttribute('[data-testid="wiselist-slug"]', 'value');
  const shareUrl = `${baseUrl}/w/${slug}`;

  // 5. User B (anonymous) clicks share link
  await page.context().clearCookies();
  await page.goto(shareUrl);

  // Verify wiselist referrer cookie set
  const cookies = await page.context().cookies();
  const referrerCookie = cookies.find(c => c.name === 'wiselist_referrer');
  expect(referrerCookie).toBeDefined();

  // 6. User B signs up
  await page.click('button:text("Sign up to view")');
  await page.fill('input[name="email"]', 'bob@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button:text("Create Account")');

  // 7. User B redirected back to wiselist, can now see items
  await page.waitForURL(`/w/${slug}`);
  await expect(page.locator('[data-testid="wiselist-item"]')).toHaveCount(3);

  // 8. User B books tutor from list
  await page.click('[data-testid="wiselist-item"]:first-child button:text("Book")');
  // ... complete booking

  // 9. Verify booking has referrer_id
  const booking = await getLastBooking();
  expect(booking.booking_referrer_id).toBe(wiselistId);

  // 10. Verify User A earns commission
  await page.goto('/dashboard/earnings');
  await expect(page.locator('text=Commission pending: £20')).toBeVisible();
});
```

---

## Deployment Checklist

### Pre-Deployment

**Code Review**:
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Linter clean (`npm run lint`)
- [ ] No console.logs or debug code

**Database**:
- [ ] Migrations tested on staging
- [ ] RLS policies verified (manual test in Supabase Studio)
- [ ] Rollback script ready (if migration fails)
- [ ] Backup production database

**Configuration**:
- [ ] Environment variables set on Vercel
- [ ] Feature flags configured (if using)
- [ ] Cookie domain set correctly (for attribution tracking)

---

### Deployment Steps

**Phase 1: Database Migration**

```bash
# 1. Backup production database
pg_dump $PROD_DATABASE_URL > backup-$(date +%Y%m%d).sql

# 2. Run migrations in transaction (can rollback on error)
psql $PROD_DATABASE_URL -c "BEGIN;"
psql $PROD_DATABASE_URL < apps/api/migrations/081_create_wiselists_table.sql
psql $PROD_DATABASE_URL < apps/api/migrations/082_create_wiselist_items_table.sql
psql $PROD_DATABASE_URL < apps/api/migrations/083_create_wiselist_collaborators_table.sql
psql $PROD_DATABASE_URL < apps/api/migrations/084_add_booking_referrer_to_bookings.sql
psql $PROD_DATABASE_URL -c "COMMIT;"

# 3. Verify tables created
psql $PROD_DATABASE_URL -c "\dt wiselist*"
```

**Phase 2: Code Deployment**

```bash
# 1. Deploy to staging first
vercel --target=staging

# 2. Run smoke tests on staging
npm run test:e2e -- --base-url=https://staging.tutorwise.com

# 3. Deploy to production (gradual rollout)
vercel --prod

# 4. Monitor error rates (first 30 minutes critical)
# Check: Sentry, Vercel Analytics, Supabase Logs
```

**Phase 3: Verification**

- [ ] Create test wiselist on production
- [ ] Add item to wiselist
- [ ] Share wiselist (verify `/w/[slug]` works)
- [ ] Test attribution cookie (DevTools → Application → Cookies)
- [ ] Monitor error logs (first 1 hour)

---

### Post-Deployment

**Monitoring**:
- [ ] Error rate < 0.1% (Sentry dashboard)
- [ ] API response time < 500ms p95 (Vercel Analytics)
- [ ] Database query time < 100ms p95 (Supabase Performance)
- [ ] No spike in resource usage (CPU, memory)

**Rollback Triggers**:
- Error rate > 1%
- Response time > 2x baseline
- Database deadlocks or constraint violations
- Customer complaints > 5 in first hour

**Rollback Plan**:

```bash
# 1. Revert code deployment
vercel rollback

# 2. Roll back database migrations (if safe)
psql $PROD_DATABASE_URL < rollback-scripts/084_remove_booking_referrer.sql
psql $PROD_DATABASE_URL < rollback-scripts/083_drop_wiselist_collaborators.sql
psql $PROD_DATABASE_URL < rollback-scripts/082_drop_wiselist_items.sql
psql $PROD_DATABASE_URL < rollback-scripts/081_drop_wiselists.sql

# 3. Restore from backup (if migrations corrupted data)
psql $PROD_DATABASE_URL < backup-20251214.sql

# 4. Clear cache
redis-cli FLUSHALL

# 5. Notify stakeholders
# Post in #engineering-alerts Slack channel
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Forgetting to Update Denormalized Counts

**What Happens**: User adds item to wiselist, but `total_items` stays at 0

**Why It Happens**: Forgot to call `incrementItemCount()` after adding item

**How to Avoid**:

✅ **DO**: Use database trigger for automatic updates

```sql
CREATE OR REPLACE FUNCTION update_wiselist_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE wiselists SET total_items = total_items + 1 WHERE id = NEW.wiselist_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE wiselists SET total_items = total_items - 1 WHERE id = OLD.wiselist_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wiselist_items_count
AFTER INSERT OR DELETE ON wiselist_items
FOR EACH ROW
EXECUTE FUNCTION update_wiselist_item_count();
```

❌ **DON'T**: Manually update counts in application code (easy to forget)

**How to Fix If You Hit This**:

```sql
-- Recalculate all counts
UPDATE wiselists
SET total_items = (
  SELECT COUNT(*)
  FROM wiselist_items
  WHERE wiselist_id = wiselists.id
);
```

---

### Pitfall 2: Polymorphic Constraint Violations

**Problem**: Error when adding item: "CHECK constraint wiselist_items_polymorphic_check failed"

**Why It Happens**: Both `profile_id` AND `listing_id` are set (or both are NULL)

**Symptoms**:
- Item creation fails silently
- Database rejects insert
- User sees "Failed to add item" error

**Solution**:

✅ **DO**: Validate item type before database insert

```typescript
export async function addItemToWiselist(
  wiselistId: string,
  item: AddItemInput
): Promise<WiselistItem> {
  // Validate BEFORE database call
  if (item.item_type === 'PROFILE' && !item.profile_id) {
    throw new Error('profile_id required for PROFILE item type');
  }
  if (item.item_type === 'LISTING' && !item.listing_id) {
    throw new Error('listing_id required for LISTING item type');
  }

  // Ensure only one ID is set
  const { data, error } = await supabase
    .from('wiselist_items')
    .insert({
      wiselist_id: wiselistId,
      item_type: item.item_type,
      profile_id: item.item_type === 'PROFILE' ? item.profile_id : null,
      listing_id: item.item_type === 'LISTING' ? item.listing_id : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

❌ **DON'T**: Pass raw user input directly to database

---

### Pitfall 3: Attribution Cookie Not Persisting

**Problem**: User clicks `/w/slug` → Books tutor → `booking_referrer_id` is NULL

**Why It Happens**:
- Cookie domain mismatch (set on `www.` but reading on apex domain)
- Cookie expired before booking (> 7 days)
- User cleared cookies or used incognito mode

**How to Avoid**:

✅ **DO**: Set cookie with correct domain and long expiry

```typescript
// middleware.ts
response.cookies.set('wiselist_referrer', wiselistId, {
  maxAge: 60 * 60 * 24 * 7,        // 7 days
  path: '/',                        // Available on all pages
  domain: '.tutorwise.com',         // Works on www and apex domain
  httpOnly: true,                   // Prevent JS access
  sameSite: 'lax',                  // Allow cross-origin navigation
  secure: process.env.NODE_ENV === 'production'  // HTTPS only in prod
});
```

✅ **DO**: Add fallback for missing cookie

```typescript
// apps/web/src/app/api/bookings/route.ts
const wiselistReferrer = request.cookies.get('wiselist_referrer')?.value;

// Fallback: Check session storage if cookie missing
if (!wiselistReferrer && request.headers.get('X-Wiselist-Referrer')) {
  wiselistReferrer = request.headers.get('X-Wiselist-Referrer');
}
```

❌ **DON'T**: Rely solely on cookies (users clear them)

**How to Fix If You Hit This**:

```typescript
// Add session storage backup
// apps/web/src/app/w/[slug]/page.tsx

useEffect(() => {
  // Store wiselist referrer in session storage (backup)
  sessionStorage.setItem('wiselist_referrer', wiselistId);
}, [wiselistId]);

// When creating booking, check both
const wiselistReferrer =
  cookies.get('wiselist_referrer') ||
  sessionStorage.getItem('wiselist_referrer');
```

---

### Pitfall 4: Slow Queries on Large Wiselists

**Problem**: Loading wiselist with 100+ items takes > 2 seconds

**Why It Happens**: Fetching all items with polymorphic joins is expensive

**Symptoms**:
- Page load time > 2s
- Database query time > 500ms
- High CPU usage on database

**Solution**:

✅ **DO**: Implement pagination

```typescript
export async function getWiselistItems(
  wiselistId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ items: WiselistItem[]; total: number }> {
  const offset = (page - 1) * pageSize;

  // Fetch items with limit/offset
  const { data, error, count } = await supabase
    .from('wiselist_items')
    .select(`
      *,
      profile:profiles (*),
      listing:listings (*)
    `, { count: 'exact' })
    .eq('wiselist_id', wiselistId)
    .order('position', { ascending: true })
    .range(offset, offset + pageSize - 1);

  if (error) throw error;

  return {
    items: data,
    total: count || 0
  };
}
```

✅ **DO**: Add database index on `position`

```sql
CREATE INDEX idx_wiselist_items_position
  ON wiselist_items(wiselist_id, position);
```

❌ **DON'T**: Fetch all items without pagination

**Monitoring**:

```typescript
// Add query performance logging
console.time('getWiselistItems');
const items = await getWiselistItems(wiselistId);
console.timeEnd('getWiselistItems');  // Should be < 100ms
```

---

### Pitfall 5: RLS Policy Blocking Legitimate Access

**Problem**: User can't view wiselist even though they're a collaborator with ACCEPTED status

**Why It Happens**: RLS policy doesn't account for all access patterns

**Symptoms**:
- API returns empty array (no error)
- User sees "No wiselists found"
- Database audit log shows row filtered by RLS

**Solution**:

✅ **DO**: Test RLS policies thoroughly

```sql
-- Test as specific user
SET request.jwt.claim.sub = 'user-uuid-123';

-- Should return wiselist
SELECT * FROM wiselists WHERE id = 'wiselist-uuid';

-- Should return wiselist (via collaborator)
SELECT * FROM wiselists
WHERE id IN (
  SELECT wiselist_id FROM wiselist_collaborators
  WHERE user_id = current_setting('request.jwt.claim.sub')::uuid
);
```

✅ **DO**: Add comprehensive RLS policy

```sql
CREATE POLICY "users_can_read_shared_wiselists"
ON wiselists FOR SELECT
USING (
  -- Owner can read
  user_id = auth.uid()
  OR
  -- Public wiselists readable by all
  visibility = 'PUBLIC'
  OR
  -- Collaborators can read (any status)
  EXISTS (
    SELECT 1 FROM wiselist_collaborators
    WHERE wiselist_id = wiselists.id
    AND user_id = auth.uid()
    AND status IN ('PENDING', 'ACCEPTED')  -- Include PENDING for invite preview
  )
);
```

❌ **DON'T**: Assume RLS policies work without testing

**Debugging**:

```typescript
// Add RLS debugging query
const { data, error } = await supabase
  .rpc('debug_wiselist_access', { wiselist_id: 'uuid' });

console.log('RLS Debug:', data);
// Shows: which policy matched, which didn't, why
```

---

## References

### Related Documentation

| Document | Purpose |
|----------|---------|
| [README.md](./README.md) | Feature overview & navigation |
| [wiselists-solution-design-v2.md](./wiselists-solution-design-v2.md) | Architecture & business context |
| [wiselists-prompt-v2.md](./wiselists-prompt-v2.md) | AI assistant quick reference |

---

### Code Files & Locations

See [README.md](./README.md) - Key Files Reference section for complete file listing.

---

### External References

**Design Patterns**:
- [Polymorphic Associations in Rails](https://guides.rubyonrails.org/association_basics.html#polymorphic-associations)
- [Stripe Polymorphic Sources](https://stripe.com/docs/api/sources)

**Testing Resources**:
- [Playwright E2E Testing](https://playwright.dev/)
- [Jest Unit Testing](https://jestjs.io/)
- [Supabase RLS Testing](https://supabase.com/docs/guides/auth/row-level-security)

---

## Appendix

### Decision Log

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2025-11-10 | Use polymorphic items (PROFILE + LISTING) | Flexible, unified query | Separate tables (rejected - complex joins) |
| 2025-11-15 | localStorage fallback for anonymous users | Reduces signup friction | Require login first (rejected - high drop-off) |
| 2025-11-20 | 7-day attribution cookie | Balances accuracy with privacy | 30-day (too long), 1-day (too short) |
| 2025-12-01 | 5% commission rate | High enough to motivate, low margin impact | 10% (cuts margin too much), 2% (low incentive) |

---

**Document Status**: ✅ Active
**Next Review**: 2026-01-14
**Maintainer**: Growth Team

---

**End of Implementation Guide**
